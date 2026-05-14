import React, { useEffect, useMemo, useState } from 'react';
import type { AuthUser, CommissionReport, FundingReport, LeadReport, LenderInfo, LenderReport, OverviewReport, PipelineReport, ReportBreakdownRow, ReportDrilldownRow, RenewalReport, RevenueReport, SalesRepresentative, TaskReport } from '../../types';
import { api } from '../../src/lib/api-client';
import { MCAKingLoader } from '../../src/components/ui/MCAKingLoader';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { ReportFilters, defaultReportFilters, type ReportFilterState } from './shared/reports/ReportFilters';
import { ReportMetricCard, formatMetricLabel, formatMetricValue } from './shared/reports/ReportMetricCard';
import { ReportSection } from './shared/reports/ReportSection';
import { SimpleBarChart } from './shared/reports/SimpleBarChart';
import { SimpleLineChart } from './shared/reports/SimpleLineChart';
import { ReportTable } from './shared/reports/ReportTable';

type ReportTab = 'overview' | 'pipeline' | 'funding' | 'leads' | 'lenders' | 'revenue' | 'commissions' | 'renewals' | 'tasks';
type ReportData = OverviewReport | PipelineReport | FundingReport | LeadReport | LenderReport | RevenueReport | CommissionReport | RenewalReport | TaskReport;

interface ReportsViewProps {
  currentUser: AuthUser;
  salesReps?: SalesRepresentative[];
  lenders?: LenderInfo[];
}

const adminTabs: Array<{ id: ReportTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'funding', label: 'Funding' },
  { id: 'leads', label: 'Leads' },
  { id: 'lenders', label: 'Lenders/Funders' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'commissions', label: 'Commissions' },
  { id: 'renewals', label: 'Renewals' },
  { id: 'tasks', label: 'Tasks' },
];

const salesTabs: Array<{ id: ReportTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'funding', label: 'Funding' },
  { id: 'leads', label: 'Leads' },
  { id: 'commissions', label: 'My Commissions' },
  { id: 'renewals', label: 'Renewals' },
  { id: 'tasks', label: 'Tasks' },
];

const metricCards = (metrics: Record<string, number | string>, keys?: string[]) => {
  const entries = keys ? keys.map(key => [key, metrics[key]] as const).filter(([, value]) => value !== undefined) : Object.entries(metrics);
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">{entries.map(([key, value]) => <ReportMetricCard key={key} label={formatMetricLabel(key)} value={formatMetricValue(key, value)} />)}</div>;
};

const chartSection = (title: string, rows?: ReportBreakdownRow[], amountMode = false) => (
  <ReportSection title={title}>{rows && rows.length > 0 ? <SimpleBarChart rows={rows} amountMode={amountMode} /> : <p className="text-sm text-slate-500">No data yet.</p>}</ReportSection>
);

const tableRowsFromBreakdown = (rows: ReportBreakdownRow[]): ReportDrilldownRow[] => rows.map(row => ({ id: row.key, label: row.label, amount: row.amount, status: row.percent !== undefined ? `${row.percent}%` : undefined, metadata: { count: row.count } }));

export const ReportsView: React.FC<ReportsViewProps> = ({ currentUser, salesReps = [], lenders = [] }) => {
  const tabs = currentUser.role === 'admin' ? adminTabs : salesTabs;
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [filters, setFilters] = useState<ReportFilterState>(defaultReportFilters());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => ({
    from: filters.from,
    to: filters.to,
    granularity: filters.granularity,
    rep_id: filters.rep_id,
    lender_id: filters.lender_id,
  }), [filters]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.reports[activeTab](params);
      setData(result as ReportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [activeTab, params]);

  const renderOverview = (report: OverviewReport) => (
    <div className="space-y-5">
      {metricCards(report.metrics, ['funded_volume', 'funded_deals', 'average_funding_amount', 'total_leads', 'lead_conversion_rate', 'offer_to_funded_rate', 'broker_revenue_expected', 'broker_revenue_received', 'commissions_unpaid', 'overdue_tasks', 'eligible_renewals'])}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ReportSection title="Funding Trend"><SimpleLineChart points={report.funding_series} amountMode /></ReportSection>
        {chartSection('Pipeline Breakdown', report.pipeline_breakdown)}
        {chartSection('Top Reps by Funded Volume', report.top_reps, true)}
        {currentUser.role === 'admin' && chartSection('Top Lenders/Funders by Funded Volume', report.top_lenders, true)}
      </div>
    </div>
  );

  const renderReport = () => {
    if (!data) return null;
    if (activeTab === 'overview') return renderOverview(data as OverviewReport);
    if (activeTab === 'pipeline') {
      const report = data as PipelineReport;
      return <div className="space-y-5">{metricCards(report.metrics)}<div className="grid grid-cols-1 gap-5 xl:grid-cols-2">{chartSection('Deals by Status', report.by_status)}{currentUser.role === 'admin' && chartSection('Deals by Rep', report.by_rep)}</div><ReportSection title="Stale Deals"><ReportTable rows={report.stale_deals} exportName="pipeline-stale-deals.csv" /></ReportSection></div>;
    }
    if (activeTab === 'funding') {
      const report = data as FundingReport;
      return <div className="space-y-5">{metricCards(report.metrics)}<ReportSection title="Funding Volume Trend"><SimpleLineChart points={report.series} amountMode /></ReportSection><div className="grid grid-cols-1 gap-5 xl:grid-cols-2">{chartSection('By Funding Type', report.by_funding_type, true)}{chartSection('By Funding Position', report.by_position, true)}{currentUser.role === 'admin' && chartSection('By Rep', report.by_rep, true)}{currentUser.role === 'admin' && chartSection('By Lender/Funder', report.by_lender, true)}</div><ReportSection title="Funded Deal Rows"><ReportTable rows={report.rows} exportName="funding-report.csv" /></ReportSection></div>;
    }
    if (activeTab === 'leads') {
      const report = data as LeadReport;
      return <div className="space-y-5">{metricCards(report.metrics)}<ReportSection title="New Leads Trend"><SimpleLineChart points={report.series} /></ReportSection><div className="grid grid-cols-1 gap-5 xl:grid-cols-2">{chartSection('By Status', report.by_status)}{currentUser.role === 'admin' && chartSection('By Rep', report.by_rep)}</div><ReportSection title="Lead Rows"><ReportTable rows={report.rows} exportName="lead-report.csv" /></ReportSection></div>;
    }
    if (activeTab === 'lenders') {
      const report = data as LenderReport;
      return <div className="space-y-5">{metricCards(report.metrics)}<ReportSection title="Lender/Funder Performance" description="Internal broker-shop reporting only. Not visible to lender users."><ReportTable rows={report.rows} exportName="lender-performance-report.csv" /></ReportSection></div>;
    }
    if (activeTab === 'revenue') {
      const report = data as RevenueReport;
      return <div className="space-y-5">{metricCards(report.metrics)}<div className="grid grid-cols-1 gap-5 xl:grid-cols-3">{chartSection('By Status', report.by_status, true)}{chartSection('By Lender/Funder', report.by_lender, true)}{chartSection('Receivable Aging', report.aging, true)}</div><ReportSection title="Broker Revenue Rows"><ReportTable rows={report.rows} exportName="broker-revenue-report.csv" /></ReportSection></div>;
    }
    if (activeTab === 'commissions') {
      const report = data as CommissionReport;
      return <div className="space-y-5">{metricCards(report.metrics)}<div className="grid grid-cols-1 gap-5 xl:grid-cols-3">{chartSection('By Status', report.by_status, true)}{currentUser.role === 'admin' && chartSection('By Rep', report.by_rep, true)}{chartSection('Commission Aging', report.aging, true)}</div><ReportSection title={currentUser.role === 'admin' ? 'Sales Rep Commission Rows' : 'My Commission Rows'}><ReportTable rows={report.rows} exportName="commission-report.csv" /></ReportSection></div>;
    }
    if (activeTab === 'renewals') {
      const report = data as RenewalReport;
      return <div className="space-y-5">{metricCards(report.metrics)}<div className="grid grid-cols-1 gap-5 xl:grid-cols-2">{chartSection('By Status', report.by_status)}{currentUser.role === 'admin' && chartSection('By Rep', report.by_rep)}</div><ReportSection title="Renewal Rows"><ReportTable rows={report.rows} exportName="renewal-report.csv" /></ReportSection></div>;
    }
    const report = data as TaskReport;
    return <div className="space-y-5">{metricCards(report.metrics)}<div className="grid grid-cols-1 gap-5 xl:grid-cols-3">{chartSection('By Status', report.by_status)}{currentUser.role === 'admin' && chartSection('By Rep', report.by_rep)}{chartSection('By Priority', report.by_priority)}</div><ReportSection title="Task Rows"><ReportTable rows={report.rows} exportName="task-report.csv" /></ReportSection></div>;
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-theme-maroon dark:text-theme-yellow">{currentUser.role === 'admin' ? 'Reports' : 'My Reports'}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Broker-shop analytics from existing CRM data.</p>
      </div>
      <ReportFilters filters={filters} onChange={setFilters} salesReps={salesReps} lenders={lenders} currentUserRole={currentUser.role} showLenderFilter={activeTab === 'funding' || activeTab === 'lenders' || activeTab === 'revenue'} />
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => <span key={tab.id}><PrimaryButton label={tab.label} size="small" variant={activeTab === tab.id ? 'funded' : 'default'} onClick={() => setActiveTab(tab.id)} /></span>)}
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {loading ? <MCAKingLoader label="Loading report..." centered /> : renderReport()}
    </div>
  );
};
