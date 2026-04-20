// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICarrierReputation {
    function getPoints(address carrier) external view returns (uint256);
    function addPoints(address carrier, uint256 amount) external;
    function deductPoints(address carrier, uint256 amount) external;
}

contract RelayEscrow {
    enum ParcelStatus {
        Posted,
        Paid,
        InTransit,
        AwaitingNextCarrier,
        Delivered,
        Disputed,
        Refunded
    }

    struct Parcel {
        address sender;
        address recipient;
        uint256 price;
        ParcelStatus status;
        address[] carrierChain;
        uint16 currentHop;
        bytes32[] photoHashes;
        uint256 createdAt;
        uint256 lastActionAt;
    }

    struct HandoffPending {
        address outgoingCarrier;
        address expectedIncoming;
        bytes32 outgoingHash;
        bytes32 incomingHash;
        bool outgoingConfirmed;
        bool incomingConfirmed;
        uint256 deadline;
    }

    mapping(uint256 => Parcel) public parcels;
    mapping(uint256 => HandoffPending) public pendingHandoffs;
    mapping(uint256 => mapping(address => uint256)) public lockedByParcel;
    mapping(address => uint256) public totalLockedByCarrier;
    mapping(address => uint256) public pendingRefunds;
    mapping(address => mapping(uint256 => uint256)) public monthlyDisputeCount;

    ICarrierReputation public reputation;
    uint256 public platformReserve;
    uint256 public parcelCount;
    address public platformOwner;

    uint256 public constant HANDOFF_TIMEOUT = 2 hours;
    uint256 public constant NEXT_CARRIER_TIMEOUT = 24 hours;
    uint256 public constant DISPUTE_TIMEOUT = 30 days;
    uint256 public constant MIN_VALUE_NO_POINTS = 5e18;
    uint256 public constant MAX_DISPUTES_PER_MONTH = 3;

    uint256 private unlocked = 1;

    event ParcelPosted(uint256 indexed parcelId, address indexed sender, address indexed recipient, uint256 price);
    event ParcelPaid(uint256 indexed parcelId, address indexed recipient, uint256 amount);
    event LegAccepted(uint256 indexed parcelId, address indexed carrier, uint16 hop);
    event HandoffInitiated(
        uint256 indexed parcelId,
        address indexed from,
        address indexed expectedTo,
        bytes32 photoHash,
        uint256 deadline
    );
    event HandoffConfirmed(
        uint256 indexed parcelId,
        address indexed from,
        address indexed to,
        bytes32 photoHash,
        uint256 timestamp
    );
    event DeliveryConfirmed(uint256 indexed parcelId, address indexed recipient);
    event PaymentReleased(uint256 indexed parcelId, address indexed sender, uint256 senderAmount, uint256 platformFee);
    event DisputeOpened(uint256 indexed parcelId, address indexed by);
    event DisputeResolved(uint256 indexed parcelId, address indexed faultyCarrier, uint256 pointsDeducted);
    event PartialRefund(uint256 indexed parcelId, address indexed sender, uint256 paidNow, uint256 debt);
    event RefundClaimed(address indexed user, uint256 amount);
    event ReserveToppedUp(address indexed owner, uint256 amount, uint256 newReserve);
    event TimeoutTriggered(uint256 indexed parcelId, string timeoutType, address penalized);

    modifier onlyOwner() {
        require(msg.sender == platformOwner, "Not owner");
        _;
    }

    modifier nonReentrant() {
        require(unlocked == 1, "ReentrancyGuard");
        unlocked = 2;
        _;
        unlocked = 1;
    }

    constructor(address reputationAddress) {
        require(reputationAddress != address(0), "Reputation invalide");
        platformOwner = msg.sender;
        reputation = ICarrierReputation(reputationAddress);
    }

    function postParcel(address recipient, uint256 price) external returns (uint256) {
        require(recipient != address(0), "Recipient invalide");
        require(price > 0, "Prix invalide");

        parcelCount += 1;
        uint256 parcelId = parcelCount;

        Parcel storage p = parcels[parcelId];
        p.sender = msg.sender;
        p.recipient = recipient;
        p.price = price;
        p.status = ParcelStatus.Posted;
        p.createdAt = block.timestamp;
        p.lastActionAt = block.timestamp;

        emit ParcelPosted(parcelId, msg.sender, recipient, price);
        return parcelId;
    }

    function payForParcel(uint256 parcelId) external payable nonReentrant {
        Parcel storage p = parcels[parcelId];
        require(p.sender != address(0), "Parcel introuvable");
        require(msg.sender == p.recipient, "Seul destinataire");
        require(p.status == ParcelStatus.Posted, "Statut invalide");
        require(msg.value == p.price, "Montant invalide");

        p.status = ParcelStatus.Paid;
        p.lastActionAt = block.timestamp;

        emit ParcelPaid(parcelId, msg.sender, msg.value);
    }

    function acceptLeg(uint256 parcelId) external nonReentrant {
        Parcel storage p = parcels[parcelId];
        require(
            p.status == ParcelStatus.Paid || p.status == ParcelStatus.AwaitingNextCarrier,
            "Statut invalide"
        );
        require(msg.sender != p.recipient, "Recipient interdit");
        require(msg.sender != p.sender, "Sender interdit");
        require(p.currentHop == p.carrierChain.length, "Hop incoherent");

        if (p.price >= MIN_VALUE_NO_POINTS) {
            uint256 total = reputation.getPoints(msg.sender);
            uint256 locked = totalLockedByCarrier[msg.sender];
            require(total >= locked, "Incoherence points verrouilles");
            uint256 available = total - locked;
            require(available >= p.price, "Points insuffisants");

            lockedByParcel[parcelId][msg.sender] += p.price;
            totalLockedByCarrier[msg.sender] += p.price;
        }

        p.carrierChain.push(msg.sender);
        p.status = ParcelStatus.InTransit;
        p.lastActionAt = block.timestamp;

        emit LegAccepted(parcelId, msg.sender, uint16(p.carrierChain.length - 1));
    }

    function initiateHandoff(uint256 parcelId, address expectedIncoming, bytes32 photoHash) external {
        Parcel storage p = parcels[parcelId];
        require(p.status == ParcelStatus.InTransit, "Pas en transit");
        require(p.carrierChain.length > 0, "Aucun porteur");
        require(p.currentHop < p.carrierChain.length, "Hop invalide");

        address outgoing = p.carrierChain[p.currentHop];
        require(msg.sender == outgoing, "Seul porteur sortant");
        require(expectedIncoming != address(0), "Incoming invalide");
        require(expectedIncoming != outgoing, "Incoming=outgoing interdit");

        HandoffPending storage h = pendingHandoffs[parcelId];
        require(!h.outgoingConfirmed && !h.incomingConfirmed, "Handoff deja en cours");

        h.outgoingCarrier = outgoing;
        h.expectedIncoming = expectedIncoming;
        h.outgoingHash = photoHash;
        h.outgoingConfirmed = true;
        h.deadline = block.timestamp + HANDOFF_TIMEOUT;

        p.lastActionAt = block.timestamp;

        emit HandoffInitiated(parcelId, outgoing, expectedIncoming, photoHash, h.deadline);
    }

    function acknowledgeHandoff(uint256 parcelId, bytes32 photoHash) external {
        Parcel storage p = parcels[parcelId];
        HandoffPending storage h = pendingHandoffs[parcelId];
        require(p.status == ParcelStatus.InTransit, "Pas en transit");
        require(h.outgoingConfirmed, "Aucune initiation");
        require(block.timestamp <= h.deadline, "Timeout handoff");
        require(msg.sender == h.expectedIncoming, "Incoming non autorise");
        require(!h.incomingConfirmed, "Incoming deja confirme");

        h.incomingHash = photoHash;
        h.incomingConfirmed = true;
        require(h.incomingHash == h.outgoingHash, "Hashes divergents");

        p.photoHashes.push(photoHash);
        p.currentHop += 1;

        address outgoing = h.outgoingCarrier;
        _unlockCarrierForParcel(parcelId, outgoing);
        reputation.addPoints(outgoing, p.price / 10);

        _clearPendingHandoff(parcelId);

        p.status = ParcelStatus.AwaitingNextCarrier;
        p.lastActionAt = block.timestamp;

        emit HandoffConfirmed(parcelId, outgoing, msg.sender, photoHash, block.timestamp);
    }

    function confirmDelivery(uint256 parcelId) external nonReentrant {
        Parcel storage p = parcels[parcelId];
        require(msg.sender == p.recipient, "Seul destinataire");
        require(p.status == ParcelStatus.AwaitingNextCarrier, "Statut invalide");

        p.status = ParcelStatus.Delivered;
        p.lastActionAt = block.timestamp;

        if (p.carrierChain.length > 0 && p.currentHop < p.carrierChain.length) {
            address currentCarrier = p.carrierChain[p.currentHop];
            _unlockCarrierForParcel(parcelId, currentCarrier);
            reputation.addPoints(currentCarrier, p.price / 10);
        }

        uint256 fee = (p.price * 5) / 100;
        uint256 senderAmount = p.price - fee;
        platformReserve += fee;

        _safeTransferETH(p.sender, senderAmount, "Paiement expediteur echec");

        emit DeliveryConfirmed(parcelId, p.recipient);
        emit PaymentReleased(parcelId, p.sender, senderAmount, fee);
    }

    function openDispute(uint256 parcelId) external {
        Parcel storage p = parcels[parcelId];
        require(msg.sender == p.recipient, "Seul destinataire");
        require(
            p.status == ParcelStatus.InTransit || p.status == ParcelStatus.AwaitingNextCarrier,
            "Statut invalide"
        );

        uint256 monthIndex = block.timestamp / 30 days;
        uint256 n = monthlyDisputeCount[msg.sender][monthIndex];
        require(n < MAX_DISPUTES_PER_MONTH, "Limite mensuelle atteinte");
        monthlyDisputeCount[msg.sender][monthIndex] = n + 1;

        p.status = ParcelStatus.Disputed;
        p.lastActionAt = block.timestamp;

        emit DisputeOpened(parcelId, msg.sender);
    }

    function resolveDispute(uint256 parcelId, uint16 faultyHop) external onlyOwner nonReentrant {
        Parcel storage p = parcels[parcelId];
        require(p.status == ParcelStatus.Disputed, "Pas en litige");
        require(faultyHop < p.carrierChain.length, "Hop invalide");

        p.status = ParcelStatus.Refunded;
        p.lastActionAt = block.timestamp;

        _safeTransferETH(p.recipient, p.price, "Remboursement destinataire echec");
        _paySenderFromReserveOrDebt(parcelId, p.sender, p.price);
        _unlockAllParcelLocks(parcelId);

        address faultyCarrier = p.carrierChain[faultyHop];
        reputation.deductPoints(faultyCarrier, p.price);

        emit DisputeResolved(parcelId, faultyCarrier, p.price);
    }

    function claimPendingRefund() external nonReentrant {
        uint256 amount = pendingRefunds[msg.sender];
        require(amount > 0, "Aucun remboursement en attente");
        require(platformReserve >= amount, "Reserve insuffisante");

        pendingRefunds[msg.sender] = 0;
        platformReserve -= amount;

        _safeTransferETH(msg.sender, amount, "Claim echec");

        emit RefundClaimed(msg.sender, amount);
    }

    function topUpReserve() external payable onlyOwner {
        require(msg.value > 0, "Montant nul");
        platformReserve += msg.value;
        emit ReserveToppedUp(msg.sender, msg.value, platformReserve);
    }

    function triggerTimeout(uint256 parcelId) external nonReentrant {
        Parcel storage p = parcels[parcelId];
        uint256 elapsed = block.timestamp - p.lastActionAt;

        if (p.status == ParcelStatus.InTransit) {
            HandoffPending storage h = pendingHandoffs[parcelId];
            require(h.outgoingConfirmed, "Pas de handoff en attente");
            require(block.timestamp > h.deadline, "Timeout non atteint");

            address outgoing = h.outgoingCarrier;
            reputation.deductPoints(outgoing, p.price / 20);
            _unlockCarrierForParcel(parcelId, outgoing);

            _clearPendingHandoff(parcelId);
            p.status = ParcelStatus.AwaitingNextCarrier;
            p.lastActionAt = block.timestamp;

            emit TimeoutTriggered(parcelId, "handoff", outgoing);
            return;
        }

        if (p.status == ParcelStatus.AwaitingNextCarrier) {
            require(elapsed > NEXT_CARRIER_TIMEOUT, "Timeout non atteint");

            p.status = ParcelStatus.Refunded;
            p.lastActionAt = block.timestamp;

            _safeTransferETH(p.recipient, p.price, "Refund destinataire echec");
            _unlockAllParcelLocks(parcelId);

            emit TimeoutTriggered(parcelId, "nextCarrier", address(0));
            return;
        }

        if (p.status == ParcelStatus.Disputed) {
            require(elapsed > DISPUTE_TIMEOUT, "Timeout non atteint");

            p.status = ParcelStatus.Refunded;
            p.lastActionAt = block.timestamp;

            _safeTransferETH(p.recipient, p.price, "Refund destinataire echec");
            _paySenderFromReserveOrDebt(parcelId, p.sender, p.price);
            _unlockAllParcelLocks(parcelId);

            emit TimeoutTriggered(parcelId, "dispute", address(0));
            return;
        }

        revert("Aucun timeout applicable");
    }

    function pointsAvailable(address carrier) external view returns (uint256) {
        uint256 total = reputation.getPoints(carrier);
        uint256 locked = totalLockedByCarrier[carrier];
        if (total < locked) {
            return 0;
        }
        return total - locked;
    }

    function carrierCount(uint256 parcelId) external view returns (uint256) {
        return parcels[parcelId].carrierChain.length;
    }

    function carrierAt(uint256 parcelId, uint256 index) external view returns (address) {
        return parcels[parcelId].carrierChain[index];
    }

    function photoHashCount(uint256 parcelId) external view returns (uint256) {
        return parcels[parcelId].photoHashes.length;
    }

    function _unlockCarrierForParcel(uint256 parcelId, address carrier) internal {
        uint256 locked = lockedByParcel[parcelId][carrier];
        if (locked > 0) {
            lockedByParcel[parcelId][carrier] = 0;
            if (totalLockedByCarrier[carrier] >= locked) {
                totalLockedByCarrier[carrier] -= locked;
            } else {
                totalLockedByCarrier[carrier] = 0;
            }
        }
    }

    function _unlockAllParcelLocks(uint256 parcelId) internal {
        Parcel storage p = parcels[parcelId];
        for (uint16 i = 0; i < p.carrierChain.length; i++) {
            _unlockCarrierForParcel(parcelId, p.carrierChain[i]);
        }
    }

    function _clearPendingHandoff(uint256 parcelId) internal {
        delete pendingHandoffs[parcelId];
    }

    function _paySenderFromReserveOrDebt(uint256 parcelId, address sender, uint256 amount) internal {
        if (platformReserve >= amount) {
            platformReserve -= amount;
            _safeTransferETH(sender, amount, "Remboursement expediteur echec");
        } else {
            uint256 partialAmount = platformReserve;
            uint256 debt = amount - partialAmount;
            platformReserve = 0;
            pendingRefunds[sender] += debt;

            if (partialAmount > 0) {
                _safeTransferETH(sender, partialAmount, "Remboursement partiel echec");
            }

            emit PartialRefund(parcelId, sender, partialAmount, debt);
        }
    }

    function _safeTransferETH(address to, uint256 amount, string memory err) internal {
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, err);
    }
}
