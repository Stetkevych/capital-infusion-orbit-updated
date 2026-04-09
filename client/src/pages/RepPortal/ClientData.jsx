import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart2, Users, Upload, Clock, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

function StatCard({ icon: Icon, label, value, sub, color = 'text-blue-600', bg = 'bg-blue-50' }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>
          <Icon size={16} className={color} />
        </div>
        <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function formatDuration(sec) {
  if (!sec || sec < 1) return '—';
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

export default function ClientData() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableOpen, setTableOpen] = useState(false);

  useEffect(() => {
    fetch(`${API}/client-data/metrics`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading metrics...</div>;
  if (!data) return <div className="p-6 text-gray-400 text-sm">Unable to load client data.</div>;

  const { summary, uploadsByCategory, uploadsByDay, clientDetails } = data;

  const catLabels = {
    bank_statements: 'Bank Statements', application: 'Application', drivers_license: 'ID',
    voided_check: 'Voided Check', signed_agreement: 'Signed Agreement',
    tax_returns: 'Tax Returns', credit_report: 'Credit Report', other: 'Other',
  };

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
          <BarChart2 size={22} className="text-blue-600" /> Client Data
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Upload behavior, session activity, and engagement metrics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Clients" value={summary.totalClients} />
        <StatCard icon={Upload} label="Clients Who Uploaded" value={summary.clientsWhoUploaded}
          sub={`${summary.uploadRate}% upload rate`} color="text-green-600" bg="bg-green-50" />
        <StatCard icon={TrendingUp} label="Multi-Uploaders" value={summary.clientsWithMultiple}
          sub={`${summary.multiUploadRate}% of all clients`} color="text-indigo-600" bg="bg-indigo-50" />
        <StatCard icon={Clock} label="Avg Session" value={formatDuration(summary.avgSessionSec)}
          sub={summary.maxSessionSec > 0 ? `Longest: ${formatDuration(summary.maxSessionSec)}` : 'No session data yet'}
          color="text-amber-600" bg="bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload Stats */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <h2 className="text-gray-900 font-semibold text-sm mb-4 flex items-center gap-2">
            <Upload size={15} className="text-blue-600" /> Upload Overview
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Documents</span>
              <span className="text-gray-900 font-semibold">{summary.totalUploads}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Avg per Client</span>
              <span className="text-gray-900 font-semibold">{summary.avgUploadsPerClient}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Unique Logins (all time)</span>
              <span className="text-gray-900 font-semibold">{summary.uniqueLoggedIn}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Logins (last 30 days)</span>
              <span className="text-gray-900 font-semibold">{summary.recentLogins30d}</span>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <h2 className="text-gray-900 font-semibold text-sm mb-4 flex items-center gap-2">
            <BarChart2 size={15} className="text-blue-600" /> Uploads by Category
          </h2>
          <div className="space-y-2">
            {Object.entries(uploadsByCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
              const pct = summary.totalUploads > 0 ? (count / summary.totalUploads * 100) : 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{catLabels[cat] || cat}</span>
                    <span className="text-gray-900 font-medium">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upload Timeline */}
      {Object.keys(uploadsByDay).length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <h2 className="text-gray-900 font-semibold text-sm mb-4">Uploads (Last 30 Days)</h2>
          <div className="flex items-end gap-1 h-24">
            {Object.entries(uploadsByDay).sort((a, b) => a[0].localeCompare(b[0])).map(([day, count]) => {
              const max = Math.max(...Object.values(uploadsByDay));
              const h = max > 0 ? (count / max * 100) : 0;
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1" title={`${day}: ${count} uploads`}>
                  <div className="w-full bg-blue-500 rounded-t" style={{ height: `${Math.max(h, 4)}%` }} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>{Object.keys(uploadsByDay).sort()[0]}</span>
            <span>{Object.keys(uploadsByDay).sort().pop()}</span>
          </div>
        </div>
      )}

      {/* Per-Client Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <button onClick={() => setTableOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
          <h2 className="text-gray-900 font-semibold text-sm flex items-center gap-2">
            <Users size={15} className="text-blue-600" /> Per-Client Breakdown ({clientDetails.length})
          </h2>
          {tableOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        </button>
        {tableOpen && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-gray-50 bg-gray-50/50">
                  {['Client', 'Email', 'Uploads', 'Categories', 'Logins', 'Avg Session'].map(h => (
                    <th key={h} className="text-left py-2.5 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientDetails.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No client accounts yet</td></tr>
                ) : clientDetails.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-5 text-gray-900 font-medium">{c.name}</td>
                    <td className="py-2.5 px-5 text-gray-500 text-xs">{c.email}</td>
                    <td className="py-2.5 px-5">
                      <span className={`font-semibold ${c.uploads > 0 ? 'text-green-600' : 'text-gray-300'}`}>{c.uploads}</span>
                    </td>
                    <td className="py-2.5 px-5 text-gray-500 text-xs">{c.categories.map(cat => catLabels[cat] || cat).join(', ') || '—'}</td>
                    <td className="py-2.5 px-5 text-gray-700">{c.logins}</td>
                    <td className="py-2.5 px-5 text-gray-500 text-xs">{formatDuration(c.avgSessionSec)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
