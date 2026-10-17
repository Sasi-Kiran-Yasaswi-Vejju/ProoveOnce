// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IIssuerRegistry {
    function issuers(address issuer)
        external
        view
        returns (string memory name, uint256 ax, uint256 ay, bool active);
}

/// @title CredentialRegistry
/// @notice Stores only a hash (commitment) of each credential, never the data.
///         Tracks expiry and revocation so old or cancelled credentials stop working.
contract CredentialRegistry {
    struct Credential {
        address issuer;
        uint64 expiry; // 0 = never expires
        bool revoked;
        bool exists;
    }

    IIssuerRegistry public immutable issuerRegistry;
    mapping(uint256 => Credential) public credentials;

    event CredentialRegistered(uint256 indexed commitment, address indexed issuer, uint64 expiry);
    event CredentialRevoked(uint256 indexed commitment, address indexed issuer);

    constructor(address issuerRegistry_) {
        require(issuerRegistry_ != address(0), "invalid issuer registry");
        issuerRegistry = IIssuerRegistry(issuerRegistry_);
    }

    function register(uint256 commitment, uint64 expiry) external {
        (, , , bool active) = issuerRegistry.issuers(msg.sender);
        require(active, "not an active issuer");
        require(!credentials[commitment].exists, "already registered");
        require(expiry == 0 || expiry > block.timestamp, "expiry in the past");
        credentials[commitment] = Credential(msg.sender, expiry, false, true);
        emit CredentialRegistered(commitment, msg.sender, expiry);
    }

    function revoke(uint256 commitment) external {
        Credential storage c = credentials[commitment];
        require(c.exists, "unknown credential");
        require(c.issuer == msg.sender, "not the issuer");
        c.revoked = true;
        emit CredentialRevoked(commitment, msg.sender);
    }

    /// @notice Is this credential usable, and does the proof's issuer key match the
    ///         key the registry has for the credential's issuer?
    function check(uint256 commitment, uint256 ax, uint256 ay)
        external
        view
        returns (bool ok, address issuer)
    {
        Credential storage c = credentials[commitment];
        if (!c.exists || c.revoked) return (false, address(0));
        if (c.expiry != 0 && c.expiry < block.timestamp) return (false, c.issuer);
        (, uint256 iax, uint256 iay, bool active) = issuerRegistry.issuers(c.issuer);
        if (!active || iax != ax || iay != ay) return (false, c.issuer);
        return (true, c.issuer);
    }
}
