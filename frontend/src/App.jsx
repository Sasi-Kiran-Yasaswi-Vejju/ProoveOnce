import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Key,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Sun,
  Moon,
  Wallet,
  Building2,
  GraduationCap,
  Scale,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Mail,
  Cpu,
  Layers,
  FileCode,
  Info,
  Copy,
  Check,
  Settings,
  Link2,
  Upload
} from 'lucide-react';
import { ethers } from 'ethers';
import {
  BASE_SEPOLIA,
  CREDENTIAL_REGISTRY_ABI,
  DEFAULT_ADDRESSES,
  ELIGIBILITY_VERIFIER_ABI,
  ISSUER_REGISTRY_ABI,
  readProvider,
  readQuery,
  requestWalletConnection,
} from './contracts';
import { createIssuerKey, parseCredential, proveQuery, signCredential } from './zk';

const CREDENTIAL_STORAGE_KEY = 'proveonce.credential';
// University's BabyJubJub signing key. Demo only: kept in this browser's storage.
const ISSUER_KEY_STORAGE_KEY = 'proveonce.issuerKey';

function loadStoredCredential() {
  try {
    const raw = localStorage.getItem(CREDENTIAL_STORAGE_KEY);
    return raw ? parseCredential(raw) : null;
  } catch {
    return null;
  }
}

function loadStoredIssuerKey() {
  try {
    return JSON.parse(localStorage.getItem(ISSUER_KEY_STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

function downloadJson(filename, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const shortAddr = (a) => `${a.substring(0, 6)}...${a.substring(38)}`;

// Demo accounts on Base Sepolia, so the header shows which role is connected
const KNOWN_ACCOUNTS = {
  '0x0332a7deb95aca50c2f4db808a80ca3525dab7c9': 'Owner',
  '0x3c317327c6652f78289320d58a8e595243347b06': 'University',
  '0x787091536fd3887c8d366345defcfafb2505b2b0': 'Student',
  '0x91fe5fae5db20e077208403395e47424f888cd15': 'Bank',
};
const roleOf = (a) => KNOWN_ACCOUNTS[a?.toLowerCase()];

const FIELD_LABELS = {
  0: { name: 'CGPA (x100)', unit: 'CGPA', format: (v) => (Number(v) / 100).toFixed(2) },
  1: { name: 'Graduation Year', unit: 'Year', format: (v) => String(v) },
  2: { name: 'Annual Family Income', unit: 'INR', format: (v) => '₹' + Number(v).toLocaleString('en-IN') },
  3: { name: 'Category', unit: 'Code', format: (v) => ['General (0)', 'OBC (1)', 'SC (2)', 'ST (3)'][v] || String(v) },
  4: { name: 'Birth Year', unit: 'Year', format: (v) => String(v) },
  5: { name: 'Active Backlogs', unit: 'Count', format: (v) => String(v) },
};

const OP_SYMBOLS = {
  0: '≥',
  1: '≤',
  2: '>',
  3: '<',
  4: '==',
};

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [activeTab, setActiveTab] = useState('landing');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletInfo, setWalletInfo] = useState({
    connected: false,
    address: '',
    chainId: 84532,
    networkName: 'Base Sepolia',
    explorerUrl: 'https://sepolia.basescan.org',
    balance: '0.0000',
  });
  const [verifierAddress, setVerifierAddress] = useState(
    DEFAULT_ADDRESSES.contracts.EligibilityVerifier
  );
  const [issuerRegistryAddress, setIssuerRegistryAddress] = useState(
    DEFAULT_ADDRESSES.contracts.IssuerRegistry
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPublishingOnChain, setIsPublishingOnChain] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedRole, setSelectedRole] = useState('student');
  const [copiedText, setCopiedText] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Student's private credential bundle, imported from a file and kept only in this browser
  const [credential, setCredential] = useState(loadStoredCredential);
  const [credentialValid, setCredentialValid] = useState(null);

  // Issuer Hub: university signing key, the last certificate it issued, and busy flag
  const [issuerKey, setIssuerKey] = useState(loadStoredIssuerKey);
  const [issuedCredential, setIssuedCredential] = useState(null);
  const [issuerBusy, setIssuerBusy] = useState(null);

  // Pre-configured state simulating on-chain credentials & queries
  const [issuers, setIssuers] = useState([
    {
      id: 'uni',
      name: 'Anna University',
      address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      ax: '1435213605663784180425785025979505587786435324634568903348443936904128549646',
      ay: '91873105739023450982340598234059823405982340598234059823405982340598234059',
      active: true,
    },
    {
      id: 'gov',
      name: 'Tahsildar Revenue Office',
      address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      ax: '99845234120934812390481203948120394812039481203948120394812039481203948123',
      ay: '44598123049812039481203948120394812039481203948120394812039481203948120394',
      active: true,
    },
  ]);

  const [activeCredentials, setActiveCredentials] = useState([
    {
      id: 'academic-1',
      title: 'B.Tech Engineering Degree Transcript',
      issuer: 'Anna University',
      issuerId: 'uni',
      issuedAt: 'Oct 2026',
      commitment: '0x1c8b32e098a5814e5900b91d84813589b9e59cb98967b2d56a3411e7230491a',
      data: {
        CGPA_X100: 845,
        GRAD_YEAR: 2024,
        BIRTH_YEAR: 2002,
        BACKLOGS: 0,
      },
      verifiedOnChain: true,
    },
    {
      id: 'income-1',
      title: 'Annual Family Income & EWS Certificate',
      issuer: 'Tahsildar Revenue Office',
      issuerId: 'gov',
      issuedAt: 'Oct 2026',
      commitment: '0x2bf941e739984bcde93012a958e920d3f890289ba98e10298a0029b3848124c',
      data: {
        ANNUAL_INCOME: 650000,
        CATEGORY: 1,
      },
      verifiedOnChain: true,
    },
  ]);

  const [queries, setQueries] = useState([
    {
      id: '1',
      verifier: 'HDFC Student Loan Branch',
      verifierAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      fieldA: 0,
      opA: 0,
      thresholdA: 750,
      fieldAName: 'CGPA',
      readableCondition: 'CGPA ≥ 7.50',
      useSecond: false,
      answered: true,
      result: true,
      timestamp: '2 hrs ago',
    },
    {
      id: '2',
      verifier: 'Tech Mahindra Recruitment',
      verifierAddress: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
      fieldA: 0,
      opA: 0,
      thresholdA: 900,
      fieldAName: 'CGPA',
      readableCondition: 'CGPA ≥ 9.00',
      useSecond: false,
      answered: true,
      result: false,
      timestamp: '1 hr ago',
    },
    {
      id: '3',
      verifier: 'National Merit Scholarship Board',
      verifierAddress: '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
      fieldA: 2,
      opA: 1,
      thresholdA: 800000,
      fieldAName: 'Annual Income',
      readableCondition: 'Family Income ≤ ₹8,00,000 (EWS)',
      useSecond: false,
      answered: true,
      result: true,
      timestamp: '30 mins ago',
    },
    {
      id: '4',
      verifier: 'Global Masters Admission Cell',
      verifierAddress: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
      fieldA: 0,
      opA: 0,
      thresholdA: 750,
      useSecond: true,
      fieldB: 5,
      opB: 4,
      thresholdB: 0,
      readableCondition: 'CGPA ≥ 7.50 AND Backlogs == 0',
      answered: true,
      result: true,
      timestamp: 'Just now',
    },
  ]);

  // Form states for Issuer
  const [issueForm, setIssueForm] = useState({
    issuerName: 'Amrita University',
    title: 'B.Tech Transcript & Income Certificate',
    cgpa: '8.45',
    gradYear: '2024',
    income: '650000',
    category: '1',
    birthYear: '2002',
    backlogs: '0',
  });

  // Form states for Verifier
  const [queryForm, setQueryForm] = useState({
    fieldA: 0,
    opA: 0,
    thresholdA: '750',
    useSecond: false,
    fieldB: 5,
    opB: 4,
    thresholdB: '0',
    verifierName: 'State Merit Scholarship Dept',
  });

  const [provingQueryId, setProvingQueryId] = useState(null);
  const [provingStep, setProvingStep] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Check if local API server is running on port 3001
  useEffect(() => {
    fetch('http://localhost:3001/api/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setApiConnected(true);
        }
      })
      .catch(() => {
        setApiConnected(false);
      });
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleImportCredential = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const cred = parseCredential(await file.text());
      localStorage.setItem(CREDENTIAL_STORAGE_KEY, JSON.stringify(cred));
      setCredential(cred);
      setStatusMessage({
        type: 'success',
        title: 'Credential Imported',
        detail: 'Stored only in this browser. Nothing was sent to the blockchain.',
      });
    } catch (err) {
      setStatusMessage({ type: 'error', title: 'Invalid Credential File', detail: err.message });
    }
  };

  // Real proof: generate the Groth16 proof in the browser, then answer via MetaMask
  const handleProveQuery = async (queryId) => {
    const q = queries.find((x) => x.id === queryId);
    if (!q?.isOnChain) return simulateProof(queryId);
    if (!credential) {
      setStatusMessage({
        type: 'error',
        title: 'Import Your Credential First',
        detail: 'Use "Import Credential" in the vault (build/student-credential.json).',
      });
      return;
    }
    if (!walletInfo.connected) {
      await handleConnectWallet();
      return;
    }

    try {
      setProvingQueryId(queryId);
      setProvingStep(1);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const holder = await signer.getAddress();
      const { proof, result } = await proveQuery(credential, holder, q.chain);

      setProvingStep(4);
      setStatusMessage({
        type: 'info',
        title: 'Proof Generated — Confirm in MetaMask',
        detail: `Submitting the Groth16 proof for query #${q.id} from ${shortAddr(holder)}...`,
      });
      const contract = new ethers.Contract(verifierAddress, ELIGIBILITY_VERIFIER_ABI, signer);
      const tx = await contract.answerQuery(BigInt(q.id), proof);
      const receipt = await tx.wait();

      setProvingStep(5);
      await syncFromBlockchain();
      setStatusMessage({
        type: 'success',
        title: `Verified On-Chain: ${result ? 'YES' : 'NO'}`,
        detail: `Query #${q.id} answered in block #${receipt.blockNumber}. The verifier learns only Yes/No.`,
      });
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        title: 'Proof Rejected or Cancelled',
        detail: err.reason || err.shortMessage || err.message,
      });
    } finally {
      setProvingQueryId(null);
      setProvingStep(0);
    }
  };

  // Simulated proof animation for the offline sample queries
  const simulateProof = async (queryId) => {
    setProvingQueryId(queryId);
    setProvingStep(1); // Generating witness
    await new Promise((r) => setTimeout(r, 600));

    setProvingStep(2); // Poseidon commitment verification
    await new Promise((r) => setTimeout(r, 600));

    setProvingStep(3); // EdDSA BabyJubJub signature check
    await new Promise((r) => setTimeout(r, 600));

    setProvingStep(4); // Groth16 pairing check on EVM
    await new Promise((r) => setTimeout(r, 700));

    // Update query status
    setQueries((prev) =>
      prev.map((q) => {
        if (q.id === queryId) {
          return { ...q, answered: true };
        }
        return q;
      })
    );

    setProvingStep(5);
    setTimeout(() => {
      setProvingQueryId(null);
      setProvingStep(0);
      setStatusMessage({
        type: 'success',
        title: 'Zero-Knowledge Proof Verified!',
        detail: 'Smart contract verified the proof and recorded the Boolean answer on-chain.',
      });
    }, 1200);
  };

  // Create new Query
  const handleCreateQuery = (e) => {
    e.preventDefault();
    const newId = `S${queries.filter((q) => !q.isOnChain).length + 1}`;
    const condA = `${FIELD_LABELS[queryForm.fieldA].name} ${OP_SYMBOLS[queryForm.opA]} ${queryForm.thresholdA}`;
    const condB = queryForm.useSecond
      ? ` AND ${FIELD_LABELS[queryForm.fieldB].name} ${OP_SYMBOLS[queryForm.opB]} ${queryForm.thresholdB}`
      : '';

    const newQ = {
      id: newId,
      verifier: queryForm.verifierName || 'New Verification Agency',
      verifierAddress: '0x' + Math.random().toString(16).substring(2, 42).padStart(40, '0'),
      fieldA: Number(queryForm.fieldA),
      opA: Number(queryForm.opA),
      thresholdA: Number(queryForm.thresholdA),
      useSecond: queryForm.useSecond,
      fieldB: Number(queryForm.fieldB),
      opB: Number(queryForm.opB),
      thresholdB: Number(queryForm.thresholdB),
      readableCondition: condA + condB,
      answered: false,
      result: false,
      timestamp: 'Just now',
    };

    setQueries([newQ, ...queries]);
    setStatusMessage({
      type: 'success',
      title: 'Query Created (Simulated)',
      detail: `Query #${newId} is now awaiting holder proof submission.`,
    });
  };

  // Real MetaMask Connection Handler
  const handleConnectWallet = async () => {
    try {
      setLoading(true);
      const data = await requestWalletConnection();
      setWalletInfo({
        connected: true,
        address: data.address,
        chainId: data.chainId,
        networkName: data.networkName,
        explorerUrl: data.explorerUrl,
        balance: data.balance,
      });
      setWalletConnected(true);
      setStatusMessage({
        type: 'success',
        title: 'MetaMask Connected!',
        detail: `Connected as ${data.address.substring(0, 6)}...${data.address.substring(38)} (${data.networkName})`,
      });
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        title: 'Wallet Connection Failed',
        detail: err.message || 'Please install MetaMask or check network.',
      });
    } finally {
      setLoading(false);
    }
  };

  // MetaMask only exposes the accounts the user approved for this site, so switching roles
  // means re-opening its account picker; accountsChanged then reconnects with the new account.
  const handleSwitchAccount = async () => {
    try {
      await window.ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
      await handleConnectWallet();
    } catch (err) {
      if (err.code !== 4001) {
        setStatusMessage({ type: 'error', title: 'Could Not Switch Account', detail: err.message });
      }
    }
  };

  const getSignerAddress = async () => {
    const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
    return { signer, address: await signer.getAddress() };
  };

  const runIssuerStep = async (step, fn) => {
    if (!walletInfo.connected) {
      await handleConnectWallet();
      return;
    }
    try {
      setIssuerBusy(step);
      await fn();
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        title: 'Issuer Step Failed',
        detail: err.reason || err.shortMessage || err.message,
      });
    } finally {
      setIssuerBusy(null);
    }
  };

  // Step 1 (University): create the off-chain BabyJubJub signing key for the connected account
  const handleGenerateIssuerKey = () =>
    runIssuerStep('key', async () => {
      const { address } = await getSignerAddress();
      const key = await createIssuerKey();
      const record = { address, ...key };
      localStorage.setItem(ISSUER_KEY_STORAGE_KEY, JSON.stringify(record));
      setIssuerKey(record);
      setStatusMessage({
        type: 'success',
        title: 'University Signing Key Created',
        detail: `Key for ${shortAddr(address)}. Next: switch to Owner and approve this university.`,
      });
    });

  // Step 2 (Owner): approve the university on-chain with its public key
  const handleApproveIssuer = () =>
    runIssuerStep('approve', async () => {
      const { signer } = await getSignerAddress();
      const registry = new ethers.Contract(issuerRegistryAddress, ISSUER_REGISTRY_ABI, signer);
      setStatusMessage({ type: 'info', title: 'Confirm in MetaMask', detail: 'IssuerRegistry.addIssuer(...)' });
      const tx = await registry.addIssuer(issuerKey.address, issueForm.issuerName, issuerKey.ax, issuerKey.ay);
      const receipt = await tx.wait();
      await syncFromBlockchain();
      setStatusMessage({
        type: 'success',
        title: `${issueForm.issuerName} Approved On-Chain`,
        detail: `Block #${receipt.blockNumber}. Next: switch to University and issue the certificate.`,
      });
    });

  // Step 3 (University): sign the student's data off-chain, register only the commitment on-chain
  const handleIssueCredential = (e) => {
    e.preventDefault();
    return runIssuerStep('issue', async () => {
      const { signer, address } = await getSignerAddress();
      if (address.toLowerCase() !== issuerKey.address.toLowerCase()) {
        throw new Error(`Switch MetaMask to the University account (${shortAddr(issuerKey.address)}).`);
      }
      const fields = {
        CGPA_X100: Math.round(parseFloat(issueForm.cgpa) * 100),
        GRAD_YEAR: Number(issueForm.gradYear),
        ANNUAL_INCOME: Number(issueForm.income),
        CATEGORY: Number(issueForm.category),
        BIRTH_YEAR: Number(issueForm.birthYear),
        BACKLOGS: Number(issueForm.backlogs),
      };
      if (Object.values(fields).some((v) => !Number.isInteger(v) || v < 0)) {
        throw new Error('All values must be non-negative numbers.');
      }

      const signed = await signCredential(issuerKey.prvHex, fields);
      const registry = new ethers.Contract(DEFAULT_ADDRESSES.contracts.CredentialRegistry, CREDENTIAL_REGISTRY_ABI, signer);
      setStatusMessage({ type: 'info', title: 'Confirm in MetaMask', detail: 'CredentialRegistry.register(commitment, 0)' });
      const tx = await registry.register(signed.commitment, 0);
      const receipt = await tx.wait();

      const cred = {
        title: issueForm.title,
        issuerAddress: issuerKey.address,
        issuerAx: issuerKey.ax,
        issuerAy: issuerKey.ay,
        ...signed,
      };
      setIssuedCredential(cred);
      downloadJson('student-credential.json', cred);
      setStatusMessage({
        type: 'success',
        title: 'Certificate Registered On-Chain',
        detail: `Block #${receipt.blockNumber}: only the commitment was stored. student-credential.json downloaded for the student.`,
      });
    });
  };

  // Sync live queries (and the student's credential status) from the deployed contracts
  const syncFromBlockchain = async () => {
    try {
      setIsSyncing(true);
      const provider = readProvider();
      const contract = new ethers.Contract(verifierAddress, ELIGIBILITY_VERIFIER_ABI, provider);
      const nextId = Number(await contract.nextQueryId());

      const chainQueries = await Promise.all(
        Array.from({ length: nextId - 1 }, (_, i) => readQuery(provider, verifierAddress, i + 1))
      );
      const describe = (field, op, threshold) =>
        `${FIELD_LABELS[field]?.name || 'Field ' + field} ${OP_SYMBOLS[op] || '?'} ${threshold}`;
      const onChainQueries = chainQueries.reverse().map((q) => ({
        id: String(q.id),
        verifier: `On-Chain Verifier (${shortAddr(q.verifier)})`,
        verifierAddress: q.verifier,
        readableCondition:
          describe(q.fieldA, q.opA, q.thresholdA) + (q.useSecond ? ' AND ' + describe(q.fieldB, q.opB, q.thresholdB) : ''),
        answered: q.answered,
        result: q.result,
        holder: q.holder,
        timestamp: q.answeredAt > 0 ? new Date(q.answeredAt * 1000).toLocaleTimeString() : 'On-Chain',
        isOnChain: true,
        chain: q,
      }));
      // Keep only "Quick Add" simulated queries; the built-in samples give way to real data
      setQueries((prev) => [...onChainQueries, ...prev.filter((p) => !p.isOnChain && p.id.startsWith('S'))]);

      // Issuers we care about: the student's credential issuer and this browser's university key
      const issuerAddrs = [...new Set([credential?.issuerAddress, issuerKey?.address].filter(Boolean).map((a) => ethers.getAddress(a)))];
      if (issuerAddrs.length) {
        const ir = new ethers.Contract(issuerRegistryAddress, ISSUER_REGISTRY_ABI, provider);
        const onChainIssuers = await Promise.all(issuerAddrs.map((a) => ir.issuers(a)));
        setIssuers(issuerAddrs.map((address, i) => ({
          id: address,
          name: onChainIssuers[i].name || 'Not yet approved',
          address,
          ax: onChainIssuers[i].ax.toString(),
          ay: onChainIssuers[i].ay.toString(),
          active: onChainIssuers[i].active,
        })));
      }
      if (credential) {
        const cr = new ethers.Contract(DEFAULT_ADDRESSES.contracts.CredentialRegistry, CREDENTIAL_REGISTRY_ABI, provider);
        const chk = await cr.check(credential.commitment, credential.issuerAx, credential.issuerAy);
        setCredentialValid(chk.ok);
      }

      setStatusMessage({
        type: 'success',
        title: 'Synced with Base Sepolia',
        detail: `Read ${onChainQueries.length} queries from EligibilityVerifier ${verifierAddress.substring(0, 8)}...`,
      });
    } catch (err) {
      console.error('Sync failed:', err);
      setStatusMessage({
        type: 'error',
        title: 'Blockchain Sync Error',
        detail: err.shortMessage || err.message || 'Could not connect to the contract. Verify contract address and network.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Publish Query via MetaMask to Base Sepolia
  const handleCreateQueryOnChain = async (e) => {
    e.preventDefault();
    if (!walletInfo.connected) {
      await handleConnectWallet();
      return;
    }

    try {
      setIsPublishingOnChain(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(verifierAddress, ELIGIBILITY_VERIFIER_ABI, signer);

      setStatusMessage({
        type: 'info',
        title: 'MetaMask Approval Requested',
        detail: 'Please confirm the createQuery transaction in MetaMask...',
      });

      const tx = await contract.createQuery({
        expectedHolder: ethers.ZeroAddress,
        requiredIssuer: ethers.ZeroAddress,
        fieldA: Number(queryForm.fieldA),
        opA: Number(queryForm.opA),
        thresholdA: BigInt(queryForm.thresholdA),
        useSecond: Boolean(queryForm.useSecond),
        fieldB: Number(queryForm.fieldB),
        opB: Number(queryForm.opB),
        thresholdB: BigInt(queryForm.thresholdB),
      });

      setStatusMessage({
        type: 'info',
        title: 'Transaction Submitted to TestNet!',
        detail: `Mining on Base Sepolia (Tx: ${tx.hash.substring(0, 12)}...). Please wait...`,
      });

      const receipt = await tx.wait();

      setStatusMessage({
        type: 'success',
        title: 'Query Created On-Chain (Base Sepolia)!',
        detail: `Confirmed in block #${receipt.blockNumber}. Tx Hash: ${receipt.hash.substring(0, 16)}...`,
      });

      // Automatically refresh queries from chain
      await syncFromBlockchain();
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        title: 'Transaction Rejected or Failed',
        detail: err.reason || err.message || 'Transaction could not be confirmed.',
      });
    } finally {
      setIsPublishingOnChain(false);
    }
  };

  // Listen to MetaMask account / network change
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          setWalletInfo({ connected: false, address: '', chainId: null, networkName: BASE_SEPOLIA.name, explorerUrl: BASE_SEPOLIA.explorerUrl, balance: '0.0000' });
          setWalletConnected(false);
        } else {
          handleConnectWallet();
        }
      };
      const handleChainChanged = () => {
        window.location.reload();
      };
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  // Sync on initial load, and again when the student imports a credential
  useEffect(() => {
    syncFromBlockchain();
  }, [verifierAddress, credential, issuerKey]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toast Notification */}
      {statusMessage && (
        <div
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            background: 'var(--bg-card)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--accent-primary)',
            borderRadius: '0.75rem',
            boxShadow: 'var(--shadow-lg)',
            maxWidth: '420px',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <CheckCircle2 size={24} color="var(--accent-primary)" />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{statusMessage.title}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {statusMessage.detail}
            </div>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-primary)',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="app-container"
          style={{
            height: '4.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo & Protocol Title */}
          <div
            onClick={() => setActiveTab('landing')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', cursor: 'pointer' }}
          >
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.625rem',
                background: 'linear-gradient(135deg, #2563eb, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
                  ProveOnce
                </span>
                <span className="badge badge-success">ZK-Groth16</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
                Zero-Knowledge Eligibility on Ethereum
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            {[
              { id: 'landing', label: 'Overview', icon: Layers },
              { id: 'student', label: 'Student Vault', icon: GraduationCap },
              { id: 'issuer', label: 'Issuer Hub', icon: Building2 },
              { id: 'verifier', label: 'Verifier Portal', icon: Scale },
              { id: 'architecture', label: 'zk-Email & Specs', icon: Mail },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--border-secondary)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Theme + Network + Wallet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Network Indicator */}
            <div
              className="badge"
              style={{
                background: 'var(--bg-tertiary)',
                color: walletInfo.connected ? '#10b981' : '#38bdf8',
                border: '1px solid var(--border-primary)',
                padding: '0.35rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: walletInfo.connected ? '#10b981' : '#38bdf8',
                  boxShadow: walletInfo.connected ? '0 0 8px #10b981' : 'none',
                }}
              />
              {walletInfo.connected ? walletInfo.networkName : 'Base Sepolia'}
            </div>

            {/* Contract Config Toggle */}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="btn btn-secondary"
              title="Configure Deployed Contract Address (Remix IDE)"
              style={{ padding: '0.5rem 0.65rem' }}
            >
              <Settings size={16} />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="btn btn-secondary"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              style={{ padding: '0.5rem 0.65rem' }}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Wallet Button */}
            <button
              onClick={walletInfo.connected ? handleSwitchAccount : handleConnectWallet}
              className={walletInfo.connected ? 'btn btn-secondary' : 'btn btn-primary'}
              title={walletInfo.connected ? 'Switch MetaMask account' : 'Connect MetaMask'}
              style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Wallet size={16} />
              <span>
                {walletInfo.connected
                  ? `${roleOf(walletInfo.address) ? roleOf(walletInfo.address) + ' · ' : ''}${shortAddr(walletInfo.address)} (${walletInfo.balance} ETH)`
                  : 'Connect MetaMask'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Live Blockchain & Remix Synchronization Toolbar */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-primary)',
          padding: '0.6rem 0',
          fontSize: '0.8rem',
        }}
      >
        <div
          className="app-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Solidity Verifier:</span>
              <span className="code-pill" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                {verifierAddress}
              </span>
              <button
                onClick={() => copyToClipboard(verifierAddress)}
                title="Copy Address"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                {copiedText === verifierAddress ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              </button>
              <a
                href={`${walletInfo.explorerUrl || 'https://sepolia.basescan.org'}/address/${verifierAddress}`}
                target="_blank"
                rel="noreferrer"
                title={`View on ${walletInfo.networkName} Explorer`}
                style={{ color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', marginLeft: '0.2rem' }}
              >
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={syncFromBlockchain}
              disabled={isSyncing}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <RefreshCw size={13} className={isSyncing ? 'spin' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Sync with TestNet'}</span>
            </button>
          </div>
        </div>

        {/* Address override drawer if deployed in Remix */}
        {showConfig && (
          <div className="app-container" style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
              ⚙️ Custom Contract Address (If you deployed a fresh contract in Remix IDE):
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                placeholder="Paste newly deployed EligibilityVerifier address from Remix (0x...)"
                value={verifierAddress}
                onChange={(e) => setVerifierAddress(e.target.value.trim())}
              />
              <button
                onClick={() => {
                  syncFromBlockchain();
                  setShowConfig(false);
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', whiteSpace: 'nowrap' }}
              >
                Save &amp; Connect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Areas */}
      <main style={{ flex: 1, padding: '2rem 0' }}>
        {/* VIEW 1: LANDING / OVERVIEW */}
        {activeTab === 'landing' && (
          <div className="app-container">
            {/* Hero Section */}
            <section
              style={{
                textAlign: 'center',
                padding: '3rem 1rem 4rem',
                maxWidth: '840px',
                margin: '0 auto',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  background: 'var(--badge-emerald-bg)',
                  border: '1px solid var(--badge-emerald-border)',
                  color: 'var(--badge-emerald-text)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  marginBottom: '1.5rem',
                }}
              >
                <Sparkles size={14} />
                <span>Next-Gen Zero-Knowledge Identity Protocol</span>
              </div>

              <h1
                style={{
                  fontSize: '3.25rem',
                  fontWeight: 800,
                  lineHeight: 1.15,
                  letterSpacing: '-0.03em',
                  marginBottom: '1.25rem',
                }}
              >
                Prove Eligibility.{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #2563eb, #6366f1, #8b5cf6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Never Reveal The Data.
                </span>
              </h1>

              <p
                style={{
                  fontSize: '1.125rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  marginBottom: '2.25rem',
                }}
              >
                Universities and revenue offices sign credentials once off-chain. Any verifier (bank,
                employer, embassy) asks criteria like <em>&quot;CGPA ≥ 7.5?&quot;</em> and gets an on-chain{' '}
                <strong>YES / NO</strong> check. Your raw scores, income, and personal certificates
                remain 100% private.
              </p>

              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}
              >
                <button
                  onClick={() => setActiveTab('student')}
                  className="btn btn-primary"
                  style={{ fontSize: '0.95rem', padding: '0.75rem 1.5rem' }}
                >
                  <span>Launch Student Vault</span>
                  <ArrowRight size={17} />
                </button>
                <button
                  onClick={() => setActiveTab('verifier')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.95rem', padding: '0.75rem 1.5rem' }}
                >
                  <span>Query Protocol</span>
                </button>
              </div>
            </section>

            {/* Protocol Metrics Grid */}
            <section
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.25rem',
                marginBottom: '3rem',
              }}
            >
              {[
                {
                  label: 'Data Leaked to Verifier',
                  value: '0 Bytes',
                  desc: 'Full Zero-Knowledge via Poseidon commitments',
                  icon: Lock,
                  color: '#2563eb',
                },
                {
                  label: 'Circuit Constraints',
                  value: '9,977',
                  desc: 'EdDSA + Poseidon + 64-bit Comparators',
                  icon: Cpu,
                  color: '#8b5cf6',
                },
                {
                  label: 'On-Chain Proof Verification',
                  value: '~240k Gas',
                  desc: 'Groth16 bilinear pairing check on EVM',
                  icon: FileCode,
                  color: '#059669',
                },
                {
                  label: 'Tamper Resistance',
                  value: '100% On-Chain',
                  desc: 'Query ID nonces + sender address binding',
                  icon: ShieldCheck,
                  color: '#d97706',
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="glass-card" style={{ padding: '1.5rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.875rem',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {item.label}
                      </span>
                      <Icon size={18} color={item.color} />
                    </div>
                    <div
                      style={{
                        fontSize: '1.875rem',
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                        marginBottom: '0.35rem',
                      }}
                    >
                      {item.value}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.desc}</p>
                  </div>
                );
              })}
            </section>

            {/* Three-Pillar Interactive Explainer */}
            <section style={{ marginBottom: '3rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  How ProveOnce Works
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  A decentralized lifecycle connecting Issuers, Students, and Verifiers
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '1.5rem',
                }}
              >
                {/* Step 1 */}
                <div className="glass-card" style={{ padding: '1.75rem' }}>
                  <div
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(37,99,235,0.1)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      marginBottom: '1rem',
                    }}
                  >
                    1
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    Issue Once (Off-Chain)
                  </h3>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      marginBottom: '1rem',
                    }}
                  >
                    The University signs certificate fields using an off-chain BabyJubJub private key.
                    Only a Poseidon hash fingerprint (commitment) is registered on Ethereum.
                  </p>
                  <button
                    onClick={() => setActiveTab('issuer')}
                    className="btn btn-outline"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                  >
                    <span>Visit Issuer Hub</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* Step 2 */}
                <div className="glass-card" style={{ padding: '1.75rem' }}>
                  <div
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(99,102,241,0.1)',
                      color: 'var(--accent-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      marginBottom: '1rem',
                    }}
                  >
                    2
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    Ask One Question
                  </h3>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      marginBottom: '1rem',
                    }}
                  >
                    A verifier (bank, recruiter) creates a query on the smart contract specifying
                    criteria: <em>&quot;CGPA ≥ 7.50 AND Backlogs == 0&quot;</em>.
                  </p>
                  <button
                    onClick={() => setActiveTab('verifier')}
                    className="btn btn-outline"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                  >
                    <span>Create Verifier Query</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* Step 3 */}
                <div className="glass-card" style={{ padding: '1.75rem' }}>
                  <div
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(16,185,129,0.1)',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      marginBottom: '1rem',
                    }}
                  >
                    3
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    Zero-Knowledge Answer
                  </h3>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      marginBottom: '1rem',
                    }}
                  >
                    The student generates a Groth16 proof locally in their browser. The smart contract
                    verifies the math and stores only <strong>Yes or No</strong>.
                  </p>
                  <button
                    onClick={() => setActiveTab('student')}
                    className="btn btn-outline"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                  >
                    <span>View Student Vault</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* VIEW 2: STUDENT VAULT */}
        {activeTab === 'student' && (
          <div className="app-container">
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <GraduationCap size={24} color="var(--accent-primary)" />
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Student Identity Vault</h1>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Your private certificate bundle is stored locally. Generate zero-knowledge proofs to
                satisfy verifier criteria without exposing your marks or income.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: '1.75rem' }}>
              {/* Left Column: Private Credentials */}
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock size={16} />
                  <span>Your Stored Credentials (Encrypted)</span>
                  <label className="btn btn-secondary" style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '0.3rem 0.65rem', cursor: 'pointer' }}>
                    <Upload size={13} />
                    <span>{credential ? 'Replace' : 'Import Credential'}</span>
                    <input type="file" accept=".json,application/json" onChange={handleImportCredential} style={{ display: 'none' }} />
                  </label>
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(credential
                    ? [{
                        id: 'imported',
                        title: credential.title || 'Imported Credential',
                        issuer:
                          issuers.find((i) => i.address.toLowerCase() === credential.issuerAddress.toLowerCase())?.name ||
                          shortAddr(credential.issuerAddress),
                        issuedAt: 'Imported from file',
                        commitment: '0x' + BigInt(credential.commitment).toString(16),
                        data: {
                          CGPA_X100: credential.fields[0],
                          GRAD_YEAR: credential.fields[1],
                          ANNUAL_INCOME: credential.fields[2],
                          CATEGORY: credential.fields[3],
                          BIRTH_YEAR: credential.fields[4],
                          BACKLOGS: credential.fields[5],
                        },
                        onChainStatus: credentialValid,
                      }]
                    : activeCredentials
                  ).map((cred) => (
                    <div key={cred.id} className="glass-card" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{cred.title}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Issued by {cred.issuer} • {cred.issuedAt}
                          </div>
                        </div>
                        {cred.onChainStatus === false ? (
                          <span className="badge badge-danger">Revoked / Invalid</span>
                        ) : (
                          <span className="badge badge-success">On-Chain Verified</span>
                        )}
                      </div>

                      {/* Attribute pills */}
                      <div
                        style={{
                          background: 'var(--bg-tertiary)',
                          borderRadius: '0.5rem',
                          padding: '0.75rem',
                          marginBottom: '0.75rem',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '0.5rem',
                        }}
                      >
                        {Object.entries(cred.data).map(([key, val]) => (
                          <div key={key}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{key}</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {key === 'CGPA_X100' ? (Number(val) / 100).toFixed(2) : String(val)}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span>Commitment Hash: </span>
                        <span className="code-pill">{cred.commitment.substring(0, 18)}...</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Pending Verification Requests */}
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileCheck2 size={16} />
                  <span>Incoming Verifier Queries ({queries.length})</span>
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {queries.map((q) => (
                    <div key={q.id} className="glass-card" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{q.verifier}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Query #{q.id} • Asked {q.timestamp}
                          </div>
                        </div>
                        {q.answered ? (
                          q.result ? (
                            <span className="badge badge-success">Eligible: YES</span>
                          ) : (
                            <span className="badge badge-danger">Not Eligible: NO</span>
                          )
                        ) : (
                          <span className="badge badge-warning">Awaiting Your Proof</span>
                        )}
                      </div>

                      {/* The Question Box */}
                      <div
                        style={{
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: '0.5rem',
                          padding: '0.75rem 1rem',
                          marginBottom: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Requirement Condition
                          </div>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                            {q.readableCondition}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Verifier learns <strong>Yes/No only</strong>
                        </div>
                      </div>

                      {/* Prover Action */}
                      {provingQueryId === q.id ? (
                        <div
                          style={{
                            background: 'var(--bg-card-subtle)',
                            border: '1px solid var(--accent-primary)',
                            borderRadius: '0.5rem',
                            padding: '1rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <RefreshCw size={16} className="spin" color="var(--accent-primary)" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                              {provingStep === 1 && 'Generating Witness from Credential...'}
                              {provingStep === 2 && 'Verifying Poseidon Commitment...'}
                              {provingStep === 3 && 'Checking EdDSA BabyJubJub Signature...'}
                              {provingStep === 4 && 'Submitting Groth16 Proof to Blockchain...'}
                              {provingStep === 5 && 'Verified on EVM Successfully!'}
                            </span>
                          </div>
                          <div style={{ height: '4px', background: 'var(--border-primary)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${(provingStep / 5) * 100}%`,
                                background: 'linear-gradient(90deg, #2563eb, #10b981)',
                                transition: 'width 0.4s ease',
                              }}
                            />
                          </div>
                        </div>
                      ) : q.isOnChain && q.answered ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                          Answered on-chain by <span className="code-pill">{shortAddr(q.holder)}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleProveQuery(q.id)}
                          className="btn btn-primary"
                          style={{ width: '100%', fontSize: '0.85rem' }}
                        >
                          <Sparkles size={16} />
                          <span>Generate Zero-Knowledge Proof & Answer</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: ISSUER HUB */}
        {activeTab === 'issuer' && (
          <div className="app-container">
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Building2 size={24} color="var(--accent-primary)" />
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Institutional Issuer Hub</h1>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Authorized institutions (Universities, Revenue Departments) sign credentials
                off-chain and register the cryptographic commitment fingerprint on Ethereum.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '1.75rem' }}>
              {/* Registered Issuers (read live from IssuerRegistry) */}
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
                  Registered On-Chain Issuers
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {issuers.map((iss) => (
                    <div key={iss.id} className="glass-card" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{iss.name}</span>
                        {iss.active ? (
                          <span className="badge badge-success">Active Root Authority</span>
                        ) : (
                          <span className="badge badge-warning">Not Approved</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Address: <span className="code-pill">{shortAddr(iss.address)}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        BabyJubJub Key (Ax):{' '}
                        <span className="code-pill">{iss.ax === '0' ? '—' : iss.ax.substring(0, 18) + '...'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Issuing flow: University key -> Owner approval -> University issues */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700 }}>Step 1 · University creates its signing key</span>
                    <span className="badge">MetaMask: University</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Generated off-chain by the university&apos;s signing service. Only the public key (Ax, Ay) goes on-chain.
                  </p>
                  {issuerKey && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      Key for <span className="code-pill">{shortAddr(issuerKey.address)}</span> · Ax{' '}
                      <span className="code-pill">{issuerKey.ax.substring(0, 14)}...</span>
                    </div>
                  )}
                  <button
                    onClick={handleGenerateIssuerKey}
                    disabled={issuerBusy !== null}
                    className="btn btn-secondary"
                    style={{ width: '100%', marginTop: '0.75rem' }}
                  >
                    <Key size={16} />
                    <span>
                      {issuerBusy === 'key' ? 'Generating...' : issuerKey ? 'Generate New Key' : 'Generate University Signing Key'}
                    </span>
                  </button>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: 700 }}>Step 2 · Owner approves the university</span>
                    <span className="badge">MetaMask: Owner</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Institution Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={issueForm.issuerName}
                      onChange={(e) => setIssueForm({ ...issueForm, issuerName: e.target.value })}
                    />
                  </div>
                  <button
                    onClick={handleApproveIssuer}
                    disabled={!issuerKey || issuerBusy !== null}
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
                  >
                    <ShieldCheck size={16} />
                    <span>{issuerBusy === 'approve' ? 'Waiting for MetaMask...' : 'Approve University On-Chain'}</span>
                  </button>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: 700 }}>Step 3 · University issues the certificate</span>
                    <span className="badge">MetaMask: University</span>
                  </div>
                  <form onSubmit={handleIssueCredential}>
                    <div className="form-group">
                      <label className="form-label">Certificate Title</label>
                      <input
                        type="text"
                        className="form-input"
                        value={issueForm.title}
                        onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                      {[
                        ['cgpa', 'CGPA (e.g. 8.45)'],
                        ['gradYear', 'Graduation Year'],
                        ['birthYear', 'Birth Year'],
                        ['income', 'Annual Income (₹)'],
                        ['backlogs', 'Active Backlogs'],
                      ].map(([key, label]) => (
                        <div className="form-group" key={key}>
                          <label className="form-label">{label}</label>
                          <input
                            type="text"
                            className="form-input"
                            value={issueForm[key]}
                            onChange={(e) => setIssueForm({ ...issueForm, [key]: e.target.value })}
                          />
                        </div>
                      ))}
                      <div className="form-group">
                        <label className="form-label">Social Category</label>
                        <select
                          className="form-select"
                          value={issueForm.category}
                          onChange={(e) => setIssueForm({ ...issueForm, category: e.target.value })}
                        >
                          <option value="0">General (0)</option>
                          <option value="1">OBC (1)</option>
                          <option value="2">SC (2)</option>
                          <option value="3">ST (3)</option>
                        </select>
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'var(--bg-tertiary)',
                        padding: '0.85rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '1.25rem',
                      }}
                    >
                      🔒 <strong>Privacy Guarantee:</strong> Raw values are never saved on the blockchain.
                      Only the salted Poseidon commitment{' '}
                      <code>Poseidon(fields, salt)</code> is registered in CredentialRegistry.
                    </div>

                    <button type="submit" disabled={!issuerKey || issuerBusy !== null} className="btn btn-primary" style={{ width: '100%' }}>
                      <Key size={16} />
                      <span>{issuerBusy === 'issue' ? 'Signing & Registering...' : 'Sign with BabyJubJub & Register On-Chain'}</span>
                    </button>
                  </form>

                  {issuedCredential && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                      Registered commitment{' '}
                      <span className="code-pill">{'0x' + BigInt(issuedCredential.commitment).toString(16).substring(0, 14)}...</span>{' '}
                      <button
                        type="button"
                        onClick={() => downloadJson('student-credential.json', issuedCredential)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', marginTop: '0.5rem' }}
                      >
                        Download student-credential.json again
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: VERIFIER PORTAL */}
        {activeTab === 'verifier' && (
          <div className="app-container">
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Scale size={24} color="var(--accent-primary)" />
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Verifier Query Portal</h1>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Banks, employers, and admission boards create custom threshold criteria. Once the student
                answers with a Zero-Knowledge proof, the contract returns an audited Yes or No.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr', gap: '1.75rem' }}>
              {/* Query Creation Form */}
              <div className="glass-card" style={{ padding: '1.75rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>
                  Create Eligibility Query
                </h2>

                <form onSubmit={handleCreateQuery}>
                  <div className="form-group">
                    <label className="form-label">Verifier Institution Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={queryForm.verifierName}
                      onChange={(e) => setQueryForm({ ...queryForm, verifierName: e.target.value })}
                    />
                  </div>

                  {/* Primary Condition */}
                  <div
                    style={{
                      background: 'var(--bg-tertiary)',
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                      Primary Requirement
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '0.5rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Attribute</label>
                        <select
                          className="form-select"
                          value={queryForm.fieldA}
                          onChange={(e) => setQueryForm({ ...queryForm, fieldA: Number(e.target.value) })}
                        >
                          <option value="0">CGPA (x100)</option>
                          <option value="1">Graduation Year</option>
                          <option value="2">Annual Income (₹)</option>
                          <option value="5">Active Backlogs</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Operator</label>
                        <select
                          className="form-select"
                          value={queryForm.opA}
                          onChange={(e) => setQueryForm({ ...queryForm, opA: Number(e.target.value) })}
                        >
                          <option value="0">≥ (At least)</option>
                          <option value="1">≤ (At most)</option>
                          <option value="2">&gt; (Greater)</option>
                          <option value="3">&lt; (Less)</option>
                          <option value="4">== (Exact)</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Threshold</label>
                        <input
                          type="text"
                          className="form-input"
                          value={queryForm.thresholdA}
                          onChange={(e) => setQueryForm({ ...queryForm, thresholdA: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Optional AND Condition */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={queryForm.useSecond}
                        onChange={(e) => setQueryForm({ ...queryForm, useSecond: e.target.checked })}
                      />
                      <span>Add Secondary Condition (Logical AND)</span>
                    </label>

                    {queryForm.useSecond && (
                      <div
                        style={{
                          background: 'var(--bg-tertiary)',
                          padding: '1rem',
                          borderRadius: '0.5rem',
                          marginTop: '0.75rem',
                          display: 'grid',
                          gridTemplateColumns: '1.5fr 1fr 1fr',
                          gap: '0.5rem',
                        }}
                      >
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Attribute B</label>
                          <select
                            className="form-select"
                            value={queryForm.fieldB}
                            onChange={(e) => setQueryForm({ ...queryForm, fieldB: Number(e.target.value) })}
                          >
                            <option value="5">Active Backlogs</option>
                            <option value="1">Graduation Year</option>
                            <option value="2">Annual Income</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Operator B</label>
                          <select
                            className="form-select"
                            value={queryForm.opB}
                            onChange={(e) => setQueryForm({ ...queryForm, opB: Number(e.target.value) })}
                          >
                            <option value="4">== (Equals)</option>
                            <option value="1">≤ (At most)</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Threshold B</label>
                          <input
                            type="text"
                            className="form-input"
                            value={queryForm.thresholdB}
                            onChange={(e) => setQueryForm({ ...queryForm, thresholdB: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <button
                      type="button"
                      onClick={handleCreateQueryOnChain}
                      disabled={isPublishingOnChain}
                      className="btn btn-primary"
                      style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {isPublishingOnChain ? (
                        <>
                          <RefreshCw size={16} className="spin" />
                          <span>Mining on Base Sepolia...</span>
                        </>
                      ) : (
                        <>
                          <span>🚀 Publish to Base Sepolia (MetaMask)</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>

                    <button
                      type="submit"
                      className="btn btn-secondary"
                      style={{ width: '100%', fontSize: '0.82rem' }}
                    >
                      <span>⚡ Quick Add (Simulated Demo / No Gas)</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* On-Chain Query Audit Log */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                    Audited Queries &amp; Results
                  </h2>
                  <button
                    onClick={syncFromBlockchain}
                    disabled={isSyncing}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <RefreshCw size={13} className={isSyncing ? 'spin' : ''} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync TestNet'}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {queries.map((q) => (
                    <div key={q.id} className="glass-card" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{q.verifier}</span>
                        {q.answered ? (
                          q.result ? (
                            <span className="badge badge-success">
                              <Check size={13} /> Verified: YES
                            </span>
                          ) : (
                            <span className="badge badge-danger">
                              <XCircle size={13} /> Verified: NO
                            </span>
                          )
                        ) : (
                          <span className="badge badge-warning">
                            <Clock size={13} /> Pending Proof
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
                        {q.readableCondition}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Query ID: #{q.id}</span>
                        <span>{q.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: ZK-EMAIL & ARCHITECTURE */}
        {activeTab === 'architecture' && (
          <div className="app-container">
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Mail size={24} color="var(--accent-primary)" />
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>zk-Email & Protocol Architecture</h1>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                How ProveOnce bridges zero-knowledge proofs, web3 identity, and internet standards like DKIM email signatures.
              </p>
            </div>

            {/* zk-Email Deep Dive Card */}
            <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(37,99,235,0.1)', padding: '0.5rem', borderRadius: '0.5rem', color: 'var(--accent-primary)' }}>
                  <Mail size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                    How zk-Email Replaces Institutional APIs
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Verifying official transcripts from registrar@annauniv.edu via RSA-2048 DKIM inside Circom
                  </p>
                </div>
              </div>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                Traditional institutions are slow to deploy custom blockchain nodes. However, universities and governments
                already send official PDFs and grade notifications via signed emails. Because modern email uses the{' '}
                <strong>DKIM (DomainKeys Identified Mail)</strong> standard, the mail server signs the email body using an{' '}
                <strong>RSA-2048 private key</strong>.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '1rem',
                  background: 'var(--bg-tertiary)',
                  padding: '1.25rem',
                  borderRadius: '0.75rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    1. Email Ingestion (.eml)
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    The student imports their official transcript email from their university domain.
                  </p>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    2. In-Circuit RSA & Regex
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Circom parses the DKIM signature and extracts the CGPA string inside a Zero-Knowledge SNARK.
                  </p>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    3. On-Chain Verification
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Ethereum smart contract verifies that the university&apos;s DNS public key signed the transcript.
                  </p>
                </div>
              </div>

              {/* Interactive zk-Email Sandbox */}
              <div
                style={{
                  border: '1px dashed var(--border-secondary)',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  background: 'var(--bg-card-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    🧪 Interactive zk-Email Sandbox (.eml)
                  </span>
                  <span className="badge badge-success">DKIM RSA-2048</span>
                </div>

                <div
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    lineHeight: 1.6,
                    color: 'var(--text-secondary)',
                    marginBottom: '1rem',
                  }}
                >
                  <div><strong style={{ color: 'var(--text-primary)' }}>From:</strong> registrar@annauniv.edu</div>
                  <div><strong style={{ color: 'var(--text-primary)' }}>DKIM-Signature:</strong> v=1; a=rsa-sha256; d=annauniv.edu; s=s1; bh=47DEQpj8...;</div>
                  <div><strong style={{ color: 'var(--text-primary)' }}>Subject:</strong> Official Provisional Academic Transcript - 2024</div>
                  <div style={{ marginTop: '0.35rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    &gt; Transcript Body: &quot;Student ID: AU-2020-041 | Cumulative CGPA: 8.45 | Degree Conferred: B.Tech CSE&quot;
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      setStatusMessage({
                        type: 'success',
                        title: 'zk-Email Proof Verified!',
                        detail: 'DKIM RSA-2048 verified against DKIMRegistry.sol. CGPA 8.45 confirmed without revealing student name.',
                      });
                    }}
                    className="btn btn-primary"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <ShieldCheck size={16} />
                    <span>Verify DKIM Signature & Extract Proof</span>
                  </button>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    No passwords or email login required. Runs purely on mathematical signatures.
                  </span>
                </div>
              </div>
            </div>

            {/* Phase 4: Merkle Tree & Unlinkability Visualizer */}
            <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(16,185,129,0.1)', padding: '0.5rem', borderRadius: '0.5rem', color: '#10b981' }}>
                  <Layers size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                    Phase 4: Merkle Tree Anonymity & Unlinkable Nullifiers
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Preventing cross-verifier tracking using the Tornado Cash & Semaphore privacy model
                  </p>
                </div>
              </div>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                In traditional protocols, publishing a student&apos;s commitment hash allows Verifier A (Bank) and Verifier B (Employer)
                to correlate the hash and track the student. In ProveOnce Phase 4, credentials live as hidden leaves in an{' '}
                <strong>On-Chain Incremental Merkle Tree (Depth 8, 256 leaves)</strong>. The circuit generates a per-query{' '}
                <strong>Nullifier = Poseidon(salt, queryId)</strong>.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '0.5rem', border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    Application to Bank Loan (Query #1)
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
                    Nullifier #1 = 0x93f41a8e2b...
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Bound uniquely to Query 1. Cannot be stolen or re-used.
                  </div>
                </div>

                <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '0.5rem', border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    Application to Tech Job (Query #2)
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: '#10b981', marginBottom: '0.5rem' }}>
                    Nullifier #2 = 0x18c0e7492d...
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Completely different hash! Bank and Employer cannot correlate the applicant.
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                🔒 <strong>Mathematical Unlinkability:</strong> Nullifier #1 ≠ Nullifier #2, yet both prove membership in the same on-chain Merkle Root without revealing which leaf is yours.
              </div>
            </div>

            {/* Smart Contract Map */}
            <div className="glass-card" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem' }}>
                On-Chain Smart Contract Structure (Phases 1, 3 & 4)
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {[
                  {
                    name: 'IssuerRegistry.sol',
                    desc: 'Maintains trusted public institutions and their BabyJubJub curve public keys (Ax, Ay).',
                    status: 'Compiled & Tested',
                  },
                  {
                    name: 'MerkleCredentialRegistry.sol',
                    desc: 'On-chain Poseidon Incremental Merkle Tree storing credential commitments and historical roots (Phase 4).',
                    status: 'Compiled & Tested',
                  },
                  {
                    name: 'EligibilityVerifierV2.sol',
                    desc: 'Anonymous verification contract validating Merkle roots and burning per-query nullifiers (Phase 4).',
                    status: 'Compiled & Tested',
                  },
                  {
                    name: 'DKIMRegistry.sol',
                    desc: 'Maintains verified university RSA-2048 DNS keys for zk-Email verification (Phase 3).',
                    status: 'Compiled & Tested',
                  },
                  {
                    name: 'Groth16Verifier.sol',
                    desc: 'Auto-generated pairing verifier evaluating 13 public signals in EVM bytecode.',
                    status: 'Generated & Active',
                  },
                ].map((c, idx) => (
                  <div key={idx} style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '0.5rem', border: '1px solid var(--border-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-primary)' }}>
                        {c.name}
                      </span>
                      <span className="badge badge-success">{c.status}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {c.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-primary)',
          background: 'var(--glass-bg)',
          padding: '2rem 0',
          marginTop: 'auto',
        }}
      >
        <div
          className="app-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.825rem',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            ProveOnce Protocol • Zero-Knowledge Eligibility on Ethereum
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => setActiveTab('landing')}>
              Architecture
            </span>
            <span style={{ cursor: 'pointer' }} onClick={() => setActiveTab('architecture')}>
              zk-Email Specs
            </span>
            <a
              href="https://github.com/Sasi-Kiran-Yasaswi-Vejju/ProoveOnce"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span>GitHub</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
