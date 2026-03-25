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
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-apple-gray1 tracking-tight">Clients</h1>
        <p className="text-apple-gray4 text-sm mt-0.5">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray5" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-apple-gray7 rounded-xl text-apple-gray1 placeholder-apple-gray5 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/30 focus:border-apple-blue shadow-apple-sm transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-white border border-apple-gray7 text-apple-gray2 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 shadow-apple-sm"
        >
          <option value="">All Statuses</option>
          {['Active','Pending','Under Review','Approved'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-apple-gray7 bg-apple-gray9">
              <th className="text-left py-3 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">Business</th>
              <th className="text-left py-3 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">Owner</th>
              <th className="text-left py-3 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">Rep</th>
              <th className="text-left py-3 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">Status</th>
              <th className="text-left py-3 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">Docs</th>
              <th className="text-left py-3 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">Missing</th>
              <th className="text-right py-3 px-5"></th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => {
              const rep = getRepById(c.assignedRepId);
              const docs = getDocumentsByClient(c.id);
              const missing = getMissingCategories(c.id);
              return (
                <tr key={c.id} className="border-b border-apple-gray7 hover:bg-apple-gray9 transition-colors">
                  <td className="py-3.5 px-5">
                    <p className="text-apple-gray1 font-medium">{c.businessName}</p>
                    <p className="text-apple-gray4 text-xs mt-0.5">{c.industry} · {c.state}</p>
                  </td>
                  <td className="py-3.5 px-5 text-apple-gray3 text-sm">{c.ownerName}</td>
                  <td className="py-3.5 px-5 text-apple-gray3 text-sm">{rep?.name || '—'}</td>
                  <td className="py-3.5 px-5"><StatusBadge status={c.status} size="xs" /></td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-1.5 text-apple-gray3 text-sm">
                      <FileText size={13} className="text-apple-gray5" /> {docs.length}
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    {missing.length > 0
                      ? <div className="flex items-center gap-1 text-red-500 text-xs font-medium"><AlertCircle size={12} />{missing.length}</div>
                      : <span className="text-green-600 text-xs font-medium">Complete</span>
                    }
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <Link to={`/clients/${c.id}`} className="inline-flex items-center gap-1 text-apple-blue text-xs font-medium hover:opacity-70">
                      Open <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {clients.length === 0 && <p className="text-apple-gray4 text-sm text-center py-8">No clients found.</p>}
      </div>
    </div>
  );
}
