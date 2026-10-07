// End-to-end demo on an in-process Hardhat chain.
//   npm run setup:zk   (once)
//   npm run demo
const { ethers } = require("hardhat");
const { FIELD, OP, fieldsFromObject } = require("../lib/schema");
const { newIssuerKey, issueCredential, prove } = require("../lib/zk");

const ZERO = ethers.ZeroAddress;
const yesNo = (b) => (b ? "YES" : "NO");

async function ask(eligibility, verifierSigner, student, cred, issuerKey, q) {
  const query = {
    expectedHolder: q.expectedHolder ?? ZERO,
    requiredIssuer: q.requiredIssuer ?? ZERO,
    fieldA: q.fieldA, opA: q.opA, thresholdA: q.thresholdA,
    useSecond: !!q.useSecond,
    fieldB: q.fieldB ?? 0, opB: q.opB ?? 0, thresholdB: q.thresholdB ?? 0,
  };
  const id = await eligibility.nextQueryId();
  await (await eligibility.connect(verifierSigner).createQuery(query)).wait();

  const p = await prove(cred, issuerKey, student.address, id, query);
  await (await eligibility.connect(student).answerQuery(id, p.a, p.b, p.c, p.pub)).wait();

  const [answered, result] = await eligibility.getResult(id);
  return { id, answered, result };
}

async function main() {
  const [owner, university, govOffice, student, bank] = await ethers.getSigners();

  // ---- deploy ----
  const issuerRegistry = await ethers.deployContract("IssuerRegistry");
  const credRegistry = await ethers.deployContract("CredentialRegistry", [await issuerRegistry.getAddress()]);
  const zkVerifier = await ethers.deployContract("Groth16Verifier");
  const eligibility = await ethers.deployContract("EligibilityVerifier", [
    await zkVerifier.getAddress(),
    await credRegistry.getAddress(),
  ]);
  console.log("Contracts deployed.\n");

  // ---- trusted issuers join the registry ----
  const uniKey = await newIssuerKey();
  const govKey = await newIssuerKey();
  await (await issuerRegistry.connect(owner).addIssuer(university.address, "Anna University", uniKey.ax, uniKey.ay)).wait();
  await (await issuerRegistry.connect(owner).addIssuer(govOffice.address, "Tahsildar Office", govKey.ax, govKey.ay)).wait();

  // ---- ISSUE ONCE: certificates are signed and only their hash goes on-chain ----
  const oneYear = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;

  const academic = await issueCredential(
    uniKey.prv,
    fieldsFromObject({ CGPA_X100: 845, GRAD_YEAR: 2024, BIRTH_YEAR: 2002, BACKLOGS: 0 })
  );
  await (await credRegistry.connect(university).register(academic.commitment, oneYear)).wait();

  const income = await issueCredential(
    govKey.prv,
    fieldsFromObject({ ANNUAL_INCOME: 650000, CATEGORY: 1 })
  );
  await (await credRegistry.connect(govOffice).register(income.commitment, oneYear)).wait();
  console.log("Credentials issued (only commitments are on-chain).\n");

  // ---- VERIFY MANY TIMES: bank asks yes/no questions ----
  let r;

  r = await ask(eligibility, bank, student, academic, uniKey, {
    requiredIssuer: university.address,
    fieldA: FIELD.CGPA_X100, opA: OP.GE, thresholdA: 750,
  });
  console.log("Q1  CGPA >= 7.50 ?                       ->", yesNo(r.result));

  r = await ask(eligibility, bank, student, academic, uniKey, {
    requiredIssuer: university.address,
    fieldA: FIELD.CGPA_X100, opA: OP.GE, thresholdA: 900,
  });
  console.log("Q2  CGPA >= 9.00 ?                       ->", yesNo(r.result));

  r = await ask(eligibility, bank, student, income, govKey, {
    requiredIssuer: govOffice.address,
    fieldA: FIELD.ANNUAL_INCOME, opA: OP.LE, thresholdA: 800000,
  });
  console.log("Q3  EWS: family income <= 8,00,000 ?     ->", yesNo(r.result));

  r = await ask(eligibility, bank, student, academic, uniKey, {
    requiredIssuer: university.address,
    fieldA: FIELD.CGPA_X100, opA: OP.GE, thresholdA: 750,
    useSecond: true,
    fieldB: FIELD.BACKLOGS, opB: OP.EQ, thresholdB: 0,
  });
  console.log("Q4  CGPA >= 7.50 AND no backlogs ?       ->", yesNo(r.result));

  // ---- the student's raw data was never sent anywhere ----
  console.log("\nVerifier learned only Yes/No. CGPA, income and certificates stayed private.");
}

main().catch((e) => { console.error(e); process.exit(1); });
