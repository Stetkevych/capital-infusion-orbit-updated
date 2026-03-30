import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="text-gray-500 font-medium mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-semibold text-gray-900">
            {p.name === 'Volume' ? `$${(p.value / 1000).toFixed(0)}K` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function TrendCharts({ data, loading }) {
  const [activeChart, setActiveChart] = useState('volume');

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/4 mb-6" />
        <div className="h-48 bg-gray-50 rounded-xl" />
      </div>
    );
  }

  const chartData = (data || []).map(d => ({
    month: d.month,
    Volume: d.volume || 0,
    Funded: d.funded || 0,
    Approved: d.approved || 0,
    Submitted: d.submitted || 0,
  }));

  const tabs = [
    { key: 'volume', label: 'Funded Volume' },
    { key: 'deals', label: 'Deal Activity' },
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
        <div>
          <h2 className="text-gray-900 font-semibold text-sm">Production Trends</h2>
          <p className="text-gray-400 text-xs mt-0.5">Monthly performance over time</p>
        </div>
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveChart(t.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeChart === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No data available</div>
        ) : activeChart === 'volume' ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Volume" stroke="#2563eb" strokeWidth={2} fill="url(#volumeGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#6b7280' }} />
              <Bar dataKey="Submitted" fill="#e5e7eb" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Approved" fill="#93c5fd" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Funded" fill="#2563eb" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
