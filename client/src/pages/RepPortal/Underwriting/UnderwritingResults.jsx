import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import SearchableTable from '../../../components/SearchableTable';
import { BarChart2, TrendingUp, DollarSign, AlertTriangle, Building2, Calendar, CreditCard, Filter } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
        <h3 className="text-gray-900 font-semibold text-sm flex items-center gap-2">
          {Icon && <Icon size={15} className="text-blue-600" />} {title}
        </h3>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-5 pb-5 pt-2">{children}</div>}
    </div>
  );
}

// ─── Stat box ─────────────────────────────────────────────────────────────────
function Stat({ label, value, sub }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="text-gray-900 font-bold text-lg">{value}</p>
      {sub && <p className="text-gray-400 text-xs">{sub}</p>}
    </div>
  );
}

const fmt$ = n => n != null ? `$${Number(n).toLocaleString()}` : '—';
const fmtPct = n => n != null ? `${n}%` : '—';

// ─── Main component ───────────────────────────────────────────────────────────
export default function UnderwritingResults({ clientId, financials, docs }) {
  const { token, user } = useAuth();
  const [corrections, setCorrections] = useState({});
  const [txnFilter, setTxnFilter] = useState('all'); // all, true, non-true
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // Load corrections for this client
  useEffect(() => {
    if (!clientId) return;
    fetch(`${API}/corrections/${clientId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(corrs => {
        const map = {};
        corrs.forEach(c => { map[`${c.transactionId || c.docId}_${c.field}`] = c.correctedValue; });
        setCorrections(map);
      })
      .catch(() => {});
  }, [clientId, token]);

  const saveCorrection = useCallback(async (rowId, field, oldValue, newValue, section) => {
    try {
      const res = await fetch(`${API}/corrections`, {
        method: 'POST', headers,
        body: JSON.stringify({
          clientId, transactionId: rowId, field,
          originalValue: oldValue, correctedValue: newValue, section,
        }),
      });
      if (res.ok) {
        setCorrections(prev => ({ ...prev, [`${rowId}_${field}`]: newValue }));
      }
    } catch {}
  }, [clientId, token]);

  if (!financials) return null;

  const f = financials;

  // ─── A. Revenue Statistics ────────────────────────────────────────────────
  const revenueStats = (
    <Section title="Revenue Statistics" icon={TrendingUp} defaultOpen>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Avg Monthly Revenue" value={fmt$(f.avgMonthlyRevenue)} />
        <Stat label="Est. Annual Revenue" value={fmt$(f.estimatedAnnualRevenue)} />
        <Stat label="Total Credits" value={fmt$(f.totalCredits)} />
        <Stat label="Number of Deposits" value={f.numberOfDeposits || '—'} />
        <Stat label="Negative Days" value={f.negativeDays ?? '—'} />
        <Stat label="Months Covered" value={f.monthsCovered ?? '—'} />
        <Stat label="Payment Frequency" value={f.paymentFrequency || '—'} />
        <Stat label="MCA Withhold %" value={fmtPct(f.withholdingRate)} />
        <Stat label="Total Lender Payments" value={fmt$(f.totalLenderPayments)} />
        <Stat label="Positions Detected" value={f.positionCount ?? 0} />
        <Stat label="Confidence" value={f.confidence || '—'} />
        <Stat label="OCR Engine" value={f.ocrEngine || 'textract'} />
      </div>
    </Section>
  );

  // ─── B. Charts ────────────────────────────────────────────────────────────
  // Simple bar chart using CSS — no chart library dependency
  const monthlyData = f.monthlyBreakdown || [];
  const charts = monthlyData.length > 0 ? (
    <Section title="Balance & Revenue Trends" icon={BarChart2}>
      <div className="flex items-end gap-2 h-32 mb-2">
        {monthlyData.map((m, i) => {
          const max = Math.max(...monthlyData.map(x => x.credits || 0));
          const h = max > 0 ? ((m.credits || 0) / max * 100) : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${m.month}: ${fmt$(m.credits)}`}>
              <div className="w-full bg-blue-500 rounded-t transition-all" style={{ height: `${Math.max(h, 4)}%` }} />
              <span className="text-gray-400 text-xs truncate w-full text-center">{m.month}</span>
            </div>
          );
        })}
      </div>
    </Section>
  ) : null;

  // ─── C. Statements Summary ────────────────────────────────────────────────
  const stmtDocs = docs?.filter(d => d.category === 'bank_statements' && d.extractedFinancials?.success) || [];
  const stmtData = stmtDocs.map((d, i) => ({
    id: d.id,
    account: d.bankAccount || 'Account 1',
    fileName: d.fileName,
    totalCredits: d.extractedFinancials?.totalCredits || 0,
    numberOfDeposits: d.extractedFinancials?.numberOfDeposits || 0,
    negativeDays: d.extractedFinancials?.negativeDays || 0,
    monthsCovered: d.extractedFinancials?.monthsCovered || 0,
    avgMonthlyRevenue: d.extractedFinancials?.avgMonthlyRevenue || 0,
    method: d.extractedFinancials?.method || '—',
    confidence: d.extractedFinancials?.confidence || '—',
    positionCount: d.extractedFinancials?.positionCount || 0,
    totalLenderPayments: d.extractedFinancials?.totalLenderPayments || 0,
    withholdingRate: d.extractedFinancials?.withholdingRate || 0,
  }));

  const stmtColumns = [
    { key: 'account', label: 'Account' },
    { key: 'fileName', label: 'File' },
    { key: 'totalCredits', label: 'Total Credits', type: 'number' },
    { key: 'numberOfDeposits', label: '# Deposits', type: 'number' },
    { key: 'avgMonthlyRevenue', label: 'Avg Revenue', type: 'number' },
    { key: 'negativeDays', label: 'Days Neg', type: 'number' },
    { key: 'monthsCovered', label: 'Months', type: 'number' },
    { key: 'positionCount', label: 'Positions', type: 'number' },
    { key: 'totalLenderPayments', label: 'Lender Payments', type: 'number' },
    { key: 'withholdingRate', label: 'Withhold %', type: 'number' },
    { key: 'confidence', label: 'Confidence' },
    { key: 'method', label: 'Method' },
  ];

  // ─── E. MCA Companies (Positions) ─────────────────────────────────────────
  const positions = f.positions || [];
  const mcaData = positions.map((p, i) => ({
    id: `mca_${i}`,
    lender: p.name,
    totalPaid: p.totalPaid || 0,
    occurrences: p.occurrences || 0,
    withholdPct: f.avgMonthlyRevenue && p.totalPaid > 0
      ? parseFloat((p.totalPaid / f.avgMonthlyRevenue * 100).toFixed(1)) : 0,
  }));

  const mcaColumns = [
    { key: 'lender', label: 'Lender', editable: true },
    { key: 'totalPaid', label: 'Total Paid', type: 'number' },
    { key: 'occurrences', label: 'Occurrences', type: 'number' },
    { key: 'withholdPct', label: 'Withhold %', type: 'number' },
  ];

  // ─── H. Transaction filter (True / Non-True) ─────────────────────────────
  const txnFilterBar = (
    <div className="flex items-center gap-2 mb-3">
      <Filter size={13} className="text-gray-400" />
      <span className="text-gray-500 text-xs">View:</span>
      {['all', 'true', 'non-true'].map(f => (
        <button key={f} onClick={() => setTxnFilter(f)}
          className={`text-xs px-3 py-1 rounded-lg border transition-colors ${txnFilter === f ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
          {f === 'all' ? 'All' : f === 'true' ? 'True' : 'Non-True'}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 mt-4">
      {/* A. Revenue Statistics */}
      {revenueStats}

      {/* B. Charts */}
      {charts}

      {/* C. Statements Summary */}
      {stmtData.length > 0 && (
        <SearchableTable
          title="Statements Summary"
          columns={stmtColumns}
          data={stmtData}
          corrections={corrections}
          onEdit={(rowId, field, old, val) => saveCorrection(rowId, field, old, val, 'statements_summary')}
        />
      )}

      {/* E. MCA Companies */}
      {mcaData.length > 0 && (
        <SearchableTable
          title="MCA Companies / Lender Positions"
          columns={mcaColumns}
          data={mcaData}
          corrections={corrections}
          onEdit={(rowId, field, old, val) => saveCorrection(rowId, field, old, val, 'mca_companies')}
        />
      )}

      {/* H. Transaction Classification Filter */}
      <Section title="Transaction Classification" icon={CreditCard}>
        {txnFilterBar}
        <p className="text-gray-400 text-xs">
          Transaction-level data will populate here when OCR extraction is re-enabled with line-level output.
          The correction workflow is ready — edits made here will be stored as training signals for future OCR improvement.
        </p>
      </Section>

      {/* Correction log */}
      {Object.keys(corrections).length > 0 && (
        <Section title={`Corrections Applied (${Object.keys(corrections).length})`} icon={AlertTriangle}>
          <div className="space-y-1">
            {Object.entries(corrections).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2">
                <span className="text-amber-700 text-xs font-mono">{key}</span>
                <span className="text-amber-900 text-xs font-semibold">{String(val)}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-400 text-xs mt-3">
            {/* Future OCR training: corrections are stored with original→corrected pairs, grouped by section/field.
                Export via GET /api/corrections/export/training to generate labeled training data. */}
            These corrections are preserved for audit and future OCR model training.
          </p>
        </Section>
      )}
    </div>
  );
}
