const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Phase 4 & Phase 3: Anonymous Merkle Registry & DKIM", () => {
  let owner, uni, student, bank, other;
  let issuerReg, merkleReg, eligV2, mockVerifier, dkimReg;
  const AX = 111n, AY = 222n, LEAF = 999999n;

  const zeros2 = [0, 0];
  const zeros22 = [[0, 0], [0, 0]];

  beforeEach(async () => {
    [owner, uni, student, bank, other] = await ethers.getSigners();

    issuerReg = await ethers.deployContract("IssuerRegistry");
    merkleReg = await ethers.deployContract("MerkleCredentialRegistry", [await issuerReg.getAddress()]);
    mockVerifier = await ethers.deployContract("MockGroth16Verifier");
    eligV2 = await ethers.deployContract("EligibilityVerifierV2", [
      await mockVerifier.getAddress(),
      await merkleReg.getAddress(),
      await issuerReg.getAddress(),
    ]);
    dkimReg = await ethers.deployContract("DKIMRegistry");

    await issuerReg.addIssuer(uni.address, "Anna University", AX, AY);
  });

  describe("Phase 4: Merkle Tree & Unlinkable Nullifiers", () => {
    it("allows registered issuer to insert a credential leaf into Merkle tree", async () => {
      const tx = await merkleReg.connect(uni).insertLeaf(LEAF);
      await tx.wait();

      expect(await merkleReg.nextIndex()).to.equal(1n);
      const root = await merkleReg.roots(1);
      expect(await merkleReg.isRootValid(root)).to.equal(true);
    });

    it("prevents unregistered entities from inserting leaves", async () => {
      await expect(merkleReg.connect(other).insertLeaf(LEAF)).to.be.revertedWith("not an active issuer");
    });

    it("verifies query with valid Merkle root and enforces per-query nullifier uniqueness", async () => {
      const tx = await merkleReg.connect(uni).insertLeaf(LEAF);
      await tx.wait();
      const validRoot = await merkleReg.roots(1);

      // Bank creates Query #1
      await eligV2.connect(bank).createQuery(uni.address, 0, 0, 750, false, 0, 0, 0);

      const nullifier1 = 77777n;
      // Signals: [result, nullifier, root, ax, ay, nonce, fa, opa, tha, fb, opb, thb, useB]
      const signals = [
        1n, nullifier1, validRoot, AX, AY, 1n,
        0n, 0n, 750n, 0n, 0n, 0n, 0n
      ];

      // Student answers query anonymously
      await eligV2.connect(student).answerQueryAnonymous(1, zeros2, zeros22, zeros2, signals);
      const [answered, result] = await eligV2.getResult(1);
      expect(answered).to.equal(true);
      expect(result).to.equal(true);

      // Attempting to submit the same nullifier for Query #1 reverts!
      await expect(
        eligV2.connect(student).answerQueryAnonymous(1, zeros2, zeros22, zeros2, signals)
      ).to.be.revertedWith("query already answered");
    });
  });

  describe("Phase 3: DKIM Registry for zk-Email", () => {
    it("registers and validates official educational domains", async () => {
      const dummyModulus = ethers.toUtf8Bytes("rsa-2048-public-key-modulus-annauniv");
      await dkimReg.addDomainKey("annauniv.edu", "s1", dummyModulus, 65537);

      expect(await dkimReg.isDomainKeyActive("annauniv.edu", "s1")).to.equal(true);
      expect(await dkimReg.isDomainKeyActive("unknown.edu", "s1")).to.equal(false);
    });

    it("allows owner to revoke compromised or rotated domain keys", async () => {
      const dummyModulus = ethers.toUtf8Bytes("modulus");
      await dkimReg.addDomainKey("iitd.ac.in", "2026", dummyModulus, 65537);
      expect(await dkimReg.isDomainKeyActive("iitd.ac.in", "2026")).to.equal(true);

      await dkimReg.revokeDomainKey("iitd.ac.in", "2026");
      expect(await dkimReg.isDomainKeyActive("iitd.ac.in", "2026")).to.equal(false);
    });
  });
});
