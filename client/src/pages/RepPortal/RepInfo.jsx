import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, ChevronDown, ChevronRight, Mail, Briefcase } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

const TEAMS = [
  {
    lead: 'Ray Ortega',
    members: ['Jamar', 'Pat Cazeau', 'Kevin', 'Eduardo', 'Jacob'],
  },
  {
    lead: 'Anthony Diaz',
    members: ['Nikholas', 'Dominic', 'Kevin Cohen', 'Michael Magen'],
  },
  {
    lead: 'Ivan Ortega',
    members: ['Evan', 'Daniel', 'Juan', 'Frank', 'Gimmy'],
  },
  {
    lead: 'Erik Anderson',
    members: ['Jeudy', 'Gabe', 'Dom'],
  },
];

// Match display names to user full_name from API
function findUser(users, displayName) {
  const lower = displayName.toLowerCase();
  return users.find(u => {
    const fn = (u.full_name || '').toLowerCase();
    return fn === lower || fn.startsWith(lower) || lower.startsWith(fn.split(' ')[0]);
  });
}

export default function RepInfo() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [openTeam, setOpenTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      fetch(`${API}/auth/users`, { headers }).then(r => r.ok ? r.json() : []),
      isAdmin ? fetch(`${API}/clients-api`, { headers }).then(r => r.ok ? r.json() : []) : Promise.resolve([]),
    ]).then(([u, c]) => {
      setUsers(Array.isArray(u) ? u : []);
      setClients(Array.isArray(c) ? c : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const getClientCount = (u) => {
    if (!u) return 0;
    return clients.filter(c => c.assignedRepId === u.id || c.assignedRepId === u.rep_id).length;
  };

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
          <Users size={22} className="text-blue-600" /> Teams
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Team leads and their members</p>
      </div>

      {TEAMS.map((team, ti) => {
        const leadUser = findUser(users, team.lead);
        const isOpen = openTeam === ti;
        const memberUsers = team.members.map(name => ({ name, user: findUser(users, name) }));
        const totalClients = memberUsers.reduce((sum, m) => sum + getClientCount(m.user), 0) + getClientCount(leadUser);

        return (
          <div key={ti} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setOpenTeam(isOpen ? null : ti)}
              className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-lg">
                  {team.lead[0]}
                </div>
                <div className="text-left">
                  <h2 className="text-gray-900 font-semibold text-base">{team.lead}</h2>
                  <p className="text-gray-400 text-sm">Team Lead · {team.members.length} members{isAdmin ? ` · ${totalClients} clients` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {leadUser?.email && (
                  <span className="text-gray-400 text-xs hidden md:block">{leadUser.email}</span>
                )}
                {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100">
                {memberUsers.map((m, mi) => {
                  const clientCount = getClientCount(m.user);
                  return (
                    <div key={mi} className="flex items-center justify-between px-6 py-3.5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 font-semibold text-sm">
                          {m.name[0]}
                        </div>
                        <div>
                          <p className="text-gray-900 text-sm font-medium">{m.user?.full_name || m.name}</p>
                          {m.user?.email && (
                            <p className="text-gray-400 text-xs flex items-center gap-1"><Mail size={10} />{m.user.email}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isAdmin && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Briefcase size={11} className="text-gray-400" /> {clientCount} clients
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          m.user?.is_active !== false ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'
                        }`}>
                          {m.user?.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
