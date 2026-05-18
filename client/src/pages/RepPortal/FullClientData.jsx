import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, Users, Loader2, RefreshCw, X } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';
const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#a855f7', '#eab308', '#3b82f6'];

function LineChart({ series, labels, colors, names, height = 220, yFormat = 'number' }) {
  if (!series?.length || !series[0]?.length) return null;
  const maxVal = Math.max(...series.flat(), 1);
  const w = 700, h = height, pad = 50;
  const stepX = labels.length > 1 ? (w - pad * 2) / (labels.length - 1) : 0;
  const fmt = (v) => yFormat === 'money' ? `$${(v / 1000).toFixed(0)}k` : yFormat === 'pct' ? `${v}%` : v;

  return (
    <div>
      {names && <div className="flex gap-3 mb-3 flex-wrap">{names.map((n, i) => <span key={n} className="inline-flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded-full" style={{ background: colors[i % colors.length] }} />{n}</span>)}</div>}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: `${height}px` }}>
        {[0, 0.25, 0.5, 0.75, 1].map(pct => (
          <g key={pct}><line x1={pad} y1={pad + (h - pad * 2) * (1 - pct)} x2={w - pad} y2={pad + (h - pad * 2) * (1 - pct)} stroke="#f0f0f0" strokeWidth="1" /><text x={pad - 5} y={pad + (h - pad * 2) * (1 - pct) + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{fmt(Math.round(maxVal * pct))}</text></g>
        ))}
        {series.map((s, si) => <polyline key={si} points={s.map((v, i) => `${pad + i * stepX},${pad + (h - pad * 2) * (1 - v / maxVal)}`).join(' ')} fill="none" stroke={colors[si % colors.length]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />)}
        {series.map((s, si) => s.map((v, i) => <circle key={`${si}-${i}`} cx={pad + i * stepX} cy={pad + (h - pad * 2) * (1 - v / maxVal)} r="3" fill={colors[si % colors.length]} />))}
        {labels.map((l, i) => <text key={i} x={pad + i * stepX} y={h - 8} textAnchor="middle" fontSize="9" fill="#9ca3af">{l}</text>)}
      </svg>
    </div>
  );
}

function StackedBar({ data, labels, sources, colors, height = 200 }) {
  if (!data?.length) return null;
  const maxVal = Math.max(...data.map(d => Object.values(d).reduce((s, v) => s + v, 0)), 1);
  const w = 700, h = height, pad = 50;
  const barW = Math.min(40, (w - pad * 2) / labels.length - 4);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: `${height}px` }}>
      {[0, 0.25, 0.5, 0.75, 1].map(pct => (
        <g key={pct}><line x1={pad} y1={pad + (h - pad * 2) * (1 - pct)} x2={w - pad} y2={pad + (h - pad * 2) * (1 - pct)} stroke="#f0f0f0" strokeWidth="1" /><text x={pad - 5} y={pad + (h - pad * 2) * (1 - pct) + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{Math.round(maxVal * pct)}</text></g>
      ))}
      {data.map((d, i) => {
        const x = pad + i * ((w - pad * 2) / labels.length) + barW / 2;
        let y = h - pad;
        return sources.map((src, si) => {
          const val = d[src] || 0;
          const barH = (val / maxVal) * (h - pad * 2);
          y -= barH;
          return <rect key={`${i}-${si}`} x={x} y={y} width={barW} height={barH} fill={colors[si % colors.length]} rx="2" />;
        });
      })}
      {labels.map((l, i) => <text key={i} x={pad + i * ((w - pad * 2) / labels.length) + barW} y={h - 8} textAnchor="middle" fontSize="8" fill="#9ca3af">{l}</text>)}
    </svg>
  );
}

export default function FullClientData() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRep, setSelectedRep] = useState(null);
  const [compareReps, setCompareReps] = useState([]);
  const [sourceFilter, setSourceFilter] = useState('All');
  const [selectedSources, setSelectedSources] = useState([]);
  const [lineMetric, setLineMetric] = useState('funded_amt');
  const [timeRange, setTimeRange] = useState('all');

  const headers = { Authorization: `Bearer ${token}` };
  const load = async () => { setLoading(true); setError(''); try { const r = await fetch(`${API}/calendly/full-data`, { headers }); if (!r.ok) throw new Error('Failed'); setData(await r.json()); } catch (e) { setError(e.message); } setLoading(false); };
  useEffect(() => { load(); }, []);

  const allSources = useMemo(() => {
    if (!data?.by_month) return [];
    const s = new Set();
    Object.values(data.by_month).forEach(m => Object.keys(m.sources || {}).forEach(src => s.add(src)));
    return Array.from(s).sort();
  }, [data]);

  useEffect(() => { if (allSources.length && !selectedSources.length) setSelectedSources(allSources.slice(0, 6)); }, [allSources]);

  const months = useMemo(() => {
    if (!data?.by_month) return [];
    let m = Object.keys(data.by_month).sort();
    if (timeRange === '3m') m = m.slice(-3);
    else if (timeRange === '6m') m = m.slice(-6);
    else if (timeRange === '12m') m = m.slice(-12);
    return m;
  }, [data, timeRange]);

  const lineData = useMemo(() => {
    if (!months.length || !data?.by_month) return { series: [], labels: [], names: [] };
    const labels = months.map(m => m.slice(5));
    const series = [months.map(m => data.by_month[m]?.[lineMetric] || 0)];
    return { series, labels, names: [lineMetric === 'funded_amt' ? 'Funded $' : lineMetric === 'total' ? 'Deal Count' : lineMetric === 'pts' ? 'Points' : 'Revenue'] };
  }, [months, data, lineMetric]);

  const stackedData = useMemo(() => {
    if (!months.length || !data?.by_month) return { data: [], labels: [], sources: [] };
    const labels = months.map(m => m.slice(5));
    const barData = months.map(m => {
      const src = data.by_month[m]?.sources || {};
      const filtered = {};
      selectedSources.forEach(s => { if (src[s]) filtered[s] = src[s]; });
      return filtered;
    });
    return { data: barData, labels, sources: selectedSources };
  }, [months, data, selectedSources]);

  const reps = useMemo(() => {
    if (!data?.rep_data) return [];
    return Object.entries(data.rep_data)
      .filter(([, s]) => sourceFilter === 'All' || (s.sources || {})[sourceFilter])
      .sort((a, b) => b[1].total_funded_amount - a[1].total_funded_amount);
  }, [data, sourceFilter]);

  const average = useMemo(() => {
    const pool = compareReps.length > 0 ? compareReps.map(n => data?.rep_data?.[n]).filter(Boolean) : reps.map(([, s]) => s);
    if (!pool.length) return null;
    return { deals_total: Math.round(pool.reduce((s, r) => s + r.deals_total, 0) / pool.length), total_funded_amount: Math.round(pool.reduce((s, r) => s + r.total_funded_amount, 0) / pool.length), avg_deal_size: Math.round(pool.reduce((s, r) => s + r.avg_deal_size, 0) / pool.length), avg_pts: Math.round((pool.reduce((s, r) => s + r.avg_pts, 0) / pool.length) * 10) / 10 };
  }, [data, compareReps, reps]);

  const toggleCompare = (name) => setCompareReps(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  const toggleSource = (src) => setSelectedSources(prev => prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]);
  const money = (v) => v != null ? `$${v.toLocaleString()}` : '—';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center"><TrendingUp size={16} className="text-white" /></div>
          <div>
            <h1 className="text-gray-900 font-semibold text-lg">Full Rep Data</h1>
            <p className="text-gray-400 text-xs">All sources · Zoho CRM + Calendly · Interactive BI</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20">
            <option value="All">All Sources</option>
            {allSources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={load} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"><RefreshCw size={13} className="text-gray-500" /></button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

      {loading ? <div className="text-center py-20"><Loader2 size={24} className="mx-auto animate-spin text-gray-300" /></div> : data && (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4"><p className="text-gray-400 text-xs font-medium mb-1">Total Deals</p><p className="text-gray-900 text-2xl font-bold">{data.totals.deals}</p></div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4"><p className="text-gray-400 text-xs font-medium mb-1">Total Funded</p><p className="text-gray-900 text-2xl font-bold">{money(data.totals.funded_amount)}</p></div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4"><p className="text-gray-400 text-xs font-medium mb-1">Avg Deal</p><p className="text-gray-900 text-2xl font-bold">{money(data.totals.avg_deal_size)}</p></div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4"><p className="text-gray-400 text-xs font-medium mb-1">Revenue</p><p className="text-green-600 text-2xl font-bold">{money(data.totals.revenue)}</p></div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4"><p className="text-gray-400 text-xs font-medium mb-1">Total Pts</p><p className="text-gray-900 text-2xl font-bold">{Math.round(data.totals.total_pts)}</p></div>
          </div>

          {/* Line Graph — metric over time */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 font-semibold text-sm">Performance Over Time</h3>
              <div className="flex gap-2">
                <select value={lineMetric} onChange={e => setLineMetric(e.target.value)} className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700">
                  <option value="funded_amt">Funded Amount</option>
                  <option value="total">Deal Count</option>
                  <option value="pts">Points</option>
                  <option value="revenue">Revenue</option>
                </select>
                <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700">
                  <option value="all">All Time</option>
                  <option value="12m">Last 12 Months</option>
                  <option value="6m">Last 6 Months</option>
                  <option value="3m">Last 3 Months</option>
                </select>
              </div>
            </div>
            <LineChart series={lineData.series} labels={lineData.labels} colors={['#6366f1']} names={lineData.names} yFormat={lineMetric === 'funded_amt' || lineMetric === 'revenue' ? 'money' : 'number'} />
          </div>

          {/* Stacked Bar — by lead source */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-900 font-semibold text-sm">Deals by Lead Source (Stacked)</h3>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {allSources.map((src, i) => (
                <button key={src} onClick={() => toggleSource(src)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors ${selectedSources.includes(src) ? 'border-transparent text-white' : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'}`}
                  style={selectedSources.includes(src) ? { background: COLORS[allSources.indexOf(src) % COLORS.length] } : {}}>
                  {src}
                </button>
              ))}
            </div>
            <StackedBar data={stackedData.data} labels={stackedData.labels} sources={stackedData.sources} colors={selectedSources.map(s => COLORS[allSources.indexOf(s) % COLORS.length])} />
            <div className="flex flex-wrap gap-3 mt-3">
              {selectedSources.map((src, i) => <span key={src} className="inline-flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded-sm" style={{ background: COLORS[allSources.indexOf(src) % COLORS.length] }} />{src}</span>)}
            </div>
          </div>

          {/* Caveat */}
          <p className="text-gray-400 text-xs italic">* Calendly reschedules do not affect stats — only net unique appointments are counted. Canceled meetings that were rescheduled are excluded from no-show calculations.</p>

          {/* Compare chips */}
          {compareReps.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center gap-2 flex-wrap">
              <span className="text-amber-700 text-xs font-medium">Overlay:</span>
              {compareReps.map(name => <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full">{name} <button onClick={() => toggleCompare(name)}><X size={10} /></button></span>)}
              <button onClick={() => setCompareReps([])} className="text-amber-600 text-xs hover:underline ml-2">Clear</button>
            </div>
          )}

          {/* Multi-rep line overlay */}
          {compareReps.length >= 2 && data?.rep_data && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <h3 className="text-gray-900 font-semibold text-sm mb-3">Rep Comparison Overlay</h3>
              <LineChart
                series={compareReps.map(name => { const s = data.rep_data[name]; return s ? [s.deals_total, s.total_funded_amount / 1000, s.avg_deal_size / 1000, s.avg_pts * 10] : [0, 0, 0, 0]; })}
                labels={['Deals', 'Total $k', 'Avg $k', 'Pts×10']}
                colors={COLORS}
                names={compareReps}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rep list */}
            <div className="lg:col-span-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-gray-900 font-semibold text-sm">Reps</h3>
                <p className="text-gray-400 text-xs">Click to inspect · Checkbox to overlay</p>
              </div>
              <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                {reps.map(([name, s]) => (
                  <div key={name} className={`px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 ${selectedRep === name ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''}`}>
                    <input type="checkbox" checked={compareReps.includes(name)} onChange={() => toggleCompare(name)} className="w-3.5 h-3.5 rounded border-gray-300 text-amber-500" />
                    <div className="flex-1 min-w-0" onClick={() => setSelectedRep(name)}>
                      <p className="text-gray-900 text-sm font-medium truncate">{name}</p>
                      <p className="text-gray-400 text-xs">{s.deals_total} deals · {money(s.total_funded_amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detail */}
            <div className="lg:col-span-2 space-y-4">
              {selectedRep && data.rep_data[selectedRep] ? (() => {
                const s = data.rep_data[selectedRep];
                return (
                  <>
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="text-gray-900 font-bold text-lg">{selectedRep}</h2>
                        <button onClick={() => setSelectedRep(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                        <div className="bg-gray-50 rounded-xl p-3"><p className="text-gray-400 text-xs">Total Funded</p><p className="text-gray-900 font-bold text-lg">{money(s.total_funded_amount)}</p></div>
                        <div className="bg-gray-50 rounded-xl p-3"><p className="text-gray-400 text-xs">Avg Deal</p><p className="text-gray-900 font-bold text-lg">{money(s.avg_deal_size)}</p></div>
                        <div className="bg-gray-50 rounded-xl p-3"><p className="text-gray-400 text-xs">Avg Pts</p><p className="text-gray-900 font-bold text-lg">{s.avg_pts}</p></div>
                        <div className="bg-gray-50 rounded-xl p-3"><p className="text-gray-400 text-xs">Revenue</p><p className="text-gray-900 font-bold text-lg">{money(s.revenue)}</p></div>
                      </div>
                      {average && (
                        <div className="space-y-3">
                          <p className="text-xs text-gray-500 font-medium">vs {compareReps.length > 0 ? 'Selected' : 'Team'} Average</p>
                          {[['Total Funded', s.total_funded_amount, average.total_funded_amount], ['Avg Deal', s.avg_deal_size, average.avg_deal_size], ['Deals', s.deals_total, average.deals_total], ['Avg Pts', s.avg_pts, average.avg_pts]].map(([label, val, avg]) => {
                            const max = Math.max(val || 0, avg || 0, 1);
                            return (
                              <div key={label} className="space-y-1">
                                <div className="flex justify-between"><span className="text-xs text-gray-500">{label}</span><span className={`text-xs font-semibold ${(val || 0) >= (avg || 0) ? 'text-green-600' : 'text-red-500'}`}>{typeof val === 'number' && val > 1000 ? money(val) : val} vs {typeof avg === 'number' && avg > 1000 ? money(avg) : avg}</span></div>
                                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full" style={{ width: `${((val || 0) / max) * 100}%` }} />
                                  <div className="absolute top-0 h-full w-0.5 bg-amber-500" style={{ left: `${((avg || 0) / max) * 100}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
                      <h3 className="text-gray-900 font-semibold text-sm mb-3">Deal Sources</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {Object.entries(s.sources || {}).sort((a, b) => b[1] - a[1]).map(([src, count]) => (
                          <div key={src} className="flex items-center justify-between">
                            <span className="text-gray-600 text-sm">{src}</span>
                            <div className="flex items-center gap-2"><div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-purple-500 rounded-full" style={{ width: `${(count / s.deals_total) * 100}%` }} /></div><span className="text-gray-900 text-xs font-medium w-6 text-right">{count}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })() : (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center">
                  <Users size={32} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-400 text-sm">Click a rep to view stats</p>
                  <p className="text-gray-300 text-xs mt-1">Check multiple for overlay comparison</p>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h3 className="text-gray-900 font-semibold text-sm">All Reps{sourceFilter !== 'All' ? ` — ${sourceFilter}` : ''}</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-gray-50/50">{['Rep', 'Deals', 'Avg Deal', 'Avg Pts', 'Revenue', 'Total Funded'].map(h => <th key={h} className="text-left px-4 py-3 text-gray-400 text-xs font-medium">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {reps.map(([name, s]) => (
                    <tr key={name} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setSelectedRep(name)}>
                      <td className="px-4 py-3 text-gray-900 font-medium">{name}</td>
                      <td className="px-4 py-3 text-gray-700">{s.deals_total}</td>
                      <td className="px-4 py-3 text-gray-700">{money(s.avg_deal_size)}</td>
                      <td className="px-4 py-3 text-gray-700">{s.avg_pts}</td>
                      <td className="px-4 py-3 text-gray-700">{money(s.revenue)}</td>
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
