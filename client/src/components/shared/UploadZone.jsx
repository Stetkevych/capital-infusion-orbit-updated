import React, { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle2, AlertCircle, X, FileText } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.docx,.doc,.xlsx,.xls,.csv';
const MAX_SIZE_MB = 50;

async function uploadToS3(file, category, clientId, uploadedBy, token, bankAccount) {
  const formData = new FormData();
  formData.append('files', file);
  formData.append('clientId', clientId);
  formData.append('category', category);
  formData.append('uploadedBy', uploadedBy || 'unknown');
  if (bankAccount) formData.append('bankAccount', bankAccount);

  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}/documents/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed (${res.status})`);
  }

  const data = await res.json();
  return data.docs?.[0]?.key || 'uploaded';
}

export default function UploadZone({
  category,
  categoryLabel,
  clientId,
  uploadedBy,
  token,
  onUpload,
  compact = false,
  defaultBankAccount = null,
}) {
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [bankAccount, setBankAccount] = useState(defaultBankAccount || 'Account 1');
  const inputRef = useRef();

  // Sync with parent's selected account
  useEffect(() => {
    if (defaultBankAccount) setBankAccount(defaultBankAccount);
  }, [defaultBankAccount]);

  const updateUpload = (id, patch) =>
    setUploads(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));

  const handleFiles = async (files) => {
    const list = Array.from(files);

    for (const file of list) {
      // Validate size
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setUploads(prev => [...prev, { id: `${Date.now()}_${file.name}`, name: file.name, status: 'error', error: `File too large (max ${MAX_SIZE_MB}MB)` }]);
        continue;
      }

      const id = `${Date.now()}_${file.name}`;
      setUploads(prev => [...prev, { id, name: file.name, size: file.size, status: 'uploading', progress: 0 }]);

      try {
        // Simulate progress while uploading (XHR would give real progress but fetch doesn't)
        const progressInterval = setInterval(() => {
          updateUpload(id, { progress: p => Math.min((p || 0) + 15, 85) });
        }, 300);

        await uploadToS3(file, category, clientId, uploadedBy, token, category === 'bank_statements' ? bankAccount : null);

        clearInterval(progressInterval);
        updateUpload(id, { status: 'done', progress: 100 });

        if (onUpload) onUpload(category, [file]);
      } catch (err) {
        updateUpload(id, { status: 'error', error: err.message });
        console.error('[UploadZone]', err.message);
      }
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeUpload = (id) => setUploads(prev => prev.filter(u => u.id !== id));

  const zone = (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-xl cursor-pointer transition-all text-center select-none ${
        dragging
          ? 'border-blue-500 bg-blue-50 scale-[1.01]'
          : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
      } ${compact ? 'p-4' : 'p-10'}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED}
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
      <Upload
        size={compact ? 18 : 26}
        className={`mx-auto mb-2 transition-colors ${dragging ? 'text-blue-500' : 'text-gray-400'}`}
      />
      {!compact && (
        <p className="text-gray-700 font-medium text-sm mb-0.5">{categoryLabel}</p>
      )}
      <p className="text-gray-400 text-xs">
        Drop files here or <span className="text-blue-500 font-medium">browse</span>
      </p>
      {!compact && (
        <p className="text-gray-300 text-xs mt-1">PDF · JPG · PNG · DOCX · Max {MAX_SIZE_MB}MB · Encrypted in S3</p>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      {category === 'bank_statements' && !compact && !defaultBankAccount && (
        <div className="flex items-center gap-2 mb-1">
          <label className="text-xs font-medium text-gray-500">Bank Account:</label>
          <select value={bankAccount} onChange={e => setBankAccount(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            {['Account 1', 'Account 2', 'Account 3', 'Account 4', 'Account 5'].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      )}
      {zone}

      {/* Upload status list */}
      {uploads.map(u => (
        <div
          key={u.id}
          className={`flex items-center gap-3 text-xs px-3 py-2.5 rounded-xl border transition-all ${
            u.status === 'done'
              ? 'bg-green-50 border-green-100'
              : u.status === 'error'
              ? 'bg-red-50 border-red-100'
              : 'bg-blue-50 border-blue-100'
          }`}
        >
          {/* Icon */}
          <div className="shrink-0">
            {u.status === 'done' && <CheckCircle2 size={14} className="text-green-600" />}
            {u.status === 'error' && <AlertCircle size={14} className="text-red-500" />}
            {u.status === 'uploading' && (
              <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <FileText size={11} className="text-gray-400 shrink-0" />
              <span className={`font-medium truncate ${
                u.status === 'done' ? 'text-green-700' :
                u.status === 'error' ? 'text-red-600' : 'text-blue-700'
              }`}>{u.name}</span>
            </div>

            {u.status === 'uploading' && (
              <div className="mt-1.5">
                <div className="w-full bg-blue-100 rounded-full h-1">
                  <div
                    className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${u.progress || 0}%` }}
                  />
                </div>
                <p className="text-blue-400 text-xs mt-0.5">Uploading to S3... {u.progress || 0}%</p>
              </div>
            )}

            {u.status === 'done' && (
              <p className="text-green-500 text-xs mt-0.5">✓ Saved to S3 · {u.size ? (u.size < 102400 ? `${Math.round(u.size/1024)} KB` : `${(u.size/1024/1024).toFixed(1)} MB`) : ''}</p>
            )}

            {u.status === 'error' && (
              <p className="text-red-400 text-xs mt-0.5">{u.error}</p>
            )}
          </div>

          {/* Remove button */}
          {u.status !== 'uploading' && (
            <button
              onClick={() => removeUpload(u.id)}
              className="shrink-0 p-1 hover:bg-white/60 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
