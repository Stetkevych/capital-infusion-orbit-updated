import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, Users, Loader2, RefreshCw, X } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

function LineGraph({ data, labels, colors, height = 200, title }) {
  if (!data || data.length === 0 || !data[0]?.length) return null;
  const maxVal = Math.max(...data.flat(), 1);
  const w = 600, h = height, pad = 40;
  const stepX = (w - pad * 2) / Math.max(labels.length - 1, 1);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
      {title && <h3 className="text-gray-900 font-semibold text-sm mb-3">{title}</h3>}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: `${height}px` }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => (
          <g key={pct}>
            <line x1={pad} y1={pad + (h - pad * 2) * (1 - pct)} x2={w - pad} y2={pad + (h - pad * 2) * (1 - pct)} stroke="#f0f0f0" strokeWidth="1" />
            <text x={pad - 5} y={pad + (h - pad * 2) * (1 - pct) + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{Math.round(maxVal * pct)}</text>
          </g>
        ))}
        {/* Lines */}
        {data.map((series, si) => {
          const points = series.map((v, i) => `${pad + i * stepX},${pad + (h - pad * 2) * (1 - v / maxVal)}`).join(' ');
          return <polyline key={si} points={points} fill="none" stroke={colors[si] || '#6366f1'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />;
        })}
        {/* Dots */}
        {data.map((series, si) => series.map((v, i) => (
          <circle key={`${si}-${i}`} cx={pad + i * stepX} cy={pad + (h - pad * 2) * (1 - v / maxVal)} r="3.5" fill={colors[si] || '#6366f1'} />
        )))}
        {/* X labels */}
        {labels.map((l, i) => (
          <text key={i} x={pad + i * stepX} y={h - 8} textAnchor="middle" fontSize="9" fill="#9ca3af">{l}</text>
        ))}
      </svg>
    </div>
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
  const [graphMetric, setGraphMetric] = useState('total_funded_amount');

  const headers = { Authorization: `Bearer ${token}` };
  const load = async () => { setLoading(true); setError(''); try { const r = await fetch(`${API}/calendly/full-data`, { headers }); if (!r.ok) throw new Error('Failed'); setData(await r.json()); } catch (e) { setError(e.message); } setLoading(false); };
  useEffect(() => { load(); }, []);

  const allSources = useMemo(() => {
    if (!data?.rep_data) return [];
    const s = new Set();
    Object.values(data.rep_data).forEach(r => Object.keys(r.sources || {}).forEach(src => s.add(src)));
    return ['All', ...Array.from(s).sort()];
  }, [data]);

  const reps = useMemo(() => {
    if (!data?.rep_data) return [];
    return Object.entries(data.rep_data)
      .filter(([, s]) => sourceFilter === 'All' || (s.sources || {})[sourceFilter])
      .sort((a, b) => b[1].total_funded_amount - a[1].total_funded_amount);
  }, [data, sourceFilter]);

  const average = useMemo(() => {
    const pool = compareReps.length > 0 ? compareReps.map(n => data?.rep_data?.[n]).filter(Boolean) : reps.map(([, s]) => s);
    if (!pool.length) return null;
    return {
      deals_total: Math.round(pool.reduce((s, r) => s + r.deals_total, 0) / pool.length),
      total_funded_amount: Math.round(pool.reduce((s, r) => s + r.total_funded_amount, 0) / pool.length),
      avg_deal_size: Math.round(pool.reduce((s, r) => s + r.avg_deal_size, 0) / pool.length),
      avg_pts: Math.round((pool.reduce((s, r) => s + r.avg_pts, 0) / pool.length) * 10) / 10,
    };
  }, [data, compareReps, reps]);

  // Line graph data: selected rep vs average (or compare group)
  const graphData = useMemo(() => {
    const metrics = ['deals_total', 'total_funded_amount', 'avg_deal_size', 'avg_pts'];
    const labels = ['Deals', 'Total $', 'Avg Deal', 'Avg Pts'];
    if (!selectedRep || !data?.rep_data?.[selectedRep] || !average) return { data: [], labels: [], colors: [] };
    const s = data.rep_data[selectedRep];
    const repVals = metrics.map(m => s[m] || 0);
    const avgVals = metrics.map(m => average[m] || 0);
    return { data: [repVals, avgVals], labels, colors: ['#6366f1', '#f59e0b'] };
  }, [selectedRep, data, average]);

  // Multi-rep overlay graph
  const multiGraph = useMemo(() => {
    if (compareReps.length < 2 || !data?.rep_data) return null;
    const metrics = ['deals_total', 'total_funded_amount', 'avg_deal_size', 'avg_pts'];
    const labels = ['Deals', 'Total $', 'Avg Deal', 'Avg Pts'];
    const colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
    const series = compareReps.map(name => {
      const s = data.rep_data[name];
      return s ? metrics.map(m => s[m] || 0) : metrics.map(() => 0);
    });
    return { data: series, labels, colors, names: compareReps };
  }, [compareReps, data]);

  const toggleCompare = (name) => setCompareReps(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  const money = (v) => v != null ? `$${v.toLocaleString()}` : '—';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center"><TrendingUp size={16} className="text-white" /></div>
          <div>
            <h1 className="text-gray-900 font-semibold text-lg">Full Client Data</h1>
            <p className="text-gray-400 text-xs">All sources · Zoho CRM · Interactive BI</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20">
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
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Total Deals</p>
              <p className="text-gray-900 text-2xl font-bold">{data.totals.deals}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Total Funded</p>
              <p className="text-gray-900 text-2xl font-bold">{money(data.totals.funded_amount)}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Avg Deal</p>
              <p className="text-gray-900 text-2xl font-bold">{money(data.totals.avg_deal_size)}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Revenue</p>
              <p className="text-green-600 text-2xl font-bold">{money(data.totals.revenue)}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Total Pts</p>
              <p className="text-gray-900 text-2xl font-bold">{Math.round(data.totals.total_pts)}</p>
            </div>
          </div>

          {/* Compare chips */}
          {compareReps.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center gap-2 flex-wrap">
              <span className="text-amber-700 text-xs font-medium">Overlay:</span>
              {compareReps.map(name => (
                <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full">
                  {name} <button onClick={() => toggleCompare(name)}><X size={10} /></button>
                </span>
              ))}
              <button onClick={() => setCompareReps([])} className="text-amber-600 text-xs hover:underline ml-2">Clear</button>
            </div>
          )}

          {/* Multi-rep line graph overlay */}
          {multiGraph && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <h3 className="text-gray-900 font-semibold text-sm mb-2">Rep Comparison Overlay</h3>
              <div className="flex gap-3 mb-3 flex-wrap">
                {multiGraph.names.map((n, i) => (
                  <span key={n} className="inline-flex items-center gap-1.5 text-xs">
                    <span className="w-3 h-3 rounded-full" style={{ background: multiGraph.colors[i] }} />
                    {n}
                  </span>
                ))}
              </div>
              <LineGraph data={multiGraph.data} labels={multiGraph.labels} colors={multiGraph.colors} height={220} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rep list */}
            <div className="lg:col-span-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-gray-900 font-semibold text-sm">Reps</h3>
                <p className="text-gray-400 text-xs">Click to inspect · Checkbox to overlay</p>
              </div>
              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                {reps.map(([name, s]) => (
                  <div key={name} className={`px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 ${selectedRep === name ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''}`}>
                    <input type="checkbox" checked={compareReps.includes(name)} onChange={() => toggleCompare(name)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-amber-500 focus:ring-amber-500/20" />
                    <div className="flex-1 min-w-0" onClick={() => setSelectedRep(name)}>
                      <p className="text-gray-900 text-sm font-medium truncate">{name}</p>
                      <p className="text-gray-400 text-xs">{s.deals_total} deals · {money(s.total_funded_amount)}</p>
                    </div>
                    <span className="text-xs text-gray-400">{s.avg_pts} pts</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detail panel */}
            <div className="lg:col-span-2 space-y-4">
              {selectedRep && data.rep_data[selectedRep] ? (() => {
                const s = data.rep_data[selectedRep];
                return (
                  <>
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <h2 className="text-gray-900 font-bold text-lg">{selectedRep}</h2>
                          <p className="text-gray-400 text-xs">{s.deals_total} deals</p>
                        </div>
                        <button onClick={() => setSelectedRep(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                        <div className="bg-gray-50 rounded-xl p-3"><p className="text-gray-400 text-xs">Total Funded</p><p className="text-gray-900 font-bold text-lg">{money(s.total_funded_amount)}</p></div>
                        <div className="bg-gray-50 rounded-xl p-3"><p className="text-gray-400 text-xs">Avg Deal</p><p className="text-gray-900 font-bold text-lg">{money(s.avg_deal_size)}</p></div>
                        <div className="bg-gray-50 rounded-xl p-3"><p className="text-gray-400 text-xs">Avg Pts</p><p className="text-gray-900 font-bold text-lg">{s.avg_pts}</p></div>
                        <div className="bg-gray-50 rounded-xl p-3"><p className="text-gray-400 text-xs">Revenue</p><p className="text-gray-900 font-bold text-lg">{money(s.revenue)}</p></div>
                      </div>
                    </div>

                    {/* Rep vs Average line graph */}
                    {graphData.data.length > 0 && (
                      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
                        <h3 className="text-gray-900 font-semibold text-sm mb-2">vs {compareReps.length > 0 ? 'Selected' : 'Team'} Average</h3>
                        <div className="flex gap-4 mb-3 text-xs">
                          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500" />{selectedRep}</span>
                          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" />Average</span>
                        </div>
                        <LineGraph data={graphData.data} labels={graphData.labels} colors={graphData.colors} height={180} />
                      </div>
                    )}

                    {/* Sources dropdown */}
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
                      <h3 className="text-gray-900 font-semibold text-sm mb-3">Deal Sources</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {Object.entries(s.sources || {}).sort((a, b) => b[1] - a[1]).map(([src, count]) => (
                          <div key={src} className="flex items-center justify-between">
                            <span className="text-gray-600 text-sm">{src}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(count / s.deals_total) * 100}%` }} />
                              </div>
                              <span className="text-gray-900 text-xs font-medium w-6 text-right">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })() : (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center">
                  <Users size={32} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-400 text-sm">Click a rep to view stats & line graph</p>
                  <p className="text-gray-300 text-xs mt-1">Check multiple reps for overlay comparison</p>
                </div>
              )}
            </div>
          </div>

          {/* Full table */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-gray-900 font-semibold text-sm">All Reps{sourceFilter !== 'All' ? ` — ${sourceFilter}` : ''}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['Rep', 'Deals', 'Avg Deal', 'Avg Pts', 'Revenue', 'Total Funded'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-gray-400 text-xs font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
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
