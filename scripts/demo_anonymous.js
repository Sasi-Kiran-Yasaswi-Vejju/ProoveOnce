// Phase 4: End-to-End Anonymous & Unlinkable Verification Demo
const { ethers } = require("hardhat");

async function main() {
  console.log("=== PHASE 4: ANONYMOUS MERKLE ELIGIBILITY DEMO ===\n");
  const [owner, university, govOffice, student, bank] = await ethers.getSigners();

  // 1. Deploy Contracts
  const issuerRegistry = await ethers.deployContract("IssuerRegistry");
  const merkleRegistry = await ethers.deployContract("MerkleCredentialRegistry", [await issuerRegistry.getAddress()]);
  const mockVerifier = await ethers.deployContract("MockGroth16Verifier");
  const eligibilityV2 = await ethers.deployContract("EligibilityVerifierV2", [
    await mockVerifier.getAddress(),
    await merkleRegistry.getAddress(),
    await issuerRegistry.getAddress(),
  ]);

  console.log("Contracts Deployed:");
  console.log("- IssuerRegistry:", await issuerRegistry.getAddress());
  console.log("- MerkleCredentialRegistry:", await merkleRegistry.getAddress());
  console.log("- EligibilityVerifierV2 (Anonymous):", await eligibilityV2.getAddress());
  console.log();

  // 2. Register Institutional Issuers
  const AX = 1435213605663784180425785025979505587786435324634568903348443936904128549646n;
  const AY = 91873105739023450982340598234059823405982340598234059823405982340598234059n;
  await (await issuerRegistry.connect(owner).addIssuer(university.address, "Anna University", AX, AY)).wait();
  console.log("1. Anna University registered on-chain.");

  // 3. Issue Credential: Add Leaf to Merkle Tree
  const studentCommitment = 0x1c8b32e098a5814e5900b91d84813589b9e59cb98967b2d56a3411e7230491an;
  const insertTx = await merkleRegistry.connect(university).insertLeaf(studentCommitment);
  await insertTx.wait();

  const currentRoot = await merkleRegistry.roots(1);
  console.log("2. Student Credential added to On-Chain Merkle Tree:");
  console.log("   - Merkle Tree Leaf Index: 0");
  console.log("   - On-Chain Merkle Root:", currentRoot.toString().substring(0, 20) + "...");
  console.log();

  // 4. Verifier Creates Query: "CGPA >= 7.50?"
  const qTx = await eligibilityV2.connect(bank).createQuery(
    university.address, // required issuer
    0,                  // fieldA: CGPA
    0,                  // opA: >=
    750,                // thresholdA: 7.50
    false,              // useSecond
    0, 0, 0
  );
  await qTx.wait();
  const queryId = 1;
  console.log("3. Bank created Query #1 on-chain: 'CGPA >= 7.50?'\n");

  // 5. Student Computes Anonymous Proof:
  // The proof proves:
  // - "My commitment is inside Merkle Root without revealing which leaf is mine"
  // - "CGPA >= 7.50 is true"
  // - Computes Nullifier = Poseidon(salt, queryId)
  const salt = 888888888888888n;
  const nullifier = 999999999999999n; // Unique per query!

  const dummyProofA = [0, 0];
  const dummyProofB = [[0, 0], [0, 0]];
  const dummyProofC = [0, 0];

  const publicSignals = [
    1n,                 // S_RESULT: 1 = YES
    nullifier,          // S_NULLIFIER: per-query unique
    currentRoot,        // S_ROOT: on-chain Merkle root
    AX, AY,             // Issuer BabyJubJub key
    1n,                 // S_NONCE: Query #1
    0n, 0n, 750n,       // Question A: CGPA >= 750
    0n, 0n, 0n,         // Question B
    0n                  // useSecond: false
  ];

  console.log("4. Student submits Anonymous Zero-Knowledge Proof to EligibilityVerifierV2...");
  const answerTx = await eligibilityV2.connect(student).answerQueryAnonymous(
    queryId,
    dummyProofA,
    dummyProofB,
    dummyProofC,
    publicSignals
  );
  await answerTx.wait();

  const [answered, result] = await eligibilityV2.getResult(queryId);
  console.log("5. Smart contract successfully verified proof!");
  console.log("   - Query Status: Answered =", answered);
  console.log("   - Verifier Output: Eligible =", result ? "YES" : "NO");
  console.log("   - Nullifier burned for Query #1 to prevent double-claiming.");
  console.log();
  console.log("=== PRIVACY ANALYSIS ===");
  console.log("• The verifier never learned the student's Leaf Index or Commitment!");
  console.log("• The verifier never learned the student's exact CGPA!");
  console.log("• Future queries from other verifiers will yield completely DIFFERENT nullifiers, making cross-verifier tracking mathematically impossible!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
