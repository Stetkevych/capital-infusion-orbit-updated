import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search, Mail, Loader2, Copy, CheckCircle2, Download, Eye } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

export default function RocketReach() {
  const { token } = useAuth();
  const [titles, setTitles] = useState('Founder,Co-Founder');
  const [pageSize, setPageSize] = useState(10);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [revealing, setRevealing] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const search = async () => {
    setLoading(true); setError(''); setResults([]);
    try {
      const res = await fetch(`${API}/rocketreach/search`, {
        method: 'POST', headers,
        body: JSON.stringify({ titles: titles.split(',').map(t => t.trim()), page_size: pageSize }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Search failed'); }
      const data = await res.json();
      setResults(data.profiles || []);
      setTotal(data.total || 0);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const revealEmail = async (profile, idx) => {
    setRevealing(idx);
    try {
      const res = await fetch(`${API}/rocketreach/lookup`, {
        method: 'POST', headers,
        body: JSON.stringify({ name: profile.name, company: profile.current_employer, linkedin_url: profile.linkedin_url }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Lookup failed'); }
      const data = await res.json();
      setResults(prev => prev.map((p, i) => i === idx ? { ...p, revealed_email: data.email, revealed_phone: data.phone } : p));
    } catch (e) { setError(e.message); }
    setRevealing(null);
  };

  const getEmail = (p) => p.revealed_email || p.personal_emails?.[0] || p.professional_emails?.[0] || p.teaser_emails?.[0] || '';

  const copyEmails = () => {
    const emails = results.map(getEmail).filter(Boolean);
    if (!emails.length) return;
    navigator.clipboard.writeText(emails.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportCSV = () => {
    if (!results.length) return;
    const cols = ['name', 'title', 'company', 'email', 'location', 'linkedin_url'];
    const rows = results.map(p => [p.name, p.current_title, p.current_employer, getEmail(p), p.location, p.linkedin_url]
      .map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[cols.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `email-eagle-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-amber-600 rounded-xl flex items-center justify-center">
          <Mail size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-gray-900 font-semibold text-lg">Email Eagle</h1>
          <p className="text-gray-400 text-xs">Extract founder & co-founder emails · United States · RocketReach</p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Titles</label>
            <select value={titles} onChange={e => setTitles(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20">
              <option value="Founder,Co-Founder">Founder & Co-Founder</option>
              <option value="Founder">Founder only</option>
              <option value="Co-Founder">Co-Founder only</option>
              <option value="CEO">CEO</option>
              <option value="CTO">CTO</option>
              <option value="CEO,CTO,Founder,Co-Founder">All C-Level + Founders</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Results per search</label>
            <input type="number" value={pageSize} onChange={e => setPageSize(Math.min(100, Math.max(1, +e.target.value)))}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
          </div>
          <div className="flex items-end">
            <button onClick={search} disabled={loading}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Searching...</> : <><Search size={14} /> Search Emails</>}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

      {results.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-sm font-medium">{results.length} shown · {total.toLocaleString()} total matches</p>
            <div className="flex gap-2">
              <button onClick={copyEmails}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5">
                {copied ? <><CheckCircle2 size={12} /> Copied!</> : <><Copy size={12} /> Copy All Emails</>}
              </button>
              <button onClick={exportCSV}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5">
                <Download size={12} /> Export CSV
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['Name', 'Title', 'Company', 'Email', 'Location', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-gray-400 text-xs font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {results.map((p, i) => {
                    const email = getEmail(p);
                    return (
                      <tr key={p.id || i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <p className="text-gray-900 font-medium">{p.name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full font-medium border border-amber-100">
                            {p.current_title || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{p.current_employer || '—'}</td>
                        <td className="px-4 py-3">
                          {email ? <span className="text-green-700 font-medium">{email}</span>
                            : <span className="text-gray-300">Hidden</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{p.location || '—'}</td>
                        <td className="px-4 py-3">
                          {!p.revealed_email && (
                            <button onClick={() => revealEmail(p, i)} disabled={revealing === i}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg flex items-center gap-1">
                              {revealing === i ? <Loader2 size={11} className="animate-spin" /> : <Eye size={11} />} Reveal
                            </button>
                          )}
                          {p.revealed_email && (
                            <span className="text-green-600 text-xs flex items-center gap-1"><CheckCircle2 size={11} /> Done</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && results.length === 0 && !error && (
        <div className="text-center py-16 text-gray-300">
          <Mail size={32} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm">Click "Search Emails" to extract founder contacts from the US</p>
        </div>
      )}
    </div>
  );
}
