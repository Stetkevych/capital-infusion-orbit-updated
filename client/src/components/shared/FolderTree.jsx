import React from 'react';
import { Folder, FolderOpen, AlertCircle } from 'lucide-react';
import { DOC_CATEGORIES, getDocumentsByCategory } from '../../data/mockData';

export default function FolderTree({ clientId, selectedCategory, onSelect }) {
  return (
    <div className="space-y-0.5">
      {DOC_CATEGORIES.map(cat => {
        const docs = getDocumentsByCategory(clientId, cat.id);
        const missing = docs.length === 0;
        const active = selectedCategory === cat.id;

        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition group ${
              active
                ? 'bg-blue-600/20 border border-blue-600/40 text-blue-300'
                : 'hover:bg-slate-800 text-slate-300 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {active
                ? <FolderOpen size={15} className="text-blue-400 shrink-0" />
                : <Folder size={15} className="text-slate-500 shrink-0" />
              }
              <span className="text-sm truncate">{cat.icon} {cat.label}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {missing && (
                <AlertCircle size={13} className="text-red-500" title="No documents" />
              )}
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                docs.length > 0 ? 'bg-slate-700 text-slate-400' : 'bg-red-900/30 text-red-500'
              }`}>
                {docs.length}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
