import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getClientById, getClientsByRep, CLIENTS, DOC_CATEGORIES } from '../../data/mockData';
import UploadZone from '../../components/shared/UploadZone';
import StatusBadge from '../../components/shared/StatusBadge';
import { FolderOpen, ChevronDown, Search, Eye, Download, Trash2, FileText, Shield } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

export default function SecureUpload() {
  const { user, token } = useAuth();
  const [selectedClient, setSelectedClient] = useState(user.clientId || '');
  const [activeCategory, setActiveCategory] = useState(DOC_CATEGORIES[0].id);
  const [search, setSearch] = useState('');
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const isRep = user.role === 'rep' || user.role === 'admin';
  const availableClients = user.role === 'admin' ? CLIENTS : isRep ? getClientsByRep(user.repId) : [];
  const clientId = isRep ? selectedClient : user.clientId;
  const client = getClientById(clientId);

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  // Fetch real docs from server whenever client changes
  const fetchDocs = async (cId) => {
    if (!cId) { setDocs([]); return; }
    setLoadingDocs(true);
    try {
      const res = await fetch(`${API}/documents/client/${cId}`, { headers });
      if (res.ok) setDocs(await res.json());
    } catch { setDocs([]); }
    finally { setLoadingDocs(false); }
  };

  useEffect(() => { fetchDocs(clientId); }, [clientId]);

  // Refresh docs after upload completes
  const handleUploadComplete = () => {
    setTimeout(() => fetchDocs(clientId), 1500);
  };

  const catDocs = docs.filter(d =>
    d.category === activeCategory &&
    (!search || d.fileName?.toLowerCase().includes(search.toLowerCase()))
  );

  const catCount = (catId) => docs.filter(d => d.category === catId).length;

  const downloadDoc = async (doc) => {
    try {
      const res = await fetch(`${API}/documents/download/${doc.id}`, { headers });
      if (res.ok) {
        const { url } = await res.json();
        window.open(url, '_blank');
      }
    } catch { alert('Download unavailable'); }
  };

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Secure Upload</h1>
          <p className="text-gray-400 text-sm mt-0.5">Files upload directly to AWS S3 — encrypted at rest</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
          <Shield size={13} className="text-green-600" />
          <span className="text-green-700 text-xs font-medium">S3 Encrypted Storage</span>
        </div>
      </div>

      {/* Client selector for reps */}
      {isRep && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
          <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Uploading for Client</label>
          <div className="relative">
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
              className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              <option value="">Select a client...</option>
              {availableClients.map(c => (
                <option key={c.id} value={c.id}>{c.businessName} — {c.ownerName}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          {client && (
            <div className="mt-3 flex items-center gap-3 pt-3 border-t border-gray-100">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm">
                {client.businessName[0]}
              </div>
              <div>
                <p className="text-gray-900 text-sm font-medium">{client.businessName}</p>
                <p className="text-gray-400 text-xs">{client.ownerName} · {client.email}</p>
              </div>
              <StatusBadge status={client.status} size="xs" />
            </div>
          )}
        </div>
      )}

      {!clientId ? (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center">
          <FolderOpen size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 font-medium text-sm">Select a client to begin uploading</p>
        </div>
      ) : (
        <div className="grid grid-cols-[220px_1fr] gap-5">
          {/* Category sidebar */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-3">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider px-2 mb-2">Categories</p>
            <nav className="space-y-0.5">
              {DOC_CATEGORIES.map(cat => {
                const count = catCount(cat.id);
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${
                      active ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                  >
                    <span className="text-xs font-medium truncate">{cat.icon} {cat.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ml-1 ${
                      count > 0 ? 'bg-gray-100 text-gray-500' : 'bg-red-50 text-red-400'
                    }`}>{count}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main panel */}
          <div className="space-y-4">
            {/* Upload zone */}
            <UploadZone
              category={activeCategory}
              categoryLabel={DOC_CATEGORIES.find(c => c.id === activeCategory)?.label}
              clientId={clientId}
              uploadedBy={user?.id}
              token={token}
              onUpload={handleUploadComplete}
            />

            {/* Existing files */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div>
                  <p className="text-gray-900 font-semibold text-sm">
                    {DOC_CATEGORIES.find(c => c.id === activeCategory)?.label}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {loadingDocs ? 'Loading...' : `${catDocs.length} file${catDocs.length !== 1 ? 's' : ''} in S3`}
                  </p>
                </div>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search files..."
                    className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-44"
                  />
                </div>
              </div>

              {catDocs.length === 0 ? (
                <div className="text-center py-10">
                  <FileText size={24} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-gray-400 text-sm">No files in this category yet</p>
                  <p className="text-gray-300 text-xs mt-0.5">Drop files above to upload to S3</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50 bg-gray-50/50">
                      {['File', 'Status', 'Size', 'Uploaded', ''].map(h => (
                        <th key={h} className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catDocs.map(doc => (
                      <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                              <FileText size={13} className="text-blue-500" />
                            </div>
                            <span className="text-gray-800 text-xs font-medium truncate max-w-[180px]">{doc.fileName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-5"><StatusBadge status={doc.status} size="xs" /></td>
                        <td className="py-3 px-5 text-gray-400 text-xs">{doc.fileSize}</td>
                        <td className="py-3 px-5 text-gray-400 text-xs">
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                        <td className="py-3 px-5">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => downloadDoc(doc)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors" title="Download">
                              <Download size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
