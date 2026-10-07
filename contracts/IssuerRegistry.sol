// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IssuerRegistry
/// @notice Who is allowed to issue credentials (university, tahsildar office, ...).
///         Each issuer has an Ethereum address (to register/revoke on-chain) and a
///         BabyJubJub public key (Ax, Ay) used to sign credentials off-chain.
contract IssuerRegistry {
    struct Issuer {
        string name;
        uint256 ax;
        uint256 ay;
        bool active;
    }

    address public owner;
    mapping(address => Issuer) public issuers;

    event IssuerAdded(address indexed issuer, string name, uint256 ax, uint256 ay);
    event IssuerRemoved(address indexed issuer);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addIssuer(address issuer, string calldata name, uint256 ax, uint256 ay) external onlyOwner {
        require(issuer != address(0), "zero address");
        issuers[issuer] = Issuer(name, ax, ay, true);
        emit IssuerAdded(issuer, name, ax, ay);
    }

    function removeIssuer(address issuer) external onlyOwner {
        issuers[issuer].active = false;
        emit IssuerRemoved(issuer);
    }
}
