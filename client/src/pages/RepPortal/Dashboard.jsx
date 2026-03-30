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
  const pendingRequests = DOCUMENT_REQUESTS.filter(r => r.status === 'Pending' && myClientIds.has(r.clientId));
  const recentDocs = DOCUMENTS.filter(d => myClientIds.has(d.clientId)).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(0, 5);
  const clientsMissingDocs = myClients.filter(c => getMissingCategories(c.id).length > 0);
  const recentActivity = ACTIVITY_LOG.filter(a => myClientIds.has(a.clientId)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);

  const stats = [
    { label: 'Clients', value: myClients.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending Requests', value: pendingRequests.length, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Missing Docs', value: clientsMissingDocs.length, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Total Documents', value: DOCUMENTS.filter(d => myClientIds.has(d.clientId)).length, icon: FileText, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">Welcome back, {user.name}{isAdmin && <span className="ml-2 text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">Admin</span>}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-4`}>
              <s.icon size={17} className={s.color} />
            </div>
            <p className={`text-2xl font-bold tracking-tight ${s.color}`}>{s.value}</p>
            <p className="text-gray-400 text-xs mt-1">{s.label}</p>
          </div>
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
                    <p className="text-gray-400 text-xs mt-0.5">{getMissingCategories(c.id).length} missing</p>
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
                <div key={doc.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-gray-800 text-sm font-medium truncate">{doc.fileName}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{client?.businessName} · {fmt(doc.uploadedAt)}</p>
                  </div>
                  <StatusBadge status={doc.status} size="xs" />
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
                  <p className="text-gray-400 text-xs mt-0.5">{client?.businessName} · {fmt(a.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
