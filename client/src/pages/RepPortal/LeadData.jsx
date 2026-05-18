import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart2, Calendar, Users, XCircle, RefreshCw, Loader2 } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

export default function LeadData() {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const loadMetrics = async (d) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/calendly/metrics?days=${d}`, { headers });
      if (!res.ok) throw new Error('Failed to load metrics');
      setMetrics(await res.json());
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { loadMetrics(days); }, [days]);

  const StatCard = ({ icon: Icon, label, value, sub, color = 'blue' }) => (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 bg-${color}-50 rounded-xl flex items-center justify-center`}>
          <Icon size={16} className={`text-${color}-600`} />
        </div>
        <p className="text-gray-400 text-xs font-medium">{label}</p>
      </div>
      <p className="text-gray-900 text-2xl font-bold">{value}</p>
      {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <BarChart2 size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-gray-900 font-semibold text-lg">Waymo Data</h1>
            <p className="text-gray-400 text-xs">Calendly scheduling metrics & analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30, 60, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg ${days === d ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {d}d
            </button>
          ))}
          <button onClick={() => loadMetrics(days)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
            <RefreshCw size={13} className="text-gray-500" />
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

      {loading ? (
        <div className="text-center py-20"><Loader2 size={24} className="mx-auto animate-spin text-gray-300" /></div>
      ) : metrics && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Calendar} label="Total Scheduled" value={metrics.totals.scheduled} sub={`Last ${days} days`} color="indigo" />
            <StatCard icon={Calendar} label="Active" value={metrics.totals.active} sub="Confirmed meetings" color="green" />
            <StatCard icon={XCircle} label="Canceled" value={metrics.totals.canceled} sub={`${metrics.totals.cancel_rate}% cancel rate`} color="red" />
            <StatCard icon={Users} label="Team Members" value={Object.keys(metrics.by_member).length} sub="Active on Calendly" color="blue" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <h3 className="text-gray-900 font-semibold text-sm mb-4">By Team Member</h3>
              <div className="space-y-3">
                {Object.entries(metrics.by_member).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="text-gray-700 text-sm">{name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (count / Math.max(...Object.values(metrics.by_member))) * 100)}%` }} />
                      </div>
                      <span className="text-gray-900 text-sm font-semibold w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <h3 className="text-gray-900 font-semibold text-sm mb-4">By Event Type</h3>
              <div className="space-y-3">
                {Object.entries(metrics.by_type).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="text-gray-700 text-sm">{name}</span>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <h3 className="text-gray-900 font-semibold text-sm mb-4">Daily Activity</h3>
            <div className="overflow-x-auto">
              <div className="flex gap-1 items-end min-w-max" style={{ height: '120px' }}>
                {Object.entries(metrics.by_day).sort().slice(-30).map(([day, count]) => {
                  const max = Math.max(...Object.values(metrics.by_day));
                  const height = max > 0 ? (count / max) * 100 : 0;
                  return (
                    <div key={day} className="flex flex-col items-center gap-1" style={{ minWidth: '20px' }}>
                      <span className="text-xs text-gray-400">{count}</span>
                      <div className="w-4 bg-indigo-500 rounded-sm" style={{ height: `${Math.max(4, height)}px` }} />
                      <span className="text-xs text-gray-300 rotate-45 origin-left whitespace-nowrap">{day.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-gray-900 font-semibold text-sm">Recent Events</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['Event', 'Date', 'Time', 'Team', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-gray-400 text-xs font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(metrics.events || []).slice(0, 20).map((e, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-900 font-medium">{e.name}</td>
                      <td className="px-4 py-3 text-gray-600">{e.start_time?.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{(e.event_memberships || []).map(m => m.user_name).join(', ')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${e.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {e.status}
                        </span>
                      </td>
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
