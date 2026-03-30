import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function fmt$(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtPct(n) {
  if (!n && n !== 0) return '—';
  return `${n.toFixed(1)}%`;
}

function fmtNum(n) {
  if (!n && n !== 0) return '—';
  return n.toLocaleString();
}

const CARDS = [
  { key: 'totalFunded', label: 'Total Funded', format: fmt$, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  { key: 'totalFundedDeals', label: 'Funded Deals', format: fmtNum, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
  { key: 'avgDealSize', label: 'Avg Deal Size', format: fmt$, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  { key: 'approvalRate', label: 'Approval Rate', format: fmtPct, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  { key: 'fundingRate', label: 'Funding Rate', format: fmtPct, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
  { key: 'activePipeline', label: 'Active Pipeline', format: fmtNum, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
];

export default function KPICards({ summary, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {CARDS.map(c => (
          <div key={c.key} className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse">
            <div className="h-3 bg-gray-100 rounded w-2/3 mb-4" />
            <div className="h-7 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {CARDS.map(c => (
        <div key={c.key} className={`bg-white border ${c.border} rounded-2xl p-5 shadow-sm`}>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-3">{c.label}</p>
          <p className={`text-2xl font-bold tracking-tight ${c.color}`}>
            {summary ? c.format(summary[c.key]) : '—'}
          </p>
        </div>
      ))}
    </div>
  );
}
