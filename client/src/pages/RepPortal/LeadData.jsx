import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart2, Calendar, Users, XCircle, RefreshCw, Loader2, DollarSign, TrendingUp } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

export default function LeadData() {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const loadMetrics = async (d) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/calendly/metrics?days=${d}`, { headers });
      if (!res.ok) throw new Error('Failed to load metrics');
      setMetrics(await res.json());
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { loadMetrics(days); }, [days]);

  const pct = (v) => v != null ? `${v}%` : '—';
  const money = (v) => v != null ? `$${v.toLocaleString()}` : '—';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <BarChart2 size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-gray-900 font-semibold text-lg">Waymo Data</h1>
            <p className="text-gray-400 text-xs">Calendly + Zoho CRM · Per-rep funnel metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {[30, 60, 90, 180, 365].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg ${days === d ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {d}d
            </button>
          ))}
          <button onClick={() => loadMetrics(days)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
            <RefreshCw size={13} className="text-gray-500" />
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

      {loading ? (
        <div className="text-center py-20"><Loader2 size={24} className="mx-auto animate-spin text-gray-300" /></div>
      ) : metrics && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Meetings Scheduled</p>
              <p className="text-gray-900 text-2xl font-bold">{metrics.totals.calendly_scheduled}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Show-Up Rate</p>
              <p className="text-green-600 text-2xl font-bold">{metrics.totals.show_up_rate}%</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Waymo Leads</p>
              <p className="text-gray-900 text-2xl font-bold">{metrics.totals.waymo_leads_total}</p>
              <p className="text-gray-400 text-xs">{metrics.totals.waymo_house_transfers} no-shows</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Funding Rate</p>
              <p className="text-blue-600 text-2xl font-bold">{metrics.totals.funding_rate}%</p>
              <p className="text-gray-400 text-xs">{metrics.totals.deals_won} / {metrics.totals.deals_total} deals</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Avg Deal Size</p>
              <p className="text-gray-900 text-2xl font-bold">{money(metrics.totals.avg_deal_size)}</p>
              <p className="text-gray-400 text-xs">{money(metrics.totals.total_funded_amount)} total</p>
            </div>
          </div>

          {/* Per-Rep Table */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-gray-900 font-semibold text-sm">Rep Breakdown</h3>
              <p className="text-gray-400 text-xs mt-0.5">Last {days} days · Calendly + Zoho CRM</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['Rep', 'Meetings', 'Show-Up %', 'Waymo Leads', 'Lead→App %', 'Deals Won', 'Funding %', 'Avg Deal', 'Total Funded'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-gray-400 text-xs font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.entries(metrics.rep_breakdown || {})
                    .sort((a, b) => (b[1].deals_won || 0) - (a[1].deals_won || 0))
                    .map(([name, s]) => (
                    <tr key={name} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">{name}</td>
                      <td className="px-4 py-3 text-gray-700">{s.calendly_scheduled || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          s.show_up_rate >= 80 ? 'bg-green-50 text-green-600' :
                          s.show_up_rate >= 60 ? 'bg-amber-50 text-amber-600' :
                          s.show_up_rate != null ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
                        }`}>{pct(s.show_up_rate)}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{s.waymo_leads || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          s.lead_to_app_rate >= 50 ? 'bg-green-50 text-green-600' :
                          s.lead_to_app_rate >= 25 ? 'bg-amber-50 text-amber-600' :
                          s.lead_to_app_rate != null ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
                        }`}>{pct(s.lead_to_app_rate)}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">{s.deals_won || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          s.funding_rate >= 70 ? 'bg-green-50 text-green-600' :
                          s.funding_rate >= 40 ? 'bg-amber-50 text-amber-600' :
                          s.funding_rate != null ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
                        }`}>{pct(s.funding_rate)}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{money(s.avg_deal_size)}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{money(s.total_funded_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Events */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-gray-900 font-semibold text-sm">Recent Calendly Events</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['Event', 'Date', 'Time', 'Team', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-gray-400 text-xs font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(metrics.events || []).slice(0, 20).map((e, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-900 font-medium">{e.name}</td>
                      <td className="px-4 py-3 text-gray-600">{e.start_time?.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{(e.event_memberships || []).map(m => m.user_name).join(', ')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${e.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
