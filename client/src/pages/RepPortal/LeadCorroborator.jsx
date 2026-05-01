import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download, Trash2, Search, Sparkles } from 'lucide-react';

function isEmail(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim().toLowerCase());
}

function extractEmails(sheet) {
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (!json.length) return [];
  const headerRow = json[0];
  const emailCols = [];
  headerRow.forEach((h, i) => {
    const col = json.slice(1, 6).map(r => r[i]).filter(Boolean);
    if (col.some(v => isEmail(String(v)))) emailCols.push(i);
  });
  if (!emailCols.length) {
    // fallback: check all columns
    headerRow.forEach((_, i) => {
      const col = json.slice(1).map(r => r[i]).filter(Boolean);
      if (col.filter(v => isEmail(String(v))).length > col.length * 0.3) emailCols.push(i);
    });
  }
  const emails = new Set();
  json.slice(1).forEach(row => {
    emailCols.forEach(i => {
      const v = row[i];
      if (v && isEmail(String(v))) emails.add(String(v).trim().toLowerCase());
    });
  });
  return { emails: [...emails], colNames: emailCols.map(i => headerRow[i] || `Column ${i + 1}`), totalRows: json.length - 1 };
}

function DropZone({ label, side, file, onDrop, onClear, result }) {
  const [dragging, setDragging] = useState(false);
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (f) onDrop(f);
  }, [onDrop]);

  return (
    <div className="flex-1">
      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">{label}</p>
      {!file ? (
        <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}
          onClick={() => document.getElementById(`file-${side}`).click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'}`}>
          <Upload size={24} className="mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600 text-sm font-medium">Drop Excel file here</p>
          <p className="text-gray-400 text-xs mt-1">.xlsx, .xls, .csv</p>
          <input id={`file-${side}`} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleDrop} />
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-green-600" />
              <span className="text-sm font-medium text-gray-800 truncate">{file.name}</span>
            </div>
            <button onClick={onClear} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
          </div>
          {result && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500">{result.totalRows} rows · {result.emails.length} emails found</p>
              <p className="text-xs text-gray-400">Columns: {result.colNames.join(', ')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function downloadCSV(rows, filename) {
  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = filename; a.click();
}

export default function LeadCorroborator() {
  const [leftFile, setLeftFile] = useState(null);
  const [rightFile, setRightFile] = useState(null);
  const [leftResult, setLeftResult] = useState(null);
  const [rightResult, setRightResult] = useState(null);
  const [matches, setMatches] = useState(null);
  const [leftOnly, setLeftOnly] = useState(null);
  const [rightOnly, setRightOnly] = useState(null);
  const [tab, setTab] = useState('corroborator');
  const [cleanerFile, setCleanerFile] = useState(null);
  const [cleanerResult, setCleanerResult] = useState(null);

  const parseFile = (file, cb) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      cb(extractEmails(sheet));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleLeft = (f) => { setLeftFile(f); parseFile(f, r => setLeftResult(r)); setMatches(null); };
  const handleRight = (f) => { setRightFile(f); parseFile(f, r => setRightResult(r)); setMatches(null); };

  const runComparison = () => {
    if (!leftResult || !rightResult) return;
    const leftSet = new Set(leftResult.emails);
    const rightSet = new Set(rightResult.emails);
    const m = leftResult.emails.filter(e => rightSet.has(e));
    const lo = leftResult.emails.filter(e => !rightSet.has(e));
    const ro = rightResult.emails.filter(e => !leftSet.has(e));
    setMatches(m); setLeftOnly(lo); setRightOnly(ro);
  };

  const handleCleaner = (e) => {
    const f = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (!f) return;
    setCleanerFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const result = extractEmails(sheet);
      setCleanerResult(result);
    };
    reader.readAsArrayBuffer(f);
  };

  const exportCleaned = () => {
    if (!cleanerResult) return;
    downloadCSV(['email', ...cleanerResult.emails], `cleaned-emails-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center"><Search size={16} className="text-white" /></div>
          <div>
            <h1 className="text-gray-900 font-semibold text-sm">Lead Corroborator</h1>
            <p className="text-gray-400 text-xs">Compare Excel lists & clean email data</p>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setTab('corroborator')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === 'corroborator' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            Corroborator
          </button>
          <button onClick={() => setTab('cleaner')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === 'cleaner' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            Excel Cleaner
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'corroborator' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex gap-6">
              <DropZone label="List A (Left)" side="left" file={leftFile} onDrop={handleLeft} onClear={() => { setLeftFile(null); setLeftResult(null); setMatches(null); }} result={leftResult} />
              <DropZone label="List B (Right)" side="right" file={rightFile} onDrop={handleRight} onClear={() => { setRightFile(null); setRightResult(null); setMatches(null); }} result={rightResult} />
            </div>

            <button onClick={runComparison} disabled={!leftResult || !rightResult}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2">
              <Search size={14} /> Compare Lists
            </button>

            {matches !== null && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{matches.length}</p>
                    <p className="text-xs text-red-500 font-medium mt-1">Overlapping (Duplicates)</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{leftOnly.length}</p>
                    <p className="text-xs text-blue-500 font-medium mt-1">Only in List A</p>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{rightOnly.length}</p>
                    <p className="text-xs text-green-500 font-medium mt-1">Only in List B</p>
                  </div>
                </div>

                {/* Export buttons */}
                <div className="flex gap-2">
                  <button onClick={() => downloadCSV(['email', ...matches], 'overlapping-emails.csv')} disabled={!matches.length}
                    className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-40">
                    <Download size={12} /> Export Overlaps ({matches.length})
                  </button>
                  <button onClick={() => downloadCSV(['email', ...leftOnly], 'list-a-unique.csv')} disabled={!leftOnly.length}
                    className="flex-1 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-40">
                    <Download size={12} /> Export A Only ({leftOnly.length})
                  </button>
                  <button onClick={() => downloadCSV(['email', ...rightOnly], 'list-b-unique.csv')} disabled={!rightOnly.length}
                    className="flex-1 py-2.5 bg-green-50 hover:bg-green-100 border border-green-100 text-green-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-40">
                    <Download size={12} /> Export B Only ({rightOnly.length})
                  </button>
                </div>

                {/* Matches list */}
                {matches.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-red-50/50">
                      <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5"><AlertCircle size={14} /> Overlapping Emails ({matches.length})</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                      {matches.map((e, i) => <div key={i} className="px-4 py-2 text-sm text-gray-700 font-mono">{e}</div>)}
                    </div>
                  </div>
                )}

                {/* Unique lists */}
                <div className="grid grid-cols-2 gap-4">
                  {leftOnly.length > 0 && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/50">
                        <p className="text-sm font-semibold text-blue-700">Only in List A ({leftOnly.length})</p>
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                        {leftOnly.slice(0, 100).map((e, i) => <div key={i} className="px-4 py-1.5 text-xs text-gray-600 font-mono">{e}</div>)}
                        {leftOnly.length > 100 && <div className="px-4 py-2 text-xs text-gray-400">...and {leftOnly.length - 100} more</div>}
                      </div>
                    </div>
                  )}
                  {rightOnly.length > 0 && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 bg-green-50/50">
                        <p className="text-sm font-semibold text-green-700">Only in List B ({rightOnly.length})</p>
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                        {rightOnly.slice(0, 100).map((e, i) => <div key={i} className="px-4 py-1.5 text-xs text-gray-600 font-mono">{e}</div>)}
                        {rightOnly.length > 100 && <div className="px-4 py-2 text-xs text-gray-400">...and {rightOnly.length - 100} more</div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'cleaner' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-gray-900 font-semibold text-lg mb-1">Excel Cleaner</h2>
              <p className="text-gray-400 text-sm">Drop an Excel file and extract only the email addresses into a clean single-column CSV.</p>
            </div>

            <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleCleaner(e); }}
              onClick={() => document.getElementById('cleaner-file').click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-all">
              <Sparkles size={28} className="mx-auto mb-3 text-violet-400" />
              <p className="text-gray-600 text-sm font-medium">Drop Excel file here to extract emails</p>
              <p className="text-gray-400 text-xs mt-1">.xlsx, .xls, .csv</p>
              <input id="cleaner-file" type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleCleaner} />
            </div>

            {cleanerFile && cleanerResult && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-gray-800">{cleanerFile.name}</span>
                  </div>
                  <span className="text-xs bg-violet-50 text-violet-600 px-2.5 py-1 rounded-full font-medium">{cleanerResult.emails.length} emails extracted</span>
                </div>
                <p className="text-xs text-gray-400">From {cleanerResult.totalRows} rows · Columns: {cleanerResult.colNames.join(', ')}</p>

                <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-xl p-3 divide-y divide-gray-100">
                  {cleanerResult.emails.slice(0, 50).map((e, i) => (
                    <div key={i} className="py-1.5 text-xs text-gray-700 font-mono flex items-center gap-2">
                      <CheckCircle2 size={11} className="text-green-500 shrink-0" /> {e}
                    </div>
                  ))}
                  {cleanerResult.emails.length > 50 && <div className="py-2 text-xs text-gray-400">...and {cleanerResult.emails.length - 50} more</div>}
                </div>

                <button onClick={exportCleaned}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2">
                  <Download size={14} /> Download Clean Email CSV ({cleanerResult.emails.length} emails)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
