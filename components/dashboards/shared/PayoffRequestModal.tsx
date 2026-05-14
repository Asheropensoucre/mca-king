import React, { useState } from 'react';
import type { LenderInfo, PayoffRequest, PayoffRequestStatus, Renewal } from '../../../types';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';
import { PrimaryButton } from '../../../src/components/ui/PrimaryButton';

const STATUS_OPTIONS: PayoffRequestStatus[] = ['requested', 'received', 'expired', 'used', 'cancelled'];

interface PayoffRequestModalProps {
  request?: PayoffRequest | null;
  merchantId: string;
  renewals?: Renewal[];
  lenders?: LenderInfo[];
  onClose: () => void;
  onSave: (data: Partial<PayoffRequest> & { merchant_id?: string }) => Promise<void>;
}

export const PayoffRequestModal: React.FC<PayoffRequestModalProps> = ({ request, merchantId, renewals = [], lenders = [], onClose, onSave }) => {
  const [form, setForm] = useState({
    renewal_id: request?.renewal_id ?? '',
    funding_id: request?.funding_id ?? '',
    requested_from_lender_id: request?.requested_from_lender_id ?? '',
    requested_from_name: request?.requested_from_name ?? '',
    payoff_amount: request?.payoff_amount ? String(request.payoff_amount) : '',
    requested_at: request?.requested_at ? request.requested_at.slice(0, 16) : new Date().toISOString().slice(0, 16),
    received_at: request?.received_at ? request.received_at.slice(0, 16) : '',
    expires_at: request?.expires_at ? request.expires_at.slice(0, 16) : '',
    file_document_id: request?.file_document_id ?? '',
    status: request?.status ?? 'requested',
    notes: request?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRenewal = renewals.find(renewal => renewal.id === form.renewal_id);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        merchant_id: request?.merchant_id ?? merchantId,
        renewal_id: form.renewal_id || null,
        funding_id: form.funding_id || selectedRenewal?.funding_id || null,
        requested_from_lender_id: form.requested_from_lender_id || null,
        requested_from_name: form.requested_from_name || null,
        payoff_amount: form.payoff_amount || null,
        requested_at: form.requested_at ? new Date(form.requested_at).toISOString() : new Date().toISOString(),
        received_at: form.received_at ? new Date(form.received_at).toISOString() : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        file_document_id: form.file_document_id || null,
        status: form.status as PayoffRequestStatus,
        notes: form.notes || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save payoff request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit}>
          <div className="border-b p-6 dark:border-slate-700">
            <h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">{request ? 'Update Payoff Request' : 'Request Payoff Letter'}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">MCA King tracks requests only. The official payoff letter must come from the lender/funder.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
            <Select label="Related Renewal" value={form.renewal_id} onChange={event => setForm({ ...form, renewal_id: event.target.value, funding_id: renewals.find(renewal => renewal.id === event.target.value)?.funding_id ?? form.funding_id })}>
              <option value="">None</option>{renewals.map(renewal => <option key={renewal.id} value={renewal.id}>{renewal.merchant_name ?? 'Renewal'} · {renewal.eligibility_date}</option>)}
            </Select>
            <Select label="Requested From Lender/Funder" value={form.requested_from_lender_id} onChange={event => {
              const lender = lenders.find(item => item.id === event.target.value);
              setForm({ ...form, requested_from_lender_id: event.target.value, requested_from_name: lender?.lenderName ?? form.requested_from_name });
            }}>
              <option value="">Other / Manual</option>{lenders.map(lender => <option key={lender.id} value={lender.id}>{lender.lenderName}</option>)}
            </Select>
            <Input label="Requested From Name" value={form.requested_from_name} onChange={event => setForm({ ...form, requested_from_name: event.target.value })} />
            <Input label="Payoff Amount Once Received" type="number" value={form.payoff_amount} onChange={event => setForm({ ...form, payoff_amount: event.target.value })} />
            <Input label="Requested At" type="datetime-local" value={form.requested_at} onChange={event => setForm({ ...form, requested_at: event.target.value })} />
            <Input label="Received At" type="datetime-local" value={form.received_at} onChange={event => setForm({ ...form, received_at: event.target.value })} />
            <Input label="Expires At" type="datetime-local" value={form.expires_at} onChange={event => setForm({ ...form, expires_at: event.target.value })} />
            <Select label="Status" value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>{STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}</Select>
            <Input label="Received Document ID" value={form.file_document_id} onChange={event => setForm({ ...form, file_document_id: event.target.value })} placeholder="Optional document id after upload" />
            <div className="md:col-span-2"><Textarea label="Internal Notes" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} rows={3} /></div>
            {error && <p className="md:col-span-2 text-sm font-semibold text-red-600 dark:text-red-300">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t p-4 dark:border-slate-700">
            <PrimaryButton label="Cancel" size="small" variant="danger" onClick={onClose} />
            <PrimaryButton type="submit" label={saving ? 'Saving...' : 'Save Payoff Request'} size="small" disabled={saving} />
          </div>
        </form>
      </Card>
    </div>
  );
};
