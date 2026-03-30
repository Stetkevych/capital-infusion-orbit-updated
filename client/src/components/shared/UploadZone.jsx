import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://capital-infusion-api-prod.eba-wqytrheg.us-east-1.elasticbeanstalk.com/api';

async function uploadToS3(file, category, clientId, uploadedBy) {
  const presignRes = await fetch(`${API}/documents/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, category, fileName: file.name, contentType: file.type }),
  });
  if (!presignRes.ok) throw new Error('Failed to get upload URL');
  const { url, key } = await presignRes.json();

  const uploadRes = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
  if (!uploadRes.ok) throw new Error('Upload failed');

  await fetch(`${API}/documents/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, clientId, category, fileName: file.name, fileSize: `${(file.size/1024/1024).toFixed(1)} MB`, uploadedBy }),
  });
  return key;
}

export default function UploadZone({ category, categoryLabel, clientId, uploadedBy, onUpload, compact = false }) {
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState([]);
  const inputRef = useRef();

  const handleFiles = async (files) => {
    for (const file of Array.from(files)) {
      const id = `${Date.now()}_${file.name}`;
      setUploads(prev => [...prev, { id, name: file.name, status: 'uploading' }]);
      try {
        if (clientId) await uploadToS3(file, category, clientId, uploadedBy);
        setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'done' } : u));
        if (onUpload) onUpload(category, [file]);
      } catch (err) {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'error', error: err.message } : u));
      }
    }
  };

  return (
    <div className="space-y-2">
      <div
        onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-xl cursor-pointer transition-all text-center ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
        } ${compact ? 'p-4' : 'p-10'}`}
      >
        <input ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.docx" className="hidden" onChange={e => handleFiles(e.target.files)} />
        <Upload size={compact ? 16 : 22} className={`mx-auto mb-2 ${dragging ? 'text-blue-500' : 'text-gray-400'}`} />
        {!compact && <p className="text-gray-700 font-medium text-sm mb-0.5">{categoryLabel}</p>}
        <p className="text-gray-400 text-xs">Drop files or <span className="text-blue-500 font-medium">browse</span></p>
        {!compact && <p className="text-gray-300 text-xs mt-0.5">PDF · JPG · PNG · DOCX · Encrypted in S3</p>}
      </div>
      {uploads.map(u => (
        <div key={u.id} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
          u.status === 'done' ? 'bg-green-50 border-green-100 text-green-600' :
          u.status === 'error' ? 'bg-red-50 border-red-100 text-red-500' :
          'bg-blue-50 border-blue-100 text-blue-500'
        }`}>
          {u.status === 'done' && <CheckCircle2 size={12} />}
          {u.status === 'error' && <AlertCircle size={12} />}
          {u.status === 'uploading' && <span className="animate-spin">⟳</span>}
          <span className="truncate">{u.name}</span>
          <span className="ml-auto shrink-0">
            {u.status === 'done' && 'Saved to S3'}
            {u.status === 'error' && (u.error || 'Failed')}
            {u.status === 'uploading' && 'Uploading...'}
          </span>
        </div>
      ))}
    </div>
  );
}
