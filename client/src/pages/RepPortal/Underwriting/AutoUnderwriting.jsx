import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Upload, FileText, AlertTriangle, CheckCircle2, TrendingUp, DollarSign, Shield, Loader2, X } from 'lucide-react';

const OCR_API = process.env.REACT_APP_OCR_URL || 'http://ocr-service-env.eba-edvt4p6e.us-east-1.elasticbeanstalk.com';

function MetricCard({ label, value, sub, color = 'blue' }) {
  const colors = { blue: 'text-blue-600 bg-blue-50', green: 'text-green-600 bg-green-50', red: 'text-red-600 bg-red-50', purple: 'text-purple-600 bg-purple-50', amber: 'text-amber-600 bg-amber-50' };
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-bold ${colors[color]?.split(' ')[0] || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function RiskBadge({ level }) {
  const cfg = { 'Low Risk': 'bg-green-50 text-green-700 border-green-200', 'Medium Risk': 'bg-amber-50 text-amber-700 border-amber-200', 'High Risk': 'bg-red-50 text-red-700 border-red-200' };
  return <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${cfg[level] || cfg['Medium Risk']}`}>{level}</span>;
}

export default function AutoUnderwriting() {
  const { token } = useAuth();
  const [files, setFiles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files || e.dataTransfer?.files || []);
    setFiles(prev => [...prev, ...selected]);
    setResults(null);
    setError('');
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const analyze = async () => {
    if (!files.length) return;
    setAnalyzing(true);
    setError('');
    setResults(null);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      const res = await fetch(`${OCR_API}/analyze`, { method: 'POST', body: fd });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Analysis failed'); }
      setResults(await res.json());
    } catch (e) { setError(e.message); }
    setAnalyzing(false);
  };

  const fmt = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
          <Shield size={22} className="text-blue-600" /> Capital Infusion Custom OCR
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Auto Underwrite Gold</p>
      </div>

      {/* Upload area */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleFiles(e); }}
          onClick={() => document.getElementById('ocr-upload').click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
          <Upload size={28} className="mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600 text-sm font-medium">Drop bank statements here or click to upload</p>
          <p className="text-gray-400 text-xs mt-1">PDF, CSV, XLSX — Multiple files supported</p>
          <input id="ocr-upload" type="file" multiple accept=".pdf,.csv,.xlsx,.xls" hidden onChange={handleFiles} />
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-blue-600" />
                  <span className="text-sm text-gray-700">{f.name}</span>
                  <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                </div>
                <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
              </div>
            ))}
            <button onClick={analyze} disabled={analyzing}
              className="w-full mt-3 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors">
              {analyzing ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : <><Shield size={16} /> Run Analysis</>}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Total Revenue" value={fmt(results.summary.total_revenue)} color="green" />
            <MetricCard label="Total Debits" value={fmt(results.summary.total_debits)} color="red" />
            <MetricCard label="Cash Flow" value={fmt(results.summary.cash_flow)} color={results.summary.cash_flow >= 0 ? 'green' : 'red'} />
            <MetricCard label="Lender Debits" value={fmt(results.summary.total_lender_debits)} color="purple" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Withholding Rate" value={`${results.summary.withholding_rate.toFixed(1)}%`} color="amber" />
            <MetricCard label="NSF Count" value={results.summary.nsf_count} color={results.summary.nsf_count > 0 ? 'red' : 'green'} />
            <MetricCard label="Risk Score" value={results.summary.risk_score} color={results.summary.risk_score > 60 ? 'red' : results.summary.risk_score > 30 ? 'amber' : 'green'} />
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center justify-center">
              <RiskBadge level={results.summary.risk_level} />
            </div>
          </div>

          {/* Statements table */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-sm font-semibold text-gray-900">Statement Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">
                  {['Statement', 'Revenue', 'Debits', 'Lender Debits', 'Withholding', 'NSF'].map(h => (
                    <th key={h} className="text-left py-2.5 px-4 text-gray-400 text-xs font-medium uppercase">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {results.statements.map((s, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2.5 px-4 text-gray-900 font-medium text-xs">{s.statement}</td>
                      <td className="py-2.5 px-4 text-green-600">{fmt(s.revenue)}</td>
                      <td className="py-2.5 px-4 text-red-600">{fmt(s.debits)}</td>
                      <td className="py-2.5 px-4 text-purple-600">{fmt(s.lender_debits)}</td>
                      <td className="py-2.5 px-4 text-gray-700">{s.withholding_rate.toFixed(1)}%</td>
                      <td className="py-2.5 px-4">{s.nsf_count > 0 ? <span className="text-red-600 font-bold">{s.nsf_count}</span> : <span className="text-green-600">0</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Lenders */}
          {results.lenders.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-sm font-semibold text-gray-900">Detected Lenders</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100">
                    {['Lender', 'Matched Keyword', 'Debit Amount'].map(h => (
                      <th key={h} className="text-left py-2.5 px-4 text-gray-400 text-xs font-medium uppercase">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {results.lenders.map((l, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2 px-4 text-gray-900 font-medium">{l['Detected Lender']}</td>
                        <td className="py-2 px-4 text-gray-500 text-xs font-mono">{l['Matched Keyword']}</td>
                        <td className="py-2 px-4 text-purple-600">{fmt(l['Lender Debit Amount'])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Risk Notes */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-600" /> Underwriting Notes
            </h2>
            <div className="space-y-2">
              {results.summary.notes.map((note, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                  {note}
                </div>
              ))}
            </div>
          </div>

          {results.summary.funding_detected && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-3">
              <AlertTriangle size={14} /> Existing funding detected — review lender positions before approval
            </div>
          )}
        </div>
      )}
    </div>
  );
}
