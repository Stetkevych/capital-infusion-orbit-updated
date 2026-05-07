import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock, Plus, X, Send, Bell, CheckCircle2, Mail } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function RequestsPage() {
  const { user, token } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clientId: '', category: '', instructions: '', dueDate: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);
  const [requests, setRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      fetch(`${API}/clients-api/requests/all`, { headers }).then(r => r.ok ? r.json() : []),
      fetch(`${API}/clients-api`, { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([reqs, cls]) => {
      setRequests(Array.isArray(reqs) ? reqs : []);
      setClients(Array.isArray(cls) ? cls : cls.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const pending = requests.filter(r => r.status === 'Pending').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const completed = requests.filter(r => r.status === 'Completed').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setSent(null);
    const client = clients.find(c => c.id === form.clientId);
    try {
      await fetch(`${API}/clients-api/${form.clientId}/reminder`, {
        method: 'POST', headers,
        body: JSON.stringify({ category: form.category, categoryLabel: form.category, instructions: form.instructions, customMessage: form.instructions }),
      });
      setSent({ client: client?.businessName || client?.ownerName, email: client?.email, category: form.category });
      // Refresh requests
      const reqs = await fetch(`${API}/clients-api/requests/all`, { headers }).then(r => r.ok ? r.json() : []);
      setRequests(Array.isArray(reqs) ? reqs : []);
    } catch (err) {
      console.warn('Request failed:', err.message);
    }
    setShowForm(false);
    setForm({ clientId: '', category: '', instructions: '', dueDate: '' });
    setSending(false);
  };

  const markComplete = async (id) => {
    try {
      await fetch(`${API}/clients-api/requests/${id}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status: 'Completed' }) });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Completed' } : r));
    } catch {}
  };

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading requests...</div>;

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Document Requests</h1>
          <p className="text-gray-400 text-sm mt-0.5">{pending.length} pending</p>
        </div>
        <button onClick={() => { setShowForm(true); setSent(null); }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-xl transition-colors font-medium">
          <Plus size={15} /> New Request
        </button>
      </div>

      {sent && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle2 size={16} className="text-green-600 shrink-0" />
          <div>
            <p className="text-green-700 text-sm font-medium">Request sent to {sent.client}</p>
            <p className="text-green-600 text-xs mt-0.5">Email notification sent to {sent.email} · {sent.category}</p>
          </div>
          <button onClick={() => setSent(null)} className="ml-auto text-green-400 hover:text-green-600"><X size={14} /></button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-gray-900 font-semibold text-sm flex items-center gap-2">
              <Bell size={15} className="text-blue-600" /> New Document Request
            </h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
          </div>
          <form onSubmit={handleSend} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Client</label>
              <select required value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.businessName || c.ownerName} — {c.email}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Document Type</label>
              <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                <option value="">Select type...</option>
                <option value="Bank Statements">Bank Statements</option>
                <option value="Driver's License">Driver's License</option>
                <option value="Voided Check">Voided Check</option>
                <option value="Tax Returns">Tax Returns</option>
                <option value="Business License">Business License</option>
                <option value="Proof of Ownership">Proof of Ownership</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Instructions to Client</label>
              <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} rows={2}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                placeholder="Describe exactly what you need from the client..." />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={sending}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded-xl transition-colors font-medium">
                {sending ? 'Sending...' : <><Send size={14} /> Send Request & Notify Client</>}
              </button>
            </div>
          </form>
          <p className="text-gray-400 text-xs mt-3 flex items-center gap-1.5">
            <Mail size={11} /> Client will receive an email notification with a link to upload directly
          </p>
        </div>
      )}

      {/* Pending */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-gray-900 font-semibold text-sm">Pending ({pending.length})</h2>
        </div>
        {pending.length === 0
          ? <p className="text-gray-400 text-sm px-5 py-6 text-center">No pending requests.</p>
          : pending.map(r => (
            <div key={r.id} className="px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-gray-900 font-medium text-sm">{r.category}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">Pending</span>
                  </div>
                  <p className="text-gray-500 text-xs mb-1.5">{r.instructions}</p>
                  <div className="flex items-center gap-3 text-gray-400 text-xs">
                    <span className="font-medium text-gray-600">{r.businessName || r.clientName}</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {fmt(r.createdAt)}</span>
                    {r.clientEmail && <span className="flex items-center gap-1"><Mail size={11} /> {r.clientEmail}</span>}
                    {r.repName && <span>by {r.repName}</span>}
                  </div>
                </div>
                <button onClick={() => markComplete(r.id)}
                  className="flex items-center gap-1.5 text-xs text-green-600 hover:bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg transition-colors shrink-0">
                  <CheckCircle2 size={12} /> Mark Done
                </button>
              </div>
            </div>
          ))
        }
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-gray-500 font-semibold text-sm">Completed ({completed.length})</h2>
          </div>
          {completed.map(r => (
            <div key={r.id} className="px-5 py-3 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-gray-700 text-sm">{r.category} — {r.businessName || r.clientName}</p>
                  <p className="text-gray-400 text-xs">{r.instructions}</p>
                </div>
                <span className="text-gray-300 text-xs">{fmt(r.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
