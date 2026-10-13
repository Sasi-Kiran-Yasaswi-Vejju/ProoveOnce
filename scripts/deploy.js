// Deployment script for ProveOnce Smart Contracts (Phases 1, 3, & 4)
// Run locally:   npx hardhat run scripts/deploy.js
// Run on Sepolia: npx hardhat run scripts/deploy.js --network sepolia
const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

async function main() {
  console.log(`\n========================================`);
  console.log(`Deploying ProveOnce to: ${network.name.toUpperCase()}`);
  console.log(`========================================\n`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer Account: ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account Balance:  ${ethers.formatEther(balance)} ETH\n`);

  // 1. Deploy IssuerRegistry
  console.log("1. Deploying IssuerRegistry...");
  const issuerRegistry = await ethers.deployContract("IssuerRegistry");
  await issuerRegistry.waitForDeployment();
  const issuerRegistryAddr = await issuerRegistry.getAddress();
  console.log(`   -> IssuerRegistry: ${issuerRegistryAddr}`);

  // 2. Deploy CredentialRegistry
  console.log("2. Deploying CredentialRegistry...");
  const credRegistry = await ethers.deployContract("CredentialRegistry", [issuerRegistryAddr]);
  await credRegistry.waitForDeployment();
  const credRegistryAddr = await credRegistry.getAddress();
  console.log(`   -> CredentialRegistry: ${credRegistryAddr}`);

  // 3. Deploy Groth16Verifier
  console.log("3. Deploying Groth16Verifier...");
  const zkVerifier = await ethers.deployContract("Groth16Verifier");
  await zkVerifier.waitForDeployment();
  const zkVerifierAddr = await zkVerifier.getAddress();
  console.log(`   -> Groth16Verifier: ${zkVerifierAddr}`);

  // 4. Deploy EligibilityVerifier (Phase 1)
  console.log("4. Deploying EligibilityVerifier...");
  const eligibility = await ethers.deployContract("EligibilityVerifier", [
    zkVerifierAddr,
    credRegistryAddr,
  ]);
  await eligibility.waitForDeployment();
  const eligibilityAddr = await eligibility.getAddress();
  console.log(`   -> EligibilityVerifier: ${eligibilityAddr}`);

  // 5. Deploy MerkleCredentialRegistry (Phase 4)
  console.log("5. Deploying MerkleCredentialRegistry (Phase 4)...");
  const merkleRegistry = await ethers.deployContract("MerkleCredentialRegistry", [issuerRegistryAddr]);
  await merkleRegistry.waitForDeployment();
  const merkleRegistryAddr = await merkleRegistry.getAddress();
  console.log(`   -> MerkleCredentialRegistry: ${merkleRegistryAddr}`);

  // 6. Deploy EligibilityVerifierV2 (Phase 4 Anonymous)
  console.log("6. Deploying EligibilityVerifierV2 (Anonymous)...");
  const eligibilityV2 = await ethers.deployContract("EligibilityVerifierV2", [
    zkVerifierAddr,
    merkleRegistryAddr,
    issuerRegistryAddr,
  ]);
  await eligibilityV2.waitForDeployment();
  const eligibilityV2Addr = await eligibilityV2.getAddress();
  console.log(`   -> EligibilityVerifierV2: ${eligibilityV2Addr}`);

  // 7. Deploy DKIMRegistry (Phase 3 zk-Email)
  console.log("7. Deploying DKIMRegistry (Phase 3)...");
  const dkimRegistry = await ethers.deployContract("DKIMRegistry");
  await dkimRegistry.waitForDeployment();
  const dkimRegistryAddr = await dkimRegistry.getAddress();
  console.log(`   -> DKIMRegistry: ${dkimRegistryAddr}\n`);

  // Save deployed addresses to JSON file for frontend use
  const addresses = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    contracts: {
      IssuerRegistry: issuerRegistryAddr,
      CredentialRegistry: credRegistryAddr,
      Groth16Verifier: zkVerifierAddr,
      EligibilityVerifier: eligibilityAddr,
      MerkleCredentialRegistry: merkleRegistryAddr,
      EligibilityVerifierV2: eligibilityV2Addr,
      DKIMRegistry: dkimRegistryAddr,
    },
  };

  const outputPath = path.join(__dirname, "..", "deployed-addresses.json");
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  console.log(`✅ All contract addresses saved to: deployed-addresses.json\n`);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exit(1);
});
