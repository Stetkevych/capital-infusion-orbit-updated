import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { getClientById } from '../../data/mockData';
import { Building2, Plus } from 'lucide-react';
import StatusBadge from '../../components/shared/StatusBadge';

export default function MyBusinesses() {
  const { user } = useAuth();
  const client = getClientById(user.clientId);

  const businesses = client ? [client] : [];

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Businesses</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage your business profiles</p>
        </div>
        <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm font-medium">
          <Plus size={15} /> Add Business
        </button>
      </div>

      <div className="space-y-3">
        {businesses.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-12 text-center">
            <Building2 size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm font-medium">No businesses on file</p>
          </div>
        ) : businesses.map(b => (
          <div key={b.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg">
                  {b.businessName?.[0] || '?'}
                </div>
                <div>
                  <p className="text-gray-900 font-semibold text-sm">{b.businessName}</p>
                  <p className="text-gray-400 text-xs">{b.industry}{b.state ? ` · ${b.state}` : ''}</p>
                </div>
              </div>
              <StatusBadge status={b.status} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
              {[
                { label: 'Owner', value: b.ownerName },
                { label: 'Email', value: b.email },
                { label: 'Phone', value: b.phone || '—' },
                { label: 'Requested', value: b.requestedAmount ? `$${b.requestedAmount.toLocaleString()}` : '—' },
              ].map(f => (
                <div key={f.label}>
                  <p className="text-gray-400 text-xs">{f.label}</p>
                  <p className="text-gray-800 text-sm font-medium mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
