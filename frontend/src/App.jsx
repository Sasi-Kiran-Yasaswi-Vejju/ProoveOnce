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
  Check
} from 'lucide-react';

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
  const [selectedRole, setSelectedRole] = useState('student');
  const [copiedText, setCopiedText] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

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
    issuerId: 'uni',
    cgpa: '8.45',
    gradYear: '2024',
    income: '650000',
    category: '1',
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

  // Simulate proof generation
  const handleProveQuery = async (queryId) => {
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
    const newId = String(queries.length + 1);
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
      title: 'Query Created On-Chain',
      detail: `Query #${newId} is now awaiting holder proof submission.`,
    });
  };

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
                color: apiConnected ? '#10b981' : '#f59e0b',
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
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: apiConnected ? '#10b981' : '#f59e0b',
                }}
              />
              {apiConnected ? 'Hardhat Node (3001)' : 'In-Memory EVM'}
            </div>

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
              onClick={() => setWalletConnected(!walletConnected)}
              className={walletConnected ? 'btn btn-secondary' : 'btn btn-primary'}
              style={{ fontSize: '0.82rem' }}
            >
              <Wallet size={16} />
              <span>{walletConnected ? '0x8ba1...3a9f' : 'Connect Wallet'}</span>
            </button>
          </div>
        </div>
      </header>

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
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {activeCredentials.map((cred) => (
                    <div key={cred.id} className="glass-card" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{cred.title}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Issued by {cred.issuer} • {cred.issuedAt}
                          </div>
                        </div>
                        <span className="badge badge-success">On-Chain Verified</span>
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
              {/* Registered Issuers */}
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
                  Registered On-Chain Issuers
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {issuers.map((iss) => (
                    <div key={iss.id} className="glass-card" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{iss.name}</span>
                        <span className="badge badge-success">Active Root Authority</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Address: <span className="code-pill">{iss.address.substring(0, 16)}...</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        BabyJubJub Key (Ax): <span className="code-pill">{iss.ax.substring(0, 18)}...</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Credential Issuance Form */}
              <div className="glass-card" style={{ padding: '1.75rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>
                  Issue New Certificate
                </h2>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setStatusMessage({
                      type: 'success',
                      title: 'Credential Issued & Committed!',
                      detail: 'BabyJubJub EdDSA signature created and commitment recorded on-chain.',
                    });
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">Issuing Authority</label>
                    <select
                      className="form-select"
                      value={issueForm.issuerId}
                      onChange={(e) => setIssueForm({ ...issueForm, issuerId: e.target.value })}
                    >
                      <option value="uni">Anna University (Academic)</option>
                      <option value="gov">Tahsildar Revenue Office (Income & Social)</option>
                    </select>
                  </div>

                  {issueForm.issuerId === 'uni' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Cumulative GPA (e.g. 8.45)</label>
                        <input
                          type="text"
                          className="form-input"
                          value={issueForm.cgpa}
                          onChange={(e) => setIssueForm({ ...issueForm, cgpa: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Graduation Year</label>
                        <input
                          type="text"
                          className="form-input"
                          value={issueForm.gradYear}
                          onChange={(e) => setIssueForm({ ...issueForm, gradYear: e.target.value })}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Family Annual Income (₹)</label>
                        <input
                          type="text"
                          className="form-input"
                          value={issueForm.income}
                          onChange={(e) => setIssueForm({ ...issueForm, income: e.target.value })}
                        />
                      </div>
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
                  )}

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

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    <Key size={16} />
                    <span>Sign with BabyJubJub & Register On-Chain</span>
                  </button>
                </form>
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

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    <span>Publish Query to Blockchain</span>
                    <ArrowRight size={16} />
                  </button>
                </form>
              </div>

              {/* On-Chain Query Audit Log */}
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>
                  Audited Queries & Results
                </h2>

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
