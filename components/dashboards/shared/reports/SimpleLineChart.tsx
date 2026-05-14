import React from 'react';
import type { ReportSeriesPoint } from '../../../../types';
import { formatMetricValue } from './ReportMetricCard';

interface SimpleLineChartProps {
  points?: ReportSeriesPoint[] | null;
  amountMode?: boolean;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ points, amountMode }) => {
  const safePoints = Array.isArray(points) ? points : [];
  const max = Math.max(1, ...safePoints.map(point => amountMode ? Number(point.amount ?? 0) : point.count));
  if (safePoints.length === 0) return <p className="text-sm text-slate-500">No trend data yet.</p>;
  return (
    <div className="flex h-48 items-end gap-2 overflow-x-auto border-b border-slate-200 pb-2 dark:border-slate-700">
      {safePoints.map(point => {
        const value = amountMode ? Number(point.amount ?? 0) : point.count;
        return (
          <div key={point.period} className="flex min-w-12 flex-1 flex-col items-center justify-end gap-2">
            <span className="text-[10px] font-bold text-slate-500">{amountMode ? formatMetricValue('amount', value) : value}</span>
            <div className="w-full rounded-t-lg bg-theme-teal" style={{ height: `${Math.max(6, (value / max) * 145)}px` }} />
            <span className="max-w-16 truncate text-[10px] text-slate-500">{point.period}</span>
          </div>
        );
      })}
    </div>
  );
};
