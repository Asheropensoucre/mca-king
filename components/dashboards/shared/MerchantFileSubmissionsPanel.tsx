import React, { useEffect, useState } from 'react';
import type { AuthUser, MerchantFileSubmission, MerchantFileSubmissionStatus } from '../../../types';
import { Card } from '../../ui/Card';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';
import { api } from '../../../src/lib/api-client';
import { PrimaryButton } from '../../../src/components/ui/PrimaryButton';
import { MCAKingLoader } from '../../../src/components/ui/MCAKingLoader';

interface MerchantFileSubmissionsPanelProps {
  merchantId: string;
  currentUser: AuthUser;
}

const STATUSES: { value: MerchantFileSubmissionStatus; label: string }[] = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'no_response', label: 'No Response' },
  { value: 'declined', label: 'Declined' },
  { value: 'offer_received', label: 'Offer Received' },
  { value: 'stips_requested', label: 'Stips Requested' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const statusClasses: Record<MerchantFileSubmissionStatus, string> = {
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  viewed: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  no_response: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  declined: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
  offer_received: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  stips_requested: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  withdrawn: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

const formatDate = (value: string | null): string => value ? new Date(value).toLocaleString() : 'N/A';

export const MerchantFileSubmissionsPanel: React.FC<MerchantFileSubmissionsPanelProps> = ({ merchantId, currentUser }) => {
  const [submissions, setSubmissions] = useState<MerchantFileSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { status: MerchantFileSubmissionStatus; decline_reason: string; notes: string }>>({});

  const canView = currentUser.role === 'admin' || currentUser.role === 'sales_rep';

  const loadSubmissions = async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.merchantFileSubmissions.list({ merchant_id: merchantId });
      setSubmissions(data);
      setDrafts(Object.fromEntries(data.map(item => [item.id, {
        status: item.status,
        decline_reason: item.decline_reason ?? '',
        notes: item.notes ?? '',
      }])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load merchant-file submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadSubmissions(); }, [merchantId, currentUser.role]);

  if (!canView) return null;

  const updateDraft = (id: string, patch: Partial<{ status: MerchantFileSubmissionStatus; decline_reason: string; notes: string }>) => {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const saveSubmission = async (submission: MerchantFileSubmission) => {
    const draft = drafts[submission.id];
    if (!draft) return;
    setMessage(null);
    setError(null);
    try {
      await api.merchantFileSubmissions.update(submission.id, {
        status: draft.status,
        decline_reason: draft.decline_reason || null,
        notes: draft.notes || null,
      });
      await loadSubmissions();
      setMessage('Merchant-file submission updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update merchant-file submission.');
    }
  };

  return (
    <Card>
      <div className="p-6">
        <div>
          <h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">Merchant-File Submissions</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Broker-to-lender/funder package submissions and response outcomes.</p>
        </div>

        {message && <p className="mt-4 rounded-md bg-theme-teal/10 px-3 py-2 text-sm text-theme-teal">{message}</p>}
        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

        {loading ? (
          <div className="mt-4"><MCAKingLoader label="Loading merchant-file submissions..." size="small" /></div>
        ) : submissions.length > 0 ? (
          <div className="mt-4 space-y-4">
            {submissions.map(submission => {
              const draft = drafts[submission.id] ?? { status: submission.status, decline_reason: submission.decline_reason ?? '', notes: submission.notes ?? '' };
              return (
                <div key={submission.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-theme-maroon dark:text-theme-yellow">{submission.lender_name ?? 'Unknown Lender/Funder'}</p>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${statusClasses[submission.status]}`}>{submission.status.replace('_', ' ')}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Contact: {submission.lender_contact_name ?? 'N/A'} · {submission.lender_contact_email ?? 'No email'}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Submitted {formatDate(submission.submitted_at)} · Response {formatDate(submission.response_at)} · Package v{submission.package_version}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Select label="Status" value={draft.status} onChange={event => updateDraft(submission.id, { status: event.target.value as MerchantFileSubmissionStatus })}>
                      {STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
                    </Select>
                    <div className="lg:col-span-2">
                      <Textarea label="Decline Reason" value={draft.decline_reason} onChange={event => updateDraft(submission.id, { decline_reason: event.target.value })} rows={2} />
                    </div>
                    <div className="lg:col-span-3">
                      <Textarea label="Internal Notes" value={draft.notes} onChange={event => updateDraft(submission.id, { notes: event.target.value })} rows={2} />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <PrimaryButton label="Save Submission" size="small" onClick={() => void saveSubmission(submission)} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No merchant-file submissions yet. Use Notify Lenders from the matched lenders panel to create submission tracking records.</p>
        )}
      </div>
    </Card>
  );
};
