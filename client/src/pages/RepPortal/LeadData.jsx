import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart2, RefreshCw, Loader2, ChevronUp, ChevronDown } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

export default function LeadData() {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(365);
  const [error, setError] = useState('');
  const [sortCol, setSortCol] = useState('deals_funded');
  const [sortDir, setSortDir] = useState('desc');

  const headers = { Authorization: `Bearer ${token}` };
  const load = async (d) => { setLoading(true); setError(''); try { const r = await fetch(`${API}/calendly/metrics?days=${d}`, { headers }); if (!r.ok) throw new Error('Failed to load'); setMetrics(await r.json()); } catch (e) { setError(e.message); } setLoading(false); };
  useEffect(() => { load(days); }, [days]);

  const pct = (v) => v != null ? `${v}%` : '—';
  const money = (v) => v != null && v > 0 ? `$${v.toLocaleString()}` : '—';
  const toggleSort = (col) => { if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(col); setSortDir('desc'); } };
  const SortHeader = ({ col, label }) => (
    <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium whitespace-nowrap cursor-pointer hover:text-gray-600 select-none" onClick={() => toggleSort(col)}>
      <span className="inline-flex items-center gap-1">{label}{sortCol === col && (sortDir === 'desc' ? <ChevronDown size={10} /> : <ChevronUp size={10} />)}</span>
    </th>
  );
  const sortedReps = metrics?.rep_breakdown ? Object.entries(metrics.rep_breakdown).sort((a, b) => { const av = a[1][sortCol] ?? -1; const bv = b[1][sortCol] ?? -1; return sortDir === 'desc' ? bv - av : av - bv; }) : [];

  const t = metrics?.totals || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center"><BarChart2 size={16} className="text-white" /></div>
          <div>
            <h1 className="text-gray-900 font-semibold text-lg">Waymo Data</h1>
            <p className="text-gray-400 text-xs">Calendly + Zoho CRM · Full funnel</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {[30, 60, 90, 180, 365].map(d => (
            <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 text-xs font-medium rounded-lg ${days === d ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{d}d</button>
          ))}
          <button onClick={() => load(days)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"><RefreshCw size={13} className="text-gray-500" /></button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

      {loading ? <div className="text-center py-20"><Loader2 size={24} className="mx-auto animate-spin text-gray-300" /></div> : metrics && (
        <>
          {/* Top bubbles */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Total Funded</p>
              <p className="text-gray-900 text-xl font-bold">{money(t.total_funded_amount)}</p>
              <p className="text-gray-300 text-xs">{t.funded} deals</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Avg Deal Size</p>
              <p className="text-gray-900 text-xl font-bold">{money(t.avg_deal_size)}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Cost</p>
              <p className="text-red-500 text-xl font-bold">{money(t.cost)}</p>
              <p className="text-gray-300 text-xs">{t.total_meetings} mtgs × $200</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Revenue</p>
              <p className="text-green-600 text-xl font-bold">{money(t.revenue)}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Avg Points</p>
              <p className="text-gray-900 text-xl font-bold">{t.avg_pts || '—'}</p>
              <p className="text-gray-300 text-xs">per deal</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Approvals</p>
              <p className="text-blue-600 text-xl font-bold">{t.approved}</p>
              <p className="text-gray-300 text-xs">{t.approval_rate}% rate</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Funding Rate</p>
              <p className="text-purple-600 text-xl font-bold">{t.funding_rate}%</p>
              <p className="text-gray-300 text-xs">{t.funded} / {t.apps} apps</p>
            </div>
          </div>

          {/* Funnel metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
              <p className="text-gray-400 text-xs">Total Meetings</p>
              <p className="text-gray-900 font-bold text-lg">{t.total_meetings}</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
              <p className="text-gray-400 text-xs">No Shows</p>
              <p className="text-red-500 font-bold text-lg">{t.no_shows}</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
              <p className="text-gray-400 text-xs">Net Meetings</p>
              <p className="text-gray-900 font-bold text-lg">{t.net_meetings}</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
              <p className="text-gray-400 text-xs">Show-Up Rate</p>
              <p className="text-green-600 font-bold text-lg">{t.show_up_rate}%</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
              <p className="text-gray-400 text-xs">Meeting→App</p>
              <p className="text-blue-600 font-bold text-lg">{t.meeting_to_app_rate}%</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
              <p className="text-gray-400 text-xs">Future Appts</p>
              <p className="text-gray-600 font-bold text-lg">{t.future_appointments}</p>
            </div>
          </div>

          <p className="text-gray-400 text-xs italic">* Show-Up Rate = Net Meetings / Past Appointments. Meeting→App = Apps / Net Meetings. Funding Rate = Funded / Apps. No-shows factored out of all downstream rates.</p>

          {/* Rep table */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-gray-900 font-semibold text-sm">Rep Breakdown</h3>
              <p className="text-gray-400 text-xs mt-0.5">Click headers to sort</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium">Rep</th>
                    <SortHeader col="calendly_scheduled" label="Meetings" />
                    <SortHeader col="net_meetings" label="Net Meetings" />
                    <SortHeader col="apps" label="Apps" />
                    <SortHeader col="meeting_to_app_rate" label="Mtg→App %" />
                    <SortHeader col="deals_funded" label="Funded" />
                    <SortHeader col="funding_rate" label="Funding %" />
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
                      <td className="px-4 py-3 text-gray-900 font-medium">{s.net_meetings || 0}</td>
                      <td className="px-4 py-3 text-gray-700">{s.apps || 0}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded-full font-medium ${s.meeting_to_app_rate >= 30 ? 'bg-green-50 text-green-600' : s.meeting_to_app_rate >= 15 ? 'bg-amber-50 text-amber-600' : s.meeting_to_app_rate != null ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>{pct(s.meeting_to_app_rate)}</span></td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">{s.deals_funded || 0}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded-full font-medium ${s.funding_rate >= 20 ? 'bg-green-50 text-green-600' : s.funding_rate >= 10 ? 'bg-amber-50 text-amber-600' : s.funding_rate != null ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>{pct(s.funding_rate)}</span></td>
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
