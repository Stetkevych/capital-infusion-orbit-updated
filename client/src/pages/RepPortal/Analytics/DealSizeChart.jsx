import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function fmt$(n) {
  if (!n) return '$0';
  if (n >= 1000000) return `$${(n/1000000).toFixed(1)}M`;
  return `$${(n/1000).toFixed(0)}K`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="text-gray-900 font-semibold">{payload[0].value} deals</p>
    </div>
  );
};

export default function DealSizeChart({ distribution, summary, loading }) {
  if (loading) return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-1/3 mb-6" />
      <div className="h-40 bg-gray-50 rounded-xl" />
    </div>
  );

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50">
        <h2 className="text-gray-900 font-semibold text-sm">Deal Size Distribution</h2>
        <p className="text-gray-400 text-xs mt-0.5">Funded deals grouped by amount</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
            <p className="text-blue-400 text-xs mb-1">Avg Deal Size</p>
            <p className="text-blue-700 text-2xl font-bold">{fmt$(summary?.avgDealSize)}</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs mb-1">Total Funded Volume</p>
            <p className="text-gray-900 text-2xl font-bold">{fmt$(summary?.totalFundedVolume)}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={distribution || []} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
