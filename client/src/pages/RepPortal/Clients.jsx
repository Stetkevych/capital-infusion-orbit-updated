import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CLIENTS, getClientsByRep, getMissingCategories, getDocumentsByClient, getRepById, DOC_CATEGORIES } from '../../data/mockData';
import StatusBadge from '../../components/shared/StatusBadge';
import { Search, AlertCircle, FileText, ArrowRight, Plus, X, CheckCircle2, Send, Bell, Trash2, RotateCcw } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

const INDUSTRIES = ['Automotive','Construction','Education','Food & Beverage','Healthcare','Hospitality','Manufacturing','Retail','Services','Technology','Transportation','Other'];

const inputCls = "w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";

const EMPTY_FORM = { businessName: '', ownerName: '', email: '', phone: '', industry: '', state: '', requestedAmount: '' };

export default function ClientsPage() {
  const { user, token } = useAuth();
  const [searchParams] = useSearchParams();
  const repFilter = searchParams.get('rep');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [realClients, setRealClients] = useState([]);
  const [deletedClients, setDeletedClients] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [allDocs, setAllDocs] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [permDeleteConfirm, setPermDeleteConfirm] = useState(null);
  const [reminderModal, setReminderModal] = useState(null); // { client, category }
  const [reminderMsg, setReminderMsg] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  // Fetch real clients from server
  useEffect(() => {
    fetch(`${API}/clients-api`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => setRealClients(data))
      .catch(() => {});
    fetch(`${API}/clients-api/deleted/all`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => setDeletedClients(data))
      .catch(() => {});
    fetch(`${API}/activity`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => setActivityLog(data))
      .catch(() => {});
    fetch(`${API}/documents/client/all`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => setAllDocs(data))
      .catch(() => {});
  }, []);

  // Merge mock + real clients
  const mockClients = user.role === 'admin' ? CLIENTS : getClientsByRep(user.repId);
  const allClients = [
    ...realClients,
    ...mockClients.filter(mc => !realClients.find(rc => rc.email === mc.email)),
  ];

  const clients = allClients
    .filter(c => !repFilter || c.assignedRepId === repFilter)
    .filter(c => !search || c.businessName?.toLowerCase().includes(search.toLowerCase()) || c.ownerName?.toLowerCase().includes(search.toLowerCase()))
    .filter(c => !statusFilter || c.status === statusFilter);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!form.businessName || !form.ownerName || !form.email) {
      setNotification({ type: 'error', msg: 'Business name, owner name, and email are required' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/clients-api`, { method: 'POST', headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) {
        setRealClients(prev => [data, ...prev]);
        setNotification({ type: 'success', msg: `${form.businessName} added successfully` });
      } else {
        setNotification({ type: 'error', msg: data.error || 'Failed to add client' });
      }
    } catch {
      // Offline fallback
      const local = { id: `local_${Date.now()}`, ...form, status: 'Pending', assignedRepId: user.repId, createdAt: new Date().toISOString() };
      setRealClients(prev => [local, ...prev]);
      setNotification({ type: 'success', msg: `${form.businessName} added` });
    } finally {
      setSaving(false);
      setShowAddForm(false);
      setForm(EMPTY_FORM);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const openReminder = (client) => {
    setReminderModal({ client, category: '' });
    setReminderMsg('');
  };

  const sendReminder = async () => {
    if (!reminderModal.category) return;
    setSendingReminder(true);
    const cat = DOC_CATEGORIES.find(c => c.id === reminderModal.category);
    try {
      await fetch(`${API}/clients-api/${reminderModal.client.id}/reminder`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          category: reminderModal.category,
          categoryLabel: cat?.label,
          customMessage: reminderMsg || `Please upload your ${cat?.label} at your earliest convenience.`,
        }),
      });
      setNotification({ type: 'success', msg: `Reminder sent to ${reminderModal.client.email}` });
    } catch {
      setNotification({ type: 'success', msg: `Reminder queued for ${reminderModal.client.ownerName}` });
    } finally {
      setSendingReminder(false);
      setReminderModal(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleSoftDelete = async (client) => {
    try {
      await fetch(`${API}/clients-api/${client.id}`, { method: 'DELETE', headers });
      setRealClients(prev => prev.filter(c => c.id !== client.id));
      setDeletedClients(prev => [{ ...client, deleted: true, deletedAt: new Date().toISOString() }, ...prev]);
      setNotification({ type: 'success', msg: `${client.businessName} moved to deleted` });
    } catch {
      setNotification({ type: 'error', msg: 'Failed to delete client' });
    }
    setDeleteConfirm(null);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRestore = async (client) => {
    try {
      await fetch(`${API}/clients-api/${client.id}/restore`, { method: 'POST', headers });
      setDeletedClients(prev => prev.filter(c => c.id !== client.id));
      setRealClients(prev => [{ ...client, deleted: false }, ...prev]);
      setNotification({ type: 'success', msg: `${client.businessName} restored` });
    } catch {
      setNotification({ type: 'error', msg: 'Failed to restore client' });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handlePermanentDelete = async (client) => {
    try {
      await fetch(`${API}/clients-api/${client.id}/permanent`, { method: 'DELETE', headers });
      setDeletedClients(prev => prev.filter(c => c.id !== client.id));
      setNotification({ type: 'success', msg: `${client.businessName} permanently deleted` });
    } catch {
      setNotification({ type: 'error', msg: 'Failed to permanently delete' });
    }
    setPermDeleteConfirm(null);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg border ${
          notification.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          {notification.type === 'success'
            ? <CheckCircle2 size={16} className="text-green-600 shrink-0" />
            : <AlertCircle size={16} className="text-red-500 shrink-0" />
          }
          <p className={`text-sm font-medium ${notification.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
            {notification.msg}
          </p>
          <button onClick={() => setNotification(null)} className="ml-2 text-gray-400"><X size={14} /></button>
        </div>
      )}

      {/* Reminder Modal */}
      {reminderModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-gray-900 font-semibold text-base flex items-center gap-2">
                <Bell size={16} className="text-blue-600" /> Send Reminder
              </h2>
              <button onClick={() => setReminderModal(null)} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
            </div>

            <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
              <p className="text-gray-500 text-xs">Sending to</p>
              <p className="text-gray-900 font-semibold text-sm">{reminderModal.client.businessName}</p>
              <p className="text-gray-400 text-xs">{reminderModal.client.email}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Document Needed <span className="text-red-400">*</span></label>
                <select
                  value={reminderModal.category}
                  onChange={e => setReminderModal(m => ({ ...m, category: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Select document type...</option>
                  {DOC_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Custom Message (optional)</label>
                <textarea
                  value={reminderMsg}
                  onChange={e => setReminderMsg(e.target.value)}
                  rows={3}
                  className={`${inputCls} resize-none`}
                  placeholder="Add a personal note to the client..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
              <p className="text-gray-400 text-xs">Client will receive an email with an upload link</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setReminderModal(null)} className="text-gray-500 text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button
                  onClick={sendReminder}
                  disabled={!reminderModal.category || sendingReminder}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-xl transition-colors font-medium"
                >
                  <Send size={13} /> {sendingReminder ? 'Sending...' : 'Send Reminder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Clients</h1>
          <p className="text-gray-400 text-sm mt-0.5">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm font-medium"
        >
          <Plus size={15} /> Add Client
        </button>
      </div>

      {/* Add Client Form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <h2 className="text-gray-900 font-semibold text-sm">New Client</h2>
            <button onClick={() => { setShowAddForm(false); setForm(EMPTY_FORM); }} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
          </div>
          <form onSubmit={handleAddClient} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Business Name <span className="text-red-400">*</span></label>
                <input value={form.businessName} onChange={e => set('businessName', e.target.value)} className={inputCls} placeholder="e.g. Smith Auto Repair" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Owner Name <span className="text-red-400">*</span></label>
                <input value={form.ownerName} onChange={e => set('ownerName', e.target.value)} className={inputCls} placeholder="e.g. John Smith" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Email <span className="text-red-400">*</span></label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="john@business.com" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Phone</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="(555) 000-0000" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Industry</label>
                <select value={form.industry} onChange={e => set('industry', e.target.value)} className={`${inputCls} appearance-none`}>
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">State</label>
                <input value={form.state} onChange={e => set('state', e.target.value)} className={inputCls} placeholder="NY" maxLength={2} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Requested Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={form.requestedAmount} onChange={e => set('requestedAmount', e.target.value)} className={`${inputCls} pl-7`} placeholder="75000" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <p className="text-gray-400 text-xs">Client will be added to your portfolio immediately</p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => { setShowAddForm(false); setForm(EMPTY_FORM); }} className="text-gray-500 text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded-xl transition-colors font-medium shadow-sm">
                  {saving ? 'Adding...' : 'Add Client'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm">
          <option value="">All Statuses</option>
          {['Active','Pending','Under Review','Approved'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              {['Business','Owner','Status','Last Activity','Docs','Missing',''].map(h => (
                <th key={h} className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map(c => {
              const docs = allDocs.filter(d => d.clientId === c.id);
              const uploadedCats = new Set(docs.map(d => d.category));
              const missing = DOC_CATEGORIES.filter(cat => cat.required && !uploadedCats.has(cat.id));
              return (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                  <td className="py-3.5 px-5">
                    <p className="text-gray-900 font-medium">{c.businessName}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{c.industry}{c.state ? ` · ${c.state}` : ''}</p>
                  </td>
                  <td className="py-3.5 px-5 text-gray-600 text-sm">{c.ownerName}</td>
                  <td className="py-3.5 px-5"><StatusBadge status={c.status} size="xs" /></td>
                  <td className="py-3.5 px-5">
                    {(() => {
                      const clientActivity = activityLog.filter(a => a.clientId === c.id).sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
                      if (clientActivity.length > 0) {
                        const last = clientActivity[0];
                        const desc = last.eventType === 'login' ? 'Client logged in' : last.eventType === 'upload' ? 'Document uploaded' : last.description;
                        const time = new Date(last.timestamp || last.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        return <span className="text-gray-500 text-xs">{desc} · {time}</span>;
                      }
                      if (c.source === 'docusign' || c.envelopeId) return <span className="text-blue-500 text-xs">Application completed</span>;
                      return <span className="text-gray-300 text-xs">No activity</span>;
                    })()}
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                      <FileText size={13} className="text-gray-400" /> {docs.length}
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    {missing.length > 0
                      ? <div className="flex items-center gap-1 text-red-500 text-xs font-medium"><AlertCircle size={12} />{missing.length}</div>
                      : <span className="text-green-600 text-xs font-medium">Complete</span>
                    }
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openReminder(c)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 border border-gray-200 hover:border-blue-300 px-2.5 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Send reminder"
                      >
                        <Bell size={11} /> Remind
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(c)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-300 px-2.5 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete client"
                      >
                        <Trash2 size={11} />
                      </button>
                      <Link to={`/clients/${c.id}`} className="flex items-center gap-1 text-blue-600 text-xs font-medium hover:opacity-70">
                        Open <ArrowRight size={12} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {clients.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No clients found.</p>
            <button onClick={() => setShowAddForm(true)} className="mt-3 text-blue-600 text-sm font-medium hover:opacity-70">+ Add your first client</button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm p-6">
            <h2 className="text-gray-900 font-semibold text-base mb-2">Delete Client?</h2>
            <p className="text-gray-500 text-sm mb-1">Are you sure you want to delete <span className="font-semibold text-gray-700">{deleteConfirm.businessName}</span>?</p>
            <p className="text-gray-400 text-xs mb-5">This will move them to the Deleted Clients folder. You can restore them from there.</p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="text-gray-500 text-sm px-4 py-2 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleSoftDelete(deleteConfirm)} className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-xl font-medium">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent delete confirmation modal */}
      {permDeleteConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-red-200 w-full max-w-sm p-6">
            <h2 className="text-red-600 font-semibold text-base mb-2">Permanently Delete?</h2>
            <p className="text-gray-500 text-sm mb-1">This will permanently remove <span className="font-semibold text-gray-700">{permDeleteConfirm.businessName}</span> and all associated data.</p>
            <p className="text-red-400 text-xs mb-5">This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setPermDeleteConfirm(null)} className="text-gray-500 text-sm px-4 py-2 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={() => handlePermanentDelete(permDeleteConfirm)} className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-xl font-medium">
                <Trash2 size={13} /> Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deleted clients section */}
      {deletedClients.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowDeleted(v => !v)} className="flex items-center gap-2 text-gray-400 text-sm hover:text-gray-600 transition-colors mb-3">
            <Trash2 size={14} />
            Deleted Clients ({deletedClients.length})
            <span className="text-xs">{showDeleted ? '▲' : '▼'}</span>
          </button>
          {showDeleted && (
            <div className="bg-white border border-red-100 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-red-50 bg-red-50/30">
                    {['Business', 'Owner', 'Deleted', ''].map(h => (
                      <th key={h} className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deletedClients.map(c => (
                    <tr key={c.id} className="border-b border-red-50 hover:bg-red-50/20 transition-colors">
                      <td className="py-3.5 px-5 text-gray-500">{c.businessName}</td>
                      <td className="py-3.5 px-5 text-gray-400 text-sm">{c.ownerName}</td>
                      <td className="py-3.5 px-5 text-gray-400 text-xs">{c.deletedAt ? new Date(c.deletedAt).toLocaleDateString() : '—'}</td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleRestore(c)} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 border border-green-200 hover:border-green-300 px-2.5 py-1.5 rounded-lg transition-colors">
                            <RotateCcw size={11} /> Restore
                          </button>
                          <button onClick={() => setPermDeleteConfirm(c)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 px-2.5 py-1.5 rounded-lg transition-colors">
                            <Trash2 size={11} /> Delete Forever
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
