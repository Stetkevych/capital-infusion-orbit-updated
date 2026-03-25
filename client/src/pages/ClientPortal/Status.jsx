import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { getClientById, getDocumentsByClient, DOC_CATEGORIES } from '../../data/mockData';
import StatusBadge from '../../components/shared/StatusBadge';
import { FileText } from 'lucide-react';

function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ClientStatus() {
  const { user } = useAuth();
  const client = getClientById(user.clientId);
  const docs = client ? getDocumentsByClient(client.id).filter(d => d.visibility !== 'internal') : [];

  if (!client) return <div className="p-6 text-slate-400">Profile not found.</div>;

  const byCategory = DOC_CATEGORIES.map(cat => ({
    ...cat,
    docs: docs.filter(d => d.category === cat.id),
  }));

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Document Status</h1>
        <p className="text-slate-400 text-sm mt-0.5">Track the review status of your submitted documents</p>
      </div>

      <div className="space-y-3">
        {byCategory.map(cat => (
          <div key={cat.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
              <p className="text-slate-200 font-medium text-sm">{cat.icon} {cat.label}</p>
              <span className={`text-xs px-2 py-1 rounded border ${
                cat.docs.length > 0
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : 'bg-red-900/30 text-red-400 border-red-800'
              }`}>
                {cat.docs.length > 0 ? `${cat.docs.length} file${cat.docs.length !== 1 ? 's' : ''}` : 'Missing'}
              </span>
            </div>
            {cat.docs.length > 0 ? (
              <div className="divide-y divide-slate-800">
                {cat.docs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={14} className="text-slate-500 shrink-0" />
                      <span className="text-slate-300 text-sm truncate">{doc.fileName}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-slate-500 text-xs">{fmt(doc.uploadedAt)}</span>
                      <StatusBadge status={doc.status} size="xs" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-600 text-xs px-5 py-3">No documents uploaded yet.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
