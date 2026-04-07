import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import PaymentModal from '../../components/PaymentModal';
import { PaymentStatusBadge, DocumentLinkCard, fmt$, fmtPct } from '../../components/LocComponents';
import {
  CreditCard, FileText, DollarSign, TrendingUp, Clock, ArrowRight,
  Shield, Building2, ChevronDown, RefreshCw, Download, ExternalLink
} from 'lucide-react';

// ── Data (same structure, no changes) ─────────────────────────────────────────
const MOCK_LOC = {
  loanSummary: { principalBalance: 306007.27, currentBalance: 306007.27, availableCredit: 557.73, usagePercent: 99.8, loanNumber: '****6791', loanType: 'Home Equity Line of Credit', interestRate: 8.5, term: '30 Year', duration: 'Jul 2022 - Aug 2052', startDate: 'Jul 27, 2022', drawPeriodEnds: 'Jul 26, 2032', maturityDate: 'Aug 27, 2052', originalLineAmount: 306565.00, remainingLine: 557.73 },
  paymentDetails: { monthlyPayment: 2066.60, totalPayment: 2066.60, dueDate: 'May 01, 2026', nextDraftDate: 'May 01, 2026', paymentMethod: 'Checking Account (****4666)', paymentStatus: 'Current', autopay: true },
  interestBreakdown: { interestPaidYTD: 8668.82, principalPaidYTD: 0.00, interestPercent: 100, principalPercent: 0, year: 2026 },
  usageOverview: { balance: 306007.27, available: 557.73, usagePercent: 99.8, originalLine: 306565.00 },
  documents: [
    { name: 'March 2026 Statement', date: 'Apr 01, 2026', type: 'statement' },
    { name: 'February 2026 Statement', date: 'Mar 01, 2026', type: 'statement' },
    { name: 'Mortgage Interest Statement (1098)', date: 'Jan 31, 2026', type: 'tax' },
    { name: 'Loan Agreement', date: 'Jul 27, 2022', type: 'agreement' },
  ],
};

const MOCK_PAYMENTS = [
  { id: 'pay-001', merOrderNumber: 'ORBIT-LOC-M1-A3F', actumOrderId: '90281734', requestType: 'debit', amount: 2066.60, status: 'accepted', authCode: 'A77291', declineReason: null, createdAt: '2026-04-01T10:00:00Z', maskedAccount: '****4666' },
  { id: 'pay-002', merOrderNumber: 'ORBIT-LOC-M2-B7E', actumOrderId: '90281899', requestType: 'debit', amount: 2066.60, status: 'accepted', authCode: 'A77445', declineReason: null, createdAt: '2026-03-01T10:00:00Z', maskedAccount: '****4666' },
  { id: 'pay-003', merOrderNumber: 'ORBIT-LOC-M3-C2D', actumOrderId: '90282010', requestType: 'debit', amount: 2066.60, status: 'declined', authCode: null, declineReason: 'Insufficient funds', createdAt: '2026-02-15T10:00:00Z', maskedAccount: '****4666' },
  { id: 'pay-004', merOrderNumber: 'ORBIT-LOC-M4-D9A', actumOrderId: '90282100', requestType: 'debit', amount: 2066.60, status: 'accepted', authCode: 'A77600', declineReason: null, createdAt: '2026-02-01T10:00:00Z', maskedAccount: '****4666' },
  { id: 'pay-005', merOrderNumber: 'ORBIT-LOC-M5-E1F', actumOrderId: null, requestType: 'debit', amount: 2066.60, status: 'pending', authCode: null, declineReason: null, createdAt: '2026-04-28T14:30:00Z', maskedAccount: '****4666' },
  { id: 'pay-006', merOrderNumber: 'ORBIT-LOC-M6-F4B', actumOrderId: '90282200', requestType: 'debit', amount: 2066.60, status: 'returned', authCode: null, declineReason: 'Account closed', createdAt: '2026-01-15T10:00:00Z', maskedAccount: '****4666' },
];

const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CILocDetails() {
  const { token } = useAuth();
  const { loanSummary: loan, paymentDetails: pay, interestBreakdown: interest, usageOverview: usage, documents: docs } = MOCK_LOC;
  const [tab, setTab] = useState('line');
  const [showDraw, setShowDraw] = useState(false);
  const [payments, setPayments] = useState(MOCK_PAYMENTS);
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = statusFilter ? payments.filter(p => p.status === statusFilter) : payments;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {showDraw && (
        <PaymentModal locId="loc-cap-001" token={token} onClose={() => setShowDraw(false)} onSuccess={(txn) => { setPayments(prev => [txn, ...prev]); setShowDraw(false); }} />
      )}

      {/* ── Header Summary Bar ─────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <CreditCard size={20} className="text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Line of Credit</h1>
          <span className="text-gray-300 text-sm ml-1">{loan.loanNumber}</span>
          <div className="ml-auto flex items-center gap-2">
            {pay.autopay && <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-green-50 text-green-700 border-green-200">Autopay On</span>}
            <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-green-50 text-green-700 border-green-200">{pay.paymentStatus}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Available Credit</p>
            <p className="text-3xl font-bold text-green-700 tracking-tight">{fmt$(loan.availableCredit)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Total Balance</p>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{fmt$(loan.currentBalance)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Credit Limit</p>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{fmt$(loan.originalLineAmount)}</p>
          </div>
        </div>
      </div>

      {/* ── Utilization + Draw Funds ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Utilization */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wide font-medium mb-3">Utilization</p>
          <div className="flex items-end gap-3 mb-3">
            <p className="text-4xl font-bold text-gray-900">{fmtPct(usage.usagePercent)}</p>
            <p className="text-gray-400 text-sm mb-1">utilized</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4">
            <div className="h-2.5 rounded-full bg-blue-600 transition-all duration-700" style={{ width: `${Math.min(usage.usagePercent, 100)}%` }} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Current Balance</span><span className="text-gray-900 font-semibold">{fmt$(usage.balance)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Next Payment</span><span className="text-gray-900 font-semibold">{fmt$(pay.monthlyPayment)} <span className="text-gray-400 font-normal">due {pay.dueDate}</span></span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Interest Rate</span><span className="text-gray-900 font-semibold">{loan.interestRate}%</span></div>
          </div>
        </div>

        {/* Draw Funds — Primary Action */}
        <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wide font-medium mb-3">Draw Funds</p>
          <p className="text-gray-400 text-sm mb-4">Available: <span className="text-green-700 font-bold">{fmt$(loan.availableCredit)}</span></p>
          <button
            onClick={() => setShowDraw(true)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-3.5 rounded-xl transition-colors shadow-sm"
          >
            <DollarSign size={16} /> Draw Funds
          </button>
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mt-4">
            <Clock size={13} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-blue-700 text-xs">Requests must be submitted before <strong>3:30 PM ET</strong>. All draws require approval before ACH processing.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            <div className="bg-gray-50 rounded-xl py-3"><p className="text-gray-400 text-xs">Term</p><p className="text-gray-900 text-sm font-semibold">{loan.term}</p></div>
            <div className="bg-gray-50 rounded-xl py-3"><p className="text-gray-400 text-xs">Draw Period</p><p className="text-gray-900 text-sm font-semibold">Ends {loan.drawPeriodEnds.split(',')[0]}</p></div>
            <div className="bg-gray-50 rounded-xl py-3"><p className="text-gray-400 text-xs">Payment</p><p className="text-gray-900 text-sm font-semibold">{fmt$(pay.monthlyPayment)}</p></div>
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-gray-100">
        {[{ id: 'line', label: 'Line of Credit' }, { id: 'activity', label: 'Activity' }, { id: 'documents', label: 'Documents' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── LINE OF CREDIT TAB ─────────────────────────────────────────── */}
      {tab === 'line' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Loan Details */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
              <Building2 size={15} className="text-blue-600" />
              <h2 className="text-gray-900 font-semibold text-sm">Loan Details</h2>
            </div>
            {[
              ['Loan Type', loan.loanType],
              ['Principal Balance', fmt$(loan.principalBalance), true],
              ['Available Credit', fmt$(loan.availableCredit)],
              ['Interest Rate', `${loan.interestRate}%`, true],
              ['Term', loan.term],
              ['Duration', loan.duration],
              ['Loan Start', loan.startDate],
              ['Draw Period Ends', loan.drawPeriodEnds],
              ['Maturity', loan.maturityDate],
            ].map(([l, v, hl]) => (
              <div key={l} className="flex justify-between px-5 py-3 border-b border-gray-50 last:border-0">
                <span className="text-gray-500 text-sm">{l}</span>
                <span className={`text-sm font-semibold ${hl ? 'text-blue-700' : 'text-gray-900'}`}>{v}</span>
              </div>
            ))}
          </div>

          {/* Interest + Payment */}
          <div className="space-y-5">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={15} className="text-blue-600" />
                <h2 className="text-gray-900 font-semibold text-sm">Interest Breakdown</h2>
                <span className="ml-auto text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">YTD {interest.year}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-blue-700 text-xl font-bold">{fmt$(interest.interestPaidYTD)}</p>
                  <p className="text-blue-500 text-xs mt-1">Interest Paid</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-gray-900 text-xl font-bold">{fmt$(interest.principalPaidYTD)}</p>
                  <p className="text-gray-400 text-xs mt-1">Principal Paid</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2"><Clock size={15} className="text-blue-600" /><h2 className="text-gray-900 font-semibold text-sm">Payment Details</h2></div>
                <button onClick={() => setShowDraw(true)} className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"><DollarSign size={12} /> Pay</button>
              </div>
              {[
                ['Monthly Payment', fmt$(pay.monthlyPayment), true],
                ['Due Date', pay.dueDate],
                ['Payment Method', pay.paymentMethod],
                ['Autopay', pay.autopay ? 'On' : 'Off'],
              ].map(([l, v, hl]) => (
                <div key={l} className="flex justify-between px-5 py-3 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500 text-sm">{l}</span>
                  <span className={`text-sm font-semibold ${hl ? 'text-blue-700' : 'text-gray-900'}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ACTIVITY TAB ───────────────────────────────────────────────── */}
      {tab === 'activity' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-gray-900 font-semibold text-sm">Draw History</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg pl-3 pr-7 py-2 focus:outline-none">
                  <option value="">All Status</option>
                  <option value="accepted">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="declined">Declined</option>
                  <option value="returned">Returned</option>
                  <option value="denied">Denied</option>
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <button className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"><RefreshCw size={12} /> Refresh</button>
              <button onClick={() => setShowDraw(true)} className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-colors"><DollarSign size={12} /> Draw Funds</button>
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    {['Date', 'Draw ID', 'Status', 'Amount', 'Remaining Balance', 'Auth / Reason', ''].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-gray-700 text-xs whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs font-mono">{p.merOrderNumber}</td>
                      <td className="py-3 px-4"><PaymentStatusBadge status={p.status} /></td>
                      <td className="py-3 px-4 text-gray-900 text-xs font-semibold">{fmt$(p.amount)}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{p.status === 'accepted' ? fmt$(loan.currentBalance) : '-'}</td>
                      <td className="py-3 px-4 text-xs">{p.authCode ? <span className="text-green-600 font-mono">{p.authCode}</span> : p.declineReason ? <span className="text-red-500">{p.declineReason}</span> : <span className="text-gray-300">-</span>}</td>
                      <td className="py-3 px-4"><button className="text-blue-600 text-xs font-medium hover:opacity-70">Details</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No draws found.</div>}
          </div>
        </div>
      )}

      {/* ── DOCUMENTS TAB ──────────────────────────────────────────────── */}
      {tab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2"><FileText size={15} className="text-blue-600" /><h2 className="text-gray-900 font-semibold text-sm">Statements</h2></div>
            {docs.filter(d => d.type === 'statement').map((d, i) => <DocumentLinkCard key={i} name={d.name} date={d.date} type={d.type} />)}
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2"><Shield size={15} className="text-blue-600" /><h2 className="text-gray-900 font-semibold text-sm">Loan & Tax Documents</h2></div>
            {docs.filter(d => d.type !== 'statement').map((d, i) => <DocumentLinkCard key={i} name={d.name} date={d.date} type={d.type} />)}
          </div>
        </div>
      )}
    </div>
  );
}
