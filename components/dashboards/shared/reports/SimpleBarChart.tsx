import React from 'react';
import type { ReportBreakdownRow } from '../../../../types';
import { formatMetricValue } from './ReportMetricCard';

interface SimpleBarChartProps {
  rows: ReportBreakdownRow[];
  amountMode?: boolean;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ rows, amountMode }) => {
  const max = Math.max(1, ...rows.map(row => amountMode ? Number(row.amount ?? 0) : row.count));
  if (rows.length === 0) return <p className="text-sm text-slate-500">No data yet.</p>;
  return (
    <div className="space-y-3">
      {rows.slice(0, 12).map(row => {
        const value = amountMode ? Number(row.amount ?? 0) : row.count;
        return (
          <div key={row.key}>
            <div className="mb-1 flex justify-between gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
              <span>{row.label}</span>
              <span>{amountMode ? formatMetricValue('amount', value) : value.toLocaleString()}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-full rounded-full bg-theme-teal" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
