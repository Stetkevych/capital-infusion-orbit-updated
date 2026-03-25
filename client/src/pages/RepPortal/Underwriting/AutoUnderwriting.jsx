import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { CLIENTS, getClientsByRep, getClientById, getDocumentsByClient, DOC_CATEGORIES } from '../../../data/mockData';
import {
  Zap, ChevronDown, FileSearch, CheckCircle2, XCircle,
  AlertCircle, TrendingUp, DollarSign, BarChart2,
  FileText, RefreshCw
} from 'lucide-react';

// ─── Mock Textract extraction ─────────────────────────────────────────────────
function runTextractAnalysis(client, docs) {
  const hasApp = docs.some(d => d.category === 'application' && d.status === 'Approved');
  const bankDocs = docs.filter(d => d.category === 'bank_statements');
  const hasId = docs.some(d => d.category === 'drivers_license' && d.status === 'Approved');
  const hasVoided = docs.some(d => d.category === 'voided_check');
  const hasSigned = docs.some(d => d.category === 'signed_agreement');

  // Simulated extracted financials
  const avgMonthlyRevenue = client.requestedAmount * (0.8 + Math.random() * 0.6);
  const avgMonthlyDeposits = avgMonthlyRevenue * (0.9 + Math.random() * 0.2);
  const negDays = Math.floor(Math.random() * 5);
  const monthsCovered = bankDocs.length;

  return {
    extracted: {
      avgMonthlyRevenue: Math.round(avgMonthlyRevenue),
      avgMonthlyDeposits: Math.round(avgMonthlyDeposits),
      negativeDays: negDays,
      monthsCovered,
      estimatedAnnualRevenue: Math.round(avgMonthlyRevenue * 12),
    },
    checklist: [
      { label: 'Application on file', pass: hasApp },
      { label: 'Bank statements (2+ months)', pass: bankDocs.length >= 2 },
      { label: 'Government-issued ID', pass: hasId },
      { label: 'Voided check', pass: hasVoided },
      { label: 'Signed agreement', pass: hasSigned },
      { label: 'No excessive negative days (≤3)', pass: negDays <= 3 },
      { label: 'Avg monthly deposits ≥ $10,000', pass: avgMonthlyDeposits >= 10000 },
    ],
  };
}

function scoreDecision(checklist, extracted) {
  const passed = checklist.filter(c => c.pass).length;
  const total = checklist.length;
  const score = Math.round((passed / total) * 100);

  let decision, color, bg;
  if (score >= 85) { decision = 'Approve'; color = 'text-green-600'; bg = 'bg-green-50 border-green-200'; }
  else if (score >= 60) { decision = 'Review'; color = 'text-amber-600'; bg = 'bg-amber-50 border-amber-200'; }
  else { decision = 'Decline'; color = 'text-red-600'; bg = 'bg-red-50 border-red-200'; }

  const maxOffer = Math.round(extracted.avgMonthlyRevenue * 1.5 / 1000) * 1000;
  const factor = 1.25 + Math.random() * 0.25;

  return { score, decision, color, bg, maxOffer, factor: factor.toFixed(2) };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AutoUnderwriting() {
  const { user } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('');

  const availableClients = user.role === 'admin' ? CLIENTS : getClientsByRep(user.repId);
  const client = getClientById(selectedClientId);
  const docs = selectedClientId ? getDocumentsByClient(selectedClientId) : [];

  const runAnalysis = async () => {
    if (!selectedClientId) return;
    setLoading(true);
    setResult(null);

    const steps = [
      'Connecting to AWS Textract...',
      'Extracting bank statement data...',
      'Analyzing deposit patterns...',
      'Running credit indicators...',
      'Generating underwriting decision...',
    ];

    for (const s of steps) {
      setStep(s);
      await new Promise(r => setTimeout(r, 600));
    }

    const analysis = runTextractAnalysis(client, docs);
    const decision = scoreDecision(analysis.checklist, analysis.extracted);
    setResult({ ...analysis, ...decision });
    setLoading(false);
    setStep('');
  };

  const fmt$ = (n) => `$${n.toLocaleString()}`;

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-apple-gray1 tracking-tight flex items-center gap-2">
            <Zap size={22} className="text-apple-blue" /> Auto-Underwriting
          </h1>
          <p className="text-apple-gray4 text-sm mt-0.5">Powered by AWS Textract · AI document analysis</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
          <div className="w-2 h-2 bg-apple-blue rounded-full" />
          <span className="text-apple-blue text-xs font-medium">Textract Ready</span>
        </div>
      </div>

      {/* Client selector */}
      <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 p-5">
        <label className="block text-xs font-medium text-apple-gray3 mb-2 uppercase tracking-wide">Select Client to Underwrite</label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <select
              value={selectedClientId}
              onChange={e => { setSelectedClientId(e.target.value); setResult(null); }}
              className="w-full appearance-none bg-apple-gray9 border border-apple-gray7 text-apple-gray1 text-sm rounded-xl px-4 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-apple-blue/30"
            >
              <option value="">Choose a client...</option>
              {availableClients.map(c => (
                <option key={c.id} value={c.id}>{c.businessName} — {c.ownerName}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-gray4 pointer-events-none" />
          </div>
          <button
            onClick={runAnalysis}
            disabled={!selectedClientId || loading}
            className="flex items-center gap-2 bg-apple-blue hover:bg-apple-bluehov disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors shadow-apple-sm"
          >
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>

        {client && (
          <div className="mt-4 pt-4 border-t border-apple-gray7 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Business', value: client.businessName },
              { label: 'Industry', value: client.industry },
              { label: 'Requested', value: fmt$(client.requestedAmount) },
              { label: 'Documents', value: `${docs.length} on file` },
            ].map(f => (
              <div key={f.label}>
                <p className="text-apple-gray5 text-xs">{f.label}</p>
                <p className="text-apple-gray1 text-sm font-medium mt-0.5">{f.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 p-8 text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <RefreshCw size={22} className="text-apple-blue animate-spin" />
          </div>
          <p className="text-apple-gray1 font-medium text-sm">{step}</p>
          <p className="text-apple-gray4 text-xs mt-1">AWS Textract is processing documents...</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Decision banner */}
          <div className={`rounded-apple-lg border p-5 ${result.bg}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-apple-gray4 text-xs font-medium uppercase tracking-wide mb-1">Underwriting Decision</p>
                <p className={`text-3xl font-bold tracking-tight ${result.color}`}>{result.decision}</p>
                <p className="text-apple-gray4 text-sm mt-1">Confidence score: <span className="font-semibold text-apple-gray2">{result.score}%</span></p>
              </div>
              <div className="text-right">
                <p className="text-apple-gray4 text-xs font-medium uppercase tracking-wide mb-1">Max Offer</p>
                <p className="text-2xl font-bold text-apple-gray1">{fmt$(result.maxOffer)}</p>
                <p className="text-apple-gray4 text-sm mt-1">Factor rate: <span className="font-semibold text-apple-gray2">{result.factor}</span></p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Extracted financials */}
            <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 overflow-hidden">
              <div className="px-5 py-4 border-b border-apple-gray7 flex items-center gap-2">
                <BarChart2 size={15} className="text-apple-blue" />
                <h2 className="text-apple-gray1 font-semibold text-sm">Extracted Financials</h2>
                <span className="ml-auto text-xs text-apple-gray4 bg-apple-gray8 px-2 py-0.5 rounded-lg">via Textract</span>
              </div>
              <div className="divide-y divide-apple-gray7">
                {[
                  { label: 'Avg Monthly Revenue', value: fmt$(result.extracted.avgMonthlyRevenue), icon: TrendingUp, color: 'text-green-600' },
                  { label: 'Avg Monthly Deposits', value: fmt$(result.extracted.avgMonthlyDeposits), icon: DollarSign, color: 'text-apple-blue' },
                  { label: 'Est. Annual Revenue', value: fmt$(result.extracted.estimatedAnnualRevenue), icon: BarChart2, color: 'text-indigo-500' },
                  { label: 'Negative Days', value: `${result.extracted.negativeDays} days`, icon: AlertCircle, color: result.extracted.negativeDays > 3 ? 'text-red-500' : 'text-green-600' },
                  { label: 'Months Covered', value: `${result.extracted.monthsCovered} months`, icon: FileText, color: 'text-apple-gray3' },
                ].map(f => (
                  <div key={f.label} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2">
                      <f.icon size={14} className={f.color} />
                      <span className="text-apple-gray3 text-sm">{f.label}</span>
                    </div>
                    <span className="text-apple-gray1 text-sm font-semibold">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist */}
            <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 overflow-hidden">
              <div className="px-5 py-4 border-b border-apple-gray7 flex items-center gap-2">
                <FileSearch size={15} className="text-apple-blue" />
                <h2 className="text-apple-gray1 font-semibold text-sm">Underwriting Checklist</h2>
              </div>
              <div className="divide-y divide-apple-gray7">
                {result.checklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    {item.pass
                      ? <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                      : <XCircle size={16} className="text-red-400 shrink-0" />
                    }
                    <span className={`text-sm ${item.pass ? 'text-apple-gray2' : 'text-apple-gray4'}`}>{item.label}</span>
                    {!item.pass && <span className="ml-auto text-xs text-red-400 font-medium">Required</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Document status */}
          <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 overflow-hidden">
            <div className="px-5 py-4 border-b border-apple-gray7">
              <h2 className="text-apple-gray1 font-semibold text-sm">Document Coverage</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-apple-gray7">
              {DOC_CATEGORIES.slice(0, 4).map(cat => {
                const catDocs = docs.filter(d => d.category === cat.id);
                return (
                  <div key={cat.id} className="px-5 py-4 text-center">
                    <p className="text-xl mb-1">{cat.icon}</p>
                    <p className="text-apple-gray1 font-bold text-lg">{catDocs.length}</p>
                    <p className="text-apple-gray4 text-xs">{cat.label}</p>
                    {catDocs.length === 0 && <p className="text-red-400 text-xs mt-0.5">Missing</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
