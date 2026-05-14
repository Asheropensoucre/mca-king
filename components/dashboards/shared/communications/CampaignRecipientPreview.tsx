import React from 'react';
import type { RecipientPreview } from '../../../../types';

interface Props { preview: RecipientPreview | null; }

export const CampaignRecipientPreview: React.FC<Props> = ({ preview }) => {
  if (!preview) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="grid grid-cols-2 gap-3 text-sm font-black md:grid-cols-6">
        <span>Total: {preview.total}</span><span className="text-emerald-700">Sendable: {preview.sendable}</span><span>Skipped: {preview.skipped}</span><span>Suppressed: {preview.suppressed}</span><span>Missing Email: {preview.missing_email}</span><span>DNC: {preview.do_not_contact}</span>
      </div>
      <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
        {preview.rows.map(row => (
          <div key={`${row.entity_type}-${row.entity_id}`} className="flex items-center justify-between rounded-lg bg-white p-2 text-sm dark:bg-slate-950/60">
            <span className="font-bold text-slate-700 dark:text-slate-200">{row.name} <span className="text-xs text-slate-500">{row.email || 'missing email'}</span></span>
            <span className={row.sendable ? 'font-black text-emerald-700' : 'font-black text-red-600'}>{row.sendable ? 'Sendable' : row.skip_reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
