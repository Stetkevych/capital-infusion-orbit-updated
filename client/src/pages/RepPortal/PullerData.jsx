import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, LineChart, Line, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Database, TrendingUp, Filter, RefreshCw, Loader2, Download, Users, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];
const STATUS_COLORS = { approved: '#10b981', declined: '#ef4444', default: '#f59e0b', fraud: '#dc2626', pending: '#6b7280' };
const LEAD_SOURCES = ['Apple','Avocado','BMW','Business Loan AI','BusinessLoans','Chevy','Dodge','Employee','Facebook','Ferrari','Funnel','Hidden','ISO','Lending','Mailer','PHIL','Porsche','Referral','ROKUS','SPO','T&E','Toyota - Camry','Toyota - Yaris','Website','Waymo'];

function StatCard({ label, value, sub, icon: Icon, color = 'blue' }) {
  const bg = { blue: 'bg-blue-50', green: 'bg-green-50', red: 'bg-red-50', amber: 'bg-amber-50', purple: 'bg-purple-50' };
  const text = { blue: 'text-blue-600', green: 'text-green-600', red: 'text-red-600', amber: 'text-amber-600', purple: 'text-purple-600' };
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        {Icon && <div className={`w-7 h-7 ${bg[color]} rounded-lg flex items-center justify-center`}><Icon size={13} className={text[color]} /></div>}
      </div>
      <p className={`text-2xl font-bold ${text[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`bg-white border border-gray-100 rounded-xl shadow-sm p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function PullerData() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ rep: '', leadSource: '', dateRange: 'all' });
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/puller-data?days=${filters.dateRange}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch puller data');
      setData(await res.json());
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filters.dateRange]);

  const filtered = useMemo(() => {
    if (!data?.deals) return [];
    return data.deals.filter(d => {
      if (d.is_future_appointment) return false;
      if (filters.rep && d.rep_name !== filters.rep) return false;
      if (filters.leadSource && d.lead_source !== filters.leadSource) return false;
      return true;
    });
  }, [data, filters]);

  // Computed metrics
  const metrics = useMemo(() => {
    if (!filtered.length) return null;
    const total = filtered.length;
    const apps = filtered.filter(d => d.source_module === 'Accounts').length;
    const approved = filtered.filter(d => d.status === 'approved').length;
    const declined = filtered.filter(d => ['declined', 'default', 'fraud'].includes(d.status)).length;
    const funded = filtered.filter(d => d.status === 'approved' && d.amount > 0).length;
    const approvalRate = apps > 0 ? ((approved / apps) * 100).toFixed(1) : 0;
    const fundingRate = apps > 0 ? ((funded / apps) * 100).toFixed(1) : 0;
    const totalRevenue = filtered.reduce((s, d) => s + (d.status === 'approved' ? (d.amount || 0) : 0), 0);
    const totalCost = filtered.reduce((s, d) => s + (['declined', 'default', 'fraud'].includes(d.status) ? (d.amount || 0) : 0), 0);
    return { total, apps, approved, declined, funded, approvalRate, fundingRate, totalRevenue, totalCost };
  }, [filtered]);

  // Rep breakdown
  const repData = useMemo(() => {
    if (!filtered.length) return [];
    const map = {};
    filtered.forEach(d => {
      if (!map[d.rep_name]) map[d.rep_name] = { name: d.rep_name, total: 0, approved: 0, declined: 0 };
      map[d.rep_name].total++;
      if (d.status === 'approved') map[d.rep_name].approved++;
      if (['declined', 'default', 'fraud'].includes(d.status)) map[d.rep_name].declined++;
    });
    return Object.values(map).map(r => ({ ...r, rate: r.total > 0 ? Math.round((r.approved / r.total) * 100) : 0 })).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Lead source breakdown
  const leadSourceData = useMemo(() => {
    if (!filtered.length) return [];
    const map = {};
    filtered.forEach(d => {
      const src = d.lead_source || 'Unknown';
      if (!map[src]) map[src] = { name: src, count: 0, approved: 0 };
      map[src].count++;
      if (d.status === 'approved') map[src].approved++;
    });
    return Object.values(map).map(s => ({ ...s, rate: s.count > 0 ? Math.round((s.approved / s.count) * 100) : 0 })).sort((a, b) => b.count - a.count);
  }, [filtered]);

  // Status distribution for pie
  const statusPie = useMemo(() => {
    if (!filtered.length) return [];
    const map = {};
    filtered.forEach(d => { map[d.status] = (map[d.status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Time series (weekly)
  const timeSeries = useMemo(() => {
    if (!filtered.length) return [];
    const map = {};
    filtered.forEach(d => {
      const week = d.date ? d.date.slice(0, 10).replace(/-\d{2}$/, '') : 'Unknown';
      if (!map[week]) map[week] = { week, total: 0, approved: 0, declined: 0 };
      map[week].total++;
      if (d.status === 'approved') map[week].approved++;
      if (['declined', 'default', 'fraud'].includes(d.status)) map[week].declined++;
    });
    return Object.values(map).sort((a, b) => a.week.localeCompare(b.week));
  }, [filtered]);

  // Scatter: amount vs approval
  const scatterData = useMemo(() => {
    if (!repData.length) return [];
    return repData.map(r => ({ name: r.name, x: r.total, y: r.rate, z: r.approved }));
  }, [repData]);

  // Unique values for filters
  const reps = useMemo(() => [...new Set((data?.deals || []).map(d => d.rep_name).filter(Boolean))].sort(), [data]);

  const exportCSV = () => {
    if (!filtered.length) return;
    const cols = ['rep_name', 'lead_source', 'status', 'amount', 'date', 'company_name'];
    const rows = filtered.map(d => cols.map(c => `"${String(d[c] ?? '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[cols.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `puller-data-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  const syncZoho = async () => {
    setLoading(true);
    try {
      await fetch(`${API}/puller-data/sync`, { headers });
      await fetchData();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={24} className="animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center"><Database size={16} className="text-white" /></div>
          <div>
            <h1 className="text-gray-900 font-semibold text-lg">Puller Data</h1>
            <p className="text-gray-400 text-xs">Application pull analytics · Zoho CRM</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={syncZoho} className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg flex items-center gap-1.5">
            <RefreshCw size={12} /> Sync Zoho
          </button>
          <button onClick={fetchData} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg flex items-center gap-1.5">
            <RefreshCw size={12} /> Refresh
          </button>
          <button onClick={exportCSV} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5">
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-500 uppercase">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select value={filters.rep} onChange={e => setFilters(p => ({ ...p, rep: e.target.value }))}
            className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option value="">All Reps</option>
            {reps.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filters.leadSource} onChange={e => setFilters(p => ({ ...p, leadSource: e.target.value }))}
            className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option value="">All Lead Sources</option>
            {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.dateRange} onChange={e => setFilters(p => ({ ...p, dateRange: e.target.value }))}
            className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="180">Last 6 Months</option>
            <option value="365">Last Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {metrics && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Appointments" value={metrics.total} icon={Database} color="blue" />
            <StatCard label="Apps Submitted" value={metrics.apps} icon={Database} color="blue" />
            <StatCard label="Approvals / Apps" value={`${metrics.approved} / ${metrics.apps}`} sub={`${metrics.approvalRate}%`} icon={CheckCircle2} color="green" />
            <StatCard label="App to Funding" value={`${metrics.fundingRate}%`} sub={`${metrics.funded} funded`} icon={TrendingUp} color="purple" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label="Revenue" value={`$${metrics.totalRevenue.toLocaleString()}`} icon={CheckCircle2} color="green" />
            <StatCard label="Cost" value={`$${metrics.totalCost.toLocaleString()}`} icon={XCircle} color="red" />
            <StatCard label="Margin" value={`$${(metrics.totalRevenue - metrics.totalCost).toLocaleString()}`} sub={metrics.totalRevenue > 0 ? `${(((metrics.totalRevenue - metrics.totalCost) / metrics.totalRevenue) * 100).toFixed(1)}%` : '0%'} icon={TrendingUp} color={metrics.totalRevenue - metrics.totalCost >= 0 ? 'green' : 'red'} />
          </div>

          {/* Row 1: Status Pie + Time Series */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ChartCard title="Status Distribution">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusPie.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Volume Over Time" className="md:col-span-2">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="approved" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="declined" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Row 2: Rep Performance Bar + Scatter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Rep Approval Rates">
              <ResponsiveContainer width="100%" height={Math.max(240, repData.length * 36)}>
                <BarChart data={repData.slice(0, 15)} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="rate" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Volume vs Approval Rate (per Rep)">
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="x" name="Total Pulls" tick={{ fontSize: 11 }} label={{ value: 'Total Pulls', position: 'bottom', fontSize: 11 }} />
                  <YAxis dataKey="y" name="Approval %" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v, name) => name === 'Approval %' ? `${v}%` : v} />
                  <Scatter data={scatterData} fill="#8b5cf6">
                    {scatterData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Row 3: Lead Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Lead Source Volume">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={leadSourceData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Lead Source Approval Rates">
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={leadSourceData.slice(0, 8)}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="Approval %" dataKey="rate" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                  <Tooltip formatter={(v) => `${v}%`} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Rep Table */}
          <ChartCard title="Rep Breakdown">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Rep', 'Total Pulls', 'Approved', 'Declined', 'Approval Rate'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-gray-400 text-xs font-medium uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {repData.map(r => (
                    <tr key={r.name} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 text-gray-900 font-medium">{r.name}</td>
                      <td className="px-4 py-2.5 text-gray-700">{r.total}</td>
                      <td className="px-4 py-2.5 text-green-600 font-medium">{r.approved}</td>
                      <td className="px-4 py-2.5 text-red-600 font-medium">{r.declined}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${r.rate}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 w-10 text-right">{r.rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </>
      )}

      {!metrics && !error && (
        <div className="text-center py-20 text-gray-300">
          <Database size={32} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm">No puller data available. Connect Zoho CRM to populate.</p>
        </div>
      )}
    </div>
  );
}
