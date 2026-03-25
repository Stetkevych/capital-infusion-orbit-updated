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
      <div className="text-center py-12">
        <FileText size={28} className="mx-auto text-apple-gray6 mb-3" />
        <p className="text-apple-gray4 text-sm">No documents in this folder yet.</p>
      </div>
    );
  }

  const getCategoryLabel = (id) => DOC_CATEGORIES.find(c => c.id === id)?.label || id;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-apple-gray7">
            <th className="text-left py-3 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">File</th>
            <th className="text-left py-3 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">Category</th>
            <th className="text-left py-3 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">Status</th>
            <th className="text-left py-3 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">Uploaded</th>
            <th className="text-left py-3 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">Size</th>
            <th className="text-right py-3 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map(doc => (
            <tr key={doc.id} className="border-b border-apple-gray7 hover:bg-apple-gray9 transition-colors group">
              <td className="py-3.5 px-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-apple-blue" />
                  </div>
                  <div>
                    <p className="text-apple-gray1 font-medium truncate max-w-[180px]">{doc.fileName}</p>
                    {doc.note && <p className="text-apple-gray4 text-xs mt-0.5 truncate max-w-[180px]">{doc.note}</p>}
                  </div>
                  {doc.visibility === 'internal' && (
                    <span className="text-xs bg-apple-gray8 text-apple-gray4 px-1.5 py-0.5 rounded-md border border-apple-gray7">Internal</span>
                  )}
                </div>
              </td>
              <td className="py-3.5 px-5 text-apple-gray3 text-xs">{getCategoryLabel(doc.category)}</td>
              <td className="py-3.5 px-5">
                {canChangeStatus && onStatusChange ? (
                  <select
                    value={doc.status}
                    onChange={e => onStatusChange(doc.id, e.target.value)}
                    className="bg-apple-gray8 border border-apple-gray7 text-apple-gray2 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-apple-blue/30"
                  >
                    {['Uploaded','Under Review','Approved','Rejected','Needs Reupload'].map(s => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <StatusBadge status={doc.status} size="xs" />
                )}
              </td>
              <td className="py-3.5 px-5 text-apple-gray4 text-xs">{fmt(doc.uploadedAt)}</td>
              <td className="py-3.5 px-5 text-apple-gray5 text-xs">{doc.fileSize}</td>
              <td className="py-3.5 px-5">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 hover:bg-apple-gray7 rounded-lg text-apple-gray4 hover:text-apple-gray1 transition-colors" title="Preview">
                    <Eye size={14} />
                  </button>
                  <button className="p-1.5 hover:bg-apple-gray7 rounded-lg text-apple-gray4 hover:text-apple-gray1 transition-colors" title="Download">
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
