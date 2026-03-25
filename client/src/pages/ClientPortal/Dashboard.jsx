import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getClientById, getRepById, getDocumentsByClient, getRequestsByClient, DOC_CATEGORIES, getMissingCategories } from '../../data/mockData';
import StatusBadge from '../../components/shared/StatusBadge';
import { FileText, Bell, AlertCircle, ArrowRight } from 'lucide-react';

export default function ClientDashboard() {
  const { user } = useAuth();
  const client = getClientById(user.clientId);
  const rep = client ? getRepById(client.assignedRepId) : null;
  const docs = client ? getDocumentsByClient(client.id) : [];
  const requests = client ? getRequestsByClient(client.id).filter(r => r.status === 'Pending') : [];
  const missing = client ? getMissingCategories(client.id) : [];

  const progress = client
    ? Math.round(((DOC_CATEGORIES.length - missing.length) / DOC_CATEGORIES.length) * 100)
    : 0;

  if (!client) return <div className="p-6 text-slate-400">Client profile not found.</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Welcome, {user.name}</h1>
        <p className="text-slate-400 text-sm mt-0.5">{client.businessName}</p>
      </div>

      {/* Progress */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-semibold text-sm">Application Progress</p>
          <StatusBadge status={client.status} />
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-slate-400 text-xs">{progress}% complete · {DOC_CATEGORIES.length - missing.length} of {DOC_CATEGORIES.length} document categories submitted</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <FileText size={18} className="text-blue-400 mx-auto mb-2" />
          <p className="text-white font-bold text-xl">{docs.length}</p>
          <p className="text-slate-500 text-xs">Documents</p>
        </div>
        <div className="bg-slate-900 border border-yellow-900/40 rounded-xl p-4 text-center">
          <Bell size={18} className="text-yellow-400 mx-auto mb-2" />
          <p className="text-yellow-400 font-bold text-xl">{requests.length}</p>
          <p className="text-slate-500 text-xs">Requests</p>
        </div>
        <div className="bg-slate-900 border border-red-900/40 rounded-xl p-4 text-center">
          <AlertCircle size={18} className="text-red-400 mx-auto mb-2" />
          <p className="text-red-400 font-bold text-xl">{missing.length}</p>
          <p className="text-slate-500 text-xs">Missing</p>
        </div>
      </div>

      {/* Pending Requests */}
      {requests.length > 0 && (
        <div className="bg-slate-900 border border-yellow-900/30 rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Bell size={15} className="text-yellow-400" /> Action Required
            </h2>
            <Link to="/requests" className="text-blue-400 text-xs hover:text-blue-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-800">
            {requests.map(req => {
              const cat = DOC_CATEGORIES.find(c => c.id === req.category);
              return (
                <div key={req.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-slate-200 text-sm font-medium">{cat?.icon} {cat?.label}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{req.instructions}</p>
                  </div>
                  <Link to="/upload" className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition">
                    Upload
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assigned Rep */}
      {rep && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-900/40 border border-indigo-800 rounded-full flex items-center justify-center text-indigo-300 font-bold">
            {rep.name[0]}
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Your Assigned Rep</p>
            <p className="text-white font-semibold text-sm">{rep.name}</p>
            <p className="text-slate-500 text-xs">{rep.email} · {rep.phone}</p>
          </div>
        </div>
      )}
    </div>
  );
}
