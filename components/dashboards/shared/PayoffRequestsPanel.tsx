import React, { useEffect, useState } from 'react';
import type { AuthUser, LenderInfo, PayoffRequest, Renewal } from '../../../types';
import { api } from '../../../src/lib/api-client';
import { Card } from '../../ui/Card';
import { PrimaryButton } from '../../../src/components/ui/PrimaryButton';
import { MCAKingLoader } from '../../../src/components/ui/MCAKingLoader';
import { PayoffRequestModal } from './PayoffRequestModal';
import { DocumentUpload } from '../../DocumentUpload';

interface PayoffRequestsPanelProps {
  merchantId: string;
  lenders?: LenderInfo[];
  currentUser: AuthUser;
  currentLenderId?: string;
  showCreate?: boolean;
}

const money = (value: number | string | null | undefined) => value ? `$${Number(value).toLocaleString()}` : 'N/A';
const date = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString() : 'N/A';

export const PayoffRequestsPanel: React.FC<PayoffRequestsPanelProps> = ({ merchantId, lenders = [], currentUser, currentLenderId, showCreate = true }) => {
  const [requests, setRequests] = useState<PayoffRequest[]>([]);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PayoffRequest | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const requestData = await api.payoffRequests.list({ merchant_id: merchantId });
      setRequests(requestData);
      if (currentUser.role === 'admin' || currentUser.role === 'sales_rep') {
        setRenewals(await api.renewals.list({ merchant_id: merchantId }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load payoff requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [merchantId, currentUser.role]);

  const save = async (data: Partial<PayoffRequest> & { merchant_id?: string }) => {
    if (editing) {
      const payload = currentUser.role === 'sales_rep'
        ? {
            requested_at: data.requested_at,
            requested_from_name: data.requested_from_name,
            status: data.status === 'received' || data.status === 'used' ? editing.status : data.status,
            notes: data.notes,
          }
        : data;
      await api.payoffRequests.update(editing.id, payload);
    } else {
      await api.payoffRequests.create({ ...data, merchant_id: merchantId });
    }
    await load();
  };

  const canOpenEditor = (request: PayoffRequest) => currentUser.role === 'admin' || currentUser.role === 'sales_rep';
  const canUploadPayoff = (request: PayoffRequest) => currentUser.role === 'admin' || (currentUser.role === 'lender' && Boolean(currentLenderId && request.funding_lender_id === currentLenderId));

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">Payoff Requests</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Request payoff letters from current lenders/funders and track the official documents received.</p>
          </div>
          {showCreate && (currentUser.role === 'admin' || currentUser.role === 'sales_rep') && <PrimaryButton label="Request Payoff" size="small" onClick={() => setCreating(true)} />}
        </div>
        {loading ? <div className="mt-4"><MCAKingLoader label="Loading payoff requests..." size="small" /></div> : error ? <p className="mt-4 text-sm text-red-600">{error}</p> : requests.length > 0 ? (
          <div className="mt-4 space-y-3">
            {requests.map(request => (
              <div key={request.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-black text-theme-maroon dark:text-theme-yellow">{request.status}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Requested from: {request.requested_from_name ?? 'N/A'} · Requested {date(request.requested_at)}</p>
                  </div>
                  {canOpenEditor(request) && <PrimaryButton label="Update" size="small" onClick={() => setEditing(request)} />}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                  <div><dt className="font-bold text-slate-500">Payoff</dt><dd>{money(request.payoff_amount)}</dd></div>
                  <div><dt className="font-bold text-slate-500">Received</dt><dd>{date(request.received_at)}</dd></div>
                  <div><dt className="font-bold text-slate-500">Expires</dt><dd>{date(request.expires_at)}</dd></div>
                  <div><dt className="font-bold text-slate-500">Document</dt><dd>{request.document_name ?? request.file_document_id ?? 'N/A'}</dd></div>
                </dl>
                {canUploadPayoff(request) && !request.file_document_id && (
                  <div className="mt-4 rounded-lg border border-dashed border-theme-teal/50 p-3">
                    <p className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">Upload the official payoff letter received from the funding lender/funder.</p>
                    <DocumentUpload onDocumentsChange={() => undefined} merchantId={merchantId} docType="other" payoffRequestId={request.id} onUploaded={() => void load()} />
                  </div>
                )}
                {request.notes && currentUser.role !== 'lender' && currentUser.role !== 'merchant' && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{request.notes}</p>}
              </div>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No payoff requests yet.</p>}
      </div>
      {(editing || creating) && <PayoffRequestModal request={editing} merchantId={merchantId} renewals={renewals} lenders={lenders} onClose={() => { setEditing(null); setCreating(false); }} onSave={save} />}
    </Card>
  );
};
