import React, { useState } from 'react';
import type { Renewal, RenewalStatus, SalesRepresentative } from '../../../types';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';
import { PrimaryButton } from '../../../src/components/ui/PrimaryButton';
import { ResponsiveModal } from './mobile/ResponsiveModal';

const STATUS_OPTIONS: RenewalStatus[] = ['not_ready', 'eligible', 'contacted', 'application_started', 'submitted', 'renewed', 'declined', 'not_interested'];

interface RenewalModalProps {
  renewal?: Renewal | null;
  merchantId?: string;
  fundingId?: string | null;
  salesReps?: SalesRepresentative[];
  isAdmin?: boolean;
  onClose: () => void;
  onSave: (data: Partial<Renewal> & { merchant_id?: string; eligibility_date?: string }) => Promise<void>;
}

export const RenewalModal: React.FC<RenewalModalProps> = ({ renewal, merchantId, fundingId, salesReps = [], isAdmin = false, onClose, onSave }) => {
  const [form, setForm] = useState({
    eligibility_date: renewal?.eligibility_date ?? new Date().toISOString().slice(0, 10),
    status: renewal?.status ?? 'not_ready',
    estimated_balance: renewal?.estimated_balance ? String(renewal.estimated_balance) : '',
    payoff_amount: renewal?.payoff_amount ? String(renewal.payoff_amount) : '',
    assigned_rep_id: renewal?.assigned_rep_id ?? '',
    last_contacted_at: renewal?.last_contacted_at ? renewal.last_contacted_at.slice(0, 16) : '',
    next_follow_up_at: renewal?.next_follow_up_at ? renewal.next_follow_up_at.slice(0, 16) : '',
    notes: renewal?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        merchant_id: renewal?.merchant_id ?? merchantId,
        funding_id: renewal?.funding_id ?? fundingId ?? null,
        eligibility_date: form.eligibility_date,
        status: form.status as RenewalStatus,
        estimated_balance: form.estimated_balance || null,
        payoff_amount: form.payoff_amount || null,
        assigned_rep_id: form.assigned_rep_id || null,
        last_contacted_at: form.last_contacted_at ? new Date(form.last_contacted_at).toISOString() : null,
        next_follow_up_at: form.next_follow_up_at ? new Date(form.next_follow_up_at).toISOString() : null,
        notes: form.notes || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save renewal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveModal className="max-w-2xl" ariaLabel="Renewal">
        <form onSubmit={submit}>
          <div className="border-b p-6 ">
            <h3 className="text-lg font-black text-main ">{renewal ? 'Update Renewal' : 'Create Renewal'}</h3>
            <p className="mt-1 text-sm text-muted">Track broker-shop renewal follow-up for this funded merchant.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
            <Input label="Eligibility Date" type="date" value={form.eligibility_date} onChange={event => setForm({ ...form, eligibility_date: event.target.value })} required />
            <Select label="Status" value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>
              {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
            </Select>
            <Input label="Estimated Balance" type="number" value={form.estimated_balance} onChange={event => setForm({ ...form, estimated_balance: event.target.value })} />
            <Input label="Payoff Amount" type="number" value={form.payoff_amount} onChange={event => setForm({ ...form, payoff_amount: event.target.value })} />
            {isAdmin && <Select label="Assigned Rep" value={form.assigned_rep_id} onChange={event => setForm({ ...form, assigned_rep_id: event.target.value })}><option value="">Unassigned</option>{salesReps.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</Select>}
            <Input label="Last Contacted" type="datetime-local" value={form.last_contacted_at} onChange={event => setForm({ ...form, last_contacted_at: event.target.value })} />
            <Input label="Next Follow-up" type="datetime-local" value={form.next_follow_up_at} onChange={event => setForm({ ...form, next_follow_up_at: event.target.value })} />
            <div className="md:col-span-2"><Textarea label="Internal Notes" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} rows={3} /></div>
            {error && <p className="md:col-span-2 text-sm font-semibold text-danger dark:text-danger">{error}</p>}
          </div>
          <div className="flex flex-col gap-2 border-t p-4 sm:flex-row sm:justify-end ">
            <PrimaryButton label="Cancel" size="small" variant="danger" onClick={onClose} />
            <PrimaryButton type="submit" label={saving ? 'Saving...' : 'Save Renewal'} size="small" disabled={saving} />
          </div>
        </form>
    </ResponsiveModal>
  );
};
