import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getClientById, getRepById, getRequestsByClient, DOC_CATEGORIES } from '../../data/mockData';
import StatusBadge from '../../components/shared/StatusBadge';
import UploadZone from '../../components/shared/UploadZone';
import {
  Upload, Shield, Lock, CheckCircle2, Clock, FileText,
  Mail, Phone, ArrowRight, Eye, AlertCircle, HelpCircle
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';
const CLIENT_DOC_CATEGORIES = DOC_CATEGORIES.filter(c => c.required);

/* ── tiny circular progress ── */
function CircleProgress({ pct }) {
  const r = 28, c = 2 * Math.PI * r, offset = c - (pct / 100) * c;
  return (
    <svg width="72" height="72" className="shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
      <circle cx="36" cy="36" r={r} fill="none" stroke="#2563eb" strokeWidth="5"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
        transform="rotate(-90 36 36)" className="transition-all duration-700" />
      <text x="36" y="40" textAnchor="middle" className="fill-gray-900 text-sm font-bold">{pct}%</text>
    </svg>
  );
}

/* ── progress card ── */
function ProgressCard({ progress, submittedCount, total, status }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex items-center gap-6">
      <CircleProgress pct={progress} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-1">
          <p className="text-gray-900 font-semibold">You're {progress}% complete</p>
          <StatusBadge status={status} size="xs" />
        </div>
        <p className="text-gray-400 text-sm mb-3">Finish uploading required documents to move your application forward.</p>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-gray-400 text-xs mt-2">{submittedCount} of {total} categories submitted</p>
      </div>
    </div>
  );
}

/* ── upload hero card ── */
function UploadHeroCard({ clientId, userId, token, onUpload }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)' }}>
      <div className="p-6 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <Upload size={16} className="text-blue-300" />
          </div>
          <span className="text-blue-300 text-xs font-medium uppercase tracking-wider">Primary Action</span>
        </div>
        <h2 className="text-white text-xl font-bold mt-3 mb-1">Upload Your Bank Statements</h2>
        <p className="text-blue-200/70 text-sm mb-5">Required to continue your application · Takes about 2 minutes</p>
        <div className="bg-white/10 backdrop-blur rounded-xl p-1">
          <UploadZone
            category="bank_statements"
            categoryLabel="Drop bank statements here or click to browse"
            clientId={clientId}
            uploadedBy={userId}
            token={token}
            onUpload={onUpload}
          />
        </div>
      </div>
      <div className="px-6 py-3 bg-white/5 border-t border-white/10 flex items-center gap-2">
        <Lock size={12} className="text-blue-300" />
        <span className="text-blue-200/60 text-xs">256-bit encrypted · Files stored securely in AWS</span>
      </div>
    </div>
  );
}

/* ── representative card ── */
function RepresentativeCard({ rep }) {
  if (!rep) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col">
      <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-4">Your Capital Infusion Representative</p>
      <div className="flex items-center gap-3.5 mb-5">
        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
          {rep.name?.[0] || '?'}
        </div>
        <div className="min-w-0">
          <p className="text-gray-900 font-semibold text-sm">{rep.name}</p>
          <p className="text-gray-400 text-xs">Financial Advisor</p>
        </div>
      </div>
      <div className="space-y-2.5 mb-5">
        <a href={`mailto:${rep.email}`} className="flex items-center gap-2.5 text-gray-500 text-xs hover:text-blue-600 transition-colors">
          <Mail size={13} className="text-gray-400 shrink-0" /><span className="truncate">{rep.email}</span>
        </a>
        {rep.phone && (
          <a href={`tel:${rep.phone}`} className="flex items-center gap-2.5 text-gray-500 text-xs hover:text-blue-600 transition-colors">
            <Phone size={13} className="text-gray-400 shrink-0" />{rep.phone}
          </a>
        )}
      </div>
      <div className="mt-auto bg-blue-50 border border-blue-100 rounded-xl p-3.5">
        <p className="text-blue-700 text-xs leading-relaxed">
          <Clock size={11} className="inline mr-1 -mt-0.5" />
          We review documents immediately after upload. You'll hear from us soon.
        </p>
      </div>
    </div>
  );
}

/* ── required documents card ── */
function RequiredDocumentsCard({ categories, uploadedSet }) {
  const icons = { bank_statements: '🏦', application: '📋', drivers_license: '🪪', voided_check: '✅', other: '📂' };
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
        <h3 className="text-gray-900 font-semibold text-sm">Required Documents</h3>
        <Link to="/upload" className="text-blue-600 text-xs font-medium hover:opacity-70 flex items-center gap-1">
          View all <ArrowRight size={12} />
        </Link>
      </div>
      <div className="divide-y divide-gray-50">
        {categories.map(cat => {
          const done = uploadedSet.has(cat.id);
          return (
            <div key={cat.id} className="px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-base">{icons[cat.id] || '📄'}</span>
                <div>
                  <p className="text-gray-800 text-sm font-medium">{cat.label}</p>
                  <p className="text-gray-400 text-xs">Required</p>
                </div>
              </div>
              {done ? (
                <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                  <CheckCircle2 size={13} /> Uploaded
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-400 text-xs">
                  <AlertCircle size={13} /> Not uploaded
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── next steps card ── */
function NextStepsCard() {
  const steps = [
    { num: '1', title: 'Upload your documents', desc: 'Bank statements, ID, and voided check — it only takes a few minutes.' },
    { num: '2', title: 'We review immediately', desc: 'Our team begins reviewing as soon as your files are received.' },
    { num: '3', title: 'Receive your offer', desc: 'We\'ll reach out with next steps and your funding options.' },
  ];
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
      <h3 className="text-gray-900 font-semibold text-sm mb-5">What happens next?</h3>
      <div className="space-y-5">
        {steps.map(s => (
          <div key={s.num} className="flex gap-3.5">
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">{s.num}</div>
            <div>
              <p className="text-gray-800 text-sm font-medium">{s.title}</p>
              <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── security footer ── */
function SecurityCard() {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center shrink-0">
          <Shield size={16} className="text-blue-600" />
        </div>
        <div>
          <p className="text-gray-800 text-sm font-medium">Your information is 100% secure and confidential.</p>
          <p className="text-gray-400 text-xs mt-0.5">Bank-level encryption and industry-leading security keeps your data safe.</p>
        </div>
      </div>
      <a href="https://orbit-technology.com" target="_blank" rel="noopener noreferrer"
        className="text-blue-600 text-xs font-medium hover:opacity-70 flex items-center gap-1 shrink-0">
        Learn more about our security <ArrowRight size={12} />
      </a>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN DASHBOARD — all original data bindings / API calls preserved
   ══════════════════════════════════════════════════════════════════════════════ */
export default function ClientDashboard() {
  const { user, token } = useAuth();
  const client = getClientById(user.clientId);
  const clientId = client?.id || user?.clientId || user?.id;
  const rep = client ? getRepById(client.assignedRepId) : null;
  const requests = client ? getRequestsByClient(client.id).filter(r => r.status === 'Pending') : [];
  const [realDocs, setRealDocs] = useState([]);

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  useEffect(() => {
    if (!clientId) return;
    fetch(`${API}/documents/client/${clientId}`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(docs => setRealDocs(docs))
      .catch(() => {});
  }, [clientId]);

  const uploadedCategories = new Set(realDocs.map(d => d.category));
  const submittedCount = CLIENT_DOC_CATEGORIES.filter(c => uploadedCategories.has(c.id)).length;
  const baseProgress = 25;
  const docProgress = CLIENT_DOC_CATEGORIES.length > 0 ? Math.round((submittedCount / CLIENT_DOC_CATEGORIES.length) * 75) : 0;
  const progress = Math.min(baseProgress + docProgress, 100);

  const refreshDocs = () => {
    if (!clientId) return;
    fetch(`${API}/documents/client/${clientId}`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(docs => setRealDocs(docs))
      .catch(() => {});
  };

  if (!client) return <div className="p-6 text-gray-400">Profile not found.</div>;

  const displayName = client.ownerName || user?.name || 'there';

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back, {displayName}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{client.businessName}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {displayName[0]}
          </div>
          <div className="hidden sm:block">
            <p className="text-gray-800 text-xs font-medium leading-tight">{displayName}</p>
            <p className="text-gray-400 text-xs leading-tight">{client.email || user?.email}</p>
          </div>
        </div>
      </div>

      {/* ── Progress ── */}
      <ProgressCard progress={progress} submittedCount={submittedCount} total={CLIENT_DOC_CATEGORIES.length} status={client.status} />

      {/* ── Upload Hero + Rep Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <UploadHeroCard clientId={clientId} userId={user?.id} token={token} onUpload={refreshDocs} />
        </div>
        <div className="lg:col-span-2">
          <RepresentativeCard rep={rep} />
        </div>
      </div>

      {/* ── Required Docs + Next Steps ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <RequiredDocumentsCard categories={CLIENT_DOC_CATEGORIES} uploadedSet={uploadedCategories} />
        </div>
        <div className="lg:col-span-2">
          <NextStepsCard />
        </div>
      </div>

      {/* ── Security Footer ── */}
      <SecurityCard />
    </div>
  );
}
