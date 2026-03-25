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

  if (!client) return <div className="p-6 text-apple-gray4">Profile not found.</div>;

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-apple-gray1 tracking-tight">Welcome back</h1>
        <p className="text-apple-gray4 text-sm mt-0.5">{client.businessName}</p>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-apple-gray1 font-semibold text-sm">Application Progress</p>
          <StatusBadge status={client.status} />
        </div>
        <div className="w-full bg-apple-gray8 rounded-full h-1.5 mb-2">
          <div className="bg-apple-blue h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-apple-gray4 text-xs">{progress}% complete · {DOC_CATEGORIES.length - missing.length} of {DOC_CATEGORIES.length} document categories submitted</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: FileText, value: docs.length, label: 'Documents', color: 'text-apple-blue', bg: 'bg-blue-50' },
          { icon: Bell, value: requests.length, label: 'Requests', color: 'text-amber-500', bg: 'bg-amber-50' },
          { icon: AlertCircle, value: missing.length, label: 'Missing', color: 'text-red-500', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 p-4 text-center">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
              <s.icon size={16} className={s.color} />
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-apple-gray4 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending Requests */}
      {requests.length > 0 && (
        <div className="bg-white rounded-apple-lg shadow-apple border border-amber-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-apple-gray7 bg-amber-50/50">
            <h2 className="text-apple-gray1 font-semibold text-sm flex items-center gap-2">
              <Bell size={14} className="text-amber-500" /> Action Required
            </h2>
            <Link to="/requests" className="text-apple-blue text-xs font-medium hover:opacity-70 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-apple-gray7">
            {requests.map(req => {
              const cat = DOC_CATEGORIES.find(c => c.id === req.category);
              return (
                <div key={req.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-apple-gray1 text-sm font-medium">{cat?.icon} {cat?.label}</p>
                    <p className="text-apple-gray4 text-xs mt-0.5">{req.instructions}</p>
                  </div>
                  <Link to="/upload" className="text-xs bg-apple-blue hover:bg-apple-bluehov text-white px-3 py-1.5 rounded-lg transition-colors font-medium shrink-0 ml-4">
                    Upload
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rep card */}
      {rep && (
        <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-base shrink-0">
            {rep.name[0]}
          </div>
          <div className="min-w-0">
            <p className="text-apple-gray5 text-xs mb-0.5">Your Assigned Representative</p>
            <p className="text-apple-gray1 font-semibold text-sm">{rep.name}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-apple-gray4 text-xs"><Mail size={11} />{rep.email}</span>
              <span className="flex items-center gap-1 text-apple-gray4 text-xs"><Phone size={11} />{rep.phone}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
