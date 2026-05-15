import React from 'react';
import type { ApplicationStatus, SalesRepresentative, SavedViewEntityType } from '../../../types';
import { PrimaryButton } from '../../../src/components/ui/PrimaryButton';
import { APPLICATION_STATUSES } from './applicationStatus';
import { SavedViewsMenu } from './SavedViewsMenu';

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
const LEAD_STATUSES = ['new', 'contacted', 'docs_requested', 'converted', 'dead'];
const TASK_STATUSES = ['open', 'completed', 'cancelled'];
const PRIORITIES = ['urgent', 'high', 'normal', 'low'];

interface FilterBarProps {
  entityType: SavedViewEntityType;
  filters: Record<string, string>;
  onFilterChange: (filters: Record<string, string>) => void;
  onReset: () => void;
  salesReps?: SalesRepresentative[];
  isAdmin?: boolean;
  currentUserRole: 'admin' | 'sales_rep' | 'merchant' | 'lender';
}

const inputClass = 'rounded-lg border-2 border-secondary/50 bg-surface px-3 py-2 text-sm font-semibold text-main outline-none focus:border-accent -muted ';

export const FilterBar: React.FC<FilterBarProps> = ({ entityType, filters, onFilterChange, onReset, salesReps = [], isAdmin = false, currentUserRole }) => {
  const setFilter = (key: string, value: string) => {
    const next = { ...filters };
    if (value) next[key] = value;
    else delete next[key];
    onFilterChange(next);
  };

  return (
    <div className="mb-4 rounded-xl border-2 border-line-strong/70 bg-surface/95 p-4 shadow-[5px_5px_0_var(--ct-primary)] dark:border-accent/70 /95 dark:shadow-[5px_5px_0_var(--ct-secondary-fixed-dim)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          {(entityType === 'merchants' || entityType === 'leads' || entityType === 'lenders') && (
            <label className="min-w-48 flex-1 text-xs font-black uppercase tracking-wider text-secondary">
              Search
              <input value={filters.search ?? ''} onChange={event => setFilter('search', event.target.value)} className={`${inputClass} mt-1 w-full`} placeholder={`Search ${entityType}`} />
            </label>
          )}

          {entityType === 'merchants' && (
            <>
              <Select label="Status" value={filters.status ?? ''} onChange={value => setFilter('status', value)} options={APPLICATION_STATUSES.map((status: ApplicationStatus) => ({ value: status, label: status }))} />
              <Select label="State" value={filters.state ?? ''} onChange={value => setFilter('state', value)} options={STATES.map(state => ({ value: state, label: state }))} />
              {isAdmin && <RepSelect value={filters.rep_id ?? ''} reps={salesReps} onChange={value => setFilter('rep_id', value)} />}
              <Checkbox label="Stale (3+ days)" checked={filters.stale === 'true'} onChange={checked => setFilter('stale', checked ? 'true' : '')} />
            </>
          )}

          {entityType === 'leads' && (
            <>
              <Select label="Status" value={filters.status ?? ''} onChange={value => setFilter('status', value)} options={LEAD_STATUSES.map(status => ({ value: status, label: status.replace('_', ' ') }))} />
              {isAdmin && <RepSelect value={filters.assigned_rep_id ?? ''} reps={salesReps} onChange={value => setFilter('assigned_rep_id', value)} />}
            </>
          )}

          {entityType === 'lenders' && <Select label="Active" value={filters.active ?? ''} onChange={value => setFilter('active', value)} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} />}

          {entityType === 'tasks' && (
            <>
              <Select label="Status" value={filters.status ?? ''} onChange={value => setFilter('status', value)} options={TASK_STATUSES.map(status => ({ value: status, label: status }))} />
              <Select label="Priority" value={filters.priority ?? ''} onChange={value => setFilter('priority', value)} options={PRIORITIES.map(priority => ({ value: priority, label: priority }))} />
              <Checkbox label="Overdue" checked={filters.overdue === 'true'} onChange={checked => setFilter('overdue', checked ? 'true' : '')} />
            </>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <PrimaryButton label="Reset" size="small" variant="danger" onClick={onReset} />
          <SavedViewsMenu entityType={entityType} filters={filters} currentUserRole={currentUserRole} onLoadView={view => onFilterChange(view.filters)} />
        </div>
      </div>
    </div>
  );
};

const Select: React.FC<{ label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }> = ({ label, value, options, onChange }) => (
  <label className="w-full text-xs font-black uppercase tracking-wider text-secondary sm:min-w-40 sm:w-auto">
    {label}
    <select value={value} onChange={event => onChange(event.target.value)} className={`${inputClass} mt-1 w-full`}>
      <option value="">All</option>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>
);

const RepSelect: React.FC<{ value: string; reps: SalesRepresentative[]; onChange: (value: string) => void }> = ({ value, reps, onChange }) => (
  <label className="w-full text-xs font-black uppercase tracking-wider text-secondary sm:min-w-44 sm:w-auto">
    Rep
    <select value={value} onChange={event => onChange(event.target.value)} className={`${inputClass} mt-1 w-full`}>
      <option value="">All</option>
      {reps.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
    </select>
  </label>
);

const Checkbox: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 rounded-lg border-2 border-secondary/40 px-3 py-2 text-sm font-black text-main ">
    <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
    {label}
  </label>
);
