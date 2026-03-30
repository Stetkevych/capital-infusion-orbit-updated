import React from 'react';
import { AlertTriangle, TrendingDown, DollarSign, Percent } from 'lucide-react';

function fmt$(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1000) return `$${(n/1000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

export default function RiskMetrics({ underwriting, summary, loading }) {
  if (loading) return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-1/3 mb-6" />
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-50 rounded-xl" />)}
      </div>
    </div>
  );

  const uw = underwriting || {};

  const metrics = [
    {
      icon: AlertTriangle,
      label: 'Avg NSF Count',
      value: uw.avgNsfCount ? uw.avgNsfCount.toFixed(1) : '—',
      sub: 'per deal',
      color: 'text-red-500',
      bg: 'bg-red-50',
      border: 'border-red-100',
      note: 'Auto-extracted from bank statements',
      auto: true,
    },
    {
      icon: TrendingDown,
      label: 'Avg Negative Days',
      value: uw.avgNegativeDays ? uw.avgNegativeDays.toFixed(1) : '—',
      sub: 'days per month',
      color: 'text-orange-500',
      bg: 'bg-orange-50',
      border: 'border-orange-100',
      note: 'Auto-extracted from bank statements',
      auto: true,
    },
    {
      icon: DollarSign,
      label: 'Avg Daily Obligation',
      value: fmt$(summary?.avgDailyObligation),
      sub: 'existing MCA payments',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100',
      note: 'Manually entered in Deal Log',
      auto: false,
    },
    {
      icon: Percent,
      label: 'Avg Withholding',
      value: summary?.avgWithholdingPct ? `${summary.avgWithholdingPct.toFixed(1)}%` : '—',
      sub: 'of daily revenue',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      note: 'Manually entered in Deal Log',
      auto: false,
    },
    {
      icon: DollarSign,
      label: 'Avg Monthly Revenue',
      value: fmt$(uw.avgMonthlyRevenue),
      sub: 'gross deposits',
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-100',
      note: 'Auto-extracted from bank statements',
      auto: true,
    },
    {
      icon: DollarSign,
      label: 'Avg True Revenue',
      value: fmt$(uw.avgTrueRevenue),
      sub: 'excl. MCA deposits',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      note: 'Auto-extracted, MCA deposits excluded',
      auto: true,
    },
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50">
        <h2 className="text-gray-900 font-semibold text-sm">Revenue & Risk Metrics</h2>
        <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
            ⚡ Auto = extracted from documents
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
            ✏️ Manual = entered by rep
          </span>
        </div>
      </div>
      <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
        {metrics.map(m => (
          <div key={m.label} className={`border ${m.border} ${m.bg} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <m.icon size={14} className={m.color} />
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                m.auto ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {m.auto ? '⚡ Auto' : '✏️ Manual'}
              </span>
            </div>
            <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{m.label}</p>
            <p className="text-gray-400 text-xs">{m.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
