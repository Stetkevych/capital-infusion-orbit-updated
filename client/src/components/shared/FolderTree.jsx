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
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all duration-150 ${
              active
                ? 'bg-apple-blue/10 text-apple-blue'
                : 'text-apple-gray3 hover:bg-apple-gray8 hover:text-apple-gray1'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {active
                ? <FolderOpen size={14} className="text-apple-blue shrink-0" />
                : <Folder size={14} className="text-apple-gray5 shrink-0" />
              }
              <span className="text-xs font-medium truncate">{cat.label}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-1">
              {missing && <AlertCircle size={11} className="text-red-400" />}
              <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                docs.length > 0
                  ? 'bg-apple-gray7 text-apple-gray4'
                  : 'bg-red-50 text-red-400'
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
