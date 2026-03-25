import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2 } from 'lucide-react';

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
      <div className="space-y-2">
        <div
          onClick={() => inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all duration-150 text-center ${
            dragging
              ? 'border-apple-blue bg-blue-50'
              : 'border-apple-gray6 hover:border-apple-blue/50 hover:bg-apple-gray9'
          }`}
        >
          <input ref={inputRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
          <Upload size={16} className={`mx-auto mb-1.5 ${dragging ? 'text-apple-blue' : 'text-apple-gray5'}`} />
          <p className="text-xs text-apple-gray4">Drop files or <span className="text-apple-blue font-medium">browse</span></p>
        </div>
        {uploaded.map((name, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
            <CheckCircle2 size={12} /> {name}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all duration-150 text-center ${
          dragging
            ? 'border-apple-blue bg-blue-50'
            : 'border-apple-gray6 hover:border-apple-blue/50 hover:bg-apple-gray9'
        }`}
      >
        <input ref={inputRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${dragging ? 'bg-apple-blue' : 'bg-apple-gray8'}`}>
          <Upload size={22} className={dragging ? 'text-white' : 'text-apple-gray4'} />
        </div>
        <p className="text-apple-gray1 font-medium text-sm">{categoryLabel}</p>
        <p className="text-apple-gray4 text-xs mt-1">Drag & drop or <span className="text-apple-blue font-medium">browse files</span></p>
        <p className="text-apple-gray5 text-xs mt-1">PDF, JPG, PNG, DOCX</p>
      </div>
      {uploaded.map((name, i) => (
        <div key={i} className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
          <CheckCircle2 size={13} /> {name} — queued for upload
        </div>
      ))}
    </div>
  );
}
