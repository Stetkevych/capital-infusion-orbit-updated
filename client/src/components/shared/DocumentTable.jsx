import React from 'react';
import { FileText, Download, Eye } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { DOC_CATEGORIES } from '../../data/mockData';

const API = process.env.REACT_APP_API_URL || 'http://capital-infusion-api-prod.eba-wqytrheg.us-east-1.elasticbeanstalk.com/api';

function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function downloadDoc(doc) {
  if (doc.key) {
    try {
      const res = await fetch(`${API}/documents/download/${doc.id}`);
      const { url } = await res.json();
      window.open(url, '_blank');
      return;
    } catch {}
  }
  alert('Download not available — file not yet stored in S3');
}

export default function DocumentTable({ documents, onStatusChange, canChangeStatus = false }) {
  if (!documents.length) {
    return (
      <div className="text-center py-12">
        <FileText size={24} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-400 text-sm">No documents in this folder yet.</p>
      </div>
    );
  }

  const getCategoryLabel = (id) => DOC_CATEGORIES.find(c => c.id === id)?.label || id;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">File</th>
            <th className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">Category</th>
            <th className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">Status</th>
            <th className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">Uploaded</th>
            <th className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">Size</th>
            <th className="text-right py-3 px-5"></th>
          </tr>
        </thead>
        <tbody>
          {documents.map(doc => (
            <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
              <td className="py-3.5 px-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium truncate max-w-[180px]">{doc.fileName}</p>
                    {doc.note && <p className="text-gray-400 text-xs mt-0.5 truncate max-w-[180px]">{doc.note}</p>}
                  </div>
                  {doc.visibility === 'internal' && (
                    <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">Internal</span>
                  )}
                </div>
              </td>
              <td className="py-3.5 px-5 text-gray-400 text-xs">{getCategoryLabel(doc.category)}</td>
              <td className="py-3.5 px-5">
                {canChangeStatus && onStatusChange ? (
                  <select
                    value={doc.status}
                    onChange={e => onStatusChange(doc.id, e.target.value)}
                    className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {['Uploaded','Under Review','Approved','Rejected','Needs Reupload'].map(s => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <StatusBadge status={doc.status} size="xs" />
                )}
              </td>
              <td className="py-3.5 px-5 text-gray-400 text-xs">{fmt(doc.uploadedAt)}</td>
              <td className="py-3.5 px-5 text-gray-400 text-xs">{doc.fileSize}</td>
              <td className="py-3.5 px-5">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"><Eye size={13} /></button>
                  <button onClick={() => downloadDoc(doc)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"><Download size={13} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
