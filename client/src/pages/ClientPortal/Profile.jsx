import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getClientById, getRepById } from '../../data/mockData';
import { Mail, Phone, MapPin, Building2, User, DollarSign, Save, CheckCircle2 } from 'lucide-react';
import StatusBadge from '../../components/shared/StatusBadge';

export default function ClientProfile() {
  const { user } = useAuth();
  const client = getClientById(user.clientId);
  const rep = client ? getRepById(client.assignedRepId) : null;
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    phone: client?.phone || '',
    state: client?.state || '',
    industry: client?.industry || '',
    requestedAmount: client?.requestedAmount || 0,
  });

  if (!client) return <div className="p-6 text-gray-400">Profile not found.</div>;

  const handleSave = () => {
    Object.assign(client, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const inputCls = "w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400";

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-400 text-sm mt-0.5">Your business information</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <CheckCircle2 size={14} className="text-green-600" />
          <p className="text-green-700 text-sm font-medium">Profile updated</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg">
              {client.businessName[0]}
            </div>
            <div>
              <p className="text-gray-900 font-bold">{client.businessName}</p>
              <p className="text-gray-400 text-sm">{client.ownerName}</p>
            </div>
          </div>
          <StatusBadge status={client.status} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Read-only fields */}
          <div className="flex items-center gap-3 py-3 border-b border-gray-100">
            <Building2 size={15} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-gray-400 text-xs">Business Name</p>
              <p className="text-gray-800 text-sm font-medium">{client.businessName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-3 border-b border-gray-100">
            <User size={15} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-gray-400 text-xs">Owner Name</p>
              <p className="text-gray-800 text-sm font-medium">{client.ownerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-3 border-b border-gray-100">
            <Mail size={15} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-gray-400 text-xs">Email</p>
              <p className="text-gray-800 text-sm font-medium">{client.email}</p>
            </div>
          </div>

          {/* Editable fields */}
          <div className="py-2">
            <label className="flex items-center gap-2 text-gray-400 text-xs mb-1.5">
              <Phone size={12} /> Phone
            </label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="(555) 555-0000" />
          </div>
          <div className="py-2">
            <label className="flex items-center gap-2 text-gray-400 text-xs mb-1.5">
              <MapPin size={12} /> State
            </label>
            <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className={inputCls} placeholder="NY" maxLength={2} />
          </div>
          <div className="py-2">
            <label className="flex items-center gap-2 text-gray-400 text-xs mb-1.5">
              <Building2 size={12} /> Industry
            </label>
            <input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} className={inputCls} placeholder="Automotive" />
          </div>
          <div className="py-2">
            <label className="flex items-center gap-2 text-gray-400 text-xs mb-1.5">
              <DollarSign size={12} /> Requested Amount
            </label>
            <input type="number" value={form.requestedAmount} onChange={e => setForm(f => ({ ...f, requestedAmount: e.target.value }))} className={inputCls} placeholder="75000" />
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end">
          <button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-xl font-medium transition-colors">
            <Save size={14} /> Save Changes
          </button>
        </div>
      </div>

      {rep && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-3">Assigned Representative</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 border border-indigo-200 rounded-full flex items-center justify-center text-indigo-600 font-bold">
              {rep.name[0]}
            </div>
            <div>
              <p className="text-gray-900 font-semibold text-sm">{rep.name}</p>
              <p className="text-gray-400 text-xs">{rep.email}</p>
              <p className="text-gray-400 text-xs">{rep.phone}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
