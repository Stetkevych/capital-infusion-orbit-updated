import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart2, Users, Upload, Clock, LogIn, Layers } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';
const HOUR_LABELS = ['12a','1a','2a','3a','4a','5a','6a','7a','8a','9a','10a','11a','12p','1p','2p','3p','4p','5p','6p','7p','8p','9p','10p','11p'];

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
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/client-data/metrics`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/documents/client/all`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
    ]).then(([metrics, allDocs]) => { setData(metrics); setDocs(Array.isArray(allDocs) ? allDocs : allDocs?.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading metrics...</div>;
  if (!data) return <div className="p-6 text-gray-400 text-sm">Unable to load client data.</div>;

  const { summary, uploadsByCategory, clientDetails } = data;

  // Bank statement uploaders
  const bankStatementUploaders = clientDetails.filter(c =>
    (c.categories || []).includes('bank_statements')
  ).length;
  const bankStmtPct = summary.uniqueLoggedIn > 0
    ? ((bankStatementUploaders / summary.uniqueLoggedIn) * 100).toFixed(1)
    : 0;

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

  // Upload time-of-day by category
  const catLabels = { bank_statements: 'Bank Statements', application: 'Application', drivers_license: 'ID', voided_check: 'Voided Check', other: 'Other' };
  const catColors = { bank_statements: '#3b82f6', application: '#8b5cf6', drivers_license: '#f59e0b', voided_check: '#10b981', other: '#6b7280' };
  const hourData = {};
  docs.forEach(d => {
    if (!d.uploadedAt) return;
    const h = new Date(d.uploadedAt).getHours();
    const cat = d.category || 'other';
    if (!hourData[cat]) hourData[cat] = new Array(24).fill(0);
    hourData[cat][h]++;
  });
  const maxHourVal = Math.max(1, ...Object.values(hourData).flatMap(a => a));

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
        <StatCard icon={Upload} label="Bank Statement Uploaders" value={bankStatementUploaders}
          sub={`${bankStmtPct}% of logged-in clients`}
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

      {/* Upload Time-of-Day Chart */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <h2 className="text-gray-900 font-semibold text-sm mb-2 flex items-center gap-2">
          <Clock size={15} className="text-amber-600" /> Average Upload Time by Document Type
        </h2>
        <p className="text-gray-400 text-xs mb-4">When clients upload each type of document throughout the day</p>
        {Object.keys(hourData).length === 0 ? (
          <p className="text-gray-300 text-sm text-center py-8">No upload data yet</p>
        ) : (
          <div>
            <div className="flex flex-wrap gap-3 mb-4">
              {Object.keys(hourData).map(cat => (
                <div key={cat} className="flex items-center gap-1.5">
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: catColors[cat] || '#6b7280' }} />
                  <span className="text-xs text-gray-500">{catLabels[cat] || cat}</span>
                </div>
              ))}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, minWidth: 600, height: 160 }}>
                {HOUR_LABELS.map((label, h) => {
                  const cats = Object.keys(hourData);
                  return (
                    <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column-reverse', width: '100%', height: 130 }}>
                        {cats.map(cat => {
                          const val = hourData[cat][h] || 0;
                          const pct = (val / maxHourVal) * 100;
                          return pct > 0 ? (
                            <div key={cat} title={`${catLabels[cat] || cat}: ${val}`}
                              style={{ width: '100%', height: `${pct}%`, background: catColors[cat] || '#6b7280', borderRadius: '3px 3px 0 0', minHeight: 3 }} />
                          ) : null;
                        })}
                      </div>
                      <span style={{ fontSize: 9, color: '#9ca3af', marginTop: 4 }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
