import React, { useEffect, useState } from 'react';
import type { AuthUser, DocumentInfo, FormData, Stipulation } from '../../types';
import { Card } from '../ui/Card';
import { DocumentUpload } from '../DocumentUpload';
import { APPLICATION_STATUS_CONFIG, getStatusIndex, getStatusThemeClasses } from './shared/applicationStatus';
import { DocumentsPanel } from './shared/DocumentsPanel';
import { api } from '../../src/lib/api-client';

interface MerchantDashboardProps { 
    currentUser: AuthUser;
    submission: FormData, 
    onExit: () => void,
    themeToggle?: React.ReactNode;
    onUpdateOffer: (offerId: string, status: 'Accepted' | 'Rejected') => void 
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({ currentUser, submission, onExit, themeToggle, onUpdateOffer }) => {
    const currentStatusIndex = getStatusIndex(submission.status);
    const [stipulations, setStipulations] = useState<Stipulation[]>([]);
    const [refreshDocuments, setRefreshDocuments] = useState(0);

    const loadStipulations = async () => {
        setStipulations(await api.stipulations.list(submission.id));
    };

    useEffect(() => { void loadStipulations().catch(() => undefined); }, [submission.id]);

    const handleStipUpload = async () => {
        await loadStipulations();
        setRefreshDocuments(value => value + 1);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">My Application Dashboard</h1>
                        <p className="text-slate-500 dark:text-slate-400">Welcome, {currentUser.full_name ?? currentUser.name ?? submission.owners[0]?.name ?? 'Valued Client'}</p>
                    </div>
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                        {themeToggle}
                        <button onClick={onExit} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-theme-teal hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600">Logout</button>
                    </div>
                </div>

                <Card className="mb-6">
                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Application Status</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Current step: <span className="font-semibold text-slate-700 dark:text-slate-200">{submission.status}</span></p>
                            </div>
                            <span className="inline-flex self-start sm:self-auto rounded-full bg-theme-yellow px-3 py-1 text-xs font-bold text-theme-black">
                                Step {currentStatusIndex + 1} of {APPLICATION_STATUS_CONFIG.length}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {APPLICATION_STATUS_CONFIG.map((statusConfig, statusIdx) => {
                                const themeClasses = getStatusThemeClasses(statusConfig.theme);
                                const isCurrent = statusIdx === currentStatusIndex;
                                const isComplete = statusIdx < currentStatusIndex;
                                return (
                                    <div key={statusConfig.label} className={`rounded-lg border p-3 text-xs transition-colors ${isCurrent ? 'border-theme-yellow bg-theme-yellow/20 text-slate-900 dark:text-slate-100' : isComplete ? 'border-theme-teal/40 bg-theme-teal/10 text-slate-700 dark:text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400'}`}>
                                        <div className="flex gap-2 items-start">
                                            <span className={`shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${isCurrent ? 'bg-theme-yellow text-black' : isComplete ? 'bg-theme-teal text-black' : themeClasses.badge}`}>{statusIdx + 1}</span>
                                            <span className="font-semibold leading-snug">{statusConfig.label}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>

                <div className="mb-6">
                    <DocumentsPanel key={refreshDocuments} merchantId={submission.id} canUpload={true} title="My Documents" />
                </div>

                <Card className="mb-6">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Stipulations</h2>
                        {stipulations.length > 0 ? (
                            <div className="space-y-4">
                                {stipulations.map(stip => (
                                    <div key={stip.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                                        <div className="flex justify-between gap-3">
                                            <p className="font-medium text-slate-800 dark:text-slate-200">{stip.description}</p>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${stip.is_fulfilled ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'}`}>{stip.is_fulfilled ? 'Complete' : 'Needed'}</span>
                                        </div>
                                        {!stip.is_fulfilled && (
                                            <div className="mt-3">
                                                <DocumentUpload onDocumentsChange={(_: DocumentInfo[]) => undefined} merchantId={submission.id} docType="stipulation" stipulationId={stip.id} onUploaded={() => void handleStipUpload()} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-sm text-slate-500 dark:text-slate-400">No additional documents have been requested.</p>}
                    </div>
                </Card>

                <Card>
                    <div className="p-6">
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Offers</h2>
                        {submission.offers && submission.offers.length > 0 ? (
                            <div className="space-y-4">
                                {submission.offers.map(offer => (
                                    <div key={offer.id || offer.lenderId} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{offer.lenderName}</p>
                                            <p className="text-slate-600 dark:text-slate-400">Amount: <span className="font-medium">${Number(offer.amount).toLocaleString()}</span></p>
                                            <p className="text-slate-600 dark:text-slate-400">Term: <span className="font-medium">{offer.term} Days</span></p>
                                        </div>
                                        <div className="mt-4 sm:mt-0 flex space-x-2">
                                            {offer.status === 'Pending' ? (
                                                <>
                                                    <button onClick={() => onUpdateOffer(offer.id || offer.lenderId, 'Rejected')} className="px-3 py-1.5 text-xs font-medium rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 dark:hover:bg-slate-500">Reject</button>
                                                    <button onClick={() => onUpdateOffer(offer.id || offer.lenderId, 'Accepted')} className="px-3 py-1.5 text-xs font-medium rounded-md text-theme-black bg-theme-teal hover:bg-theme-teal/90">Accept</button>
                                                </>
                                            ) : (
                                                <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${offer.status === 'Accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'}`}>{offer.status}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-sm text-slate-500 dark:text-slate-400">No offers have been made yet. You will be notified when an offer is available.</p>}
                    </div>
                </Card>
            </div>
        </div>
    );
};
