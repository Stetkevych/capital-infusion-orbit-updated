import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CLIENTS, DOCUMENTS, DOCUMENT_REQUESTS, ACTIVITY_LOG, getClientsByRep, getMissingCategories } from '../../data/mockData';
import StatusBadge from '../../components/shared/StatusBadge';
import { Users, FileText, AlertCircle, Clock, ArrowRight } from 'lucide-react';

function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function RepDashboard() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const myClients = isAdmin ? CLIENTS : getClientsByRep(user.repId);
  const myClientIds = new Set(myClients.map(c => c.id));

  const pendingRequests = DOCUMENT_REQUESTS.filter(r =>
    r.status === 'Pending' && myClientIds.has(r.clientId)
  );

  const recentDocs = DOCUMENTS
    .filter(d => myClientIds.has(d.clientId))
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    .slice(0, 5);

  const clientsMissingDocs = myClients.filter(c => getMissingCategories(c.id).length > 0);

  const recentActivity = ACTIVITY_LOG
    .filter(a => myClientIds.has(a.clientId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  const stats = [
    { label: 'Assigned Clients', value: myClients.length, icon: Users, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-800' },
    { label: 'Pending Requests', value: pendingRequests.length, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-800' },
    { label: 'Missing Documents', value: clientsMissingDocs.length, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-900/20 border-red-800' },
    { label: 'Total Documents', value: DOCUMENTS.filter(d => myClientIds.has(d.clientId)).length, icon: FileText, color: 'text-green-400', bg: 'bg-green-900/20 border-green-800' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Welcome back, {user.name} {isAdmin && <span className="text-indigo-400 text-xs ml-1">· Admin</span>}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className={`bg-slate-900 border rounded-xl p-4 ${s.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-medium">{s.label}</span>
              <s.icon size={16} className={s.color} />
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clients Missing Docs */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h2 className="text-white font-semibold text-sm">Clients Missing Documents</h2>
            <Link to="/clients" className="text-blue-400 text-xs hover:text-blue-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-800">
            {clientsMissingDocs.length === 0 ? (
              <p className="text-slate-500 text-sm px-5 py-4">All clients have complete documents.</p>
            ) : clientsMissingDocs.map(c => {
              const missing = getMissingCategories(c.id);
              return (
                <Link key={c.id} to={`/clients/${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/50 transition">
                  <div>
                    <p className="text-slate-200 text-sm font-medium">{c.businessName}</p>
                    <p className="text-slate-500 text-xs">{missing.length} missing categor{missing.length === 1 ? 'y' : 'ies'}</p>
                  </div>
                  <StatusBadge status={c.status} size="xs" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Uploads */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h2 className="text-white font-semibold text-sm">Recent Uploads</h2>
            <Link to="/documents" className="text-blue-400 text-xs hover:text-blue-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-800">
            {recentDocs.map(doc => {
              const client = myClients.find(c => c.id === doc.clientId);
              return (
                <div key={doc.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-slate-200 text-sm font-medium truncate">{doc.fileName}</p>
                    <p className="text-slate-500 text-xs">{client?.businessName} · {fmt(doc.uploadedAt)}</p>
                  </div>
                  <StatusBadge status={doc.status} size="xs" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-white font-semibold text-sm">Recent Activity</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {recentActivity.map(a => {
            const client = myClients.find(c => c.id === a.clientId);
            const typeColor = { upload: 'text-blue-400', status_change: 'text-green-400', request: 'text-yellow-400', note: 'text-purple-400' }[a.eventType] || 'text-slate-400';
            return (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                <span className={`text-xs font-medium uppercase tracking-wide mt-0.5 w-20 shrink-0 ${typeColor}`}>
                  {a.eventType.replace('_', ' ')}
                </span>
                <div className="min-w-0">
                  <p className="text-slate-300 text-sm">{a.description}</p>
                  <p className="text-slate-500 text-xs">{client?.businessName} · {fmt(a.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
