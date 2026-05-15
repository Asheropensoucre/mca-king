import React from 'react';
import type { ReportBreakdownRow } from '../../../../types';
import { formatMetricValue } from './ReportMetricCard';

interface SimpleBarChartProps {
  rows?: ReportBreakdownRow[] | null;
  amountMode?: boolean;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ rows, amountMode }) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const max = Math.max(1, ...safeRows.map(row => amountMode ? Number(row.amount ?? 0) : row.count));
  if (safeRows.length === 0) return <p className="text-sm text-muted">No data yet.</p>;
  return (
    <div className="space-y-3">
      {safeRows.slice(0, 12).map(row => {
        const value = amountMode ? Number(row.amount ?? 0) : row.count;
        return (
          <div key={row.key}>
            <div className="mb-1 flex justify-between gap-3 text-xs font-bold text-muted">
              <span>{row.label}</span>
              <span>{amountMode ? formatMetricValue('amount', value) : value.toLocaleString()}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-strong -muted">
              <div className="h-full rounded-full bg-secondary" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
