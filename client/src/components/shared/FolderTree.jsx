import React from 'react';
import { Folder, FolderOpen, AlertCircle } from 'lucide-react';
import { DOC_CATEGORIES, getDocumentsByCategory } from '../../data/mockData';

export default function FolderTree({ clientId, selectedCategory, onSelect }) {
  return (
    <div className="space-y-0.5">
      {DOC_CATEGORIES.map(cat => {
        const docs = getDocumentsByCategory(clientId, cat.id);
        const active = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${
              active ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {active
                ? <FolderOpen size={14} className="text-blue-600 shrink-0" />
                : <Folder size={14} className="text-gray-400 shrink-0" />
              }
              <span className="text-xs font-medium truncate">{cat.label}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-1">
              {docs.length === 0 && <AlertCircle size={11} className="text-red-400" />}
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                docs.length > 0 ? 'bg-gray-100 text-gray-500' : 'bg-red-50 text-red-400'
              }`}>{docs.length}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
