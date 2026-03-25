import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getClientById, getRepById, getDocumentsByClient, getDocumentsByCategory,
  getRequestsByClient, getActivityByClient, getMissingCategories,
  DOC_CATEGORIES
} from '../../data/mockData';
import FolderTree from '../../components/shared/FolderTree';
import DocumentTable from '../../components/shared/DocumentTable';
import UploadZone from '../../components/shared/UploadZone';
import StatusBadge from '../../components/shared/StatusBadge';
import { ArrowLeft, Mail, Phone, MapPin, Building2, AlertCircle, Clock, Upload } from 'lucide-react';

function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const TABS = ['Documents', 'Requests', 'Activity', 'Notes'];

export default function ClientDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(DOC_CATEGORIES[0].id);
  const [activeTab, setActiveTab] = useState('Documents');
  const [showUpload, setShowUpload] = useState(false);

  const client = getClientById(id);
  if (!client || !can.seeClient(id)) {
    return <div className="p-6 text-slate-400">Client not found or access denied.</div>;
  }

  const rep = getRepById(client.assignedRepId);
  const allDocs = getDocumentsByClient(id);
  const categoryDocs = getDocumentsByCategory(id, selectedCategory);
  const visibleDocs = can.seeInternalDocs ? categoryDocs : categoryDocs.filter(d => d.visibility !== 'internal');
  const requests = getRequestsByClient(id);
  const activity = getActivityByClient(id);
  const missing = getMissingCategories(id);
  const catLabel = DOC_CATEGORIES.find(c => c.id === selectedCategory)?.label || '';

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link to="/clients" className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">{client.businessName}</h1>
            <p className="text-slate-400 text-sm">{client.ownerName} · {client.industry}</p>
          </div>
        </div>
        <StatusBadge status={client.status} />
      </div>

      {/* Info strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Mail size={14} className="text-slate-600" /> {client.email}
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Phone size={14} className="text-slate-600" /> {client.phone}
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <MapPin size={14} className="text-slate-600" /> {client.state}
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Building2 size={14} className="text-slate-600" />
          Rep: <span className="text-slate-300">{rep?.name || '—'}</span>
        </div>
      </div>

      {/* Missing docs alert */}
      {missing.length > 0 && (
        <div className="flex items-start gap-3 bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-red-300 text-sm font-medium">Missing Documents ({missing.length})</p>
            <p className="text-red-400/70 text-xs mt-0.5">{missing.map(c => c.label).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Documents Tab */}
      {activeTab === 'Documents' && (
        <div className="grid grid-cols-[200px_1fr] gap-5">
          {/* Folder tree */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide px-2 mb-2">Folders</p>
            <FolderTree clientId={id} selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
          </div>

          {/* File panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div>
                <p className="text-white font-semibold text-sm">{catLabel}</p>
                <p className="text-slate-500 text-xs">{visibleDocs.length} file{visibleDocs.length !== 1 ? 's' : ''}</p>
              </div>
              {can.uploadForClient && (
                <button
                  onClick={() => setShowUpload(v => !v)}
                  className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition"
                >
                  <Upload size={13} /> Upload
                </button>
              )}
            </div>

            {showUpload && (
              <div className="p-4 border-b border-slate-800">
                <UploadZone category={selectedCategory} categoryLabel={catLabel} compact />
              </div>
            )}

            <DocumentTable documents={visibleDocs} canChangeStatus={can.seeInternalDocs} />
          </div>
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'Requests' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
          {requests.length === 0 ? (
            <p className="text-slate-500 text-sm px-5 py-6">No document requests.</p>
          ) : requests.map(req => {
            const cat = DOC_CATEGORIES.find(c => c.id === req.category);
            return (
              <div key={req.id} className="px-5 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-200 font-medium text-sm">{cat?.label || req.category}</p>
                    <p className="text-slate-400 text-xs mt-1">{req.instructions}</p>
                    <p className="text-slate-600 text-xs mt-1.5 flex items-center gap-1">
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
          {activity.map(a => {
            const typeColor = { upload: 'text-blue-400', status_change: 'text-green-400', request: 'text-yellow-400', note: 'text-purple-400' }[a.eventType] || 'text-slate-400';
            return (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                <span className={`text-xs font-medium uppercase tracking-wide mt-0.5 w-20 shrink-0 ${typeColor}`}>
                  {a.eventType.replace('_', ' ')}
                </span>
                <div>
                  <p className="text-slate-300 text-sm">{a.description}</p>
                  <p className="text-slate-500 text-xs">{fmt(a.createdAt)}</p>
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
            <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4">
              <p className="text-slate-300 text-sm">{d.note}</p>
              <p className="text-slate-500 text-xs mt-2">{d.fileName} · {fmt(d.uploadedAt)}</p>
            </div>
          ))}
          {allDocs.filter(d => d.visibility === 'internal' && d.note).length === 0 && (
            <p className="text-slate-500 text-sm">No internal notes.</p>
          )}
        </div>
      )}
    </div>
  );
}
