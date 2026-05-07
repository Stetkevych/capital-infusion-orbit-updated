import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Briefcase, Plus, Save, AlertCircle, CheckCircle2, Trash2, DollarSign, Clock, TrendingUp, Info } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';
const STORAGE_KEY = 'orbit_portfolio';

const FREQUENCIES = ['Daily', 'Weekly', 'Bi-Weekly', 'Monthly'];

function calcPaidPercent(position) {
  if (!position.totalPayback || !position.paymentAmount || !position.frequency || !position.startDate) return 0;
  const start = new Date(position.startDate).getTime();
  const now = Date.now();
  const daysSinceStart = (now - start) / (1000 * 60 * 60 * 24);
  const freqDays = { Daily: 1, Weekly: 7, 'Bi-Weekly': 14, Monthly: 30 };
  const paymentsMade = Math.floor(daysSinceStart / (freqDays[position.frequency] || 30));
  const totalPaid = paymentsMade * Number(position.paymentAmount);
  return Math.min(100, (totalPaid / Number(position.totalPayback)) * 100);
}

export default function Portfolio() {
  const { token, user } = useAuth();
  const [clients, setClients] = useState([]);
  const [positions, setPositions] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API}/clients-api`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setClients(Array.isArray(data) ? data : data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const savePositions = (updated) => {
    setPositions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addPosition = (clientId) => {
    const updated = { ...positions };
    if (!updated[clientId]) updated[clientId] = [];
    updated[clientId].push({ id: Date.now(), lender: '', fundingAmount: '', totalPayback: '', paymentAmount: '', frequency: '', startDate: '', notes: '' });
    savePositions(updated);
  };

  const updatePosition = (clientId, posId, field, value) => {
    const updated = { ...positions };
    const idx = updated[clientId]?.findIndex(p => p.id === posId);
    if (idx >= 0) { updated[clientId][idx][field] = value; savePositions(updated); }
  };

  const removePosition = (clientId, posId) => {
    const updated = { ...positions };
    updated[clientId] = updated[clientId].filter(p => p.id !== posId);
    if (!updated[clientId].length) delete updated[clientId];
    savePositions(updated);
  };

  // 50% paid-in alerts
  const alerts = [];
  Object.entries(positions).forEach(([clientId, pos]) => {
    pos.forEach(p => {
      const pct = calcPaidPercent(p);
      if (pct >= 50) {
        const client = clients.find(c => c.id === clientId);
        alerts.push({ client, position: p, pct: Math.round(pct) });
      }
    });
  });

  const totalPositions = Object.values(positions).flat().length;
  const totalFunding = Object.values(positions).flat().reduce((s, p) => s + (Number(p.fundingAmount) || 0), 0);
  const totalPayback = Object.values(positions).flat().reduce((s, p) => s + (Number(p.totalPayback) || 0), 0);

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Briefcase size={22} className="text-blue-600" /> Portfolio
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Track positions, lenders, and payment progress for your clients</p>
        </div>
        {saved && <span className="text-green-600 text-xs flex items-center gap-1"><CheckCircle2 size={12} /> Saved</span>}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-blue-600">{Object.keys(positions).length}</p>
          <p className="text-xs text-gray-500">Clients with Positions</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-purple-600">{totalPositions}</p>
          <p className="text-xs text-gray-500">Total Positions</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-green-600">${totalFunding.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Total Funding</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-amber-600">${totalPayback.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Total Payback</p>
        </div>
      </div>

      {/* 50% Paid-In Alerts */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2"><AlertCircle size={14} /> 50% Paid-In Alerts</h2>
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-xl px-4 py-2 border border-amber-100">
                <span className="text-sm text-gray-900 font-medium">{a.client?.businessName || a.client?.ownerName || 'Unknown'}</span>
                <span className="text-xs text-gray-500">{a.position.lender}</span>
                <span className="text-xs font-bold text-amber-700">{a.pct}% paid</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Client selector */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <select value={selectedClient || ''} onChange={e => setSelectedClient(e.target.value || null)}
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">Select a client to manage positions...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.businessName || c.ownerName} {c.email ? `(${c.email})` : ''}</option>)}
          </select>
          {selectedClient && (
            <button onClick={() => addPosition(selectedClient)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl">
              <Plus size={14} /> Add Position
            </button>
          )}
        </div>

        {selectedClient && (positions[selectedClient] || []).length > 0 && (
          <div className="space-y-3">
            {positions[selectedClient].map(p => {
              const pct = calcPaidPercent(p);
              return (
                <div key={p.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Lender</label>
                      <input className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={p.lender} onChange={e => updatePosition(selectedClient, p.id, 'lender', e.target.value)} placeholder="Lender name" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Funding Amount</label>
                      <input className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" type="number" value={p.fundingAmount} onChange={e => updatePosition(selectedClient, p.id, 'fundingAmount', e.target.value)} placeholder="$" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Total Payback</label>
                      <input className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" type="number" value={p.totalPayback} onChange={e => updatePosition(selectedClient, p.id, 'totalPayback', e.target.value)} placeholder="$" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Payment Amount</label>
                      <input className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" type="number" value={p.paymentAmount} onChange={e => updatePosition(selectedClient, p.id, 'paymentAmount', e.target.value)} placeholder="$" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Frequency</label>
                      <select className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={p.frequency} onChange={e => updatePosition(selectedClient, p.id, 'frequency', e.target.value)}>
                        <option value="">Select</option>{FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                      <input className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" type="date" value={p.startDate} onChange={e => updatePosition(selectedClient, p.id, 'startDate', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Notes</label>
                      <input className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" value={p.notes} onChange={e => updatePosition(selectedClient, p.id, 'notes', e.target.value)} placeholder="Optional" />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Paid</label>
                        <div className="h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                          <div style={{ width: `${pct}%` }} className={`h-full rounded-lg transition-all ${pct >= 50 ? 'bg-amber-400' : 'bg-blue-400'}`} />
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">{Math.round(pct)}%</span>
                        </div>
                      </div>
                      <button onClick={() => removePosition(selectedClient, p.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedClient && !(positions[selectedClient] || []).length && (
          <p className="text-center text-gray-300 text-sm py-6">No positions yet. Click "Add Position" to start tracking.</p>
        )}
      </div>

      {/* All positions overview */}
      {totalPositions > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-900">All Active Positions</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                {['Client', 'Lender', 'Funding', 'Payback', 'Payment', 'Freq', 'Paid %'].map(h => <th key={h} className="text-left py-2.5 px-4 text-gray-400 text-xs font-medium uppercase">{h}</th>)}
              </tr></thead>
              <tbody>
                {Object.entries(positions).flatMap(([clientId, pos]) => pos.map(p => {
                  const client = clients.find(c => c.id === clientId);
                  const pct = Math.round(calcPaidPercent(p));
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2 px-4 text-gray-900 font-medium">{client?.businessName || client?.ownerName || '—'}</td>
                      <td className="py-2 px-4 text-gray-700">{p.lender || '—'}</td>
                      <td className="py-2 px-4 text-gray-700">{p.fundingAmount ? `$${Number(p.fundingAmount).toLocaleString()}` : '—'}</td>
                      <td className="py-2 px-4 text-gray-700">{p.totalPayback ? `$${Number(p.totalPayback).toLocaleString()}` : '—'}</td>
                      <td className="py-2 px-4 text-gray-700">{p.paymentAmount ? `$${Number(p.paymentAmount).toLocaleString()}` : '—'}</td>
                      <td className="py-2 px-4 text-gray-500 text-xs">{p.frequency || '—'}</td>
                      <td className="py-2 px-4"><span className={`text-xs font-bold ${pct >= 50 ? 'text-amber-600' : 'text-blue-600'}`}>{pct}%</span></td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><Info size={12} /> Portfolio Features</h3>
        <ul className="text-xs text-gray-500 space-y-1 columns-2">
          <li>• Track multiple positions per client</li>
          <li>• Lender name, funding amount, payback</li>
          <li>• Payment amount & frequency tracking</li>
          <li>• Auto-calculated paid-in percentage</li>
          <li>• 50% paid-in alerts (renewal ready)</li>
          <li>• Start date tracking per position</li>
          <li>• Notes field for each position</li>
          <li>• All positions overview table</li>
          <li>• Summary cards (total funding, payback)</li>
          <li>• Data persists in browser (per rep)</li>
        </ul>
      </div>
    </div>
  );
}
