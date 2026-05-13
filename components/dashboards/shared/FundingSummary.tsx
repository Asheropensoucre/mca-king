import React, { useEffect, useState } from 'react';
import type { AuthUser, Funding } from '../../../types';
import { Card } from '../../ui/Card';
import { api } from '../../../src/lib/api-client';
import { MCAKingLoader } from '../../../src/components/ui/MCAKingLoader';

interface FundingSummaryProps {
  merchantId: string;
  currentUser: AuthUser;
  refreshKey?: number;
}

const money = (value: number | string | null | undefined): string => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? `$${amount.toLocaleString()}` : '$0';
};

const date = (value: string | null | undefined): string => value ? new Date(value).toLocaleDateString() : 'N/A';

export const FundingSummary: React.FC<FundingSummaryProps> = ({ merchantId, currentUser, refreshKey = 0 }) => {
  const [fundings, setFundings] = useState<Funding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'sales_rep') return;
    setLoading(true);
    setError(null);
    api.fundings.list({ merchant_id: merchantId })
      .then(setFundings)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load funding records.'))
      .finally(() => setLoading(false));
  }, [merchantId, currentUser.role, refreshKey]);

  if (currentUser.role !== 'admin' && currentUser.role !== 'sales_rep') return null;

  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">Funding Summary</h3>
        {loading ? (
          <div className="mt-4"><MCAKingLoader label="Loading funding records..." size="small" /></div>
        ) : error ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p>
        ) : fundings.length > 0 ? (
          <div className="mt-4 space-y-3">
            {fundings.map(funding => (
              <div key={funding.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-theme-maroon dark:text-theme-yellow">{money(funding.funded_amount)} funded</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Lender/Funder: {funding.lender_name ?? 'N/A'} · Funded {date(funding.funded_at)}</p>
                  </div>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-800 dark:bg-green-900/50 dark:text-green-200">FUNDED</span>
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                  <div><dt className="font-bold text-slate-500">Payback</dt><dd className="text-slate-800 dark:text-slate-200">{funding.payback_amount ? money(funding.payback_amount) : 'N/A'}</dd></div>
                  <div><dt className="font-bold text-slate-500">Factor</dt><dd className="text-slate-800 dark:text-slate-200">{funding.factor_rate ?? 'N/A'}</dd></div>
                  <div><dt className="font-bold text-slate-500">Term</dt><dd className="text-slate-800 dark:text-slate-200">{funding.term_days ? `${funding.term_days} days` : 'N/A'}</dd></div>
                </dl>
                {funding.notes && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{funding.notes}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No funding record yet.</p>
        )}
      </div>
    </Card>
  );
};
