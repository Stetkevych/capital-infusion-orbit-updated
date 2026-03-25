import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { DOCUMENTS, CLIENTS, getClientsByRep, getClientById } from '../../data/mockData';

function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NotesPage() {
  const { user } = useAuth();
  const myClients = user.role === 'admin' ? CLIENTS : getClientsByRep(user.repId);
  const myClientIds = new Set(myClients.map(c => c.id));

  const notes = DOCUMENTS.filter(d =>
    myClientIds.has(d.clientId) && d.visibility === 'internal' && d.note
  );

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Internal Notes</h1>
        <p className="text-slate-400 text-sm mt-0.5">{notes.length} note{notes.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="space-y-3">
        {notes.length === 0 && <p className="text-slate-500 text-sm">No internal notes yet.</p>}
        {notes.map(d => {
          const client = getClientById(d.clientId);
          return (
            <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <p className="text-slate-200 text-sm leading-relaxed">{d.note}</p>
                <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded shrink-0">Internal</span>
              </div>
              <p className="text-slate-500 text-xs mt-2">{client?.businessName} · {d.fileName} · {fmt(d.uploadedAt)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
