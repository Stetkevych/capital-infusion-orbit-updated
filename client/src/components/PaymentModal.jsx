import React, { useState } from 'react';
import { X, DollarSign, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

const inputCls = "w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400";

export default function PaymentModal({ locId, onClose, onSuccess, token }) {
  const [form, setForm] = useState({
    borrowerName: '', businessName: '', email: '', phone: '',
    address1: '', city: '', state: '', zip: '',
    accountType: 'checking', routingNumber: '', accountNumber: '',
    amount: '', billingCycle: 'once', memo: '', effectiveDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitted) return; // prevent double-click
    setError('');
    setLoading(true);
    setSubmitted(true);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API}/actum/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...form, locId, amount: parseFloat(form.amount) }),
      });

      const data = await res.json();

      if (data.duplicate) {
        setError('This payment has already been submitted.');
        setSubmitted(false);
      } else if (data.errors) {
        setError(data.errors.join(' '));
        setSubmitted(false);
      } else if (data.success) {
        setSuccess(data.transaction);
        if (onSuccess) onSuccess(data.transaction);
      } else {
        setError(data.actumResponse?.reason || data.error || 'Payment was not accepted.');
        setSubmitted(false);
      }
    } catch {
      setError('Connection failed. Please try again.');
      setSubmitted(false);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-8 text-center">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-gray-900 font-semibold text-lg mb-2">Payment Submitted</h2>
          <p className="text-gray-500 text-sm mb-1">Amount: <span className="font-bold text-gray-900">${Number(success.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
          <p className="text-gray-400 text-xs mb-4">Reference: {success.merOrderNumber}</p>
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6">
            <p className="text-green-700 text-sm font-medium">Status: {success.status.charAt(0).toUpperCase() + success.status.slice(1)}</p>
          </div>
          <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-blue-600" />
            <h2 className="text-gray-900 font-semibold text-base">ACH Payment Request</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <p className="text-gray-400 text-xs uppercase tracking-wide font-medium">Account Holder</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <input required value={form.borrowerName} onChange={e => set('borrowerName', e.target.value)} className={inputCls} placeholder="Full Name *" />
            </div>
            <input value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="Email" type="email" />
            <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="Phone" />
          </div>

          <p className="text-gray-400 text-xs uppercase tracking-wide font-medium pt-2">Bank Details</p>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.accountType} onChange={e => set('accountType', e.target.value)} className={inputCls}>
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
            <input required value={form.routingNumber} onChange={e => set('routingNumber', e.target.value.replace(/\D/g, '').slice(0, 9))} className={inputCls} placeholder="Routing Number *" />
            <div className="col-span-2">
              <input required value={form.accountNumber} onChange={e => set('accountNumber', e.target.value.replace(/\D/g, '').slice(0, 17))} className={inputCls} placeholder="Account Number *" />
            </div>
          </div>

          <p className="text-gray-400 text-xs uppercase tracking-wide font-medium pt-2">Payment</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} className={`${inputCls} pl-7`} placeholder="Amount *" />
            </div>
            <select value={form.billingCycle} onChange={e => set('billingCycle', e.target.value)} className={inputCls}>
              <option value="once">One-Time</option>
              <option value="monthly">Monthly</option>
              <option value="biweekly">Bi-Weekly</option>
              <option value="weekly">Weekly</option>
              <option value="quarterly">Quarterly</option>
            </select>
            <input value={form.effectiveDate} onChange={e => set('effectiveDate', e.target.value)} className={inputCls} placeholder="Future Date (optional)" type="date" />
            <input value={form.memo} onChange={e => set('memo', e.target.value)} className={inputCls} placeholder="Memo (optional)" />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <p className="text-gray-400 text-xs">Processed securely via Actum ACH</p>
            <button
              type="submit"
              disabled={loading || submitted}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />}
              {loading ? 'Processing...' : 'Submit Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
