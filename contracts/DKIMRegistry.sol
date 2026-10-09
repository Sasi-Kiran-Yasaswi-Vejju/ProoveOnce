// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DKIMRegistry
/// @notice Stores authorized institutional email domain public keys (DNS TXT records).
///         Used by zk-Email to verify official emails from universities and government bodies.
contract DKIMRegistry {
    address public owner;

    struct DomainKey {
        string domain;
        string selector;
        bytes publicKeyModulus; // RSA-2048 modulus N
        uint32 exponent;        // Typically 65537
        bool active;
        uint64 registeredAt;
    }

    // domainHash => selectorHash => DomainKey
    mapping(bytes32 => mapping(bytes32 => DomainKey)) public domainKeys;

    event DomainKeyAdded(string domain, string selector, bytes32 indexed domainHash);
    event DomainKeyRevoked(string domain, string selector, bytes32 indexed domainHash);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addDomainKey(
        string calldata domain,
        string calldata selector,
        bytes calldata publicKeyModulus,
        uint32 exponent
    ) external onlyOwner {
        bytes32 dHash = keccak256(bytes(domain));
        bytes32 sHash = keccak256(bytes(selector));

        domainKeys[dHash][sHash] = DomainKey({
            domain: domain,
            selector: selector,
            publicKeyModulus: publicKeyModulus,
            exponent: exponent,
            active: true,
            registeredAt: uint64(block.timestamp)
        });

        emit DomainKeyAdded(domain, selector, dHash);
    }

    function revokeDomainKey(string calldata domain, string calldata selector) external onlyOwner {
        bytes32 dHash = keccak256(bytes(domain));
        bytes32 sHash = keccak256(bytes(selector));
        domainKeys[dHash][sHash].active = false;
        emit DomainKeyRevoked(domain, selector, dHash);
    }

    function isDomainKeyActive(string calldata domain, string calldata selector) external view returns (bool) {
        bytes32 dHash = keccak256(bytes(domain));
        bytes32 sHash = keccak256(bytes(selector));
        return domainKeys[dHash][sHash].active;
    }
}
