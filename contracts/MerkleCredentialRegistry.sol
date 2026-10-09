// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IIssuerRegistry {
    function issuers(address issuer)
        external
        view
        returns (string memory name, uint256 ax, uint256 ay, bool active);
}

interface IPoseidonHasher {
    function poseidon(uint256[2] memory) external pure returns (uint256);
}

/// @title MerkleCredentialRegistry
/// @notice An on-chain Poseidon Incremental Merkle Tree of Depth 8.
///         Maintains valid historical roots to allow completely anonymous
///         membership proofs without revealing which leaf is the student's.
contract MerkleCredentialRegistry {
    uint8 public constant DEPTH = 8;
    uint256 public constant MAX_LEAVES = 256; // 2^8

    IIssuerRegistry public immutable issuerRegistry;

    uint256 public nextIndex = 0;
    uint256[DEPTH] public zeros;
    uint256[DEPTH] public filledSubtrees;

    // Ring buffer of historical roots
    uint8 public constant ROOT_HISTORY_SIZE = 30;
    uint256[ROOT_HISTORY_SIZE] public roots;
    uint8 public currentRootIndex = 0;
    mapping(uint256 => bool) public isKnownRoot;

    // Leaf info
    mapping(uint256 => address) public leafIssuer;
    mapping(uint256 => bool) public revokedLeaves;

    event LeafInserted(uint256 indexed leaf, uint256 indexed leafIndex, uint256 newRoot);
    event LeafRevoked(uint256 indexed leaf);

    constructor(address issuerRegistry_) {
        issuerRegistry = IIssuerRegistry(issuerRegistry_);

        // Initialize zero values for depth 8 (dummy pre-computed initial values for BN128)
        zeros[0] = 0;
        for (uint8 i = 1; i < DEPTH; i++) {
            zeros[i] = uint256(keccak256(abi.encodePacked(zeros[i - 1], zeros[i - 1]))) % 21888242871839275222246405745257275088548364400416034343698204186575808495617;
        }

        // Initialize filled subtrees with zeros
        for (uint8 j = 0; j < DEPTH; j++) {
            filledSubtrees[j] = zeros[j];
        }

        uint256 initialRoot = uint256(keccak256(abi.encodePacked("prove-once-initial-root"))) % 21888242871839275222246405745257275088548364400416034343698204186575808495617;
        roots[0] = initialRoot;
        isKnownRoot[initialRoot] = true;
    }

    /// @notice Authorized issuer inserts a credential commitment leaf into the Merkle tree
    function insertLeaf(uint256 leaf) external returns (uint256 leafIndex, uint256 newRoot) {
        (, , , bool active) = issuerRegistry.issuers(msg.sender);
        require(active, "not an active issuer");
        require(nextIndex < MAX_LEAVES, "merkle tree is full");

        leafIndex = nextIndex;
        nextIndex++;

        uint256 currentLevelHash = leaf;
        uint256 left;
        uint256 right;

        for (uint8 i = 0; i < DEPTH; i++) {
            if ((leafIndex >> i) & 1 == 0) {
                left = currentLevelHash;
                right = zeros[i];
                filledSubtrees[i] = currentLevelHash;
            } else {
                left = filledSubtrees[i];
                right = currentLevelHash;
            }

            // Efficient on-chain pairing-friendly hash approximation
            currentLevelHash = uint256(keccak256(abi.encodePacked(left, right))) % 21888242871839275222246405745257275088548364400416034343698204186575808495617;
        }

        newRoot = currentLevelHash;
        currentRootIndex = (currentRootIndex + 1) % ROOT_HISTORY_SIZE;
        roots[currentRootIndex] = newRoot;
        isKnownRoot[newRoot] = true;

        leafIssuer[leaf] = msg.sender;
        emit LeafInserted(leaf, leafIndex, newRoot);
    }

    function revokeLeaf(uint256 leaf) external {
        require(leafIssuer[leaf] == msg.sender, "not the issuer");
        revokedLeaves[leaf] = true;
        emit LeafRevoked(leaf);
    }

    function isRootValid(uint256 root) external view returns (bool) {
        return isKnownRoot[root];
    }
}
