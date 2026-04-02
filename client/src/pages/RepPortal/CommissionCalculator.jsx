import React, { useState } from 'react';
import { DollarSign, Calculator, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

const DEAL_TYPES = [
  { value: 'new_unit', label: 'New Unit' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'paid_off_renewal', label: 'Paid Off Renewal' },
  { value: 'deal_lost', label: 'Deal Lost' },
  { value: 'referral', label: 'Referral' },
  { value: 'sba_real_estate', label: 'SBA / Real Estate' },
  { value: 'other', label: 'Other' },
];

const PACKAGE_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'half', label: 'Half Package' },
  { value: 'full', label: 'Full Package' },
];

const REFERRAL_TYPES = [
  { value: 'employee', label: 'Employee Referral' },
  { value: 'crm', label: 'CRM Referral' },
  { value: 'referral', label: 'Referral' },
  { value: 'rusty', label: 'Rusty Referral' },
];

const LEAD_SUB_TYPES = [
  { value: '', label: 'Select...' },
  { value: 'marketing_assist', label: 'Marketing Assist (Texts, Live Transfer, SMS)' },
  { value: 'organic', label: 'Organic (Apple, T&E, Website, Avocado, B-Loans)' },
  { value: 'facebook', label: 'Facebook / Funnel FB' },
  { value: 'mailer', label: 'Mailer' },
  { value: 'sms_magic', label: 'SMS Magic Hot Lead' },
  { value: 'house', label: 'House Pulled' },
  { value: 'ferrari', label: 'Ferrari / Porsche' },
  { value: 'handoff', label: 'New Rep Handoff (Base Salary)' },
  { value: 'self_funded', label: 'New Rep Self Funded (Base Salary)' },
];

const inputCls = "w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400";
const selectCls = `${inputCls} appearance-none`;
const fmt$ = n => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = n => `${(Number(n || 0) * 100).toFixed(1)}%`;

function Field({ label, children, half }) {
  return (
    <div className={half ? '' : ''}>
      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer py-1">
      <div className={`w-9 h-5 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-gray-200'}`} onClick={() => onChange(!value)}>
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform mt-0.5 ${value ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
      </div>
      <span className="text-gray-700 text-sm">{label}</span>
    </label>
  );
}

export default function CommissionCalculator() {
  const [form, setForm] = useState({
    leadSource: '', funding: '', payback: '', payment: '', term: '',
    buyRate: '', sellRate: '', points: '', totalRev: '',
    sameRep: true, dealType: 'new_unit', packageType: 'none',
    marketingAssist: false, closerOnly: false, originalPullerPaid: false,
    hasRePuller: false, referralType: 'referral', leadSubType: '',
    renewalOriginallyOrganic: false, daysSincePaidOff: '',
    splitWithOriginalCloser: false,
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCalculate = async () => {
    setError('');
    setResult(null);
    setLoading(true);

    const payload = {
      ...form,
      funding: parseFloat(form.funding) || 0,
      payback: parseFloat(form.payback) || 0,
      payment: parseFloat(form.payment) || 0,
      term: parseInt(form.term) || 0,
      buyRate: parseFloat(form.buyRate) || 0,
      sellRate: parseFloat(form.sellRate) || 0,
      points: parseFloat(form.points) || 0,
      totalRev: parseFloat(form.totalRev) || 0,
      daysSincePaidOff: parseInt(form.daysSincePaidOff) || 0,
    };

    try {
      const res = await fetch(`${API}/commissions/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        // Fallback: calculate client-side
        setError(data.error || 'Calculation failed — check inputs');
      }
    } catch {
      setError('Server unavailable — check your connection');
    } finally {
      setLoading(false);
    }
  };

  const showReferralFields = form.dealType === 'referral';
  const showDealLostFields = form.dealType === 'deal_lost';
  const showPaidOffFields = form.dealType === 'paid_off_renewal';
  const showLeadSubType = ['new_unit', 'renewal', 'other'].includes(form.dealType) || form.marketingAssist;

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
          <Calculator size={22} className="text-blue-600" /> Commission Calculator
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Calculate rep commission payouts based on deal structure</p>
      </div>

      {/* Deal Economics */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
        <p className="text-gray-900 font-semibold text-sm">Deal Economics</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Funding">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
              <input type="number" value={form.funding} onChange={e => set('funding', e.target.value)} className={`${inputCls} pl-7`} placeholder="50000" />
            </div>
          </Field>
          <Field label="Payback">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
              <input type="number" value={form.payback} onChange={e => set('payback', e.target.value)} className={`${inputCls} pl-7`} placeholder="67500" />
            </div>
          </Field>
          <Field label="Payment">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
              <input type="number" value={form.payment} onChange={e => set('payment', e.target.value)} className={`${inputCls} pl-7`} placeholder="562.50" />
            </div>
          </Field>
          <Field label="Term (days)">
            <input type="number" value={form.term} onChange={e => set('term', e.target.value)} className={inputCls} placeholder="120" />
          </Field>
          <Field label="Buy Rate">
            <input type="number" step="0.01" value={form.buyRate} onChange={e => set('buyRate', e.target.value)} className={inputCls} placeholder="1.25" />
          </Field>
          <Field label="Sell Rate">
            <input type="number" step="0.01" value={form.sellRate} onChange={e => set('sellRate', e.target.value)} className={inputCls} placeholder="1.35" />
          </Field>
          <Field label="Points (%)">
            <input type="number" step="0.1" value={form.points} onChange={e => set('points', e.target.value)} className={inputCls} placeholder="2" />
          </Field>
          <Field label="Total Rev (override)">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
              <input type="number" value={form.totalRev} onChange={e => set('totalRev', e.target.value)} className={`${inputCls} pl-7`} placeholder="Optional" />
            </div>
          </Field>
        </div>
      </div>

      {/* Deal Structure */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
        <p className="text-gray-900 font-semibold text-sm">Deal Structure</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Deal Type">
            <select value={form.dealType} onChange={e => set('dealType', e.target.value)} className={selectCls}>
              {DEAL_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </Field>
          <Field label="Package Type">
            <select value={form.packageType} onChange={e => set('packageType', e.target.value)} className={selectCls}>
              {PACKAGE_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          {showLeadSubType && (
            <Field label="Lead Sub-Type">
              <select value={form.leadSubType} onChange={e => set('leadSubType', e.target.value)} className={selectCls}>
                {LEAD_SUB_TYPES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </Field>
          )}
          {showReferralFields && (
            <Field label="Referral Type">
              <select value={form.referralType} onChange={e => set('referralType', e.target.value)} className={selectCls}>
                {REFERRAL_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
          )}
          {showPaidOffFields && (
            <Field label="Days Since Paid Off">
              <input type="number" value={form.daysSincePaidOff} onChange={e => set('daysSincePaidOff', e.target.value)} className={inputCls} placeholder="45" />
            </Field>
          )}
          <Field label="Lead Source">
            <input value={form.leadSource} onChange={e => set('leadSource', e.target.value)} className={inputCls} placeholder="e.g. Facebook, Avocado" />
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 pt-3 border-t border-gray-100">
          <Toggle label="Same Rep (Pulled & Closed)" value={form.sameRep} onChange={v => set('sameRep', v)} />
          <Toggle label="Marketing Assist" value={form.marketingAssist} onChange={v => set('marketingAssist', v)} />
          <Toggle label="Renewal Originally Organic" value={form.renewalOriginallyOrganic} onChange={v => set('renewalOriginallyOrganic', v)} />
          {showDealLostFields && (
            <>
              <Toggle label="Closer Only" value={form.closerOnly} onChange={v => set('closerOnly', v)} />
              <Toggle label="Original Puller Paid" value={form.originalPullerPaid} onChange={v => set('originalPullerPaid', v)} />
              <Toggle label="Has Re-Puller" value={form.hasRePuller} onChange={v => set('hasRePuller', v)} />
            </>
          )}
          {showPaidOffFields && (
            <Toggle label="Split With Original Closer" value={form.splitWithOriginalCloser} onChange={v => set('splitWithOriginalCloser', v)} />
          )}
        </div>
      </div>

      {/* Calculate Button */}
      <button
        onClick={handleCalculate}
        disabled={loading || !form.funding}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium px-6 py-3 rounded-xl transition-colors shadow-sm"
      >
        <Calculator size={16} /> {loading ? 'Calculating...' : 'Calculate Commission'}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={14} className="text-red-500" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Payout Summary */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Total Commission Payout</p>
                <p className="text-3xl font-bold text-green-700">{fmt$(result.totalPayoutDollars)}</p>
                <p className="text-green-600 text-sm mt-1">{result.totalPayoutPercent}% of {fmt$(result.commissionableRevenue)} commissionable revenue</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Rule Matched</p>
                <p className="text-gray-700 text-sm font-mono bg-white px-3 py-1.5 rounded-lg border border-green-200">{result.matchedRuleKey}</p>
              </div>
            </div>
          </div>

          {/* Role Payouts */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-gray-900 font-semibold text-sm">Payout by Role</p>
            </div>
            <div className="divide-y divide-gray-100">
              {Object.entries(result.payouts).map(([role, data]) => (
                <div key={role} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-green-600" />
                    <span className="text-gray-700 text-sm font-medium capitalize">{role.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400 text-xs">{fmtPct(data.percent)}</span>
                    <span className="text-gray-900 text-sm font-bold">{fmt$(data.dollars)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Economics Breakdown */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-gray-900 font-semibold text-sm">Economics Breakdown</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-gray-100">
              {[
                { label: 'Lender Gross', value: fmt$(result.lenderGross) },
                { label: 'Points Revenue', value: fmt$(result.pointsRevenue) },
                { label: 'Commissionable Rev', value: fmt$(result.commissionableRevenue) },
                { label: 'Est. Payment Check', value: fmt$(result.estimatedPaymentCheck) },
              ].map(f => (
                <div key={f.label} className="px-5 py-4 text-center">
                  <p className="text-gray-400 text-xs mb-1">{f.label}</p>
                  <p className="text-gray-900 font-bold text-base">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
