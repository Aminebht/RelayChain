// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRelayEscrowAttack {
    function postParcel(address recipient, uint256 price, string calldata pickupLocation, string calldata dropoffLocation)
        external
        returns (uint256);
    function claimPendingRefund() external;
}

contract ReentrantRefundAttacker {
    IRelayEscrowAttack public relay;
    bool public attempted;

    constructor(address relayAddress) {
        relay = IRelayEscrowAttack(relayAddress);
    }

    function postParcelAsSender(address recipient, uint256 price) external {
        relay.postParcel(recipient, price, "pickup", "dropoff");
    }

    function attackClaim() external {
        relay.claimPendingRefund();
    }

    receive() external payable {
        if (!attempted) {
            attempted = true;
            (bool ok, ) = address(relay).call(abi.encodeWithSignature("claimPendingRefund()"));
            ok;
        }
    }
}
