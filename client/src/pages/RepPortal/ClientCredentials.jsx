import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Key, Copy, CheckCircle2, Info } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

export default function ClientCredentials() {
  const { token } = useAuth();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  useEffect(() => {
    fetch(`${API}/auth/client-credentials`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => setCredentials(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
          <Key size={22} className="text-blue-600" /> Client Credentials
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Auto-generated login credentials for clients</p>
      </div>

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
