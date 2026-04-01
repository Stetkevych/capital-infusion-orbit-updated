import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle2, DollarSign, Percent, Calendar, Shield } from 'lucide-react';

const fmt$ = n => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="text-gray-500 font-medium mb-1.5">Day {label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-semibold text-gray-900">${Number(p.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      ))}
    </div>
  );
};

const inputCls = "w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";

export default function TrendSimulator() {
  const [data, setData] = useState({
    monthlyRevenue: 50000,
    avgBalance: 8000,
    negativeDays: 3,
    existingDebtPayment: 500,
    advanceAmount: 30000,
    factor: 1.35,
    termDays: 120,
  });

  const handleChange = (name, value) => {
    setData(d => ({ ...d, [name]: Number(value) || 0 }));
  };

  // Core calculations
  const payback = data.advanceAmount * data.factor;
  const dailyPayment = data.termDays > 0 ? payback / data.termDays : 0;
  const dailyRevenue = data.monthlyRevenue / 30;
  const withholding = dailyRevenue > 0 ? (dailyPayment / dailyRevenue) * 100 : 0;
  const totalCost = payback - data.advanceAmount;
  const netDailyAfterPayment = dailyRevenue - dailyPayment - data.existingDebtPayment;

  // Risk score
  let risk = 0;
  if (withholding > 15) risk += 30;
  if (data.negativeDays > 5) risk += 25;
  if (data.avgBalance < dailyPayment * 3) risk += 25;
  if (data.existingDebtPayment > dailyPayment) risk += 20;

  const riskLabel = risk < 30 ? 'Low' : risk < 60 ? 'Medium' : 'High';
  const riskColor = risk < 30 ? 'text-green-600' : risk < 60 ? 'text-amber-600' : 'text-red-600';
  const riskBg = risk < 30 ? 'bg-green-50 border-green-200' : risk < 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  // Chart data — 30 days
  const chartData = Array.from({ length: data.termDays > 0 ? Math.min(data.termDays, 180) : 30 }).map((_, i) => ({
    day: i + 1,
    'Daily Revenue': Math.round(dailyRevenue),
    'MCA Payment': Math.round(dailyPayment),
    'Net After Payments': Math.round(netDailyAfterPayment),
  }));

  const fields = [
    { name: 'monthlyRevenue', label: 'Monthly Revenue', icon: DollarSign, prefix: '$' },
    { name: 'avgBalance', label: 'Avg Daily Balance', icon: DollarSign, prefix: '$' },
    { name: 'negativeDays', label: 'Negative Days', icon: AlertTriangle },
    { name: 'existingDebtPayment', label: 'Existing Daily Debt', icon: DollarSign, prefix: '$' },
    { name: 'advanceAmount', label: 'Advance Amount', icon: DollarSign, prefix: '$' },
    { name: 'factor', label: 'Factor Rate', icon: Percent, step: '0.01' },
    { name: 'termDays', label: 'Term (Days)', icon: Calendar },
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-gray-900 font-semibold text-sm flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-600" /> MCA Offer Trend Simulator
        </h2>
        <p className="text-gray-400 text-xs mt-0.5">Compare bank statement earnings against potential offers — adjust inputs to model scenarios</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Inputs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {fields.map(f => (
            <div key={f.name}>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{f.label}</label>
              <div className="relative">
                {f.prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{f.prefix}</span>}
                <input
                  type="number"
                  step={f.step || '1'}
                  value={data[f.name]}
                  onChange={e => handleChange(f.name, e.target.value)}
                  className={`${inputCls} ${f.prefix ? 'pl-7' : ''}`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Results cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Payback', value: fmt$(payback), color: 'text-gray-900', bg: 'bg-gray-50', border: 'border-gray-200' },
            { label: 'Daily Payment', value: fmt$(dailyPayment), color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
            { label: 'Cost of Capital', value: fmt$(totalCost), color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
            { label: 'Withholding', value: `${withholding.toFixed(1)}%`, color: withholding > 15 ? 'text-red-600' : 'text-green-600', bg: withholding > 15 ? 'bg-red-50' : 'bg-green-50', border: withholding > 15 ? 'border-red-200' : 'border-green-200' },
            { label: 'Net Daily Cash', value: fmt$(netDailyAfterPayment), color: netDailyAfterPayment < 0 ? 'text-red-600' : 'text-green-600', bg: netDailyAfterPayment < 0 ? 'bg-red-50' : 'bg-green-50', border: netDailyAfterPayment < 0 ? 'border-red-200' : 'border-green-200' },
            { label: 'Risk Score', value: `${risk} — ${riskLabel}`, color: riskColor, bg: riskBg.split(' ')[0], border: riskBg.split(' ')[1] },
          ].map(c => (
            <div key={c.label} className={`${c.bg} border ${c.border} rounded-xl p-3`}>
              <p className="text-gray-400 text-xs mb-1">{c.label}</p>
              <p className={`text-base font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Risk banner */}
        {risk >= 60 && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 font-semibold text-sm">High Risk Scenario</p>
              <p className="text-red-600 text-xs mt-0.5">
                {withholding > 15 && 'Withholding exceeds 15% of daily revenue. '}
                {data.negativeDays > 5 && 'Excessive negative days. '}
                {data.avgBalance < dailyPayment * 3 && 'Average balance too low relative to payment. '}
                {data.existingDebtPayment > dailyPayment && 'Existing debt exceeds proposed payment. '}
              </p>
            </div>
          </div>
        )}
        {risk < 30 && (
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
            <p className="text-green-700 text-sm font-medium">Low risk — this scenario looks sustainable based on the inputs.</p>
          </div>
        )}

        {/* Chart */}
        <div>
          <p className="text-gray-500 text-xs font-medium mb-3">Daily Revenue vs. MCA Payment Over Term</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} label={{ value: 'Day', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Daily Revenue" stroke="#059669" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="MCA Payment" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Net After Payments" stroke={netDailyAfterPayment < 0 ? '#dc2626' : '#9ca3af'} strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
