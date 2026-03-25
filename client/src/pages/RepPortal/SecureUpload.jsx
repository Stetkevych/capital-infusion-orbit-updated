import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getClientById, getClientsByRep, CLIENTS, DOC_CATEGORIES, getDocumentsByClient } from '../../data/mockData';
import StatusBadge from '../../components/shared/StatusBadge';
import {
  Upload, CheckCircle2, FileText, X,
  FolderOpen, ChevronDown, Search, Eye, Download, Trash2
} from 'lucide-react';

// ─── S3 Upload Hook (wire to real presigned URL endpoint later) ───────────────
function useS3Upload() {
  const [uploads, setUploads] = useState({});

  const uploadFile = async (file, category, clientId) => {
    const key = `${clientId}/${category}/${Date.now()}_${file.name}`;
    setUploads(prev => ({ ...prev, [key]: { name: file.name, category, progress: 0, status: 'uploading' } }));

    // Simulate upload progress — replace with:
    // const { url } = await fetch('/api/documents/presign', { method:'POST', body: JSON.stringify({ key, contentType: file.type }) }).then(r=>r.json());
    // await axios.put(url, file, { onUploadProgress: e => setProgress(Math.round(e.loaded/e.total*100)) });
    for (let p = 10; p <= 100; p += 10) {
      await new Promise(r => setTimeout(r, 80));
      setUploads(prev => ({ ...prev, [key]: { ...prev[key], progress: p } }));
    }
    setUploads(prev => ({ ...prev, [key]: { ...prev[key], status: 'done' } }));
    return key;
  };

  const removeUpload = (key) => setUploads(prev => { const n = { ...prev }; delete n[key]; return n; });

  return { uploads, uploadFile, removeUpload };
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────
function DropZone({ category, clientId, onFiles }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();
  const cat = DOC_CATEGORIES.find(c => c.id === category);

  const handle = (files) => onFiles(Array.from(files), category, clientId);

  return (
    <div
      onClick={() => inputRef.current.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
      className={`border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all duration-150 text-center ${
        dragging ? 'border-apple-blue bg-blue-50' : 'border-apple-gray6 hover:border-apple-blue/50 hover:bg-apple-gray9'
      }`}
    >
      <input ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.docx" className="hidden"
        onChange={e => handle(e.target.files)} />
      <Upload size={20} className={`mx-auto mb-2 ${dragging ? 'text-apple-blue' : 'text-apple-gray5'}`} />
      <p className="text-apple-gray2 text-sm font-medium">{cat?.label}</p>
      <p className="text-apple-gray4 text-xs mt-0.5">Drop files or <span className="text-apple-blue">browse</span></p>
      <p className="text-apple-gray5 text-xs mt-0.5">PDF · JPG · PNG · DOCX</p>
    </div>
  );
}

// ─── Upload Progress Item ─────────────────────────────────────────────────────
function UploadItem({ item, onRemove }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-apple-gray7 rounded-xl px-4 py-3 shadow-apple-sm">
      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
        <FileText size={14} className="text-apple-blue" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-apple-gray1 text-xs font-medium truncate">{item.name}</p>
        {item.status === 'uploading' ? (
          <div className="mt-1.5">
            <div className="w-full bg-apple-gray7 rounded-full h-1">
              <div className="bg-apple-blue h-1 rounded-full transition-all duration-150" style={{ width: `${item.progress}%` }} />
            </div>
            <p className="text-apple-gray4 text-xs mt-0.5">{item.progress}%</p>
          </div>
        ) : (
          <p className="text-green-600 text-xs mt-0.5 flex items-center gap-1"><CheckCircle2 size={11} /> Uploaded</p>
        )}
      </div>
      {item.status === 'done' && (
        <button onClick={onRemove} className="p-1 hover:bg-apple-gray8 rounded-lg text-apple-gray4 hover:text-red-500 transition-colors">
          <X size={13} />
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SecureUpload() {
  const { user } = useAuth();
  const { uploads, uploadFile, removeUpload } = useS3Upload();
  const [selectedClient, setSelectedClient] = useState(user.clientId || '');
  const [activeCategory, setActiveCategory] = useState(DOC_CATEGORIES[0].id);
  const [search, setSearch] = useState('');

  const isRep = user.role === 'rep' || user.role === 'admin';
  const availableClients = user.role === 'admin' ? CLIENTS : isRep ? getClientsByRep(user.repId) : [];
  const clientId = isRep ? selectedClient : user.clientId;
  const client = getClientById(clientId);
  const existingDocs = clientId ? getDocumentsByClient(clientId) : [];

  const handleFiles = async (files, category, cId) => {
    for (const file of files) {
      await uploadFile(file, category, cId || clientId);
    }
  };

  const uploadList = Object.entries(uploads);
  const filteredDocs = existingDocs.filter(d =>
    (!search || d.fileName.toLowerCase().includes(search.toLowerCase())) &&
    d.category === activeCategory &&
    (user.role !== 'client' || d.visibility !== 'internal')
  );

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-apple-gray1 tracking-tight">Secure Upload</h1>
          <p className="text-apple-gray4 text-sm mt-0.5">
            Files are encrypted in transit and stored securely in AWS S3
          </p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-green-700 text-xs font-medium">S3 Connected</span>
        </div>
      </div>

      {/* Client selector for reps */}
      {isRep && (
        <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 p-4">
          <label className="block text-xs font-medium text-apple-gray3 mb-2 uppercase tracking-wide">Uploading for Client</label>
          <div className="relative">
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
              className="w-full appearance-none bg-apple-gray9 border border-apple-gray7 text-apple-gray1 text-sm rounded-xl px-4 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 focus:border-apple-blue"
            >
              <option value="">Select a client...</option>
              {availableClients.map(c => (
                <option key={c.id} value={c.id}>{c.businessName} — {c.ownerName}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-gray4 pointer-events-none" />
          </div>
          {client && (
            <div className="mt-3 flex items-center gap-3 pt-3 border-t border-apple-gray7">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-apple-blue font-bold text-sm">
                {client.businessName[0]}
              </div>
              <div>
                <p className="text-apple-gray1 text-sm font-medium">{client.businessName}</p>
                <p className="text-apple-gray4 text-xs">{client.ownerName} · {client.email}</p>
              </div>
              <StatusBadge status={client.status} size="xs" />
            </div>
          )}
        </div>
      )}

      {(!clientId) ? (
        <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 p-12 text-center">
          <FolderOpen size={32} className="mx-auto text-apple-gray5 mb-3" />
          <p className="text-apple-gray3 font-medium text-sm">Select a client to begin uploading</p>
        </div>
      ) : (
        <div className="grid grid-cols-[220px_1fr] gap-5">
          {/* Category sidebar */}
          <div className="space-y-3">
            <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 p-3">
              <p className="text-apple-gray5 text-xs font-medium uppercase tracking-wider px-2 mb-2">Categories</p>
              <nav className="space-y-0.5">
                {DOC_CATEGORIES.map(cat => {
                  const count = existingDocs.filter(d => d.category === cat.id).length;
                  const active = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all duration-150 ${
                        active ? 'bg-apple-blue/10 text-apple-blue' : 'text-apple-gray3 hover:bg-apple-gray8 hover:text-apple-gray1'
                      }`}
                    >
                      <span className="text-xs font-medium">{cat.icon} {cat.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                        count > 0 ? 'bg-apple-gray7 text-apple-gray4' : 'bg-red-50 text-red-400'
                      }`}>{count}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Upload queue */}
            {uploadList.length > 0 && (
              <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 p-3">
                <p className="text-apple-gray5 text-xs font-medium uppercase tracking-wider px-2 mb-2">Upload Queue</p>
                <div className="space-y-2">
                  {uploadList.map(([key, item]) => (
                    <UploadItem key={key} item={item} onRemove={() => removeUpload(key)} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main panel */}
          <div className="space-y-4">
            {/* Drop zone */}
            <DropZone category={activeCategory} clientId={clientId} onFiles={handleFiles} />

            {/* Existing files */}
            <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-apple-gray7">
                <div>
                  <p className="text-apple-gray1 font-semibold text-sm">
                    {DOC_CATEGORIES.find(c => c.id === activeCategory)?.label}
                  </p>
                  <p className="text-apple-gray4 text-xs">{filteredDocs.length} file{filteredDocs.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray5" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search files..."
                    className="pl-8 pr-3 py-1.5 bg-apple-gray9 border border-apple-gray7 rounded-lg text-apple-gray1 text-xs focus:outline-none focus:ring-2 focus:ring-apple-blue/30 w-44"
                  />
                </div>
              </div>

              {filteredDocs.length === 0 ? (
                <div className="text-center py-10">
                  <Upload size={24} className="mx-auto text-apple-gray6 mb-2" />
                  <p className="text-apple-gray4 text-sm">No files uploaded yet</p>
                  <p className="text-apple-gray5 text-xs mt-0.5">Drop files above to upload</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-apple-gray7 bg-apple-gray9">
                      <th className="text-left py-2.5 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">File</th>
                      <th className="text-left py-2.5 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">Status</th>
                      <th className="text-left py-2.5 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">Size</th>
                      <th className="text-left py-2.5 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">Date</th>
                      <th className="text-right py-2.5 px-5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map(doc => (
                      <tr key={doc.id} className="border-b border-apple-gray7 hover:bg-apple-gray9 transition-colors group">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                              <FileText size={13} className="text-apple-blue" />
                            </div>
                            <span className="text-apple-gray1 text-xs font-medium truncate max-w-[160px]">{doc.fileName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-5"><StatusBadge status={doc.status} size="xs" /></td>
                        <td className="py-3 px-5 text-apple-gray4 text-xs">{doc.fileSize}</td>
                        <td className="py-3 px-5 text-apple-gray4 text-xs">
                          {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-5">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1.5 hover:bg-apple-gray7 rounded-lg text-apple-gray4 hover:text-apple-gray1 transition-colors"><Eye size={13} /></button>
                            <button className="p-1.5 hover:bg-apple-gray7 rounded-lg text-apple-gray4 hover:text-apple-gray1 transition-colors"><Download size={13} /></button>
                            {(user.role === 'rep' || user.role === 'admin') && (
                              <button className="p-1.5 hover:bg-red-50 rounded-lg text-apple-gray4 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                            )}
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
