import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Rocket, Search, Mail, Phone, Linkedin, Building2, MapPin, Loader2, Copy, CheckCircle2 } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

export default function RocketReach() {
  const { token } = useAuth();
  const [form, setForm] = useState({ name: '', company: '', linkedin_url: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const lookup = async (e) => {
    e.preventDefault();
    if (!form.name && !form.linkedin_url) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${API}/rocketreach/lookup`, { method: 'POST', headers, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Lookup failed'); }
      setResult(await res.json());
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center">
          <Rocket size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-gray-900 font-semibold text-lg">RocketReach</h1>
          <p className="text-gray-400 text-xs">Email lookup by name, company, or LinkedIn</p>
        </div>
      </div>

      <form onSubmit={lookup} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Person Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Smith"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Company Name</label>
            <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Acme Corp"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">LinkedIn URL</label>
          <input value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/..."
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
        </div>
        <button type="submit" disabled={loading || (!form.name && !form.linkedin_url)}
          className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2">
          {loading ? <><Loader2 size={14} className="animate-spin" /> Looking up...</> : <><Search size={14} /> Find Email</>}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {result && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 font-bold text-lg">
              {(result.name || '?')[0]}
            </div>
            <div>
              <p className="text-gray-900 font-semibold">{result.name}</p>
              <p className="text-gray-400 text-sm">{result.title}</p>
            </div>
          </div>

          <div className="space-y-3">
            {result.email && (
              <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-green-600" />
                  <span className="text-green-800 text-sm font-medium">{result.email}</span>
                </div>
                <button onClick={() => copy(result.email, 'email')} className="text-green-600 hover:text-green-800">
                  {copied === 'email' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                </button>
              </div>
            )}

            {result.emails && result.emails.length > 1 && (
              <div className="space-y-1">
                {result.emails.slice(1).map((e, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-gray-400" />
                      <span className="text-gray-700 text-sm">{e.email}</span>
                      <span className="text-xs text-gray-400">({e.type})</span>
                    </div>
                    <button onClick={() => copy(e.email, e.email)} className="text-gray-400 hover:text-gray-600">
                      {copied === e.email ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {result.phone && (
              <div className="flex items-center gap-2 text-gray-700 text-sm">
                <Phone size={14} className="text-gray-400" /> {result.phone}
                <button onClick={() => copy(result.phone, 'phone')} className="text-gray-400 hover:text-gray-600 ml-auto">
                  {copied === 'phone' ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                </button>
              </div>
            )}
            {result.company && (
              <div className="flex items-center gap-2 text-gray-700 text-sm">
                <Building2 size={14} className="text-gray-400" /> {result.company}
              </div>
            )}
            {result.location && (
              <div className="flex items-center gap-2 text-gray-700 text-sm">
                <MapPin size={14} className="text-gray-400" /> {result.location}
              </div>
            )}
            {result.linkedin_url && (
              <a href={result.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 text-sm hover:underline">
                <Linkedin size={14} /> {result.linkedin_url}
              </a>
            )}
          </div>

          {!result.email && (
            <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-xl px-4 py-3">
              No email found for this person. Try adding more details (company name or LinkedIn URL).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
