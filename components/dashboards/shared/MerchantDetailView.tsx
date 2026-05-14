import React, { useEffect, useMemo, useState } from 'react';
import type { AuthUser, FormData, LenderInfo, LenderMatch } from '../../../types';
import { Card } from '../../ui/Card';
import { SummaryItem } from './SummaryItem';
import { DocumentsPanel } from './DocumentsPanel';
import { api } from '../../../src/lib/api-client';
import { PrimaryButton } from '../../../src/components/ui/PrimaryButton';
import { MCAKingLoader } from '../../../src/components/ui/MCAKingLoader';
import { ActivityTimeline } from './ActivityTimeline';
import { TaskPanel } from './TaskPanel';
import { FundingSummary } from './FundingSummary';
import { FundingModal } from './FundingModal';
import { MerchantFileSubmissionsPanel } from './MerchantFileSubmissionsPanel';
import { RenewalPanel } from './RenewalPanel';
import { PayoffRequestsPanel } from './PayoffRequestsPanel';
import { maskLast4 } from '../../../src/lib/sensitive-data';

interface MerchantDetailViewProps { 
    item: FormData, 
    lenders?: LenderInfo[];
    canDeleteDocuments?: boolean;
    canManageMatches?: boolean;
    canRemoveMatches?: boolean;
    currentUser: AuthUser;
    onMerchantFunded?: (updatedMerchant: FormData) => void;
}

const formatDateTime = (value: string | null): string | null => {
    if (!value) return null;
    return new Date(value).toLocaleString();
};

const matchBadgeClasses = (matchType: LenderMatch['match_type']) => (
    matchType === 'manual'
        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
        : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
);

interface MatchedLendersPanelProps {
    merchantId: string;
    lenders: LenderInfo[];
    canManageMatches: boolean;
    canRemoveMatches: boolean;
}

const MatchedLendersPanel: React.FC<MatchedLendersPanelProps> = ({ merchantId, lenders, canManageMatches, canRemoveMatches }) => {
    const [matches, setMatches] = useState<LenderMatch[]>([]);
    const [selectedLenderId, setSelectedLenderId] = useState('');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadMatches = async () => {
        setLoading(true);
        setError(null);
        try {
            setMatches(await api.matching.list(merchantId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load matched lenders.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void loadMatches(); }, [merchantId]);

    const unmatchedLenders = useMemo(() => {
        const matchedIds = new Set(matches.map(match => match.lender_id));
        return lenders.filter(lender => !matchedIds.has(lender.id));
    }, [lenders, matches]);

    const handleRunAutoMatch = async () => {
        setMessage(null);
        setError(null);
        try {
            const result = await api.matching.run(merchantId);
            setMessage(`Auto-match complete. ${result.matched} lender${result.matched === 1 ? '' : 's'} matched.`);
            await loadMatches();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not run auto-match.');
        }
    };

    const handleNotify = async () => {
        setMessage(null);
        setError(null);
        try {
            const result = await api.matching.notify(merchantId);
            setMessage(`${result.notified} lender${result.notified === 1 ? '' : 's'} marked as notified.`);
            await loadMatches();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not notify lenders.');
        }
    };

    const handleAddManual = async () => {
        if (!selectedLenderId) return;
        setMessage(null);
        setError(null);
        try {
            await api.matching.addManual(merchantId, selectedLenderId);
            setSelectedLenderId('');
            setMessage('Manual lender match added.');
            await loadMatches();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not add manual match.');
        }
    };

    const handleRemove = async (lenderId: string) => {
        setMessage(null);
        setError(null);
        try {
            await api.matching.removeManual(merchantId, lenderId);
            setMessage('Lender match removed.');
            await loadMatches();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not remove match.');
        }
    };

    const allNotified = matches.length > 0 && matches.every(match => match.notified_at);
    const latestNotified = matches
        .map(match => match.notified_at)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null;

    return (
        <Card>
            <div className="p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">Matched Lenders</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Server-side lender matches for this merchant.</p>
                    </div>
                    {canManageMatches && (
                        <div className="flex flex-wrap gap-2">
                            <PrimaryButton label="Run Auto-Match" size="small" onClick={handleRunAutoMatch} />
                            <PrimaryButton label={allNotified && latestNotified ? `Notified ${formatDateTime(latestNotified)}` : 'Notify Lenders'} size="small" variant="funded" onClick={handleNotify} disabled={matches.length === 0} />
                        </div>
                    )}
                </div>

                {message && <p className="mt-4 rounded-md bg-theme-teal/10 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">{message}</p>}
                {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

                {canManageMatches && (
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <select value={selectedLenderId} onChange={event => setSelectedLenderId(event.target.value)} className="block min-w-0 flex-1 rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-theme-yellow dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600">
                            <option value="">Select lender to manually add</option>
                            {unmatchedLenders.map(lender => <option key={lender.id} value={lender.id}>{lender.lenderName}</option>)}
                        </select>
                        <PrimaryButton label="Add" size="small" variant="danger" onClick={handleAddManual} disabled={!selectedLenderId} />
                    </div>
                )}

                <div className="mt-4 space-y-3">
                    {loading ? (
                        <MCAKingLoader label="Loading matched lenders..." size="small" />
                    ) : matches.length > 0 ? matches.map(match => (
                        <div key={match.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-black text-theme-maroon dark:text-theme-yellow">{match.lender?.company_name ?? 'Unknown Lender'}</p>
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${matchBadgeClasses(match.match_type)}`}>{match.match_type}</span>
                                </div>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Contact: {match.lender?.contact_name ?? 'N/A'} · {match.lender?.contact_email ?? 'No email'}</p>
                                {match.notified_at && <p className="mt-1 text-xs text-theme-teal">Notified {formatDateTime(match.notified_at)}</p>}
                            </div>
                            {canRemoveMatches && (
                                <button onClick={() => void handleRemove(match.lender_id)} className="self-start rounded-full px-3 py-1 text-lg leading-none text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40" aria-label="Remove matched lender">×</button>
                            )}
                        </div>
                    )) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No matched lenders yet.</p>
                    )}
                </div>
            </div>
        </Card>
    );
};

export const MerchantDetailView: React.FC<MerchantDetailViewProps> = ({ item, lenders = [], canDeleteDocuments = false, canManageMatches = false, canRemoveMatches = false, currentUser, onMerchantFunded }) => {
    const [showFundingModal, setShowFundingModal] = useState(false);
    const [fundingRefreshKey, setFundingRefreshKey] = useState(0);
    const canMarkFunded = currentUser.role === 'admin' || currentUser.role === 'sales_rep';
    const maskedTaxId = maskLast4(item.businessInfo.taxId);
    const maskDob = (value: string) => value ? '••/••/••••' : '';
    const sensitiveNotice = 'Sensitive owner/tax details are masked by default for dashboard viewing.';

    const handleFunded = (updatedMerchant: FormData) => {
        setFundingRefreshKey(key => key + 1);
        onMerchantFunded?.(updatedMerchant);
    };

    return (
    <div className="space-y-6">
        <Card><div className="p-6"><h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">Business Information</h3><p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{sensitiveNotice}</p><dl className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"><SummaryItem label="Legal Name" value={item.businessInfo.legalName} /><SummaryItem label="DBA Name" value={item.businessInfo.dbaName} /><SummaryItem label="Phone" value={item.businessInfo.phone} /><SummaryItem label="Tax ID" value={maskedTaxId} /><SummaryItem label="Address" value={item.businessInfo.address} /><SummaryItem label="Start Date" value={item.businessInfo.startDate} /><SummaryItem label="Requested Amount" value={`$${Number(item.requestedAmount).toLocaleString()}`} /><SummaryItem label="Avg. Monthly Revenue" value={`$${Number(item.businessInfo.monthlyRevenue).toLocaleString()}`} /><SummaryItem label="Recent NSFs" value={item.businessInfo.recentNSFs} /><SummaryItem label="Industry" value={item.businessInfo.industryType} /></dl></div></Card>
        {item.owners.map((owner, index) => (<Card key={owner.id}><div className="p-6"><h4 className="text-md font-semibold text-slate-700 dark:text-slate-300">Owner #{index + 1}</h4><dl className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"><SummaryItem label="Name" value={owner.name} /><SummaryItem label="Title" value={owner.title} /><SummaryItem label="Email" value={owner.email} /><SummaryItem label="Cell Phone" value={owner.cellPhone} /><SummaryItem label="Home Address" value={owner.homeAddress} /><SummaryItem label="DOB" value={maskDob(owner.dateOfBirth)} /><SummaryItem label="SSN" value={maskLast4(owner.ssn)} /><SummaryItem label="Credit Score" value={owner.creditScore} /><SummaryItem label="Ownership" value={`${owner.ownership}%`} /></dl></div></Card>))}
        
        <DocumentsPanel merchantId={item.id} canDelete={canDeleteDocuments} />

        {(canManageMatches || lenders.length > 0) && (
            <MatchedLendersPanel merchantId={item.id} lenders={lenders} canManageMatches={canManageMatches} canRemoveMatches={canRemoveMatches} />
        )}

        {(currentUser.role === 'admin' || currentUser.role === 'sales_rep') && (
            <MerchantFileSubmissionsPanel merchantId={item.id} currentUser={currentUser} />
        )}

        {(currentUser.role === 'admin' || currentUser.role === 'sales_rep') && (
            <>
                <FundingSummary merchantId={item.id} currentUser={currentUser} refreshKey={fundingRefreshKey} />
                <RenewalPanel merchantId={item.id} currentUser={currentUser} />
                <PayoffRequestsPanel merchantId={item.id} lenders={lenders} currentUser={currentUser} />
                <div className="flex justify-end">
                    <PrimaryButton label={item.status === 'FUNDED' ? 'Add Funding / Renewal' : 'Mark Funded'} variant="funded" onClick={() => setShowFundingModal(true)} disabled={!canMarkFunded} />
                </div>
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <ActivityTimeline entityType="merchant" entityId={item.id} currentUserRole={currentUser.role} />
                    <TaskPanel entityType="merchant" entityId={item.id} currentUser={currentUser} />
                </div>
            </>
        )}
        
        <Card><div className="p-6"><h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">{currentUser.role === 'lender' ? 'Your Offer' : 'Offers'}</h3>
            {item.offers && item.offers.length > 0 ? (
                <ul className="space-y-2 mt-2">
                    {item.offers.map(o => <li key={o.id || o.lenderId} className="text-sm text-slate-700 dark:text-slate-300">{o.lenderName}: ${Number(o.amount).toLocaleString()} for {o.term} days ({o.status})</li>)}
                </ul>
            ) : <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{currentUser.role === 'lender' ? 'You have not sent an offer for this file yet.' : 'No offers yet.'}</p>}
        </div></Card>

        {showFundingModal && (
            <FundingModal merchant={item} lenders={lenders} currentUser={currentUser} onClose={() => setShowFundingModal(false)} onFunded={handleFunded} />
        )}
    </div>
    );
};
