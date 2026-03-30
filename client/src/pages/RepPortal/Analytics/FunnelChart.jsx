import React from 'react';

export default function FunnelChart({ summary, loading }) {
  if (loading) return <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 h-48 animate-pulse"><div className="h-full bg-gray-50 rounded-xl" /></div>;

  const stages = [
    { label: 'Applications', value: summary?.totalApps || 0, color: 'bg-gray-200', text: 'text-gray-700' },
    { label: 'Approved', value: summary?.approvedCount || 0, color: 'bg-blue-300', text: 'text-blue-700' },
    { label: 'Funded', value: summary?.fundedCount || 0, color: 'bg-blue-600', text: 'text-white' },
  ];

  const max = stages[0].value || 1;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50">
        <h2 className="text-gray-900 font-semibold text-sm">Conversion Funnel</h2>
        <p className="text-gray-400 text-xs mt-0.5">Application → Approval → Funded</p>
      </div>
      <div className="p-6 space-y-3">
        {stages.map((s, i) => {
          const pct = max ? Math.round(s.value / max * 100) : 0;
          const convPct = i > 0 && stages[i-1].value
            ? Math.round(s.value / stages[i-1].value * 100)
            : null;
          return (
            <div key={s.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-gray-600 text-xs font-medium">{s.label}</span>
                <div className="flex items-center gap-2">
                  {convPct !== null && (
                    <span className="text-xs text-gray-400">{convPct}% conversion</span>
                  )}
                  <span className="text-gray-900 text-sm font-bold">{s.value.toLocaleString()}</span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-8 relative overflow-hidden">
                <div
                  className={`h-8 rounded-full ${s.color} transition-all duration-700 flex items-center justify-end pr-3`}
                  style={{ width: `${Math.max(pct, 8)}%` }}
                >
                  <span className={`text-xs font-semibold ${s.text}`}>{pct}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
