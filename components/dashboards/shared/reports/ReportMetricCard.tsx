import React from 'react';
import { Card } from '../../../ui/Card';

const moneyKeys = ['amount', 'volume', 'revenue', 'commission', 'funded', 'payback', 'unpaid', 'paid', 'expected', 'received', 'invoiced', 'disputed'];

export const formatMetricLabel = (key: string): string => key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

export const formatMetricValue = (key: string, value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '0';
  if (typeof value === 'string') return value;
  const isMoney = moneyKeys.some(token => key.toLowerCase().includes(token)) && !key.toLowerCase().includes('rate');
  if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('percent')) return `${value}%`;
  return isMoney ? `$${Math.round(value).toLocaleString()}` : value.toLocaleString();
};

interface ReportMetricCardProps {
  label: string;
  value: number | string;
  helper?: string;
}

export const ReportMetricCard: React.FC<ReportMetricCardProps> = ({ label, value, helper }) => (
  <Card>
    <div className="p-4">
      <p className="text-xs font-black uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-black text-main ">{value}</p>
      {helper && <p className="mt-1 text-xs font-semibold text-muted">{helper}</p>}
    </div>
  </Card>
);
