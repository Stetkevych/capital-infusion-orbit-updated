import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { REPS, getClientsByRep, getDocumentsByClient, getMissingCategories, getRepById } from '../../data/mockData';
import StatusBadge from '../../components/shared/StatusBadge';
import { Mail, Phone, Users, FileText, AlertCircle, ArrowRight } from 'lucide-react';

export default function RepInfo() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const repsToShow = isAdmin ? REPS : [getRepById(user.repId)].filter(Boolean);

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-apple-gray1 tracking-tight">
            {isAdmin ? 'All Representatives' : 'My Profile'}
          </h1>
          <p className="text-apple-gray4 text-sm mt-0.5">
            {isAdmin ? `${repsToShow.length} active reps` : 'Your rep profile and assigned clients'}
          </p>
        </div>
      </div>

      {repsToShow.map(rep => {
        const clients = getClientsByRep(rep.id);
        const totalDocs = clients.reduce((s, c) => s + getDocumentsByClient(c.id).length, 0);
        const missingCount = clients.filter(c => getMissingCategories(c.id).length > 0).length;

        return (
          <div key={rep.id} className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 overflow-hidden">
            {/* Rep header */}
            <div className="p-5 border-b border-apple-gray7">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-xl">
                    {rep.name[0]}
                  </div>
                  <div>
                    <h2 className="text-apple-gray1 font-semibold text-base">{rep.name}</h2>
                    <p className="text-apple-gray4 text-sm">{rep.team} Team</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1.5 text-apple-gray3 text-xs"><Mail size={12} />{rep.email}</span>
                      <span className="flex items-center gap-1.5 text-apple-gray3 text-xs"><Phone size={12} />{rep.phone}</span>
                    </div>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                  rep.active ? 'bg-green-50 text-green-600 border-green-200' : 'bg-apple-gray8 text-apple-gray4 border-apple-gray7'
                }`}>
                  {rep.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-apple-gray7">
                {[
                  { icon: Users, label: 'Clients', value: clients.length, color: 'text-apple-blue', bg: 'bg-blue-50' },
                  { icon: FileText, label: 'Documents', value: totalDocs, color: 'text-green-600', bg: 'bg-green-50' },
                  { icon: AlertCircle, label: 'Missing Docs', value: missingCount, color: 'text-red-500', bg: 'bg-red-50' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-3">
                    <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
                      <s.icon size={16} className={s.color} />
                    </div>
                    <div>
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-apple-gray4 text-xs">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Client list */}
            <div>
              <div className="px-5 py-3 bg-apple-gray9 border-b border-apple-gray7">
                <p className="text-apple-gray4 text-xs font-medium uppercase tracking-wide">Assigned Clients</p>
              </div>
              {clients.length === 0 ? (
                <p className="text-apple-gray4 text-sm px-5 py-4">No clients assigned.</p>
              ) : (
                <div className="divide-y divide-apple-gray7">
                  {clients.map(c => {
                    const missing = getMissingCategories(c.id);
                    const docs = getDocumentsByClient(c.id);
                    return (
                      <Link
                        key={c.id}
                        to={`/clients/${c.id}`}
                        className="flex items-center justify-between px-5 py-3.5 hover:bg-apple-gray9 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-apple-gray8 rounded-lg flex items-center justify-center text-apple-gray3 font-semibold text-sm">
                            {c.businessName[0]}
                          </div>
                          <div>
                            <p className="text-apple-gray1 text-sm font-medium">{c.businessName}</p>
                            <p className="text-apple-gray4 text-xs">{c.ownerName} · {c.industry}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-apple-gray4 text-xs">{docs.length} docs</span>
                          {missing.length > 0 && (
                            <span className="flex items-center gap-1 text-red-400 text-xs"><AlertCircle size={11} />{missing.length}</span>
                          )}
                          <StatusBadge status={c.status} size="xs" />
                          <ArrowRight size={13} className="text-apple-gray5 group-hover:text-apple-blue transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
