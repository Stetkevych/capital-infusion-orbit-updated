import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CreditCard, ArrowUpRight, DollarSign, TrendingUp, ChevronDown, CheckCircle2, AlertCircle, Loader2, Clock, Calendar, Percent, Hash } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';
const fmt$ = n => n != null ? `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
const fd = iso => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function Section({ title, icon: Icon, children, defaultOpen = false, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-blue-600" />
          <h2 className="text-gray-900 font-semibold text-sm">{title}</h2>
          {badge && <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-medium">{badge}</span>}
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
      const accts = await (await fetch(`${API}/loc-v2/accounts`, { headers })).json();
      if (Array.isArray(accts) && accts.length > 0) {
        const detail = await (await fetch(`${API}/loc-v2/accounts/${accts[0].id}`, { headers })).json();
        setAcct(detail);
        const drs = await (await fetch(`${API}/loc-v2/draws?locAccountId=${accts[0].id}`, { headers })).json();
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
        setNotification({ type: 'success', msg: 'Draw request submitted for approval' });
        setShowDraw(false); setDrawAmount(''); setDrawReason('');
        fetchData();
      } else setNotification({ type: 'error', msg: data.error || 'Failed' });
    } catch { setNotification({ type: 'error', msg: 'Failed' }); }
    finally { setDrawLoading(false); setTimeout(() => setNotification(null), 5000); }
  };

  // Real-time preview
  const drawNum = parseFloat(drawAmount) || 0;
  const factorRate = acct?.factorRate || 1.2;
  const termMonths = acct?.term || 12;
  const freq = acct?.paymentFrequency || 'monthly';
  const totalPayments = freq === 'weekly' ? Math.round(termMonths * 4.33) : termMonths;
  const payback = drawNum * factorRate;
  const cost = payback - drawNum;
  const installment = totalPayments > 0 ? payback / totalPayments : 0;
  // If existing balance, show reamortized preview
  const existingBalance = acct?.balance || 0;
  const combinedPayback = existingBalance + payback;
  const combinedInstallment = totalPayments > 0 ? combinedPayback / totalPayments : 0;

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading...</div>;
  if (!acct) return (
    <div className="p-6 max-w-2xl mx-auto text-center py-20">
      <CreditCard size={40} className="text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500 text-base font-medium">No line of credit on file</p>
      <p className="text-gray-400 text-sm mt-1">Contact your advisor to get started</p>
    </div>
  );

  const { balance, availability, creditLimit, usagePercent, nextPayment, installmentAmount, remainingPayments } = acct;

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg border ${notification.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {notification.type === 'success' ? <CheckCircle2 size={16} className="text-green-600" /> : <AlertCircle size={16} className="text-red-500" />}
          <p className={`text-sm font-medium ${notification.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>{notification.msg}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <CreditCard size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Line of Credit</h1>
          <p className="text-gray-400 text-xs">Capital Infusion · {freq === 'weekly' ? 'Weekly' : 'Monthly'} · {termMonths}mo term</p>
        </div>
      </div>

      {/* Hero Numbers */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Available</p>
            <p className="text-2xl font-bold text-emerald-400">{fmt$(availability)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Balance</p>
            <p className="text-2xl font-bold text-white">{fmt$(balance)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Limit</p>
            <p className="text-2xl font-bold text-white">{fmt$(creditLimit)}</p>
          </div>
        </div>
        <div className="mt-5">
          <div className="w-full bg-slate-700 rounded-full h-2.5">
            <div className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700" style={{ width: `${Math.min(usagePercent, 100)}%` }} />
          </div>
          <p className="text-center text-slate-500 text-xs mt-2">{usagePercent}% utilized</p>
        </div>
      </div>

      {/* Next Payment + Terms */}
      <div className="grid grid-cols-2 gap-3">
        {nextPayment ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-amber-500" />
              <p className="text-gray-400 text-xs uppercase tracking-wide">Next Payment</p>
            </div>
            <p className="text-gray-900 text-xl font-bold">{fmt$(nextPayment.amount)}</p>
            <p className="text-gray-400 text-xs mt-1">{fd(nextPayment.date)} · {nextPayment.remaining} remaining</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={14} className="text-green-500" />
              <p className="text-gray-400 text-xs uppercase tracking-wide">Status</p>
            </div>
            <p className="text-green-600 text-lg font-bold">No Balance</p>
            <p className="text-gray-400 text-xs mt-1">Draw funds to get started</p>
          </div>
        )}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Percent size={14} className="text-blue-500" />
            <p className="text-gray-400 text-xs uppercase tracking-wide">Terms</p>
          </div>
          <p className="text-gray-900 text-lg font-bold">{factorRate}x</p>
          <p className="text-gray-400 text-xs mt-1">{freq === 'weekly' ? 'Weekly' : 'Monthly'} · {termMonths} months</p>
        </div>
      </div>

      {/* Draw CTA */}
      {availability > 0 && (
        <button onClick={() => setShowDraw(true)} className="w-full group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-2xl p-5 text-left transition-all hover:shadow-xl hover:shadow-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-lg font-bold">Draw Funds</p>
              <p className="text-blue-200 text-sm mt-0.5">Up to {fmt$(availability)} available</p>
            </div>
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <ArrowUpRight size={20} className="text-white" />
            </div>
          </div>
        </button>
      )}

      {/* Draw History */}
      <Section title="Draws" icon={TrendingUp} defaultOpen badge={draws.filter(d => d.status === 'funded').length + ' funded'}>
        {draws.length === 0 ? (
          <p className="px-5 py-6 text-gray-400 text-sm text-center">No draws yet</p>
        ) : draws.map(d => (
          <div key={d.id} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${d.status === 'funded' ? 'bg-green-500' : d.status === 'pending_approval' ? 'bg-amber-400' : d.status === 'denied' ? 'bg-red-400' : 'bg-gray-300'}`} />
              <div>
                <p className="text-gray-900 text-sm font-semibold">{fmt$(d.amount)}</p>
                <p className="text-gray-400 text-xs">{fd(d.requestedAt)} · {d.status === 'funded' ? 'Funded' : d.status === 'pending_approval' ? 'Pending Approval' : d.status === 'denied' ? 'Denied' : d.status}</p>
              </div>
            </div>
            <div className="text-right">
              {d.paybackAmount && <p className="text-gray-500 text-xs">Payback: {fmt$(d.paybackAmount)}</p>}
              {d.installment && <p className="text-gray-400 text-xs">{fmt$(d.installment)}/{freq === 'weekly' ? 'wk' : 'mo'}</p>}
            </div>
          </div>
        ))}
      </Section>

      {/* Payment History */}
      <Section title="Payments" icon={DollarSign} badge={(acct.payments || []).length + ' made'}>
        {(acct.payments || []).length === 0 ? (
          <p className="px-5 py-6 text-gray-400 text-sm text-center">No payments yet</p>
        ) : acct.payments.slice().reverse().map(p => (
          <div key={p.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <p className="text-gray-500 text-xs">{fd(p.date)}</p>
            </div>
            <p className="text-green-600 text-sm font-bold">-{fmt$(p.amount)}</p>
          </div>
        ))}
      </Section>

      {/* Schedule Overview */}
      {balance > 0 && (
        <Section title="Payment Schedule" icon={Calendar}>
          <div className="p-5 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Installment Amount</span><span className="text-gray-900 font-bold">{fmt$(installmentAmount)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Frequency</span><span className="text-gray-900 font-semibold">{freq === 'weekly' ? 'Weekly' : 'Monthly'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Payments Remaining</span><span className="text-gray-900 font-semibold">{remainingPayments}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Total Remaining</span><span className="text-gray-900 font-bold">{fmt$(balance)}</span></div>
          </div>
        </Section>
      )}

      {/* Draw Modal */}
      {showDraw && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6">
            <h2 className="text-gray-900 font-bold text-lg mb-5 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center"><ArrowUpRight size={16} className="text-blue-600" /></div>
              Request Draw
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                  <input type="number" value={drawAmount} onChange={e => setDrawAmount(e.target.value)} max={availability}
                    placeholder="0.00" className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-2xl font-bold rounded-xl pl-9 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <p className="text-gray-400 text-xs mt-1.5">Available: {fmt$(availability)}</p>
              </div>

              {drawNum > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Draw</span>
                    <span className="text-blue-900 font-semibold">{fmt$(drawNum)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Factor Rate</span>
                    <span className="text-blue-900 font-semibold">{factorRate}x</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Total Repayment</span>
                    <span className="text-blue-900 font-bold">{fmt$(payback)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Cost of Capital</span>
                    <span className="text-blue-900">{fmt$(cost)}</span>
                  </div>
                  <div className="border-t border-blue-200 pt-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700 font-semibold">{freq === 'weekly' ? 'Weekly' : 'Monthly'} Payment</span>
                      <span className="text-blue-900 font-bold text-base">{fmt$(installment)}</span>
                    </div>
                    <p className="text-blue-600 text-xs mt-1">for {totalPayments} {freq === 'weekly' ? 'weeks' : 'months'}</p>
                  </div>
                  {existingBalance > 0 && (
                    <div className="border-t border-blue-200 pt-2.5">
                      <p className="text-indigo-700 text-xs font-semibold uppercase tracking-wide mb-1.5">Reamortized (combined with existing balance)</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-indigo-700">New Total Owed</span>
                        <span className="text-indigo-900 font-bold">{fmt$(combinedPayback)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-indigo-700">New {freq === 'weekly' ? 'Weekly' : 'Monthly'} Payment</span>
                        <span className="text-indigo-900 font-bold">{fmt$(combinedInstallment)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Reason (optional)</label>
                <input value={drawReason} onChange={e => setDrawReason(e.target.value)}
                  placeholder="Working capital, inventory, etc." className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>

              {drawNum > availability && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <p className="text-red-600 text-xs font-medium">Exceeds available credit of {fmt$(availability)}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => { setShowDraw(false); setDrawAmount(''); setDrawReason(''); }}
                className="text-gray-500 text-sm px-4 py-2.5 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={submitDraw} disabled={drawLoading || !drawAmount || drawNum > availability || drawNum <= 0}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-sm px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-500/20">
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
