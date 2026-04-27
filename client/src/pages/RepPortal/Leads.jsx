import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Users, Download, Search, Mail, Phone, Building2, MapPin,
  Linkedin, Globe, X, Trash2, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';

function Badge({ status }) {
  const cfg = { verified: 'bg-green-50 text-green-600 border-green-100', guessed: 'bg-amber-50 text-amber-600 border-amber-100' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg[status] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
      {status === 'verified' ? <CheckCircle2 size={10} /> : <Clock size={10} />}{status || 'unknown'}
    </span>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('orbit_enriched_leads') || '[]');
    setLeads(saved);
  }, []);

  const removeLead = (id) => {
    const updated = leads.filter(l => l.id !== id);
    setLeads(updated);
    localStorage.setItem('orbit_enriched_leads', JSON.stringify(updated));
    if (selected?.id === id) setSelected(null);
  };

  const exportCSV = () => {
    if (!leads.length) return;
    const cols = ['contact_name','title','company_name','website','industry','location','employee_count','email','email_status','phone','linkedin_url','enriched_at'];
    const rows = leads.map(l => cols.map(c => `"${String(l[c] ?? '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[cols.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `enriched-leads-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  const filtered = leads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (l.contact_name || '').toLowerCase().includes(q) || (l.company_name || '').toLowerCase().includes(q) || (l.email || '').toLowerCase().includes(q) || (l.industry || '').toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center"><Users size={16} className="text-white" /></div>
          <div>
            <h1 className="text-gray-900 font-semibold text-sm">Leads</h1>
            <p className="text-gray-400 text-xs">{leads.length} enriched lead{leads.length !== 1 ? 's' : ''} unlocked</p>
          </div>
        </div>
        <div className="flex gap-2">
          {leads.length > 0 && (
            <button onClick={exportCSV} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5">
              <Download size={12} /> Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {leads.length > 0 && (
          <div className="px-6 pt-4">
            <div className="relative max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..."
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/20" />
            </div>
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="p-6">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {['Contact', 'Company', 'Email', 'Phone', 'Industry', 'Location', 'Status', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-gray-400 text-xs font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(l => (
                      <tr key={l.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <p className="text-gray-900 font-medium text-sm">{l.contact_name}</p>
                          <p className="text-gray-400 text-xs">{l.title}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-800 text-sm">{l.company_name}</td>
                        <td className="px-4 py-3">
                          {l.email ? <a href={`mailto:${l.email}`} className="text-blue-600 text-sm hover:underline">{l.email}</a> : <span className="text-gray-300 text-sm">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{l.phone || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{l.industry}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{l.location}</td>
                        <td className="px-4 py-3"><Badge status={l.email_status} /></td>
                        <td className="px-4 py-3">
                          <button onClick={() => removeLead(l.id)} className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-500" title="Remove">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-300">
            <Users size={32} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm">{leads.length === 0 ? 'No leads unlocked yet. Use Lead Finder to enrich contacts.' : 'No leads match your search.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
