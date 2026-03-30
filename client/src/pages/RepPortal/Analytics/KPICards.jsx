import React from 'react';

function fmt$(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1000000) return `$${(n/1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n/1000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}
function fmtPct(n) { return (!n && n !== 0) ? '—' : `${n.toFixed(1)}%`; }
function fmtNum(n) { return (!n && n !== 0) ? '—' : n.toLocaleString(); }
function fmtDays(n) { return (!n && n !== 0) ? '—' : `${n.toFixed(1)}d`; }

const CARDS = [
  { key: 'totalApps',              label: 'Total Apps',          sub: key => null,                    format: fmtNum,  color: 'text-gray-900',   bg: 'bg-gray-50',    border: 'border-gray-200', group: 'Applications' },
  { key: 'mtdApps',                label: 'Apps MTD',            sub: null,                           format: fmtNum,  color: 'text-gray-700',   bg: 'bg-gray-50',    border: 'border-gray-200', group: 'Applications' },
  { key: 'todayApps',              label: 'Apps Today',          sub: null,                           format: fmtNum,  color: 'text-gray-700',   bg: 'bg-gray-50',    border: 'border-gray-200', group: 'Applications' },
  { key: 'approvedCount',          label: 'Approvals',           sub: null,                           format: fmtNum,  color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-100', group: 'Applications' },
  { key: 'appToApprovalRatio',     label: 'App → Approval',      sub: null,                           format: fmtPct,  color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-100', group: 'Applications' },
  { key: 'approvalToFundingRatio', label: 'Approval → Funded',   sub: null,                           format: fmtPct,  color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-100',  group: 'Applications' },
  { key: 'fundedCount',            label: 'Funded Deals',        sub: null,                           format: fmtNum,  color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-100',  group: 'Deals' },
  { key: 'totalFundedVolume',      label: 'Total Funded',        sub: null,                           format: fmt$,    color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-100',  group: 'Deals' },
  { key: 'avgDealSize',            label: 'Avg Deal Size',       sub: null,                           format: fmt$,    color: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-100', group: 'Deals' },
  { key: 'avgDaysToFund',          label: 'Avg Days to Fund',    sub: null,                           format: fmtDays, color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-100', group: 'Time' },
  { key: 'avgDailyObligation',     label: 'Avg Daily Obligation',sub: null,                           format: fmt$,    color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-100',   group: 'Risk' },
  { key: 'avgWithholdingPct',      label: 'Avg Withholding',     sub: null,                           format: fmtPct,  color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-100',   group: 'Risk' },
];

export default function KPICards({ summary, loading }) {
  const groups = [...new Set(CARDS.map(c => c.group))];

  if (loading) {
    return (
      <div className="space-y-4">
        {groups.map(g => (
          <div key={g}>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{g}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {CARDS.filter(c => c.group === g).map(c => (
                <div key={c.key} className="bg-white border border-gray-100 rounded-2xl p-4 animate-pulse">
                  <div className="h-2.5 bg-gray-100 rounded w-2/3 mb-3" />
                  <div className="h-6 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(g => (
        <div key={g}>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{g}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CARDS.filter(c => c.group === g).map(c => (
              <div key={c.key} className={`bg-white border ${c.border} rounded-2xl p-4 shadow-sm`}>
                <p className="text-gray-400 text-xs font-medium mb-2 leading-tight">{c.label}</p>
                <p className={`text-xl font-bold tracking-tight ${c.color}`}>
                  {summary ? c.format(summary[c.key]) : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
