import React from 'react';
import type { ReportDrilldownRow } from '../../../../types';
import { PrimaryButton } from '../../../../src/components/ui/PrimaryButton';
import { downloadCsv } from '../../../../src/lib/csv';
import { formatMetricValue } from './ReportMetricCard';
import { csrfHeaders } from '../../../../src/lib/client-security';
import { ResponsiveDataList } from '../mobile/ResponsiveDataList';

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
        {title && <h4 className="text-sm font-black uppercase tracking-wide text-muted">{title}</h4>}
        <PrimaryButton label="Export CSV" size="small" disabled={safeRows.length === 0} onClick={() => {
          void fetch('/api/audit/report-export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
            body: JSON.stringify({ report_type: exportName.replace(/\.csv$/i, ''), row_count: safeRows.length }),
          }).catch(() => undefined);
          downloadCsv(exportName, safeRows.map(flatten));
        }} />
      </div>
      <ResponsiveDataList
        rows={safeRows}
        getKey={(row) => row.id}
        empty={<div className="rounded-lg border border-line p-6 text-center text-sm text-muted">No rows for this report yet.</div>}
        mobileCard={(row) => (
          <div className="rounded-lg border border-line bg-surface p-4">
            <p className="break-words text-sm font-black text-main">{row.label}</p>
            <p className="mt-1 text-xs font-semibold text-muted">{row.secondary ?? '—'}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div><dt className="font-black uppercase text-secondary">Status</dt><dd className="font-bold text-main">{row.status ?? '—'}</dd></div>
              <div><dt className="font-black uppercase text-secondary">Amount</dt><dd className="font-bold text-main">{row.amount !== undefined && row.amount !== null ? formatMetricValue('amount', Number(row.amount)) : '—'}</dd></div>
              <div className="col-span-2"><dt className="font-black uppercase text-secondary">Date</dt><dd className="font-bold text-main">{row.date ? new Date(row.date).toLocaleDateString() : '—'}</dd></div>
            </dl>
          </div>
        )}
      >
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-primary">
              <tr className="text-left text-xs font-black uppercase tracking-wider text-accent">
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
                  <td className="px-4 py-3 text-sm font-bold text-main">{row.label}</td>
                  <td className="px-4 py-3 text-sm text-muted">{row.secondary ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted">{row.status ?? '—'}</td>
                  <td className="px-4 py-3 text-sm font-bold text-main">{row.amount !== undefined && row.amount !== null ? formatMetricValue('amount', Number(row.amount)) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted">{row.date ? new Date(row.date).toLocaleDateString() : '—'}</td>
                </tr>
              )) : <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">No rows for this report yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </ResponsiveDataList>
    </div>
  );
};
