import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ACTIVITY_LOG, CLIENTS, getClientsByRep, getClientById } from '../../data/mockData';

function fmt(iso) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const TYPE_STYLE = {
  upload: { label: 'Upload', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  status_change: { label: 'Status', cls: 'bg-green-50 text-green-600 border-green-200' },
  request: { label: 'Request', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  note: { label: 'Note', cls: 'bg-purple-50 text-purple-600 border-purple-200' },
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
        <h1 className="text-xl font-bold text-gray-900">Activity Log</h1>
        <p className="text-gray-400 text-sm mt-0.5">{logs.length} events</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 shadow-sm">
        {logs.map(a => {
          const client = getClientById(a.clientId);
          const t = TYPE_STYLE[a.eventType] || { label: a.eventType, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
          return (
            <div key={a.id} className="flex items-start gap-4 px-5 py-4">
              <span className={`text-xs font-medium px-2 py-1 rounded border shrink-0 mt-0.5 ${t.cls}`}>
                {t.label}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-gray-800 text-sm">{a.description}</p>
                <p className="text-gray-400 text-xs mt-0.5">{client?.businessName}</p>
              </div>
              <span className="text-gray-400 text-xs shrink-0">{fmt(a.createdAt)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
