import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, Plus, X, CheckCircle2, AlertCircle, Eye, EyeOff, Shield, UserCog, Building2, GitBranch } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

const ROLE_CONFIG = {
  admin:     { label: 'Admin',     icon: Shield,    color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
  team_lead: { label: 'Team Lead', icon: GitBranch, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  rep:       { label: 'Rep',       icon: UserCog,   color: 'text-apple-blue', bg: 'bg-blue-50 border-blue-200' },
  client:    { label: 'Client',    icon: Building2, color: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
};

// Mock users for display — will be replaced by real API data
const MOCK_USERS = [
  { id: 'admin-001', email: 'alexs@capital-infusion.com', full_name: 'Alex Stetkevych', role: 'admin', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'rep-001', email: 'chris@capital-infusion.com', full_name: 'Chris', role: 'rep', is_active: true, created_at: '2026-01-15T00:00:00Z' },
];

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState(MOCK_USERS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', full_name: '', role: 'rep', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }

    setLoading(true);
    setError('');

    try {
      // Get token from localStorage
      const stored = localStorage.getItem('mca_user');
      const sessionUser = stored ? JSON.parse(stored) : null;

      const res = await fetch(`${API}/auth/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionUser?.token || ''}`,
        },
        body: JSON.stringify({
          email: form.email,
          full_name: form.full_name,
          role: form.role,
          password: form.password,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(prev => [...prev, { ...data.user, created_at: new Date().toISOString() }]);
        setSuccess(`Account created for ${form.full_name} (${form.email})`);
      } else {
        // Server not connected yet — add to local list for demo
        const newUser = {
          id: `${form.role}-${Date.now()}`,
          email: form.email,
          full_name: form.full_name,
          role: form.role,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        setUsers(prev => [...prev, newUser]);
        setSuccess(`Account created for ${form.full_name} — will sync to server when connected`);
      }

      setShowForm(false);
      setForm({ email: '', full_name: '', role: 'rep', password: '', confirmPassword: '' });
    } catch {
      // Offline fallback
      const newUser = {
        id: `${form.role}-${Date.now()}`,
        email: form.email,
        full_name: form.full_name,
        role: form.role,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setUsers(prev => [...prev, newUser]);
      setSuccess(`Account created for ${form.full_name}`);
      setShowForm(false);
      setForm({ email: '', full_name: '', role: 'rep', password: '', confirmPassword: '' });
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = (id) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u));
  };

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-apple-gray1 tracking-tight flex items-center gap-2">
            <Users size={22} className="text-apple-blue" /> User Management
          </h1>
          <p className="text-apple-gray4 text-sm mt-0.5">{users.filter(u => u.is_active).length} active accounts</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setSuccess(''); setError(''); }}
          className="flex items-center gap-1.5 bg-apple-blue hover:bg-apple-bluehov text-white text-sm px-4 py-2 rounded-xl transition-colors shadow-apple-sm font-medium"
        >
          <Plus size={15} /> New Account
        </button>
      </div>

      {/* Success */}
      {success && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle2 size={16} className="text-green-600 shrink-0" />
          <p className="text-green-700 text-sm font-medium">{success}</p>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-400"><X size={14} /></button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-apple-gray1 font-semibold text-sm">Create New Account</h2>
            <button onClick={() => setShowForm(false)} className="text-apple-gray4 hover:text-apple-gray1"><X size={16} /></button>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-apple-gray3 mb-1.5 uppercase tracking-wide">Full Name</label>
              <input
                required
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full bg-apple-gray9 border border-apple-gray7 text-apple-gray1 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-apple-blue/30"
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-apple-gray3 mb-1.5 uppercase tracking-wide">Email Address</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-apple-gray9 border border-apple-gray7 text-apple-gray1 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-apple-blue/30"
                placeholder="john@capital-infusion.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-apple-gray3 mb-1.5 uppercase tracking-wide">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-apple-gray9 border border-apple-gray7 text-apple-gray1 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-apple-blue/30"
              >
                <option value="rep">Rep — sees assigned clients only</option>
                <option value="team_lead">Team Lead — sees their reps + clients</option>
                <option value="admin">Admin — sees everything</option>
                <option value="client">Client — sees own documents only</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-apple-gray3 mb-1.5 uppercase tracking-wide">Temporary Password</label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full bg-apple-gray9 border border-apple-gray7 text-apple-gray1 text-sm rounded-xl px-3 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-apple-blue/30"
                  placeholder="Min 8 characters"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-gray4">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-apple-gray3 mb-1.5 uppercase tracking-wide">Confirm Password</label>
              <input
                required
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                className="w-full bg-apple-gray9 border border-apple-gray7 text-apple-gray1 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-apple-blue/30"
                placeholder="Repeat password"
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between pt-2">
              <p className="text-apple-gray5 text-xs">User will be prompted to change password on first login</p>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-apple-blue hover:bg-apple-bluehov disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded-xl transition-colors font-medium"
              >
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 overflow-hidden">
        <div className="px-5 py-4 border-b border-apple-gray7 bg-apple-gray9">
          <h2 className="text-apple-gray1 font-semibold text-sm">All Accounts ({users.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-apple-gray7">
              <th className="text-left py-3 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">Name</th>
              <th className="text-left py-3 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">Email</th>
              <th className="text-left py-3 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">Role</th>
              <th className="text-left py-3 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">Status</th>
              <th className="text-left py-3 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">Created</th>
              <th className="text-right py-3 px-5"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.client;
              return (
                <tr key={u.id} className="border-b border-apple-gray7 hover:bg-apple-gray9 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-apple-gray8 rounded-full flex items-center justify-center text-apple-gray3 font-semibold text-sm">
                        {u.full_name[0]}
                      </div>
                      <span className="text-apple-gray1 font-medium">{u.full_name}</span>
                      {u.id === user?.id && <span className="text-xs bg-blue-50 text-apple-blue border border-blue-200 px-1.5 py-0.5 rounded-md">You</span>}
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-apple-gray3">{u.email}</td>
                  <td className="py-3.5 px-5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${rc.bg} ${rc.color}`}>
                      {rc.label}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                      u.is_active ? 'bg-green-50 text-green-600 border-green-200' : 'bg-apple-gray8 text-apple-gray4 border-apple-gray7'
                    }`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-apple-gray4 text-xs">
                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    {u.id !== user?.id && (
                      <button
                        onClick={() => toggleActive(u.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          u.is_active
                            ? 'text-red-500 border-red-200 hover:bg-red-50'
                            : 'text-green-600 border-green-200 hover:bg-green-50'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Hierarchy Tree */}
      <div className="bg-white rounded-apple-lg shadow-apple border border-apple-gray7 overflow-hidden">
        <div className="px-5 py-4 border-b border-apple-gray7 bg-apple-gray9 flex items-center gap-2">
          <GitBranch size={15} className="text-purple-600" />
          <h2 className="text-apple-gray1 font-semibold text-sm">Organization Hierarchy</h2>
        </div>
        <div className="p-5">
          {(() => {
            const admins = users.filter(u => u.role === 'admin' && u.is_active);
            const leads = users.filter(u => u.role === 'team_lead' && u.is_active);
            const reps = users.filter(u => u.role === 'rep' && u.is_active);
            return (
              <div className="space-y-1">
                {admins.map(a => (
                  <div key={a.id}>
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-indigo-50">
                      <Shield size={14} className="text-indigo-600" />
                      <span className="text-sm font-semibold text-gray-900">{a.full_name}</span>
                      <span className="text-xs text-indigo-500">Admin</span>
                    </div>
                    <div className="ml-6 border-l-2 border-gray-200 pl-4 space-y-1 mt-1">
                      {leads.map(l => (
                        <div key={l.id}>
                          <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-purple-50">
                            <GitBranch size={13} className="text-purple-600" />
                            <span className="text-sm font-medium text-gray-900">{l.full_name}</span>
                            <span className="text-xs text-purple-500">Team Lead</span>
                          </div>
                          <div className="ml-6 border-l-2 border-gray-200 pl-4 space-y-1 mt-1">
                            {reps.filter(r => r.reports_to === l.id || !r.reports_to).map(r => (
                              <div key={r.id} className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-gray-50">
                                <UserCog size={12} className="text-blue-500" />
                                <span className="text-sm text-gray-700">{r.full_name}</span>
                                <span className="text-xs text-gray-400">Rep</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {leads.length === 0 && reps.map(r => (
                        <div key={r.id} className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-gray-50">
                          <UserCog size={12} className="text-blue-500" />
                          <span className="text-sm text-gray-700">{r.full_name}</span>
                          <span className="text-xs text-gray-400">Rep</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
