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
  AlertCircle, Clock, Upload, Send, CheckCircle2, X
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
  const [activeTab, setActiveTab] = useState('Documents');
  const [showUpload, setShowUpload] = useState(false);
  const [realDocs, setRealDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [requestingSent, setRequestingSent] = useState({});
  const [notification, setNotification] = useState(null);
  const [apiClient, setApiClient] = useState(null);

  const mockClient = getClientById(id);
  const client = mockClient || apiClient;
  const rep = client ? getRepById(client.assignedRepId) : null;
  const requests = getRequestsByClient(id);
  const activity = getActivityByClient(id);

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
  const categoryDocs = allDocs.filter(d => d.category === selectedCategory);
  const visibleDocs = can.seeInternalDocs
    ? categoryDocs
    : categoryDocs.filter(d => d.visibility !== 'internal');

  const catLabel = DOC_CATEGORIES.find(c => c.id === selectedCategory)?.label || '';

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

            <DocumentTable documents={visibleDocs} canChangeStatus={can.seeInternalDocs} />
          </div>
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'Requests' && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-50">
          {requests.length === 0 ? (
            <p className="text-gray-400 text-sm px-5 py-6">No document requests.</p>
          ) : requests.map(req => {
            const cat = DOC_CATEGORIES.find(c => c.id === req.category);
            return (
              <div key={req.id} className="px-5 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-800 font-medium text-sm">{cat?.label}</p>
                    <p className="text-gray-400 text-xs mt-1">{req.instructions}</p>
                    <p className="text-gray-300 text-xs mt-1.5 flex items-center gap-1">
                      <Clock size={11} /> Due {fmt(req.dueDate)}
                    </p>
                  </div>
                  <StatusBadge status={req.status} size="xs" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'Activity' && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-50">
          {activity.map(a => {
            const typeColor = {
              upload: 'text-blue-600 bg-blue-50',
              status_change: 'text-green-600 bg-green-50',
              request: 'text-amber-600 bg-amber-50',
              note: 'text-purple-600 bg-purple-50',
            }[a.eventType] || 'text-gray-500 bg-gray-100';
            return (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                <span className={`text-xs font-medium px-2 py-1 rounded-lg shrink-0 mt-0.5 ${typeColor}`}>
                  {a.eventType.replace('_', ' ')}
                </span>
                <div>
                  <p className="text-gray-700 text-sm">{a.description}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{fmt(a.createdAt)}</p>
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
