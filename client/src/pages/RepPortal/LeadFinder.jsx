import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Search, Download, ChevronRight, X, CheckCircle2,
  AlertCircle, Clock, Building2, MapPin, Users, Mail, Phone,
  Linkedin, Globe, Filter, RefreshCw, FileText, Loader2, Eye, Database
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

const INDUSTRIES = ['Construction', 'Medical', 'Restaurants', 'Trucking', 'Auto Repair', 'Landscaping', 'Plumbing', 'HVAC', 'Dental', 'Veterinary', 'Insurance', 'Real Estate', 'Retail', 'Transportation', 'Roofing', 'Electrical', 'Cleaning Services', 'Accounting', 'Legal'];
const TITLES = ['Founder', 'Co-Founder', 'CEO', 'President', 'Principal', 'Managing Partner', 'Partner', 'Owner', 'Director of Operations', 'General Manager'];
const US_STATES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];
const CA_PROVINCES = ['Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador','Nova Scotia','Ontario','Prince Edward Island','Quebec','Saskatchewan'];
const LOCATIONS = [...US_STATES, ...CA_PROVINCES];
const EMP_RANGES = [['1,10','1–10'],['11,20','11–20'],['21,50','21–50'],['51,100','51–100'],['101,200','101–200'],['201,500','201–500']];
const BIZ_TYPES = ['B2B', 'B2C', 'B2B2C', 'E-Commerce', 'Fintech', 'D2C', 'Non-Profit', 'SaaS', 'Consulting', 'Services', 'Retail'];

/* ── Multi-select bubble component ── */
function MultiSelect({ label, options, selected, onChange, optGroups }) {
  const [open, setOpen] = useState(false);
  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };
  return (
    <div className="relative">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-left text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 flex items-center justify-between">
        <span className="truncate">{selected.length ? `${selected.length} selected` : 'All'}</span>
        <ChevronRight size={12} className={`text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map(v => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
              {v} <button onClick={() => toggle(v)} className="hover:text-blue-900"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {optGroups ? optGroups.map(g => (
            <div key={g.label}>
              <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 bg-gray-50 sticky top-0">{g.label}</p>
              {g.items.map(o => (
                <button key={o} type="button" onClick={() => toggle(o)}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${selected.includes(o) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}>
                  {selected.includes(o) && <CheckCircle2 size={11} className="inline mr-1.5" />}{o}
                </button>
              ))}
            </div>
          )) : options.map(o => {
            const val = typeof o === 'string' ? o : o[0];
            const lbl = typeof o === 'string' ? o : o[1];
            return (
              <button key={val} type="button" onClick={() => toggle(val)}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${selected.includes(val) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}>
                {selected.includes(val) && <CheckCircle2 size={11} className="inline mr-1.5" />}{lbl}
              </button>
            );
          })}
          <button type="button" onClick={() => setOpen(false)} className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 border-t border-gray-100">Done</button>
        </div>
      )}
    </div>
  );
}

function Badge({ status }) {
  const cfg = { verified: 'bg-green-50 text-green-600 border-green-100', guessed: 'bg-amber-50 text-amber-600 border-amber-100' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg[status] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
      {status === 'verified' ? <CheckCircle2 size={10} /> : <Clock size={10} />}{status || 'unknown'}
    </span>
  );
}

function LeadDrawer({ lead, onClose, onEnrich, enriching, onZohoCheck, zohoResult, zohoChecking }) {
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
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">{(lead.contact_name || '?')[0]}</div>
            <div>
              <p className="text-gray-900 font-semibold">{lead.contact_name}</p>
              <p className="text-gray-400 text-sm">{lead.title}</p>
            </div>
          </div>
          <div className="flex gap-2 mb-5">
            <Badge status={lead.email_status} />
          </div>
          <div className="flex gap-2 mb-5">
            {!lead.email && (
              <button onClick={() => onEnrich(lead)} disabled={enriching}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2">
                {enriching ? <><Loader2 size={13} className="animate-spin" /> Enriching...</> : <><Eye size={13} /> Reveal Contact</>}
              </button>
            )}
            <button onClick={() => onZohoCheck(lead)} disabled={zohoChecking}
              className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2">
              {zohoChecking ? <><Loader2 size={13} className="animate-spin" /> Checking...</> : <><Database size={13} /> Check Zoho CRM</>}
            </button>
          </div>
          {zohoResult && (
            <div className={`mb-5 p-3 rounded-xl border text-xs ${zohoResult.found ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-green-50 border-green-100 text-green-700'}`}>
              {zohoResult.found ? (
                <><AlertCircle size={12} className="inline mr-1" /> Already in CRM: {zohoResult.details?.map(d => `${d.module} — ${d.name}`).join(', ')}</>
              ) : (
                <><CheckCircle2 size={12} className="inline mr-1" /> Not found in Zoho CRM — fresh lead</>
              )}
            </div>
          )}
          <div className="space-y-4">
            {fields.map(f => (
              <div key={f.label} className="flex items-start gap-3">
                <f.icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-400 text-xs">{f.label}</p>
                  {f.link && f.value ? <a href={f.value} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline break-all">{f.value}</a>
                    : <p className="text-gray-800 text-sm">{f.value || '—'}</p>}
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
  const [zohoChecking, setZohoChecking] = useState(false);
  const [zohoResult, setZohoResult] = useState(null);
  const [zohoMap, setZohoMap] = useState({});
  const [zohoLoading, setZohoLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    industries: [], locations: [], empRanges: ['11,50'], titles: ['Owner'], bizType: '', keyword: '',
  });

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const runSearch = async (pg = 1) => {
    setSearching(true); setError('');
    try {
      const kwParts = [...filters.industries];
      if (filters.keyword) kwParts.push(filters.keyword);
      if (filters.bizType) kwParts.push(filters.bizType);
      const body = {
        page: pg, per_page: 25,
        person_titles: filters.titles,
        person_locations: filters.locations,
        organization_num_employees_ranges: filters.empRanges,
        q_keywords: kwParts.join(' '),
        person_seniorities: ['owner', 'founder', 'c_suite'],
      };
      const res = await fetch(`${API}/apollo/search`, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      const mapped = (data.people || []).map(p => ({
        id: p.id,
        contact_name: `${p.first_name || ''} ${p.last_name || p.last_name_obfuscated || ''}`.trim(),
        title: p.title || '', company_name: p.organization?.name || '',
        website: p.organization?.website_url || '', industry: p.organization?.industry || '',
        location: [p.city, p.state, p.country].filter(Boolean).join(', '),
        employee_count: p.organization?.estimated_num_employees || '',
        email: p.email || '', email_status: p.email_status || (p.has_email ? 'available' : 'unavailable'),
        phone: p.phone_numbers?.[0]?.sanitized_number || '', has_phone: p.has_direct_phone === 'Yes',
        linkedin_url: p.linkedin_url || '', source: 'Apollo',
      }));
      setLeads(mapped); setTotalEntries(data.total_entries || 0); setPage(pg);
      // Auto Zoho check all leads
      batchZohoCheck(mapped);
    } catch (e) { setError(e.message); }
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
        ...lead, contact_name: p.name || lead.contact_name, email: p.email || lead.email,
        email_status: p.email_status || lead.email_status,
        phone: p.contact?.phone_numbers?.[0]?.sanitized_number || lead.phone,
        linkedin_url: p.linkedin_url || lead.linkedin_url,
        location: [p.city, p.state, p.country].filter(Boolean).join(', ') || lead.location,
        company_name: p.organization?.name || lead.company_name,
        website: p.organization?.website_url || lead.website,
        industry: p.organization?.industry || lead.industry,
        employee_count: p.organization?.estimated_num_employees || lead.employee_count,
        enriched: true, enriched_at: new Date().toISOString(),
      };
      setSelected(updated);
      setLeads(prev => prev.map(l => l.id === lead.id ? updated : l));
      // Save enriched leads to localStorage for Leads page
      const saved = JSON.parse(localStorage.getItem('orbit_enriched_leads') || '[]');
      const exists = saved.findIndex(s => s.id === updated.id);
      if (exists >= 0) saved[exists] = updated; else saved.unshift(updated);
      localStorage.setItem('orbit_enriched_leads', JSON.stringify(saved.slice(0, 500)));
    } catch (e) { setError(e.message); }
    setEnriching(false);
  };

  const zohoCheck = async (lead) => {
    setZohoChecking(true); setZohoResult(null);
    try {
      const res = await fetch(`${API}/zoho-crm/check`, { method: 'POST', headers, body: JSON.stringify({ name: lead.contact_name, email: lead.email }) });
      const data = await res.json();
      setZohoResult(data);
    } catch (e) { setZohoResult({ found: false, error: e.message }); }
    setZohoChecking(false);
  };

  const batchZohoCheck = async (leadsList) => {
    setZohoLoading(true);
    const map = {};
    for (const l of leadsList) {
      try {
        const res = await fetch(`${API}/zoho-crm/check`, { method: 'POST', headers, body: JSON.stringify({ name: l.contact_name, email: l.email, company: l.company_name }) });
        const data = await res.json();
        map[l.id] = data.found ? 'Yes' : 'No';
      } catch { map[l.id] = '—'; }
    }
    setZohoMap(prev => ({ ...prev, ...map }));
    setZohoLoading(false);
  };

  const exportCSV = () => {
    if (!leads.length) return;
    const cols = ['contact_name','title','company_name','website','industry','location','employee_count','email','email_status','phone','linkedin_url','source'];
    const rows = leads.map(l => cols.map(c => `"${String(l[c] ?? '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[cols.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `apollo-leads-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center"><Search size={16} className="text-white" /></div>
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
        {/* Filters */}
        <div className="p-6 border-b border-gray-100">
          <div className="max-w-5xl mx-auto space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MultiSelect label="Industry" options={INDUSTRIES} selected={filters.industries} onChange={v => setFilters(p => ({ ...p, industries: v }))} />
              <MultiSelect label="Location" selected={filters.locations} onChange={v => setFilters(p => ({ ...p, locations: v }))}
                optGroups={[{ label: 'United States', items: US_STATES }, { label: 'Canada', items: CA_PROVINCES }]} />
              <MultiSelect label="Employees" options={EMP_RANGES} selected={filters.empRanges} onChange={v => setFilters(p => ({ ...p, empRanges: v }))} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MultiSelect label="Title" options={TITLES} selected={filters.titles} onChange={v => setFilters(p => ({ ...p, titles: v }))} />
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Business Type</label>
                <select value={filters.bizType} onChange={e => setFilters(p => ({ ...p, bizType: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="">All Types</option>
                  {BIZ_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Keyword</label>
                <input value={filters.keyword} onChange={e => setFilters(p => ({ ...p, keyword: e.target.value }))} placeholder="e.g. roofing, dental..."
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

        {leads.length > 0 && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-900 font-semibold text-sm">{totalEntries.toLocaleString()} total matches</p>
                <p className="text-gray-400 text-xs">Showing {leads.length} · Page {page}</p>
              </div>
              <div className="flex gap-2">
                {page > 1 && <button onClick={() => runSearch(page - 1)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg">← Prev</button>}
                <button onClick={() => runSearch(page + 1)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg">Next →</button>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {['Contact', 'Company', 'In Zoho?', 'Industry', 'Location', 'Email', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-gray-400 text-xs font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {leads.map(l => (
                      <tr key={l.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => { setSelected(l); setZohoResult(null); }}>
                        <td className="px-4 py-3">
                          <p className="text-gray-900 font-medium text-sm">{l.contact_name}</p>
                          <p className="text-gray-400 text-xs">{l.title}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-800 text-sm">{l.company_name}</p>
                          <p className="text-gray-400 text-xs">{l.employee_count ? `${l.employee_count} emp` : ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          {zohoLoading && !zohoMap[l.id] ? (
                            <Loader2 size={12} className="text-gray-300 animate-spin" />
                          ) : zohoMap[l.id] === 'Yes' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 text-xs rounded-full font-medium border border-amber-100"><AlertCircle size={10} /> Yes</span>
                          ) : zohoMap[l.id] === 'No' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded-full font-medium border border-green-100"><CheckCircle2 size={10} /> No</span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
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

      <LeadDrawer lead={selected} onClose={() => { setSelected(null); setZohoResult(null); }}
        onEnrich={enrichLead} enriching={enriching} onZohoCheck={zohoCheck} zohoResult={zohoResult} zohoChecking={zohoChecking} />
    </div>
  );
}
