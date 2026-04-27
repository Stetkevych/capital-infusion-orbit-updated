import React, { useState, useMemo } from 'react';
import {
  Search, Download, Settings, ChevronRight, X, CheckCircle2,
  AlertCircle, Clock, Building2, MapPin, Users, Mail, Phone,
  Linkedin, Globe, Filter, RefreshCw, FileText
} from 'lucide-react';

/* ── Mock data generator ── */
const INDUSTRIES = ['Construction', 'Medical', 'Restaurants', 'Trucking', 'Auto Repair', 'Landscaping', 'Plumbing', 'HVAC', 'Dental', 'Veterinary'];
const TITLES = ['Owner', 'CEO', 'Founder', 'President', 'Managing Partner'];
const STATES = ['NY', 'CA', 'TX', 'FL', 'IL', 'NJ', 'PA', 'OH', 'GA', 'NC', 'AZ', 'MA', 'VA', 'WA', 'CO'];
const FIRST = ['James', 'Maria', 'Robert', 'Linda', 'Michael', 'Sarah', 'David', 'Jennifer', 'Carlos', 'Angela', 'Tony', 'Patricia', 'Kevin', 'Diana', 'Marcus'];
const LAST = ['Rodriguez', 'Smith', 'Johnson', 'Williams', 'Brown', 'Garcia', 'Martinez', 'Davis', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Lee'];
const COMPANIES = ['Apex', 'Summit', 'Pinnacle', 'Horizon', 'Atlas', 'Titan', 'Prime', 'Elite', 'Pacific', 'Metro', 'National', 'United', 'American', 'Eagle', 'Liberty'];
const SUFFIXES = ['LLC', 'Inc', 'Corp', 'Group', 'Services', 'Solutions', 'Co', 'Enterprises'];

function mockLeads(filters, count = 25) {
  const leads = [];
  for (let i = 0; i < count; i++) {
    const first = FIRST[Math.floor(Math.random() * FIRST.length)];
    const last = LAST[Math.floor(Math.random() * LAST.length)];
    const ind = filters.industry || INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)];
    const state = filters.state || STATES[Math.floor(Math.random() * STATES.length)];
    const co = `${COMPANIES[Math.floor(Math.random() * COMPANIES.length)]} ${ind} ${SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)]}`;
    const domain = co.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    const emp = 10 + Math.floor(Math.random() * 90);
    const yrs = 2 + Math.floor(Math.random() * 18);
    const verified = Math.random() > 0.3;
    leads.push({
      id: `lead-${Date.now()}-${i}`,
      company_name: co,
      website: `https://${domain}`,
      industry: ind,
      location: `${state}`,
      employee_count: emp,
      years_in_business: yrs,
      contact_name: `${first} ${last}`,
      title: filters.title || TITLES[Math.floor(Math.random() * TITLES.length)],
      email: `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
      phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      linkedin_url: `https://linkedin.com/in/${first.toLowerCase()}-${last.toLowerCase()}-${Math.floor(Math.random() * 9000) + 1000}`,
      source: ['Apollo', 'People Data Labs', 'Hunter', 'Clearbit'][Math.floor(Math.random() * 4)],
      email_status: verified ? 'verified' : 'unverified',
      phone_status: Math.random() > 0.4 ? 'valid' : 'unknown',
      enrichment_status: verified ? 'enriched' : 'pending',
      last_verified_at: verified ? new Date(Date.now() - Math.floor(Math.random() * 7 * 86400000)).toISOString() : null,
    });
  }
  return leads;
}

/* ── Status badge ── */
function Badge({ status }) {
  const cfg = {
    verified: 'bg-green-50 text-green-600 border-green-100',
    enriched: 'bg-green-50 text-green-600 border-green-100',
    valid: 'bg-green-50 text-green-600 border-green-100',
    unverified: 'bg-amber-50 text-amber-600 border-amber-100',
    pending: 'bg-amber-50 text-amber-600 border-amber-100',
    unknown: 'bg-gray-50 text-gray-500 border-gray-100',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg[status] || cfg.unknown}`}>
      {status === 'verified' || status === 'enriched' || status === 'valid'
        ? <CheckCircle2 size={10} />
        : status === 'pending' || status === 'unverified'
        ? <Clock size={10} />
        : <AlertCircle size={10} />}
      {status}
    </span>
  );
}

/* ── Lead detail drawer ── */
function LeadDrawer({ lead, onClose }) {
  if (!lead) return null;
  const fields = [
    { icon: Building2, label: 'Company', value: lead.company_name },
    { icon: Globe, label: 'Website', value: lead.website, link: true },
    { icon: Filter, label: 'Industry', value: lead.industry },
    { icon: MapPin, label: 'Location', value: lead.location },
    { icon: Users, label: 'Employees', value: lead.employee_count },
    { icon: Clock, label: 'Years in Business', value: lead.years_in_business },
    { icon: Mail, label: 'Email', value: lead.email },
    { icon: Phone, label: 'Phone', value: lead.phone },
    { icon: Linkedin, label: 'LinkedIn', value: lead.linkedin_url, link: true },
    { icon: FileText, label: 'Source', value: lead.source },
  ];
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl border-l border-gray-100 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-gray-900 font-semibold text-sm">Lead Details</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"><X size={16} /></button>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              {lead.contact_name[0]}
            </div>
            <div>
              <p className="text-gray-900 font-semibold">{lead.contact_name}</p>
              <p className="text-gray-400 text-sm">{lead.title}</p>
            </div>
          </div>
          <div className="flex gap-2 mb-6">
            <Badge status={lead.email_status} />
            <Badge status={lead.enrichment_status} />
            <Badge status={lead.phone_status} />
          </div>
          <div className="space-y-4">
            {fields.map(f => (
              <div key={f.label} className="flex items-start gap-3">
                <f.icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-400 text-xs">{f.label}</p>
                  {f.link ? (
                    <a href={f.value} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline break-all">{f.value}</a>
                  ) : (
                    <p className="text-gray-800 text-sm">{f.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {lead.last_verified_at && (
            <p className="text-gray-400 text-xs mt-6">Last verified: {new Date(lead.last_verified_at).toLocaleDateString()}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════════════ */
export default function LeadFinder() {
  const [tab, setTab] = useState('search');
  const [leads, setLeads] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ industry: '', state: '', minEmp: '10', maxEmp: '100', minYears: '2', title: '' });
  const [apiKeys, setApiKeys] = useState({ apollo: '', hunter: '', pdl: '', clearbit: '', neverbounce: '' });

  const updateFilter = (k, v) => setFilters(prev => ({ ...prev, [k]: v }));

  const runSearch = () => {
    setSearching(true);
    // Simulate API delay — replace with real POST /api/search-companies chain
    setTimeout(() => {
      setLeads(mockLeads(filters, 30));
      setSearching(false);
      setTab('results');
    }, 1200);
  };

  const exportCSV = () => {
    if (!leads.length) return;
    const headers = ['company_name','website','industry','location','employee_count','years_in_business','contact_name','title','email','phone','linkedin_url','source','email_status','phone_status','enrichment_status','last_verified_at'];
    const rows = leads.map(l => headers.map(h => `"${(l[h] ?? '').toString().replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const verifiedCount = leads.filter(l => l.email_status === 'verified').length;
  const enrichedCount = leads.filter(l => l.enrichment_status === 'enriched').length;

  const tabs = [
    { id: 'search', label: 'Search', icon: Search },
    { id: 'results', label: `Results${leads.length ? ` (${leads.length})` : ''}`, icon: Users },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Search size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-gray-900 font-semibold text-sm">Lead Finder</h1>
            <p className="text-gray-400 text-xs">B2B lead search & enrichment</p>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* ── SEARCH TAB ── */}
        {tab === 'search' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-gray-900 font-semibold text-lg mb-1">Find Decision-Makers</h2>
              <p className="text-gray-400 text-sm">Search for small business owners and executives for MCA outreach.</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Industry</label>
                  <select value={filters.industry} onChange={e => updateFilter('industry', e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                    <option value="">All Industries</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">State</label>
                  <select value={filters.state} onChange={e => updateFilter('state', e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                    <option value="">All States</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Min Employees</label>
                  <input type="number" value={filters.minEmp} onChange={e => updateFilter('minEmp', e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Max Employees</label>
                  <input type="number" value={filters.maxEmp} onChange={e => updateFilter('maxEmp', e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Min Years in Business</label>
                  <input type="number" value={filters.minYears} onChange={e => updateFilter('minYears', e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Title Keywords</label>
                  <select value={filters.title} onChange={e => updateFilter('title', e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                    <option value="">All Titles</option>
                    {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={runSearch} disabled={searching}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
                {searching ? <><RefreshCw size={14} className="animate-spin" /> Searching...</> : <><Search size={14} /> Search Leads</>}
              </button>
            </div>
            <p className="text-gray-300 text-xs text-center">Results use mock data. Connect API keys in Settings to search real leads.</p>
          </div>
        )}

        {/* ── RESULTS TAB ── */}
        {tab === 'results' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-gray-900 font-semibold text-lg">{leads.length} Leads Found</h2>
                <p className="text-gray-400 text-xs mt-0.5">{verifiedCount} verified · {enrichedCount} enriched</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setTab('search')} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5">
                  <Filter size={12} /> Refine
                </button>
                <button onClick={exportCSV} disabled={!leads.length} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5">
                  <Download size={12} /> Export CSV
                </button>
              </div>
            </div>
            {leads.length === 0 ? (
              <div className="text-center py-20 text-gray-400 text-sm">No leads yet. Run a search first.</div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        {['Contact', 'Company', 'Industry', 'Location', 'Email Status', 'Source', ''].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-gray-400 text-xs font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {leads.map(l => (
                        <tr key={l.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSelected(l)}>
                          <td className="px-4 py-3">
                            <p className="text-gray-900 font-medium text-sm">{l.contact_name}</p>
                            <p className="text-gray-400 text-xs">{l.title}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-800 text-sm">{l.company_name}</p>
                            <p className="text-gray-400 text-xs">{l.employee_count} emp · {l.years_in_business}yr</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-sm">{l.industry}</td>
                          <td className="px-4 py-3 text-gray-600 text-sm">{l.location}</td>
                          <td className="px-4 py-3"><Badge status={l.email_status} /></td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{l.source}</td>
                          <td className="px-4 py-3"><ChevronRight size={14} className="text-gray-300" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── EXPORT TAB ── */}
        {tab === 'export' && (
          <div className="max-w-lg mx-auto space-y-6">
            <div>
              <h2 className="text-gray-900 font-semibold text-lg mb-1">Export Leads</h2>
              <p className="text-gray-400 text-sm">Download your leads as CSV or push to CRM.</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-800 font-medium text-sm">Total Leads</p>
                  <p className="text-gray-400 text-xs">{verifiedCount} verified, {leads.length - verifiedCount} unverified</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">{leads.length}</p>
              </div>
              <button onClick={exportCSV} disabled={!leads.length}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
                <Download size={14} /> Download CSV
              </button>
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-800 font-medium text-sm">Push to Zoho CRM</p>
                    <p className="text-gray-400 text-xs">Coming soon — connect your Zoho account in Settings</p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">Soon</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab === 'settings' && (
          <div className="max-w-lg mx-auto space-y-6">
            <div>
              <h2 className="text-gray-900 font-semibold text-lg mb-1">API Keys & Settings</h2>
              <p className="text-gray-400 text-sm">Connect enrichment and verification providers. Keys are stored locally in your browser.</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
              {[
                { key: 'apollo', label: 'Apollo.io API Key', desc: 'Company search & contact enrichment' },
                { key: 'hunter', label: 'Hunter.io API Key', desc: 'Email finder & verification' },
                { key: 'pdl', label: 'People Data Labs API Key', desc: 'Contact enrichment' },
                { key: 'clearbit', label: 'Clearbit API Key', desc: 'Company enrichment' },
                { key: 'neverbounce', label: 'NeverBounce API Key', desc: 'Email verification' },
              ].map(p => (
                <div key={p.key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{p.label}</label>
                  <input type="password" value={apiKeys[p.key]} onChange={e => setApiKeys(prev => ({ ...prev, [p.key]: e.target.value }))}
                    placeholder={`Enter ${p.label}`}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  <p className="text-gray-300 text-xs mt-0.5">{p.desc}</p>
                </div>
              ))}
              <button onClick={() => { localStorage.setItem('leadfinder_keys', JSON.stringify(apiKeys)); }}
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium text-sm rounded-xl transition-colors">
                Save Keys Locally
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-amber-700 text-xs leading-relaxed">
                <strong>Compliance note:</strong> This tool does not scrape LinkedIn directly. LinkedIn profile URLs are only stored if returned by compliant third-party APIs. All data sourcing respects provider terms, robots.txt, opt-out mechanisms, and CAN-SPAM/TCPA considerations.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Lead detail drawer */}
      <LeadDrawer lead={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
