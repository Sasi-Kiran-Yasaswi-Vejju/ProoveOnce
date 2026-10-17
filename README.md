# Prove Only Once (ProveOnce)

Zero-knowledge eligibility checks on blockchain. A student's certificates are signed once by an issuer or verified via zk-Email; later, any verifier asks criteria ("CGPA >= 7.5?", "family income <= 8,00,000?") and gets **Yes/No** only without seeing the student's raw data.

---

## Architecture Overview

```
Issuers / Official Emails (DKIM)
         │
         ▼
On-Chain Poseidon Merkle Tree (MerkleCredentialRegistry.sol)
         │
         ▼
Zero-Knowledge Circuit (Groth16 + Poseidon + BabyJubJub + Nullifiers)
         │
         ▼
On-Chain Verifier (EligibilityVerifierV2.sol) ──> Stores YES / NO
```

---

## Implemented Phases

| Phase | Milestone | Status | Key Features |
| :--- | :--- | :---: | :--- |
| **Phase 1** | **Cryptographic Core & Contracts** | **100% Done** | • Circom circuit `eligibility.circom` with 9,977 constraints.<br>• Powers of Tau bn128 14 ceremony + `Groth16Verifier.sol`.<br>• Core contracts: `IssuerRegistry`, `CredentialRegistry`, `EligibilityVerifier`. |
| **Phase 2** | **Web3 UI/UX (Dark/Light Mode)** | **100% Done** | • Interactive portal in `frontend/` (React + Vite + Lucide Icons).<br>• Student Vault, Issuer Hub, and Verifier Portal.<br>• Local blockchain API bridge (`scripts/server.js`). |
| **Phase 3** | **zk-Email Architecture & DKIM** | **100% Done** | • `contracts/DKIMRegistry.sol` for educational domain public keys.<br>• Interactive zk-Email sandbox for transcript `.eml` files. |
| **Phase 4** | **Merkle Tree & Nullifiers** | **100% Done** | • `circuits/eligibility_anonymous.circom` with Merkle membership proofs.<br>• `contracts/MerkleCredentialRegistry.sol` (depth 8 tree with historical roots).<br>• `contracts/EligibilityVerifierV2.sol` with per-query nullifiers for 100% unlinkability. |

---

## Layout

| Path | What |
|---|---|
| `circuits/eligibility.circom` | Core ZK circuit: Poseidon commitment + EdDSA signature + comparators |
| `circuits/merkle.circom` | Reusable Merkle tree membership proof circuit |
| `circuits/eligibility_anonymous.circom` | Phase 4 anonymous circuit with Merkle tree + Nullifiers |
| `contracts/IssuerRegistry.sol` | Root of trust: active issuers and BabyJubJub keys |
| `contracts/CredentialRegistry.sol` | Commitment hash registry with expiry and revocation |
| `contracts/MerkleCredentialRegistry.sol` | On-chain incremental Merkle tree with historical roots |
| `contracts/EligibilityVerifier.sol` | Core eligibility query verifier |
| `contracts/EligibilityVerifierV2.sol` | Anonymous query verifier with nullifiers |
| `contracts/DKIMRegistry.sol` | Phase 3 zk-Email DNS public key registry |
| `frontend/` | React + Vite UI with persistent Dark/Light modes |
| `scripts/demo.js` | Core end-to-end simulation |
| `scripts/demo_anonymous.js` | Phase 4 anonymous Merkle verification simulation |
| `test/` | Hardhat unit test suite (14 passing tests) |

---

## Running the Project

### 1. Run Unit Tests (14 passing tests)
```powershell
npx hardhat test
```

### 2. Run Anonymous Merkle Verification Demo (Phase 4)
```powershell
npx hardhat run scripts/demo_anonymous.js
```

### 3. Run the Web UI
```powershell
npm run ui
```
Open **`http://localhost:5173`** in your browser.

### 4. (Optional) Run Local Blockchain API Server
```powershell
npm run server
```

## Deploying from Remix

Contracts with dependencies must be deployed in this order. After each deployment,
copy the deployed contract address from Remix and paste it into the next contract's
constructor input. The address must be a complete `0x`-prefixed 20-byte address;
do not leave the input blank and do not paste an account name.

1. Deploy `IssuerRegistry` with no constructor arguments.
2. Deploy `CredentialRegistry` with the deployed `IssuerRegistry` address:
   `issuerRegistry_`.
3. Deploy `Groth16Verifier` with no constructor arguments.
4. Deploy `EligibilityVerifier` with two arguments, in this order:
   `zkVerifier_` = `Groth16Verifier` address,
   `registry_` = `CredentialRegistry` address.
5. Deploy `MerkleCredentialRegistry` with the deployed `IssuerRegistry` address:
   `issuerRegistry_`.
6. Deploy `EligibilityVerifierV2` with three arguments, in this order:
   `zkVerifier_` = `Groth16Verifier` address,
   `merkleRegistry_` = `MerkleCredentialRegistry` address,
   `issuerRegistry_` = `IssuerRegistry` address.
7. Deploy `DKIMRegistry` with no constructor arguments.

If Remix reports `invalid address ... value=""`, the constructor argument field is
empty. Deploy `IssuerRegistry` first, then paste its address into the
`CredentialRegistry` constructor field. This is an ABI encoding error in Remix
and occurs before the transaction is sent; it is not caused by the registry logic.
