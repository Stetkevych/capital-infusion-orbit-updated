import React, { useState } from 'react';
import {
  CreditCard, Home, FileText, Calendar, DollarSign, TrendingUp,
  CheckCircle2, Clock, ArrowRight, Download, Shield, Percent,
  Building2, ChevronRight, ExternalLink, PieChart
} from 'lucide-react';

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_LOC = {
  loanSummary: {
    principalBalance: 306007.27,
    currentBalance: 306007.27,
    availableCredit: 557.73,
    usagePercent: 99.8,
    loanNumber: '****6791',
    loanType: 'Home Equity Line of Credit',
    interestRate: 8.5,
    term: '30 Year',
    duration: 'Jul 2022 – Aug 2052',
    startDate: 'Jul 27, 2022',
    drawPeriodEnds: 'Jul 26, 2032',
    maturityDate: 'Aug 27, 2052',
    originalLineAmount: 306565.00,
    remainingLine: 557.73,
  },
  paymentDetails: {
    monthlyPayment: 2066.60,
    totalPayment: 2066.60,
    dueDate: 'May 01, 2026',
    nextDraftDate: 'May 01, 2026',
    paymentMethod: 'Checking Account (****4666)',
    paymentStatus: 'Current',
    autopay: true,
  },
  interestBreakdown: {
    interestPaidYTD: 8668.82,
    principalPaidYTD: 0.00,
    interestPercent: 100,
    principalPercent: 0,
    year: 2026,
  },
  usageOverview: {
    balance: 306007.27,
    available: 557.73,
    usagePercent: 99.8,
    originalLine: 306565.00,
  },
  documents: [
    { name: 'March 2026 Statement', date: 'Apr 01, 2026', type: 'statement' },
    { name: 'February 2026 Statement', date: 'Mar 01, 2026', type: 'statement' },
    { name: 'Mortgage Interest Statement (1098)', date: 'Jan 31, 2026', type: 'tax' },
    { name: 'Loan Agreement', date: 'Jul 27, 2022', type: 'agreement' },
  ],
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt$ = (n) => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (n) => `${Number(n).toFixed(1)}%`;

// ─── REUSABLE COMPONENTS ─────────────────────────────────────────────────────
function SummaryStatCard({ icon: Icon, label, value, sub, accent = 'text-blue-600', bg = 'bg-blue-50' }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon size={17} className={accent} />
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-gray-400 text-xs mt-1">{label}</p>
      {sub && <p className="text-gray-300 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

function DetailCard({ title, icon: Icon, children, action }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={15} className="text-blue-600" />}
          <h2 className="text-gray-900 font-semibold text-sm">{title}</h2>
        </div>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

function FieldRow({ label, value, highlight, warn }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className={`text-sm font-semibold ${warn ? 'text-amber-600' : highlight ? 'text-blue-700' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status, positive }) {
  const cls = positive
    ? 'bg-green-50 text-green-700 border-green-200'
    : 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      {status}
    </span>
  );
}

function ActionButton({ label, icon: Icon, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors ${
        primary
          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
          : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
      }`}
    >
      {Icon && <Icon size={14} />} {label}
    </button>
  );
}

function DonutChart({ percent, color = '#2563eb', size = 120, strokeWidth = 14 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-700" />
    </svg>
  );
}

function DocumentLinkCard({ name, date, type }) {
  const iconMap = { statement: FileText, tax: Building2, agreement: Shield };
  const Icon = iconMap[type] || FileText;
  return (
    <button className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors text-left group">
      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
        <Icon size={14} className="text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-800 text-sm font-medium truncate">{name}</p>
        <p className="text-gray-400 text-xs">{date}</p>
      </div>
      <Download size={14} className="text-gray-300 group-hover:text-blue-600 transition-colors shrink-0" />
    </button>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function CILocDetails() {
  const data = MOCK_LOC;
  const { loanSummary: loan, paymentDetails: pay, interestBreakdown: interest, usageOverview: usage, documents: docs } = data;
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'payments', label: 'Payments' },
    { id: 'documents', label: 'Documents' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
            <CreditCard size={22} className="text-blue-600" /> CI LOC
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Line of Credit Overview · {loan.loanType} · {loan.loanNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={pay.autopay ? 'Autopay On' : 'Autopay Off'} positive={pay.autopay} />
          <StatusBadge status={pay.paymentStatus} positive={pay.paymentStatus === 'Current'} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryStatCard icon={DollarSign} label="Principal Balance" value={fmt$(loan.principalBalance)} accent="text-blue-600" bg="bg-blue-50" />
        <SummaryStatCard icon={TrendingUp} label="Available Credit" value={fmt$(loan.availableCredit)} sub={`${fmtPct(usage.usagePercent)} utilized`} accent="text-green-600" bg="bg-green-50" />
        <SummaryStatCard icon={Calendar} label="Monthly Payment" value={fmt$(pay.monthlyPayment)} sub={`Due ${pay.dueDate}`} accent="text-amber-600" bg="bg-amber-50" />
        <SummaryStatCard icon={Percent} label="Interest Rate" value={`${loan.interestRate}%`} sub={loan.term} accent="text-indigo-600" bg="bg-indigo-50" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-100">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column */}
          <div className="space-y-5">
            {/* Loan Overview */}
            <DetailCard title="Loan Overview" icon={Building2}>
              <FieldRow label="Loan Type" value={loan.loanType} />
              <FieldRow label="Loan Number" value={loan.loanNumber} />
              <FieldRow label="Principal Balance" value={fmt$(loan.principalBalance)} highlight />
              <FieldRow label="Current Balance" value={fmt$(loan.currentBalance)} />
              <FieldRow label="Available Credit" value={fmt$(loan.availableCredit)} />
              <FieldRow label="Usage" value={fmtPct(loan.usagePercent)} warn={loan.usagePercent > 90} />
              <FieldRow label="Interest Rate" value={`${loan.interestRate}%`} highlight />
              <FieldRow label="Term" value={loan.term} />
            </DetailCard>

            {/* Payment Details */}
            <DetailCard title="Payment Details" icon={Calendar}
              action={<ActionButton label="Make Payment" icon={ArrowRight} primary />}
            >
              <FieldRow label="Monthly Payment" value={fmt$(pay.monthlyPayment)} highlight />
              <FieldRow label="Total Payment" value={fmt$(pay.totalPayment)} />
              <FieldRow label="Due Date" value={pay.dueDate} />
              <FieldRow label="Next Draft Date" value={pay.nextDraftDate} />
              <FieldRow label="Payment Method" value={pay.paymentMethod} />
              <FieldRow label="Payment Status" value={pay.paymentStatus} />
              <FieldRow label="Autopay" value={pay.autopay ? 'On' : 'Off'} />
            </DetailCard>
          </div>

          {/* Middle Column */}
          <div className="space-y-5">
            {/* Line Usage */}
            <DetailCard title="Line Usage Overview" icon={PieChart}>
              <div className="p-5">
                {/* Usage Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 text-xs">Used</span>
                    <span className="text-gray-500 text-xs">Available</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700"
                      style={{ width: `${usage.usagePercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-900 text-sm font-bold">{fmt$(usage.balance)}</span>
                    <span className="text-green-600 text-sm font-bold">{fmt$(usage.available)}</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mt-4">
                  <p className="text-gray-600 text-sm leading-relaxed">
                    You have used approximately <span className="font-bold text-gray-900">{fmtPct(usage.usagePercent)}</span> of
                    your available line and have <span className="font-bold text-green-700">{fmt$(usage.available)}</span> remaining for use.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-blue-700 text-lg font-bold">{fmt$(usage.balance)}</p>
                    <p className="text-blue-500 text-xs mt-0.5">Balance</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-green-700 text-lg font-bold">{fmt$(usage.available)}</p>
                    <p className="text-green-500 text-xs mt-0.5">Available</p>
                  </div>
                </div>
              </div>
            </DetailCard>

            {/* Interest Breakdown */}
            <DetailCard title="Interest Breakdown" icon={TrendingUp}
              action={<span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">YTD {interest.year}</span>}
            >
              <div className="p-5">
                <div className="flex items-center justify-center gap-8">
                  <div className="relative">
                    <DonutChart percent={interest.interestPercent} color="#2563eb" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-lg font-bold text-gray-900">{interest.interestPercent}%</p>
                      <p className="text-gray-400 text-xs">Interest</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide">Interest Paid YTD</p>
                      <p className="text-blue-700 text-lg font-bold">{fmt$(interest.interestPaidYTD)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide">Principal Paid YTD</p>
                      <p className="text-gray-900 text-lg font-bold">{fmt$(interest.principalPaidYTD)}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-5">
                  <div className="bg-blue-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                      <span className="text-gray-500 text-xs">Interest</span>
                    </div>
                    <p className="text-gray-900 font-bold">{fmtPct(interest.interestPercent)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 bg-gray-300 rounded-full" />
                      <span className="text-gray-500 text-xs">Principal</span>
                    </div>
                    <p className="text-gray-900 font-bold">{fmtPct(interest.principalPercent)}</p>
                  </div>
                </div>
              </div>
            </DetailCard>
          </div>

          {/* Right Column */}
          <div className="space-y-5">
            {/* Loan Timeline */}
            <DetailCard title="Loan Timeline" icon={Clock}>
              <FieldRow label="Loan Start" value={loan.startDate} />
              <FieldRow label="Draw Period Ends" value={loan.drawPeriodEnds} />
              <FieldRow label="Maturity Date" value={loan.maturityDate} />
              <FieldRow label="Duration" value={loan.duration} />
              <FieldRow label="Original Line" value={fmt$(loan.originalLineAmount)} />
              <FieldRow label="Remaining Line" value={fmt$(loan.remainingLine)} />
              <FieldRow label="Current Balance" value={fmt$(loan.currentBalance)} highlight />
              <div className="px-5 py-4">
                <div className="relative">
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: '11%' }} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-400 text-xs">Jul 2022</span>
                    <span className="text-blue-600 text-xs font-medium">Now</span>
                    <span className="text-gray-400 text-xs">Aug 2052</span>
                  </div>
                </div>
              </div>
            </DetailCard>

            {/* Documents */}
            <DetailCard title="Documents & Resources" icon={FileText}
              action={
                <button className="text-blue-600 text-xs font-medium hover:opacity-70 flex items-center gap-1">
                  View All <ChevronRight size={12} />
                </button>
              }
            >
              {docs.map((doc, i) => (
                <DocumentLinkCard key={i} name={doc.name} date={doc.date} type={doc.type} />
              ))}
            </DetailCard>

            {/* Resources */}
            <DetailCard title="Important Resources" icon={Shield}>
              {[
                { label: 'Billing History', desc: 'View past payments and statements' },
                { label: 'Escrow Details', desc: 'Taxes, insurance, and escrow analysis' },
                { label: 'Payoff Request', desc: 'Request a payoff quote' },
              ].map((item, i) => (
                <button key={i} className="w-full flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors group">
                  <div>
                    <p className="text-gray-800 text-sm font-medium">{item.label}</p>
                    <p className="text-gray-400 text-xs">{item.desc}</p>
                  </div>
                  <ExternalLink size={13} className="text-gray-300 group-hover:text-blue-600 transition-colors" />
                </button>
              ))}
            </DetailCard>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DetailCard title="Payment Summary" icon={DollarSign}>
            <FieldRow label="Monthly Payment" value={fmt$(pay.monthlyPayment)} highlight />
            <FieldRow label="Total Payment" value={fmt$(pay.totalPayment)} />
            <FieldRow label="Due Date" value={pay.dueDate} />
            <FieldRow label="Next Draft Date" value={pay.nextDraftDate} />
            <FieldRow label="Payment Method" value={pay.paymentMethod} />
            <FieldRow label="Payment Status" value={pay.paymentStatus} />
            <FieldRow label="Autopay" value={pay.autopay ? 'On' : 'Off'} />
            <div className="px-5 py-4 flex items-center gap-3">
              <ActionButton label="Make Payment" icon={DollarSign} primary />
              <ActionButton label="Payment History" icon={Clock} />
            </div>
          </DetailCard>

          <DetailCard title="Year-to-Date Breakdown" icon={TrendingUp}>
            <FieldRow label="Interest Paid YTD" value={fmt$(interest.interestPaidYTD)} />
            <FieldRow label="Principal Paid YTD" value={fmt$(interest.principalPaidYTD)} />
            <FieldRow label="Interest Portion" value={fmtPct(interest.interestPercent)} />
            <FieldRow label="Principal Portion" value={fmtPct(interest.principalPercent)} />
            <div className="p-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <TrendingUp size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-amber-700 text-sm">
                    100% of your payments are currently going toward interest. This is typical during the draw period of a HELOC.
                  </p>
                </div>
              </div>
            </div>
          </DetailCard>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DetailCard title="Statements" icon={FileText}>
            {docs.filter(d => d.type === 'statement').map((doc, i) => (
              <DocumentLinkCard key={i} name={doc.name} date={doc.date} type={doc.type} />
            ))}
          </DetailCard>
          <DetailCard title="Tax Documents" icon={Building2}>
            {docs.filter(d => d.type === 'tax').map((doc, i) => (
              <DocumentLinkCard key={i} name={doc.name} date={doc.date} type={doc.type} />
            ))}
          </DetailCard>
          <DetailCard title="Loan Documents" icon={Shield}>
            {docs.filter(d => d.type === 'agreement').map((doc, i) => (
              <DocumentLinkCard key={i} name={doc.name} date={doc.date} type={doc.type} />
            ))}
          </DetailCard>
          <DetailCard title="Important Resources" icon={ExternalLink}>
            {[
              { label: 'Billing History', desc: 'View past payments and statements' },
              { label: 'Escrow Details', desc: 'Taxes, insurance, and escrow analysis' },
              { label: 'Payoff Request', desc: 'Request a payoff quote' },
              { label: 'Rate Information', desc: 'Current rate and adjustment details' },
            ].map((item, i) => (
              <button key={i} className="w-full flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors group">
                <div>
                  <p className="text-gray-800 text-sm font-medium">{item.label}</p>
                  <p className="text-gray-400 text-xs">{item.desc}</p>
                </div>
                <ExternalLink size={13} className="text-gray-300 group-hover:text-blue-600 transition-colors" />
              </button>
            ))}
          </DetailCard>
        </div>
      )}
    </div>
  );
}
