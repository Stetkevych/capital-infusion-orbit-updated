import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { getClientById, getRequestsByClient, DOC_CATEGORIES } from '../../data/mockData';
import UploadZone from '../../components/shared/UploadZone';
import { Bell } from 'lucide-react';

export default function UploadCenter() {
  const { user, token } = useAuth();
  const client = getClientById(user.clientId);
  const clientId = client?.id || user?.clientId || user?.id;
  const pendingRequests = client ? getRequestsByClient(client.id).filter(r => r.status === 'Pending') : [];
  const requestedCatIds = new Set(pendingRequests.map(r => r.category));

  if (!clientId) return <div className="p-6 text-gray-400">Profile not found.</div>;

  const handleUpload = (category, files) => {
    console.log('Upload queued:', category, files.map(f => f.name));
    // Wire to S3 presigned URL or backend endpoint here
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Upload Center</h1>
        <p className="text-gray-400 text-sm mt-0.5">Upload documents for your application</p>
      </div>

      {/* Requested first */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-amber-500" />
            <h2 className="text-amber-500 font-semibold text-sm">Requested Documents ({pendingRequests.length})</h2>
          </div>
          {pendingRequests.map(req => {
            const cat = DOC_CATEGORIES.find(c => c.id === req.category);
            return (
              <div key={req.id} className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm">
                <p className="text-gray-900 font-medium text-sm mb-1">{cat?.icon} {cat?.label}</p>
                <p className="text-gray-400 text-xs mb-3">{req.instructions}</p>
                <UploadZone
                  category={req.category}
                  categoryLabel={`Upload ${cat?.label}`}
                  clientId={clientId}
                  uploadedBy={user?.id}
                  token={token}
                  compact
                />
              </div>
            );
          })}
        </div>
      )}

      {/* All categories */}
      <div>
        <h2 className="text-gray-700 font-semibold text-sm mb-3">All Document Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DOC_CATEGORIES.filter(c => !requestedCatIds.has(c.id)).map(cat => (
            <div key={cat.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-gray-700 font-medium text-sm mb-3">{cat.icon} {cat.label}</p>
              <UploadZone
                category={cat.id}
                categoryLabel={`Upload ${cat.label}`}
                clientId={clientId}
                uploadedBy={user?.id}
                token={token}
                compact
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
