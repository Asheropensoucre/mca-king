import React, { useEffect, useMemo, useState } from 'react';
import type { AuthUser, Renewal, RenewalStatus, SalesRepresentative } from '../../types';
import { api } from '../../src/lib/api-client';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { MCAKingLoader } from '../../src/components/ui/MCAKingLoader';
import { RenewalModal } from './shared/RenewalModal';

interface RenewalsViewProps {
  currentUser: AuthUser;
  salesReps?: SalesRepresentative[];
}

const STATUSES: Array<RenewalStatus | ''> = ['', 'not_ready', 'eligible', 'contacted', 'application_started', 'submitted', 'renewed', 'declined', 'not_interested'];
const money = (value: number | string | null | undefined) => value ? `$${Number(value).toLocaleString()}` : 'N/A';
const date = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString() : 'N/A';

export const RenewalsView: React.FC<RenewalsViewProps> = ({ currentUser, salesReps = [] }) => {
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [status, setStatus] = useState<RenewalStatus | ''>('');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [assignedRepId, setAssignedRepId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Renewal | null>(null);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      setRenewals(await api.renewals.list({ status, eligible: eligibleOnly ? 'true' : '', assigned_rep_id: currentUser.role === 'admin' ? assignedRepId : '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load renewals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [status, eligibleOnly, assignedRepId]);

  const summary = useMemo(() => ({
    eligible: renewals.filter(item => item.is_eligible).length,
    contacted: renewals.filter(item => item.status === 'contacted').length,
    submitted: renewals.filter(item => item.status === 'submitted').length,
    renewed: renewals.filter(item => item.status === 'renewed').length,
    declined: renewals.filter(item => item.status === 'declined' || item.status === 'not_interested').length,
  }), [renewals]);

  const save = async (data: Partial<Renewal>) => {
    if (!editing) return;
    await api.renewals.update(editing.id, data);
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-theme-maroon dark:text-theme-yellow">Renewals</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Broker-shop queue for funded merchants who may be ready for renewal funding.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric label="Eligible" value={summary.eligible} />
        <Metric label="Contacted" value={summary.contacted} />
        <Metric label="Submitted" value={summary.submitted} />
        <Metric label="Renewed" value={summary.renewed} />
        <Metric label="Declined/Not Interested" value={summary.declined} />
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-3 p-4">
          <Select label="Status" value={status} onChange={event => setStatus(event.target.value as RenewalStatus | '')}>
            {STATUSES.map(item => <option key={item || 'all'} value={item}>{item ? item.replaceAll('_', ' ') : 'All'}</option>)}
          </Select>
          {currentUser.role === 'admin' && <Select label="Assigned Rep" value={assignedRepId} onChange={event => setAssignedRepId(event.target.value)}><option value="">All reps</option>{salesReps.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</Select>}
          <label className="flex items-center gap-2 pb-3 text-sm font-bold text-slate-700 dark:text-slate-300"><input type="checkbox" checked={eligibleOnly} onChange={event => setEligibleOnly(event.target.checked)} /> Eligible only</label>
          <PrimaryButton label="Refresh" size="small" onClick={() => void load()} />
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto p-4">
          {loading ? <MCAKingLoader label="Loading renewals..." size="small" /> : error ? <p className="text-sm text-red-600">{error}</p> : (
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead><tr className="text-left text-xs font-black uppercase tracking-wider text-theme-yellow"><th>Merchant</th><th>Status</th><th>Eligibility</th><th>Funded</th><th>Lender</th><th>Payoff</th><th>Next Follow-up</th><th></th></tr></thead>
              <tbody>
                {renewals.map(renewal => <tr key={renewal.id} className="bg-slate-50 dark:bg-slate-900/50"><td className="px-3 py-3 text-sm font-black text-theme-maroon dark:text-theme-yellow">{renewal.merchant_name ?? 'N/A'}</td><td className="px-3 py-3 text-sm">{renewal.status.replaceAll('_', ' ')}</td><td className="px-3 py-3 text-sm">{date(renewal.eligibility_date)}</td><td className="px-3 py-3 text-sm">{money(renewal.funded_amount)}</td><td className="px-3 py-3 text-sm">{renewal.lender_name ?? 'N/A'}</td><td className="px-3 py-3 text-sm">{money(renewal.payoff_amount)}</td><td className="px-3 py-3 text-sm">{date(renewal.next_follow_up_at)}</td><td className="px-3 py-3 text-right"><PrimaryButton label="Update" size="small" onClick={() => setEditing(renewal)} /></td></tr>)}
                {renewals.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">No renewal records found.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </Card>
      {editing && <RenewalModal renewal={editing} salesReps={salesReps} isAdmin={currentUser.role === 'admin'} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
};

const Metric: React.FC<{ label: string; value: number }> = ({ label, value }) => <Card className="p-4"><p className="text-xs font-black uppercase text-theme-teal">{label}</p><p className="mt-2 text-2xl font-black text-theme-maroon dark:text-theme-yellow">{value}</p></Card>;
