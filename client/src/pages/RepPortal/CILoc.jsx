import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import PaymentModal from '../../components/PaymentModal';
import { PaymentStatusBadge, DocumentLinkCard, fmt$, fmtPct } from '../../components/LocComponents';
import {
  CreditCard, DollarSign, TrendingUp, Clock, Shield, FileText,
  ChevronDown, ChevronRight, RefreshCw, ArrowUpRight, Building2, Download
} from 'lucide-react';

const LOC = {
  currentBalance: 306007.27, availableCredit: 557.73, creditLimit: 306565.00,
  usagePercent: 99.8, loanNumber: '****6791', loanType: 'Home Equity Line of Credit',
  interestRate: 8.5, term: '30 Year', startDate: 'Jul 27, 2022',
  drawPeriodEnds: 'Jul 26, 2032', maturityDate: 'Aug 27, 2052',
  monthlyPayment: 2066.60, dueDate: 'May 01, 2026',
  paymentMethod: 'Checking ****4666', autopay: true,
  interestPaidYTD: 8668.82, principalPaidYTD: 0.00,
};

const DRAWS = [
  { id: '1', ref: 'ORBIT-M1-A3F', amount: 2066.60, status: 'accepted', auth: 'A77291', reason: null, date: '2026-04-01T10:00:00Z' },
  { id: '2', ref: 'ORBIT-M2-B7E', amount: 2066.60, status: 'accepted', auth: 'A77445', reason: null, date: '2026-03-01T10:00:00Z' },
  { id: '3', ref: 'ORBIT-M3-C2D', amount: 2066.60, status: 'declined', auth: null, reason: 'Insufficient funds', date: '2026-02-15T10:00:00Z' },
  { id: '4', ref: 'ORBIT-M4-D9A', amount: 2066.60, status: 'accepted', auth: 'A77600', reason: null, date: '2026-02-01T10:00:00Z' },
  { id: '5', ref: 'ORBIT-M5-E1F', amount: 2066.60, status: 'pending', auth: null, reason: null, date: '2026-04-28T14:30:00Z' },
];

const DOCS = [
  { name: 'March 2026 Statement', date: 'Apr 01, 2026', type: 'statement' },
  { name: 'February 2026 Statement', date: 'Mar 01, 2026', type: 'statement' },
  { name: '1098 Mortgage Interest', date: 'Jan 31, 2026', type: 'tax' },
  { name: 'Loan Agreement', date: 'Jul 27, 2022', type: 'agreement' },
];

const fd = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function Expandable({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-blue-600" />
          <h2 className="text-gray-900 font-semibold text-sm">{title}</h2>
        </div>
        <ChevronDown size={15} className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-gray-50">{children}</div>}
    </div>
  );
}

export default function CILocDetails() {
  const { token } = useAuth();
  const [showDraw, setShowDraw] = useState(false);
  const [draws, setDraws] = useState(DRAWS);

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      {showDraw && <PaymentModal locId="loc-cap-001" token={token} onClose={() => setShowDraw(false)} onSuccess={(txn) => { setDraws(prev => [txn, ...prev]); setShowDraw(false); }} />}

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <CreditCard size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Line of Credit</h1>
            <p className="text-gray-400 text-xs">{LOC.loanNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {LOC.autopay && <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-600 border border-green-200">Autopay</span>}
        </div>
      </div>

      {/* ── 3 KEY NUMBERS ──────────────────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Available</p>
            <p className="text-3xl font-bold text-green-600 tracking-tight">{fmt$(LOC.availableCredit)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Balance</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{fmt$(LOC.currentBalance)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Limit</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{fmt$(LOC.creditLimit)}</p>
          </div>
        </div>
        <div className="mt-5">
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div className="h-2 rounded-full bg-blue-600 transition-all duration-700" style={{ width: `${Math.min(LOC.usagePercent, 100)}%` }} />
          </div>
          <p className="text-center text-slate-400 text-xs mt-2">{fmtPct(LOC.usagePercent)} utilized</p>
        </div>
      </div>

      {/* ── DRAW CTA ───────────────────────────────────────────────────── */}
      <button onClick={() => setShowDraw(true)} className="w-full group bg-blue-600 hover:bg-blue-700 rounded-2xl p-5 text-left transition-all hover:shadow-lg hover:shadow-blue-500/15">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-lg font-bold">Draw Funds</p>
            <p className="text-blue-200 text-sm mt-0.5">Available: {fmt$(LOC.availableCredit)} &middot; Cutoff 3:30 PM ET</p>
          </div>
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <ArrowUpRight size={20} className="text-white" />
          </div>
        </div>
      </button>

      {/* ── NEXT PAYMENT ───────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wide">Next Payment</p>
          <p className="text-gray-900 text-xl font-bold mt-0.5">{fmt$(LOC.monthlyPayment)}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs">Due {LOC.dueDate}</p>
          <p className="text-gray-400 text-xs">{LOC.paymentMethod}</p>
        </div>
      </div>

      {/* ── EXPANDABLE SECTIONS ────────────────────────────────────────── */}

      {/* Recent Draws */}
      <Expandable title="Recent Draws" icon={TrendingUp} defaultOpen>
        {draws.slice(0, 5).map(d => (
          <div key={d.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
              <p className="text-gray-500 text-xs w-16">{fd(d.date)}</p>
              <PaymentStatusBadge status={d.status} />
            </div>
            <div className="text-right">
              <p className="text-gray-900 text-sm font-bold">{fmt$(d.amount)}</p>
              <p className="text-gray-300 text-xs">{d.auth || d.reason || d.ref}</p>
            </div>
          </div>
        ))}
      </Expandable>

      {/* Line Details */}
      <Expandable title="Line Details" icon={Building2}>
        {[
          ['Type', LOC.loanType],
          ['Rate', `${LOC.interestRate}%`],
          ['Term', LOC.term],
          ['Started', LOC.startDate],
          ['Draw Period Ends', LOC.drawPeriodEnds],
          ['Maturity', LOC.maturityDate],
          ['Original Limit', fmt$(LOC.creditLimit)],
        ].map(([l, v]) => (
          <div key={l} className="flex justify-between px-5 py-2.5 border-b border-gray-50 last:border-0">
            <span className="text-gray-400 text-sm">{l}</span>
            <span className="text-gray-900 text-sm font-semibold">{v}</span>
          </div>
        ))}
      </Expandable>

      {/* Interest */}
      <Expandable title="Interest & Principal YTD" icon={DollarSign}>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
            <p className="text-blue-700 text-xl font-bold">{fmt$(LOC.interestPaidYTD)}</p>
            <p className="text-blue-500 text-xs mt-1">Interest Paid</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
            <p className="text-gray-900 text-xl font-bold">{fmt$(LOC.principalPaidYTD)}</p>
            <p className="text-gray-400 text-xs mt-1">Principal Paid</p>
          </div>
        </div>
      </Expandable>

      {/* Documents */}
      <Expandable title="Documents" icon={FileText}>
        {DOCS.map((d, i) => <DocumentLinkCard key={i} name={d.name} date={d.date} type={d.type} />)}
      </Expandable>
    </div>
  );
}
