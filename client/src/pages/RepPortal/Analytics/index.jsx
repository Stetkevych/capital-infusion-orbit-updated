import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import KPICards from './KPICards';
import TrendCharts from './TrendCharts';
import LenderBreakdown from './LenderBreakdown';
import PipelineSection from './PipelineSection';
import { BarChart2, RefreshCw, Filter, ChevronDown, Users } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://capital-infusion-api-prod.eba-wqytrheg.us-east-1.elasticbeanstalk.com/api';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'lenders', label: 'Lenders' },
  { key: 'pipeline', label: 'Pipeline' },
];

export default function Analytics() {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('all');
  const [selectedRep, setSelectedRep] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dataSource, setDataSource] = useState(null);

  const isAdmin = user?.role === 'admin';

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API}/analytics/summary`, { headers });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setDataSource(json.source);
      } else {
        // Use mock data inline if server unreachable
        setData(getMockData(user));
        setDataSource('mock');
      }
    } catch {
      setData(getMockData(user));
      setDataSource('mock');
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (user?.role === 'client') {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Analytics not available for client accounts.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
            <BarChart2 size={22} className="text-blue-600" />
            Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {isAdmin ? 'Company-wide performance dashboard' : `${user?.name}'s production analytics`}
            {dataSource === 'mock' && (
              <span className="ml-2 text-xs bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full">
                Sample Data — Connect Athena for live data
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date range filter */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="appearance-none bg-white border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-2 pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
            >
              <option value="all">All Time</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="ytd">Year to Date</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Rep filter (admin only) */}
          {isAdmin && (
            <div className="relative">
              <select
                value={selectedRep}
                onChange={e => setSelectedRep(e.target.value)}
                className="appearance-none bg-white border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-2 pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
              >
                <option value="">All Reps</option>
                {(data?.repComparison || []).map(r => (
                  <option key={r.rep_id} value={r.rep_id}>{r.rep_name}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 text-xs px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards summary={data?.summary} loading={loading} />

      {/* Admin rep comparison strip */}
      {isAdmin && data?.repComparison && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
            <Users size={15} className="text-gray-400" />
            <h2 className="text-gray-900 font-semibold text-sm">Rep Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  {['Rep', 'Submitted', 'Funded', 'Volume', 'Funding Rate'].map(h => (
                    <th key={h} className="text-left py-3 px-5 text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.repComparison.map(r => (
                  <tr key={r.rep_id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs">
                          {r.rep_name[0]}
                        </div>
                        <span className="text-gray-900 font-medium text-sm">{r.rep_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-gray-600">{r.submitted}</td>
                    <td className="py-3 px-5 text-gray-600">{r.funded}</td>
                    <td className="py-3 px-5 text-gray-900 font-semibold">
                      {r.volume >= 1000 ? `$${(r.volume/1000).toFixed(0)}K` : `$${r.volume}`}
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${r.submitted ? Math.round(r.funded/r.submitted*100) : 0}%` }} />
                        </div>
                        <span className="text-gray-700 text-xs font-medium">
                          {r.submitted ? Math.round(r.funded/r.submitted*100) : 0}%
                        </span>
                      </div>
                    </td>
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
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <TrendCharts data={data?.monthlyTrend} loading={loading} />
      )}
      {activeTab === 'lenders' && (
        <LenderBreakdown data={data?.lenderBreakdown} loading={loading} />
      )}
      {activeTab === 'pipeline' && (
        <PipelineSection data={data?.pipelineByStage} deals={data?.deals} loading={loading} />
      )}

      {/* Footer */}
      {lastUpdated && (
        <p className="text-gray-300 text-xs text-right">
          Last updated {lastUpdated.toLocaleTimeString()} · Source: {dataSource === 'athena' ? 'AWS Athena' : 'Sample Data'}
        </p>
      )}
    </div>
  );
}

// Inline mock for when server is unreachable
function getMockData(user) {
  const isAdmin = user?.role === 'admin';
  return {
    summary: { totalFunded: 220000, totalFundedDeals: 3, avgDealSize: 73333, approvalRate: 66.7, fundingRate: 50, activePipeline: 2, pipelineValue: 180000, totalDeals: 6 },
    monthlyTrend: [
      { month: '2026-01', submitted: 2, approved: 2, funded: 1, volume: 75000 },
      { month: '2026-02', submitted: 2, approved: 1, funded: 1, volume: 50000 },
      { month: '2026-03', submitted: 2, approved: 1, funded: 1, volume: 95000 },
    ],
    lenderBreakdown: [
      { lender: 'Libertas', submissions: 2, approvals: 2, funded: 2, volume: 125000, approvalRate: 100, avgFactor: '1.32' },
      { lender: 'Kapitus', submissions: 2, approvals: 1, funded: 0, volume: 0, approvalRate: 50, avgFactor: null },
      { lender: 'Greenbox', submissions: 2, approvals: 1, funded: 1, volume: 95000, approvalRate: 50, avgFactor: '1.38' },
    ],
    pipelineByStage: [
      { stage: 'Submitted', count: 1, value: 60000 },
      { stage: 'Approved', count: 1, value: 120000 },
    ],
    deals: [
      { client_name: 'Williams Auto Repair', lender: 'Libertas', amount: 75000, stage: 'Funded', submitted: '2026-01-15', factor: 1.35 },
      { client_name: 'Gonzalez Catering', lender: 'Libertas', amount: 50000, stage: 'Funded', submitted: '2026-02-01', factor: 1.28 },
      { client_name: 'Russo Plumbing', lender: 'Kapitus', amount: 120000, stage: 'Approved', submitted: '2026-02-20', factor: null },
      { client_name: 'Bright Horizons', lender: 'Kapitus', amount: 80000, stage: 'Declined', submitted: '2026-03-01', factor: null },
      { client_name: 'Metro Dental', lender: 'Greenbox', amount: 95000, stage: 'Funded', submitted: '2026-03-10', factor: 1.38 },
      { client_name: 'City Retail LLC', lender: 'Greenbox', amount: 60000, stage: 'Submitted', submitted: '2026-03-25', factor: null },
    ],
    repComparison: isAdmin ? [
      { rep_id: 'r-nik', rep_name: 'Nikholas Lazo', submitted: 6, funded: 3, volume: 220000 },
      { rep_id: 'r1', rep_name: 'Sarah Mitchell', submitted: 4, funded: 2, volume: 133000 },
      { rep_id: 'r2', rep_name: 'James Carter', submitted: 3, funded: 1, volume: 110000 },
    ] : null,
    source: 'mock',
  };
}
