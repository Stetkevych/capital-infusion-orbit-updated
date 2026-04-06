import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import PaymentModal from '../../components/PaymentModal';
import {
  SummaryStatCard, DetailCard, FieldRow, StatusBadge, ActionButton,
  DonutChart, DocumentLinkCard, ResourceLink, PaymentStatusBadge, fmt$, fmtPct,
} from '../../components/LocComponents';
import {
  CreditCard, FileText, Calendar, DollarSign, TrendingUp,
  Clock, ArrowRight, Shield, Percent, Building2, ChevronRight,
  PieChart, RefreshCw, ExternalLink
} from 'lucide-react';

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
  { id: 'pay-001', merOrderNumber: 'ORBIT-LOC-M1-A3F', actumOrderId: '90281734', actumHistoryId: 'H-44821', requestType: 'debit', amount: 2066.60, status: 'accepted', authCode: 'A77291', declineReason: null, createdAt: '2026-04-01T10:00:00Z', maskedAccount: '****4666' },
  { id: 'pay-002', merOrderNumber: 'ORBIT-LOC-M2-B7E', actumOrderId: '90281899', actumHistoryId: 'H-44900', requestType: 'debit', amount: 2066.60, status: 'accepted', authCode: 'A77445', declineReason: null, createdAt: '2026-03-01T10:00:00Z', maskedAccount: '****4666' },
  { id: 'pay-003', merOrderNumber: 'ORBIT-LOC-M3-C2D', actumOrderId: '90282010', actumHistoryId: 'H-44955', requestType: 'debit', amount: 2066.60, status: 'declined', authCode: null, declineReason: 'Insufficient funds', createdAt: '2026-02-15T10:00:00Z', maskedAccount: '****4666' },
  { id: 'pay-004', merOrderNumber: 'ORBIT-LOC-M4-D9A', actumOrderId: '90282100', actumHistoryId: 'H-45001', requestType: 'debit', amount: 2066.60, status: 'accepted', authCode: 'A77600', declineReason: null, createdAt: '2026-02-01T10:00:00Z', maskedAccount: '****4666' },
  { id: 'pay-005', merOrderNumber: 'ORBIT-LOC-M5-E1F', actumOrderId: null, actumHistoryId: null, requestType: 'debit', amount: 2066.60, status: 'pending', authCode: null, declineReason: null, createdAt: '2026-04-28T14:30:00Z', maskedAccount: '****4666' },
  { id: 'pay-006', merOrderNumber: 'ORBIT-LOC-M6-F4B', actumOrderId: '90282200', actumHistoryId: 'H-45100', requestType: 'debit', amount: 2066.60, status: 'returned', authCode: null, declineReason: 'Account closed', createdAt: '2026-01-15T10:00:00Z', maskedAccount: '****4666' },
];

function fmtDate(iso) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }

export default function CILocDetails() {
  const { token } = useAuth();
  const { loanSummary: loan, paymentDetails: pay, interestBreakdown: interest, usageOverview: usage, documents: docs } = MOCK_LOC;
  const [activeTab, setActiveTab] = useState('overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payments, setPayments] = useState(MOCK_PAYMENTS);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'payments', label: 'Payments' },
    { id: 'history', label: 'Payment History' },
    { id: 'documents', label: 'Documents' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {showPaymentModal && (
        <PaymentModal locId="loc-cap-001" token={token} onClose={() => setShowPaymentModal(false)} onSuccess={(txn) => { setPayments(prev => [txn, ...prev]); setShowPaymentModal(false); }} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
            <CreditCard size={22} className="text-blue-600" /> CI LOC
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Line of Credit Overview &middot; {loan.loanType} &middot; {loan.loanNumber}</p>
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
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-5">
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
            <DetailCard title="Payment Details" icon={Calendar} action={<ActionButton label="Make Payment" icon={ArrowRight} onClick={() => setShowPaymentModal(true)} primary />}>
              <FieldRow label="Monthly Payment" value={fmt$(pay.monthlyPayment)} highlight />
              <FieldRow label="Total Payment" value={fmt$(pay.totalPayment)} />
              <FieldRow label="Due Date" value={pay.dueDate} />
              <FieldRow label="Next Draft Date" value={pay.nextDraftDate} />
              <FieldRow label="Payment Method" value={pay.paymentMethod} />
              <FieldRow label="Payment Status" value={pay.paymentStatus} />
              <FieldRow label="Autopay" value={pay.autopay ? 'On' : 'Off'} />
            </DetailCard>
          </div>
          <div className="space-y-5">
            <DetailCard title="Line Usage Overview" icon={PieChart}>
              <div className="p-5">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2"><span className="text-gray-500 text-xs">Used</span><span className="text-gray-500 text-xs">Available</span></div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden"><div className="h-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700" style={{ width: `${usage.usagePercent}%` }} /></div>
                  <div className="flex items-center justify-between mt-2"><span className="text-gray-900 text-sm font-bold">{fmt$(usage.balance)}</span><span className="text-green-600 text-sm font-bold">{fmt$(usage.available)}</span></div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 mt-4"><p className="text-gray-600 text-sm leading-relaxed">You have used approximately <span className="font-bold text-gray-900">{fmtPct(usage.usagePercent)}</span> of your available line and have <span className="font-bold text-green-700">{fmt$(usage.available)}</span> remaining for use.</p></div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-blue-700 text-lg font-bold">{fmt$(usage.balance)}</p><p className="text-blue-500 text-xs mt-0.5">Balance</p></div>
                  <div className="bg-green-50 rounded-xl p-3 text-center"><p className="text-green-700 text-lg font-bold">{fmt$(usage.available)}</p><p className="text-green-500 text-xs mt-0.5">Available</p></div>
                </div>
              </div>
            </DetailCard>
            <DetailCard title="Interest Breakdown" icon={TrendingUp} action={<span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">YTD {interest.year}</span>}>
              <div className="p-5">
                <div className="flex items-center justify-center gap-8">
                  <div className="relative">
                    <DonutChart percent={interest.interestPercent} color="#2563eb" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center"><p className="text-lg font-bold text-gray-900">{interest.interestPercent}%</p><p className="text-gray-400 text-xs">Interest</p></div>
                  </div>
                  <div className="space-y-4">
                    <div><p className="text-gray-400 text-xs uppercase tracking-wide">Interest Paid YTD</p><p className="text-blue-700 text-lg font-bold">{fmt$(interest.interestPaidYTD)}</p></div>
                    <div><p className="text-gray-400 text-xs uppercase tracking-wide">Principal Paid YTD</p><p className="text-gray-900 text-lg font-bold">{fmt$(interest.principalPaidYTD)}</p></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-5">
                  <div className="bg-blue-50 rounded-xl p-3"><div className="flex items-center gap-2 mb-1"><div className="w-2.5 h-2.5 bg-blue-600 rounded-full" /><span className="text-gray-500 text-xs">Interest</span></div><p className="text-gray-900 font-bold">{fmtPct(interest.interestPercent)}</p></div>
                  <div className="bg-gray-50 rounded-xl p-3"><div className="flex items-center gap-2 mb-1"><div className="w-2.5 h-2.5 bg-gray-300 rounded-full" /><span className="text-gray-500 text-xs">Principal</span></div><p className="text-gray-900 font-bold">{fmtPct(interest.principalPercent)}</p></div>
                </div>
              </div>
            </DetailCard>
          </div>
          <div className="space-y-5">
            <DetailCard title="Loan Timeline" icon={Clock}>
              <FieldRow label="Loan Start" value={loan.startDate} />
              <FieldRow label="Draw Period Ends" value={loan.drawPeriodEnds} />
              <FieldRow label="Maturity Date" value={loan.maturityDate} />
              <FieldRow label="Duration" value={loan.duration} />
              <FieldRow label="Original Line" value={fmt$(loan.originalLineAmount)} />
              <FieldRow label="Remaining Line" value={fmt$(loan.remainingLine)} />
              <FieldRow label="Current Balance" value={fmt$(loan.currentBalance)} highlight />
              <div className="px-5 py-4"><div className="w-full bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full bg-blue-600" style={{ width: '11%' }} /></div><div className="flex items-center justify-between mt-2"><span className="text-gray-400 text-xs">Jul 2022</span><span className="text-blue-600 text-xs font-medium">Now</span><span className="text-gray-400 text-xs">Aug 2052</span></div></div>
            </DetailCard>
            <DetailCard title="Documents & Resources" icon={FileText} action={<button className="text-blue-600 text-xs font-medium hover:opacity-70 flex items-center gap-1" onClick={() => setActiveTab('documents')}>View All <ChevronRight size={12} /></button>}>
              {docs.map((doc, i) => <DocumentLinkCard key={i} name={doc.name} date={doc.date} type={doc.type} />)}
            </DetailCard>
            <DetailCard title="Important Resources" icon={Shield}>
              <ResourceLink label="Billing History" desc="View past payments and statements" />
              <ResourceLink label="Escrow Details" desc="Taxes, insurance, and escrow analysis" />
              <ResourceLink label="Payoff Request" desc="Request a payoff quote" />
            </DetailCard>
          </div>
        </div>
      )}

      {/* PAYMENTS TAB */}
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
              <ActionButton label="Make ACH Payment" icon={DollarSign} onClick={() => setShowPaymentModal(true)} primary />
              <ActionButton label="Payment History" icon={Clock} onClick={() => setActiveTab('history')} />
            </div>
          </DetailCard>
          <DetailCard title="Year-to-Date Breakdown" icon={TrendingUp}>
            <FieldRow label="Interest Paid YTD" value={fmt$(interest.interestPaidYTD)} />
            <FieldRow label="Principal Paid YTD" value={fmt$(interest.principalPaidYTD)} />
            <FieldRow label="Interest Portion" value={fmtPct(interest.interestPercent)} />
            <FieldRow label="Principal Portion" value={fmtPct(interest.principalPercent)} />
            <div className="p-5"><div className="bg-amber-50 border border-amber-200 rounded-xl p-4"><div className="flex items-start gap-2"><TrendingUp size={14} className="text-amber-600 shrink-0 mt-0.5" /><p className="text-amber-700 text-sm">100% of your payments are currently going toward interest. This is typical during the draw period of a HELOC.</p></div></div></div>
          </DetailCard>
        </div>
      )}

      {/* PAYMENT HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-gray-900 font-semibold text-sm">Line Payment History</h2>
            <div className="flex items-center gap-2">
              <ActionButton label="Refresh" icon={RefreshCw} />
              <ActionButton label="Make ACH Payment" icon={DollarSign} onClick={() => setShowPaymentModal(true)} primary />
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    {['Date', 'Payment ID', 'Actum Order', 'Type', 'Amount', 'Status', 'Auth / Decline', 'Account', ''].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-gray-700 text-xs whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs font-mono">{p.merOrderNumber}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs font-mono">{p.actumOrderId || '-'}</td>
                      <td className="py-3 px-4 text-gray-600 text-xs capitalize">{p.requestType}</td>
                      <td className="py-3 px-4 text-gray-900 text-xs font-semibold">{fmt$(p.amount)}</td>
                      <td className="py-3 px-4"><PaymentStatusBadge status={p.status} /></td>
                      <td className="py-3 px-4 text-xs">{p.authCode ? <span className="text-green-600 font-mono">{p.authCode}</span> : p.declineReason ? <span className="text-red-500">{p.declineReason}</span> : <span className="text-gray-300">-</span>}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs font-mono">{p.maskedAccount || '-'}</td>
                      <td className="py-3 px-4">
                        <button className="text-blue-600 text-xs font-medium hover:opacity-70">Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {payments.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No payment history yet.</div>}
          </div>
        </div>
      )}

      {/* DOCUMENTS TAB */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DetailCard title="Statements" icon={FileText}>
            {docs.filter(d => d.type === 'statement').map((doc, i) => <DocumentLinkCard key={i} name={doc.name} date={doc.date} type={doc.type} />)}
          </DetailCard>
          <DetailCard title="Tax Documents" icon={Building2}>
            {docs.filter(d => d.type === 'tax').map((doc, i) => <DocumentLinkCard key={i} name={doc.name} date={doc.date} type={doc.type} />)}
          </DetailCard>
          <DetailCard title="Loan Documents" icon={Shield}>
            {docs.filter(d => d.type === 'agreement').map((doc, i) => <DocumentLinkCard key={i} name={doc.name} date={doc.date} type={doc.type} />)}
          </DetailCard>
          <DetailCard title="Important Resources" icon={ExternalLink}>
            <ResourceLink label="Billing History" desc="View past payments and statements" />
            <ResourceLink label="Escrow Details" desc="Taxes, insurance, and escrow analysis" />
            <ResourceLink label="Payoff Request" desc="Request a payoff quote" />
            <ResourceLink label="Rate Information" desc="Current rate and adjustment details" />
          </DetailCard>
        </div>
      )}
    </div>
  );
}
