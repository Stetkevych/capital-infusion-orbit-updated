import React, { useState } from 'react';
import { FileText, Download, Trash2, RotateCcw } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { DOC_CATEGORIES } from '../../data/mockData';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

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

export default function DocumentTable({ documents, onStatusChange, canChangeStatus = false, onDelete }) {
  const [deletedDocs, setDeletedDocs] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [permDeleteConfirm, setPermDeleteConfirm] = useState(null);

  const activeDocs = documents.filter(d => !deletedDocs.find(dd => dd.id === d.id));

  const handleSoftDelete = (doc) => {
    setDeletedDocs(prev => [...prev, doc]);
    if (onDelete) onDelete(doc.id, 'soft');
    setDeleteConfirm(null);
  };

  const handleRestore = (doc) => {
    setDeletedDocs(prev => prev.filter(d => d.id !== doc.id));
  };

  const handlePermanentDelete = async (doc) => {
    try {
      await fetch(`${API}/documents/${doc.id}`, { method: 'DELETE' });
    } catch {}
    setDeletedDocs(prev => prev.filter(d => d.id !== doc.id));
    if (onDelete) onDelete(doc.id, 'permanent');
    setPermDeleteConfirm(null);
  };

  const getCategoryLabel = (id) => DOC_CATEGORIES.find(c => c.id === id)?.label || id;

  if (!activeDocs.length && !deletedDocs.length) {
    return (
      <div className="text-center py-12">
        <FileText size={24} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-400 text-sm">No documents in this folder yet.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm p-6">
            <h2 className="text-gray-900 font-semibold text-base mb-2">Delete Document?</h2>
            <p className="text-gray-500 text-sm mb-1">Are you sure you want to delete <span className="font-semibold text-gray-700">{deleteConfirm.fileName}</span>?</p>
            <p className="text-gray-400 text-xs mb-5">You can restore it from the deleted section below.</p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="text-gray-500 text-sm px-4 py-2 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleSoftDelete(deleteConfirm)} className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-xl font-medium">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent delete confirmation */}
      {permDeleteConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-red-200 w-full max-w-sm p-6">
            <h2 className="text-red-600 font-semibold text-base mb-2">Permanently Delete?</h2>
            <p className="text-gray-500 text-sm mb-1">This will permanently remove <span className="font-semibold text-gray-700">{permDeleteConfirm.fileName}</span> from S3.</p>
            <p className="text-red-400 text-xs mb-5">This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setPermDeleteConfirm(null)} className="text-gray-500 text-sm px-4 py-2 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={() => handlePermanentDelete(permDeleteConfirm)} className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-xl font-medium">
                <Trash2 size={13} /> Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active documents table */}
      {activeDocs.length > 0 && (
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
              {activeDocs.map(doc => (
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
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => downloadDoc(doc)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"><Download size={13} /></button>
                      <button onClick={() => setDeleteConfirm(doc)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deleted documents section */}
      {deletedDocs.length > 0 && (
        <div className="border-t border-gray-100">
          <button onClick={() => setShowDeleted(v => !v)} className="flex items-center gap-2 text-gray-400 text-xs hover:text-gray-600 transition-colors px-5 py-3 w-full text-left">
            <Trash2 size={12} />
            Deleted ({deletedDocs.length})
            <span>{showDeleted ? '▲' : '▼'}</span>
          </button>
          {showDeleted && (
            <div className="divide-y divide-red-50">
              {deletedDocs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between px-5 py-3 bg-red-50/30">
                  <div className="flex items-center gap-2.5">
                    <FileText size={13} className="text-gray-400" />
                    <span className="text-gray-500 text-sm">{doc.fileName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleRestore(doc)} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 border border-green-200 hover:border-green-300 px-2.5 py-1.5 rounded-lg transition-colors">
                      <RotateCcw size={11} /> Restore
                    </button>
                    <button onClick={() => setPermDeleteConfirm(doc)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 px-2.5 py-1.5 rounded-lg transition-colors">
                      <Trash2 size={11} /> Delete Forever
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
