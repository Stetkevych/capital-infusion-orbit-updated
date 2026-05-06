import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart2, Users, Upload, Clock, TrendingUp, Award } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

function formatDuration(sec) {
  if (!sec || sec < 1) return '—';
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

function Bar({ value, max, color = '#3b82f6', label, sub }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs text-gray-700 font-medium w-28 truncate">{label}</span>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
        <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full transition-all" />
      </div>
      <span className="text-xs text-gray-900 font-semibold w-12 text-right">{sub || value}</span>
    </div>
  );
}

export default function RepData() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/client-data/rep-metrics`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading rep data...</div>;
  if (!data) return <div className="p-6 text-gray-400 text-sm">Unable to load rep data.</div>;

  const { reps, totals } = data;
  const maxClients = Math.max(1, ...reps.map(r => r.clientCount));
  const maxUploads = Math.max(1, ...reps.map(r => r.totalUploads));
  const maxLogins = Math.max(1, ...reps.map(r => r.clientLogins));
  const maxAvgSession = Math.max(1, ...reps.map(r => r.avgClientSessionSec));

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
          <BarChart2 size={22} className="text-blue-600" /> Rep Data
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Performance metrics by rep · Based on Orbit platform data</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-gray-900">{totals.totalReps}</p>
          <p className="text-xs text-gray-500">Active Reps</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-blue-600">{totals.totalClients}</p>
          <p className="text-xs text-gray-500">Total Clients</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-green-600">{totals.totalUploads}</p>
          <p className="text-xs text-gray-500">Total Uploads</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-purple-600">{totals.totalLogins}</p>
          <p className="text-xs text-gray-500">Client Logins</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-amber-600">{(totals.totalClients / Math.max(1, totals.totalReps)).toFixed(1)}</p>
          <p className="text-xs text-gray-500">Avg Clients/Rep</p>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Clients per rep */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Users size={14} className="text-blue-600" /> Clients per Rep</h2>
          <div className="space-y-0.5 max-h-72 overflow-y-auto">
            {reps.sort((a, b) => b.clientCount - a.clientCount).map(r => (
              <Bar key={r.id} label={r.name} value={r.clientCount} max={maxClients} color="#3b82f6" />
            ))}
          </div>
        </div>

        {/* Client uploads per rep */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Upload size={14} className="text-green-600" /> Client Uploads (by rep's clients)</h2>
          <div className="space-y-0.5 max-h-72 overflow-y-auto">
            {reps.sort((a, b) => b.totalUploads - a.totalUploads).map(r => (
              <Bar key={r.id} label={r.name} value={r.totalUploads} max={maxUploads} color="#10b981" />
            ))}
          </div>
        </div>

        {/* Client logins per rep */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><TrendingUp size={14} className="text-purple-600" /> Client Login Activity (by rep's clients)</h2>
          <div className="space-y-0.5 max-h-72 overflow-y-auto">
            {reps.sort((a, b) => b.clientLogins - a.clientLogins).map(r => (
              <Bar key={r.id} label={r.name} value={r.clientLogins} max={maxLogins} color="#8b5cf6" />
            ))}
          </div>
        </div>

        {/* Avg client session per rep */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Clock size={14} className="text-amber-600" /> Avg Client Session Duration</h2>
          <div className="space-y-0.5 max-h-72 overflow-y-auto">
            {reps.filter(r => r.avgClientSessionSec > 0).sort((a, b) => b.avgClientSessionSec - a.avgClientSessionSec).map(r => (
              <Bar key={r.id} label={r.name} value={r.avgClientSessionSec} max={maxAvgSession} color="#f59e0b" sub={formatDuration(r.avgClientSessionSec)} />
            ))}
          </div>
        </div>

        {/* Upload rate (uploads per client) */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Award size={14} className="text-rose-600" /> Upload Rate (uploads per client)</h2>
          <div className="space-y-0.5 max-h-72 overflow-y-auto">
            {reps.filter(r => r.clientCount > 0).sort((a, b) => (b.totalUploads / b.clientCount) - (a.totalUploads / a.clientCount)).map(r => {
              const rate = (r.totalUploads / r.clientCount).toFixed(1);
              const maxRate = Math.max(1, ...reps.filter(x => x.clientCount > 0).map(x => x.totalUploads / x.clientCount));
              return <Bar key={r.id} label={r.name} value={r.totalUploads / r.clientCount} max={maxRate} color="#f43f5e" sub={rate} />;
            })}
          </div>
        </div>

        {/* Login rate (logins per client) */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><TrendingUp size={14} className="text-teal-600" /> Login Rate (logins per client)</h2>
          <div className="space-y-0.5 max-h-72 overflow-y-auto">
            {reps.filter(r => r.clientCount > 0).sort((a, b) => (b.clientLogins / b.clientCount) - (a.clientLogins / a.clientCount)).map(r => {
              const rate = (r.clientLogins / r.clientCount).toFixed(1);
              const maxRate = Math.max(1, ...reps.filter(x => x.clientCount > 0).map(x => x.clientLogins / x.clientCount));
              return <Bar key={r.id} label={r.name} value={r.clientLogins / r.clientCount} max={maxRate} color="#14b8a6" sub={rate} />;
            })}
          </div>
        </div>
      </div>

      {/* Full table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Rep Performance Table</h2>
          <p className="text-xs text-gray-400 mt-0.5">All data sourced from Orbit platform activity</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                {['Rep', 'Clients', 'Uploads', 'Logins', 'Upload Rate', 'Login Rate', 'Avg Session'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reps.sort((a, b) => b.clientCount - a.clientCount).map(r => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2.5 px-4 text-gray-900 font-medium">{r.name}</td>
                  <td className="py-2.5 px-4 text-gray-700">{r.clientCount}</td>
                  <td className="py-2.5 px-4 text-gray-700">{r.totalUploads}</td>
                  <td className="py-2.5 px-4 text-gray-700">{r.clientLogins}</td>
                  <td className="py-2.5 px-4 text-gray-700">{r.clientCount > 0 ? (r.totalUploads / r.clientCount).toFixed(1) : '—'}</td>
                  <td className="py-2.5 px-4 text-gray-700">{r.clientCount > 0 ? (r.clientLogins / r.clientCount).toFixed(1) : '—'}</td>
                  <td className="py-2.5 px-4 text-gray-700">{formatDuration(r.avgClientSessionSec)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-300 text-center">Data sourced from Orbit platform · Client assignments, uploads, logins, and session tracking</p>
    </div>
  );
}
