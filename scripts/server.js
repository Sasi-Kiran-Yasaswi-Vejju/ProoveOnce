// Local API Server & Cryptographic Bridge for Prove-Once Web UI
const express = require("express");
const cors = require("cors");
const path = require("path");
const { ethers } = require("hardhat");
const { FIELD, OP, fieldsFromObject } = require("../lib/schema");
const { newIssuerKey, issueCredential, prove } = require("../lib/zk");

const app = express();
app.use(cors());
app.use(express.json());

let contracts = null;
let signers = [];
let queryHistory = [];

async function initContracts() {
  if (contracts) return contracts;
  signers = await ethers.getSigners();
  const [owner, university, govOffice, student, bank] = signers;

  const issuerRegistry = await ethers.deployContract("IssuerRegistry");
  const credRegistry = await ethers.deployContract("CredentialRegistry", [await issuerRegistry.getAddress()]);
  const zkVerifier = await ethers.deployContract("Groth16Verifier");
  const eligibility = await ethers.deployContract("EligibilityVerifier", [
    await zkVerifier.getAddress(),
    await credRegistry.getAddress(),
  ]);

  contracts = {
    issuerRegistry,
    credRegistry,
    zkVerifier,
    eligibility,
    owner,
    university,
    govOffice,
    student,
    bank,
  };

  console.log("Prove-Once Contracts deployed on in-memory network:");
  console.log("IssuerRegistry:", await issuerRegistry.getAddress());
  console.log("CredentialRegistry:", await credRegistry.getAddress());
  console.log("Groth16Verifier:", await zkVerifier.getAddress());
  console.log("EligibilityVerifier:", await eligibility.getAddress());

  return contracts;
}

// ----------------- API ENDPOINTS -----------------

// Status & Contract Addresses
app.get("/api/status", async (req, res) => {
  try {
    const c = await initContracts();
    res.json({
      success: true,
      contracts: {
        issuerRegistry: await c.issuerRegistry.getAddress(),
        credRegistry: await c.credRegistry.getAddress(),
        zkVerifier: await c.zkVerifier.getAddress(),
        eligibility: await c.eligibility.getAddress(),
      },
      accounts: {
        owner: c.owner.address,
        university: c.university.address,
        govOffice: c.govOffice.address,
        student: c.student.address,
        bank: c.bank.address,
      },
      queryCount: queryHistory.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate BabyJubJub Keypair for an Issuer
app.post("/api/issuer/key", async (req, res) => {
  try {
    const key = await newIssuerKey();
    res.json({
      success: true,
      prvHex: key.prv.toString("hex"),
      ax: key.ax.toString(),
      ay: key.ay.toString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Register Issuer on Blockchain
app.post("/api/issuer/register", async (req, res) => {
  try {
    const { issuerAddress, name, ax, ay } = req.body;
    const c = await initContracts();
    const tx = await c.issuerRegistry.connect(c.owner).addIssuer(
      issuerAddress || c.university.address,
      name || "Verified Issuer",
      BigInt(ax),
      BigInt(ay)
    );
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Issue Credential (Off-chain signature + On-chain Commitment)
app.post("/api/issuer/issue", async (req, res) => {
  try {
    const { prvHex, fields, issuerAddress, expiryDays } = req.body;
    const c = await initContracts();
    const prv = Buffer.from(prvHex, "hex");
    const fieldsArr = fieldsFromObject(fields);

    const bundle = await issueCredential(prv, fieldsArr);

    const expiry = expiryDays
      ? Math.floor(Date.now() / 1000) + Number(expiryDays) * 86400
      : 0;

    const issuerSigner = signers.find(
      (s) => s.address.toLowerCase() === (issuerAddress || "").toLowerCase()
    ) || c.university;

    const tx = await c.credRegistry.connect(issuerSigner).register(bundle.commitment, expiry);
    await tx.wait();

    res.json({
      success: true,
      commitment: bundle.commitment.toString(),
      bundle: {
        fields: bundle.fields.map(String),
        salt: bundle.salt.toString(),
        commitment: bundle.commitment.toString(),
        sigR8x: bundle.sigR8x.toString(),
        sigR8y: bundle.sigR8y.toString(),
        sigS: bundle.sigS.toString(),
      },
      txHash: tx.hash,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create Verification Query (by Verifier)
app.post("/api/query/create", async (req, res) => {
  try {
    const {
      expectedHolder,
      requiredIssuer,
      fieldA,
      opA,
      thresholdA,
      useSecond,
      fieldB,
      opB,
      thresholdB,
    } = req.body;
    const c = await initContracts();

    const queryInput = {
      expectedHolder: expectedHolder || ethers.ZeroAddress,
      requiredIssuer: requiredIssuer || ethers.ZeroAddress,
      fieldA: Number(fieldA),
      opA: Number(opA),
      thresholdA: BigInt(thresholdA),
      useSecond: Boolean(useSecond),
      fieldB: fieldB ? Number(fieldB) : 0,
      opB: opB ? Number(opB) : 0,
      thresholdB: thresholdB ? BigInt(thresholdB) : 0n,
    };

    const nextId = await c.eligibility.nextQueryId();
    const tx = await c.eligibility.connect(c.bank).createQuery(queryInput);
    await tx.wait();

    const item = {
      id: nextId.toString(),
      verifier: c.bank.address,
      expectedHolder: queryInput.expectedHolder,
      requiredIssuer: queryInput.requiredIssuer,
      fieldA: queryInput.fieldA,
      opA: queryInput.opA,
      thresholdA: queryInput.thresholdA.toString(),
      useSecond: queryInput.useSecond,
      fieldB: queryInput.fieldB,
      opB: queryInput.opB,
      thresholdB: queryInput.thresholdB.toString(),
      answered: false,
      result: false,
      createdAt: Date.now(),
      txHash: tx.hash,
    };
    queryHistory.push(item);

    res.json({ success: true, queryId: nextId.toString(), txHash: tx.hash });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Student Proves and Answers Query
app.post("/api/student/prove", async (req, res) => {
  try {
    const { queryId, bundle, issuerAx, issuerAy, studentAddress } = req.body;
    const c = await initContracts();

    const storedQuery = queryHistory.find((q) => q.id === String(queryId));
    if (!storedQuery) throw new Error("Query not found");

    const queryObj = {
      fieldA: storedQuery.fieldA,
      opA: storedQuery.opA,
      thresholdA: storedQuery.thresholdA,
      useSecond: storedQuery.useSecond,
      fieldB: storedQuery.fieldB,
      opB: storedQuery.opB,
      thresholdB: storedQuery.thresholdB,
    };

    const studentSigner = c.student;
    const holderAddr = studentAddress || studentSigner.address;

    const cred = {
      fields: bundle.fields.map(BigInt),
      salt: BigInt(bundle.salt),
      commitment: BigInt(bundle.commitment),
      sigR8x: BigInt(bundle.sigR8x),
      sigR8y: BigInt(bundle.sigR8y),
      sigS: BigInt(bundle.sigS),
    };

    const issuer = {
      ax: BigInt(issuerAx),
      ay: BigInt(issuerAy),
    };

    const p = await prove(cred, issuer, holderAddr, queryId, queryObj);

    const tx = await c.eligibility
      .connect(studentSigner)
      .answerQuery(queryId, p.a, p.b, p.c, p.pub);
    await tx.wait();

    const [answered, result] = await c.eligibility.getResult(queryId);

    storedQuery.answered = answered;
    storedQuery.result = result;
    storedQuery.answeredAt = Date.now();

    res.json({
      success: true,
      answered,
      result,
      publicSignals: p.publicSignals,
      txHash: tx.hash,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List all queries
app.get("/api/queries", async (req, res) => {
  res.json({ success: true, queries: queryHistory });
});

// Run Demo Pipeline
app.post("/api/demo/run", async (req, res) => {
  try {
    const c = await initContracts();
    const uniKey = await newIssuerKey();
    const govKey = await newIssuerKey();

    await (
      await c.issuerRegistry.connect(c.owner).addIssuer(c.university.address, "Anna University", uniKey.ax, uniKey.ay)
    ).wait();
    await (
      await c.issuerRegistry.connect(c.owner).addIssuer(c.govOffice.address, "Tahsildar Office", govKey.ax, govKey.ay)
    ).wait();

    const oneYear = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;

    const academic = await issueCredential(
      uniKey.prv,
      fieldsFromObject({ CGPA_X100: 845, GRAD_YEAR: 2024, BIRTH_YEAR: 2002, BACKLOGS: 0 })
    );
    await (await c.credRegistry.connect(c.university).register(academic.commitment, oneYear)).wait();

    const income = await issueCredential(
      govKey.prv,
      fieldsFromObject({ ANNUAL_INCOME: 650000, CATEGORY: 1 })
    );
    await (await c.credRegistry.connect(c.govOffice).register(income.commitment, oneYear)).wait();

    res.json({
      success: true,
      message: "Demo initialized: Issuers registered, Academic & Income credentials issued on-chain.",
      issuers: {
        university: { address: c.university.address, name: "Anna University", ax: uniKey.ax.toString(), ay: uniKey.ay.toString(), prvHex: uniKey.prv.toString("hex") },
        govOffice: { address: c.govOffice.address, name: "Tahsildar Office", ax: govKey.ax.toString(), ay: govKey.ay.toString(), prvHex: govKey.prv.toString("hex") },
      },
      credentials: {
        academic: {
          commitment: academic.commitment.toString(),
          data: { CGPA: "8.45", GRAD_YEAR: "2024", BIRTH_YEAR: "2002", BACKLOGS: "0" },
          bundle: {
            fields: academic.fields.map(String),
            salt: academic.salt.toString(),
            commitment: academic.commitment.toString(),
            sigR8x: academic.sigR8x.toString(),
            sigR8y: academic.sigR8y.toString(),
            sigS: academic.sigS.toString(),
          },
        },
        income: {
          commitment: income.commitment.toString(),
          data: { ANNUAL_INCOME: "650,000", CATEGORY: "OBC (1)" },
          bundle: {
            fields: income.fields.map(String),
            salt: income.salt.toString(),
            commitment: income.commitment.toString(),
            sigR8x: income.sigR8x.toString(),
            sigR8y: income.sigR8y.toString(),
            sigS: income.sigS.toString(),
          },
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`Prove-Once ZK API Server running on http://localhost:${PORT}`);
  try {
    await initContracts();
  } catch (e) {
    console.error("Contract initialization error:", e.message);
  }
});
