import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import SearchableTable from '../../../components/SearchableTable';
import { Database, Filter, Download, AlertTriangle } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

// ─── Classification helpers ───────────────────────────────────────────────────
const CREDIT_KEYWORDS = /\b(deposit|credit|cr\b|incoming|received|transfer\s+in|direct\s+dep|payroll|ach\s+credit|wire\s+in|wire\s+deposit|mobile\s+deposit|atm\s+deposit)\b/i;
const DEBIT_KEYWORDS = /\b(debit|dr\b|withdrawal|withdraw|payment|purchase|pos\b|ach\s+debit|wire\s+out|check\b|fee\b|charge|transfer\s+out)\b/i;
const TRANSFER_KEYWORDS = /\b(transfer|xfer|trf|tfr)\b/i;
const NSF_KEYWORDS = /\b(nsf|non.?sufficient|returned|overdraft|od\b)\b/i;

const LENDER_KEYWORDS = [
  'fund so fast', 'britecap', 'credibly', 'ondeck', 'on deck', 'libertas', 'kapitus',
  'byzfunder', 'fintap', 'fundworks', 'greenbox', 'canacap', 'icapital', 'km capital',
  'expansion capital', 'payroc', 'drip capital', 'jrw capital', 'east harbor',
  'merit equipment', 'slim capital', 'smartbiz', 'loanbud', 'indvance', 'hunter caroline',
  'smarter merchant', 'merchant growth', 'family funding', 'channel partners', 'smart step',
  'jw capital', 'amerifi', 'lendini', 'fundfi', 'throttle', 'velocity', 'dexly',
  'mulligan', 'spartan', 'luminar', 'everest', 'mayfair', 'iruka', 'cobalt', 'sheaves',
  'ontap', 'lexio', 'backd', 'pinnacle', 'specialty', 'rtmi', 'afb', 'afg', 'pirs',
  'gfe', 'nexi', '2m7', 'legend', 'headway', 'newco', 'vader', 'rapid finance',
  'arsenal', 'bitty', 'mca servicing', 'strategic funding', 'cfgms', 'eminent funding',
  'ebf holdings', 'idea',
].sort((a, b) => b.length - a.length);

function detectLender(desc) {
  const lower = (desc || '').toLowerCase();
  for (const kw of LENDER_KEYWORDS) {
    if (lower.includes(kw)) return kw.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  }
  return null;
}

function classifyTransaction(line, amount) {
  const lower = (line || '').toLowerCase();
  const isCredit = CREDIT_KEYWORDS.test(lower);
  const isDebit = DEBIT_KEYWORDS.test(lower);
  const isTransfer = TRANSFER_KEYWORDS.test(lower);
  const isNsf = NSF_KEYWORDS.test(lower);
  const lender = detectLender(line);
  const isMca = !!lender;
  const amt = parseFloat(amount) || 0;

  // True revenue = credit that's not a transfer, not MCA deposit, not internal
  const isTrueRevenue = isCredit && !isTransfer && !isMca && amt > 0;
  const isNonTrueRevenue = isCredit && !isTrueRevenue;
  const isTrueDebit = isDebit && !isTransfer && !isMca;
  const isNonTrueDebit = isDebit && !isTrueDebit;

  let revenueCategory = 'other';
  if (isMca) revenueCategory = 'mca';
  else if (isTransfer) revenueCategory = 'transfer';
  else if (isCredit) revenueCategory = 'deposit';
  else if (isDebit) revenueCategory = 'expense';

  return {
    txnType: isCredit ? 'credit' : isDebit ? 'debit' : 'unknown',
    isTrueRevenue, isNonTrueRevenue, isTrueDebit, isNonTrueDebit,
    revenueCategory, includedInRevenue: isCredit && !isTransfer,
    includedInTrueRevenue: isTrueRevenue,
    mcaDetected: isMca, lenderName: lender || '',
    transferFlag: isTransfer ? (isCredit ? 'incoming' : 'outgoing') : '',
    nsfFlag: isNsf, anomalyFlag: false,
  };
}

// ─── Position grouping ────────────────────────────────────────────────────────
function groupPositions(transactions) {
  const lenderTxns = {};
  transactions.filter(t => t.mcaDetected && t.lenderName).forEach(t => {
    if (!lenderTxns[t.lenderName]) lenderTxns[t.lenderName] = [];
    lenderTxns[t.lenderName].push(t);
  });

  return Object.entries(lenderTxns).map(([lender, txns]) => {
    const debits = txns.filter(t => t.txnType === 'debit');
    const credits = txns.filter(t => t.txnType === 'credit');
    const totalPaid = debits.reduce((s, t) => s + Math.abs(parseFloat(t.amount) || 0), 0);
    const totalReceived = credits.reduce((s, t) => s + Math.abs(parseFloat(t.amount) || 0), 0);
    const dates = debits.map(t => t.date).filter(Boolean).sort();
    const firstDate = dates[0] || '';
    const lastDate = dates[dates.length - 1] || '';

    // Estimate frequency
    let frequency = 'unknown';
    if (dates.length >= 2) {
      const diffs = [];
      for (let i = 1; i < dates.length; i++) {
        const d = (new Date(dates[i]) - new Date(dates[i - 1])) / (1000 * 60 * 60 * 24);
        if (d > 0) diffs.push(d);
      }
      const avgDiff = diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
      if (avgDiff <= 2) frequency = 'daily';
      else if (avgDiff <= 8) frequency = 'weekly';
      else if (avgDiff <= 16) frequency = 'bi-weekly';
      else frequency = 'monthly';
    }

    const avgPayment = debits.length > 0 ? totalPaid / debits.length : 0;

    return {
      id: `pos_${lender.replace(/\s/g, '_')}`,
      lender, withdrawalCount: debits.length, depositCount: credits.length,
      totalPaid: Math.round(totalPaid), totalReceived: Math.round(totalReceived),
      avgPayment: Math.round(avgPayment), frequency,
      firstDate, lastDate,
    };
  });
}

// ─── Quick filter buttons ─────────────────────────────────────────────────────
const QUICK_FILTERS = [
  { key: 'all', label: 'All Transactions' },
  { key: 'true_revenue', label: 'True Revenue', color: 'text-green-700 bg-green-50 border-green-200' },
  { key: 'non_true', label: 'Non-True', color: 'text-gray-600 bg-gray-50 border-gray-200' },
  { key: 'mca', label: 'MCA Payments', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { key: 'transfers', label: 'Transfers', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { key: 'anomalies', label: 'NSF / Anomalies', color: 'text-red-700 bg-red-50 border-red-200' },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function UnderwritingLedger({ clientId, docs }) {
  const { token } = useAuth();
  const [corrections, setCorrections] = useState({});
  const [quickFilter, setQuickFilter] = useState('all');
  const [open, setOpen] = useState(true);
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // Load corrections
  useEffect(() => {
    if (!clientId) return;
    fetch(`${API}/corrections/${clientId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(corrs => {
        const map = {};
        corrs.forEach(c => { map[`${c.transactionId}_${c.field}`] = c.correctedValue; });
        setCorrections(map);
      })
      .catch(() => {});
  }, [clientId, token]);

  // Build unified transaction ledger from extracted data
  const transactions = useMemo(() => {
    const bankDocs = (docs || []).filter(d => d.category === 'bank_statements' && d.extractedFinancials?.success);
    const allTxns = [];
    let txnId = 0;

    for (const doc of bankDocs) {
      const fin = doc.extractedFinancials;
      // If raw lines are available, parse them into transactions
      // Otherwise, create summary-level entries from the extracted data
      const lines = fin.rawLines || fin.lines || [];

      if (lines.length > 0) {
        // Parse individual lines into transactions
        const dateRe = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/;
        const amountRe = /\$?([\d,]+\.\d{2})/;

        for (const line of lines) {
          const dateMatch = line.match(dateRe);
          const amountMatch = line.match(amountRe);
          if (!amountMatch) continue; // skip lines without amounts

          const amount = amountMatch[1].replace(/,/g, '');
          const date = dateMatch ? dateMatch[1] : '';
          const desc = line.replace(dateRe, '').replace(/\$?[\d,]+\.\d{2}/g, '').trim();
          const classification = classifyTransaction(line, amount);

          // Apply corrections overlay
          const id = `txn_${txnId++}`;
          const correctedClassification = { ...classification };
          for (const field of Object.keys(classification)) {
            const corrKey = `${id}_${field}`;
            if (corrections[corrKey] !== undefined) {
              correctedClassification[field] = corrections[corrKey];
            }
          }

          allTxns.push({
            id, date, description: desc || line.slice(0, 80),
            amount: parseFloat(amount) || 0,
            account: doc.bankAccount || 'Account 1',
            docId: doc.id, fileName: doc.fileName,
            ...correctedClassification,
            _original: classification, // preserve original for audit
          });
        }
      }

      // If no line-level data, create entries from summary
      if (allTxns.length === 0 && fin.totalCredits > 0) {
        allTxns.push({
          id: `sum_credits_${doc.id}`, date: '', description: `Total Credits (${doc.fileName})`,
          amount: fin.totalCredits, account: doc.bankAccount || 'Account 1',
          docId: doc.id, fileName: doc.fileName,
          txnType: 'credit', isTrueRevenue: true, isNonTrueRevenue: false,
          isTrueDebit: false, isNonTrueDebit: false,
          revenueCategory: 'deposit', includedInRevenue: true, includedInTrueRevenue: true,
          mcaDetected: false, lenderName: '', transferFlag: '', nsfFlag: false, anomalyFlag: false,
        });
      }

      // Add position entries from detected lenders
      (fin.positions || []).forEach((p, i) => {
        if (p.totalPaid > 0) {
          allTxns.push({
            id: `mca_${doc.id}_${i}`, date: '', description: `MCA Payment: ${p.name}`,
            amount: -p.totalPaid, account: doc.bankAccount || 'Account 1',
            docId: doc.id, fileName: doc.fileName,
            txnType: 'debit', isTrueRevenue: false, isNonTrueRevenue: false,
            isTrueDebit: false, isNonTrueDebit: true,
            revenueCategory: 'mca', includedInRevenue: false, includedInTrueRevenue: false,
            mcaDetected: true, lenderName: p.name, transferFlag: '', nsfFlag: false, anomalyFlag: false,
          });
        }
      });
    }

    return allTxns;
  }, [docs, corrections]);

  // Apply quick filter
  const filtered = useMemo(() => {
    switch (quickFilter) {
      case 'true_revenue': return transactions.filter(t => t.isTrueRevenue);
      case 'non_true': return transactions.filter(t => t.isNonTrueRevenue || t.isNonTrueDebit);
      case 'mca': return transactions.filter(t => t.mcaDetected);
      case 'transfers': return transactions.filter(t => t.transferFlag);
      case 'anomalies': return transactions.filter(t => t.nsfFlag || t.anomalyFlag);
      default: return transactions;
    }
  }, [transactions, quickFilter]);

  // Position grouping
  const positions = useMemo(() => groupPositions(transactions), [transactions]);

  // Save correction
  const saveCorrection = useCallback(async (rowId, field, oldValue, newValue) => {
    try {
      await fetch(`${API}/corrections`, {
        method: 'POST', headers,
        body: JSON.stringify({
          clientId, transactionId: rowId, field,
          originalValue: oldValue, correctedValue: newValue,
          section: 'transaction_ledger',
        }),
      });
      setCorrections(prev => ({ ...prev, [`${rowId}_${field}`]: newValue }));
    } catch {}
  }, [clientId, token]);

  // Summary stats from ledger
  const stats = useMemo(() => {
    const credits = transactions.filter(t => t.txnType === 'credit');
    const debits = transactions.filter(t => t.txnType === 'debit');
    const trueRev = transactions.filter(t => t.isTrueRevenue);
    const mcaTxns = transactions.filter(t => t.mcaDetected);
    return {
      total: transactions.length,
      credits: credits.length,
      debits: debits.length,
      trueRevenue: trueRev.length,
      trueRevenueTotal: Math.round(trueRev.reduce((s, t) => s + (t.amount || 0), 0)),
      mcaCount: mcaTxns.length,
      mcaTotal: Math.round(Math.abs(mcaTxns.filter(t => t.txnType === 'debit').reduce((s, t) => s + (t.amount || 0), 0))),
      positions: positions.length,
    };
  }, [transactions, positions]);

  // Ledger columns
  const ledgerColumns = [
    { key: 'date', label: 'Date', sortable: true },
    { key: 'description', label: 'Description', sortable: true },
    { key: 'amount', label: 'Amount', sortable: true, type: 'number' },
    { key: 'account', label: 'Account', sortable: true },
    { key: 'txnType', label: 'Type', sortable: true, editable: true, type: 'select', options: ['credit', 'debit', 'unknown'] },
    { key: 'isTrueRevenue', label: 'True Rev', sortable: true, editable: true, type: 'select', options: ['true', 'false'] },
    { key: 'revenueCategory', label: 'Category', sortable: true, editable: true, type: 'select', options: ['deposit', 'transfer', 'mca', 'expense', 'other'] },
    { key: 'mcaDetected', label: 'MCA', sortable: true },
    { key: 'lenderName', label: 'Lender', sortable: true, editable: true },
    { key: 'transferFlag', label: 'Transfer', sortable: true, editable: true, type: 'select', options: ['', 'incoming', 'outgoing', 'internal'] },
    { key: 'nsfFlag', label: 'NSF/OD', sortable: true },
  ];

  // Position columns
  const positionColumns = [
    { key: 'lender', label: 'Lender' },
    { key: 'withdrawalCount', label: 'Withdrawals', type: 'number' },
    { key: 'totalPaid', label: 'Total Paid', type: 'number' },
    { key: 'avgPayment', label: 'Avg Payment', type: 'number' },
    { key: 'frequency', label: 'Frequency' },
    { key: 'depositCount', label: 'Deposits', type: 'number' },
    { key: 'totalReceived', label: 'Total Received', type: 'number' },
    { key: 'firstDate', label: 'First Date' },
    { key: 'lastDate', label: 'Last Date' },
  ];

  // Format ledger data for display
  const displayData = filtered.map(t => ({
    ...t,
    amount: t.amount,
    isTrueRevenue: t.isTrueRevenue ? 'true' : 'false',
    mcaDetected: t.mcaDetected ? 'Yes' : '',
    nsfFlag: t.nsfFlag ? 'Yes' : '',
  }));

  if (!docs?.length) return null;

  return (
    <div className="space-y-4 mt-6">
      {/* Header */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <button onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
          <div>
            <h2 className="text-gray-900 font-semibold text-base flex items-center gap-2">
              <Database size={18} className="text-blue-600" /> Transaction Intelligence
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">Unified ledger · Every number is traceable</p>
          </div>
          <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div className="px-5 pb-5">
            {/* Ledger stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-gray-500 text-xs">Total Transactions</p>
                <p className="text-gray-900 font-bold text-lg">{stats.total}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-green-600 text-xs">True Revenue</p>
                <p className="text-green-700 font-bold text-lg">${stats.trueRevenueTotal.toLocaleString()}</p>
                <p className="text-green-500 text-xs">{stats.trueRevenue} transactions</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-amber-600 text-xs">MCA Payments</p>
                <p className="text-amber-700 font-bold text-lg">${stats.mcaTotal.toLocaleString()}</p>
                <p className="text-amber-500 text-xs">{stats.mcaCount} transactions · {stats.positions} positions</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-blue-600 text-xs">Credits / Debits</p>
                <p className="text-blue-700 font-bold text-lg">{stats.credits} / {stats.debits}</p>
              </div>
            </div>

            {/* Quick filters */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Filter size={13} className="text-gray-400" />
              {QUICK_FILTERS.map(f => (
                <button key={f.key} onClick={() => setQuickFilter(f.key)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    quickFilter === f.key
                      ? (f.color || 'bg-blue-50 border-blue-200 text-blue-700')
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}>
                  {f.label}
                  {f.key !== 'all' && (
                    <span className="ml-1 opacity-60">
                      ({f.key === 'true_revenue' ? stats.trueRevenue
                        : f.key === 'mca' ? stats.mcaCount
                        : f.key === 'transfers' ? transactions.filter(t => t.transferFlag).length
                        : f.key === 'anomalies' ? transactions.filter(t => t.nsfFlag).length
                        : f.key === 'non_true' ? transactions.filter(t => t.isNonTrueRevenue || t.isNonTrueDebit).length
                        : ''})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Main ledger table */}
            <SearchableTable
              columns={ledgerColumns}
              data={displayData}
              corrections={corrections}
              onEdit={saveCorrection}
              pageSize={100}
              collapsible={false}
            />
          </div>
        )}
      </div>

      {/* Position Grouping */}
      {positions.length > 0 && (
        <SearchableTable
          title={`MCA Position Analysis (${positions.length} positions)`}
          columns={positionColumns}
          data={positions}
          pageSize={50}
        />
      )}

      {/* Correction audit trail */}
      {Object.keys(corrections).length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <h3 className="text-gray-900 font-semibold text-sm flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-500" />
            Manual Overrides ({Object.keys(corrections).length})
          </h3>
          <p className="text-gray-400 text-xs mb-2">
            {/* Future OCR training: each correction = labeled training pair.
                Export via GET /api/corrections/export/training.
                Group by field to train specific classifiers:
                - isTrueRevenue corrections → revenue classifier
                - lenderName corrections → lender detection model
                - transferFlag corrections → transfer classifier
                - revenueCategory corrections → category model */}
            Corrections are stored for audit and future OCR model improvement.
          </p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {Object.entries(corrections).slice(0, 20).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-1.5">
                <span className="text-amber-700 text-xs font-mono truncate">{key}</span>
                <span className="text-amber-900 text-xs font-semibold">{String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
