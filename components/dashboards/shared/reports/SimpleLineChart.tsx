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
  if (safePoints.length === 0) return <p className="text-sm text-muted">No trend data yet.</p>;
  return (
    <div className="flex h-48 items-end gap-2 overflow-x-auto border-b border-line pb-2 ">
      {safePoints.map(point => {
        const value = amountMode ? Number(point.amount ?? 0) : point.count;
        return (
          <div key={point.period} className="flex min-w-12 flex-1 flex-col items-center justify-end gap-2">
            <span className="text-[10px] font-bold text-muted">{amountMode ? formatMetricValue('amount', value) : value}</span>
            <div className="w-full rounded-t-lg bg-secondary" style={{ height: `${Math.max(6, (value / max) * 145)}px` }} />
            <span className="max-w-16 truncate text-[10px] text-muted">{point.period}</span>
          </div>
        );
      })}
    </div>
  );
};
