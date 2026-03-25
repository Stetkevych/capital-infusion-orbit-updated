import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { getClientById, getRepById } from '../../data/mockData';
import { Mail, Phone, MapPin, Building2, User, DollarSign } from 'lucide-react';
import StatusBadge from '../../components/shared/StatusBadge';

export default function ClientProfile() {
  const { user } = useAuth();
  const client = getClientById(user.clientId);
  const rep = client ? getRepById(client.assignedRepId) : null;

  if (!client) return <div className="p-6 text-slate-400">Profile not found.</div>;

  const fields = [
    { icon: Building2, label: 'Business Name', value: client.businessName },
    { icon: User, label: 'Owner Name', value: client.ownerName },
    { icon: Mail, label: 'Email', value: client.email },
    { icon: Phone, label: 'Phone', value: client.phone },
    { icon: MapPin, label: 'State', value: client.state },
    { icon: Building2, label: 'Industry', value: client.industry },
    { icon: DollarSign, label: 'Requested Amount', value: `$${client.requestedAmount.toLocaleString()}` },
  ];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Profile</h1>
        <p className="text-slate-400 text-sm mt-0.5">Your business information</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-900/40 border border-blue-800 rounded-xl flex items-center justify-center text-blue-300 font-bold text-lg">
              {client.businessName[0]}
            </div>
            <div>
              <p className="text-white font-bold">{client.businessName}</p>
              <p className="text-slate-400 text-sm">{client.ownerName}</p>
            </div>
          </div>
          <StatusBadge status={client.status} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map(f => (
            <div key={f.label} className="flex items-center gap-3 py-3 border-b border-slate-800 last:border-0">
              <f.icon size={15} className="text-slate-600 shrink-0" />
              <div>
                <p className="text-slate-500 text-xs">{f.label}</p>
                <p className="text-slate-200 text-sm font-medium">{f.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {rep && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-3">Assigned Representative</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-900/40 border border-indigo-800 rounded-full flex items-center justify-center text-indigo-300 font-bold">
              {rep.name[0]}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{rep.name}</p>
              <p className="text-slate-400 text-xs">{rep.email}</p>
              <p className="text-slate-400 text-xs">{rep.phone}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
