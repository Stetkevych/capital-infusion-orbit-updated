import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Table, Plus, Save, Trash2 } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

const CATEGORIES = ['Revenue Credit', 'Non-Revenue Credit', 'Debit', 'Lender Debit', 'Other'];

const EMPTY_ROW = { date: '', description: '', fromTo: '', debit: '', credit: '', assignTo: CATEGORIES[0] };

export default function UnderwritingTrainer() {
  const { token } = useAuth();
  const [rows, setRows] = useState([{ ...EMPTY_ROW, id: Date.now() }]);
  const [corrections, setCorrections] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRow = () => setRows(prev => [...prev, { ...EMPTY_ROW, id: Date.now() }]);

  const removeRow = (id) => setRows(prev => prev.filter(r => r.id !== id));

  const saveCorrections = async () => {
    const valid = rows.filter(r => r.date || r.description || r.debit || r.credit);
    if (!valid.length) return;
    setSaving(true);
    try {
      const correction = {
        id: `corr_${Date.now()}`,
        rows: valid,
        correctedBy: 'admin',
        timestamp: new Date().toISOString(),
      };
      // Save to server
      await fetch(`${API}/client-data/session`, {
        method: 'POST', headers,
        body: JSON.stringify({ correction }),
      });
      setCorrections(prev => [correction, ...prev]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {} finally { setSaving(false); }
  };

  const inputCls = "w-full bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 font-semibold text-base flex items-center gap-2">
            <Table size={18} className="text-blue-600" /> Underwriting Trainer
          </h2>
          <p className="text-gray-400 text-xs mt-0.5">Correct extracted transactions to train the OCR engine</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-green-600 text-xs font-medium">✓ Saved</span>}
          <button onClick={addRow}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={12} /> Add Row
          </button>
          <button onClick={saveCorrections} disabled={saving}
            className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors">
            <Save size={12} /> {saving ? 'Saving...' : 'Save Corrections'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {['Date', 'Description', 'From/To', 'Debit', 'Credit', 'Assign To', ''].map(h => (
                <th key={h} className="text-left py-2.5 px-3 text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-gray-50">
                <td className="py-2 px-3 w-28">
                  <input type="date" value={r.date} onChange={e => updateRow(r.id, 'date', e.target.value)} className={inputCls} />
                </td>
                <td className="py-2 px-3">
                  <input value={r.description} onChange={e => updateRow(r.id, 'description', e.target.value)} placeholder="Transaction description" className={inputCls} />
                </td>
                <td className="py-2 px-3 w-32">
                  <input value={r.fromTo} onChange={e => updateRow(r.id, 'fromTo', e.target.value)} placeholder="From/To" className={inputCls} />
                </td>
                <td className="py-2 px-3 w-24">
                  <input type="number" value={r.debit} onChange={e => updateRow(r.id, 'debit', e.target.value)} placeholder="0.00" className={inputCls} />
                </td>
                <td className="py-2 px-3 w-24">
                  <input type="number" value={r.credit} onChange={e => updateRow(r.id, 'credit', e.target.value)} placeholder="0.00" className={inputCls} />
                </td>
                <td className="py-2 px-3 w-40">
                  <select value={r.assignTo} onChange={e => updateRow(r.id, 'assignTo', e.target.value)} className={inputCls}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </td>
                <td className="py-2 px-3 w-8">
                  <button onClick={() => removeRow(r.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Correction Log */}
      {corrections.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
          <h3 className="text-gray-900 font-semibold text-sm mb-3">Correction Log</h3>
          <div className="space-y-2">
            {corrections.map(c => (
              <div key={c.id} className="bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-500 text-xs">{new Date(c.timestamp).toLocaleString()}</span>
                  <span className="text-blue-600 text-xs font-medium">{c.rows.length} correction{c.rows.length !== 1 ? 's' : ''}</span>
                </div>
                {c.rows.map((r, i) => (
                  <p key={i} className="text-gray-700 text-xs">
                    {r.date} — {r.description} — {r.assignTo} {r.debit ? `Debit: $${r.debit}` : ''} {r.credit ? `Credit: $${r.credit}` : ''}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
