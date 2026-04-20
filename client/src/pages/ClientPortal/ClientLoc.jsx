import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CreditCard, ArrowUpRight, DollarSign, TrendingUp, ChevronDown, CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

const fmt$ = n => n != null ? `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
const fd = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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

export default function ClientLoc() {
  const { token, user } = useAuth();
  const [acct, setAcct] = useState(null);
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDraw, setShowDraw] = useState(false);
  const [drawAmount, setDrawAmount] = useState('');
  const [drawReason, setDrawReason] = useState('');
  const [drawLoading, setDrawLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const acctRes = await fetch(`${API}/loc-v2/accounts`, { headers });
      const accts = await acctRes.json();
      if (Array.isArray(accts) && accts.length > 0) {
        const detail = await (await fetch(`${API}/loc-v2/accounts/${accts[0].id}`, { headers })).json();
        setAcct(detail);
        const drawRes = await fetch(`${API}/loc-v2/draws?locAccountId=${accts[0].id}`, { headers });
        const drs = await drawRes.json();
        setDraws(Array.isArray(drs) ? drs : []);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [token]);

  const submitDraw = async () => {
    if (!drawAmount || !acct) return;
    setDrawLoading(true);
    try {
      const res = await fetch(`${API}/loc-v2/draw-request`, {
        method: 'POST', headers,
        body: JSON.stringify({ locAccountId: acct.id, amount: parseFloat(drawAmount), reason: drawReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', msg: `Draw request for ${fmt$(drawAmount)} submitted` });
        setShowDraw(false);
        setDrawAmount('');
        setDrawReason('');
        fetchData();
      } else {
        setNotification({ type: 'error', msg: data.error || 'Request failed' });
      }
    } catch { setNotification({ type: 'error', msg: 'Request failed' }); }
    finally { setDrawLoading(false); setTimeout(() => setNotification(null), 5000); }
  };

  // Real-time payback preview
  const drawNum = parseFloat(drawAmount) || 0;
  const factorRate = acct?.factorRate || 1.35;
  const payback = drawNum * factorRate;
  const cost = payback - drawNum;
  const termDays = acct?.paymentTermDays || 30;
  const dueDate = new Date(Date.now() + termDays * 24 * 60 * 60 * 1000);

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading...</div>;
  if (!acct) return <div className="p-6 text-gray-400 text-sm">No line of credit on file.</div>;

  const balance = acct.balance || 0;
  const availability = acct.availability || 0;
  const creditLimit = acct.creditLimit || 0;
  const usagePercent = creditLimit > 0 ? ((balance / creditLimit) * 100).toFixed(1) : 0;

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg border ${notification.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {notification.type === 'success' ? <CheckCircle2 size={16} className="text-green-600" /> : <AlertCircle size={16} className="text-red-500" />}
          <p className={`text-sm font-medium ${notification.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>{notification.msg}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <CreditCard size={18} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Line of Credit</h1>
          <p className="text-gray-400 text-xs">Capital Infusion</p>
        </div>
      </div>

      {/* 3 Key Numbers */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Available</p>
            <p className="text-2xl font-bold text-green-600 tracking-tight">{fmt$(availability)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Balance</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{fmt$(balance)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Credit Limit</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{fmt$(creditLimit)}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div className="h-2 rounded-full bg-blue-600 transition-all duration-700" style={{ width: `${Math.min(usagePercent, 100)}%` }} />
          </div>
          <p className="text-center text-slate-400 text-xs mt-2">{usagePercent}% utilized</p>
        </div>
      </div>

      {/* Next Payment */}
      {acct.nextPayment && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock size={16} className="text-amber-500" />
            <div>
              <p className="text-gray-400 text-xs">Next Payment Due</p>
              <p className="text-gray-900 text-lg font-bold">{fmt$(acct.nextPayment.amount)}</p>
            </div>
          </div>
          <p className="text-gray-500 text-sm">{fd(acct.nextPayment.date)}</p>
        </div>
      )}

      {/* Draw Funds Button */}
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

      {/* Draw History */}
      <Expandable title="Draw History" icon={TrendingUp} defaultOpen>
        {draws.length === 0 ? (
          <p className="px-5 py-4 text-gray-400 text-sm">No draws yet</p>
        ) : draws.map(d => (
          <div key={d.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
              <p className="text-gray-500 text-xs w-20">{fd(d.requestedAt)}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                d.status === 'funded' ? 'bg-green-50 text-green-600 border-green-200' :
                d.status === 'pending_approval' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                d.status === 'denied' ? 'bg-red-50 text-red-500 border-red-200' :
                'bg-gray-50 text-gray-500 border-gray-200'
              }`}>
                {d.status === 'funded' ? 'Funded' : d.status === 'pending_approval' ? 'Pending' : d.status === 'denied' ? 'Denied' : d.status}
              </span>
            </div>
            <div className="text-right">
              <p className="text-gray-900 text-sm font-bold">{fmt$(d.amount)}</p>
              {d.paybackAmount && <p className="text-gray-400 text-xs">Payback: {fmt$(d.paybackAmount)}</p>}
            </div>
          </div>
        ))}
      </Expandable>

      {/* Payment History */}
      <Expandable title="Payment History" icon={DollarSign}>
        {(acct.payments || []).length === 0 ? (
          <p className="px-5 py-4 text-gray-400 text-sm">No payments yet</p>
        ) : acct.payments.slice().reverse().map(p => (
          <div key={p.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
            <p className="text-gray-500 text-xs">{fd(p.date)}</p>
            <p className="text-green-600 text-sm font-bold">-{fmt$(p.amount)}</p>
          </div>
        ))}
      </Expandable>

      {/* Draw Request Modal */}
      {showDraw && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6">
            <h2 className="text-gray-900 font-semibold text-base mb-4 flex items-center gap-2">
              <ArrowUpRight size={16} className="text-blue-600" /> Request Draw
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Draw Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={drawAmount} onChange={e => setDrawAmount(e.target.value)} max={availability}
                    placeholder="0.00" className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-lg font-bold rounded-xl pl-7 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <p className="text-gray-400 text-xs mt-1">Available: {fmt$(availability)}</p>
              </div>

              {/* Real-time payback preview */}
              {drawNum > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Draw Amount</span>
                    <span className="text-blue-900 font-semibold">{fmt$(drawNum)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Factor Rate</span>
                    <span className="text-blue-900 font-semibold">{factorRate}x</span>
                  </div>
                  <div className="border-t border-blue-200 my-1" />
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700 font-semibold">Total Repayment</span>
                    <span className="text-blue-900 font-bold text-base">{fmt$(payback)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Cost of Capital</span>
                    <span className="text-blue-900 font-semibold">{fmt$(cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Payment Due</span>
                    <span className="text-blue-900 font-semibold">{fd(dueDate.toISOString())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">New Available After Draw</span>
                    <span className="text-blue-900 font-semibold">{fmt$(Math.max(0, availability - drawNum))}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Reason (optional)</label>
                <input value={drawReason} onChange={e => setDrawReason(e.target.value)}
                  placeholder="Working capital, inventory, etc." className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>

              {drawNum > availability && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <p className="text-red-600 text-xs">Amount exceeds available credit of {fmt$(availability)}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
              <button onClick={() => { setShowDraw(false); setDrawAmount(''); setDrawReason(''); }}
                className="text-gray-500 text-sm px-4 py-2 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={submitDraw} disabled={drawLoading || !drawAmount || drawNum > availability || drawNum <= 0}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded-xl font-medium">
                {drawLoading ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
                {drawLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
