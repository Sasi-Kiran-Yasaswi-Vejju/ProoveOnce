import { ethers } from 'ethers';

export const DEFAULT_ADDRESSES = {
  network: 'baseSepolia',
  chainId: 84532,
  contracts: {
    IssuerRegistry: '0x0CDd3a66F254fFdf393cf78C64530e4A8Ff910A4',
    CredentialRegistry: '0xb40322A439c6ec150aFb5E78119201817f22ae5C',
    Groth16Verifier: '0xc688315e3878a1BA762fb42595dB4e1b2CAF179A',
    EligibilityVerifier: '0x72FDEd3004d4Bd3fE6c29d60Eb027D8fe8Ac52fF',
    MerkleCredentialRegistry: '0x5AA618EcDd42Cd9C467A3d5500A3a50757Fdf790',
    EligibilityVerifierV2: '0x0Dc3236a2c8eA93CB07A70d6e4A79f0ec676Ba0B',
  },
};

export const BASE_SEPOLIA = {
  chainId: 84532,
  chainIdHex: '0x14a34',
  name: 'Base Sepolia',
  rpcUrl: 'https://sepolia.base.org',
  explorerUrl: 'https://sepolia.basescan.org',
};

/** Read-only provider that works even when MetaMask is on another network. */
export function readProvider() {
  return new ethers.JsonRpcProvider(BASE_SEPOLIA.rpcUrl, BASE_SEPOLIA.chainId, { staticNetwork: true });
}

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

// EligibilityVerifier keeps `queries` internal, so the question itself is read straight from
// storage. Layout (solc storageLayout): nextQueryId = slot 0, queries mapping = slot 1, and each
// Query struct spans 5 slots:
//   +0 verifier | +1 expectedHolder
//   +2 requiredIssuer(20) fieldA(1) opA(1) thresholdA(8) useSecond(1) fieldB(1)
//   +3 opB(1) thresholdB(8) answered(1) result(1) holder(20) | +4 answeredAt(8)
const QUERIES_SLOT = 1n;

function bytesAt(word, offset, size) {
  const hex = word.slice(2).padStart(64, '0');
  const end = 64 - offset * 2;
  return BigInt('0x' + hex.slice(end - size * 2, end));
}

const toAddress = (n) => ethers.getAddress('0x' + n.toString(16).padStart(40, '0'));

export async function readQuery(provider, verifierAddress, id) {
  const base = BigInt(ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['uint256', 'uint256'], [id, QUERIES_SLOT])));
  const [s0, s1, s2, s3, s4] = await Promise.all(
    [0n, 1n, 2n, 3n, 4n].map((i) => provider.getStorage(verifierAddress, base + i))
  );
  return {
    id: Number(id),
    verifier: toAddress(bytesAt(s0, 0, 20)),
    expectedHolder: toAddress(bytesAt(s1, 0, 20)),
    requiredIssuer: toAddress(bytesAt(s2, 0, 20)),
    fieldA: Number(bytesAt(s2, 20, 1)),
    opA: Number(bytesAt(s2, 21, 1)),
    thresholdA: bytesAt(s2, 22, 8),
    useSecond: bytesAt(s2, 30, 1) === 1n,
    fieldB: Number(bytesAt(s2, 31, 1)),
    opB: Number(bytesAt(s3, 0, 1)),
    thresholdB: bytesAt(s3, 1, 8),
    answered: bytesAt(s3, 9, 1) === 1n,
    result: bytesAt(s3, 10, 1) === 1n,
    holder: toAddress(bytesAt(s3, 11, 20)),
    answeredAt: Number(bytesAt(s4, 0, 8)),
  };
}

/** Ask MetaMask to switch to Base Sepolia, adding the network first if it doesn't know it. */
async function ensureBaseSepolia() {
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BASE_SEPOLIA.chainIdHex }] });
  } catch (err) {
    if (err.code !== 4902) throw err;
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: BASE_SEPOLIA.chainIdHex,
        chainName: BASE_SEPOLIA.name,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: [BASE_SEPOLIA.rpcUrl],
        blockExplorerUrls: [BASE_SEPOLIA.explorerUrl],
      }],
    });
  }
}

export async function requestWalletConnection() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not installed. Please install MetaMask to interact with the TestNet.');
  }

  await window.ethereum.request({ method: 'eth_requestAccounts' });
  await ensureBaseSepolia();

  const provider = new ethers.BrowserProvider(window.ethereum);
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
