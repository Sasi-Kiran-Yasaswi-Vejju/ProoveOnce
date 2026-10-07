#!/usr/bin/env bash
# One-time ZK setup: compile circuit, run a DEVELOPMENT trusted setup, export the Solidity verifier.
# Requires: circom (v2.1+) on PATH, and `npm install` already done.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p build

echo "[1/6] compiling circuit"
circom circuits/eligibility.circom --r1cs --wasm --sym -o build -l node_modules

echo "[2/6] circuit info"
npx snarkjs r1cs info build/eligibility.r1cs
# If this reports more than 16384 constraints, raise 14 -> 15 below.

echo "[3/6] powers of tau (dev ceremony, 2^14 constraints)"
npx snarkjs powersoftau new bn128 14 build/pot14_0.ptau -v
npx snarkjs powersoftau contribute build/pot14_0.ptau build/pot14_1.ptau \
  --name="prove-once dev" -e="$(date +%s)-$RANDOM-$RANDOM"
npx snarkjs powersoftau prepare phase2 build/pot14_1.ptau build/pot14_final.ptau -v

echo "[4/6] groth16 setup"
npx snarkjs groth16 setup build/eligibility.r1cs build/pot14_final.ptau build/eligibility_0.zkey
npx snarkjs zkey contribute build/eligibility_0.zkey build/eligibility_final.zkey \
  --name="prove-once dev" -e="$(date +%s)-$RANDOM-$RANDOM"

echo "[5/6] verification key"
npx snarkjs zkey export verificationkey build/eligibility_final.zkey build/verification_key.json

echo "[6/6] Solidity verifier"
npx snarkjs zkey export solidityverifier build/eligibility_final.zkey contracts/Groth16Verifier.sol

echo "Done. Next: npm run compile && npm run demo"
