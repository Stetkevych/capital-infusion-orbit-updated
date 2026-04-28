import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Plus, Save, Trash2, Download, Loader2, X, Edit3, Check } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

const LENDERS = ['', 'Rapid Finance', 'Fundworks', 'On Deck', 'Bitty', 'CFG', 'Forward Funding', 'Expansion Capital', 'Headway', 'Merchant Growth', 'Journey Capital', 'Olympus', 'United', 'American Choice', 'EBF', 'Top Choice', 'Shore Funding', 'Rise Alliance', 'Milvado', 'SBA', 'Other'];
const LEAD_SOURCES = ['', 'Organic', 'Mailer', 'Facebook/Funnel', 'SMS Magic', 'Referral', 'House Pull', 'Ferrari/Porsche', 'Apple', 'T&E', 'Website', 'Avocado', 'B-Loans', 'Online App', 'Other'];
const INDUSTRIES_LIST = ['', 'Construction', 'Medical', 'Restaurant', 'Trucking', 'Auto Repair', 'Landscaping', 'Plumbing', 'HVAC', 'Dental', 'Insurance', 'Real Estate', 'Retail', 'Transportation', 'Other'];
const MA_POSITIONS = ['', 'N/A', 'State 1', 'State 2', 'State 3', 'State 4', 'State 5'];

const COLS = [
  { key: 'company', label: 'Company', type: 'text', w: 'w-40' },
  { key: 'lender', label: 'Lender', type: 'select', opts: LENDERS, w: 'w-32' },
  { key: 'lead_source', label: 'Lead Source', type: 'select', opts: LEAD_SOURCES, w: 'w-32' },
  { key: 'funding', label: 'Funding', type: 'money', w: 'w-28' },
  { key: 'payback', label: 'Payback', type: 'money', w: 'w-28' },
  { key: 'payment', label: 'Payment', type: 'money', w: 'w-28' },
  { key: 'term', label: 'Term', type: 'number', w: 'w-20' },
  { key: 'buy_rate', label: 'Buy Rate', type: 'rate', w: 'w-22' },
  { key: 'sell_rate', label: 'Sell Rate', type: 'rate', w: 'w-22' },
  { key: 'points', label: 'Points', type: 'rate', w: 'w-20' },
  { key: 'fees', label: 'Fees', type: 'money', w: 'w-24' },
  { key: 'total_rev', label: 'Total Rev', type: 'computed', w: 'w-28' },
  { key: 'total_payout', label: 'Total Payout', type: 'computed', w: 'w-28' },
  { key: 'payout_pct', label: 'Payout %', type: 'computed', w: 'w-22' },
  { key: 'ma_position', label: 'MA Position', type: 'select', opts: MA_POSITIONS, w: 'w-28' },
  { key: 'fifty_paid', label: '50% Paid In', type: 'select', opts: ['', 'Yes', 'No'], w: 'w-24' },
  { key: 'new_deal', label: 'New Deal', type: 'select', opts: ['', 'Yes', 'No'], w: 'w-24' },
  { key: 'industry', label: 'Industry', type: 'select', opts: INDUSTRIES_LIST, w: 'w-28' },
  { key: 'notes', label: 'Notes', type: 'text', w: 'w-48' },
];

function calcRow(r) {
  const f = parseFloat(r.funding) || 0;
  const buy = parseFloat(r.buy_rate) || 0;
  const sell = parseFloat(r.sell_rate) || 0;
  const pts = parseFloat(r.points) || 0;
  const fees = parseFloat(r.fees) || 0;
  const lenderGross = f * (sell - buy);
  const pointsRev = f * (pts / 100);
  const totalRev = lenderGross + pointsRev - fees;
  const payoutPct = 0.10;
  const totalPayout = totalRev * payoutPct;
  return {
    total_rev: Math.round(totalRev * 100) / 100,
    total_payout: Math.round(totalPayout * 100) / 100,
    payout_pct: `${(payoutPct * 100).toFixed(0)}%`,
  };
}

function fmt(v) {
  if (v === undefined || v === null || v === '') return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const emptyRow = () => COLS.reduce((o, c) => { if (c.type !== 'computed') o[c.key] = ''; return o; }, {});

export default function FundingBook() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [addMode, setAddMode] = useState(false);
  const [newRow, setNewRow] = useState(emptyRow());
  const isAdmin = user?.role === 'admin';

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/funding-book`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(d => setRows(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const addEntry = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/funding-book`, { method: 'POST', headers, body: JSON.stringify(newRow) });
      const entry = await res.json();
      if (res.ok) { setRows(prev => [entry, ...prev]); setNewRow(emptyRow()); setAddMode(false); }
    } catch {}
    setSaving(false);
  };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/funding-book/${id}`, { method: 'PATCH', headers, body: JSON.stringify(editData) });
      if (res.ok) {
        const updated = await res.json();
        setRows(prev => prev.map(r => r.id === id ? updated : r));
        setEditId(null);
      }
    } catch {}
    setSaving(false);
  };

  const deleteEntry = async (id) => {
    try {
      const res = await fetch(`${API}/funding-book/${id}`, { method: 'DELETE', headers });
      if (res.ok) setRows(prev => prev.filter(r => r.id !== id));
    } catch {}
  };

  const exportCSV = () => {
    const keys = COLS.map(c => c.key);
    const hdr = COLS.map(c => c.label);
    const csvRows = rows.map(r => {
      const computed = calcRow(r);
      return keys.map(k => {
        const v = computed[k] !== undefined ? computed[k] : (r[k] ?? '');
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(',');
    });
    const blob = new Blob([[hdr.join(','), ...csvRows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `funding-book-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  const renderCell = (row, col, isEditing, data, setData) => {
    const computed = calcRow(isEditing ? data : row);
    if (col.type === 'computed') {
      const v = computed[col.key];
      return <span className="text-gray-700 text-xs font-medium">{col.key === 'payout_pct' ? v : fmt(v)}</span>;
    }
    if (!isEditing) {
      const v = row[col.key];
      if (col.type === 'money') return <span className="text-gray-700 text-xs">{fmt(v)}</span>;
      if (col.type === 'rate') return <span className="text-gray-700 text-xs">{v || '—'}</span>;
      return <span className="text-gray-700 text-xs">{v || '—'}</span>;
    }
    if (col.type === 'select') {
      return <select value={data[col.key] || ''} onChange={e => setData({ ...data, [col.key]: e.target.value })}
        className="w-full px-1.5 py-1 bg-white border border-gray-200 rounded text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-400">
        {col.opts.map(o => <option key={o} value={o}>{o || '—'}</option>)}
      </select>;
    }
    return <input value={data[col.key] || ''} onChange={e => setData({ ...data, [col.key]: e.target.value })}
      type={col.type === 'money' || col.type === 'number' || col.type === 'rate' ? 'number' : 'text'} step="any"
      className="w-full px-1.5 py-1 bg-white border border-gray-200 rounded text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-400" />;
  };

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading funding book...</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center"><BookOpen size={16} className="text-white" /></div>
          <div>
            <h1 className="text-gray-900 font-semibold text-sm">Funding Book</h1>
            <p className="text-gray-400 text-xs">{rows.length} deal{rows.length !== 1 ? 's' : ''}{isAdmin ? ' · All reps' : ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setAddMode(true); setNewRow(emptyRow()); }}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5">
            <Plus size={12} /> Add Deal
          </button>
          {rows.length > 0 && (
            <button onClick={exportCSV} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg flex items-center gap-1.5">
              <Download size={12} /> Export
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-max min-w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-200">
              {isAdmin && <th className="px-3 py-2.5 text-left text-gray-400 font-medium w-28">Rep</th>}
              {COLS.map(c => <th key={c.key} className={`px-3 py-2.5 text-left text-gray-400 font-medium ${c.w}`}>{c.label}</th>)}
              <th className="px-3 py-2.5 text-gray-400 font-medium w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {addMode && (
              <tr className="bg-emerald-50/30">
                {isAdmin && <td className="px-3 py-2 text-xs text-gray-500">{user?.name}</td>}
                {COLS.map(c => <td key={c.key} className="px-3 py-1.5">{renderCell(newRow, c, true, newRow, setNewRow)}</td>)}
                <td className="px-3 py-1.5">
                  <div className="flex gap-1">
                    <button onClick={addEntry} disabled={saving} className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"><Check size={12} /></button>
                    <button onClick={() => setAddMode(false)} className="p-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"><X size={12} /></button>
                  </div>
                </td>
              </tr>
            )}
            {rows.map(r => {
              const isEditing = editId === r.id;
              return (
                <tr key={r.id} className={`hover:bg-gray-50/50 ${isEditing ? 'bg-blue-50/30' : ''}`}>
                  {isAdmin && <td className="px-3 py-2 text-xs text-gray-500">{r.rep_name}</td>}
                  {COLS.map(c => (
                    <td key={c.key} className="px-3 py-1.5">
                      {renderCell(r, c, isEditing, editData, setEditData)}
                    </td>
                  ))}
                  <td className="px-3 py-1.5">
                    <div className="flex gap-1">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(r.id)} disabled={saving} className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"><Check size={12} /></button>
                          <button onClick={() => setEditId(null)} className="p-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"><X size={12} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditId(r.id); setEditData({ ...r }); }} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"><Edit3 size={12} /></button>
                          <button onClick={() => deleteEntry(r.id)} className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && !addMode && (
          <div className="text-center py-20 text-gray-300">
            <BookOpen size={32} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm">No deals yet. Click "Add Deal" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
