import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getClientById, DOC_CATEGORIES } from '../../data/mockData';
import StatusBadge from '../../components/shared/StatusBadge';
import { FileText } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ClientStatus() {
  const { user, token } = useAuth();
  const client = getClientById(user.clientId);
  const clientId = client?.id || user?.clientId || user?.id;
  const [realDocs, setRealDocs] = useState([]);

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  useEffect(() => {
    if (!clientId) return;
    fetch(`${API}/documents/client/${clientId}`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(docs => setRealDocs(docs))
      .catch(() => {});
  }, [clientId]);

  if (!clientId) return <div className="p-6 text-gray-400">Profile not found.</div>;

  const docs = realDocs.filter(d => d.visibility !== 'internal');
  const byCategory = DOC_CATEGORIES.map(cat => ({
    ...cat,
    docs: docs.filter(d => d.category === cat.id),
  }));

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Document Status</h1>
        <p className="text-gray-400 text-sm mt-0.5">Track the review status of your submitted documents</p>
      </div>

      <div className="space-y-3">
        {byCategory.map(cat => (
          <div key={cat.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-gray-800 font-medium text-sm">{cat.icon} {cat.label}</p>
              <span className={`text-xs px-2 py-1 rounded border ${
                cat.docs.length > 0
                  ? 'bg-gray-50 text-gray-500 border-gray-200'
                  : 'bg-red-50 text-red-500 border-red-200'
              }`}>
                {cat.docs.length > 0 ? `${cat.docs.length} file${cat.docs.length !== 1 ? 's' : ''}` : 'Missing'}
              </span>
            </div>
            {cat.docs.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {cat.docs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={14} className="text-gray-400 shrink-0" />
                      <span className="text-gray-700 text-sm truncate">{doc.fileName}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-gray-400 text-xs">{fmt(doc.uploadedAt)}</span>
                      <StatusBadge status={doc.status} size="xs" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-xs px-5 py-3">No documents uploaded yet.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
