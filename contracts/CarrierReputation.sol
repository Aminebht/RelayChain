// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CarrierReputation {
    struct Carrier {
        uint256 points;
        uint256 totalEarned;
        uint256 deliveryCount;
        uint256 ratingSum;
        uint256 ratingCount;
        uint256 disputeCount;
        uint16 tier;
        bool isVerified;
    }

    mapping(address => Carrier) public carriers;

    address public owner;
    address public relayContract;

    event RelayContractSet(address indexed relayContract);
    event PointsAdded(address indexed carrier, uint256 amount, uint256 newBalance);
    event PointsDeducted(address indexed carrier, uint256 amount, uint256 newBalance, uint256 disputeCount);
    event CarrierRated(address indexed carrier, uint8 rating);
    event CarrierVerified(address indexed carrier);
    event CarrierOnboarded(address indexed carrier, uint256 initialPoints);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyRelay() {
        require(msg.sender == relayContract, "Only relay");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setRelayContract(address relay) external onlyOwner {
        require(relay != address(0), "Relay invalide");
        relayContract = relay;
        emit RelayContractSet(relay);
    }

    function getPoints(address carrier) external view returns (uint256) {
        return carriers[carrier].points;
    }

    function getTier(address carrier) external view returns (uint16) {
        return carriers[carrier].tier;
    }

    function addPoints(address carrier, uint256 amount) external onlyRelay {
        Carrier storage c = carriers[carrier];
        c.points += amount;
        c.totalEarned += amount;
        c.deliveryCount += 1;
        _updateTier(carrier);
        emit PointsAdded(carrier, amount, c.points);
    }

    function deductPoints(address carrier, uint256 amount) external onlyRelay {
        Carrier storage c = carriers[carrier];
        c.points = c.points >= amount ? c.points - amount : 0;
        c.disputeCount += 1;
        _updateTier(carrier);
        emit PointsDeducted(carrier, amount, c.points, c.disputeCount);
    }

    function submitRating(address carrier, uint8 note) external {
        require(note >= 1 && note <= 5, "Note invalide");
        Carrier storage c = carriers[carrier];
        c.ratingSum += note;
        c.ratingCount += 1;
        _updateTier(carrier);
        emit CarrierRated(carrier, note);
    }

    function verifyCarrier(address carrier) external onlyOwner {
        carriers[carrier].isVerified = true;
        _updateTier(carrier);
        emit CarrierVerified(carrier);
    }

    function onboardCarrier(address carrier) external onlyOwner {
        Carrier storage c = carriers[carrier];
        require(!c.isVerified, "Deja verifie");
        c.isVerified = true;
        c.points += 10e18;
        c.totalEarned += 10e18;
        _updateTier(carrier);
        emit CarrierOnboarded(carrier, 10e18);
    }

    function _updateTier(address carrier) internal {
        Carrier storage c = carriers[carrier];
        uint256 avgTimes10 = c.ratingCount > 0 ? (c.ratingSum * 10) / c.ratingCount : 0;

        if (c.deliveryCount >= 50 && avgTimes10 >= 45 && c.disputeCount == 0) {
            c.tier = 3;
        } else if (c.deliveryCount >= 10 && avgTimes10 >= 40 && c.isVerified) {
            c.tier = 2;
        } else {
            c.tier = 1;
        }
    }
}
