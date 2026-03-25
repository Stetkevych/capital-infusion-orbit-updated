import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DOCUMENT_REQUESTS, CLIENTS, DOC_CATEGORIES, getClientsByRep, getClientById } from '../../data/mockData';
import StatusBadge from '../../components/shared/StatusBadge';
import { Clock, Plus, X, Send } from 'lucide-react';

function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function RequestsPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clientId: '', category: '', instructions: '', dueDate: '' });

  const myClients = user.role === 'admin' ? CLIENTS : getClientsByRep(user.repId);
  const myClientIds = new Set(myClients.map(c => c.id));
  const requests = DOCUMENT_REQUESTS.filter(r => myClientIds.has(r.clientId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const pending = requests.filter(r => r.status === 'Pending');
  const completed = requests.filter(r => r.status === 'Completed');

  const handleSend = (e) => {
    e.preventDefault();
    alert(`Request sent to ${getClientById(form.clientId)?.businessName} for ${DOC_CATEGORIES.find(c => c.id === form.category)?.label}`);
    setShowForm(false);
    setForm({ clientId: '', category: '', instructions: '', dueDate: '' });
  };

  const RequestCard = ({ req }) => {
    const client = getClientById(req.clientId);
    const cat = DOC_CATEGORIES.find(c => c.id === req.category);
    return (
      <div className="px-5 py-4 border-b border-slate-800 last:border-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-slate-200 font-medium text-sm">{cat?.icon} {cat?.label}</p>
              <StatusBadge status={req.status} size="xs" />
            </div>
            <p className="text-slate-400 text-xs mb-1">{req.instructions}</p>
            <div className="flex items-center gap-3 text-slate-500 text-xs">
              <span>{client?.businessName}</span>
              <span className="flex items-center gap-1"><Clock size={11} /> Due {fmt(req.dueDate)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Requests</h1>
          <p className="text-slate-400 text-sm mt-0.5">{pending.length} pending</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition"
        >
          <Plus size={15} /> New Request
        </button>
      </div>

      {/* New Request Form */}
      {showForm && (
        <div className="bg-slate-900 border border-blue-600/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">New Document Request</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white"><X size={16} /></button>
          </div>
          <form onSubmit={handleSend} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Client</label>
              <select
                required
                value={form.clientId}
                onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Select client...</option>
                {myClients.map(c => <option key={c.id} value={c.id}>{c.businessName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Document Category</label>
              <select
                required
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Select category...</option>
                {DOC_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1.5">Instructions</label>
              <textarea
                value={form.instructions}
                onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Describe what you need..."
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2 rounded-lg transition">
                <Send size={14} /> Send Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="text-white font-semibold text-sm">Pending ({pending.length})</h2>
        </div>
        {pending.length === 0
          ? <p className="text-slate-500 text-sm px-5 py-4">No pending requests.</p>
          : pending.map(r => <RequestCard key={r.id} req={r} />)
        }
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <div className="px-5 py-3 border-b border-slate-800">
            <h2 className="text-slate-400 font-semibold text-sm">Completed ({completed.length})</h2>
          </div>
          {completed.map(r => <RequestCard key={r.id} req={r} />)}
        </div>
      )}
    </div>
  );
}
