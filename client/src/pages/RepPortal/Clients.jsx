import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CLIENTS, getClientsByRep, getMissingCategories, getDocumentsByClient, getRepById } from '../../data/mockData';
import StatusBadge from '../../components/shared/StatusBadge';
import { Search, AlertCircle, FileText, ArrowRight } from 'lucide-react';

export default function ClientsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const repFilter = searchParams.get('rep');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const baseClients = user.role === 'admin' ? CLIENTS : getClientsByRep(user.repId);
  const clients = baseClients
    .filter(c => !repFilter || c.assignedRepId === repFilter)
    .filter(c => !search || c.businessName.toLowerCase().includes(search.toLowerCase()) || c.ownerName.toLowerCase().includes(search.toLowerCase()))
    .filter(c => !statusFilter || c.status === statusFilter);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Clients</h1>
          <p className="text-slate-400 text-sm mt-0.5">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          {['Active', 'Pending', 'Under Review', 'Approved'].map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left py-3 px-5 text-slate-400 font-medium">Business</th>
              <th className="text-left py-3 px-5 text-slate-400 font-medium">Owner</th>
              <th className="text-left py-3 px-5 text-slate-400 font-medium">Rep</th>
              <th className="text-left py-3 px-5 text-slate-400 font-medium">Status</th>
              <th className="text-left py-3 px-5 text-slate-400 font-medium">Docs</th>
              <th className="text-left py-3 px-5 text-slate-400 font-medium">Missing</th>
              <th className="text-right py-3 px-5 text-slate-400 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => {
              const rep = getRepById(c.assignedRepId);
              const docs = getDocumentsByClient(c.id);
              const missing = getMissingCategories(c.id);
              return (
                <tr key={c.id} className="border-b border-slate-800 hover:bg-slate-800/40 transition">
                  <td className="py-3 px-5">
                    <p className="text-slate-200 font-medium">{c.businessName}</p>
                    <p className="text-slate-500 text-xs">{c.industry} · {c.state}</p>
                  </td>
                  <td className="py-3 px-5 text-slate-400">{c.ownerName}</td>
                  <td className="py-3 px-5 text-slate-400">{rep?.name || '—'}</td>
                  <td className="py-3 px-5"><StatusBadge status={c.status} size="xs" /></td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <FileText size={13} /> {docs.length}
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    {missing.length > 0 ? (
                      <div className="flex items-center gap-1 text-red-400 text-xs">
                        <AlertCircle size={12} /> {missing.length}
                      </div>
                    ) : (
                      <span className="text-green-500 text-xs">Complete</span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <Link
                      to={`/clients/${c.id}`}
                      className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                    >
                      Open <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {clients.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-8">No clients found.</p>
        )}
      </div>
    </div>
  );
}
