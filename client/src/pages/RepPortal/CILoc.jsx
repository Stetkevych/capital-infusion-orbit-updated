import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import PaymentModal from '../../components/PaymentModal';
import { PaymentStatusBadge, DocumentLinkCard, fmt$, fmtPct } from '../../components/LocComponents';
import {
  CreditCard, FileText, DollarSign, TrendingUp, Clock, Shield,
  Building2, ChevronDown, RefreshCw, ArrowUpRight, Wallet, Banknote,
  CheckCircle2
} from 'lucide-react';

const LOC = {
  principalBalance: 306007.27, currentBalance: 306007.27, availableCredit: 557.73,
  usagePercent: 99.8, loanNumber: '****6791', loanType: 'Home Equity Line of Credit',
  interestRate: 8.5, term: '30 Year', duration: 'Jul 2022 - Aug 2052',
  startDate: 'Jul 27, 2022', drawPeriodEnds: 'Jul 26, 2032', maturityDate: 'Aug 27, 2052',
  originalLineAmount: 306565.00, remainingLine: 557.73,
  monthlyPayment: 2066.60, dueDate: 'May 01, 2026', nextDraftDate: 'May 01, 2026',
  paymentMethod: 'Checking ****4666', autopay: true, paymentStatus: 'Current',
  interestPaidYTD: 8668.82, principalPaidYTD: 0.00,
};

const DRAWS = [
  { id: 'pay-001', ref: 'ORBIT-M1-A3F', amount: 2066.60, status: 'accepted', auth: 'A77291', reason: null, date: '2026-04-01T10:00:00Z', acct: '****4666' },
  { id: 'pay-002', ref: 'ORBIT-M2-B7E', amount: 2066.60, status: 'accepted', auth: 'A77445', reason: null, date: '2026-03-01T10:00:00Z', acct: '****4666' },
  { id: 'pay-003', ref: 'ORBIT-M3-C2D', amount: 2066.60, status: 'declined', auth: null, reason: 'Insufficient funds', date: '2026-02-15T10:00:00Z', acct: '****4666' },
  { id: 'pay-004', ref: 'ORBIT-M4-D9A', amount: 2066.60, status: 'accepted', auth: 'A77600', reason: null, date: '2026-02-01T10:00:00Z', acct: '****4666' },
  { id: 'pay-005', ref: 'ORBIT-M5-E1F', amount: 2066.60, status: 'pending', auth: null, reason: null, date: '2026-04-28T14:30:00Z', acct: '****4666' },
  { id: 'pay-006', ref: 'ORBIT-M6-F4B', amount: 2066.60, status: 'returned', auth: null, reason: 'Account closed', date: '2026-01-15T10:00:00Z', acct: '****4666' },
];

const DOCS = [
  { name: 'March 2026 Statement', date: 'Apr 01, 2026', type: 'statement' },
  { name: 'February 2026 Statement', date: 'Mar 01, 2026', type: 'statement' },
  { name: '1098 Mortgage Interest', date: 'Jan 31, 2026', type: 'tax' },
  { name: 'Loan Agreement', date: 'Jul 27, 2022', type: 'agreement' },
];

const fd = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function Stat({ label, value, sub, accent }) {
  return (
    <div>
      <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-3xl font-bold tracking-tight ${accent || 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-slate-400 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

function Row({ label, value, hl }) {
  return (
    <div className="flex justify-between px-5 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`text-sm font-semibold ${hl ? 'text-blue-600' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

export default function CILocDetails() {
  const { token } = useAuth();
  const [tab, setTab] = useState('overview');
  const [showDraw, setShowDraw] = useState(false);
  const [draws, setDraws] = useState(DRAWS);
  const [filter, setFilter] = useState('');
  const filtered = filter ? draws.filter(d => d.status === filter) : draws;

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {showDraw && <PaymentModal locId="loc-cap-001" token={token} onClose={() => setShowDraw(false)} onSuccess={(txn) => { setDraws(prev => [txn, ...prev]); setShowDraw(false); }} />}

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <CreditCard size={18} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Line of Credit</h1>
              <p className="text-slate-400 text-xs">{LOC.loanType} &middot; {LOC.loanNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {LOC.autopay && <span className="text-xs font-medium px-3 py-1 rounded-full bg-green-50 text-green-600 border border-green-200">Autopay</span>}
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200">{LOC.paymentStatus}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          <Stat label="Available Credit" value={fmt$(LOC.availableCredit)} sub={`of ${fmt$(LOC.originalLineAmount)}`} accent="text-green-600" />
          <Stat label="Current Balance" value={fmt$(LOC.currentBalance)} sub={`${fmtPct(LOC.usagePercent)} utilized`} />
          <Stat label="Next Payment" value={fmt$(LOC.monthlyPayment)} sub={`due ${LOC.dueDate}`} />
        </div>

        <div className="mt-5">
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000" style={{ width: `${Math.min(LOC.usagePercent, 100)}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-slate-300 text-xs">0%</span>
            <span className="text-blue-600 text-xs font-semibold">{fmtPct(LOC.usagePercent)} used</span>
            <span className="text-slate-300 text-xs">100%</span>
          </div>
        </div>
      </div>

      {/* ── DRAW + CUTOFF ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <button onClick={() => setShowDraw(true)} className="lg:col-span-2 group bg-blue-600 hover:bg-blue-700 rounded-2xl p-6 text-left transition-all hover:shadow-lg hover:shadow-blue-500/15 hover:scale-[1.005]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-xs uppercase tracking-widest mb-1">Draw Funds</p>
              <p className="text-white text-2xl font-bold">Request a Draw</p>
              <p className="text-blue-200 text-sm mt-1">Available: <span className="text-white font-semibold">{fmt$(LOC.availableCredit)}</span></p>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <ArrowUpRight size={22} className="text-white" />
            </div>
          </div>
        </button>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-amber-500" />
            <p className="text-gray-900 text-sm font-semibold">Daily Cutoff</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">3:30 <span className="text-base text-gray-400 font-medium">PM ET</span></p>
          <p className="text-gray-400 text-xs mt-2">Draws require approval before ACH processing.</p>
        </div>
      </div>

      {/* ── 4-COL DETAILS ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Interest Rate</p>
          <p className="text-gray-900 text-lg font-bold">{LOC.interestRate}%</p>
          <p className="text-gray-300 text-xs">{LOC.term}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Interest Paid YTD</p>
          <p className="text-blue-600 text-lg font-bold">{fmt$(LOC.interestPaidYTD)}</p>
          <p className="text-gray-300 text-xs">100% interest</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Payment Method</p>
          <p className="text-gray-900 text-lg font-bold">{LOC.paymentMethod}</p>
          <p className="text-green-500 text-xs flex items-center gap-1"><CheckCircle2 size={10} /> Autopay on</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-1">Draw Period</p>
          <p className="text-gray-900 text-lg font-bold">Active</p>
          <p className="text-gray-300 text-xs">Ends {LOC.drawPeriodEnds}</p>
        </div>
      </div>

      {/* ── TABS ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-gray-100">
        {[{ id: 'overview', label: 'Overview' }, { id: 'activity', label: 'Draw History' }, { id: 'documents', label: 'Documents' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ───────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Line Details */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
              <Building2 size={14} className="text-blue-600" />
              <h2 className="text-gray-900 font-semibold text-sm">Line Details</h2>
            </div>
            <Row label="Type" value={LOC.loanType} />
            <Row label="Account" value={LOC.loanNumber} />
            <Row label="Principal" value={fmt$(LOC.principalBalance)} hl />
            <Row label="Available" value={fmt$(LOC.availableCredit)} />
            <Row label="Rate" value={`${LOC.interestRate}%`} hl />
            <Row label="Term" value={LOC.term} />
            <Row label="Original Line" value={fmt$(LOC.originalLineAmount)} />
          </div>

          {/* Timeline + Payment */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
                <Clock size={14} className="text-blue-600" />
                <h2 className="text-gray-900 font-semibold text-sm">Timeline</h2>
              </div>
              <Row label="Started" value={LOC.startDate} />
              <Row label="Draw Ends" value={LOC.drawPeriodEnds} />
              <Row label="Maturity" value={LOC.maturityDate} />
              <Row label="Duration" value={LOC.duration} />
              <div className="px-5 py-3">
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-blue-500" style={{ width: '11%' }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-gray-300 text-xs">2022</span>
                  <span className="text-blue-500 text-xs font-medium">Now</span>
                  <span className="text-gray-300 text-xs">2052</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2"><DollarSign size={14} className="text-blue-600" /><h2 className="text-gray-900 font-semibold text-sm">Payment</h2></div>
                <button onClick={() => setShowDraw(true)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg font-medium transition-colors">Pay</button>
              </div>
              <Row label="Monthly" value={fmt$(LOC.monthlyPayment)} hl />
              <Row label="Due" value={LOC.dueDate} />
              <Row label="Method" value={LOC.paymentMethod} />
              <Row label="Autopay" value="On" />
            </div>
          </div>

          {/* YTD */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="text-blue-600" />
                <h2 className="text-gray-900 font-semibold text-sm">YTD Breakdown</h2>
              </div>
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                  <p className="text-blue-700 text-2xl font-bold">{fmt$(LOC.interestPaidYTD)}</p>
                  <p className="text-blue-500 text-xs mt-1">Interest Paid</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                  <p className="text-gray-900 text-2xl font-bold">{fmt$(LOC.principalPaidYTD)}</p>
                  <p className="text-gray-400 text-xs mt-1">Principal Paid</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
                <FileText size={14} className="text-blue-600" />
                <h2 className="text-gray-900 font-semibold text-sm">Recent Docs</h2>
              </div>
              {DOCS.slice(0, 3).map((d, i) => <DocumentLinkCard key={i} name={d.name} date={d.date} type={d.type} />)}
            </div>
          </div>
        </div>
      )}

      {/* ── DRAW HISTORY ───────────────────────────────────────────────── */}
      {tab === 'activity' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-gray-900 font-semibold text-sm">Draw History</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select value={filter} onChange={e => setFilter(e.target.value)} className="appearance-none bg-white border border-gray-200 text-gray-700 text-xs rounded-lg pl-3 pr-7 py-2 focus:outline-none hover:border-gray-300 transition-colors">
                  <option value="">All</option>
                  <option value="accepted">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="pending_approval">Awaiting Approval</option>
                  <option value="declined">Declined</option>
                  <option value="returned">Returned</option>
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <button className="text-xs text-gray-500 bg-white border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"><RefreshCw size={11} /></button>
              <button onClick={() => setShowDraw(true)} className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"><DollarSign size={12} /> New Draw</button>
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80">
                    {['Date', 'Reference', 'Amount', 'Status', 'Details', ''].map(h => (
                      <th key={h} className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.id} className="border-t border-gray-50 hover:bg-blue-50/20 transition-colors">
                      <td className="py-3.5 px-5 text-gray-700 text-xs">{fd(d.date)}</td>
                      <td className="py-3.5 px-5 text-gray-500 text-xs font-mono">{d.ref}</td>
                      <td className="py-3.5 px-5 text-gray-900 text-sm font-bold">{fmt$(d.amount)}</td>
                      <td className="py-3.5 px-5"><PaymentStatusBadge status={d.status} /></td>
                      <td className="py-3.5 px-5 text-xs">{d.auth ? <span className="text-green-600 font-mono">{d.auth}</span> : d.reason ? <span className="text-red-500">{d.reason}</span> : <span className="text-gray-300">-</span>}</td>
                      <td className="py-3.5 px-5"><button className="text-blue-600 text-xs font-medium hover:underline">View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && <div className="text-center py-16 text-gray-300 text-sm">No draws found.</div>}
          </div>
        </div>
      )}

      {/* ── DOCUMENTS ──────────────────────────────────────────────────── */}
      {tab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2"><FileText size={15} className="text-blue-600" /><h2 className="text-gray-900 font-semibold text-sm">Statements</h2></div>
            {DOCS.filter(d => d.type === 'statement').map((d, i) => <DocumentLinkCard key={i} name={d.name} date={d.date} type={d.type} />)}
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2"><Shield size={15} className="text-blue-600" /><h2 className="text-gray-900 font-semibold text-sm">Loan & Tax Documents</h2></div>
            {DOCS.filter(d => d.type !== 'statement').map((d, i) => <DocumentLinkCard key={i} name={d.name} date={d.date} type={d.type} />)}
          </div>
        </div>
      )}
    </div>
  );
}
