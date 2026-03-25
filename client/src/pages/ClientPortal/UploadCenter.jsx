import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { getClientById, getRequestsByClient, DOC_CATEGORIES } from '../../data/mockData';
import UploadZone from '../../components/shared/UploadZone';
import { Bell } from 'lucide-react';

export default function UploadCenter() {
  const { user } = useAuth();
  const client = getClientById(user.clientId);
  const pendingRequests = client ? getRequestsByClient(client.id).filter(r => r.status === 'Pending') : [];
  const requestedCatIds = new Set(pendingRequests.map(r => r.category));

  if (!client) return <div className="p-6 text-slate-400">Profile not found.</div>;

  const handleUpload = (category, files) => {
    console.log('Upload queued:', category, files.map(f => f.name));
    // Wire to S3 presigned URL or backend endpoint here
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Upload Center</h1>
        <p className="text-slate-400 text-sm mt-0.5">Upload documents for your application</p>
      </div>

      {/* Requested first */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-yellow-400" />
            <h2 className="text-yellow-400 font-semibold text-sm">Requested Documents ({pendingRequests.length})</h2>
          </div>
          {pendingRequests.map(req => {
            const cat = DOC_CATEGORIES.find(c => c.id === req.category);
            return (
              <div key={req.id} className="bg-slate-900 border border-yellow-900/40 rounded-xl p-4">
                <p className="text-white font-medium text-sm mb-1">{cat?.icon} {cat?.label}</p>
                <p className="text-slate-400 text-xs mb-3">{req.instructions}</p>
                <UploadZone
                  category={req.category}
                  categoryLabel={`Upload ${cat?.label}`}
                  onUpload={handleUpload}
                  compact
                />
              </div>
            );
          })}
        </div>
      )}

      {/* All categories */}
      <div>
        <h2 className="text-slate-300 font-semibold text-sm mb-3">All Document Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DOC_CATEGORIES.filter(c => !requestedCatIds.has(c.id)).map(cat => (
            <div key={cat.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-300 font-medium text-sm mb-3">{cat.icon} {cat.label}</p>
              <UploadZone
                category={cat.id}
                categoryLabel={`Upload ${cat.label}`}
                onUpload={handleUpload}
                compact
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
