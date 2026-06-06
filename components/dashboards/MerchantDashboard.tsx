import React, { useEffect, useMemo, useState } from 'react';
import type { ApplicationStatus, AuthUser, DocumentInfo, FormData, Renewal, Stipulation } from '../../types';
import { Card } from '../ui/Card';
import { DocumentUpload } from '../DocumentUpload';
import { APPLICATION_STATUS_CONFIG, DEFAULT_APPLICATION_STATUS, getStatusIndex } from './shared/applicationStatus';
import { DocumentsPanel } from './shared/DocumentsPanel';
import { EditMerchantForm } from './shared/EditMerchantForm';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { api } from '../../src/lib/api-client';
import { Chatbot } from '../Chatbot';
import { UserSettingsPage } from './shared/UserSettingsPage';

interface MerchantDashboardProps { 
    currentUser: AuthUser;
    submission: FormData, 
    onExit: () => void,
    themeToggle?: React.ReactNode;
    onUpdateMerchant: (updatedMerchant: FormData) => FormData;
    onUpdateOffer: (offerId: string, status: 'Accepted' | 'Rejected') => void 
}

type MerchantFormState = 'not_submitted' | 'submitted' | 'grace_pending' | 'can_reapply';

const TERMINAL_STATUSES: ApplicationStatus[] = [
    'FUNDED',
    'all lenders decline',
    'Declined by funder',
];

function getMerchantFormState(merchant: FormData): MerchantFormState {
    if (!merchant || !merchant.status) return 'not_submitted';

    const isTerminal = TERMINAL_STATUSES.includes(merchant.status);
    if (!isTerminal) return 'submitted';

    const updatedAt = new Date(merchant.updated_at ?? new Date().toISOString());
    const fiveMonthsLater = new Date(updatedAt);
    fiveMonthsLater.setMonth(fiveMonthsLater.getMonth() + 5);
    const now = new Date();

    if (now >= fiveMonthsLater) return 'can_reapply';
    return 'grace_pending';
}

function getMonthsUntilReapply(merchant: FormData): number {
    const updatedAt = new Date(merchant.updated_at ?? new Date().toISOString());
    const fiveMonthsLater = new Date(updatedAt);
    fiveMonthsLater.setMonth(fiveMonthsLater.getMonth() + 5);
    const diffMs = fiveMonthsLater.getTime() - Date.now();
    if (diffMs <= 0) return 0;
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30)));
}

type MerchantFacingStatus = {
    label: string;
    summary: string;
    nextAction: string;
    tone: 'default' | 'action' | 'success' | 'danger';
}

function getMerchantFacingStatus(status: ApplicationStatus, hasPendingOffers: boolean, hasOpenStipulations: boolean): MerchantFacingStatus {
    if (hasOpenStipulations || status === 'more docs requested') {
        return {
            label: 'Additional documents needed',
            summary: 'The broker team needs more information before your file can keep moving.',
            nextAction: 'Upload the requested documents in the stipulations or documents section below.',
            tone: 'action',
        };
    }

    if (hasPendingOffers || status === "one or more lender's sent offer") {
        return {
            label: 'Offer available',
            summary: 'A funding offer is ready for your review.',
            nextAction: 'Review the offer details below and accept or reject the offer when you are ready.',
            tone: 'action',
        };
    }

    switch (status) {
        case 'application & 3 months bank statements in':
            return {
                label: 'Application received',
                summary: 'We have your application and bank statements.',
                nextAction: 'The broker team is reviewing your file. Watch this dashboard for document requests or offers.',
                tone: 'default',
            };
        case 'sent to lender':
            return {
                label: 'Under review',
                summary: 'Your file has been sent to funding partners for review.',
                nextAction: 'No action is needed right now unless the team asks for more documents.',
                tone: 'default',
            };
        case 'all lenders decline':
            return {
                label: 'Not approved at this time',
                summary: 'The available funding partners declined this file.',
                nextAction: 'Contact your broker contact if you have questions about next steps or future eligibility.',
                tone: 'danger',
            };
        case 'Merchant accepts offer':
            return {
                label: 'Offer accepted',
                summary: 'You accepted a funding offer.',
                nextAction: 'The broker team is preparing the next step and will follow up if anything else is needed.',
                tone: 'success',
            };
        case "Merchant Declines Offer's":
            return {
                label: 'Offers declined',
                summary: 'The available offers were declined.',
                nextAction: 'Contact your broker contact if you want to discuss other options or future eligibility.',
                tone: 'danger',
            };
        case 'contract sent':
            return {
                label: 'Contract sent',
                summary: 'Your funding contract has been sent for review.',
                nextAction: 'Review and sign the contract using the instructions provided by the broker team.',
                tone: 'action',
            };
        case 'contract signed':
            return {
                label: 'Contract signed',
                summary: 'Your signed contract is in final review.',
                nextAction: 'No action is needed right now unless the team contacts you.',
                tone: 'success',
            };
        case 'contract declined by the merchant':
            return {
                label: 'Contract declined',
                summary: 'The contract was declined.',
                nextAction: 'Contact your broker contact if you want to review other options.',
                tone: 'danger',
            };
        case 'Declined by funder':
            return {
                label: 'Funding declined',
                summary: 'The funder declined the file after review.',
                nextAction: 'Contact your broker contact if you have questions about the decision or future options.',
                tone: 'danger',
            };
        case 'FUNDED':
            return {
                label: 'Funded',
                summary: 'Your deal has been funded.',
                nextAction: 'You can request renewal review or a payoff letter when eligible.',
                tone: 'success',
            };
        default:
            return {
                label: 'Application in review',
                summary: 'Your application is moving through the broker review process.',
                nextAction: 'Watch this dashboard for document requests, offers, or contract updates.',
                tone: 'default',
            };
    }
}

const statusToneClasses: Record<MerchantFacingStatus['tone'], string> = {
    default: 'border-secondary/50 bg-secondary/10 text-secondary',
    action: 'border-warning/60 bg-warning/15 text-warning',
    success: 'border-success/60 bg-success/15 text-success',
    danger: 'border-danger/60 bg-danger/15 text-danger',
};

const ReadOnlyField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <label className="block">
        <span className="block text-sm font-semibold text-muted">{label}</span>
        <input
            value={value}
            readOnly
            className="mt-1 block w-full cursor-not-allowed rounded-md border-0 border-b-2 border-line bg-surface-muted px-4 py-3 text-base text-muted shadow-sm  -muted/70 "
        />
    </label>
);

const LockedApplicationView: React.FC<{ merchant: FormData }> = ({ merchant }) => (
    <div className="space-y-6 opacity-80">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ReadOnlyField label="Business Legal Name" value={merchant.businessInfo.legalName} />
            <ReadOnlyField label="DBA Name" value={merchant.businessInfo.dbaName} />
            <ReadOnlyField label="Business Address" value={merchant.businessInfo.address} />
            <ReadOnlyField label="Business Phone" value={merchant.businessInfo.phone} />
            <ReadOnlyField label="Requested Funding Amount" value={merchant.requestedAmount ? `$${Number(merchant.requestedAmount).toLocaleString()}` : ''} />
            <ReadOnlyField label="Average Monthly Revenue" value={merchant.businessInfo.monthlyRevenue ? `$${Number(merchant.businessInfo.monthlyRevenue).toLocaleString()}` : ''} />
            <ReadOnlyField label="Industry" value={merchant.businessInfo.industryType} />
            <ReadOnlyField label="Entity Type" value={merchant.businessInfo.entityType} />
        </div>
        {merchant.owners.map((owner, index) => (
            <div key={owner.id} className="rounded-lg border border-line bg-surface-muted p-4  -muted/40">
                <h4 className="mb-4 font-semibold text-main">Owner #{index + 1}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ReadOnlyField label="Name" value={owner.name} />
                    <ReadOnlyField label="Title" value={owner.title} />
                    <ReadOnlyField label="Email" value={owner.email} />
                    <ReadOnlyField label="Ownership" value={owner.ownership ? `${owner.ownership}%` : ''} />
                </div>
            </div>
        ))}
    </div>
);

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({ currentUser, submission, onExit, themeToggle, onUpdateMerchant, onUpdateOffer }) => {
    const currentStatusIndex = getStatusIndex(submission.status);
    const [stipulations, setStipulations] = useState<Stipulation[]>([]);
    const [renewals, setRenewals] = useState<Renewal[]>([]);
    const [renewalMessage, setRenewalMessage] = useState<string | null>(null);
    const [payoffMessage, setPayoffMessage] = useState<string | null>(null);
    const [refreshDocuments, setRefreshDocuments] = useState(0);
    const [isEditingApplication, setIsEditingApplication] = useState(false);
    const [applicationMessage, setApplicationMessage] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const formState = useMemo(() => getMerchantFormState(submission), [submission]);
    const monthsUntilReapply = useMemo(() => getMonthsUntilReapply(submission), [submission]);
    const openStipulations = useMemo(() => stipulations.filter(stip => !stip.is_fulfilled), [stipulations]);
    const hasPendingOffers = useMemo(() => (submission.offers ?? []).some(offer => offer.status === 'Pending'), [submission.offers]);
    const merchantStatus = useMemo(() => getMerchantFacingStatus(submission.status, hasPendingOffers, openStipulations.length > 0), [submission.status, hasPendingOffers, openStipulations]);
    const eligibleRenewal = useMemo(() => renewals.find(renewal => renewal.is_eligible), [renewals]);

    const loadStipulations = async () => {
        setStipulations(await api.stipulations.list(submission.id));
    };

    const loadRenewals = async () => {
        setRenewals(await api.renewals.list({ merchant_id: submission.id, eligible: 'true' }));
    };

    useEffect(() => {
        void loadStipulations().catch(() => undefined);
        void loadRenewals().catch(() => undefined);
    }, [submission.id]);

    const handleStipUpload = async () => {
        await loadStipulations();
        setRefreshDocuments(value => value + 1);
    };

    const handleSaveApplication = (updated: FormData) => {
        const saved = onUpdateMerchant({ ...updated, status: submission.status, offers: submission.offers, matchedLenderIds: submission.matchedLenderIds });
        setIsEditingApplication(false);
        setApplicationMessage('Changes saved. Your application remains under review.');
        return saved;
    };

    const handleApplyAgain = () => {
        const resetApplication: FormData = {
            ...submission,
            status: DEFAULT_APPLICATION_STATUS,
            offers: [],
            matchedLenderIds: [],
            updated_at: new Date().toISOString(),
        };
        onUpdateMerchant(resetApplication);
        setApplicationMessage('Your application has been reset. You can now update it for review.');
        setIsEditingApplication(true);
    };

    const handleRenewalReviewRequest = async () => {
        const renewal = renewals.find(item => item.is_eligible);
        if (!renewal) return;
        try {
            await api.renewals.requestReview(renewal.id);
            setRenewalMessage('Renewal review requested. The broker shop will follow up with you.');
            await loadRenewals();
        } catch (err) {
            setRenewalMessage(err instanceof Error ? err.message : 'Could not request renewal review.');
        }
    };

    const handlePayoffRequest = async () => {
        try {
            await api.payoffRequests.create({ merchant_id: submission.id });
            setPayoffMessage('Payoff letter requested. The broker shop and lender/funder will follow up.');
        } catch (err) {
            setPayoffMessage(err instanceof Error ? err.message : 'Could not request payoff letter.');
        }
    };

    const renderApplicationSection = () => {
        if (isEditingApplication) {
            return (
                <EditMerchantForm
                    initialData={submission}
                    onSave={handleSaveApplication}
                    onCancel={() => setIsEditingApplication(false)}
                />
            );
        }

        return (
            <Card className="mb-6">
                <div className="p-6">
                    <div className="mb-6 text-center">
                        <h2 className="text-xl font-black text-main ">Application Details</h2>
                        {formState === 'submitted' && <p className="mt-2 text-sm text-secondary">Your application has been submitted and is under review.</p>}
                        {formState === 'grace_pending' && <p className="mt-2 text-sm text-warning dark:text-warning">You may reapply in {monthsUntilReapply} month{monthsUntilReapply === 1 ? '' : 's'}.</p>}
                        {formState === 'can_reapply' && <p className="mt-2 text-sm text-secondary">You are eligible to apply again.</p>}
                        {applicationMessage && <p className="mt-2 text-sm text-muted">{applicationMessage}</p>}
                    </div>
                    <LockedApplicationView merchant={submission} />
                    <div className="mt-8 flex justify-center">
                        {formState === 'submitted' && <PrimaryButton label="Edit Application" onClick={() => setIsEditingApplication(true)} />}
                        {formState === 'can_reapply' && <PrimaryButton label="Apply Again" onClick={handleApplyAgain} variant="funded" />}
                    </div>
                </div>
            </Card>
        );
    };

    return (
        <>
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-black text-main ">{showSettings ? 'Settings' : 'My Application Dashboard'}</h1>
                        <p className="text-muted">Welcome, {currentUser.full_name ?? currentUser.name ?? submission.owners[0]?.name ?? 'Valued Client'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
                        {themeToggle}
                        <PrimaryButton label={showSettings ? 'Back to Dashboard' : '⚙ Settings'} size="small" onClick={() => setShowSettings(prev => !prev)} />
                        <PrimaryButton label="Logout" size="small" onClick={onExit} />
                    </div>
                </div>

                {showSettings ? <UserSettingsPage currentUser={currentUser} onLogout={onExit} /> : <>

                <Card className="mb-6 overflow-hidden">
                    <div className="border-b-2 border-line-strong bg-surface-strong/70 px-6 py-4">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-muted">Application Status</p>
                        <h2 className="mt-1 text-2xl font-black text-main">{merchantStatus.label}</h2>
                    </div>
                    <div className="grid gap-4 p-6 lg:grid-cols-[1fr_16rem]">
                        <div>
                            <p className="text-base font-semibold text-main">{merchantStatus.summary}</p>
                            <p className="mt-3 text-sm text-muted">{merchantStatus.nextAction}</p>
                            <p className="mt-4 text-xs font-semibold text-muted">Internal file status: {submission.status}</p>
                        </div>
                        <div className={`rounded-xl border-2 p-4 ${statusToneClasses[merchantStatus.tone]}`}>
                            <p className="text-xs font-black uppercase tracking-wider">What this means</p>
                            <p className="mt-2 text-sm font-bold">
                                {merchantStatus.tone === 'action' && 'Action may be needed from you.'}
                                {merchantStatus.tone === 'success' && 'Your file is moving forward.'}
                                {merchantStatus.tone === 'danger' && 'This file is not moving forward right now.'}
                                {merchantStatus.tone === 'default' && 'The broker team is working on your file.'}
                            </p>
                        </div>
                    </div>
                </Card>

                {renderApplicationSection()}

                {eligibleRenewal && (
                    <Card className="mb-6">
                        <div className="p-6">
                            <h2 className="text-xl font-black text-main ">Renewal Review</h2>
                            <p className="mt-2 text-sm text-muted">You may be eligible for renewal funding. Contact your broker shop to review options.</p>
                            {renewalMessage && <p className="mt-2 text-sm font-semibold text-secondary">{renewalMessage}</p>}
                            <div className="mt-4"><PrimaryButton label="Request Renewal Review" size="small" onClick={() => void handleRenewalReviewRequest()} /></div>
                        </div>
                    </Card>
                )}

                {submission.status === 'FUNDED' && (
                    <Card className="mb-6">
                        <div className="p-6">
                            <h2 className="text-xl font-black text-main ">Early Payoff</h2>
                            <p className="mt-2 text-sm text-muted">If you want to pay off early, request an official payoff letter from your current lender/funder. MCA King tracks the request only; the lender/funder provides the official payoff letter.</p>
                            {payoffMessage && <p className="mt-2 text-sm font-semibold text-secondary">{payoffMessage}</p>}
                            <div className="mt-4"><PrimaryButton label="Request Payoff Letter" size="small" onClick={() => void handlePayoffRequest()} /></div>
                        </div>
                    </Card>
                )}

                <div className="mb-6">
                    <DocumentsPanel key={refreshDocuments} merchantId={submission.id} canUpload={true} title="My Documents" />
                </div>

                <Card className="mb-6">
                    <div className="p-6">
                        <h2 className="text-xl font-black text-main  mb-4">Stipulations</h2>
                        {stipulations.length > 0 ? (
                            <div className="space-y-4">
                                {stipulations.map(stip => (
                                    <div key={stip.id} className="p-4 border border-line rounded-lg">
                                        <div className="flex justify-between gap-3">
                                            <p className="font-medium text-main ">{stip.description}</p>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${stip.is_fulfilled ? 'bg-success/15 text-success dark:bg-success/25 dark:text-success' : 'bg-warning/15 text-warning dark:bg-warning/25 dark:text-warning'}`}>{stip.is_fulfilled ? 'Complete' : 'Needed'}</span>
                                        </div>
                                        {!stip.is_fulfilled && (
                                            <div className="mt-3">
                                                <DocumentUpload onDocumentsChange={(_: DocumentInfo[]) => undefined} merchantId={submission.id} docType="stipulation" stipulationId={stip.id} onUploaded={() => void handleStipUpload()} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-sm text-muted">No additional documents have been requested.</p>}
                    </div>
                </Card>

                <Card>
                    <div className="p-6">
                        <h2 className="text-xl font-black text-main  mb-4">Offers</h2>
                        {submission.offers && submission.offers.length > 0 ? (
                            <div className="space-y-4">
                                {submission.offers.map(offer => (
                                    <div key={offer.id || offer.lenderId} className="p-4 border border-line rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                        <div>
                                            <p className="font-semibold text-main ">{offer.lenderName}</p>
                                            <p className="text-muted ">Amount: <span className="font-medium">${Number(offer.amount).toLocaleString()}</span></p>
                                            <p className="text-muted ">Term: <span className="font-medium">{offer.term} Days</span></p>
                                        </div>
                                        <div className="mt-4 sm:mt-0 flex space-x-2">
                                            {offer.status === 'Pending' ? (
                                                <>
                                                    <PrimaryButton label="Reject" size="small" variant="danger" onClick={() => onUpdateOffer(offer.id || offer.lenderId, 'Rejected')} />
                                                    <PrimaryButton label="Accept" size="small" variant="funded" onClick={() => onUpdateOffer(offer.id || offer.lenderId, 'Accepted')} />
                                                </>
                                            ) : (
                                                <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${offer.status === 'Accepted' ? 'bg-success/15 text-success dark:bg-success/25 dark:text-success' : 'bg-danger/15 text-danger dark:bg-danger/25 dark:text-danger'}`}>{offer.status}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-sm text-muted">No offers have been made yet. You will be notified when an offer is available.</p>}
                    </div>
                </Card>
                </>}
            </div>
        </div>
        <Chatbot
            currentUser={currentUser}
            currentPage="Merchant Dashboard"
            contextData={{
                merchantStatus: submission.status,
                currentStep: currentStatusIndex + 1,
                totalSteps: APPLICATION_STATUS_CONFIG.length,
                offers: submission.offers ?? [],
                openStipulations,
                formState,
                monthsUntilReapply,
            }}
        />
        </>
    );
};
