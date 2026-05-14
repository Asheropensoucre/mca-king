import React from 'react';
import type { LenderInfo, SalesRepresentative, UserRole } from '../../../../types';
import { Input } from '../../../ui/Input';
import { Select } from '../../../ui/Select';
import { PrimaryButton } from '../../../../src/components/ui/PrimaryButton';

export interface ReportFilterState {
  from: string;
  to: string;
  granularity: 'day' | 'week' | 'month';
  rep_id?: string;
  lender_id?: string;
}

interface ReportFiltersProps {
  filters: ReportFilterState;
  onChange: (filters: ReportFilterState) => void;
  salesReps?: SalesRepresentative[];
  lenders?: LenderInfo[];
  currentUserRole: UserRole;
  showLenderFilter?: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
};

export const defaultReportFilters = (): ReportFilterState => ({ from: monthStart(), to: today(), granularity: 'day' });

export const ReportFilters: React.FC<ReportFiltersProps> = ({ filters, onChange, salesReps = [], lenders = [], currentUserRole, showLenderFilter = true }) => {
  const update = (patch: Partial<ReportFilterState>) => onChange({ ...filters, ...patch });
  const setPreset = (preset: 'month' | 'last_month' | 'quarter' | 'year') => {
    const now = new Date();
    let from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    let to = new Date();
    if (preset === 'last_month') {
      from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    }
    if (preset === 'quarter') from = new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1));
    if (preset === 'year') from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    onChange({ ...filters, from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) });
  };

  return (
    <div className="rounded-xl border-2 border-theme-maroon/80 bg-white/95 p-4 shadow-[6px_6px_0_var(--ct-primary)] dark:border-theme-yellow/80 dark:bg-dark-card/95 dark:shadow-[6px_6px_0_var(--ct-secondary-fixed-dim)]">
      <div className="mb-3 flex flex-wrap gap-2">
        <PrimaryButton label="This Month" size="small" onClick={() => setPreset('month')} />
        <PrimaryButton label="Last Month" size="small" onClick={() => setPreset('last_month')} />
        <PrimaryButton label="This Quarter" size="small" onClick={() => setPreset('quarter')} />
        <PrimaryButton label="This Year" size="small" onClick={() => setPreset('year')} />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <Input label="From" type="date" value={filters.from} onChange={event => update({ from: event.target.value })} />
        <Input label="To" type="date" value={filters.to} onChange={event => update({ to: event.target.value })} />
        <Select label="Granularity" value={filters.granularity} onChange={event => update({ granularity: event.target.value as ReportFilterState['granularity'] })}>
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </Select>
        {currentUserRole === 'admin' && <Select label="Sales Rep" value={filters.rep_id ?? ''} onChange={event => update({ rep_id: event.target.value || undefined })}>
          <option value="">All Reps</option>
          {salesReps.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
        </Select>}
        {currentUserRole === 'admin' && showLenderFilter && <Select label="Lender/Funder" value={filters.lender_id ?? ''} onChange={event => update({ lender_id: event.target.value || undefined })}>
          <option value="">All Lenders/Funders</option>
          {lenders.map(lender => <option key={lender.id} value={lender.id}>{lender.lenderName}</option>)}
        </Select>}
      </div>
    </div>
  );
};
