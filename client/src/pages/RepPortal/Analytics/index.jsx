import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import KPICards from './KPICards';
import TrendCharts from './TrendCharts';
import LenderBreakdown from './LenderBreakdown';
import PipelineSection from './PipelineSection';
import FunnelChart from './FunnelChart';
import TimeMetrics from './TimeMetrics';
import DealSizeChart from './DealSizeChart';
import RiskMetrics from './RiskMetrics';
import { BarChart2, RefreshCw, ChevronDown, Users, Info } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

const TABS = [
  { key: 'overview',  label: 'Overview' },
  { key: 'funnel',    label: 'Funnel & Time' },
  { key: 'lenders',   label: 'Lenders' },
  { key: 'pipeline',  label: 'Pipeline' },
  { key: 'risk',      label: 'Revenue & Risk' },
];

export default function Analytics() {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [uwData, setUwData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({ from: '', to: '', rep: '', lender: '' });
  const [lastUpdated, setLastUpdated] = useState(null);

  const isAdmin = user?.role === 'admin';
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v]) => v)));
      const [summaryRes, uwRes] = await Promise.all([
        fetch(`${API}/analytics/summary?${params}`, { headers }),
        fetch(`${API}/analytics/underwriting?${params}`, { headers }),
      ]);
      if (summaryRes.ok) setData(await summaryRes.json());
      if (uwRes.ok) setUwData(await uwRes.json());
    } catch {
      // Use inline mock if server unreachable
      setData(getMockData(user));
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, [filters, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (user?.role === 'client') {
    return <div className="p-6 flex items-center justify-center h-64"><p className="text-gray-400 text-sm">Analytics not available for client accounts.</p></div>;
  }

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  // Get unique lenders from data for filter
  const lenders = [...new Set((data?.lenderBreakdown || []).map(l => l.lender))];

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
            <BarChart2 size={22} className="text-blue-600" /> Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {isAdmin ? 'Company-wide performance dashboard' : `${user?.name}'s production analytics`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range */}
          <input type="date" value={filters.from} onChange={e => setFilter('from', e.target.value)}
            className="bg-white border border-gray-200 text-gray-600 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
          <span className="text-gray-300 text-xs">to</span>
          <input type="date" value={filters.to} onChange={e => setFilter('to', e.target.value)}
            className="bg-white border border-gray-200 text-gray-600 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" />

          {/* Lender filter */}
          <div className="relative">
            <select value={filters.lender} onChange={e => setFilter('lender', e.target.value)}
              className="appearance-none bg-white border border-gray-200 text-gray-600 text-xs rounded-xl px-3 py-2 pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm">
              <option value="">All Lenders</option>
              {lenders.map(l => <option key={l}>{l}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Rep filter (admin) */}
          {isAdmin && (
            <div className="relative">
              <select value={filters.rep} onChange={e => setFilter('rep', e.target.value)}
                className="appearance-none bg-white border border-gray-200 text-gray-600 text-xs rounded-xl px-3 py-2 pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm">
                <option value="">All Reps</option>
                {(data?.repComparison || []).map(r => <option key={r.rep_id} value={r.rep_id}>{r.rep_name}</option>)}
              </select>
              <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}

          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 text-xs px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Data source legend */}
      <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5">
        <Info size={13} className="text-gray-400 shrink-0" />
        <p className="text-gray-500 text-xs">
          <span className="font-medium text-green-600">⚡ Auto-collected</span> — extracted from uploaded documents via AWS Textract &nbsp;·&nbsp;
          <span className="font-medium text-gray-600">✏️ Manual</span> — entered by rep in Deal Log &nbsp;·&nbsp;
          <span className="font-medium text-blue-600">Source: {data?.source === 'live' ? 'Live Data' : 'Sample Data'}</span>
        </p>
      </div>

      {/* KPI Cards */}
      <KPICards summary={data?.summary} loading={loading} />

      {/* Admin rep comparison */}
      {isAdmin && data?.repComparison?.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
            <Users size={15} className="text-gray-400" />
            <h2 className="text-gray-900 font-semibold text-sm">Rep Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  {['Rep','Apps','Approved','Funded','Volume','App→Approval','Approval→Fund','Avg Deal','Avg Days'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.repComparison.map(r => (
                  <tr key={r.rep_id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">{r.rep_name?.[0]}</div>
                        <span className="text-gray-900 font-medium text-sm">{r.rep_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{r.totalApps}</td>
                    <td className="py-3 px-4 text-gray-600">{r.approvedCount}</td>
                    <td className="py-3 px-4 text-gray-600">{r.fundedCount}</td>
                    <td className="py-3 px-4 text-gray-900 font-semibold">{r.totalFundedVolume >= 1000 ? `$${(r.totalFundedVolume/1000).toFixed(0)}K` : `$${r.totalFundedVolume || 0}`}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 bg-gray-100 rounded-full h-1.5"><div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${r.appToApprovalRatio || 0}%` }} /></div>
                        <span className="text-xs text-gray-600">{r.appToApprovalRatio || 0}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 bg-gray-100 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${r.approvalToFundingRatio || 0}%` }} /></div>
                        <span className="text-xs text-gray-600">{r.approvalToFundingRatio || 0}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{r.avgDealSize >= 1000 ? `$${(r.avgDealSize/1000).toFixed(0)}K` : '—'}</td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{r.avgDaysToFund ? `${r.avgDaysToFund.toFixed(1)}d` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-100">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <TrendCharts data={data?.monthlyTrend} loading={loading} />
          <DealSizeChart distribution={data?.dealSizeDistribution} summary={data?.summary} loading={loading} />
        </div>
      )}
      {activeTab === 'funnel' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <FunnelChart summary={data?.summary} loading={loading} />
          <TimeMetrics stageDurations={data?.stageDurations} loading={loading} />
        </div>
      )}
      {activeTab === 'lenders' && <LenderBreakdown data={data?.lenderBreakdown} loading={loading} />}
      {activeTab === 'pipeline' && <PipelineSection data={data?.pipelineByStage} deals={data?.deals} loading={loading} />}
      {activeTab === 'risk' && <RiskMetrics underwriting={uwData} summary={data?.summary} loading={loading} />}

      {lastUpdated && (
        <p className="text-gray-300 text-xs text-right">
          Last updated {lastUpdated.toLocaleTimeString()} · {data?.source === 'live' ? 'Live data from Deal Log' : 'Sample data — log deals to see real metrics'}
        </p>
      )}
    </div>
  );
}

function getMockData(user) {
  return {
    summary: { totalApps: 6, mtdApps: 3, todayApps: 1, approvedCount: 4, fundedCount: 3, appToApprovalRatio: 66.7, approvalToFundingRatio: 75.0, totalFundedVolume: 220000, avgDealSize: 73333, avgDaysToFund: 7.5, avgDailyObligation: 850, avgWithholdingPct: 12.5 },
    stageDurations: { submitToDocs: 1.2, docsToUnderwrite: 0.8, underwriteToApprove: 2.1, approveToFund: 3.4, totalToFund: 7.5 },
    monthlyTrend: [
      { month: '2026-01', submitted: 2, approved: 2, funded: 1, volume: 75000 },
      { month: '2026-02', submitted: 2, approved: 1, funded: 1, volume: 50000 },
      { month: '2026-03', submitted: 2, approved: 1, funded: 1, volume: 95000 },
    ],
    lenderBreakdown: [
      { lender: 'Libertas', submissions: 2, approvals: 2, funded: 2, volume: 125000, approvalRate: 100, fundingRate: 100, avgFactor: '1.32' },
      { lender: 'Kapitus', submissions: 2, approvals: 1, funded: 0, volume: 0, approvalRate: 50, fundingRate: 0, avgFactor: null },
      { lender: 'Greenbox', submissions: 2, approvals: 1, funded: 1, volume: 95000, approvalRate: 50, fundingRate: 50, avgFactor: '1.38' },
    ],
    dealSizeDistribution: [
      { range: '<25K', count: 0 }, { range: '25-50K', count: 1 }, { range: '50-75K', count: 1 },
      { range: '75-100K', count: 1 }, { range: '100-150K', count: 0 }, { range: '150K+', count: 0 },
    ],
    pipelineByStage: [{ stage: 'Submitted', count: 1, value: 60000 }, { stage: 'Approved', count: 1, value: 120000 }],
    deals: [
      { client_name: 'Williams Auto', lender: 'Libertas', amount: 75000, stage: 'Funded', submitted: '2026-01-15', factor: 1.35 },
      { client_name: 'Gonzalez Catering', lender: 'Libertas', amount: 50000, stage: 'Funded', submitted: '2026-02-01', factor: 1.28 },
      { client_name: 'Russo Plumbing', lender: 'Kapitus', amount: 120000, stage: 'Approved', submitted: '2026-02-20', factor: null },
    ],
    repComparison: user?.role === 'admin' ? [
      { rep_id: 'r-nik', rep_name: 'Nikholas Lazo', totalApps: 6, approvedCount: 4, fundedCount: 3, totalFundedVolume: 220000, appToApprovalRatio: 66.7, approvalToFundingRatio: 75.0, avgDealSize: 73333, avgDaysToFund: 7.5 },
    ] : null,
    source: 'mock',
  };
}
