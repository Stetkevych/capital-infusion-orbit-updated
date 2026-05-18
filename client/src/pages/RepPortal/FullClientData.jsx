import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, Users, Loader2, RefreshCw, X, BarChart2, DollarSign } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

export default function FullClientData() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRep, setSelectedRep] = useState(null);
  const [compareReps, setCompareReps] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/calendly/full-data`, { headers });
      if (!res.ok) throw new Error('Failed to load data');
      setData(await res.json());
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const reps = useMemo(() => {
    if (!data?.rep_data) return [];
    return Object.entries(data.rep_data).sort((a, b) => b[1].total_funded_amount - a[1].total_funded_amount);
  }, [data]);

  const average = useMemo(() => {
    const pool = compareReps.length > 0
      ? compareReps.map(name => data?.rep_data?.[name]).filter(Boolean)
      : Object.values(data?.rep_data || {});
    if (pool.length === 0) return null;
    return {
      deals_total: Math.round(pool.reduce((s, r) => s + r.deals_total, 0) / pool.length),
      total_funded_amount: Math.round(pool.reduce((s, r) => s + r.total_funded_amount, 0) / pool.length),
      avg_deal_size: Math.round(pool.reduce((s, r) => s + r.avg_deal_size, 0) / pool.length),
      avg_pts: Math.round((pool.reduce((s, r) => s + r.avg_pts, 0) / pool.length) * 10) / 10,
      funding_rate: Math.round(pool.reduce((s, r) => s + r.funding_rate, 0) / pool.length),
      deals_won: Math.round(pool.reduce((s, r) => s + r.deals_won, 0) / pool.length),
    };
  }, [data, compareReps]);

  const toggleCompare = (name) => {
    setCompareReps(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const money = (v) => v != null ? `$${v.toLocaleString()}` : '—';
  const pct = (v) => v != null ? `${v}%` : '—';

  const CompareBar = ({ label, value, avg, format = 'number' }) => {
    const maxVal = Math.max(value || 0, avg || 0, 1);
    const valPct = ((value || 0) / maxVal) * 100;
    const avgPct = ((avg || 0) / maxVal) * 100;
    const fmt = (v) => format === 'money' ? money(v) : format === 'pct' ? pct(v) : v;
    const isAbove = (value || 0) >= (avg || 0);
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{label}</span>
          <span className={`text-xs font-semibold ${isAbove ? 'text-green-600' : 'text-red-500'}`}>{fmt(value)} <span className="text-gray-300">vs</span> {fmt(avg)}</span>
        </div>
        <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full" style={{ width: `${valPct}%` }} />
          <div className="absolute top-0 h-full w-0.5 bg-amber-500" style={{ left: `${avgPct}%` }} title="Average" />
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center">
            <TrendingUp size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-gray-900 font-semibold text-lg">Full Client Data</h1>
            <p className="text-gray-400 text-xs">All sources · Zoho CRM · Interactive BI</p>
          </div>
        </div>
        <button onClick={load} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"><RefreshCw size={13} className="text-gray-500" /></button>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

      {loading ? (
        <div className="text-center py-20"><Loader2 size={24} className="mx-auto animate-spin text-gray-300" /></div>
      ) : data && (
        <>
          {/* Org Totals */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Total Deals</p>
              <p className="text-gray-900 text-2xl font-bold">{data.totals.deals}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Deals Won</p>
              <p className="text-green-600 text-2xl font-bold">{data.totals.deals_won}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Funding Rate</p>
              <p className="text-blue-600 text-2xl font-bold">{data.totals.funding_rate}%</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Avg Deal Size</p>
              <p className="text-gray-900 text-2xl font-bold">{money(data.totals.avg_deal_size)}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-gray-400 text-xs font-medium mb-1">Total Funded</p>
              <p className="text-gray-900 text-2xl font-bold">{money(data.totals.funded_amount)}</p>
            </div>
          </div>

          {/* Compare selector */}
          {compareReps.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center gap-2 flex-wrap">
              <span className="text-amber-700 text-xs font-medium">Comparing average of:</span>
              {compareReps.map(name => (
                <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full">
                  {name} <button onClick={() => toggleCompare(name)}><X size={10} /></button>
                </span>
              ))}
              <button onClick={() => setCompareReps([])} className="text-amber-600 text-xs hover:underline ml-2">Clear all</button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rep List */}
            <div className="lg:col-span-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-gray-900 font-semibold text-sm">Reps</h3>
                <p className="text-gray-400 text-xs">Click to inspect · Checkbox to compare</p>
              </div>
              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                {reps.map(([name, s]) => (
                  <div key={name} className={`px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${selectedRep === name ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''}`}>
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

            {/* Rep Detail / BI Panel */}
            <div className="lg:col-span-2">
              {selectedRep && data.rep_data[selectedRep] ? (() => {
                const s = data.rep_data[selectedRep];
                return (
                  <div className="space-y-4">
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <h2 className="text-gray-900 font-bold text-lg">{selectedRep}</h2>
                          <p className="text-gray-400 text-xs">{s.deals_total} total deals · {s.deals_won} won</p>
                        </div>
                        <button onClick={() => setSelectedRep(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-gray-400 text-xs">Total Funded</p>
                          <p className="text-gray-900 font-bold text-lg">{money(s.total_funded_amount)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-gray-400 text-xs">Avg Deal</p>
                          <p className="text-gray-900 font-bold text-lg">{money(s.avg_deal_size)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-gray-400 text-xs">Funding Rate</p>
                          <p className="text-gray-900 font-bold text-lg">{s.funding_rate}%</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-gray-400 text-xs">Avg Pts/Deal</p>
                          <p className="text-gray-900 font-bold text-lg">{s.avg_pts}</p>
                        </div>
                      </div>

                      {/* Comparison bars vs average */}
                      {average && (
                        <div className="space-y-4">
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">vs {compareReps.length > 0 ? 'Selected' : 'Team'} Average <span className="text-amber-500">(amber line)</span></p>
                          <CompareBar label="Total Funded" value={s.total_funded_amount} avg={average.total_funded_amount} format="money" />
                          <CompareBar label="Avg Deal Size" value={s.avg_deal_size} avg={average.avg_deal_size} format="money" />
                          <CompareBar label="Deals Won" value={s.deals_won} avg={average.deals_won} />
                          <CompareBar label="Funding Rate" value={s.funding_rate} avg={average.funding_rate} format="pct" />
                          <CompareBar label="Avg Pts/Deal" value={s.avg_pts} avg={average.avg_pts} />
                          <CompareBar label="Total Deals" value={s.deals_total} avg={average.deals_total} />
                        </div>
                      )}
                    </div>

                    {/* Sources breakdown */}
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
                      <h3 className="text-gray-900 font-semibold text-sm mb-3">Deal Sources</h3>
                      <div className="space-y-2">
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
                  </div>
                );
              })() : (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center">
                  <Users size={32} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-400 text-sm">Click a rep to view their detailed stats</p>
                  <p className="text-gray-300 text-xs mt-1">Use checkboxes to build a comparison average</p>
                </div>
              )}
            </div>
          </div>

          {/* Full rep table */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-gray-900 font-semibold text-sm">All Reps — Full Pipeline</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['Rep', 'Deals', 'Won', 'Funding %', 'Avg Deal', 'Avg Pts', 'Total Funded'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-gray-400 text-xs font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reps.map(([name, s]) => (
                    <tr key={name} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setSelectedRep(name)}>
                      <td className="px-4 py-3 text-gray-900 font-medium">{name}</td>
                      <td className="px-4 py-3 text-gray-700">{s.deals_total}</td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">{s.deals_won}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${s.funding_rate >= 70 ? 'bg-green-50 text-green-600' : s.funding_rate >= 40 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>{s.funding_rate}%</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{money(s.avg_deal_size)}</td>
                      <td className="px-4 py-3 text-gray-700">{s.avg_pts}</td>
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
