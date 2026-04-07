import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Activity, LogIn, Upload, FileText, Clock, ChevronRight } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

const TYPE_STYLE = {
  login: { label: 'Login', icon: LogIn, cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  upload: { label: 'Upload', icon: Upload, cls: 'bg-green-50 text-green-600 border-green-200' },
  docusign: { label: 'DocuSign', icon: FileText, cls: 'bg-purple-50 text-purple-600 border-purple-200' },
  status_change: { label: 'Status', icon: Activity, cls: 'bg-amber-50 text-amber-600 border-amber-200' },
};

function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ActivityPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  useEffect(() => {
    fetch(`${API}/activity`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => setLogs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Activity size={20} className="text-blue-600" /> Activity Log
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {loading ? 'Loading...' : `${logs.length} event${logs.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100">
        {loading && (
          <p className="text-gray-300 text-sm text-center py-8">Loading activity...</p>
        )}
        {!loading && logs.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">No activity recorded yet.</p>
        )}
        {logs.map(a => {
          const t = TYPE_STYLE[a.eventType] || { label: a.eventType || 'Event', icon: Activity, cls: 'bg-gray-50 text-gray-500 border-gray-200' };
          const Icon = t.icon;
          const linkTo = a.clientId ? `/clients/${a.clientId}` : null;
          const Wrapper = linkTo ? Link : 'div';
          const wrapperProps = linkTo ? { to: linkTo } : {};
          return (
            <Wrapper key={a.id} {...wrapperProps} className={`flex items-start gap-4 px-5 py-4 ${linkTo ? 'hover:bg-blue-50/40 cursor-pointer transition-colors' : ''}`}>
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border shrink-0 mt-0.5 ${t.cls}`}>
                <Icon size={12} />
                {t.label}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 text-sm">{a.description}</p>
                {a.userName && <p className="text-gray-400 text-xs mt-0.5">{a.userName} · {a.userEmail}</p>}
                {a.fileName && <p className="text-gray-400 text-xs">{a.fileName}</p>}
              </div>
              <div className="shrink-0 text-right flex items-center gap-2">
                <div>
                  <p className="text-gray-400 text-xs">{timeAgo(a.timestamp)}</p>
                  <p className="text-gray-300 text-xs flex items-center gap-1 justify-end mt-0.5">
                    <Clock size={10} /> {fmt(a.timestamp)}
                  </p>
                </div>
                {linkTo && <ChevronRight size={14} className="text-gray-300" />}
              </div>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
