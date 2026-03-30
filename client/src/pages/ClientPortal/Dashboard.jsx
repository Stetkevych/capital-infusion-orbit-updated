import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getClientById, getRepById, getDocumentsByClient, getRequestsByClient, DOC_CATEGORIES, getMissingCategories } from '../../data/mockData';
import StatusBadge from '../../components/shared/StatusBadge';
import { FileText, Bell, AlertCircle, ArrowRight, Mail, Phone } from 'lucide-react';

export default function ClientDashboard() {
  const { user } = useAuth();
  const client = getClientById(user.clientId);
  const rep = client ? getRepById(client.assignedRepId) : null;
  const docs = client ? getDocumentsByClient(client.id) : [];
  const requests = client ? getRequestsByClient(client.id).filter(r => r.status === 'Pending') : [];
  const missing = client ? getMissingCategories(client.id) : [];
  const progress = client ? Math.round(((DOC_CATEGORIES.length - missing.length) / DOC_CATEGORIES.length) * 100) : 0;

  if (!client) return <div className="p-6 text-gray-400">Profile not found.</div>;

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Welcome back</h1>
        <p className="text-gray-400 text-sm mt-0.5">{client.businessName}</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-800 font-semibold text-sm">Application Progress</p>
          <StatusBadge status={client.status} />
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
          <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-gray-400 text-xs">{progress}% complete · {DOC_CATEGORIES.length - missing.length} of {DOC_CATEGORIES.length} categories submitted</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: FileText, value: docs.length, label: 'Documents', color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Bell, value: requests.length, label: 'Requests', color: 'text-amber-500', bg: 'bg-amber-50' },
          { icon: AlertCircle, value: missing.length, label: 'Missing', color: 'text-red-500', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 text-center">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
              <s.icon size={16} className={s.color} />
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {requests.length > 0 && (
        <div className="bg-white border border-amber-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 bg-amber-50/40">
            <h2 className="text-gray-800 font-semibold text-sm flex items-center gap-2">
              <Bell size={14} className="text-amber-500" /> Action Required
            </h2>
            <Link to="/requests" className="text-blue-600 text-xs font-medium hover:opacity-70 flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </div>
          <div className="divide-y divide-gray-50">
            {requests.map(req => {
              const cat = DOC_CATEGORIES.find(c => c.id === req.category);
              return (
                <div key={req.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-gray-800 text-sm font-medium">{cat?.icon} {cat?.label}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{req.instructions}</p>
                  </div>
                  <Link to="/upload" className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium shrink-0 ml-4">Upload</Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rep && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-base shrink-0">
            {rep.name[0]}
          </div>
          <div className="min-w-0">
            <p className="text-gray-400 text-xs mb-0.5">Your Assigned Representative</p>
            <p className="text-gray-900 font-semibold text-sm">{rep.name}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-gray-400 text-xs"><Mail size={11} />{rep.email}</span>
              <span className="flex items-center gap-1 text-gray-400 text-xs"><Phone size={11} />{rep.phone}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
