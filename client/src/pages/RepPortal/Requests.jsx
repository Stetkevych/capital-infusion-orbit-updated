import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CLIENTS, DOC_CATEGORIES, getClientsByRep, getClientById } from '../../data/mockData';
import StatusBadge from '../../components/shared/StatusBadge';
import { Clock, Plus, X, Send, Bell, CheckCircle2, Mail } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://capital-infusion-api-prod.eba-wqytrheg.us-east-1.elasticbeanstalk.com/api';

function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function RequestsPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clientId: '', category: '', instructions: '', dueDate: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);
  const [requests, setRequests] = useState([
    { id: 'req1', clientId: 'c1', category: 'bank_statements', instructions: 'Please upload the most recent 3 months of bank statements.', dueDate: '2025-06-15', status: 'Pending', createdAt: '2025-06-01T08:00:00Z' },
    { id: 'req2', clientId: 'c2', category: 'bank_statements', instructions: 'Reupload October statement — pages 3-5 were missing.', dueDate: '2025-06-12', status: 'Pending', createdAt: '2025-06-06T14:00:00Z' },
    { id: 'req3', clientId: 'c2', category: 'voided_check', instructions: 'Please provide a voided check for ACH setup.', dueDate: '2025-06-14', status: 'Pending', createdAt: '2025-06-06T14:05:00Z' },
    { id: 'req4', clientId: 'c3', category: 'signed_agreement', instructions: 'Please sign and return the merchant agreement.', dueDate: '2025-06-18', status: 'Pending', createdAt: '2025-06-07T11:00:00Z' },
    { id: 'req5', clientId: 'c4', category: 'funding_docs', instructions: 'Upload final funding authorization form.', dueDate: '2025-06-20', status: 'Completed', createdAt: '2025-06-05T09:00:00Z' },
  ]);

  const myClients = user.role === 'admin' ? CLIENTS : getClientsByRep(user.repId);
  const myClientIds = new Set(myClients.map(c => c.id));
  const myRequests = requests.filter(r => myClientIds.has(r.clientId)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const pending = myRequests.filter(r => r.status === 'Pending');
  const completed = myRequests.filter(r => r.status === 'Completed');

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setSent(null);

    const client = getClientById(form.clientId);
    const cat = DOC_CATEGORIES.find(c => c.id === form.category);

    try {
      // Send email notification to client via server
      await fetch(`${API}/docusign/request-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: client.email,
          clientName: client.ownerName,
          businessName: client.businessName,
          category: cat.label,
          instructions: form.instructions,
          dueDate: form.dueDate,
          repName: user.name,
          portalUrl: window.location.origin,
        }),
      });
    } catch (err) {
      // Continue even if email fails — add to local list
      console.warn('Email notification failed:', err.message);
    }

    // Add to local request list
    const newReq = {
      id: `req_${Date.now()}`,
      clientId: form.clientId,
      category: form.category,
      instructions: form.instructions,
      dueDate: form.dueDate,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    setRequests(prev => [newReq, ...prev]);
    setSent({ client: client.businessName, email: client.email, category: cat.label });
    setShowForm(false);
    setForm({ clientId: '', category: '', instructions: '', dueDate: '' });
    setSending(false);
  };

  const markComplete = (id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Completed' } : r));
  };

  const RequestCard = ({ req }) => {
    const client = getClientById(req.clientId);
    const cat = DOC_CATEGORIES.find(c => c.id === req.category);
    return (
      <div className="px-5 py-4 border-b border-apple-gray7 last:border-0 hover:bg-apple-gray9 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-apple-gray1 font-medium text-sm">{cat?.icon} {cat?.label}</p>
              <StatusBadge status={req.status} size="xs" />
            </div>
            <p className="text-apple-gray4 text-xs mb-1.5">{req.instructions}</p>
            <div className="flex items-center gap-3 text-apple-gray5 text-xs">
              <span className="font-medium text-apple-gray3">{client?.businessName}</span>
              <span className="flex items-center gap-1"><Clock size={11} /> Due {fmt(req.dueDate)}</span>
              <span className="flex items-center gap-1"><Mail size={11} /> {client?.email}</span>
            </div>
          </div>
          {req.status === 'Pending' && (
            <button
              onClick={() => markComplete(req.id)}
              className="flex items-center gap-1.5 text-xs text-green-600 hover:bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              <CheckCircle2 size={12} /> Mark Done
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-apple-gray1 tracking-tight">Document Requests</h1>
          <p className="text-apple-gray4 text-sm mt-0.5">{pending.length} pending</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setSent(null); }}
          className="flex items-center gap-1.5 bg-apple-blue hover:bg-apple-bluehov text-white text-sm px-4 py-2 rounded-xl transition-colors shadow-apple-sm font-medium"
        >
          <Plus size={15} /> New Request
        </button>
      </div>

      {/* Success banner */}
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

      {/* New Request Form */}
      {showForm && (
        <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-apple-gray1 font-semibold text-sm flex items-center gap-2">
              <Bell size={15} className="text-apple-blue" /> New Document Request
            </h2>
            <button onClick={() => setShowForm(false)} className="text-apple-gray4 hover:text-apple-gray1 transition-colors">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSend} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-apple-gray3 mb-1.5 uppercase tracking-wide">Client</label>
              <select
                required
                value={form.clientId}
                onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                className="w-full bg-apple-gray9 border border-apple-gray7 text-apple-gray1 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-apple-blue/30"
              >
                <option value="">Select client...</option>
                {myClients.map(c => <option key={c.id} value={c.id}>{c.businessName} — {c.ownerName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-apple-gray3 mb-1.5 uppercase tracking-wide">Document Type</label>
              <select
                required
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-apple-gray9 border border-apple-gray7 text-apple-gray1 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-apple-blue/30"
              >
                <option value="">Select type...</option>
                {DOC_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-apple-gray3 mb-1.5 uppercase tracking-wide">Instructions to Client</label>
              <textarea
                value={form.instructions}
                onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                rows={2}
                className="w-full bg-apple-gray9 border border-apple-gray7 text-apple-gray1 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 resize-none"
                placeholder="Describe exactly what you need from the client..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-apple-gray3 mb-1.5 uppercase tracking-wide">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full bg-apple-gray9 border border-apple-gray7 text-apple-gray1 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-apple-blue/30"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={sending}
                className="flex items-center gap-2 bg-apple-blue hover:bg-apple-bluehov disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded-xl transition-colors font-medium shadow-apple-sm"
              >
                {sending ? <><span className="animate-spin">⟳</span> Sending...</> : <><Send size={14} /> Send Request & Notify Client</>}
              </button>
            </div>
          </form>
          <p className="text-apple-gray5 text-xs mt-3 flex items-center gap-1.5">
            <Mail size={11} /> Client will receive an email notification with a link to upload directly
          </p>
        </div>
      )}

      {/* Pending */}
      <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 overflow-hidden">
        <div className="px-5 py-4 border-b border-apple-gray7 bg-apple-gray9">
          <h2 className="text-apple-gray1 font-semibold text-sm">Pending ({pending.length})</h2>
        </div>
        {pending.length === 0
          ? <p className="text-apple-gray4 text-sm px-5 py-6 text-center">No pending requests.</p>
          : pending.map(r => <RequestCard key={r.id} req={r} />)
        }
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 overflow-hidden">
          <div className="px-5 py-4 border-b border-apple-gray7 bg-apple-gray9">
            <h2 className="text-apple-gray4 font-semibold text-sm">Completed ({completed.length})</h2>
          </div>
          {completed.map(r => <RequestCard key={r.id} req={r} />)}
        </div>
      )}
    </div>
  );
}
