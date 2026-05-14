import React, { useEffect, useState } from 'react';
import type { AuthUser, Renewal, SalesRepresentative } from '../../../types';
import { api } from '../../../src/lib/api-client';
import { Card } from '../../ui/Card';
import { PrimaryButton } from '../../../src/components/ui/PrimaryButton';
import { MCAKingLoader } from '../../../src/components/ui/MCAKingLoader';
import { RenewalModal } from './RenewalModal';

interface RenewalPanelProps {
  merchantId: string;
  currentUser: AuthUser;
  salesReps?: SalesRepresentative[];
}

const money = (value: number | string | null | undefined) => value ? `$${Number(value).toLocaleString()}` : 'N/A';
const date = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString() : 'N/A';

export const RenewalPanel: React.FC<RenewalPanelProps> = ({ merchantId, currentUser, salesReps = [] }) => {
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Renewal | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      setError(null);
      setRenewals(await api.renewals.list({ merchant_id: merchantId }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load renewals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [merchantId]);

  const save = async (data: Partial<Renewal> & { merchant_id?: string; eligibility_date?: string }) => {
    if (editing) await api.renewals.update(editing.id, data);
    else await api.renewals.create({ ...data, merchant_id: merchantId, eligibility_date: data.eligibility_date ?? new Date().toISOString().slice(0, 10) });
    await load();
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">Renewals</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Broker-shop renewal follow-up after funding.</p>
          </div>
          <PrimaryButton label="Add Follow-Up" size="small" onClick={() => setCreating(true)} />
        </div>
        {loading ? <div className="mt-4"><MCAKingLoader label="Loading renewals..." size="small" /></div> : error ? <p className="mt-4 text-sm text-red-600">{error}</p> : renewals.length > 0 ? (
          <div className="mt-4 space-y-3">
            {renewals.map(renewal => (
              <div key={renewal.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-black text-theme-maroon dark:text-theme-yellow">{renewal.status.replaceAll('_', ' ')}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Eligible: {date(renewal.eligibility_date)} · Lender: {renewal.lender_name ?? 'N/A'}</p>
                  </div>
                  <PrimaryButton label="Update" size="small" onClick={() => setEditing(renewal)} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                  <div><dt className="font-bold text-slate-500">Funded</dt><dd>{money(renewal.funded_amount)}</dd></div>
                  <div><dt className="font-bold text-slate-500">Est. Balance</dt><dd>{money(renewal.estimated_balance)}</dd></div>
                  <div><dt className="font-bold text-slate-500">Payoff</dt><dd>{money(renewal.payoff_amount)}</dd></div>
                  <div><dt className="font-bold text-slate-500">Next Follow-up</dt><dd>{date(renewal.next_follow_up_at)}</dd></div>
                </dl>
                {renewal.notes && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{renewal.notes}</p>}
              </div>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No renewal records yet.</p>}
      </div>
      {(editing || creating) && <RenewalModal renewal={editing} merchantId={merchantId} salesReps={salesReps} isAdmin={currentUser.role === 'admin'} onClose={() => { setEditing(null); setCreating(false); }} onSave={save} />}
    </Card>
  );
};
