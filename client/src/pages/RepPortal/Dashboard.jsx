import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CLIENTS, DOCUMENT_REQUESTS, ACTIVITY_LOG, DOC_CATEGORIES, getClientsByRep } from '../../data/mockData';
import StatusBadge from '../../components/shared/StatusBadge';
import { Users, FileText, AlertCircle, Clock, ArrowRight, Download } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

function fmtTime(iso) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function RepDashboard() {
  const { user, token } = useAuth();
  const isAdmin = user.role === 'admin';
  const [realClients, setRealClients] = useState([]);
  const [realDocs, setRealDocs] = useState([]);

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  useEffect(() => {
    fetch(`${API}/clients-api`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => setRealClients(data))
      .catch(() => {});
    fetch(`${API}/documents/client/all`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => setRealDocs(data))
      .catch(() => {});
  }, []);

  const mockClients = isAdmin ? CLIENTS : getClientsByRep(user.repId);
  const myClients = [
    ...realClients,
    ...mockClients.filter(mc => !realClients.find(rc => rc.email === mc.email)),
  ];
  const myClientIds = new Set(myClients.map(c => c.id));
  const pendingRequests = DOCUMENT_REQUESTS.filter(r => r.status === 'Pending' && myClientIds.has(r.clientId));
  const recentDocs = realDocs.filter(d => myClientIds.has(d.clientId)).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(0, 5);
  const clientsMissingDocs = myClients.filter(c => {
    const uploadedCats = new Set(realDocs.filter(d => d.clientId === c.id).map(d => d.category));
    return DOC_CATEGORIES.some(cat => cat.required && !uploadedCats.has(cat.id));
  });
  const recentActivity = ACTIVITY_LOG.filter(a => myClientIds.has(a.clientId)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);

  const stats = [
    { label: 'Clients', value: myClients.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', link: '/clients' },
    { label: 'Pending Requests', value: pendingRequests.length, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', link: '/requests' },
    { label: 'Missing Docs', value: clientsMissingDocs.length, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', link: '/clients' },
    { label: 'Total Documents', value: realDocs.filter(d => myClientIds.has(d.clientId)).length, icon: FileText, color: 'text-green-600', bg: 'bg-green-50', link: '/documents' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">Welcome back, {user.name}{isAdmin && <span className="ml-2 text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">Admin</span>}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Link key={s.label} to={s.link} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:border-gray-200 hover:shadow-md transition-all cursor-pointer">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-4`}>
              <s.icon size={17} className={s.color} />
            </div>
            <p className={`text-2xl font-bold tracking-tight ${s.color}`}>{s.value}</p>
            <p className="text-gray-400 text-xs mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-gray-800 font-semibold text-sm">Clients Missing Documents</h2>
            <Link to="/clients" className="text-blue-600 text-xs font-medium hover:opacity-70 flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </div>
          <div className="divide-y divide-gray-50">
            {clientsMissingDocs.length === 0
              ? <p className="text-gray-400 text-sm px-5 py-6 text-center">All clients are complete ✓</p>
              : clientsMissingDocs.map(c => (
                <Link key={c.id} to={`/clients/${c.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-gray-800 text-sm font-medium">{c.businessName}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{DOC_CATEGORIES.filter(cat => cat.required && !new Set(realDocs.filter(d => d.clientId === c.id).map(d => d.category)).has(cat.id)).length} missing</p>
                  </div>
                  <StatusBadge status={c.status} size="xs" />
                </Link>
              ))
            }
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-gray-800 font-semibold text-sm">Recent Uploads</h2>
            <Link to="/documents" className="text-blue-600 text-xs font-medium hover:opacity-70 flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentDocs.map(doc => {
              const client = myClients.find(c => c.id === doc.clientId);
              return (
                <div key={doc.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 text-sm font-medium truncate">{doc.fileName}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{client?.businessName}</p>
                  </div>
                  <span className="text-gray-400 text-xs shrink-0 hidden sm:block">{fmtTime(doc.uploadedAt)}</span>
                  <StatusBadge status={doc.status} size="xs" />
                  <button onClick={() => {
                    fetch(`${API}/documents/download/${doc.id}`, { headers })
                      .then(r => r.ok ? r.json() : null)
                      .then(d => { if (d?.url) window.open(d.url, '_blank'); })
                      .catch(() => {});
                  }} className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors shrink-0" title="Download">
                    <Download size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-gray-800 font-semibold text-sm">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {recentActivity.map(a => {
            const client = myClients.find(c => c.id === a.clientId);
            const typeColor = { upload: 'text-blue-600 bg-blue-50', status_change: 'text-green-600 bg-green-50', request: 'text-amber-600 bg-amber-50', note: 'text-purple-600 bg-purple-50' }[a.eventType] || 'text-gray-500 bg-gray-100';
            return (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                <span className={`text-xs font-medium px-2 py-1 rounded-lg shrink-0 mt-0.5 ${typeColor}`}>{a.eventType.replace('_', ' ')}</span>
                <div className="min-w-0">
                  <p className="text-gray-700 text-sm">{a.description}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{client?.businessName} · {fmtTime(a.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
