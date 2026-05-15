import React from 'react';
import type { ReportDrilldownRow } from '../../../../types';
import { PrimaryButton } from '../../../../src/components/ui/PrimaryButton';
import { downloadCsv } from '../../../../src/lib/csv';
import { formatMetricValue } from './ReportMetricCard';
import { csrfHeaders } from '../../../../src/lib/client-security';

interface ReportTableProps {
  title?: string;
  rows?: ReportDrilldownRow[] | null;
  exportName?: string;
}

const flatten = (row: ReportDrilldownRow): Record<string, unknown> => ({
  id: row.id,
  label: row.label,
  secondary: row.secondary,
  status: row.status,
  amount: row.amount,
  date: row.date,
  ...(row.metadata ?? {}),
});

export const ReportTable: React.FC<ReportTableProps> = ({ title, rows, exportName = 'report.csv' }) => {
  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        {title && <h4 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h4>}
        <PrimaryButton label="Export CSV" size="small" disabled={safeRows.length === 0} onClick={() => {
          void fetch('/api/audit/report-export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
            body: JSON.stringify({ report_type: exportName.replace(/\.csv$/i, ''), row_count: safeRows.length }),
          }).catch(() => undefined);
          downloadCsv(exportName, safeRows.map(flatten));
        }} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-950/90">
            <tr className="text-left text-xs font-black uppercase tracking-wider text-theme-yellow">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {safeRows.length > 0 ? safeRows.map(row => (
              <tr key={row.id}>
                <td className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100">{row.label}</td>
                <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{row.secondary ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{row.status ?? '—'}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200">{row.amount !== undefined && row.amount !== null ? formatMetricValue('amount', Number(row.amount)) : '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{row.date ? new Date(row.date).toLocaleDateString() : '—'}</td>
              </tr>
            )) : <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No rows for this report yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
