import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CLIENTS, DOCUMENTS, DOCUMENT_REQUESTS, getClientsByRep, DOC_CATEGORIES } from '../../data/mockData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, Users, FileText, DollarSign, BarChart2 } from 'lucide-react';

const COLORS = ['#0071e3', '#34c759', '#ff9f0a', '#ff3b30', '#af52de', '#5ac8fa'];

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-apple-lg shadow-apple border border-apple-gray7 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, sub }) {
  return (
    <div className="px-5 py-4 border-b border-apple-gray7">
      <p className="text-apple-gray1 font-semibold text-sm">{title}</p>
      {sub && <p className="text-apple-gray4 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-apple-gray7 rounded-xl shadow-apple px-3 py-2">
      <p className="text-apple-gray4 text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-apple-gray1 text-xs font-semibold" style={{ color: p.color }}>{p.name}: {p.value}</p>
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
    { label: 'Total Pipeline', value: `$${(totalFunding / 1000).toFixed(0)}K`, icon: DollarSign, color: 'text-apple-blue', bg: 'bg-blue-50' },
    { label: 'Active Clients', value: myClients.length, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Approved', value: approvedClients, icon: TrendingUp, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { label: 'Pending Requests', value: pendingRequests, icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  // ── Doc status breakdown ──
  const statusCounts = myDocs.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // ── Docs by category ──
  const categoryData = DOC_CATEGORIES.map(cat => ({
    name: cat.label.split(' ')[0],
    fullName: cat.label,
    count: myDocs.filter(d => d.category === cat.id).length,
  }));

  // ── Upload activity (simulated weekly) ──
  const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  const uploadActivity = weeks.map((week, i) => ({
    week,
    uploads: Math.floor(myDocs.length * (0.15 + i * 0.25)),
    requests: Math.floor(pendingRequests * (0.2 + i * 0.2)),
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
          <h1 className="text-2xl font-semibold text-apple-gray1 tracking-tight flex items-center gap-2">
            <BarChart2 size={22} className="text-apple-blue" /> Analytics
          </h1>
          <p className="text-apple-gray4 text-sm mt-0.5">Portfolio overview and document metrics</p>
        </div>
        <div className="flex items-center gap-2 bg-apple-gray8 border border-apple-gray7 rounded-xl p-1">
          {['7d', '30d', '90d'].map(r => (
            <button key={r} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              range === r ? 'bg-white text-apple-gray1 shadow-apple-sm' : 'text-apple-gray4 hover:text-apple-gray2'
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
              <p className="text-apple-gray4 text-xs mt-1 font-medium">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upload activity */}
        <Card>
          <CardHeader title="Upload Activity" sub="Documents uploaded vs requests sent" />
          <div className="p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={uploadActivity} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f2f2f7" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#86868b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#86868b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="uploads" name="Uploads" fill="#0071e3" radius={[4, 4, 0, 0]} />
                <Bar dataKey="requests" name="Requests" fill="#ff9f0a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Document status pie */}
        <Card>
          <CardHeader title="Document Status Breakdown" sub="All documents by current status" />
          <div className="p-5 flex items-center gap-6">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {statusData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-apple-gray3 text-xs">{d.name}</span>
                  </div>
                  <span className="text-apple-gray1 text-xs font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Docs by category */}
        <Card>
          <CardHeader title="Documents by Category" sub="File count per document type" />
          <div className="p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f2f2f7" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#86868b' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#86868b' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Files" fill="#0071e3" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Funding by industry */}
        <Card>
          <CardHeader title="Pipeline by Industry" sub="Requested funding amount per sector" />
          <div className="p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={industryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f2f2f7" />
                <XAxis dataKey="industry" tick={{ fontSize: 10, fill: '#86868b' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: '#86868b' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => [`$${v.toLocaleString()}`, 'Amount']} content={<CustomTooltip />} />
                <Bar dataKey="amount" name="Amount" fill="#34c759" radius={[4, 4, 0, 0]} />
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
            <tr className="border-b border-apple-gray7 bg-apple-gray9">
              {['Business', 'Owner', 'Industry', 'Requested', 'Status'].map(h => (
                <th key={h} className="text-left py-3 px-5 text-apple-gray4 font-medium text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {myClients.map(c => (
              <tr key={c.id} className="border-b border-apple-gray7 hover:bg-apple-gray9 transition-colors">
                <td className="py-3 px-5 text-apple-gray1 font-medium text-sm">{c.businessName}</td>
                <td className="py-3 px-5 text-apple-gray3 text-sm">{c.ownerName}</td>
                <td className="py-3 px-5 text-apple-gray3 text-sm">{c.industry}</td>
                <td className="py-3 px-5 text-apple-gray1 font-semibold text-sm">${c.requestedAmount.toLocaleString()}</td>
                <td className="py-3 px-5">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                    c.status === 'Approved' ? 'bg-green-50 text-green-600 border-green-200' :
                    c.status === 'Active' ? 'bg-blue-50 text-apple-blue border-blue-200' :
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
