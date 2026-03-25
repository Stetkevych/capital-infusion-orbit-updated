import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ACTIVITY_LOG, CLIENTS, getClientsByRep, getClientById } from '../../data/mockData';

function fmt(iso) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const TYPE_STYLE = {
  upload: { label: 'Upload', cls: 'bg-blue-900/30 text-blue-400 border-blue-800' },
  status_change: { label: 'Status', cls: 'bg-green-900/30 text-green-400 border-green-800' },
  request: { label: 'Request', cls: 'bg-yellow-900/30 text-yellow-400 border-yellow-800' },
  note: { label: 'Note', cls: 'bg-purple-900/30 text-purple-400 border-purple-800' },
};

export default function ActivityPage() {
  const { user } = useAuth();
  const myClients = user.role === 'admin' ? CLIENTS : getClientsByRep(user.repId);
  const myClientIds = new Set(myClients.map(c => c.id));

  const logs = ACTIVITY_LOG
    .filter(a => myClientIds.has(a.clientId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Activity Log</h1>
        <p className="text-slate-400 text-sm mt-0.5">{logs.length} events</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
        {logs.map(a => {
          const client = getClientById(a.clientId);
          const t = TYPE_STYLE[a.eventType] || { label: a.eventType, cls: 'bg-slate-800 text-slate-400 border-slate-700' };
          return (
            <div key={a.id} className="flex items-start gap-4 px-5 py-4">
              <span className={`text-xs font-medium px-2 py-1 rounded border shrink-0 mt-0.5 ${t.cls}`}>
                {t.label}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-slate-200 text-sm">{a.description}</p>
                <p className="text-slate-500 text-xs mt-0.5">{client?.businessName}</p>
              </div>
              <span className="text-slate-600 text-xs shrink-0">{fmt(a.createdAt)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
