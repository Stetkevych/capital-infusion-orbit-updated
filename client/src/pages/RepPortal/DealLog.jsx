import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CLIENTS, getClientsByRep } from '../../data/mockData';
import StatusBadge from '../../components/shared/StatusBadge';
import { Plus, X, CheckCircle2, AlertCircle, TrendingUp, DollarSign, ChevronDown, Edit2 } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

const LENDERS = [
  'Libertas', 'Kapitus', 'Greenbox Capital', 'Credibly', 'Fora Financial',
  'Rapid Finance', 'National Funding', 'Fundbox', 'BlueVine', 'OnDeck',
  'Merchant Growth', 'Expansion Capital', 'Other'
];

const STAGES = ['Submitted', 'Under Review', 'Approved', 'Funded', 'Declined', 'Withdrawn'];

const INDUSTRIES = [
  'Automotive', 'Construction', 'Education', 'Food & Beverage', 'Healthcare',
  'Hospitality', 'Manufacturing', 'Retail', 'Services', 'Technology', 'Transportation', 'Other'
];

const POSITIONS = ['1st', '2nd', '3rd'];

const EMPTY_FORM = {
  client_name: '', client_id: '', lender_name: '', stage: 'Submitted',
  requested_amount: '', approved_amount: '', funded_amount: '',
  factor_rate: '', payback_amount: '', industry: '', state: '',
  position: '1st', submitted_date: new Date().toISOString().split('T')[0],
  approved_date: '', funded_date: '', notes: '',
};

function fmt$(n) {
  if (!n && n !== 0) return '—';
  return `$${Number(n).toLocaleString()}`;
}

function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";
const selectCls = `${inputCls} appearance-none`;

export default function DealLog() {
  const { user, token } = useAuth();
  const [deals, setDeals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editStage, setEditStage] = useState('');

  const isAdmin = user?.role === 'admin';
  const myClients = isAdmin ? CLIENTS : getClientsByRep(user?.repId);

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  useEffect(() => { fetchDeals(); }, []);

  const fetchDeals = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${API}/deals`, { headers });
      if (res.ok) setDeals(await res.json());
    } catch { /* server offline */ }
    finally { setFetching(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-calculate payback when factor rate + funded amount change
  const handleAmountChange = (k, v) => {
    const updated = { ...form, [k]: v };
    if (updated.funded_amount && updated.factor_rate) {
      updated.payback_amount = (parseFloat(updated.funded_amount) * parseFloat(updated.factor_rate)).toFixed(0);
    }
    setForm(updated);
  };

  const handleClientSelect = (clientId) => {
    const client = myClients.find(c => c.id === clientId);
    setForm(f => ({
      ...f,
      client_id: clientId,
      client_name: client?.businessName || '',
      industry: client?.industry || f.industry,
      state: client?.state || f.state,
      requested_amount: client?.requestedAmount || f.requested_amount,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client_name || !form.lender_name) { setError('Client name and lender are required'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/deals`, { method: 'POST', headers, body: JSON.stringify(form) });
      if (res.ok) {
        const deal = await res.json();
        setDeals(prev => [deal, ...prev]);
        setSuccess(`Deal logged — ${form.client_name} with ${form.lender_name}`);
        setShowForm(false);
        setForm(EMPTY_FORM);
      } else {
        // Offline fallback — add locally
        const localDeal = { deal_id: `local_${Date.now()}`, ...form, rep_id: user?.repId, rep_name: user?.name, created_at: new Date().toISOString() };
        setDeals(prev => [localDeal, ...prev]);
        setSuccess(`Deal logged locally — ${form.client_name} with ${form.lender_name}`);
        setShowForm(false);
        setForm(EMPTY_FORM);
      }
    } catch {
      const localDeal = { deal_id: `local_${Date.now()}`, ...form, rep_id: user?.repId, rep_name: user?.name, created_at: new Date().toISOString() };
      setDeals(prev => [localDeal, ...prev]);
      setSuccess(`Deal logged — ${form.client_name} with ${form.lender_name}`);
      setShowForm(false);
      setForm(EMPTY_FORM);
    } finally { setLoading(false); }
  };

  const updateStage = async (dealId, stage) => {
    try {
      const res = await fetch(`${API}/deals/${dealId}`, { method: 'PATCH', headers, body: JSON.stringify({ stage, status: stage.toLowerCase() }) });
      if (res.ok) {
        const updated = await res.json();
        setDeals(prev => prev.map(d => d.deal_id === dealId ? updated : d));
      } else {
        setDeals(prev => prev.map(d => d.deal_id === dealId ? { ...d, stage, status: stage.toLowerCase() } : d));
      }
    } catch {
      setDeals(prev => prev.map(d => d.deal_id === dealId ? { ...d, stage, status: stage.toLowerCase() } : d));
    }
    setEditingId(null);
  };

  const funded = deals.filter(d => d.stage === 'Funded');
  const totalFunded = funded.reduce((s, d) => s + (parseFloat(d.funded_amount) || 0), 0);
  const pipeline = deals.filter(d => ['Submitted', 'Under Review', 'Approved'].includes(d.stage));

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
            <TrendingUp size={22} className="text-blue-600" /> Deal Log
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Track submissions, approvals, and funded deals</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setSuccess(''); setError(''); }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm font-medium"
        >
          <Plus size={15} /> Log Deal
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Deals', value: deals.length, color: 'text-gray-900' },
          { label: 'Funded', value: funded.length, color: 'text-green-600' },
          { label: 'Total Funded', value: totalFunded >= 1000 ? `$${(totalFunded/1000).toFixed(0)}K` : `$${totalFunded}`, color: 'text-blue-600' },
          { label: 'Active Pipeline', value: pipeline.length, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">{s.label}</p>
            <p className={`text-2xl font-bold tracking-tight ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Success */}
      {success && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <CheckCircle2 size={16} className="text-green-600 shrink-0" />
          <p className="text-green-700 text-sm font-medium">{success}</p>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-400"><X size={14} /></button>
        </div>
      )}

      {/* Deal Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <h2 className="text-gray-900 font-semibold text-sm">New Deal Entry</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={16} /></button>
          </div>

          {error && (
            <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Row 1 — Client + Lender */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Client" required>
                <select value={form.client_id} onChange={e => handleClientSelect(e.target.value)} className={selectCls}>
                  <option value="">Select existing client or type below...</option>
                  {myClients.map(c => <option key={c.id} value={c.id}>{c.businessName}</option>)}
                </select>
              </Field>
              <Field label="Business Name" required>
                <input value={form.client_name} onChange={e => set('client_name', e.target.value)} className={inputCls} placeholder="e.g. Smith Auto Repair" required />
              </Field>
            </div>

            {/* Row 2 — Lender + Stage */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Lender" required>
                <select value={form.lender_name} onChange={e => set('lender_name', e.target.value)} className={selectCls} required>
                  <option value="">Select lender...</option>
                  {LENDERS.map(l => <option key={l}>{l}</option>)}
                </select>
              </Field>
              <Field label="Stage">
                <select value={form.stage} onChange={e => set('stage', e.target.value)} className={selectCls}>
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            {/* Row 3 — Amounts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Requested Amount">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={form.requested_amount} onChange={e => set('requested_amount', e.target.value)} className={`${inputCls} pl-7`} placeholder="75000" />
                </div>
              </Field>
              <Field label="Approved Amount">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={form.approved_amount} onChange={e => set('approved_amount', e.target.value)} className={`${inputCls} pl-7`} placeholder="65000" />
                </div>
              </Field>
              <Field label="Funded Amount">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={form.funded_amount} onChange={e => handleAmountChange('funded_amount', e.target.value)} className={`${inputCls} pl-7`} placeholder="60000" />
                </div>
              </Field>
            </div>

            {/* Row 4 — Factor + Payback + Position */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Factor Rate">
                <input type="number" step="0.01" value={form.factor_rate} onChange={e => handleAmountChange('factor_rate', e.target.value)} className={inputCls} placeholder="1.35" />
              </Field>
              <Field label="Payback Amount">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={form.payback_amount} onChange={e => set('payback_amount', e.target.value)} className={`${inputCls} pl-7`} placeholder="Auto-calculated" />
                </div>
              </Field>
              <Field label="Position">
                <select value={form.position} onChange={e => set('position', e.target.value)} className={selectCls}>
                  {POSITIONS.map(p => <option key={p}>{p}</option>)}
                </select>
              </Field>
            </div>

            {/* Row 5 — Industry + State + Dates */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Field label="Industry">
                <select value={form.industry} onChange={e => set('industry', e.target.value)} className={selectCls}>
                  <option value="">Select...</option>
                  {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="State">
                <input value={form.state} onChange={e => set('state', e.target.value)} className={inputCls} placeholder="NY" maxLength={2} />
              </Field>
              <Field label="Submitted Date">
                <input type="date" value={form.submitted_date} onChange={e => set('submitted_date', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Funded Date">
                <input type="date" value={form.funded_date} onChange={e => set('funded_date', e.target.value)} className={inputCls} />
              </Field>
            </div>

            {/* Notes */}
            <Field label="Notes">
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Any additional notes about this deal..." />
            </Field>

            {/* Factor rate helper */}
            {form.funded_amount && form.factor_rate && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                <DollarSign size={14} className="text-blue-500" />
                <p className="text-blue-700 text-xs">
                  Payback: <strong>${(parseFloat(form.funded_amount) * parseFloat(form.factor_rate)).toLocaleString()}</strong>
                  {' '}· Net cost: <strong>${((parseFloat(form.funded_amount) * parseFloat(form.factor_rate)) - parseFloat(form.funded_amount)).toLocaleString()}</strong>
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <p className="text-gray-400 text-xs">Deal will be logged to S3 and appear in Analytics</p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 text-sm hover:text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded-xl transition-colors font-medium shadow-sm">
                  {loading ? 'Saving...' : 'Log Deal'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Deals table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50">
          <h2 className="text-gray-900 font-semibold text-sm">All Deals ({deals.length})</h2>
        </div>
        {fetching ? (
          <div className="p-8 text-center text-gray-300 text-sm">Loading deals...</div>
        ) : deals.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp size={28} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm font-medium">No deals logged yet</p>
            <p className="text-gray-300 text-xs mt-1">Click "Log Deal" to start tracking your pipeline</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  {['Client', 'Lender', 'Requested', 'Funded', 'Factor', 'Position', 'Stage', 'Submitted', ''].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deals.map(d => (
                  <tr key={d.deal_id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="text-gray-900 font-medium">{d.client_name}</p>
                      {d.industry && <p className="text-gray-400 text-xs">{d.industry} · {d.state}</p>}
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 font-medium">{d.lender_name}</td>
                    <td className="py-3.5 px-4 text-gray-600">{fmt$(d.requested_amount)}</td>
                    <td className="py-3.5 px-4 text-gray-900 font-semibold">{d.funded_amount ? fmt$(d.funded_amount) : '—'}</td>
                    <td className="py-3.5 px-4 text-gray-600">{d.factor_rate ? `${d.factor_rate}x` : '—'}</td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-medium">{d.position || '1st'}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {editingId === d.deal_id ? (
                        <select
                          value={editStage}
                          onChange={e => { setEditStage(e.target.value); updateStage(d.deal_id, e.target.value); }}
                          className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          autoFocus
                          onBlur={() => setEditingId(null)}
                        >
                          {STAGES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={d.stage} size="xs" />
                          <button onClick={() => { setEditingId(d.deal_id); setEditStage(d.stage); }} className="p-1 hover:bg-gray-100 rounded text-gray-300 hover:text-gray-500 transition-colors">
                            <Edit2 size={11} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-400 text-xs">{d.submitted_date}</td>
                    <td className="py-3.5 px-4 text-right">
                      {isAdmin && <span className="text-gray-300 text-xs">{d.rep_name}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
