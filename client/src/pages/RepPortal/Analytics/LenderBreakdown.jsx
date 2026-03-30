import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

function fmt$(n) {
  if (!n) return '$0';
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  return `$${(n / 1000).toFixed(0)}K`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="text-gray-500 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-gray-900 font-semibold">{p.name}: {p.name === 'Volume' ? fmt$(p.value) : p.value}</p>
      ))}
    </div>
  );
};

export default function LenderBreakdown({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3 mb-6" />
        <div className="h-48 bg-gray-50 rounded-xl" />
      </div>
    );
  }

  const lenders = data || [];
  const chartData = lenders.map(l => ({ name: l.lender, Volume: l.volume, Rate: l.approvalRate }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Funded volume bar chart */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50">
            <h2 className="text-gray-900 font-semibold text-sm">Funded Volume by Lender</h2>
            <p className="text-gray-400 text-xs mt-0.5">Total funded amount per funding partner</p>
          </div>
          <div className="p-6">
            {chartData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => fmt$(v)} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Volume" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Approval rate donut */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50">
            <h2 className="text-gray-900 font-semibold text-sm">Lender Distribution</h2>
            <p className="text-gray-400 text-xs mt-0.5">Share of funded deals by lender</p>
          </div>
          <div className="p-6 flex items-center gap-6">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={lenders} dataKey="funded" nameKey="lender" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                  {lenders.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {lenders.map((l, i) => (
                <div key={l.lender} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600 text-xs">{l.lender}</span>
                  </div>
                  <span className="text-gray-900 text-xs font-semibold">{l.funded} deals</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lender stats table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50">
          <h2 className="text-gray-900 font-semibold text-sm">Lender Performance Table</h2>
          <p className="text-gray-400 text-xs mt-0.5">Detailed breakdown per funding partner</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                {['Lender', 'Submissions', 'Approvals', 'Funded', 'Volume', 'Approval Rate', 'Avg Factor'].map(h => (
                  <th key={h} className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lenders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-300 text-sm">No lender data available</td></tr>
              ) : lenders.map((l, i) => (
                <tr key={l.lender} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-900 font-medium">{l.lender}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-gray-600">{l.submissions}</td>
                  <td className="py-3.5 px-5 text-gray-600">{l.approvals}</td>
                  <td className="py-3.5 px-5 text-gray-600">{l.funded}</td>
                  <td className="py-3.5 px-5 text-gray-900 font-semibold">{fmt$(l.volume)}</td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[60px]">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${l.approvalRate}%` }} />
                      </div>
                      <span className="text-gray-700 text-xs font-medium">{l.approvalRate}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-gray-600">{l.avgFactor ? `${l.avgFactor}x` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
