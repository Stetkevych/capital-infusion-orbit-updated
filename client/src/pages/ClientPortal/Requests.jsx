import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getClientById, getRequestsByClient, DOC_CATEGORIES } from '../../data/mockData';
import StatusBadge from '../../components/shared/StatusBadge';
import { Clock, Upload } from 'lucide-react';

function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ClientRequests() {
  const { user } = useAuth();
  const client = getClientById(user.clientId);
  const requests = client ? getRequestsByClient(client.id) : [];

  if (!client) return <div className="p-6 text-slate-400">Profile not found.</div>;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Document Requests</h1>
        <p className="text-slate-400 text-sm mt-0.5">{requests.filter(r => r.status === 'Pending').length} pending</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
        {requests.length === 0 && (
          <p className="text-slate-500 text-sm px-5 py-6">No document requests at this time.</p>
        )}
        {requests.map(req => {
          const cat = DOC_CATEGORIES.find(c => c.id === req.category);
          return (
            <div key={req.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-slate-200 font-medium text-sm">{cat?.icon} {cat?.label}</p>
                    <StatusBadge status={req.status} size="xs" />
                  </div>
                  <p className="text-slate-400 text-xs mb-2">{req.instructions}</p>
                  <p className="text-slate-600 text-xs flex items-center gap-1">
                    <Clock size={11} /> Due {fmt(req.dueDate)}
                  </p>
                </div>
                {req.status === 'Pending' && (
                  <Link
                    to="/upload"
                    className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition shrink-0"
                  >
                    <Upload size={12} /> Upload
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
