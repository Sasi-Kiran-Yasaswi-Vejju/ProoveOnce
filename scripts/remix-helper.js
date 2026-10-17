// Generates the values you paste into Remix when demoing the deployed contracts.
//   node scripts/remix-helper.js setup
//   node scripts/remix-helper.js prove <studentAddress> <queryId> <fieldA> <opA> <thresholdA> [<fieldB> <opB> <thresholdB>]
// State (issuer private key + credential secrets) is kept in build/remix-demo.json.
const fs = require("fs");
const path = require("path");
const { FIELD, fieldsFromObject } = require("../lib/schema");
const { newIssuerKey, issueCredential, prove } = require("../lib/zk");

const STATE = path.join(__dirname, "..", "build", "remix-demo.json");

const STUDENT_DATA = { CGPA_X100: 845, GRAD_YEAR: 2024, ANNUAL_INCOME: 650000, CATEGORY: 1, BIRTH_YEAR: 2002, BACKLOGS: 0 };

const toJson = (v) => JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x));

async function setup() {
  const key = await newIssuerKey();
  const cred = await issueCredential(key.prv, fieldsFromObject(STUDENT_DATA));
  fs.writeFileSync(STATE, toJson({ issuer: { prv: key.prv.toString("hex"), ax: key.ax, ay: key.ay }, cred }, null, 2));

  console.log("Private student data (never goes on-chain):", STUDENT_DATA, "\n");
  console.log("IssuerRegistry.addIssuer  ->  ax:");
  console.log(key.ax.toString());
  console.log("ay:");
  console.log(key.ay.toString());
  console.log("\nCredentialRegistry.register  ->  commitment:");
  console.log(cred.commitment.toString());
  console.log("\nSaved to", STATE);
}

async function proveCmd(holder, queryId, fieldA, opA, thresholdA, fieldB, opB, thresholdB) {
  if (!fs.existsSync(STATE)) throw new Error("run `setup` first");
  const s = JSON.parse(fs.readFileSync(STATE, "utf8"));
  const cred = {
    fields: s.cred.fields.map(BigInt),
    salt: BigInt(s.cred.salt),
    commitment: BigInt(s.cred.commitment),
    sigR8x: BigInt(s.cred.sigR8x),
    sigR8y: BigInt(s.cred.sigR8y),
    sigS: BigInt(s.cred.sigS),
  };
  const issuer = { ax: BigInt(s.issuer.ax), ay: BigInt(s.issuer.ay) };
  const useSecond = fieldB !== undefined;
  const query = {
    fieldA: Number(fieldA), opA: Number(opA), thresholdA: Number(thresholdA),
    useSecond,
    fieldB: useSecond ? Number(fieldB) : 0, opB: useSecond ? Number(opB) : 0, thresholdB: useSecond ? Number(thresholdB) : 0,
  };

  const p = await prove(cred, issuer, holder, queryId, query);
  console.log(`Proof result signal: ${p.publicSignals[0] === "1" ? "1 (YES)" : "0 (NO)"}\n`);
  console.log("EligibilityVerifier.answerQuery  ->  id:", queryId);
  console.log("proof (paste as one line):");
  console.log(JSON.stringify([p.a, p.b, p.c, p.pub]));
  return p;
}

// The student's private bundle for the web UI's "Import credential" button (no issuer private key).
function exportCredential(issuerAddress) {
  if (!fs.existsSync(STATE)) throw new Error("run `setup` first");
  const s = JSON.parse(fs.readFileSync(STATE, "utf8"));
  const out = path.join(__dirname, "..", "build", "student-credential.json");
  const bundle = {
    title: "B.Tech Transcript & Income Certificate",
    issuerAddress,
    issuerAx: s.issuer.ax,
    issuerAy: s.issuer.ay,
    ...s.cred,
  };
  fs.writeFileSync(out, JSON.stringify(bundle, null, 2));
  console.log("Wrote", out);
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "setup") return setup();
  if (cmd === "prove" && args.length >= 5) return proveCmd(...args);
  if (cmd === "export-credential" && args.length === 1) return exportCredential(args[0]);
  console.log("usage:\n  node scripts/remix-helper.js setup\n  node scripts/remix-helper.js prove <studentAddress> <queryId> <fieldA> <opA> <thresholdA> [<fieldB> <opB> <thresholdB>]\n  node scripts/remix-helper.js export-credential <issuerAddress>");
  console.log("fields:", FIELD, "\nops: 0 >=, 1 <=, 2 >, 3 <, 4 ==");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e.message || e); process.exit(1); });
