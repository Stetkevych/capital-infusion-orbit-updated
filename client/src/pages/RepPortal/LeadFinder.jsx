import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Search, Download, ChevronRight, X, CheckCircle2,
  AlertCircle, Clock, Building2, MapPin, Users, Mail, Phone,
  Linkedin, Globe, Filter, RefreshCw, FileText, Loader2, Eye
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

const INDUSTRIES = ['Construction', 'Medical', 'Restaurants', 'Trucking', 'Auto Repair', 'Landscaping', 'Plumbing', 'HVAC', 'Dental', 'Veterinary', 'Insurance', 'Real Estate', 'Retail', 'Transportation'];
const TITLES = ['Founder', 'Co-Founder', 'CEO', 'President', 'Principal', 'Managing Partner', 'Partner', 'Owner', 'Director of Operations', 'General Manager'];
const LOCATIONS = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Nova Scotia', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan',
];
const EMP_RANGES = ['1,10', '11,20', '21,50', '51,100', '101,200'];

function Badge({ status }) {
  const cfg = {
    verified: 'bg-green-50 text-green-600 border-green-100',
    guessed: 'bg-amber-50 text-amber-600 border-amber-100',
    unavailable: 'bg-gray-50 text-gray-500 border-gray-100',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg[status] || cfg.unavailable}`}>
      {status === 'verified' ? <CheckCircle2 size={10} /> : status === 'guessed' ? <Clock size={10} /> : <AlertCircle size={10} />}
      {status || 'unknown'}
    </span>
  );
}

function LeadDrawer({ lead, onClose, onEnrich, enriching }) {
  if (!lead) return null;
  const fields = [
    { icon: Building2, label: 'Company', value: lead.company_name },
    { icon: Globe, label: 'Website', value: lead.website, link: true },
    { icon: Filter, label: 'Industry', value: lead.industry },
    { icon: MapPin, label: 'Location', value: lead.location },
    { icon: Users, label: 'Employees', value: lead.employee_count },
    { icon: Mail, label: 'Email', value: lead.email || 'Enrich to reveal' },
    { icon: Phone, label: 'Phone', value: lead.phone || 'Enrich to reveal' },
    { icon: Linkedin, label: 'LinkedIn', value: lead.linkedin_url, link: true },
    { icon: FileText, label: 'Source', value: 'Apollo.io' },
  ];
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl border-l border-gray-100 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-gray-900 font-semibold text-sm">Lead Details</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              {(lead.contact_name || '?')[0]}
            </div>
            <div>
              <p className="text-gray-900 font-semibold">{lead.contact_name}</p>
              <p className="text-gray-400 text-sm">{lead.title}</p>
            </div>
          </div>
          <div className="flex gap-2 mb-5">
            <Badge status={lead.email_status} />
            {lead.has_phone && <Badge status="verified" />}
          </div>
          {!lead.email && (
            <button onClick={() => onEnrich(lead)} disabled={enriching}
              className="w-full mb-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2">
              {enriching ? <><Loader2 size={14} className="animate-spin" /> Enriching...</> : <><Eye size={14} /> Reveal Contact Info (1 credit)</>}
            </button>
          )}
          <div className="space-y-4">
            {fields.map(f => (
              <div key={f.label} className="flex items-start gap-3">
                <f.icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-400 text-xs">{f.label}</p>
                  {f.link && f.value ? (
                    <a href={f.value} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline break-all">{f.value}</a>
                  ) : (
                    <p className="text-gray-800 text-sm">{f.value || '—'}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeadFinder() {
  const { token } = useAuth();
  const [leads, setLeads] = useState([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [searching, setSearching] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ industry: '', state: '', empRange: '11,50', title: 'Owner', keyword: '' });
  const [error, setError] = useState('');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const runSearch = async (pg = 1) => {
    setSearching(true);
    setError('');
    try {
      const body = {
        page: pg,
        per_page: 25,
        person_titles: filters.title ? [filters.title] : [],
        person_locations: filters.state ? [filters.state] : [],
        organization_num_employees_ranges: filters.empRange ? [filters.empRange] : [],
        q_keywords: [filters.industry, filters.keyword].filter(Boolean).join(' '),
        person_seniorities: ['owner', 'founder', 'c_suite'],
      };
      const res = await fetch(`${API}/apollo/search`, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');

      const mapped = (data.people || []).map(p => ({
        id: p.id,
        contact_name: `${p.first_name || ''} ${p.last_name || p.last_name_obfuscated || ''}`.trim(),
        title: p.title || '',
        company_name: p.organization?.name || '',
        website: p.organization?.website_url || '',
        industry: p.organization?.industry || '',
        location: [p.city, p.state, p.country].filter(Boolean).join(', '),
        employee_count: p.organization?.estimated_num_employees || '',
        email: p.email || '',
        email_status: p.email_status || (p.has_email ? 'available' : 'unavailable'),
        phone: p.phone_numbers?.[0]?.sanitized_number || '',
        has_phone: p.has_direct_phone === 'Yes',
        linkedin_url: p.linkedin_url || '',
        source: 'Apollo',
      }));
      setLeads(mapped);
      setTotalEntries(data.total_entries || 0);
      setPage(pg);
    } catch (e) {
      setError(e.message);
    }
    setSearching(false);
  };

  const enrichLead = async (lead) => {
    setEnriching(true);
    try {
      const res = await fetch(`${API}/apollo/enrich`, { method: 'POST', headers, body: JSON.stringify({ id: lead.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Enrich failed');
      const p = data.person || {};
      const updated = {
        ...lead,
        contact_name: p.name || lead.contact_name,
        email: p.email || lead.email,
        email_status: p.email_status || lead.email_status,
        phone: p.contact?.phone_numbers?.[0]?.sanitized_number || lead.phone,
        linkedin_url: p.linkedin_url || lead.linkedin_url,
        location: [p.city, p.state, p.country].filter(Boolean).join(', ') || lead.location,
        company_name: p.organization?.name || lead.company_name,
        website: p.organization?.website_url || lead.website,
        industry: p.organization?.industry || lead.industry,
        employee_count: p.organization?.estimated_num_employees || lead.employee_count,
      };
      setSelected(updated);
      setLeads(prev => prev.map(l => l.id === lead.id ? updated : l));
    } catch (e) {
      setError(e.message);
    }
    setEnriching(false);
  };

  const exportCSV = () => {
    if (!leads.length) return;
    const cols = ['contact_name', 'title', 'company_name', 'website', 'industry', 'location', 'employee_count', 'email', 'email_status', 'phone', 'linkedin_url', 'source'];
    const rows = leads.map(l => cols.map(c => `"${String(l[c] ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [cols.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `apollo-leads-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Search size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-gray-900 font-semibold text-sm">Lead Finder</h1>
            <p className="text-gray-400 text-xs">Apollo.io · Real B2B leads</p>
          </div>
        </div>
        {leads.length > 0 && (
          <button onClick={exportCSV} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5">
            <Download size={12} /> Export CSV
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Search filters */}
        <div className="p-6 border-b border-gray-100">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Industry</label>
                <select value={filters.industry} onChange={e => setFilters(p => ({ ...p, industry: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="">All Industries</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                <select value={filters.state} onChange={e => setFilters(p => ({ ...p, state: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="">All US & Canada</option>
                  <optgroup label="United States">
                    {LOCATIONS.slice(0, 50).map(s => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                  <optgroup label="Canada">
                    {LOCATIONS.slice(50).map(s => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Employees</label>
                <select value={filters.empRange} onChange={e => setFilters(p => ({ ...p, empRange: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  {EMP_RANGES.map(r => <option key={r} value={r}>{r.replace(',', '–')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                <select value={filters.title} onChange={e => setFilters(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="">All Titles</option>
                  {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Keyword</label>
                <input value={filters.keyword} onChange={e => setFilters(p => ({ ...p, keyword: e.target.value }))} placeholder="e.g. plumbing, roofing..."
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
            <button onClick={() => runSearch(1)} disabled={searching}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2">
              {searching ? <><RefreshCw size={14} className="animate-spin" /> Searching Apollo...</> : <><Search size={14} /> Search Leads</>}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Results */}
        {leads.length > 0 && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-900 font-semibold text-sm">{totalEntries.toLocaleString()} total matches</p>
                <p className="text-gray-400 text-xs">Showing {leads.length} · Page {page}</p>
              </div>
              <div className="flex gap-2">
                {page > 1 && (
                  <button onClick={() => runSearch(page - 1)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg">← Prev</button>
                )}
                <button onClick={() => runSearch(page + 1)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg">Next →</button>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {['Contact', 'Company', 'Industry', 'Location', 'Email', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-gray-400 text-xs font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {leads.map(l => (
                      <tr key={l.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setSelected(l)}>
                        <td className="px-4 py-3">
                          <p className="text-gray-900 font-medium text-sm">{l.contact_name}</p>
                          <p className="text-gray-400 text-xs">{l.title}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-800 text-sm">{l.company_name}</p>
                          <p className="text-gray-400 text-xs">{l.employee_count ? `${l.employee_count} emp` : ''}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{l.industry}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{l.location}</td>
                        <td className="px-4 py-3"><Badge status={l.email_status} /></td>
                        <td className="px-4 py-3"><ChevronRight size={14} className="text-gray-300" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!searching && leads.length === 0 && !error && (
          <div className="text-center py-20 text-gray-300">
            <Search size={32} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm">Set your filters and search to find leads from Apollo</p>
          </div>
        )}
      </div>

      <LeadDrawer lead={selected} onClose={() => setSelected(null)} onEnrich={enrichLead} enriching={enriching} />
    </div>
  );
}
