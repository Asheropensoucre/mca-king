import React from 'react';
import type { RecipientPreview } from '../../../../types';

interface Props { preview: RecipientPreview | null; }

export const CampaignRecipientPreview: React.FC<Props> = ({ preview }) => {
  if (!preview) return null;
  return (
    <div className="rounded-xl border border-line bg-surface-muted p-4  -muted">
      <div className="grid grid-cols-2 gap-3 text-sm font-black md:grid-cols-6">
        <span>Total: {preview.total}</span><span className="text-success">Sendable: {preview.sendable}</span><span>Skipped: {preview.skipped}</span><span>Suppressed: {preview.suppressed}</span><span>Missing Email: {preview.missing_email}</span><span>DNC: {preview.do_not_contact}</span>
      </div>
      <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
        {preview.rows.map(row => (
          <div key={`${row.entity_type}-${row.entity_id}`} className="flex items-center justify-between rounded-lg bg-surface p-2 text-sm ">
            <span className="font-bold text-main">{row.name} <span className="text-xs text-muted">{row.email || 'missing email'}</span></span>
            <span className={row.sendable ? 'font-black text-success' : 'font-black text-danger'}>{row.sendable ? 'Sendable' : row.skip_reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
