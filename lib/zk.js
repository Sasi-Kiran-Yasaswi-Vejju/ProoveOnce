const crypto = require("crypto");
const path = require("path");
const snarkjs = require("snarkjs");
const { buildPoseidon, buildEddsa } = require("circomlibjs");
const { NUM_FIELDS } = require("./schema");

const BUILD = path.join(__dirname, "..", "build");
const WASM = path.join(BUILD, "eligibility_js", "eligibility.wasm");
const ZKEY = path.join(BUILD, "eligibility_final.zkey");

let _lib;
async function crypt() {
  if (!_lib) {
    const poseidon = await buildPoseidon();
    const eddsa = await buildEddsa();
    _lib = { poseidon, eddsa, F: poseidon.F };
  }
  return _lib;
}

// ---------------- ISSUER SIDE ----------------

/** New BabyJubJub keypair for an issuer (university, government office...). */
async function newIssuerKey() {
  const { eddsa, F } = await crypt();
  const prv = crypto.randomBytes(32);
  const pub = eddsa.prv2pub(prv);
  return { prv, ax: F.toObject(pub[0]), ay: F.toObject(pub[1]) };
}

/**
 * Issuer turns a fields array into a signed credential.
 * Returns the private bundle for the student; only `commitment` goes on-chain.
 */
async function issueCredential(issuerPrv, fields) {
  const { poseidon, eddsa, F } = await crypt();
  if (fields.length !== NUM_FIELDS) throw new Error("need " + NUM_FIELDS + " fields");
  const salt = BigInt("0x" + crypto.randomBytes(31).toString("hex"));
  const commitment = F.toObject(poseidon([...fields, salt]));
  const sig = eddsa.signPoseidon(issuerPrv, F.e(commitment));
  return {
    fields: fields.map((x) => BigInt(x)),
    salt,
    commitment,
    sigR8x: F.toObject(sig.R8[0]),
    sigR8y: F.toObject(sig.R8[1]),
    sigS: sig.S,
  };
}

// ---------------- STUDENT (HOLDER) SIDE ----------------

/**
 * Student builds a proof for one query.
 * cred   : bundle returned by issueCredential (kept private by the student)
 * issuer : { ax, ay } public key of the issuer
 * query  : { fieldA, opA, thresholdA, useSecond, fieldB, opB, thresholdB }
 * Returns calldata ready for EligibilityVerifier.answerQuery.
 */
async function prove(cred, issuer, holderAddress, queryId, query) {
  const input = {
    fields: cred.fields.map(String),
    salt: cred.salt.toString(),
    sigR8x: cred.sigR8x.toString(),
    sigR8y: cred.sigR8y.toString(),
    sigS: cred.sigS.toString(),
    commitment: cred.commitment.toString(),
    issuerAx: issuer.ax.toString(),
    issuerAy: issuer.ay.toString(),
    holder: BigInt(holderAddress).toString(),
    nonce: BigInt(queryId).toString(),
    fieldIndexA: String(query.fieldA),
    opA: String(query.opA),
    thresholdA: String(query.thresholdA),
    fieldIndexB: String(query.useSecond ? query.fieldB : 0),
    opB: String(query.useSecond ? query.opB : 0),
    thresholdB: String(query.useSecond ? query.thresholdB : 0),
    useSecond: query.useSecond ? "1" : "0",
  };
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY);
  const raw = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
  const [a, b, c, pub] = JSON.parse("[" + raw + "]");
  return { a, b, c, pub, publicSignals };
}

module.exports = { newIssuerKey, issueCredential, prove };
