import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, Users, Loader2, RefreshCw, X, ChevronDown, ChevronRight } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';
const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#a855f7', '#eab308', '#3b82f6'];

function LineChart({ series, labels, colors, names, height = 180, yFormat = 'number' }) {
  if (!series?.length || !series[0]?.length || series[0].every(v => v === 0)) return <p className="text-gray-300 text-xs text-center py-8">No data</p>;
  const allVals = series.flat().filter(v => v > 0);
  const maxVal = allVals.length ? Math.max(...allVals) * 1.1 : 1;
  const minVal = 0;
  const w = 600, h = height, padL = 55, padR = 20, padT = 20, padB = 30;
  const chartW = w - padL - padR, chartH = h - padT - padB;
  const stepX = labels.length > 1 ? chartW / (labels.length - 1) : 0;
  const yScale = (v) => padT + chartH * (1 - (v - minVal) / (maxVal - minVal || 1));

  const fmt = (v) => {
    if (yFormat === 'money') return v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;
    return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));
  };

  const ticks = 5;
  const tickVals = Array.from({ length: ticks }, (_, i) => minVal + (maxVal - minVal) * (i / (ticks - 1)));

  return (
    <div>
      {names && <div className="flex gap-3 mb-2 flex-wrap">{names.map((n, i) => <span key={n} className="inline-flex items-center gap-1.5 text-xs"><span className="w-2.5 h-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />{n}</span>)}</div>}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {tickVals.map((v, i) => (
          <g key={i}>
            <line x1={padL} y1={yScale(v)} x2={w - padR} y2={yScale(v)} stroke="#f3f4f6" strokeWidth="1" />
            <text x={padL - 6} y={yScale(v) + 3} textAnchor="end" fontSize="9" fill="#9ca3af">{fmt(v)}</text>
          </g>
        ))}
        {series.map((s, si) => {
          const pts = s.map((v, i) => `${padL + i * stepX},${yScale(v)}`).join(' ');
          return <polyline key={si} points={pts} fill="none" stroke={colors[si % colors.length]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />;
        })}
        {series.map((s, si) => s.map((v, i) => <circle key={`${si}-${i}`} cx={padL + i * stepX} cy={yScale(v)} r="2.5" fill={colors[si % colors.length]} />))}
        {labels.map((l, i) => <text key={i} x={padL + i * stepX} y={h - 6} textAnchor="middle" fontSize="8" fill="#9ca3af">{l}</text>)}
      </svg>
    </div>
  );
}

function StackedBar({ data, labels, sources, colors, height = 160 }) {
  if (!data?.length) return <p className="text-gray-300 text-xs text-center py-8">No data</p>;
  const maxVal = Math.max(...data.map(d => Object.values(d).reduce((s, v) => s + v, 0)), 1) * 1.1;
  const w = 600, h = height, padL = 40, padR = 20, padT = 15, padB = 25;
  const chartW = w - padL - padR, chartH = h - padT - padB;
  const barW = Math.min(28, chartW / data.length - 3);
  const gap = (chartW - barW * data.length) / (data.length + 1);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {[0, 0.5, 1].map(pct => (
        <g key={pct}>
          <line x1={padL} y1={padT + chartH * (1 - pct)} x2={w - padR} y2={padT + chartH * (1 - pct)} stroke="#f3f4f6" strokeWidth="1" />
          <text x={padL - 4} y={padT + chartH * (1 - pct) + 3} textAnchor="end" fontSize="8" fill="#9ca3af">{Math.round(maxVal * pct)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = padL + gap + i * (barW + gap);
        let y = padT + chartH;
        return sources.map((src, si) => {
          const val = d[src] || 0;
          const barH = (val / maxVal) * chartH;
          y -= barH;
          return <rect key={`${i}-${si}`} x={x} y={y} width={barW} height={Math.max(barH, 0)} fill={colors[si % colors.length]} rx="1.5" />;
        });
      })}
      {labels.map((l, i) => <text key={i} x={padL + gap + i * (barW + gap) + barW / 2} y={h - 4} textAnchor="middle" fontSize="7" fill="#9ca3af">{l}</text>)}
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
  const [showSources, setShowSources] = useState(false);
  const [showBarChart, setShowBarChart] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };
  const load = async () => { setLoading(true); setError(''); try { const r = await fetch(`${API}/calendly/full-data`, { headers }); if (!r.ok) throw new Error('Failed'); setData(await r.json()); } catch (e) { setError(e.message); } setLoading(false); };
  useEffect(() => { load(); }, []);

  const allSources = useMemo(() => { if (!data?.by_month) return []; const s = new Set(); Object.values(data.by_month).forEach(m => Object.keys(m.sources || {}).forEach(src => s.add(src))); return Array.from(s).sort(); }, [data]);
  useEffect(() => { if (allSources.length && !selectedSources.length) setSelectedSources(allSources.slice(0, 5)); }, [allSources]);

  const months = useMemo(() => { if (!data?.by_month) return []; let m = Object.keys(data.by_month).sort(); if (timeRange === '3m') m = m.slice(-3); else if (timeRange === '6m') m = m.slice(-6); else if (timeRange === '12m') m = m.slice(-12); return m; }, [data, timeRange]);

  const lineData = useMemo(() => {
    if (!months.length || !data?.by_month) return { series: [], labels: [], names: [] };
    return { series: [months.map(m => data.by_month[m]?.[lineMetric] || 0)], labels: months.map(m => m.slice(5)), names: [{ funded_amt: 'Funded $', total: 'Deals', pts: 'Points', revenue: 'Revenue' }[lineMetric]] };
  }, [months, data, lineMetric]);

  const stackedData = useMemo(() => {
    if (!months.length || !data?.by_month) return { data: [], labels: [], sources: [] };
    return { data: months.map(m => { const src = data.by_month[m]?.sources || {}; const f = {}; selectedSources.forEach(s => { if (src[s]) f[s] = src[s]; }); return f; }), labels: months.map(m => m.slice(5)), sources: selectedSources };
  }, [months, data, selectedSources]);

  const reps = useMemo(() => { if (!data?.rep_data) return []; return Object.entries(data.rep_data).filter(([, s]) => sourceFilter === 'All' || (s.sources || {})[sourceFilter]).sort((a, b) => b[1].total_funded_amount - a[1].total_funded_amount); }, [data, sourceFilter]);

  const average = useMemo(() => { const pool = compareReps.length > 0 ? compareReps.map(n => data?.rep_data?.[n]).filter(Boolean) : reps.map(([, s]) => s); if (!pool.length) return null; return { deals_total: Math.round(pool.reduce((s, r) => s + r.deals_total, 0) / pool.length), total_funded_amount: Math.round(pool.reduce((s, r) => s + r.total_funded_amount, 0) / pool.length), avg_deal_size: Math.round(pool.reduce((s, r) => s + r.avg_deal_size, 0) / pool.length), avg_pts: Math.round((pool.reduce((s, r) => s + r.avg_pts, 0) / pool.length) * 10) / 10 }; }, [data, compareReps, reps]);

  const toggleCompare = (name) => setCompareReps(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  const toggleSource = (src) => setSelectedSources(prev => prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]);
  const money = (v) => v != null ? `$${v.toLocaleString()}` : '—';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center"><TrendingUp size={16} className="text-white" /></div>
          <div><h1 className="text-gray-900 font-semibold text-lg">Full Rep Data</h1><p className="text-gray-400 text-xs">All sources · Zoho CRM + Calendly</p></div>
        </div>
        <div className="flex items-center gap-3">
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none">
            <option value="All">All Sources</option>
            {allSources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={load} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"><RefreshCw size={13} className="text-gray-500" /></button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

      {loading ? <div className="text-center py-20"><Loader2 size={24} className="mx-auto animate-spin text-gray-300" /></div> : data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3"><p className="text-gray-400 text-xs mb-0.5">Total Deals</p><p className="text-gray-900 text-xl font-bold">{data.totals.deals}</p></div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3"><p className="text-gray-400 text-xs mb-0.5">Total Funded</p><p className="text-gray-900 text-xl font-bold">{money(data.totals.funded_amount)}</p></div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3"><p className="text-gray-400 text-xs mb-0.5">Avg Deal</p><p className="text-gray-900 text-xl font-bold">{money(data.totals.avg_deal_size)}</p></div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3"><p className="text-gray-400 text-xs mb-0.5">Revenue</p><p className="text-green-600 text-xl font-bold">{money(data.totals.revenue)}</p></div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3"><p className="text-gray-400 text-xs mb-0.5">Total Pts</p><p className="text-gray-900 text-xl font-bold">{Math.round(data.totals.total_pts)}</p></div>
          </div>

          {/* Line Graph */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-900 font-semibold text-sm">Performance Over Time</h3>
              <div className="flex gap-2">
                <select value={lineMetric} onChange={e => setLineMetric(e.target.value)} className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                  <option value="funded_amt">Funded Amount</option><option value="total">Deal Count</option><option value="pts">Points</option><option value="revenue">Revenue</option>
                </select>
                <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                  <option value="all">All Time</option><option value="12m">12 Months</option><option value="6m">6 Months</option><option value="3m">3 Months</option>
                </select>
              </div>
            </div>
            <LineChart series={lineData.series} labels={lineData.labels} colors={['#6366f1']} names={lineData.names} yFormat={lineMetric === 'funded_amt' || lineMetric === 'revenue' ? 'money' : 'number'} height={160} />
          </div>

          {/* Stacked Bar — collapsible */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
            <button onClick={() => setShowBarChart(!showBarChart)} className="w-full px-4 py-3 flex items-center justify-between text-left">
              <h3 className="text-gray-900 font-semibold text-sm">Deals by Lead Source</h3>
              {showBarChart ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
            </button>
            {showBarChart && (
              <div className="px-4 pb-4">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {allSources.map((src, i) => (
                    <button key={src} onClick={() => toggleSource(src)} className={`px-2 py-0.5 text-xs rounded-full border ${selectedSources.includes(src) ? 'text-white border-transparent' : 'border-gray-200 text-gray-500 bg-white'}`} style={selectedSources.includes(src) ? { background: COLORS[i % COLORS.length] } : {}}>{src}</button>
                  ))}
                </div>
                <StackedBar data={stackedData.data} labels={stackedData.labels} sources={stackedData.sources} colors={selectedSources.map(s => COLORS[allSources.indexOf(s) % COLORS.length])} height={140} />
                <div className="flex flex-wrap gap-2 mt-2">{selectedSources.map((src, i) => <span key={src} className="inline-flex items-center gap-1 text-xs"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[allSources.indexOf(src) % COLORS.length] }} />{src}</span>)}</div>
              </div>
            )}
          </div>

          <p className="text-gray-400 text-xs italic">* Calendly reschedules do not affect stats. Only net unique appointments counted.</p>

          {/* Compare chips */}
          {compareReps.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex items-center gap-2 flex-wrap">
              <span className="text-amber-700 text-xs font-medium">Overlay:</span>
              {compareReps.map(name => <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full">{name}<button onClick={() => toggleCompare(name)}><X size={9} /></button></span>)}
              <button onClick={() => setCompareReps([])} className="text-amber-600 text-xs hover:underline ml-1">Clear</button>
            </div>
          )}

          {/* Multi-rep overlay */}
          {compareReps.length >= 2 && data?.rep_data && (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
              <h3 className="text-gray-900 font-semibold text-sm mb-2">Rep Overlay</h3>
              <LineChart series={compareReps.map(name => { const s = data.rep_data[name]; return s ? [s.deals_total, s.total_funded_amount / 1000, s.avg_deal_size / 1000, s.avg_pts * 10] : [0, 0, 0, 0]; })} labels={['Deals', 'Total $k', 'Avg $k', 'Pts×10']} colors={COLORS} names={compareReps} height={160} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-1 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100"><h3 className="text-gray-900 font-semibold text-sm">Reps</h3><p className="text-gray-400 text-xs">Click · Checkbox to overlay</p></div>
              <div className="divide-y divide-gray-50 max-h-[450px] overflow-y-auto">
                {reps.map(([name, s]) => (
                  <div key={name} className={`px-4 py-2.5 flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 ${selectedRep === name ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''}`}>
                    <input type="checkbox" checked={compareReps.includes(name)} onChange={() => toggleCompare(name)} className="w-3 h-3 rounded border-gray-300 text-amber-500" />
                    <div className="flex-1 min-w-0" onClick={() => setSelectedRep(name)}>
                      <p className="text-gray-900 text-sm font-medium truncate">{name}</p>
                      <p className="text-gray-400 text-xs">{s.deals_total} · {money(s.total_funded_amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {selectedRep && data.rep_data[selectedRep] ? (() => {
                const s = data.rep_data[selectedRep];
                return (
                  <>
                    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-gray-900 font-bold text-base">{selectedRep}</h2>
                        <button onClick={() => setSelectedRep(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="bg-gray-50 rounded-lg p-2.5"><p className="text-gray-400 text-xs">Funded</p><p className="text-gray-900 font-bold">{money(s.total_funded_amount)}</p></div>
                        <div className="bg-gray-50 rounded-lg p-2.5"><p className="text-gray-400 text-xs">Avg Deal</p><p className="text-gray-900 font-bold">{money(s.avg_deal_size)}</p></div>
                        <div className="bg-gray-50 rounded-lg p-2.5"><p className="text-gray-400 text-xs">Avg Pts</p><p className="text-gray-900 font-bold">{s.avg_pts}</p></div>
                        <div className="bg-gray-50 rounded-lg p-2.5"><p className="text-gray-400 text-xs">Revenue</p><p className="text-gray-900 font-bold">{money(s.revenue)}</p></div>
                      </div>
                      {average && (
                        <div className="space-y-2.5">
                          <p className="text-xs text-gray-500 font-medium">vs {compareReps.length > 0 ? 'Selected' : 'Team'} Avg</p>
                          {[['Funded', s.total_funded_amount, average.total_funded_amount, 'money'], ['Avg Deal', s.avg_deal_size, average.avg_deal_size, 'money'], ['Deals', s.deals_total, average.deals_total, 'num'], ['Pts', s.avg_pts, average.avg_pts, 'num']].map(([label, val, avg, type]) => {
                            const max = Math.max(val || 0, avg || 0, 1);
                            const fmtV = type === 'money' ? money(val) : val;
                            const fmtA = type === 'money' ? money(avg) : avg;
                            return (<div key={label} className="space-y-0.5"><div className="flex justify-between"><span className="text-xs text-gray-500">{label}</span><span className={`text-xs font-semibold ${(val || 0) >= (avg || 0) ? 'text-green-600' : 'text-red-500'}`}>{fmtV} vs {fmtA}</span></div><div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full" style={{ width: `${((val || 0) / max) * 100}%` }} /><div className="absolute top-0 h-full w-0.5 bg-amber-500" style={{ left: `${((avg || 0) / max) * 100}%` }} /></div></div>);
                          })}
                        </div>
                      )}
                    </div>
                    {/* Sources — collapsible */}
                    <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
                      <button onClick={() => setShowSources(!showSources)} className="w-full px-4 py-3 flex items-center justify-between text-left">
                        <h3 className="text-gray-900 font-semibold text-sm">Deal Sources ({Object.keys(s.sources || {}).length})</h3>
                        {showSources ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                      </button>
                      {showSources && (
                        <div className="px-4 pb-3 space-y-1.5 max-h-40 overflow-y-auto">
                          {Object.entries(s.sources || {}).sort((a, b) => b[1] - a[1]).map(([src, count]) => (
                            <div key={src} className="flex items-center justify-between">
                              <span className="text-gray-600 text-xs">{src}</span>
                              <div className="flex items-center gap-1.5"><div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-purple-500 rounded-full" style={{ width: `${(count / s.deals_total) * 100}%` }} /></div><span className="text-gray-900 text-xs font-medium w-5 text-right">{count}</span></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                );
              })() : (
                <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-10 text-center">
                  <Users size={28} className="mx-auto mb-2 text-gray-200" />
                  <p className="text-gray-400 text-sm">Click a rep to view stats</p>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100"><h3 className="text-gray-900 font-semibold text-sm">All Reps{sourceFilter !== 'All' ? ` — ${sourceFilter}` : ''}</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-gray-50/50">{['Rep', 'Deals', 'Avg Deal', 'Avg Pts', 'Revenue', 'Total Funded'].map(h => <th key={h} className="text-left px-4 py-2.5 text-gray-400 text-xs font-medium">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {reps.map(([name, s]) => (
                    <tr key={name} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setSelectedRep(name)}>
                      <td className="px-4 py-2.5 text-gray-900 font-medium text-sm">{name}</td>
                      <td className="px-4 py-2.5 text-gray-700 text-sm">{s.deals_total}</td>
                      <td className="px-4 py-2.5 text-gray-700 text-sm">{money(s.avg_deal_size)}</td>
                      <td className="px-4 py-2.5 text-gray-700 text-sm">{s.avg_pts}</td>
                      <td className="px-4 py-2.5 text-gray-700 text-sm">{money(s.revenue)}</td>
                      <td className="px-4 py-2.5 text-gray-900 font-medium text-sm">{money(s.total_funded_amount)}</td>
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
