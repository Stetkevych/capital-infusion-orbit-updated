import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart2, Users, Upload, Clock, LogIn, Layers } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

function StatCard({ icon: Icon, label, value, sub, color = 'text-blue-600', bg = 'bg-blue-50', wide = false }) {
  return (
    <div className={`bg-white border border-gray-100 rounded-2xl shadow-sm p-5 ${wide ? 'md:col-span-2' : ''}`}>
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

  useEffect(() => {
    fetch(`${API}/client-data/metrics`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading metrics...</div>;
  if (!data) return <div className="p-6 text-gray-400 text-sm">Unable to load client data.</div>;

  const { summary, uploadsByCategory, clientDetails } = data;

  // Single-type: uploaded at least 1 doc type (excl application)
  const singleTypeUploaders = clientDetails.filter(c => {
    const nonAppCats = (c.categories || []).filter(cat => cat !== 'application');
    return nonAppCats.length >= 1;
  }).length;

  // Multi-type: uploaded 2+ different doc types (excl application) — inclusive of single
  const multiTypeUploaders = clientDetails.filter(c => {
    const nonAppCats = (c.categories || []).filter(cat => cat !== 'application');
    return nonAppCats.length >= 2;
  }).length;

  // Daily averages
  const dayCount = Object.keys(data.uploadsByDay || {}).length || 1;
  const dailyAvgClients = (summary.totalClients / dayCount).toFixed(1);
  const dailyAvgLogins = (summary.uniqueLoggedIn / dayCount).toFixed(1);
  const dailyAvgUploads = (summary.totalUploads / dayCount).toFixed(1);

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
          <BarChart2 size={22} className="text-blue-600" /> Client Data
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Engagement metrics and upload behavior</p>
      </div>

      {/* Row 1: 3 boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Clients" value={summary.totalClients}
          sub="All registered clients" />
        <StatCard icon={LogIn} label="Clients Logged In" value={summary.uniqueLoggedIn}
          sub={`${summary.totalClients > 0 ? ((summary.uniqueLoggedIn / summary.totalClients) * 100).toFixed(1) : 0}% login rate`}
          color="text-green-600" bg="bg-green-50" />
        <StatCard icon={Upload} label="Doc Uploaders" value={singleTypeUploaders}
          sub="Uploaded at least 1 doc type (excl. application) *"
          color="text-indigo-600" bg="bg-indigo-50" />
      </div>

      {/* Row 2: 3 boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Layers} label="Multi-Type Uploaders" value={multiTypeUploaders}
          sub={`Uploaded 2+ doc types · includes all doc uploaders above *`}
          color="text-purple-600" bg="bg-purple-50" />
        <StatCard icon={Clock} label="Avg Logged-In Time" value={formatDuration(summary.avgSessionSec)}
          sub={summary.maxSessionSec > 0 ? `Longest: ${formatDuration(summary.maxSessionSec)}` : 'No session data yet'}
          color="text-amber-600" bg="bg-amber-50" />
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
              <BarChart2 size={16} className="text-gray-600" />
            </div>
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">Daily Averages</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Clients/day</span>
              <span className="text-gray-900 font-semibold">{dailyAvgClients}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Logins/day</span>
              <span className="text-gray-900 font-semibold">{dailyAvgLogins}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Uploads/day</span>
              <span className="text-gray-900 font-semibold">{dailyAvgUploads}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <h2 className="text-gray-900 font-semibold text-sm mb-4 flex items-center gap-2">
          <BarChart2 size={15} className="text-blue-600" /> Uploads by Category
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(uploadsByCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
            const labels = { bank_statements: 'Bank Statements', application: 'Application', drivers_license: 'ID', voided_check: 'Voided Check', other: 'Other' };
            return (
              <div key={cat} className="bg-gray-50 rounded-xl p-3">
                <p className="text-gray-500 text-xs">{labels[cat] || cat}</p>
                <p className="text-gray-900 font-bold text-lg">{count}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
