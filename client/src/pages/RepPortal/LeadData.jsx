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
  const [sortCol, setSortCol] = useState('total_funded_amount');
  const [sortDir, setSortDir] = useState('desc');

  const headers = { Authorization: `Bearer ${token}` };
  const load = async (d) => { setLoading(true); setError(''); try { const r = await fetch(`${API}/calendly/metrics?days=${d}`, { headers }); if (!r.ok) throw new Error('Failed to load'); setMetrics(await r.json()); } catch (e) { setError(e.message); } setLoading(false); };
  useEffect(() => { load(days); }, [days]);

  const pct = (v) => v != null ? `${v}%` : '—';
  const money = (v) => v != null && v !== 0 ? `$${v.toLocaleString()}` : '—';
  const toggleSort = (col) => { if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(col); setSortDir('desc'); } };
  const SortHeader = ({ col, label }) => (
    <th className="text-left px-3 py-3 text-gray-400 text-xs font-medium whitespace-nowrap cursor-pointer hover:text-gray-600 select-none" onClick={() => toggleSort(col)}>
      <span className="inline-flex items-center gap-0.5">{label}{sortCol === col && (sortDir === 'desc' ? <ChevronDown size={9} /> : <ChevronUp size={9} />)}</span>
    </th>
  );

  // Color badge: <15% red, 15-35% yellow, >=35% green
  const badge = (v) => {
    if (v == null) return <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-50 text-gray-400">—</span>;
    const cls = v >= 35 ? 'bg-green-50 text-green-600' : v >= 15 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600';
    return <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${cls}`}>{v}%</span>;
  };

  const sortedReps = metrics?.rep_breakdown ? Object.entries(metrics.rep_breakdown)
    .map(([name, s]) => {
      const cost = (s.net_meetings || 0) * 200;
      const revenue = s.revenue || s.total_funded_amount || 0;
      const margin = cost - revenue;
      const appPct = s.net_meetings > 0 ? Math.round((s.apps / s.net_meetings) * 100) : null;
      const fundingPct = s.apps > 0 ? Math.round((s.deals_funded / s.apps) * 100) : null;
      return [name, { ...s, cost, revenue, margin, app_pct: appPct, funding_pct: fundingPct }];
    })
    .sort((a, b) => { const av = a[1][sortCol] ?? -Infinity; const bv = b[1][sortCol] ?? -Infinity; return sortDir === 'desc' ? bv - av : av - bv; })
    : [];

  const t = metrics?.totals || {};
  const totalCost = (t.net_meetings || 0) * 200;
  const totalMargin = totalCost - (t.revenue || 0);

  return (
    <div className="p-6 max-w-full mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center"><BarChart2 size={16} className="text-white" /></div>
          <div><h1 className="text-gray-900 font-semibold text-lg">Waymo Data</h1><p className="text-gray-400 text-xs">Calendly + Zoho CRM · Full funnel by rep</p></div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3">
              <p className="text-gray-400 text-xs mb-0.5">Total Meetings</p>
              <p className="text-gray-900 text-lg font-bold">{t.total_meetings}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3">
              <p className="text-gray-400 text-xs mb-0.5">No Shows</p>
              <p className="text-red-500 text-lg font-bold">{t.no_shows}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3">
              <p className="text-gray-400 text-xs mb-0.5">Net Meetings</p>
              <p className="text-gray-900 text-lg font-bold">{t.net_meetings}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3">
              <p className="text-gray-400 text-xs mb-0.5">Show-Up Rate</p>
              <p className="text-green-600 text-lg font-bold">{t.show_up_rate}%</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3">
              <p className="text-gray-400 text-xs mb-0.5">Apps</p>
              <p className="text-blue-600 text-lg font-bold">{t.apps}</p>
              <p className="text-gray-300 text-xs">{t.meeting_to_app_rate}% of net</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3">
              <p className="text-gray-400 text-xs mb-0.5">Approvals / Apps</p>
              <p className="text-purple-600 text-lg font-bold">{t.approved} / {t.apps}</p>
              <p className="text-gray-300 text-xs">{t.approval_rate}%</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3">
              <p className="text-gray-400 text-xs mb-0.5">Funded</p>
              <p className="text-gray-900 text-lg font-bold">{t.funded}</p>
              <p className="text-gray-300 text-xs">{money(t.total_funded_amount)}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3">
              <p className="text-gray-400 text-xs mb-0.5">Avg Deal / Pts</p>
              <p className="text-gray-900 text-lg font-bold">{money(t.avg_deal_size)}</p>
              <p className="text-gray-300 text-xs">{t.avg_pts} pts</p>
            </div>
          </div>

          {/* Second row: cost/revenue/margin */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3">
              <p className="text-gray-400 text-xs mb-0.5">Cost</p>
              <p className="text-red-500 text-lg font-bold">{money(t.cost)}</p>
              <p className="text-gray-300 text-xs">{t.total_meetings} × $200</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3">
              <p className="text-gray-400 text-xs mb-0.5">Revenue</p>
              <p className="text-green-600 text-lg font-bold">{money(t.revenue)}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3">
              <p className="text-gray-400 text-xs mb-0.5">Margin</p>
              <p className={`text-lg font-bold ${totalMargin >= 0 ? 'text-green-600' : 'text-red-500'}`}>{money(totalMargin)}</p>
            </div>
          </div>

          <p className="text-gray-400 text-xs italic">* All rates calculated with no-shows factored out. Cost = $200 × net meetings per rep. Red &lt;15%, Yellow 15-35%, Green ≥35%.</p>

          {/* Rep table — wide */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-gray-900 font-semibold text-sm">Rep Breakdown</h3>
              <p className="text-gray-400 text-xs">Click headers to sort</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '1100px' }}>
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-3 py-3 text-gray-400 text-xs font-medium">Rep</th>
                    <SortHeader col="calendly_scheduled" label="Meetings" />
                    <SortHeader col="net_meetings" label="Net Mtgs" />
                    <SortHeader col="apps" label="Apps" />
                    <SortHeader col="app_pct" label="App %" />
                    <SortHeader col="deals_funded" label="Approvals" />
                    <SortHeader col="funding_pct" label="Funding %" />
                    <SortHeader col="total_funded_amount" label="Total Funded" />
                    <SortHeader col="avg_pts" label="Avg Pts" />
                    <SortHeader col="avg_deal_size" label="Avg Deal" />
                    <SortHeader col="revenue" label="Revenue" />
                    <SortHeader col="cost" label="Cost" />
                    <SortHeader col="margin" label="Margin" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedReps.map(([name, s]) => (
                    <tr key={name} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2.5 text-gray-900 font-medium whitespace-nowrap">{name}</td>
                      <td className="px-3 py-2.5 text-gray-700">{s.calendly_scheduled || 0}</td>
                      <td className="px-3 py-2.5 text-gray-900 font-medium">{s.net_meetings || 0}</td>
                      <td className="px-3 py-2.5 text-gray-700">{s.apps || 0}</td>
                      <td className="px-3 py-2.5">{badge(s.app_pct)}</td>
                      <td className="px-3 py-2.5 text-gray-900 font-semibold">{s.deals_funded || 0}</td>
                      <td className="px-3 py-2.5">{badge(s.funding_pct)}</td>
                      <td className="px-3 py-2.5 text-gray-900 font-medium">{money(s.total_funded_amount)}</td>
                      <td className="px-3 py-2.5 text-gray-700">{s.avg_pts || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-700">{money(s.avg_deal_size)}</td>
                      <td className="px-3 py-2.5 text-green-600 font-medium">{money(s.revenue)}</td>
                      <td className="px-3 py-2.5 text-red-500">{money(s.cost)}</td>
                      <td className="px-3 py-2.5"><span className={`font-medium ${s.margin >= 0 ? 'text-green-600' : 'text-red-500'}`}>{money(s.margin)}</span></td>
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
