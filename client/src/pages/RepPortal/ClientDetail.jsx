import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getClientById, getRepById, getDocumentsByClient, getDocumentsByCategory,
  getRequestsByClient, getActivityByClient, getMissingCategories, DOC_CATEGORIES
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
  if (!client || !can.seeClient(id)) return <div className="p-6 text-apple-gray4">Client not found or access denied.</div>;

  const rep = getRepById(client.assignedRepId);
  const allDocs = getDocumentsByClient(id);
  const categoryDocs = getDocumentsByCategory(id, selectedCategory);
  const visibleDocs = can.seeInternalDocs ? categoryDocs : categoryDocs.filter(d => d.visibility !== 'internal');
  const requests = getRequestsByClient(id);
  const activity = getActivityByClient(id);
  const missing = getMissingCategories(id);
  const catLabel = DOC_CATEGORIES.find(c => c.id === selectedCategory)?.label || '';

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link to="/clients" className="p-1.5 hover:bg-apple-gray8 rounded-lg text-apple-gray4 hover:text-apple-gray1 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-apple-gray1 tracking-tight">{client.businessName}</h1>
            <p className="text-apple-gray4 text-sm">{client.ownerName} · {client.industry}</p>
          </div>
        </div>
        <StatusBadge status={client.status} />
      </div>

      {/* Info strip */}
      <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Mail, value: client.email },
          { icon: Phone, value: client.phone },
          { icon: MapPin, value: client.state },
          { icon: Building2, value: `Rep: ${rep?.name || '—'}` },
        ].map((f, i) => (
          <div key={i} className="flex items-center gap-2 text-apple-gray3 text-sm">
            <f.icon size={13} className="text-apple-gray5 shrink-0" /> {f.value}
          </div>
        ))}
      </div>

      {/* Missing docs alert */}
      {missing.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-apple-lg px-4 py-3">
          <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-red-600 text-sm font-medium">Missing Documents ({missing.length})</p>
            <p className="text-red-400 text-xs mt-0.5">{missing.map(c => c.label).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-apple-gray7">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-apple-blue text-apple-blue'
                : 'border-transparent text-apple-gray4 hover:text-apple-gray1'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Documents */}
      {activeTab === 'Documents' && (
        <div className="grid grid-cols-[190px_1fr] gap-5">
          <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 p-3">
            <p className="text-apple-gray5 text-xs font-medium uppercase tracking-wider px-2 mb-2">Folders</p>
            <FolderTree clientId={id} selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
          </div>
          <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-apple-gray7">
              <div>
                <p className="text-apple-gray1 font-semibold text-sm">{catLabel}</p>
                <p className="text-apple-gray4 text-xs">{visibleDocs.length} file{visibleDocs.length !== 1 ? 's' : ''}</p>
              </div>
              {can.uploadForClient && (
                <button
                  onClick={() => setShowUpload(v => !v)}
                  className="flex items-center gap-1.5 text-xs bg-apple-blue hover:bg-apple-bluehov text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                >
                  <Upload size={13} /> Upload
                </button>
              )}
            </div>
            {showUpload && (
              <div className="p-4 border-b border-apple-gray7 bg-apple-gray9">
                <UploadZone category={selectedCategory} categoryLabel={catLabel} compact />
              </div>
            )}
            <DocumentTable documents={visibleDocs} canChangeStatus={can.seeInternalDocs} />
          </div>
        </div>
      )}

      {/* Requests */}
      {activeTab === 'Requests' && (
        <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 divide-y divide-apple-gray7">
          {requests.length === 0
            ? <p className="text-apple-gray4 text-sm px-5 py-6">No document requests.</p>
            : requests.map(req => {
              const cat = DOC_CATEGORIES.find(c => c.id === req.category);
              return (
                <div key={req.id} className="px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-apple-gray1 font-medium text-sm">{cat?.label}</p>
                      <p className="text-apple-gray4 text-xs mt-1">{req.instructions}</p>
                      <p className="text-apple-gray5 text-xs mt-1.5 flex items-center gap-1"><Clock size={11} /> Due {fmt(req.dueDate)}</p>
                    </div>
                    <StatusBadge status={req.status} size="xs" />
                  </div>
                </div>
              );
            })
          }
        </div>
      )}

      {/* Activity */}
      {activeTab === 'Activity' && (
        <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 divide-y divide-apple-gray7">
          {activity.map(a => {
            const typeColor = { upload: 'text-apple-blue bg-blue-50', status_change: 'text-green-600 bg-green-50', request: 'text-amber-600 bg-amber-50', note: 'text-purple-600 bg-purple-50' }[a.eventType] || 'text-apple-gray4 bg-apple-gray8';
            return (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                <span className={`text-xs font-medium px-2 py-1 rounded-lg shrink-0 mt-0.5 ${typeColor}`}>{a.eventType.replace('_', ' ')}</span>
                <div>
                  <p className="text-apple-gray2 text-sm">{a.description}</p>
                  <p className="text-apple-gray4 text-xs mt-0.5">{fmt(a.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notes */}
      {activeTab === 'Notes' && (
        <div className="space-y-3">
          {allDocs.filter(d => d.visibility === 'internal' && d.note).map(d => (
            <div key={d.id} className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 px-5 py-4">
              <p className="text-apple-gray2 text-sm leading-relaxed">{d.note}</p>
              <p className="text-apple-gray5 text-xs mt-2">{d.fileName} · {fmt(d.uploadedAt)}</p>
            </div>
          ))}
          {allDocs.filter(d => d.visibility === 'internal' && d.note).length === 0 && (
            <p className="text-apple-gray4 text-sm">No internal notes.</p>
          )}
        </div>
      )}
    </div>
  );
}
