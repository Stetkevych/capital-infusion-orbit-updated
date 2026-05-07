import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart2, Users, TrendingUp, Clock, Filter } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

export default function LeadData() {
  const { token } = useAuth();
  const [source, setSource] = useState('MP5');
  const [clients, setClients] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (source === 'MP5') {
      fetch(`${API}/clients-api`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          const all = Array.isArray(data) ? data : data.data || [];
          setClients(all.filter(c => c.assignedRepId === 'rep-1777482709497' || c.assignedRepId === 'rep-mp5'));
          setLeads([]);
        })
        .catch(() => setClients([]))
        .finally(() => setLoading(false));
    } else {
      const stored = JSON.parse(localStorage.getItem('orbit_leads') || '[]');
      setLeads(stored);
      setClients([]);
      setLoading(false);
    }
  }, [source, token]);

  const mp5Data = clients;
  const mp5ByStatus = {};
  mp5Data.forEach(c => { const s = c.status || 'Unknown'; mp5ByStatus[s] = (mp5ByStatus[s] || 0) + 1; });
  const mp5ByIndustry = {};
  mp5Data.forEach(c => { const ind = c.industry || 'Unknown'; mp5ByIndustry[ind] = (mp5ByIndustry[ind] || 0) + 1; });
  const mp5Recent = [...mp5Data].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 10);

  const zooxByIndustry = {};
  leads.forEach(l => { const ind = l.industry || l.organization?.industry || 'Unknown'; zooxByIndustry[ind] = (zooxByIndustry[ind] || 0) + 1; });
  const zooxByTitle = {};
  leads.forEach(l => { const t = l.title || 'Unknown'; zooxByTitle[t] = (zooxByTitle[t] || 0) + 1; });
  const zooxByLocation = {};
  leads.forEach(l => { const loc = l.city || l.state || l.location || 'Unknown'; zooxByLocation[loc] = (zooxByLocation[loc] || 0) + 1; });

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
            <BarChart2 size={22} className="text-blue-600" /> Lead Data
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Bot performance & lead source analytics</p>
        </div>
        <select value={source} onChange={e => setSource(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          <option value="MP5">MP5 (Bot)</option>
          <option value="ZOOX">ZOOX (Lead Finder)</option>
        </select>
      </div>

      {loading ? <p className="text-gray-400 text-sm">Loading...</p> : source === 'MP5' ? (
        <div className="space-y-5">
          {/* MP5 Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{mp5Data.length}</p>
              <p className="text-xs text-gray-500">Total Leads Assigned</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{mp5ByStatus['Funded'] || 0}</p>
              <p className="text-xs text-gray-500">Funded</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{mp5ByStatus['Pending'] || 0}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{Object.keys(mp5ByIndustry).length}</p>
              <p className="text-xs text-gray-500">Industries</p>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Filter size={14} className="text-blue-600" /> Status Breakdown</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(mp5ByStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                <div key={status} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-900 font-bold text-lg">{count}</p>
                  <p className="text-xs text-gray-500">{status}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Industry breakdown */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><TrendingUp size={14} className="text-green-600" /> Industry Breakdown</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(mp5ByIndustry).sort((a, b) => b[1] - a[1]).map(([ind, count]) => (
                <div key={ind} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-900 font-bold text-lg">{count}</p>
                  <p className="text-xs text-gray-500 truncate">{ind}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent leads */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-900">Recent MP5 Leads</h2></div>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                {['Business', 'Owner', 'Status', 'Industry', 'Created'].map(h => <th key={h} className="text-left py-2.5 px-4 text-gray-400 text-xs font-medium uppercase">{h}</th>)}
              </tr></thead>
              <tbody>
                {mp5Recent.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-2 px-4 text-gray-900 font-medium">{c.businessName || '—'}</td>
                    <td className="py-2 px-4 text-gray-600">{c.ownerName || '—'}</td>
                    <td className="py-2 px-4"><span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'Funded' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>{c.status || '—'}</span></td>
                    <td className="py-2 px-4 text-gray-500 text-xs">{c.industry || '—'}</td>
                    <td className="py-2 px-4 text-gray-400 text-xs">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
                {mp5Recent.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-300 text-sm">No MP5 leads found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ZOOX Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{leads.length}</p>
              <p className="text-xs text-gray-500">Total Leads from Lead Finder</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{Object.keys(zooxByIndustry).length}</p>
              <p className="text-xs text-gray-500">Industries</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{Object.keys(zooxByTitle).length}</p>
              <p className="text-xs text-gray-500">Unique Titles</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{Object.keys(zooxByLocation).length}</p>
              <p className="text-xs text-gray-500">Locations</p>
            </div>
          </div>

          {/* Industry */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Industry Breakdown</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(zooxByIndustry).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([ind, count]) => (
                <div key={ind} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-900 font-bold text-lg">{count}</p>
                  <p className="text-xs text-gray-500 truncate">{ind}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Titles */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Top Titles</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(zooxByTitle).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([title, count]) => (
                <div key={title} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-900 font-bold text-lg">{count}</p>
                  <p className="text-xs text-gray-500 truncate">{title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent leads table */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-900">Recent ZOOX Leads</h2></div>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                {['Name', 'Title', 'Company', 'Industry', 'Location'].map(h => <th key={h} className="text-left py-2.5 px-4 text-gray-400 text-xs font-medium uppercase">{h}</th>)}
              </tr></thead>
              <tbody>
                {leads.slice(0, 15).map((l, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-2 px-4 text-gray-900 font-medium">{l.name || l.first_name + ' ' + l.last_name || '—'}</td>
                    <td className="py-2 px-4 text-gray-600 text-xs">{l.title || '—'}</td>
                    <td className="py-2 px-4 text-gray-700">{l.organization?.name || l.company || '—'}</td>
                    <td className="py-2 px-4 text-gray-500 text-xs">{l.industry || l.organization?.industry || '—'}</td>
                    <td className="py-2 px-4 text-gray-400 text-xs">{l.city || l.state || l.location || '—'}</td>
                  </tr>
                ))}
                {leads.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-300 text-sm">No ZOOX leads found. Enrich leads from Lead Finder first.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
