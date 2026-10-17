// Browser-side Groth16 proving for the Eligibility circuit (same inputs as lib/zk.js `prove`).
// Circuit files and the snarkjs browser bundle are served from /public/zk.
const WASM_URL = '/zk/eligibility.wasm';
const ZKEY_URL = '/zk/eligibility_final.zkey';
const SNARKJS_URL = '/zk/snarkjs.min.js';

let snarkjsPromise;
function loadSnarkjs() {
  if (window.snarkjs) return Promise.resolve(window.snarkjs);
  if (!snarkjsPromise) {
    snarkjsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SNARKJS_URL;
      script.onload = () => resolve(window.snarkjs);
      script.onerror = () => reject(new Error('Could not load snarkjs from ' + SNARKJS_URL));
      document.head.appendChild(script);
    });
  }
  return snarkjsPromise;
}

const CREDENTIAL_KEYS = ['fields', 'salt', 'sigR8x', 'sigR8y', 'sigS', 'commitment', 'issuerAx', 'issuerAy', 'issuerAddress'];

/** Validates an imported credential bundle (build/student-credential.json). */
export function parseCredential(json) {
  const cred = typeof json === 'string' ? JSON.parse(json) : json;
  const missing = CREDENTIAL_KEYS.filter((k) => cred[k] === undefined);
  if (missing.length) throw new Error('Credential file is missing: ' + missing.join(', '));
  if (!Array.isArray(cred.fields) || cred.fields.length !== 8) throw new Error('Credential must have 8 fields');
  return cred;
}

/**
 * Builds the proof for one on-chain query.
 * Returns the tuple EligibilityVerifier.answerQuery expects plus the circuit's Yes/No output.
 */
export async function proveQuery(cred, holderAddress, query) {
  const snarkjs = await loadSnarkjs();
  const input = {
    fields: cred.fields.map(String),
    salt: String(cred.salt),
    sigR8x: String(cred.sigR8x),
    sigR8y: String(cred.sigR8y),
    sigS: String(cred.sigS),
    commitment: String(cred.commitment),
    issuerAx: String(cred.issuerAx),
    issuerAy: String(cred.issuerAy),
    holder: BigInt(holderAddress).toString(),
    nonce: String(query.id),
    fieldIndexA: String(query.fieldA),
    opA: String(query.opA),
    thresholdA: String(query.thresholdA),
    // The contract compares B against storage even when useSecond is false, so pass it as stored.
    fieldIndexB: String(query.fieldB),
    opB: String(query.opB),
    thresholdB: String(query.thresholdB),
    useSecond: query.useSecond ? '1' : '0',
  };
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM_URL, ZKEY_URL);
  const raw = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
  const [a, b, c, pub] = JSON.parse('[' + raw + ']');
  return { proof: { a, b, c, input: pub }, result: publicSignals[0] === '1' };
}
