import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function fmt$(n) {
  if (!n) return '$0';
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  return `$${(n / 1000).toFixed(0)}K`;
}

const STAGE_COLORS = {
  Submitted: '#93c5fd',
  Approved: '#6ee7b7',
  Funded: '#2563eb',
  Declined: '#fca5a5',
  Withdrawn: '#d1d5db',
};

export default function PipelineSection({ data, deals, loading }) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/4 mb-6" />
        <div className="h-40 bg-gray-50 rounded-xl" />
      </div>
    );
  }

  const stages = data || [];
  const recentDeals = (deals || []).slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Stage chart */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50">
            <h2 className="text-gray-900 font-semibold text-sm">Pipeline by Stage</h2>
            <p className="text-gray-400 text-xs mt-0.5">Active deals by current stage</p>
          </div>
          <div className="p-6">
            {stages.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No active pipeline</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stages}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v, n) => [n === 'value' ? fmt$(v) : v, n === 'value' ? 'Value' : 'Count']} />
                  <Bar dataKey="count" name="Deals" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Stage cards */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50">
            <h2 className="text-gray-900 font-semibold text-sm">Stage Summary</h2>
            <p className="text-gray-400 text-xs mt-0.5">Deal count and value per stage</p>
          </div>
          <div className="p-4 space-y-2">
            {stages.length === 0 ? (
              <p className="text-gray-300 text-sm text-center py-6">No pipeline data</p>
            ) : stages.map(s => (
              <div key={s.stage} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: STAGE_COLORS[s.stage] || '#9ca3af' }} />
                  <span className="text-gray-700 text-sm font-medium">{s.stage}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500 text-xs">{s.count} deals</span>
                  <span className="text-gray-900 text-sm font-semibold">{fmt$(s.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent deals table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50">
          <h2 className="text-gray-900 font-semibold text-sm">Recent Deals</h2>
          <p className="text-gray-400 text-xs mt-0.5">Latest deal activity in your portfolio</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                {['Client', 'Lender', 'Amount', 'Stage', 'Submitted', 'Factor'].map(h => (
                  <th key={h} className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentDeals.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-300 text-sm">No deals found</td></tr>
              ) : recentDeals.map((d, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3.5 px-5 text-gray-900 font-medium">{d.client_name || `Client ${i + 1}`}</td>
                  <td className="py-3.5 px-5 text-gray-600">{d.lender}</td>
                  <td className="py-3.5 px-5 text-gray-900 font-semibold">{fmt$(d.amount)}</td>
                  <td className="py-3.5 px-5">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full border"
                      style={{
                        background: STAGE_COLORS[d.stage] ? `${STAGE_COLORS[d.stage]}20` : '#f3f4f6',
                        color: STAGE_COLORS[d.stage] || '#6b7280',
                        borderColor: STAGE_COLORS[d.stage] ? `${STAGE_COLORS[d.stage]}40` : '#e5e7eb',
                      }}>
                      {d.stage}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-gray-400 text-xs">{d.submitted}</td>
                  <td className="py-3.5 px-5 text-gray-600">{d.factor ? `${d.factor}x` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
