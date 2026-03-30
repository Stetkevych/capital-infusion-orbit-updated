import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="text-gray-900 font-semibold">{payload[0].value?.toFixed(1)} days</p>
    </div>
  );
};

export default function TimeMetrics({ stageDurations, loading }) {
  if (loading) return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-1/3 mb-6" />
      <div className="h-40 bg-gray-50 rounded-xl" />
    </div>
  );

  const d = stageDurations || {};

  const stages = [
    { label: 'Submit → Docs', value: d.submitToDocs || 0, color: '#93c5fd' },
    { label: 'Docs → UW', value: d.docsToUnderwrite || 0, color: '#60a5fa' },
    { label: 'UW → Approved', value: d.underwriteToApprove || 0, color: '#3b82f6' },
    { label: 'Approved → Funded', value: d.approveToFund || 0, color: '#1d4ed8' },
  ];

  const cards = [
    { label: 'Submit → Docs', value: d.submitToDocs, color: 'text-blue-400' },
    { label: 'Docs → Underwrite', value: d.docsToUnderwrite, color: 'text-blue-500' },
    { label: 'Underwrite → Approve', value: d.underwriteToApprove, color: 'text-blue-600' },
    { label: 'Approve → Fund', value: d.approveToFund, color: 'text-blue-700' },
    { label: 'Total to Fund', value: d.totalToFund, color: 'text-gray-900' },
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-2">
        <Clock size={15} className="text-amber-500" />
        <div>
          <h2 className="text-gray-900 font-semibold text-sm">Time Metrics</h2>
          <p className="text-gray-400 text-xs mt-0.5">Average days between each stage</p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Stage duration cards */}
        <div className="grid grid-cols-5 gap-3">
          {cards.map(c => (
            <div key={c.label} className="text-center bg-gray-50 rounded-xl p-3">
              <p className={`text-xl font-bold ${c.color}`}>
                {c.value ? c.value.toFixed(1) : '—'}
              </p>
              <p className="text-gray-400 text-xs mt-0.5 leading-tight">{c.label}</p>
              {c.value ? <p className="text-gray-300 text-xs">days</p> : null}
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={stages} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit="d" />
            <Tooltip content={<CustomTooltip />} />
            {stages.map((s, i) => (
              <Bar key={s.label} dataKey="value" fill={s.color} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>

        <p className="text-gray-300 text-xs text-center">Based on funded deals with complete timestamp data</p>
      </div>
    </div>
  );
}
