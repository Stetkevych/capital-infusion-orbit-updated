import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart2, RefreshCw, Loader2, ChevronUp, ChevronDown } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

export default function LeadData() {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);
  const [error, setError] = useState('');
  const [sortCol, setSortCol] = useState('deals_funded');
  const [sortDir, setSortDir] = useState('desc');

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
  const money = (v) => v != null && v > 0 ? `$${v.toLocaleString()}` : '—';

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const SortHeader = ({ col, label }) => (
    <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium whitespace-nowrap cursor-pointer hover:text-gray-600 select-none" onClick={() => toggleSort(col)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sortCol === col && (sortDir === 'desc' ? <ChevronDown size={10} /> : <ChevronUp size={10} />)}
      </span>
    </th>
  );

  const sortedReps = metrics?.rep_breakdown
    ? Object.entries(metrics.rep_breakdown).sort((a, b) => {
        const av = a[1][sortCol] ?? -1;
        const bv = b[1][sortCol] ?? -1;
        return sortDir === 'desc' ? bv - av : av - bv;
      })
    : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <BarChart2 size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-gray-900 font-semibold text-lg">Waymo Data</h1>
            <p className="text-gray-400 text-xs">Calendly + Zoho CRM · Waymo leads only</p>
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
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Show-Up Rate*</p>
              <p className="text-green-600 text-2xl font-bold">{metrics.totals.show_up_rate}%</p>
              <p className="text-gray-300 text-xs">{metrics.totals.waymo_showed} / {metrics.totals.waymo_leads_total}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Lead→App Rate*</p>
              <p className="text-blue-600 text-2xl font-bold">{metrics.totals.lead_to_app_rate}%</p>
              <p className="text-gray-300 text-xs">{metrics.totals.waymo_deals} / {metrics.totals.waymo_showed} showed</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Funding Rate*</p>
              <p className="text-purple-600 text-2xl font-bold">{metrics.totals.funding_rate}%</p>
              <p className="text-gray-300 text-xs">of showed-up leads</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Avg Deal Size</p>
              <p className="text-gray-900 text-2xl font-bold">{money(metrics.totals.avg_deal_size)}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Avg Pts/Deal</p>
              <p className="text-gray-900 text-2xl font-bold">{metrics.totals.avg_pts || '—'}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">No-Shows</p>
              <p className="text-red-500 text-2xl font-bold">{metrics.totals.waymo_no_shows}</p>
              <p className="text-gray-300 text-xs">excluded from rates</p>
            </div>
          </div>

          {/* Asterisk caveat */}
          <p className="text-gray-400 text-xs italic">* All percentages are calculated out of leads who actually showed up. No-shows are factored out of the denominator.</p>

          {/* Per-Rep Table — sortable */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-gray-900 font-semibold text-sm">Rep Breakdown</h3>
              <p className="text-gray-400 text-xs mt-0.5">Click column headers to sort · Last {days} days</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium">Rep</th>
                    <SortHeader col="calendly_scheduled" label="Meetings" />
                    <SortHeader col="show_up_rate" label="Show-Up %*" />
                    <SortHeader col="lead_to_app_rate" label="Lead→App %*" />
                    <SortHeader col="funding_rate" label="Funding %*" />
                    <SortHeader col="deals_funded" label="Deals Funded" />
                    <SortHeader col="avg_pts" label="Avg Pts" />
                    <SortHeader col="avg_deal_size" label="Avg Deal" />
                    <SortHeader col="total_funded_amount" label="Total Funded" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedReps.map(([name, s]) => (
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
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          s.lead_to_app_rate >= 20 ? 'bg-green-50 text-green-600' :
                          s.lead_to_app_rate >= 10 ? 'bg-amber-50 text-amber-600' :
                          s.lead_to_app_rate != null ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
                        }`}>{pct(s.lead_to_app_rate)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          s.funding_rate >= 20 ? 'bg-green-50 text-green-600' :
                          s.funding_rate >= 10 ? 'bg-amber-50 text-amber-600' :
                          s.funding_rate != null ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
                        }`}>{pct(s.funding_rate)}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">{s.deals_funded || 0}</td>
                      <td className="px-4 py-3 text-gray-700">{s.avg_pts || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{money(s.avg_deal_size)}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{money(s.total_funded_amount)}</td>
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
