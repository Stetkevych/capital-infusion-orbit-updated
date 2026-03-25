import React, { useState, useRef } from 'react';
import { Upload, CheckCircle } from 'lucide-react';

export default function UploadZone({ category, categoryLabel, onUpload, compact = false }) {
  const [dragging, setDragging] = useState(false);
  const [uploaded, setUploaded] = useState([]);
  const inputRef = useRef();

  const handleFiles = (files) => {
    const list = Array.from(files);
    setUploaded(prev => [...prev, ...list.map(f => f.name)]);
    if (onUpload) onUpload(category, list);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  if (compact) {
    return (
      <div
        onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg p-4 cursor-pointer transition text-center ${
          dragging ? 'border-blue-500 bg-blue-900/20' : 'border-slate-700 hover:border-slate-500'
        }`}
      >
        <input ref={inputRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
        <Upload size={16} className="mx-auto text-slate-500 mb-1" />
        <p className="text-xs text-slate-500">Drop files or click to upload</p>
        {uploaded.length > 0 && (
          <div className="mt-2 space-y-1">
            {uploaded.map((name, i) => (
              <div key={i} className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle size={11} /> {name}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-8 cursor-pointer transition text-center ${
          dragging ? 'border-blue-500 bg-blue-900/20' : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
        }`}
      >
        <input ref={inputRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
        <Upload size={28} className="mx-auto text-slate-500 mb-3" />
        <p className="text-slate-300 font-medium text-sm">{categoryLabel}</p>
        <p className="text-slate-500 text-xs mt-1">Drag & drop files here, or click to browse</p>
        <p className="text-slate-600 text-xs mt-1">PDF, JPG, PNG, DOCX accepted</p>
      </div>
      {uploaded.length > 0 && (
        <div className="space-y-1">
          {uploaded.map((name, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-green-400 bg-green-900/20 border border-green-900 rounded px-3 py-1.5">
              <CheckCircle size={13} /> {name} — queued for upload
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
