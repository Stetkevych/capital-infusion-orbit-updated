import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getClientById, getDocumentsByCategory, DOC_CATEGORIES } from '../../data/mockData';
import FolderTree from '../../components/shared/FolderTree';
import DocumentTable from '../../components/shared/DocumentTable';

export default function MyDocuments() {
  const { user } = useAuth();
  const client = getClientById(user.clientId);
  const [selectedCategory, setSelectedCategory] = useState(DOC_CATEGORIES[0].id);

  if (!client) return <div className="p-6 text-slate-400">Profile not found.</div>;

  const docs = getDocumentsByCategory(client.id, selectedCategory)
    .filter(d => d.visibility !== 'internal');

  const catLabel = DOC_CATEGORIES.find(c => c.id === selectedCategory)?.label || '';

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Documents</h1>
        <p className="text-gray-400 text-sm mt-0.5">{client.businessName}</p>
      </div>

      <div className="grid grid-cols-[200px_1fr] gap-5">
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide px-2 mb-2">Folders</p>
          <FolderTree clientId={client.id} selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
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
