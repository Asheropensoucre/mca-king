import React, { useEffect, useState } from 'react';
import type { LenderDashboardAnalytics, ReportDrilldownRow } from '../../../types';
import { Card } from '../../ui/Card';
import { api } from '../../../src/lib/api-client';
import { MCAKingLoader } from '../../../src/components/ui/MCAKingLoader';

const money = (value: number | string | null | undefined): string => `$${Number(value ?? 0).toLocaleString()}`;
const date = (value: string | null | undefined): string => value ? new Date(value).toLocaleDateString() : '—';

const MetricCard: React.FC<{ label: string; value: string | number; helper?: string }> = ({ label, value, helper }) => (
  <Card>
    <div className="p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-theme-maroon dark:text-theme-yellow">{value}</p>
      {helper && <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{helper}</p>}
    </div>
  </Card>
);

const MiniList: React.FC<{ title: string; rows?: ReportDrilldownRow[] | null }> = ({ title, rows }) => {
  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <Card>
      <div className="p-5">
        <h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">{title}</h3>
        <div className="mt-4 space-y-3">
          {safeRows.length > 0 ? safeRows.map(row => (
            <div key={row.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{row.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{row.status ?? '—'} • {date(row.date)}</p>
                </div>
                {row.amount !== undefined && row.amount !== null && <p className="text-sm font-black text-theme-maroon dark:text-theme-yellow">{money(row.amount)}</p>}
              </div>
            </div>
          )) : <p className="text-sm text-slate-500 dark:text-slate-400">No records yet.</p>}
        </div>
      </div>
    </Card>
  );
};

const emptyAnalytics: LenderDashboardAnalytics = {
  metrics: {
    files_sent: 0,
    pending_review: 0,
    offers_sent: 0,
    declines: 0,
    funded_deals: 0,
    total_funded: 0,
    total_payback: 0,
    average_funded: 0,
    this_month_funded: 0,
    last_90_days_funded: 0,
    payoff_requests_pending: 0,
  },
  recent_submissions: [],
  recent_fundings: [],
  pending_payoff_requests: [],
};

export const LenderAnalyticsPanel: React.FC = () => {
  const [analytics, setAnalytics] = useState<LenderDashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.lenderDashboard.analytics()
      .then(data => { setAnalytics(data); setError(null); })
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load lender analytics.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <MCAKingLoader label="Loading relationship analytics..." centered />;
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>;

  const safeAnalytics = analytics ?? emptyAnalytics;
  const metrics = safeAnalytics.metrics ?? emptyAnalytics.metrics;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-theme-maroon dark:text-theme-yellow">Relationship Analytics</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">These numbers show only your direct relationship with this broker shop.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard label="Files Sent To Us" value={metrics.files_sent} />
        <MetricCard label="Pending Review" value={metrics.pending_review} />
        <MetricCard label="Offers/Approvals Sent" value={metrics.offers_sent} />
        <MetricCard label="Funded Deals Together" value={metrics.funded_deals} />
        <MetricCard label="Total Funded Together" value={money(metrics.total_funded)} />
        <MetricCard label="Average Funded Amount" value={money(metrics.average_funded)} />
        <MetricCard label="This Month Funded" value={money(metrics.this_month_funded)} />
        <MetricCard label="Payoff Requests Pending" value={metrics.payoff_requests_pending} />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <MiniList title="Recent Submissions" rows={safeAnalytics.recent_submissions} />
        <MiniList title="Recent Funded Deals" rows={safeAnalytics.recent_fundings} />
        <MiniList title="Pending Payoff Requests" rows={safeAnalytics.pending_payoff_requests} />
      </div>
    </div>
  );
};
