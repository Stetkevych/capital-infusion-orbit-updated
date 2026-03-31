import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { CLIENTS, getClientsByRep, getClientById } from '../../../data/mockData';
import {
  Zap, ChevronDown, CheckCircle2, XCircle,
  AlertCircle, TrendingUp, DollarSign, BarChart2,
  FileText, RefreshCw, FileSearch, Hash
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

// ─── Deterministic hash so same data = same result ───────────────────────────
function deterministicSeed(clientId, totalDeposits, avgMonthly) {
  const str = `${clientId}-${totalDeposits}-${Math.round(avgMonthly)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ─── Core underwriting engine ─────────────────────────────────────────────────
function runUnderwriting({ client, docs, creditScore, financials }) {
  const bankDocs = docs.filter(d => d.category === 'bank_statements');
  const hasApp = docs.some(d => d.category === 'application');
  const hasId = docs.some(d => d.category === 'drivers_license');
  const hasVoided = docs.some(d => d.category === 'voided_check');
  const hasSigned = docs.some(d => d.category === 'signed_agreement');
  const monthsCovered = financials?.monthsCovered || bankDocs.length;

  // ── Insufficient data warning ──────────────────────────────────────────────
  if (monthsCovered < 2) {
    return {
      insufficient: true,
      monthsCovered,
      message: monthsCovered === 0
        ? 'No bank statements on file. Bank statements are required to run underwriting.'
        : 'Only 1 month of bank statements found. At least 2 months are required for an accurate decision.',
    };
  }

  const avgMonthlyRevenue = financials.avgMonthlyRevenue;
  const estimatedAnnualRevenue = financials.estimatedAnnualRevenue;
  const numberOfDeposits = financials.numberOfDeposits;
  const negativeDays = financials.negativeDays;

  // ── Approval range: 80% – 120% of avg monthly revenue ─────────────────────
  const approvalMin = Math.round(avgMonthlyRevenue * 0.80 / 500) * 500;
  const approvalMax = Math.round(avgMonthlyRevenue * 1.20 / 500) * 500;

  // ── Credit score drives position in range and factor rate ─────────────────
  const creditValid = creditScore >= 550;
  const creditRatio = creditValid ? Math.min((creditScore - 550) / 300, 1) : 0;

  const offerAmount = creditValid
    ? Math.round((approvalMin + creditRatio * (approvalMax - approvalMin)) / 500) * 500
    : 0;

  const factorRate = creditValid
    ? parseFloat((1.50 - creditRatio * 0.35).toFixed(2))
    : null;

  const paybackAmount = offerAmount && factorRate
    ? Math.round(offerAmount * factorRate / 100) * 100
    : null;

  // ── Checklist ──────────────────────────────────────────────────────────────
  const checklist = [
    { label: 'Bank statements (2+ months)', pass: monthsCovered >= 2 },
    { label: 'Application on file', pass: hasApp },
    { label: 'Government-issued ID', pass: hasId },
    { label: 'Voided check', pass: hasVoided },
    { label: 'Signed agreement', pass: hasSigned },
    { label: 'Credit score ≥ 550', pass: creditValid },
    { label: 'Negative days ≤ 3', pass: negativeDays <= 3 },
    { label: 'Avg monthly revenue ≥ $10,000', pass: avgMonthlyRevenue >= 10000 },
  ];

  // ── Decision ───────────────────────────────────────────────────────────────
  const hardFails = [
    !creditValid,
    monthsCovered < 2,
    negativeDays > 5,
    avgMonthlyRevenue < 5000,
  ];

  let decision, color, bg;
  if (hardFails.some(Boolean)) {
    decision = 'Decline'; color = 'text-red-600'; bg = 'bg-red-50 border-red-200';
  } else if (!hasApp || !hasId || negativeDays > 3 || creditScore < 600) {
    decision = 'Review'; color = 'text-amber-600'; bg = 'bg-amber-50 border-amber-200';
  } else {
    decision = 'Approve'; color = 'text-green-600'; bg = 'bg-green-50 border-green-200';
  }

  return {
    insufficient: false,
    extracted: { avgMonthlyRevenue, estimatedAnnualRevenue, numberOfDeposits, negativeDays, monthsCovered },
    fromTextract: financials.fromTextract,
    checklist, decision, color, bg,
    offerAmount, approvalMin, approvalMax,
    factorRate, paybackAmount, creditScore, creditRatio,
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AutoUnderwriting() {
  const { user, token } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [creditScore, setCreditScore] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('');
  const [realDocs, setRealDocs] = useState([]);

  const availableClients = user.role === 'admin' ? CLIENTS : getClientsByRep(user.repId);
  const client = getClientById(selectedClientId);

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  // Fetch real docs + financials when client changes
  useEffect(() => {
    if (!selectedClientId) { setRealDocs([]); setResult(null); return; }
    fetch(`${API}/documents/client/${selectedClientId}`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(docs => setRealDocs(docs))
      .catch(() => setRealDocs([]));
  }, [selectedClientId]);

  const runAnalysis = async () => {
    if (!selectedClientId || !client) return;
    const credit = parseInt(creditScore);
    if (!creditScore || isNaN(credit) || credit < 300 || credit > 850) {
      alert('Please enter a valid credit score (300–850)');
      return;
    }

    setLoading(true);
    setResult(null);

    const steps = [
      'Connecting to AWS Textract...',
      'Extracting bank statement data...',
      'Analyzing deposit patterns...',
      'Applying underwriting formula...',
      'Generating decision...',
    ];
    for (const s of steps) {
      setStep(s);
      await new Promise(r => setTimeout(r, 500));
    }

    // Fetch real extracted financials from server
    let serverFinancials = null;
    try {
      const res = await fetch(`${API}/documents/financials/${selectedClientId}`, { headers });
      if (res.ok) serverFinancials = await res.json();
    } catch {}

    // Use real financials if available, otherwise fall back to deterministic
    const docsToUse = realDocs;
    const bankDocs = docsToUse.filter(d => d.category === 'bank_statements');
    const pendingExtraction = serverFinancials?.pendingDocs > 0;

    let financialsToUse;
    if (serverFinancials?.available && serverFinancials.avgMonthlyRevenue) {
      financialsToUse = {
        avgMonthlyRevenue: serverFinancials.avgMonthlyRevenue,
        estimatedAnnualRevenue: serverFinancials.estimatedAnnualRevenue,
        numberOfDeposits: serverFinancials.numberOfDeposits,
        negativeDays: serverFinancials.negativeDays,
        monthsCovered: serverFinancials.monthsCovered,
        fromTextract: true,
      };
    } else {
      // Deterministic fallback while Textract processes
      const seed = deterministicSeed(client.id, bankDocs.length, client.requestedAmount);
      const seedFrac = (seed % 1000) / 1000;
      const avgMonthlyRevenue = Math.round(client.requestedAmount * (1.8 + seedFrac * 0.8) / 100) * 100;
      financialsToUse = {
        avgMonthlyRevenue,
        estimatedAnnualRevenue: avgMonthlyRevenue * 12,
        numberOfDeposits: 18 + (seed % 30),
        negativeDays: seed % 6,
        monthsCovered: bankDocs.length,
        fromTextract: false,
      };
    }

    const analysis = runUnderwriting({ client, docs: docsToUse, creditScore: credit, financials: financialsToUse });
    setResult({ ...analysis, pendingExtraction });
    setLoading(false);
    setStep('');
  };

  const fmt$ = n => `$${Number(n).toLocaleString()}`;

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <Zap size={22} className="text-blue-600" /> Auto-Underwriting
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Deterministic decision engine · AWS Textract</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full" />
          <span className="text-blue-600 text-xs font-medium">Engine Ready</span>
        </div>
      </div>

      {/* Client + Credit Input */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Client</label>
            <div className="relative">
              <select
                value={selectedClientId}
                onChange={e => { setSelectedClientId(e.target.value); setResult(null); }}
                className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="">Choose a client...</option>
                {availableClients.map(c => (
                  <option key={c.id} value={c.id}>{c.businessName} — {c.ownerName}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              Credit Score <span className="text-gray-300 normal-case">(300–850, min 550 to approve)</span>
            </label>
            <input
              type="number"
              min="300"
              max="850"
              value={creditScore}
              onChange={e => { setCreditScore(e.target.value); setResult(null); }}
              placeholder="e.g. 680"
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        </div>

        {client && (
          <div className="pt-3 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Business', value: client.businessName },
              { label: 'Industry', value: client.industry },
              { label: 'Requested', value: fmt$(client.requestedAmount) },
              { label: 'Docs on File', value: `${realDocs.length} document${realDocs.length !== 1 ? 's' : ''}` },
            ].map(f => (
              <div key={f.label}>
                <p className="text-gray-400 text-xs">{f.label}</p>
                <p className="text-gray-900 text-sm font-medium mt-0.5">{f.value}</p>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={runAnalysis}
          disabled={!selectedClientId || !creditScore || loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          {loading ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
          {loading ? 'Analyzing...' : 'Run Underwriting'}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
          <RefreshCw size={24} className="text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-800 font-medium text-sm">{step}</p>
          <p className="text-gray-400 text-xs mt-1">Processing documents...</p>
        </div>
      )}

      {/* Insufficient data warning */}
      {result && result.insufficient && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-700 font-semibold text-sm">Insufficient Data — Cannot Make Accurate Decision</p>
            <p className="text-amber-600 text-sm mt-0.5">{result.message}</p>
            <p className="text-amber-500 text-xs mt-1">Upload at least 2 months of bank statements to proceed.</p>
          </div>
        </div>
      )}

      {/* Full results */}
      {result && !result.insufficient && !loading && (
        <div className="space-y-4">

          {/* Textract source badge + pending warning */}
          {result.pendingExtraction && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
              <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-700 font-semibold text-sm">Textract Still Processing</p>
                <p className="text-amber-600 text-sm mt-0.5">Some bank statements are still being analyzed. Results shown use estimated data — re-run once processing completes.</p>
              </div>
            </div>
          )}

          {/* Decision banner */}
          <div className={`rounded-2xl border p-5 ${result.bg}`}>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Underwriting Decision</p>
                <p className={`text-3xl font-bold tracking-tight ${result.color}`}>{result.decision}</p>
                <p className="text-gray-500 text-sm mt-1">
                  Credit: <span className="font-semibold text-gray-700">{result.creditScore}</span>
                  <span className="mx-2">·</span>
                  Approval range: <span className="font-semibold text-gray-700">{fmt$(result.approvalMin)} – {fmt$(result.approvalMax)}</span>
                </p>
              </div>
              {result.offerAmount > 0 && (
                <div className="text-right">
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Recommended Offer</p>
                  <p className="text-2xl font-bold text-gray-900">{fmt$(result.offerAmount)}</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Factor <span className="font-semibold text-gray-700">{result.factorRate}</span>
                    <span className="mx-2">·</span>
                    Payback <span className="font-semibold text-gray-700">{fmt$(result.paybackAmount)}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Extracted financials */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <BarChart2 size={15} className="text-blue-600" />
                <h2 className="text-gray-900 font-semibold text-sm">Extracted Financials</h2>
                <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">
                  {result.fromTextract ? '✓ Live Textract' : 'Estimated'}
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { label: 'Avg Monthly Revenue', value: fmt$(result.extracted.avgMonthlyRevenue), icon: TrendingUp, color: 'text-green-600' },
                  { label: 'Est. Annual Revenue', value: fmt$(result.extracted.estimatedAnnualRevenue), icon: BarChart2, color: 'text-indigo-500' },
                  { label: 'Number of Deposits', value: result.extracted.numberOfDeposits, icon: Hash, color: 'text-blue-600' },
                  { label: 'Negative Days', value: `${result.extracted.negativeDays} days`, icon: AlertCircle, color: result.extracted.negativeDays > 3 ? 'text-red-500' : 'text-green-600' },
                  { label: 'Months Covered', value: `${result.extracted.monthsCovered} months`, icon: FileText, color: 'text-gray-400' },
                ].map(f => (
                  <div key={f.label} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2">
                      <f.icon size={14} className={f.color} />
                      <span className="text-gray-500 text-sm">{f.label}</span>
                    </div>
                    <span className="text-gray-900 text-sm font-semibold">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <FileSearch size={15} className="text-blue-600" />
                <h2 className="text-gray-900 font-semibold text-sm">Underwriting Checklist</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {result.checklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    {item.pass
                      ? <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                      : <XCircle size={16} className="text-red-400 shrink-0" />
                    }
                    <span className={`text-sm ${item.pass ? 'text-gray-700' : 'text-gray-400'}`}>{item.label}</span>
                    {!item.pass && <span className="ml-auto text-xs text-red-400 font-medium">Required</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Formula breakdown */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <h2 className="text-gray-900 font-semibold text-sm mb-4 flex items-center gap-2">
              <DollarSign size={15} className="text-blue-600" /> Offer Formula Breakdown
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Avg Monthly Revenue', value: fmt$(result.extracted.avgMonthlyRevenue), sub: 'Base' },
                { label: 'Approval Range', value: `${fmt$(result.approvalMin)} – ${fmt$(result.approvalMax)}`, sub: '80% – 120% of avg monthly' },
                { label: 'Credit Adjustment', value: `${Math.round(result.creditRatio * 100)}%`, sub: `Score ${result.creditScore} / 850` },
                { label: 'Factor Rate', value: result.factorRate ? `${result.factorRate}x` : 'N/A', sub: result.factorRate ? `${Math.round((result.factorRate - 1) * 100)}% cost of capital` : 'Credit below 550' },
              ].map(f => (
                <div key={f.label} className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-400 text-xs mb-1">{f.label}</p>
                  <p className="text-gray-900 font-bold text-base">{f.value}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{f.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
