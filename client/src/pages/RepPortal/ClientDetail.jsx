import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getClientById, getRepById, getRequestsByClient,
  getActivityByClient, getMissingCategories, DOC_CATEGORIES
} from '../../data/mockData';
import FolderTree from '../../components/shared/FolderTree';
import DocumentTable from '../../components/shared/DocumentTable';
import UploadZone from '../../components/shared/UploadZone';
import StatusBadge from '../../components/shared/StatusBadge';
import {
  ArrowLeft, Mail, Phone, MapPin, Building2,
  AlertCircle, Clock, Upload, Send, CheckCircle2, X, Bell, Plus
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const TABS = ['Documents', 'Requests', 'Activity', 'Notes'];

export default function ClientDetail() {
  const { id } = useParams();
  const { can, user, token } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(DOC_CATEGORIES[0].id);
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [customAccounts, setCustomAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState('Documents');
  const [showUpload, setShowUpload] = useState(false);
  const [realDocs, setRealDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [requestingSent, setRequestingSent] = useState({});
  const [notification, setNotification] = useState(null);
  const [apiClient, setApiClient] = useState(null);
  const [showCustomRequest, setShowCustomRequest] = useState(false);
  const [customReqForm, setCustomReqForm] = useState({ category: '', instructions: '', dueDate: '' });
  const [sendingCustom, setSendingCustom] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [clientActivity, setClientActivity] = useState([]);

  const mockClient = getClientById(id);
  const client = mockClient || apiClient;
  const rep = client ? getRepById(client.assignedRepId) : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Fetch client from API if not in mock data
  useEffect(() => {
    if (mockClient || !id) return;
    fetch(`${API}/clients-api/${id}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setApiClient(data); })
      .catch(() => {});
  }, [id, mockClient]);

  // Fetch real documents from server
  useEffect(() => {
    if (!id) return;
    setLoadingDocs(true);
    fetch(`${API}/documents/client/${id}`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(docs => setRealDocs(docs))
      .catch(() => setRealDocs([]))
      .finally(() => setLoadingDocs(false));
    // Fetch per-client activity
    fetch(`${API}/activity`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => setClientActivity(data.filter(a => a.clientId === id)))
      .catch(() => setClientActivity([]));
  }, [id]);

  if (!client) {
    return <div className="p-6 text-gray-400">Loading client...</div>;
  }

  // Merge real docs with mock docs (mock docs show until replaced by real ones)
  const allDocs = realDocs.length > 0 ? realDocs : [];

  // Compute missing categories from real docs
  const uploadedCategories = new Set(allDocs.map(d => d.category));
  const missingCategories = DOC_CATEGORIES.filter(c => !uploadedCategories.has(c.id));

  // Filter by selected category
  const categoryDocs = allDocs.filter(d => d.category === selectedCategory
    && (selectedCategory !== 'bank_statements' || !selectedBankAccount || d.bankAccount === selectedBankAccount)
  );
  const bankAccountsInDocs = [...new Set([...allDocs.filter(d => d.category === 'bank_statements' && d.bankAccount).map(d => d.bankAccount), ...customAccounts])];
  const allBankAccounts = bankAccountsInDocs.length > 0 ? bankAccountsInDocs : (allDocs.some(d => d.category === 'bank_statements') ? ['Account 1'] : []);

  const addBankAccount = () => {
    const next = `Account ${allBankAccounts.length + 1}`;
    setCustomAccounts(prev => [...prev, next]);
    setSelectedBankAccount(next);
  };
  const visibleDocs = can.seeInternalDocs
    ? categoryDocs
    : categoryDocs.filter(d => d.visibility !== 'internal');

  const catLabel = DOC_CATEGORIES.find(c => c.id === selectedCategory)?.label || '';

  // Send custom request
  const sendCustomRequest = async (e) => {
    e.preventDefault();
    if (!customReqForm.category) return;
    setSendingCustom(true);
    const cat = DOC_CATEGORIES.find(c => c.id === customReqForm.category);
    try {
      await fetch(`${API}/clients-api/${id}/reminder`, {
        method: 'POST', headers,
        body: JSON.stringify({ category: customReqForm.category, categoryLabel: cat?.label, customMessage: customReqForm.instructions || `Please upload your ${cat?.label} at your earliest convenience.` }),
      });
      const newReq = { id: `req_${Date.now()}`, category: customReqForm.category, catLabel: cat?.label, instructions: customReqForm.instructions, dueDate: customReqForm.dueDate, status: 'Pending', createdAt: new Date().toISOString() };
      setPendingRequests(prev => [newReq, ...prev]);
      setNotification(`Request sent to ${client.email} for ${cat?.label}`);
    } catch {
      setNotification(`Request queued for ${cat?.label}`);
    }
    setSendingCustom(false);
    setShowCustomRequest(false);
    setCustomReqForm({ category: '', instructions: '', dueDate: '' });
    setTimeout(() => setNotification(null), 4000);
  };

  const fulfillRequest = (reqId) => setPendingRequests(prev => prev.filter(r => r.id !== reqId));

  // Send missing doc request email
  const sendDocRequest = async (category) => {
    const cat = DOC_CATEGORIES.find(c => c.id === category);
    setRequestingSent(prev => ({ ...prev, [category]: 'sending' }));
    try {
      await fetch(`${API}/clients-api/${id}/reminder`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          category: cat.id,
          categoryLabel: cat.label,
          instructions: `Please upload your ${cat.label} at your earliest convenience.`,
        }),
      });
      setRequestingSent(prev => ({ ...prev, [category]: 'sent' }));
      setNotification(`✈️ Request sent to ${client.email} for ${cat.label}`);
      setTimeout(() => setNotification(null), 4000);
    } catch {
      setRequestingSent(prev => ({ ...prev, [category]: 'sent' }));
      setNotification(`Request queued for ${cat.label}`);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Refresh docs after upload
  const handleUploadComplete = () => {
    setTimeout(() => {
      fetch(`${API}/documents/client/${id}`, { headers })
        .then(r => r.ok ? r.json() : [])
        .then(docs => setRealDocs(docs))
        .catch(() => {});
    }, 1500);
  };

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 shadow-lg">
          <CheckCircle2 size={16} className="text-green-600 shrink-0" />
          <p className="text-green-700 text-sm font-medium">{notification}</p>
          <button onClick={() => setNotification(null)} className="text-green-400 ml-2"><X size={14} /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link to="/clients" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">{client.businessName}</h1>
            <p className="text-gray-400 text-sm">{client.ownerName} · {client.industry}</p>
          </div>
        </div>
        <StatusBadge status={client.status} />
      </div>

      {/* Info strip */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Mail, value: client.email || '—' },
          { icon: Phone, value: client.phone || client.tabData?.phone || client.tabData?.phonenumber || client.tabData?.['phone number'] || client.tabData?.['phone_number'] || '—' },
          { icon: MapPin, value: client.state || client.tabData?.state || client.tabData?.st || client.address || client.tabData?.address || client.tabData?.city || '—' },
          { icon: Building2, value: `Rep: ${client.assignedRepName || rep?.name || '—'}` },
        ].map((f, i) => (
          <div key={i} className="flex items-center gap-2 text-gray-600 text-sm">
            <f.icon size={13} className="text-gray-400 shrink-0" />
            <span className="truncate">{f.value}</span>
          </div>
        ))}
      </div>

      {/* Missing docs alert with one-click request */}
      {missingCategories.length > 0 && (
        <div className="bg-white border border-red-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 bg-red-50 border-b border-red-100">
            <AlertCircle size={15} className="text-red-500 shrink-0" />
            <p className="text-red-600 text-sm font-medium">
              {missingCategories.length} Missing Document{missingCategories.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {missingCategories.map(cat => {
              const reqState = requestingSent[cat.id];
              return (
                <div key={cat.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-gray-700 text-sm font-medium">{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400 font-medium">Missing</span>
                    {client.email && reqState !== 'sent' && (
                      <button
                        onClick={() => sendDocRequest(cat.id)}
                        disabled={reqState === 'sending'}
                        className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        <Send size={11} /> {reqState === 'sending' ? 'Sending...' : 'Request'}
                      </button>
                    )}
                    {reqState === 'sent' && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle2 size={11} /> Sent
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Request Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <button onClick={() => setShowCustomRequest(v => !v)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2.5">
            <Bell size={15} className="text-blue-600" />
            <span className="text-gray-900 text-sm font-medium">Custom Request</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs">Send a document request to this client</span>
            <Plus size={14} className={`text-gray-400 transition-transform ${showCustomRequest ? 'rotate-45' : ''}`} />
          </div>
        </button>
        {showCustomRequest && (
          <form onSubmit={sendCustomRequest} className="px-5 pb-5 pt-2 border-t border-gray-100 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Document Type</label>
                <select required value={customReqForm.category} onChange={e => setCustomReqForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="">Select...</option>
                  {DOC_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Due Date</label>
                <input type="date" value={customReqForm.dueDate} onChange={e => setCustomReqForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={sendingCustom || !customReqForm.category} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2.5 rounded-xl font-medium transition-colors w-full justify-center">
                  <Send size={13} /> {sendingCustom ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Instructions (optional)</label>
              <textarea value={customReqForm.instructions} onChange={e => setCustomReqForm(f => ({ ...f, instructions: e.target.value }))} rows={2} className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" placeholder="Describe what you need from the client..." />
            </div>
          </form>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-100">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {tab}
            {tab === 'Documents' && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {allDocs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Documents Tab */}
      {activeTab === 'Documents' && (
        <div className="grid grid-cols-[200px_1fr] gap-5">
          {/* Folder tree — shows real doc counts */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-3">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider px-2 mb-2">Folders</p>
            <div className="space-y-0.5">
              {DOC_CATEGORIES.map(cat => {
                const count = allDocs.filter(d => d.category === cat.id).length;
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${
                      active ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                  >
                    <span className="text-xs font-medium truncate">{cat.icon} {cat.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      count > 0 ? 'bg-gray-100 text-gray-500' : cat.required ? 'bg-red-50 text-red-400' : 'bg-gray-50 text-gray-300'
                    }`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* File panel */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <div>
                <p className="text-gray-900 font-semibold text-sm">{catLabel}</p>
                <p className="text-gray-400 text-xs">
                  {loadingDocs ? 'Loading...' : `${visibleDocs.length} file${visibleDocs.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedCategory === 'bank_statements' && (
                  <button
                    onClick={addBankAccount}
                    className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    <Plus size={11} /> Add Account
                  </button>
                )}
                {can.uploadForClient && (
                  <button
                    onClick={() => setShowUpload(v => !v)}
                    className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    <Upload size={13} /> Upload
                  </button>
                )}
              </div>
            </div>

            {showUpload && (
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <UploadZone
                  category={selectedCategory}
                  categoryLabel={catLabel}
                  clientId={id}
                  uploadedBy={user?.id}
                  onUpload={handleUploadComplete}
                  compact
                />
              </div>
            )}

            {selectedCategory === 'bank_statements' && allBankAccounts.length > 0 && (
              <div className="flex items-center gap-1 px-5 py-2 border-b border-gray-50 bg-gray-50/50 overflow-x-auto">
                <button
                  onClick={() => setSelectedBankAccount('')}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${!selectedBankAccount ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  All
                </button>
                {allBankAccounts.map(a => (
                  <button
                    key={a}
                    onClick={() => setSelectedBankAccount(a)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${selectedBankAccount === a ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}

            <DocumentTable documents={visibleDocs} canChangeStatus={can.seeInternalDocs} />
          </div>
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'Requests' && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-50">
          {pendingRequests.length === 0 ? (
            <p className="text-gray-400 text-sm px-5 py-6 text-center">No pending requests. Use the Custom Request bar above to send one.</p>
          ) : pendingRequests.map(req => {
            const cat = DOC_CATEGORIES.find(c => c.id === req.category);
            return (
              <div key={req.id} className="px-5 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-800 font-medium text-sm">{cat?.icon} {req.catLabel || cat?.label}</p>
                    {req.instructions && <p className="text-gray-400 text-xs mt-1">{req.instructions}</p>}
                    <p className="text-gray-300 text-xs mt-1.5 flex items-center gap-1">
                      <Clock size={11} /> {req.dueDate ? `Due ${fmt(req.dueDate)}` : `Sent ${fmt(req.createdAt)}`}
                    </p>
                  </div>
                  <button onClick={() => fulfillRequest(req.id)} className="flex items-center gap-1 text-xs text-green-600 hover:bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-lg transition-colors">
                    <CheckCircle2 size={11} /> Mark Done
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'Activity' && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-50">
          {clientActivity.length === 0 ? (
            <p className="text-gray-400 text-sm px-5 py-6 text-center">No activity recorded for this client yet.</p>
          ) : clientActivity.map(a => {
            const typeColor = {
              upload: 'text-blue-600 bg-blue-50',
              login: 'text-green-600 bg-green-50',
              status_change: 'text-green-600 bg-green-50',
              request: 'text-amber-600 bg-amber-50',
              note: 'text-purple-600 bg-purple-50',
            }[a.eventType] || 'text-gray-500 bg-gray-100';
            return (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                <span className={`text-xs font-medium px-2 py-1 rounded-lg shrink-0 mt-0.5 ${typeColor}`}>
                  {(a.eventType || '').replace('_', ' ')}
                </span>
                <div>
                  <p className="text-gray-700 text-sm">{a.description}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{fmt(a.timestamp || a.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'Notes' && (
        <div className="space-y-3">
          {allDocs.filter(d => d.visibility === 'internal' && d.note).map(d => (
            <div key={d.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4">
              <p className="text-gray-700 text-sm leading-relaxed">{d.note}</p>
              <p className="text-gray-400 text-xs mt-2">{d.fileName} · {fmt(d.uploadedAt)}</p>
            </div>
          ))}
          {allDocs.filter(d => d.visibility === 'internal' && d.note).length === 0 && (
            <p className="text-gray-400 text-sm">No internal notes.</p>
          )}
        </div>
      )}
    </div>
  );
}
