import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Shield, Save, Loader2, CheckCircle2, ExternalLink, X } from 'lucide-react';

const OCR_URL = 'https://capital-infusion-ocr.onrender.com';
const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

export default function AutoUnderwriting() {
  const { token } = useAuth();
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [pasteData, setPasteData] = useState('');
  const [error, setError] = useState('');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/clients-api/list`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => setClients(Array.isArray(data) ? data : data.clients || []))
      .catch(() => {});
  }, []);

  const filteredClients = clients.filter(c => {
    if (!searchClient) return true;
    const q = searchClient.toLowerCase();
    return (c.business_name || '').toLowerCase().includes(q) || (c.full_name || '').toLowerCase().includes(q);
  });

  const saveToClient = async () => {
    if (!selectedClient) return;
    setSaving(true); setError('');
    try {
      let results;
      try { results = JSON.parse(pasteData); } catch { throw new Error('Invalid JSON — paste the OCR output data'); }
      const res = await fetch(`${API}/ocr/results`, {
        method: 'POST', headers,
        body: JSON.stringify({ clientId: selectedClient, results, analyzedAt: new Date().toISOString() })
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaved(true);
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-gray-900 font-semibold text-sm">Underwriting</h1>
            <p className="text-gray-400 text-xs">Capital Infusion Custom OCR — Auto Underwrite Gold</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSave(!showSave)}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5">
            <Save size={12} /> Save to Client
          </button>
          <a href={OCR_URL} target="_blank" rel="noopener noreferrer"
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg flex items-center gap-1.5">
            <ExternalLink size={12} /> Open in New Tab
          </a>
        </div>
      </div>

      {/* Save Panel */}
      {showSave && (
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          {saved ? (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 size={14} /> Results saved to client successfully
              <button onClick={() => { setSaved(false); setShowSave(false); setPasteData(''); }} className="ml-auto text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Paste the OCR JSON output below, select a client, and save.</p>
              <textarea value={pasteData} onChange={e => setPasteData(e.target.value)} rows={3} placeholder='Paste OCR results JSON here...'
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none" />
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <input value={searchClient} onChange={e => setSearchClient(e.target.value)} placeholder="Search clients..."
                    className="w-full px-3 py-2 mb-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                  <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/20">
                    <option value="">Select a client...</option>
                    {filteredClients.map(c => (
                      <option key={c.id} value={c.id}>{c.business_name || c.full_name} {c.business_name && c.full_name ? `(${c.full_name})` : ''}</option>
                    ))}
                  </select>
                </div>
                <button onClick={saveToClient} disabled={!selectedClient || !pasteData || saving}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                </button>
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
            </div>
          )}
        </div>
      )}

      {/* OCR iframe */}
      <div className="flex-1">
        <iframe
          src={OCR_URL}
          title="Capital Infusion OCR"
          className="w-full h-full border-0"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
