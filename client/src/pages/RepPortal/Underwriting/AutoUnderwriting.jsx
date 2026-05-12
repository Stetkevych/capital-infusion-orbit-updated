import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Shield, Save, Loader2, CheckCircle2, ExternalLink, X, Search } from 'lucide-react';

const OCR_URL = 'https://capital-infusion-ocr.onrender.com';
const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

export default function AutoUnderwriting() {
  const { token, user } = useAuth();
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ revenue: '', debits: '', nsfs: '', withholding_rate: '' });

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/clients-api/list`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : data.clients || [];
        if (user?.role === 'admin') {
          setClients(list);
        } else {
          setClients(list.filter(c => c.assignedRepId === user?.rep_id || c.assignedRepId === user?.id));
        }
      })
      .catch(() => {});
  }, []);

  const filteredClients = clients.filter(c => {
    if (!searchClient) return true;
    const q = searchClient.toLowerCase();
    return (c.business_name || '').toLowerCase().includes(q) || (c.full_name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
  });

  const saveToClient = async () => {
    if (!selectedClient) return;
    setSaving(true); setError('');
    try {
      const results = {
        summary: {
          total_revenue: parseFloat(form.revenue) || 0,
          total_debits: parseFloat(form.debits) || 0,
          nsf_count: parseInt(form.nsfs) || 0,
          withholding_rate: parseFloat(form.withholding_rate) || 0,
          cash_flow: (parseFloat(form.revenue) || 0) - (parseFloat(form.debits) || 0),
        }
      };
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
          <button onClick={() => { setShowSave(!showSave); setSaved(false); }}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5">
            <Save size={12} /> Save to Client
          </button>
          <a href={OCR_URL} target="_blank" rel="noopener noreferrer"
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg flex items-center gap-1.5">
            <ExternalLink size={12} /> Open in New Tab
          </a>
        </div>
      </div>

      {showSave && (
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          {saved ? (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 size={14} /> Saved successfully
              <button onClick={() => { setSaved(false); setShowSave(false); setForm({ revenue: '', debits: '', nsfs: '', withholding_rate: '' }); setSelectedClient(''); }} className="ml-auto text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={searchClient} onChange={e => setSearchClient(e.target.value)} placeholder="Search clients..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
              <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/20">
                <option value="">Select a client...</option>
                {filteredClients.map(c => (
                  <option key={c.id} value={c.id}>{c.business_name || c.full_name}{c.business_name && c.full_name ? ` (${c.full_name})` : ''}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Revenue</label>
                  <input type="number" value={form.revenue} onChange={e => setForm(f => ({ ...f, revenue: e.target.value }))} placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Debits</label>
                  <input type="number" value={form.debits} onChange={e => setForm(f => ({ ...f, debits: e.target.value }))} placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">NSFs</label>
                  <input type="number" value={form.nsfs} onChange={e => setForm(f => ({ ...f, nsfs: e.target.value }))} placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Withholding %</label>
                  <input type="number" value={form.withholding_rate} onChange={e => setForm(f => ({ ...f, withholding_rate: e.target.value }))} placeholder="0.0"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                </div>
              </div>
              <button onClick={saveToClient} disabled={!selectedClient || saving}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save to Client
              </button>
              {error && <p className="text-red-500 text-xs">{error}</p>}
            </div>
          )}
        </div>
      )}

      <div className="flex-1" style={{ minHeight: '900px' }}>
        <iframe
          src={OCR_URL}
          title="Capital Infusion OCR"
          className="w-full border-0"
          style={{ height: 'calc(100vh - 80px)', minHeight: '900px' }}
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
