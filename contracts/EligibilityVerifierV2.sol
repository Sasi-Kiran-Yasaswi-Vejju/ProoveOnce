// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IGroth16VerifierV2 {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[13] calldata input
    ) external view returns (bool);
}

interface IMerkleRegistry {
    function isRootValid(uint256 root) external view returns (bool);
}

interface IIssuerRegistryV2 {
    function issuers(address issuer)
        external
        view
        returns (string memory name, uint256 ax, uint256 ay, bool active);
}

/// @title EligibilityVerifierV2 (Anonymous & Unlinkable)
/// @notice Verifies zero-knowledge eligibility using on-chain Merkle Roots
///         and per-query Nullifiers. Verifiers cannot track students across queries.
contract EligibilityVerifierV2 {
    // Indices for anonymous public signals (2 outputs + 11 inputs = 13 signals)
    uint256 constant S_RESULT = 0;       // Output: 1 = Yes, 0 = No
    uint256 constant S_NULLIFIER = 1;    // Output: Poseidon(salt, nonce)
    uint256 constant S_ROOT = 2;         // Input: On-chain Merkle Root
    uint256 constant S_AX = 3;           // Input: Issuer Ax
    uint256 constant S_AY = 4;           // Input: Issuer Ay
    uint256 constant S_NONCE = 5;        // Input: Query ID
    uint256 constant S_FIELD_A = 6;
    uint256 constant S_OP_A = 7;
    uint256 constant S_TH_A = 8;
    uint256 constant S_FIELD_B = 9;
    uint256 constant S_OP_B = 10;
    uint256 constant S_TH_B = 11;
    uint256 constant S_USE_B = 12;

    struct Query {
        address verifier;
        address requiredIssuer;
        uint8 fieldA;
        uint8 opA;
        uint64 thresholdA;
        bool useSecond;
        uint8 fieldB;
        uint8 opB;
        uint64 thresholdB;
        bool answered;
        bool result;
        uint64 answeredAt;
    }

    IGroth16VerifierV2 public immutable zkVerifier;
    IMerkleRegistry public immutable merkleRegistry;
    IIssuerRegistryV2 public immutable issuerRegistry;

    uint256 public nextQueryId = 1;
    mapping(uint256 => Query) public queries;

    // queryId => (nullifier => hasBeenUsed)
    // Prevents double-answering while preserving 100% unlinkability across different queries
    mapping(uint256 => mapping(uint256 => bool)) public nullifiers;

    event QueryCreated(uint256 indexed queryId, address indexed verifier);
    event AnonymousQueryAnswered(uint256 indexed queryId, uint256 indexed nullifier, bool result);

    constructor(address zkVerifier_, address merkleRegistry_, address issuerRegistry_) {
        require(zkVerifier_ != address(0), "invalid zk verifier");
        require(merkleRegistry_ != address(0), "invalid merkle registry");
        require(issuerRegistry_ != address(0), "invalid issuer registry");
        zkVerifier = IGroth16VerifierV2(zkVerifier_);
        merkleRegistry = IMerkleRegistry(merkleRegistry_);
        issuerRegistry = IIssuerRegistryV2(issuerRegistry_);
    }

    function createQuery(
        address requiredIssuer,
        uint8 fieldA,
        uint8 opA,
        uint64 thresholdA,
        bool useSecond,
        uint8 fieldB,
        uint8 opB,
        uint64 thresholdB
    ) external returns (uint256 id) {
        id = nextQueryId++;
        queries[id] = Query({
            verifier: msg.sender,
            requiredIssuer: requiredIssuer,
            fieldA: fieldA,
            opA: opA,
            thresholdA: thresholdA,
            useSecond: useSecond,
            fieldB: fieldB,
            opB: opB,
            thresholdB: thresholdB,
            answered: false,
            result: false,
            answeredAt: 0
        });
        emit QueryCreated(id, msg.sender);
    }

    function answerQueryAnonymous(
        uint256 id,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[13] calldata s
    ) external {
        Query storage q = queries[id];
        require(q.verifier != address(0), "query does not exist");
        require(!q.answered, "query already answered");

        uint256 nullifier = s[S_NULLIFIER];
        require(!nullifiers[id][nullifier], "nullifier already used for this query");

        // 1) Ensure the proof references a valid on-chain Merkle root
        require(merkleRegistry.isRootValid(s[S_ROOT]), "invalid or unknown merkle root");

        // 2) Verify binding to this specific query
        require(s[S_NONCE] == id, "nonce does not match query id");
        require(
            s[S_FIELD_A] == q.fieldA && s[S_OP_A] == q.opA && s[S_TH_A] == q.thresholdA,
            "question A mismatch"
        );
        require(s[S_USE_B] == (q.useSecond ? 1 : 0), "second question flag mismatch");
        require(
            s[S_FIELD_B] == q.fieldB && s[S_OP_B] == q.opB && s[S_TH_B] == q.thresholdB,
            "question B mismatch"
        );

        // 3) Check issuer
        if (q.requiredIssuer != address(0)) {
            (, uint256 iax, uint256 iay, bool active) = issuerRegistry.issuers(q.requiredIssuer);
            require(active && iax == s[S_AX] && iay == s[S_AY], "unauthorized issuer key");
        }

        // 4) Verify the Groth16 pairing on-chain
        require(zkVerifier.verifyProof(a, b, c, s), "invalid zk proof");

        nullifiers[id][nullifier] = true;
        q.answered = true;
        q.result = (s[S_RESULT] == 1);
        q.answeredAt = uint64(block.timestamp);

        emit AnonymousQueryAnswered(id, nullifier, q.result);
    }

    function getResult(uint256 id) external view returns (bool answered, bool result) {
        Query storage q = queries[id];
        return (q.answered, q.result);
    }
}
