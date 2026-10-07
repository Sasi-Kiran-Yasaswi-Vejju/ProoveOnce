# Prove Only Once

Zero-knowledge yes/no eligibility checks on blockchain. A student's certificates are
signed once by an issuer; later, any verifier asks one question
("CGPA >= 7.5?", "family income <= 8,00,000?") and gets **Yes/No** only.

See `JUSTIFICATION.md` for why each technology was chosen.

## Layout

| Path | What |
|---|---|
| `circuits/eligibility.circom` | ZK circuit: commitment + issuer signature + up to two comparisons (AND) |
| `contracts/` | IssuerRegistry, CredentialRegistry, EligibilityVerifier, MockGroth16Verifier (tests) |
| `lib/schema.js` | The 8 credential slots and operator codes |
| `lib/zk.js` | Issuer signing and student proving helpers |
| `scripts/setup.sh` | Compile circuit, dev trusted setup, generate `contracts/Groth16Verifier.sol` |
| `scripts/demo.js` | End-to-end demo (CGPA, EWS income, CGPA AND backlogs) |
| `test/contracts.test.js` | Contract tests using a mock verifier |

## Prerequisites

- Node.js 18+
- [circom 2.1+](https://docs.circom.io/getting-started/installation/) on your PATH

## Run

```bash
npm install
npx hardhat test          # contract logic tests (no circuit needed)
npm run setup:zk          # once: compiles circuit, creates keys + Groth16Verifier.sol
npm run demo              # full issue -> prove -> verify flow
```

If `setup.sh` reports more than 16384 constraints, change `14` to `15` in the script.

## How a question works

A question is `(field, operator, threshold)`, optionally combined with a second one by AND.
Operators: `>=`, `<=`, `>`, `<`, `==`. Fields are slots in `lib/schema.js`.

## Status

Written against the circom / snarkjs / hardhat APIs but **not yet compiled or run**
(the build environment had no internet). Expect to fix small issues on the first run.
Please send me any error output and I will fix it.

## Roadmap (days 4-5)

React frontend for issuer / student / verifier, Sepolia deployment, revocation and
expiry demo, nullifiers for unlinkability, report and slides.
