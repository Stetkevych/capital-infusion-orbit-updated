import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getClientById, DOC_CATEGORIES } from '../../data/mockData';
import FolderTree from '../../components/shared/FolderTree';
import DocumentTable from '../../components/shared/DocumentTable';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

export default function MyDocuments() {
  const { user, token } = useAuth();
  const client = getClientById(user.clientId);
  const clientId = client?.id || user?.clientId || user?.id;
  const [selectedCategory, setSelectedCategory] = useState(DOC_CATEGORIES[0].id);
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

  const docs = realDocs
    .filter(d => d.category === selectedCategory && d.visibility !== 'internal');

  const catLabel = DOC_CATEGORIES.find(c => c.id === selectedCategory)?.label || '';

  // Build folder counts from real docs
  const folderCounts = Object.fromEntries(
    DOC_CATEGORIES.map(c => [c.id, realDocs.filter(d => d.category === c.id).length])
  );

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Documents</h1>
        <p className="text-gray-400 text-sm mt-0.5">{client?.businessName || user?.name || 'Your Documents'}</p>
      </div>

      <div className="grid grid-cols-[200px_1fr] gap-5">
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide px-2 mb-2">Folders</p>
          <div className="space-y-0.5">
            {DOC_CATEGORIES.map(cat => {
              const count = folderCounts[cat.id] || 0;
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${
                    active ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  <span className="text-xs font-medium truncate">{cat.icon} {cat.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    count > 0 ? 'bg-gray-100 text-gray-500' : 'bg-red-50 text-red-400'
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-gray-900 font-semibold text-sm">{catLabel}</p>
            <p className="text-gray-400 text-xs">{docs.length} file{docs.length !== 1 ? 's' : ''}</p>
          </div>
          <DocumentTable documents={docs} canChangeStatus={false} />
        </div>
      </div>
    </div>
  );
}
