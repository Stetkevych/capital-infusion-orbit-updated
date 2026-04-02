import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DOC_CATEGORIES } from '../../data/mockData';
import StatusBadge from '../../components/shared/StatusBadge';
import { Search, FileText, Download, ChevronDown, FolderOpen } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

async function downloadDoc(doc) {
  if (doc.key) {
    try {
      const res = await fetch(`${API}/documents/download/${doc.id}`);
      const { url } = await res.json();
      window.open(url, '_blank');
      return;
    } catch {}
  }
  alert('Download not available');
}

export default function DocumentCenter() {
  const { user, token } = useAuth();
  const [docs, setDocs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  useEffect(() => {
    Promise.all([
      fetch(`${API}/documents/client/all`, { headers }).then(r => r.ok ? r.json() : []),
      fetch(`${API}/clients-api`, { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([allDocs, allClients]) => {
      // Admin sees all, rep sees only their clients' docs
      const clientMap = {};
      allClients.forEach(c => { clientMap[c.id] = c; });

      let visibleDocs;
      if (user.role === 'admin') {
        visibleDocs = allDocs;
      } else {
        const myClientIds = new Set(allClients.map(c => c.id));
        visibleDocs = allDocs.filter(d => myClientIds.has(d.clientId));
      }

      setDocs(visibleDocs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)));
      setClients(allClients);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const clientMap = {};
  clients.forEach(c => { clientMap[c.id] = c; });

  const filtered = docs
    .filter(d => !search || d.fileName?.toLowerCase().includes(search.toLowerCase()))
    .filter(d => !catFilter || d.category === catFilter)
    .filter(d => !statusFilter || d.status === statusFilter)
    .filter(d => !clientFilter || d.clientId === clientFilter);

  const uniqueClients = [...new Map(docs.map(d => [d.clientId, clientMap[d.clientId]]).filter(([,v]) => v)).values()];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FolderOpen size={20} className="text-blue-600" /> Document Center
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {loading ? 'Loading...' : `${filtered.length} document${filtered.length !== 1 ? 's' : ''} across all clients`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search file names..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-400 shadow-sm"
          />
        </div>
        <div className="relative">
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
            className="appearance-none bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-blue-400 shadow-sm">
            <option value="">All Clients</option>
            {uniqueClients.map(c => <option key={c.id} value={c.id}>{c.businessName || c.ownerName}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 shadow-sm">
          <option value="">All Categories</option>
          {DOC_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 shadow-sm">
          <option value="">All Statuses</option>
          {['Uploaded','Under Review','Approved','Rejected','Needs Reupload'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">File Name</th>
              <th className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">Client</th>
              <th className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">Category</th>
              <th className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">Status</th>
              <th className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">Uploaded</th>
              <th className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">Size</th>
              <th className="text-right py-3 px-5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(doc => {
              const client = clientMap[doc.clientId];
              const cat = DOC_CATEGORIES.find(c => c.id === doc.category);
              return (
                <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50 transition group">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-gray-400 shrink-0" />
                      <span className="text-gray-800 font-medium truncate max-w-[200px]">{doc.fileName}</span>
                      {doc.uploadedBy === 'docusign' && (
                        <span className="text-xs bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">DocuSign</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    {client ? (
                      <Link to={`/clients/${doc.clientId}`} className="text-blue-600 hover:text-blue-700 text-sm">
                        {client.businessName || client.ownerName}
                      </Link>
                    ) : (
                      <span className="text-gray-400 text-sm">{doc.clientId?.substring(0, 8)}...</span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-gray-400 text-xs">{cat?.label || doc.category}</td>
                  <td className="py-3 px-5"><StatusBadge status={doc.status} size="xs" /></td>
                  <td className="py-3 px-5 text-gray-400 text-xs">{fmt(doc.uploadedAt)}</td>
                  <td className="py-3 px-5 text-gray-400 text-xs">{doc.fileSize || '—'}</td>
                  <td className="py-3 px-5">
                    <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => downloadDoc(doc)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition"><Download size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">No documents match your filters.</p>
        )}
        {loading && (
          <p className="text-gray-300 text-sm text-center py-8">Loading documents...</p>
        )}
      </div>
    </div>
  );
}
