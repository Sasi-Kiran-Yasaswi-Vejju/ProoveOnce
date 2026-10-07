# One-time ZK setup for Windows PowerShell:
# Compiles circuit, runs a dev trusted setup ceremony, and exports the Groth16 Solidity verifier.
$ErrorActionPreference = "Stop"

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$projectRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
Set-Location $projectRoot

# Ensure project root and antigravity bin are in PATH for this session
$env:PATH = "$projectRoot;C:\Users\sasik\.gemini\antigravity\bin;C:\Program Files\nodejs;" + $env:PATH

# Resolve circom executable
$circomCmd = "circom"
if (Test-Path "$projectRoot\circom.exe") {
    $circomCmd = "$projectRoot\circom.exe"
} elseif (Get-Command "circom" -ErrorAction SilentlyContinue) {
    $circomCmd = "circom"
} elseif (Test-Path "C:\Users\sasik\.gemini\antigravity\bin\circom.exe") {
    $circomCmd = "C:\Users\sasik\.gemini\antigravity\bin\circom.exe"
} else {
    Write-Host "circom not found on PATH. Downloading circom for Windows..."
    Invoke-WebRequest -Uri "https://github.com/iden3/circom/releases/download/v2.2.3/circom-windows-amd64.exe" -OutFile "$projectRoot\circom.exe"
    $circomCmd = "$projectRoot\circom.exe"
}

if (-not (Test-Path "build")) {
    New-Item -ItemType Directory -Path "build" | Out-Null
}

Write-Host "[1/6] Compiling circuit with $circomCmd..."
& $circomCmd circuits/eligibility.circom --r1cs --wasm --sym -o build -l node_modules

Write-Host "[2/6] Circuit info..."
npx snarkjs r1cs info build/eligibility.r1cs

Write-Host "[3/6] Powers of Tau ceremony (bn128, 2^14 constraints)..."
npx snarkjs powersoftau new bn128 14 build/pot14_0.ptau -v
$entropy = "prove-once-$(Get-Random)-$(Get-Date -UFormat %s)"
npx snarkjs powersoftau contribute build/pot14_0.ptau build/pot14_1.ptau --name="prove-once dev" -e="$entropy"
npx snarkjs powersoftau prepare phase2 build/pot14_1.ptau build/pot14_final.ptau -v

Write-Host "[4/6] Groth16 setup..."
npx snarkjs groth16 setup build/eligibility.r1cs build/pot14_final.ptau build/eligibility_0.zkey
$entropy2 = "prove-once-$(Get-Random)-$(Get-Date -UFormat %s)"
npx snarkjs zkey contribute build/eligibility_0.zkey build/eligibility_final.zkey --name="prove-once dev" -e="$entropy2"

Write-Host "[5/6] Verification key export..."
npx snarkjs zkey export verificationkey build/eligibility_final.zkey build/verification_key.json

Write-Host "[6/6] Generating Solidity verifier contract..."
npx snarkjs zkey export solidityverifier build/eligibility_final.zkey contracts/Groth16Verifier.sol

Write-Host "Done! You can now run: npx hardhat compile; npx hardhat run scripts/demo.js"
