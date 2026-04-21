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
        Delivered,
        Disputed,
        Refunded
    }

    struct Parcel {
        address sender;
        address recipient;
        address carrier;
        uint256 price;
        string pickupLocation;
        string dropoffLocation;
        ParcelStatus status;
        uint256 createdAt;
        uint256 lastActionAt;
    }

    mapping(uint256 => Parcel) public parcels;
    mapping(uint256 => mapping(address => uint256)) public lockedByParcel;
    mapping(address => uint256) public totalLockedByCarrier;
    mapping(address => uint256) public pendingRefunds;
    mapping(address => mapping(uint256 => uint256)) public monthlyDisputeCount;

    ICarrierReputation public reputation;
    uint256 public platformReserve;
    uint256 public parcelCount;
    address public platformOwner;

    uint256 public constant CARRIER_ACCEPT_TIMEOUT = 24 hours;
    uint256 public constant DISPUTE_TIMEOUT = 30 days;
    // CORRECTION Point 5 : 5e18 = 5 ETH (~15 000$) était absurde pour un colis tunisien.
    // On utilise 5 finney (0.005 ETH) comme seuil "micro-colis sans garantie de points".
    uint256 public constant MIN_VALUE_NO_POINTS = 5e15;
    uint256 public constant MAX_DISPUTES_PER_MONTH = 3;

    uint256 private unlocked = 1;

    event ParcelPosted(uint256 indexed parcelId, address indexed sender, address indexed recipient, uint256 price);
    event ParcelPaid(uint256 indexed parcelId, address indexed recipient, uint256 amount);
    event ParcelAccepted(uint256 indexed parcelId, address indexed carrier);
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

    function postParcel(
        address recipient,
        uint256 price,
        string calldata pickupLocation,
        string calldata dropoffLocation
    ) external returns (uint256) {
        require(recipient != address(0), "Recipient invalide");
        require(price > 0, "Prix invalide");
        require(bytes(pickupLocation).length > 0, "Depart invalide");
        require(bytes(dropoffLocation).length > 0, "Destination invalide");

        parcelCount += 1;
        uint256 parcelId = parcelCount;

        Parcel storage p = parcels[parcelId];
        p.sender = msg.sender;
        p.recipient = recipient;
        p.carrier = address(0);
        p.price = price;
        p.pickupLocation = pickupLocation;
        p.dropoffLocation = dropoffLocation;
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

    function acceptParcel(uint256 parcelId) external nonReentrant {
        Parcel storage p = parcels[parcelId];
        require(msg.sender != p.recipient, "Recipient interdit");
        require(msg.sender != p.sender, "Sender interdit");
        require(p.carrier == address(0), "Deja pris");
        require(p.status == ParcelStatus.Paid, "Statut invalide");

        if (p.price >= MIN_VALUE_NO_POINTS) {
            uint256 total = reputation.getPoints(msg.sender);
            uint256 locked = totalLockedByCarrier[msg.sender];
            require(total >= locked, "Incoherence points verrouilles");
            uint256 available = total - locked;
            require(available >= p.price, "Points insuffisants");

            lockedByParcel[parcelId][msg.sender] += p.price;
            totalLockedByCarrier[msg.sender] += p.price;
        }

        p.carrier = msg.sender;
        p.status = ParcelStatus.InTransit;
        p.lastActionAt = block.timestamp;

        emit ParcelAccepted(parcelId, msg.sender);
    }

    function confirmDelivery(uint256 parcelId) external nonReentrant {
        Parcel storage p = parcels[parcelId];
        require(msg.sender == p.recipient, "Seul destinataire");
        require(p.status == ParcelStatus.InTransit, "Statut invalide");

        p.status = ParcelStatus.Delivered;
        p.lastActionAt = block.timestamp;

        address carrier = p.carrier;
        if (carrier != address(0)) {
            _unlockCarrierForParcel(parcelId, carrier);
            reputation.addPoints(carrier, p.price / 20);
        }

        uint256 fee = (p.price * 10) / 100;
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
            p.status == ParcelStatus.Paid || p.status == ParcelStatus.InTransit,
            "Statut invalide"
        );

        if (p.status == ParcelStatus.Paid) {
            require(block.timestamp - p.lastActionAt > CARRIER_ACCEPT_TIMEOUT, "Delai acceptation non atteint");
        }

        // CORRECTION Point 4 : 30 days exactement est faux (mois = 28 à 31 jours).
        // On utilise des périodes de 4 semaines (28 jours), plus déterministe on-chain.
        // Pour un compteur calendaire précis, il faudrait un oracle de date—hors scope prototype.
        uint256 monthIndex = block.timestamp / 4 weeks;
        uint256 n = monthlyDisputeCount[msg.sender][monthIndex];
        require(n < MAX_DISPUTES_PER_MONTH, "Limite mensuelle atteinte");
        monthlyDisputeCount[msg.sender][monthIndex] = n + 1;

        p.status = ParcelStatus.Disputed;
        p.lastActionAt = block.timestamp;

        emit DisputeOpened(parcelId, msg.sender);
    }

    function resolveDispute(uint256 parcelId) external onlyOwner nonReentrant {
        Parcel storage p = parcels[parcelId];
        require(p.status == ParcelStatus.Disputed, "Pas en litige");

        p.status = ParcelStatus.Refunded;
        p.lastActionAt = block.timestamp;

        _safeTransferETH(p.recipient, p.price, "Remboursement destinataire echec");
        _paySenderFromReserveOrDebt(parcelId, p.sender, p.price);
        _unlockCarrierForParcel(parcelId, p.carrier);

        address faultyCarrier = p.carrier;
        if (faultyCarrier != address(0)) {
            reputation.deductPoints(faultyCarrier, p.price);
        }

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

        if (p.status == ParcelStatus.Disputed) {
            require(elapsed > DISPUTE_TIMEOUT, "Timeout non atteint");

            p.status = ParcelStatus.Refunded;
            p.lastActionAt = block.timestamp;

            _safeTransferETH(p.recipient, p.price, "Refund destinataire echec");
            _paySenderFromReserveOrDebt(parcelId, p.sender, p.price);

            if (p.carrier != address(0)) {
                _unlockCarrierForParcel(parcelId, p.carrier);
            }

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
