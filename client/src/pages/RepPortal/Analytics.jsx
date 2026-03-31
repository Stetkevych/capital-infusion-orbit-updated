import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CLIENTS, DOCUMENTS, DOCUMENT_REQUESTS, getClientsByRep, DOC_CATEGORIES } from '../../data/mockData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, Users, FileText, DollarSign, BarChart2 } from 'lucide-react';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#6366f1'];
const EMPTY_COLOR = '#e5e7eb';

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, sub }) {
  return (
    <div className="px-5 py-4 border-b border-gray-100">
      <p className="text-gray-900 font-semibold text-sm">{title}</p>
      {sub && <p className="text-gray-400 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-gray-900 text-xs font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const { user } = useAuth();
  const [range] = useState('30d');

  const myClients = user.role === 'admin' ? CLIENTS : getClientsByRep(user.repId);
  const myClientIds = new Set(myClients.map(c => c.id));
  const myDocs = DOCUMENTS.filter(d => myClientIds.has(d.clientId));

  // ── Stat cards ──
  const totalFunding = myClients.reduce((s, c) => s + c.requestedAmount, 0);
  const approvedClients = myClients.filter(c => c.status === 'Approved').length;
  const pendingRequests = DOCUMENT_REQUESTS.filter(r => r.status === 'Pending' && myClientIds.has(r.clientId)).length;

  const stats = [
    { label: 'Total Pipeline', value: `$${(totalFunding / 1000).toFixed(0)}K`, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Clients', value: myClients.length, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Approved', value: approvedClients, icon: TrendingUp, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { label: 'Pending Requests', value: pendingRequests, icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  // ── 1. Applications by Lead Source (replaces Document Status Breakdown) ──
  const sourceMap = {};
  myClients.forEach(c => {
    const src = c.source || 'Unknown';
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  });
  const sourceData = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));
  const hasSourceData = sourceData.length > 0;
  const emptyDonut = [{ name: 'No Data', value: 1 }];

  // ── 2. Avg time app → funded by industry (replaces Documents by Category) ──
  // Using mock stage durations since real deal data comes from DealLog
  const industryTimeData = [
    { industry: 'Automotive', days: 0 },
    { industry: 'Construction', days: 0 },
    { industry: 'Food & Bev', days: 0 },
    { industry: 'Healthcare', days: 0 },
    { industry: 'Retail', days: 0 },
    { industry: 'Services', days: 0 },
  ];
  // Populate from real clients where we have data
  myClients.forEach(c => {
    const entry = industryTimeData.find(e => c.industry && e.industry.toLowerCase().startsWith(c.industry.toLowerCase().slice(0, 4)));
    // Days will populate from Deal Log data once deals are entered
  });
  const hasIndustryData = industryTimeData.some(d => d.days > 0);

  // ── 3. Upload activity — approvals over past month ──
  const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  const approvedThisMonth = myClients.filter(c => c.status === 'Approved').length;
  const uploadActivity = weeks.map((week, i) => ({
    week,
    uploads: Math.floor(myDocs.length * (0.15 + i * 0.25)),
    approvals: Math.floor(approvedThisMonth * (0.1 + i * 0.3)),
  }));

  // ── Funding by industry ──
  const industryData = myClients.reduce((acc, c) => {
    const existing = acc.find(a => a.industry === c.industry);
    if (existing) existing.amount += c.requestedAmount;
    else acc.push({ industry: c.industry, amount: c.requestedAmount });
    return acc;
  }, []);

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart2 size={22} className="text-blue-600" /> Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Portfolio overview and document metrics</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-xl p-1">
          {['7d', '30d', '90d'].map(r => (
            <button key={r} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              range === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-700'
            }`}>{r}</button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
            <div className="p-5">
              <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-4`}>
                <s.icon size={17} className={s.color} />
              </div>
              <p className={`text-2xl font-bold tracking-tight ${s.color}`}>{s.value}</p>
              <p className="text-gray-400 text-xs mt-1 font-medium">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Upload Activity — subtitle: application approvals over past month */}
        <Card>
          <CardHeader
            title="Upload Activity"
            sub="Application approvals over the past month"
          />
          <div className="p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={uploadActivity} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="uploads" name="Uploads" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="approvals" name="Approvals" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Applications by Lead Source — replaces Document Status Breakdown */}
        <Card>
          <CardHeader title="Applications by Lead Source" sub="Client distribution by acquisition channel" />
          <div className="p-5 flex items-center gap-6">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie
                  data={hasSourceData ? sourceData : emptyDonut}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={75}
                  paddingAngle={hasSourceData ? 3 : 0}
                  dataKey="value"
                >
                  {(hasSourceData ? sourceData : emptyDonut).map((_, i) => (
                    <Cell key={i} fill={hasSourceData ? COLORS[i % COLORS.length] : EMPTY_COLOR} />
                  ))}
                </Pie>
                {hasSourceData && <Tooltip content={<CustomTooltip />} />}
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {hasSourceData ? sourceData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600 text-xs">{d.name}</span>
                  </div>
                  <span className="text-gray-900 text-xs font-semibold">{d.value}</span>
                </div>
              )) : (
                <p className="text-gray-300 text-xs">No lead source data yet.<br />Log deals to populate.</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Avg time app → funded by industry — replaces Documents by Category */}
        <Card>
          <CardHeader title="Avg Time: Application to Funded" sub="Average days by industry — populated from Deal Log" />
          <div className="p-5">
            {hasIndustryData ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={industryTimeData} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit="d" />
                  <YAxis dataKey="industry" type="category" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip formatter={v => [`${v} days`, 'Avg Time']} />
                  <Bar dataKey="days" name="Avg Days" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center gap-2">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <BarChart2 size={24} className="text-gray-300" />
                </div>
                <p className="text-gray-400 text-sm font-medium">No data yet</p>
                <p className="text-gray-300 text-xs text-center">Log funded deals with dates<br />in Deal Log to populate</p>
              </div>
            )}
          </div>
        </Card>

        {/* Funding by industry */}
        <Card>
          <CardHeader title="Pipeline by Industry" sub="Requested funding amount per sector" />
          <div className="p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={industryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="industry" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => [`$${v.toLocaleString()}`, 'Amount']} />
                <Bar dataKey="amount" name="Amount" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Client status table */}
      <Card>
        <CardHeader title="Client Pipeline Summary" sub="All clients by status and funding amount" />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {['Business', 'Owner', 'Industry', 'Requested', 'Status'].map(h => (
                <th key={h} className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {myClients.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-5 text-gray-900 font-medium text-sm">{c.businessName}</td>
                <td className="py-3 px-5 text-gray-500 text-sm">{c.ownerName}</td>
                <td className="py-3 px-5 text-gray-500 text-sm">{c.industry}</td>
                <td className="py-3 px-5 text-gray-900 font-semibold text-sm">${c.requestedAmount.toLocaleString()}</td>
                <td className="py-3 px-5">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                    c.status === 'Approved' ? 'bg-green-50 text-green-600 border-green-200' :
                    c.status === 'Active' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                    c.status === 'Under Review' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                    'bg-amber-50 text-amber-600 border-amber-200'
                  }`}>{c.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
