import React from 'react';
import { Link } from 'react-router-dom';
import { REPS, getClientsByRep, getDocumentsByClient } from '../../data/mockData';
import { Mail, Phone, ArrowRight } from 'lucide-react';

export default function RepsPage() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Reps</h1>
        <p className="text-slate-400 text-sm mt-0.5">All active sales representatives</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPS.map(rep => {
          const clients = getClientsByRep(rep.id);
          const totalDocs = clients.reduce((sum, c) => sum + getDocumentsByClient(c.id).length, 0);
          return (
            <div key={rep.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-900/40 border border-indigo-800 rounded-full flex items-center justify-center text-indigo-300 font-bold text-sm">
                    {rep.name[0]}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{rep.name}</p>
                    <p className="text-slate-500 text-xs">{rep.team}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded border ${rep.active ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                  {rep.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Mail size={12} /> {rep.email}
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Phone size={12} /> {rep.phone}
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-slate-800 mb-4">
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{clients.length}</p>
                  <p className="text-slate-500 text-xs">Clients</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{totalDocs}</p>
                  <p className="text-slate-500 text-xs">Documents</p>
                </div>
              </div>

              <Link
                to={`/clients?rep=${rep.id}`}
                className="flex items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm rounded-lg transition"
              >
                View Clients <ArrowRight size={14} />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
