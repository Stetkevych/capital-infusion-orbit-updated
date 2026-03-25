import React from 'react';
import { FileText, Download, Eye } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { DOC_CATEGORIES } from '../../data/mockData';

function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DocumentTable({ documents, onStatusChange, canChangeStatus = false }) {
  if (!documents.length) {
    return (
      <div className="text-center py-10 text-slate-500 text-sm">
        No documents in this folder yet.
      </div>
    );
  }

  const getCategoryLabel = (id) => DOC_CATEGORIES.find(c => c.id === id)?.label || id;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left py-3 px-4 text-slate-400 font-medium">File Name</th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium">Category</th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium">Uploaded</th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium">Size</th>
            <th className="text-right py-3 px-4 text-slate-400 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map(doc => (
            <tr key={doc.id} className="border-b border-slate-800 hover:bg-slate-800/40 transition">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-slate-500 shrink-0" />
                  <span className="text-slate-200 font-medium truncate max-w-[200px]">{doc.fileName}</span>
                  {doc.visibility === 'internal' && (
                    <span className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">Internal</span>
                  )}
                </div>
                {doc.note && <p className="text-xs text-slate-500 mt-0.5 ml-5">{doc.note}</p>}
              </td>
              <td className="py-3 px-4 text-slate-400">{getCategoryLabel(doc.category)}</td>
              <td className="py-3 px-4">
                {canChangeStatus && onStatusChange ? (
                  <select
                    value={doc.status}
                    onChange={e => onStatusChange(doc.id, e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                  >
                    {['Uploaded','Under Review','Approved','Rejected','Needs Reupload'].map(s => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <StatusBadge status={doc.status} />
                )}
              </td>
              <td className="py-3 px-4 text-slate-400">{fmt(doc.uploadedAt)}</td>
              <td className="py-3 px-4 text-slate-500">{doc.fileSize}</td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-2">
                  <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition" title="Preview">
                    <Eye size={14} />
                  </button>
                  <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition" title="Download">
                    <Download size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
