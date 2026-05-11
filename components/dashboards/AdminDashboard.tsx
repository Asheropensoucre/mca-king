import React, { useState } from 'react';
import type { AuthUser, FormData, LenderInfo, ApplicationStatus, SalesRepresentative } from '../../types';
import { Card } from '../ui/Card';
import { MerchantDetailView } from './shared/MerchantDetailView';
import { LenderDetailView } from './shared/LenderDetailView';
import { EditMerchantForm } from './shared/EditMerchantForm';
import { EditLenderForm } from './shared/EditLenderForm';
import { DashboardShell } from './shared/DashboardShell';
import { KanbanPipelineView } from './shared/KanbanPipelineView';
import { APPLICATION_STATUSES } from './shared/applicationStatus';
import { LeadManager } from './LeadManager';

interface AdminDashboardProps { 
    currentUser: AuthUser;
    merchants: FormData[], 
    lenders: LenderInfo[], 
    onExit: () => void,
    onUpdateMerchant: (updatedMerchant: FormData) => FormData;
    onUpdateLenderInfo: (data: LenderInfo) => LenderInfo;
    salesReps: SalesRepresentative[],
    onSalesRepCreated: (rep: SalesRepresentative) => void;
    onPrint?: (submission: FormData) => void;
}

type AdminSection = 'leads' | 'merchants' | 'lenders' | 'pipeline';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, merchants, lenders, onExit, onUpdateMerchant, onUpdateLenderInfo, salesReps, onSalesRepCreated, onPrint }) => {
    const [activeSection, setActiveSection] = useState<AdminSection>('leads');
    const [selectedItem, setSelectedItem] = useState<FormData | LenderInfo | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isMatching, setIsMatching] = useState(false);
    const [isCreatingRep, setIsCreatingRep] = useState(false);
    const [repError, setRepError] = useState<string | null>(null);

    const handleSelectItem = (item: FormData | LenderInfo) => {
        setSelectedItem(item);
        setIsEditing(false);
    };
    
    const handleSaveMerchant = (data: FormData) => {
        const updatedData = onUpdateMerchant(data);
        setSelectedItem(updatedData);
        setIsEditing(false);
    };

    const handleSaveLender = (data: LenderInfo) => {
        const updatedData = onUpdateLenderInfo(data);
        setSelectedItem(updatedData);
        setIsEditing(false);
    };

    const handleCreateSalesRep = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setRepError(null);
        const form = new globalThis.FormData(event.currentTarget);
        const full_name = String(form.get('full_name') ?? '').trim();
        const email = String(form.get('email') ?? '').trim();
        const password = String(form.get('password') ?? '');

        if (password.length < 8) {
            setRepError('Password must be at least 8 characters.');
            return;
        }

        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, email, password, role: 'sales_rep' }),
        });

        if (!res.ok) {
            setRepError('Could not create sales rep. Email may already be in use.');
            return;
        }

        const body = await res.json() as { user: AuthUser };
        onSalesRepCreated({
            id: body.user.id,
            email: body.user.email,
            name: body.user.full_name ?? body.user.name ?? body.user.email,
        });
        setIsCreatingRep(false);
    };
    
    const getMatchedLenders = (merchant: FormData) => {
        if (!merchant) return [];
        const merchantState = merchant.businessInfo.address.split(',').pop()?.trim().toUpperCase();
        const highestCreditScore = Math.max(...merchant.owners.map(o => parseInt(o.creditScore, 10)).filter(Boolean));

        return lenders.filter(lender => {
            const meetsRevenue = parseInt(merchant.businessInfo.monthlyRevenue, 10) >= parseInt(lender.minRevenue, 10);
            const meetsCredit = highestCreditScore >= parseInt(lender.minCreditScore, 10);
            const meetsNSFs = parseInt(merchant.businessInfo.recentNSFs, 10) <= parseInt(lender.nsfs, 10);
            const meetsFundingAmount = parseInt(merchant.requestedAmount, 10) <= parseInt(lender.maxFundingAmount, 10);
            const notStateRestricted = !lender.stateRestrictions.toUpperCase().split(',').map(s => s.trim()).includes(merchantState || '');
            const notIndustryRestricted = !lender.industryRestrictions.toLowerCase().includes(merchant.businessInfo.industryType.toLowerCase());
            
            return meetsRevenue && meetsCredit && meetsNSFs && meetsFundingAmount && notStateRestricted && notIndustryRestricted;
        });
    };

    const handleNotifyLender = (lenderId: string) => {
        if (!selectedItem || !('businessInfo' in selectedItem)) return;

        const currentMatchedIds = selectedItem.matchedLenderIds || [];
        if (currentMatchedIds.includes(lenderId)) {
            setIsMatching(false);
            return;
        }

        const updatedMerchant: FormData = {
            ...selectedItem,
            matchedLenderIds: [...currentMatchedIds, lenderId],
            status: 'sent to lender',
        };

        const result = onUpdateMerchant(updatedMerchant);
        setSelectedItem(result);
        setIsMatching(false);
    };

    const renderSelectedItem = () => {
        if (!selectedItem) return null;
        const isMerchant = 'businessInfo' in selectedItem;
        const matchedLenders = isMerchant ? getMatchedLenders(selectedItem as FormData) : [];

        return (
            <>
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                        <button onClick={() => setSelectedItem(null)} className="text-sm font-medium text-theme-teal hover:text-theme-teal/80 text-left">&larr; Back to {activeSection === 'pipeline' ? 'Kamba Pipeline' : 'Directory'}</button>
                        {!isEditing && (
                            <div className="flex items-center gap-2 flex-wrap">
                                {isMerchant && <button onClick={() => setIsMatching(true)} className="px-4 py-2 rounded-md text-sm font-medium text-white bg-theme-maroon hover:bg-theme-maroon/90">Find Matches</button>}
                                {isMerchant && onPrint && (
                                    <button onClick={() => onPrint(selectedItem as FormData)} className="px-4 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-yellow hover:bg-theme-yellow/90">Download PDF</button>
                                )}
                                <button onClick={() => setIsEditing(true)} className="px-4 py-2 rounded-md text-sm font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 dark:text-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600">Edit</button>
                            </div>
                        )}
                    </div>
                    {isEditing ? (
                        isMerchant ? (
                            <EditMerchantForm initialData={selectedItem as FormData} onSave={handleSaveMerchant} onCancel={() => setIsEditing(false)} />
                        ) : (
                            <EditLenderForm initialData={selectedItem as LenderInfo} onSave={handleSaveLender} onCancel={() => setIsEditing(false)} />
                        )
                    ) : (
                        isMerchant ? (
                            <MerchantDetailView item={selectedItem as FormData} lenders={lenders} canDeleteDocuments={true} />
                        ) : (
                            <LenderDetailView item={selectedItem as LenderInfo} />
                        )
                    )}
                </div>
                {isMatching && isMerchant && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Matched Lenders for {(selectedItem as FormData).businessInfo.legalName}</h3>
                                <p className="text-sm text-slate-500">Found {matchedLenders.length} potential matches.</p>
                            </div>
                            <div className="p-6 overflow-y-auto space-y-3">
                                {matchedLenders.length > 0 ? matchedLenders.map(lender => (
                                    <div key={lender.id} className="p-3 border rounded-lg flex justify-between items-center dark:border-slate-700">
                                        <p className="font-semibold text-slate-800 dark:text-slate-100">{lender.lenderName}</p>
                                        <button 
                                            onClick={() => handleNotifyLender(lender.id)} 
                                            className="px-3 py-1 text-sm rounded-md bg-theme-yellow text-black disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:text-slate-500"
                                            disabled={(selectedItem as FormData).matchedLenderIds?.includes(lender.id)}
                                        >
                                            {(selectedItem as FormData).matchedLenderIds?.includes(lender.id) ? 'Notified' : 'Notify Lender'}
                                        </button>
                                    </div>
                                )) : <p className="text-slate-600 dark:text-slate-300">No lenders match the criteria.</p>}
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t flex justify-end">
                                <button onClick={() => setIsMatching(false)} className="px-4 py-2 text-sm rounded-md bg-white border dark:bg-slate-600 dark:border-slate-500 dark:text-slate-200">Close</button>
                            </div>
                        </Card>
                    </div>
                )}
            </>
        );
    };

    const renderMerchants = () => (
        <Card>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-800"><tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"><th>Business Name</th><th>Sales Rep</th><th>Monthly Revenue</th><th>Status</th><th className="relative"><span className="sr-only">View</span></th></tr></thead>
                    <tbody className="bg-white divide-y divide-slate-200 dark:bg-dark-card dark:divide-slate-700">
                        {merchants.length > 0 ? merchants.map((sub) => (
                            <tr key={sub.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{sub.businessInfo.legalName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                    <select
                                        value={sub.salesRepId || ''}
                                        onChange={(e) => onUpdateMerchant({ ...sub, salesRepId: e.target.value || undefined })}
                                        className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-theme-yellow sm:text-sm sm:leading-6 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600"
                                        aria-label={`Sales rep for ${sub.businessInfo.legalName}`}
                                    >
                                        <option value="">Unassigned</option>
                                        {salesReps.map(rep => (
                                            <option key={rep.id} value={rep.id}>{rep.name}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">${Number(sub.businessInfo.monthlyRevenue).toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                    <select value={sub.status} onChange={(e) => onUpdateMerchant({ ...sub, status: e.target.value as ApplicationStatus })} className="block w-72 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-theme-yellow sm:text-sm sm:leading-6 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600">
                                        {APPLICATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => handleSelectItem(sub)} className="text-theme-teal hover:text-theme-teal/80">View Details</button></td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">No merchant submissions yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );

    const renderCreateSalesRepModal = () => (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
                <form onSubmit={handleCreateSalesRep}>
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Create Sales Rep</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create a real login account for a sales representative.</p>
                        <div className="mt-4 space-y-4">
                            <label className="block">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</span>
                                <input name="full_name" type="text" required className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-theme-yellow dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600" />
                            </label>
                            <label className="block">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</span>
                                <input name="email" type="email" required className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-theme-yellow dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600" />
                            </label>
                            <label className="block">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</span>
                                <input name="password" type="password" required minLength={8} className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-theme-yellow dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600" />
                            </label>
                            {repError && <p className="text-sm text-red-600 dark:text-red-300">{repError}</p>}
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t flex justify-end space-x-2">
                        <button type="button" onClick={() => setIsCreatingRep(false)} className="px-4 py-2 text-sm rounded-md bg-white border dark:bg-slate-600 dark:border-slate-500 dark:text-slate-200">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm rounded-md bg-theme-yellow text-black font-semibold">Create Sales Rep</button>
                    </div>
                </form>
            </Card>
        </div>
    );

    const renderLenders = () => (
        <Card>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-800"><tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lender</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Min Revenue</th><th className="relative"><span className="sr-only">View</span></th></tr></thead>
                    <tbody className="bg-white divide-y divide-slate-200 dark:bg-dark-card dark:divide-slate-700">
                        {lenders.length > 0 ? lenders.map((sub) => (
                            <tr key={sub.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{sub.lenderName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{sub.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{sub.minRevenue}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => handleSelectItem(sub)} className="text-theme-teal hover:text-theme-teal/80">View Details</button></td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">No lender submissions yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );

    return (
        <>
        <DashboardShell<AdminSection>
            title="Admin Dashboard"
            sections={[
                { id: 'leads', label: 'Leads' },
                { id: 'merchants', label: 'Merchant Directory' },
                { id: 'lenders', label: 'Lender Directory' },
                { id: 'pipeline', label: 'Kamba Pipeline' },
            ]}
            activeSection={activeSection}
            onSectionChange={(section) => { setActiveSection(section); setSelectedItem(null); setIsEditing(false); }}
            onExit={onExit}
            exitLabel="Logout"
        >
            {selectedItem ? renderSelectedItem() : (
                <div className={activeSection === 'pipeline' ? 'w-full max-w-none' : 'max-w-7xl mx-auto'}>
                    <div className="mb-4 flex justify-between items-center gap-3">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Signed in as {currentUser.full_name ?? currentUser.name ?? currentUser.email}</p>
                        <button onClick={() => setIsCreatingRep(true)} className="px-4 py-2 rounded-md text-sm font-semibold text-theme-black bg-theme-yellow hover:bg-theme-yellow/90">Create Sales Rep</button>
                    </div>
                    {activeSection === 'leads' && <LeadManager isAdmin={true} salesReps={salesReps} />}
                    {activeSection === 'merchants' && renderMerchants()}
                    {activeSection === 'lenders' && renderLenders()}
                    {activeSection === 'pipeline' && (
                        <KanbanPipelineView merchants={merchants} lenders={lenders} onUpdateMerchant={onUpdateMerchant} onSelectMerchant={handleSelectItem} />
                    )}
                </div>
            )}
        </DashboardShell>
        {isCreatingRep && renderCreateSalesRepModal()}
        </>
    );
};
