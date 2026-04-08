import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Key, Copy, CheckCircle2, Info, UserPlus, Loader2 } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

export default function ClientCredentials() {
  const { token, user } = useAuth();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', email: '', business_name: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const fetchCredentials = () => {
    fetch(`${API}/auth/client-credentials`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => setCredentials(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCredentials(); }, []);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!formData.full_name || !formData.email || !formData.password) {
      setFormError('Name, email, and password are required');
      return;
    }
    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API}/auth/create-client`, {
        method: 'POST', headers,
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create account');
      setFormSuccess(`Account created for ${formData.full_name} — assigned to you`);
      setFormData({ full_name: '', email: '', business_name: '', password: '' });
      fetchCredentials();
      setTimeout(() => setFormSuccess(''), 5000);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Key size={22} className="text-blue-600" /> Client Credentials
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Auto-generated login credentials for clients</p>
        </div>
        <button
          onClick={() => { setShowForm(f => !f); setFormError(''); setFormSuccess(''); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <UserPlus size={15} />
          {showForm ? 'Cancel' : 'Create Client Account'}
        </button>
      </div>

      {/* Create Client Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <h2 className="text-gray-900 font-semibold text-sm mb-4 flex items-center gap-2">
            <UserPlus size={15} className="text-blue-600" /> New Client Account
          </h2>
          {formError && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{formError}</div>
          )}
          {formSuccess && (
            <div className="bg-green-50 border border-green-100 text-green-700 text-sm rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
              <CheckCircle2 size={14} /> {formSuccess}
            </div>
          )}
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Full Name *</label>
              <input type="text" value={formData.full_name} onChange={e => setFormData(f => ({ ...f, full_name: e.target.value }))}
                placeholder="John Smith" className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email *</label>
              <input type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                placeholder="client@example.com" className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Business Name</label>
              <input type="text" value={formData.business_name} onChange={e => setFormData(f => ({ ...f, business_name: e.target.value }))}
                placeholder="Acme LLC" className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Password *</label>
              <input type="text" value={formData.password} onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                placeholder="Min 8 characters" className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={creating}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">
                {creating ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                {creating ? 'Creating...' : 'Create Account'}
              </button>
              <p className="text-gray-400 text-xs mt-2">Client will be auto-assigned to you ({user?.full_name || 'current rep'})</p>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4">
        <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-blue-700 text-sm">
          Once SES is approved, clients will be automatically emailed their credentials upon DocuSign completion. For now, please manually reach out to the client and provide them with their username and password below.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              {['Client', 'Email (Username)', 'Password', 'Created', ''].map(h => (
                <th key={h} className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-300 text-sm">Loading...</td></tr>
            ) : credentials.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400 text-sm">No client credentials yet. Credentials are auto-generated when a DocuSign application is completed.</td></tr>
            ) : credentials.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3.5 px-5">
                  <p className="text-gray-900 font-medium">{c.full_name}</p>
                  <p className="text-gray-400 text-xs">{c.business_name || ''}</p>
                </td>
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 text-sm font-mono">{c.email}</span>
                    <button onClick={() => copyToClipboard(c.email, `email-${c.id}`)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
                      {copied === `email-${c.id}` ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                </td>
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 text-sm font-mono bg-gray-50 px-2 py-1 rounded">{c.temp_password || '••••••••••'}</span>
                    {c.temp_password && (
                      <button onClick={() => copyToClipboard(c.temp_password, `pw-${c.id}`)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
                        {copied === `pw-${c.id}` ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-5 text-gray-400 text-xs">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                <td className="py-3.5 px-5">
                  <span className={`text-xs px-2 py-1 rounded-full border ${c.has_logged_in ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                    {c.has_logged_in ? 'Active' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
