import { ethers } from 'ethers';

export const DEFAULT_ADDRESSES = {
  network: 'sepolia',
  chainId: 11155111,
  contracts: {
    IssuerRegistry: '0xd97415bD40345183472c2E9B83A90AcB359091A8',
    CredentialRegistry: '0xb2bC6d34eC4B5F8747E943745c29b07866ACF13a',
    Groth16Verifier: '0x0CDd3a66F254fFdf393cf78C64530e4A8Ff910A4',
    EligibilityVerifier: '0xb40322A439c6ec150aFb5E78119201817f22ae5C',
    MerkleCredentialRegistry: '0xc688315e3878a1BA762fb42595dB4e1b2CAF179A',
    EligibilityVerifierV2: '0x72FDEd3004d4Bd3fE6c29d60Eb027D8fe8Ac52fF',
    DKIMRegistry: '0x5AA618EcDd42Cd9C467A3d5500A3a50757Fdf790',
  },
};

export const ISSUER_REGISTRY_ABI = [
  'function addIssuer(address issuer, string calldata name, uint256 ax, uint256 ay) external',
  'function removeIssuer(address issuer) external',
  'function issuers(address) external view returns (string memory name, uint256 ax, uint256 ay, bool active)',
  'function owner() external view returns (address)',
  'event IssuerAdded(address indexed issuer, string name, uint256 ax, uint256 ay)',
  'event IssuerRemoved(address indexed issuer)',
];

export const CREDENTIAL_REGISTRY_ABI = [
  'function register(uint256 commitment, uint64 expiry) external',
  'function revoke(uint256 commitment) external',
  'function check(uint256 commitment, uint256 ax, uint256 ay) external view returns (bool ok, address issuer)',
  'function credentials(uint256) external view returns (address issuer, uint64 expiry, bool revoked, bool exists)',
  'event CredentialRegistered(uint256 indexed commitment, address indexed issuer, uint64 expiry)',
  'event CredentialRevoked(uint256 indexed commitment, address indexed issuer)',
];

export const ELIGIBILITY_VERIFIER_ABI = [
  'function nextQueryId() external view returns (uint256)',
  'function getQuery(uint256 id) external view returns (address verifier, bool answered, bool result, address holder)',
  'function createQuery((address expectedHolder, address requiredIssuer, uint8 fieldA, uint8 opA, uint64 thresholdA, bool useSecond, uint8 fieldB, uint8 opB, uint64 thresholdB) q) external returns (uint256 id)',
  'function answerQuery(uint256 id, (uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[13] input) proof) external',
  'function getResult(uint256 id) external view returns (bool answered, bool result)',
  'event QueryCreated(uint256 indexed queryId, address indexed verifier)',
  'event QueryAnswered(uint256 indexed queryId, address indexed holder, bool result)',
];

export async function requestWalletConnection() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not installed. Please install MetaMask to interact with the TestNet.');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();
  const balanceRaw = await provider.getBalance(address);
  const balance = ethers.formatEther(balanceRaw);

  const chainIdNum = Number(network.chainId);
  let networkName = `Chain ID ${chainIdNum}`;
  let explorerUrl = 'https://sepolia.etherscan.io';

  if (chainIdNum === 84532) {
    networkName = 'Base Sepolia';
    explorerUrl = 'https://sepolia.basescan.org';
  } else if (chainIdNum === 11155111) {
    networkName = 'Ethereum Sepolia';
    explorerUrl = 'https://sepolia.etherscan.io';
  } else if (chainIdNum === 31337) {
    networkName = 'Hardhat Localhost';
  }

  return {
    provider,
    signer,
    address,
    chainId: chainIdNum,
    networkName,
    explorerUrl,
    balance: parseFloat(balance).toFixed(4),
  };
}
