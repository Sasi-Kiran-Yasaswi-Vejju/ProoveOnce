// Contract-logic tests with a mock ZK verifier (no circuit needed).
// Run: npx hardhat test
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Prove-once contracts (mock verifier)", () => {
  let owner, uni, other, student, bank;
  let issuerReg, credReg, elig;
  const AX = 111n, AY = 222n, COMMIT = 999n;

  const zeros2 = [0, 0];
  const zeros22 = [[0, 0], [0, 0]];

  function signals(over = {}) {
    const s = {
      result: 1n, commitment: COMMIT, ax: AX, ay: AY,
      holder: BigInt(student.address), nonce: 1n,
      fa: 0n, opa: 0n, tha: 750n, fb: 0n, opb: 0n, thb: 0n, use: 0n, ...over,
    };
    return [s.result, s.commitment, s.ax, s.ay, s.holder, s.nonce,
            s.fa, s.opa, s.tha, s.fb, s.opb, s.thb, s.use];
  }

  const query = (over = {}) => ({
    expectedHolder: ethers.ZeroAddress, requiredIssuer: ethers.ZeroAddress,
    fieldA: 0, opA: 0, thresholdA: 750, useSecond: false,
    fieldB: 0, opB: 0, thresholdB: 0, ...over,
  });

  const answer = (signer, id, over = {}) =>
    elig.connect(signer).answerQuery(id, {
      a: zeros2,
      b: zeros22,
      c: zeros2,
      input: signals(over),
    });

  beforeEach(async () => {
    [owner, uni, other, student, bank] = await ethers.getSigners();
    issuerReg = await ethers.deployContract("IssuerRegistry");
    credReg = await ethers.deployContract("CredentialRegistry", [await issuerReg.getAddress()]);
    const mock = await ethers.deployContract("MockGroth16Verifier");
    elig = await ethers.deployContract("EligibilityVerifier", [
      await mock.getAddress(), await credReg.getAddress(),
    ]);
    await issuerReg.addIssuer(uni.address, "Uni", AX, AY);
    await credReg.connect(uni).register(COMMIT, 0);
  });

  it("answers a valid query with Yes", async () => {
    await elig.connect(bank).createQuery(query());
    await answer(student, 1);
    const [answered, result] = await elig.getResult(1);
    expect(answered).to.equal(true);
    expect(result).to.equal(true);
  });

  it("records No when the proof says result = 0", async () => {
    await elig.connect(bank).createQuery(query());
    await answer(student, 1, { result: 0n });
    const [, result] = await elig.getResult(1);
    expect(result).to.equal(false);
  });

  it("rejects a proof for an easier threshold than the one asked", async () => {
    await elig.connect(bank).createQuery(query());
    await expect(
      answer(student, 1, { tha: 500n })
    ).to.be.revertedWith("threshold A mismatch");
  });

  it("rejects a proof copied by someone else", async () => {
    await elig.connect(bank).createQuery(query());
    await expect(
      answer(other, 1)
    ).to.be.revertedWith("proof not bound to sender");
  });

  it("rejects a proof for another query id (replay)", async () => {
    await elig.connect(bank).createQuery(query());
    await elig.connect(bank).createQuery(query());
    await expect(
      answer(student, 2, { nonce: 1n })
    ).to.be.revertedWith("wrong query id");
  });

  it("rejects revoked credentials", async () => {
    await credReg.connect(uni).revoke(COMMIT);
    await elig.connect(bank).createQuery(query());
    await expect(
      answer(student, 1)
    ).to.be.revertedWith("credential invalid, expired or revoked");
  });

  it("rejects an issuer the verifier does not accept", async () => {
    await elig.connect(bank).createQuery(query({ requiredIssuer: other.address }));
    await expect(
      answer(student, 1)
    ).to.be.revertedWith("issuer not accepted");
  });

  it("rejects a wrong issuer key inside the proof", async () => {
    await elig.connect(bank).createQuery(query());
    await expect(
      answer(student, 1, { ax: 5n })
    ).to.be.revertedWith("credential invalid, expired or revoked");
  });

  it("only registered issuers can register credentials", async () => {
    await expect(credReg.connect(other).register(1234n, 0)).to.be.revertedWith("not an active issuer");
  });
});
