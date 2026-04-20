import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { PaymentStatusBadge, DocumentLinkCard, fmt$, fmtPct } from '../../components/LocComponents';
import {
  CreditCard, DollarSign, TrendingUp, Clock, Shield, FileText,
  ChevronDown, Plus, ArrowUpRight, Building2, AlertCircle, CheckCircle2, XCircle, Loader2
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

const fd = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function Expandable({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-blue-600" />
          <h2 className="text-gray-900 font-semibold text-sm">{title}</h2>
        </div>
        <ChevronDown size={15} className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-gray-50">{children}</div>}
    </div>
  );
}

export default function CILoc() {
  const { token, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [selectedAcct, setSelectedAcct] = useState(null);
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDraw, setShowDraw] = useState(false);
  const [drawAmount, setDrawAmount] = useState('');
  const [drawReason, setDrawReason] = useState('');
  const [drawLoading, setDrawLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ clientId: '', creditLimit: '', interestRate: '', term: '12' });
  const [notification, setNotification] = useState(null);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [acctRes, drawRes] = await Promise.all([
        fetch(`${API}/loc-v2/accounts`, { headers }),
        fetch(`${API}/loc-v2/draws`, { headers }),
      ]);
      const accts = await acctRes.json();
      const drs = await drawRes.json();
      setAccounts(Array.isArray(accts) ? accts : []);
      setDraws(Array.isArray(drs) ? drs : []);
      if (Array.isArray(accts) && accts.length > 0 && !selectedAcct) {
        // Fetch first account with computed balance
        const detail = await (await fetch(`${API}/loc-v2/accounts/${accts[0].id}`, { headers })).json();
        setSelectedAcct(detail);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [token]);

  // Handle approve/deny from email link
  useEffect(() => {
    const action = searchParams.get('action');
    const drawId = searchParams.get('drawId');
    if (action && drawId && user?.role === 'admin') {
      fetch(`${API}/loc-v2/draw/${drawId}/${action}`, { method: 'POST', headers })
        .then(r => r.json())
        .then(d => {
          setNotification({ type: 'success', msg: `Draw ${action === 'approve' ? 'approved' : 'denied'}` });
          fetchData();
        })
        .catch(() => setNotification({ type: 'error', msg: `Failed to ${action} draw` }));
    }
  }, [searchParams]);

  const selectAccount = async (id) => {
    const detail = await (await fetch(`${API}/loc-v2/accounts/${id}`, { headers })).json();
    setSelectedAcct(detail);
  };

  const submitDraw = async () => {
    if (!drawAmount || !selectedAcct) return;
    setDrawLoading(true);
    try {
      const res = await fetch(`${API}/loc-v2/draw-request`, {
        method: 'POST', headers,
        body: JSON.stringify({ locAccountId: selectedAcct.id, amount: parseFloat(drawAmount), reason: drawReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', msg: `Draw request for ${fmt$(drawAmount)} submitted for approval` });
        setShowDraw(false);
        setDrawAmount('');
        setDrawReason('');
        fetchData();
      } else {
        setNotification({ type: 'error', msg: data.error || 'Draw request failed' });
      }
    } catch { setNotification({ type: 'error', msg: 'Draw request failed' }); }
    finally { setDrawLoading(false); }
  };

  const createAccount = async () => {
    try {
      const res = await fetch(`${API}/loc-v2/accounts`, {
        method: 'POST', headers,
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        setNotification({ type: 'success', msg: 'LOC account created' });
        setShowCreate(false);
        fetchData();
      }
    } catch {}
  };

  const acctDraws = selectedAcct ? draws.filter(d => d.locAccountId === selectedAcct.id) : draws;
  const pendingDraws = draws.filter(d => d.status === 'pending_approval');

  const balance = selectedAcct?.balance || 0;
  const availability = selectedAcct?.availability || 0;
  const creditLimit = selectedAcct?.creditLimit || 0;
  const usagePercent = creditLimit > 0 ? ((balance / creditLimit) * 100).toFixed(1) : 0;

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading LOC data...</div>;

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg border ${notification.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {notification.type === 'success' ? <CheckCircle2 size={16} className="text-green-600" /> : <AlertCircle size={16} className="text-red-500" />}
          <p className={`text-sm font-medium ${notification.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>{notification.msg}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <CreditCard size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Line of Credit</h1>
            <p className="text-gray-400 text-xs">Onyx Integration · Balance & Availability Tracker</p>
          </div>
        </div>
        {user?.role === 'admin' && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2.5 rounded-xl transition-colors font-medium">
            <Plus size={14} /> New LOC Account
          </button>
        )}
      </div>

      {/* Account selector */}
      {accounts.length > 1 && (
        <select value={selectedAcct?.id || ''} onChange={e => selectAccount(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          {accounts.map(a => <option key={a.id} value={a.id}>LOC {a.id.slice(-6)} — Limit: {fmt$(a.creditLimit)}</option>)}
        </select>
      )}

      {accounts.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center">
          <CreditCard size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No LOC accounts yet</p>
          {user?.role === 'admin' && <p className="text-gray-400 text-xs mt-1">Click "New LOC Account" to create one</p>}
        </div>
      ) : (
        <>
          {/* 3 Key Numbers */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Available</p>
                <p className="text-3xl font-bold text-green-600 tracking-tight">{fmt$(availability)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Balance</p>
                <p className="text-3xl font-bold text-slate-900 tracking-tight">{fmt$(balance)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Limit</p>
                <p className="text-3xl font-bold text-slate-900 tracking-tight">{fmt$(creditLimit)}</p>
              </div>
            </div>
            <div className="mt-5">
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="h-2 rounded-full bg-blue-600 transition-all duration-700" style={{ width: `${Math.min(usagePercent, 100)}%` }} />
              </div>
              <p className="text-center text-slate-400 text-xs mt-2">{usagePercent}% utilized</p>
            </div>
          </div>

          {/* Draw CTA */}
          <button onClick={() => setShowDraw(true)} className="w-full group bg-blue-600 hover:bg-blue-700 rounded-2xl p-5 text-left transition-all hover:shadow-lg hover:shadow-blue-500/15">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-lg font-bold">Draw Funds</p>
                <p className="text-blue-200 text-sm mt-0.5">Available: {fmt$(availability)}</p>
              </div>
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <ArrowUpRight size={20} className="text-white" />
              </div>
            </div>
          </button>

          {/* Pending Approvals (admin) */}
          {user?.role === 'admin' && pendingDraws.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-amber-700 font-semibold text-sm mb-3 flex items-center gap-2"><AlertCircle size={14} /> {pendingDraws.length} Pending Approval{pendingDraws.length > 1 ? 's' : ''}</p>
              {pendingDraws.map(d => (
                <div key={d.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 mb-2 last:mb-0 border border-amber-100">
                  <div>
                    <p className="text-gray-900 text-sm font-semibold">{fmt$(d.amount)}</p>
                    <p className="text-gray-400 text-xs">{d.requestedByName} · {fd(d.requestedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={async () => { await fetch(`${API}/loc-v2/draw/${d.id}/approve`, { method: 'POST', headers }); fetchData(); setNotification({ type: 'success', msg: 'Draw approved' }); }}
                      className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium">
                      <CheckCircle2 size={12} /> Approve
                    </button>
                    <button onClick={async () => { await fetch(`${API}/loc-v2/draw/${d.id}/deny`, { method: 'POST', headers }); fetchData(); setNotification({ type: 'success', msg: 'Draw denied' }); }}
                      className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium">
                      <XCircle size={12} /> Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Draws */}
          <Expandable title="Recent Draws" icon={TrendingUp} defaultOpen>
            {acctDraws.length === 0 ? (
              <p className="px-5 py-4 text-gray-400 text-sm">No draws yet</p>
            ) : acctDraws.slice(0, 10).map(d => (
              <div key={d.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <p className="text-gray-500 text-xs w-16">{fd(d.requestedAt || d.date)}</p>
                  <PaymentStatusBadge status={d.status === 'funded' ? 'accepted' : d.status === 'pending_approval' ? 'pending' : d.status} />
                </div>
                <div className="text-right">
                  <p className="text-gray-900 text-sm font-bold">{fmt$(d.amount)}</p>
                  <p className="text-gray-300 text-xs">{d.requestedByName || ''}</p>
                </div>
              </div>
            ))}
          </Expandable>

          {/* Payments */}
          <Expandable title="Payment History" icon={DollarSign}>
            {(selectedAcct?.payments || []).length === 0 ? (
              <p className="px-5 py-4 text-gray-400 text-sm">No payments recorded</p>
            ) : selectedAcct.payments.slice().reverse().map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
                <p className="text-gray-500 text-xs">{fd(p.date)}</p>
                <div className="text-right">
                  <p className="text-green-600 text-sm font-bold">-{fmt$(p.amount)}</p>
                  <p className="text-gray-300 text-xs">{p.method}</p>
                </div>
              </div>
            ))}
          </Expandable>

          {/* Line Details */}
          <Expandable title="Line Details" icon={Building2}>
            {[
              ['Credit Limit', fmt$(creditLimit)],
              ['Interest Rate', selectedAcct?.interestRate ? `${selectedAcct.interestRate}%` : '—'],
              ['Term', selectedAcct?.term ? `${selectedAcct.term} months` : '—'],
              ['Payment Frequency', selectedAcct?.paymentFrequency || '—'],
              ['Total Drawn', fmt$(selectedAcct?.totalDrawn || 0)],
              ['Total Paid', fmt$(selectedAcct?.totalPaid || 0)],
              ['Status', selectedAcct?.status || '—'],
              ['Created', selectedAcct?.createdAt ? fd(selectedAcct.createdAt) : '—'],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between px-5 py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-400 text-sm">{l}</span>
                <span className="text-gray-900 text-sm font-semibold">{v}</span>
              </div>
            ))}
          </Expandable>
        </>
      )}

      {/* Draw Request Modal */}
      {showDraw && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6">
            <h2 className="text-gray-900 font-semibold text-base mb-4 flex items-center gap-2">
              <ArrowUpRight size={16} className="text-blue-600" /> Request Draw
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={drawAmount} onChange={e => setDrawAmount(e.target.value)}
                    placeholder="10,000" className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl pl-7 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <p className="text-gray-400 text-xs mt-1">Available: {fmt$(availability)}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Reason (optional)</label>
                <input value={drawReason} onChange={e => setDrawReason(e.target.value)}
                  placeholder="Working capital, inventory, etc." className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <p className="text-amber-600 text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Draw requests require approval from chris@capital-infusion.com before funding.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
              <button onClick={() => setShowDraw(false)} className="text-gray-500 text-sm px-4 py-2 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={submitDraw} disabled={drawLoading || !drawAmount}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded-xl font-medium">
                {drawLoading ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
                {drawLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create LOC Account Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6">
            <h2 className="text-gray-900 font-semibold text-base mb-4">New LOC Account</h2>
            <div className="space-y-3">
              <input value={createForm.clientId} onChange={e => setCreateForm(f => ({ ...f, clientId: e.target.value }))}
                placeholder="Client ID" className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              <input type="number" value={createForm.creditLimit} onChange={e => setCreateForm(f => ({ ...f, creditLimit: e.target.value }))}
                placeholder="Credit Limit (e.g. 50000)" className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              <input type="number" value={createForm.interestRate} onChange={e => setCreateForm(f => ({ ...f, interestRate: e.target.value }))}
                placeholder="Interest Rate % (e.g. 8.5)" className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              <input type="number" value={createForm.term} onChange={e => setCreateForm(f => ({ ...f, term: e.target.value }))}
                placeholder="Term (months)" className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
              <button onClick={() => setShowCreate(false)} className="text-gray-500 text-sm px-4 py-2 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={createAccount} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-xl font-medium">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
