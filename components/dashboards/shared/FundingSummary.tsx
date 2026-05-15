import React, { useEffect, useMemo, useState } from 'react';
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

const fundingLabel = (funding: Funding): string => {
  if (funding.funding_type === 'first_funding') return 'First Funding';
  if (funding.funding_type === 'renewal') return `Renewal #${funding.renewal_number || 1}`;
  return 'Additional Funding';
};

export const FundingSummary: React.FC<FundingSummaryProps> = ({ merchantId, currentUser, refreshKey = 0 }) => {
  const [fundings, setFundings] = useState<Funding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'sales_rep') return;
    setLoading(true);
    setError(null);
    api.fundings.list({ merchant_id: merchantId })
      .then(records => setFundings([...records].sort((a, b) => (a.funding_position ?? 1) - (b.funding_position ?? 1))))
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load funding records.'))
      .finally(() => setLoading(false));
  }, [merchantId, currentUser.role, refreshKey]);

  const totals = useMemo(() => ({
    funded: fundings.reduce((sum, item) => sum + Number(item.funded_amount ?? 0), 0),
    payback: fundings.reduce((sum, item) => sum + Number(item.payback_amount ?? 0), 0),
    count: fundings.length,
  }), [fundings]);

  if (currentUser.role !== 'admin' && currentUser.role !== 'sales_rep') return null;

  return (
    <Card>
      <div className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-main ">Funding Summary</h3>
            <p className="mt-1 text-sm text-muted">Most recent and historical funding records. Merchants can have multiple fundings, renewals, or split positions.</p>
          </div>
          {fundings.length > 0 && <div className="rounded-lg bg-success/10 px-3 py-2 text-right text-xs font-black text-success "><div>Total Funded</div><div className="text-base">{money(totals.funded)}</div></div>}
        </div>
        {loading ? (
          <div className="mt-4"><MCAKingLoader label="Loading funding records..." size="small" /></div>
        ) : error ? (
          <p className="mt-3 text-sm text-danger dark:text-danger">{error}</p>
        ) : fundings.length > 0 ? (
          <div className="mt-4 space-y-3">
            {fundings.map(funding => (
              <div key={funding.id} className="rounded-lg border border-line p-4 ">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-black text-main  ">Position #{funding.funding_position || 1}</span>
                      <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-black text-success dark:bg-success/25 dark:text-success">{fundingLabel(funding)}</span>
                    </div>
                    <p className="mt-2 text-sm font-black text-main ">{money(funding.funded_amount)} funded</p>
                    <p className="mt-1 text-sm text-muted">Lender/Funder: {funding.lender_name ?? 'N/A'} · Funded {date(funding.funded_at)}</p>
                  </div>
                  <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-black text-success dark:bg-success/25 dark:text-success">FUNDED</span>
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                  <div><dt className="font-bold text-muted">Payback</dt><dd className="text-main ">{funding.payback_amount ? money(funding.payback_amount) : 'N/A'}</dd></div>
                  <div><dt className="font-bold text-muted">Factor</dt><dd className="text-main ">{funding.factor_rate ?? 'N/A'}</dd></div>
                  <div><dt className="font-bold text-muted">Term</dt><dd className="text-main ">{funding.term_days ? `${funding.term_days} days` : 'N/A'}</dd></div>
                </dl>
                {funding.notes && <p className="mt-3 text-sm text-muted">{funding.notes}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No funding record yet.</p>
        )}
      </div>
    </Card>
  );
};
