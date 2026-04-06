import React from 'react';
import { Download, FileText, Building2, Shield, ExternalLink } from 'lucide-react';

export const fmt$ = (n) => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtPct = (n) => `${Number(n).toFixed(1)}%`;

const PS = {
  accepted: 'bg-green-50 text-green-700 border-green-200',
  declined: 'bg-red-50 text-red-600 border-red-200',
  pending: 'bg-amber-50 text-amber-600 border-amber-200',
  returned: 'bg-orange-50 text-orange-600 border-orange-200',
  processing: 'bg-blue-50 text-blue-600 border-blue-200',
  refunded: 'bg-purple-50 text-purple-600 border-purple-200',
  revoked: 'bg-gray-100 text-gray-600 border-gray-300',
  pending_approval: 'bg-amber-50 text-amber-600 border-amber-200',
  denied: 'bg-red-50 text-red-600 border-red-200',
};

export function PaymentStatusBadge({ status }) {
  const cls = PS[status] || 'bg-gray-50 text-gray-500 border-gray-200';
  const label = (status || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}

export function SummaryStatCard({ icon: Icon, label, value, sub, accent = 'text-blue-600', bg = 'bg-blue-50' }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon size={17} className={accent} />
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-gray-400 text-xs mt-1">{label}</p>
      {sub && <p className="text-gray-300 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

export function DetailCard({ title, icon: Icon, children, action }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={15} className="text-blue-600" />}
          <h2 className="text-gray-900 font-semibold text-sm">{title}</h2>
        </div>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function FieldRow({ label, value, highlight, warn }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className={`text-sm font-semibold ${warn ? 'text-amber-600' : highlight ? 'text-blue-700' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

export function StatusBadge({ status, positive }) {
  const cls = positive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>{status}</span>;
}

export function ActionButton({ label, icon: Icon, onClick, primary }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors ${primary ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'}`}>
      {Icon && <Icon size={14} />} {label}
    </button>
  );
}

export function DonutChart({ percent, color = '#2563eb', size = 120, strokeWidth = 14 }) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const o = c - (percent / 100) * c;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" className="transition-all duration-700" />
    </svg>
  );
}

export function DocumentLinkCard({ name, date, type }) {
  const iconMap = { statement: FileText, tax: Building2, agreement: Shield };
  const Icon = iconMap[type] || FileText;
  return (
    <button className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors text-left group">
      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0"><Icon size={14} className="text-blue-600" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-800 text-sm font-medium truncate">{name}</p>
        <p className="text-gray-400 text-xs">{date}</p>
      </div>
      <Download size={14} className="text-gray-300 group-hover:text-blue-600 transition-colors shrink-0" />
    </button>
  );
}

export function ResourceLink({ label, desc }) {
  return (
    <button className="w-full flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors group">
      <div><p className="text-gray-800 text-sm font-medium">{label}</p><p className="text-gray-400 text-xs">{desc}</p></div>
      <ExternalLink size={13} className="text-gray-300 group-hover:text-blue-600 transition-colors" />
    </button>
  );
}
