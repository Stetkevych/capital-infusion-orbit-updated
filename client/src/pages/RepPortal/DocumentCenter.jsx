import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CLIENTS, DOCUMENTS, DOC_CATEGORIES, getClientsByRep } from '../../data/mockData';
import StatusBadge from '../../components/shared/StatusBadge';
import { Search, FileText, Download, Eye } from 'lucide-react';

function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DocumentCenter() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serverDocs, setServerDocs] = useState([]);

  const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

  React.useEffect(() => {
    const stored = localStorage.getItem('mca_user');
    const sessionUser = stored ? JSON.parse(stored) : null;
    fetch(`${API}/documents/client/all`, {
      headers: { Authorization: `Bearer ${sessionUser?.token || ''}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(d => setServerDocs(d))
      .catch(() => {});
  }, []);

  const myClients = user.role === 'admin' ? CLIENTS : getClientsByRep(user.repId);
  const myClientIds = new Set(myClients.map(c => c.id));

  const allDocs = serverDocs.length > 0 ? serverDocs : DOCUMENTS;

  const docs = allDocs
    .filter(d => myClientIds.has(d.clientId))
    .filter(d => user.role !== 'client' || d.visibility !== 'internal')
    .filter(d => !search || d.fileName.toLowerCase().includes(search.toLowerCase()))
    .filter(d => !catFilter || d.category === catFilter)
    .filter(d => !statusFilter || d.status === statusFilter)
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Document Center</h1>
        <p className="text-gray-400 text-sm mt-0.5">{docs.length} document{docs.length !== 1 ? 's' : ''} across all clients</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search file names..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-blue-400 shadow-sm"
          />
        </div>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 shadow-sm"
        >
          <option value="">All Categories</option>
          {DOC_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 shadow-sm"
        >
          <option value="">All Statuses</option>
          {['Uploaded','Under Review','Approved','Rejected','Needs Reupload','Missing','Requested'].map(s => (
            <option key={s}>{s}</option>
          ))}
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
              <th className="text-right py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map(doc => {
              const client = myClients.find(c => c.id === doc.clientId);
              const cat = DOC_CATEGORIES.find(c => c.id === doc.category);
              return (
                <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-gray-400 shrink-0" />
                      <span className="text-gray-800 font-medium">{doc.fileName}</span>
                      {doc.visibility === 'internal' && (
                        <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">Internal</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    <Link to={`/clients/${doc.clientId}`} className="text-blue-600 hover:text-blue-700 text-sm">
                      {client?.businessName}
                    </Link>
                  </td>
                  <td className="py-3 px-5 text-gray-400">{cat?.label}</td>
                  <td className="py-3 px-5"><StatusBadge status={doc.status} size="xs" /></td>
                  <td className="py-3 px-5 text-gray-400">{fmt(doc.uploadedAt)}</td>
                  <td className="py-3 px-5">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition"><Eye size={14} /></button>
                      <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition"><Download size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {docs.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">No documents match your filters.</p>
        )}
      </div>
    </div>
  );
}
