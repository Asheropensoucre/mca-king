import React, { useEffect, useState } from 'react';
import type { AuthUser, FormData, LenderInfo, SalesRepresentative, PaginatedResponse } from '../../types';
import { Card } from '../ui/Card';
import { MerchantDetailView } from './shared/MerchantDetailView';
import { DashboardShell } from './shared/DashboardShell';
import { KanbanPipelineView } from './shared/KanbanPipelineView';
import { LeadManager } from './LeadManager';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { Chatbot } from '../Chatbot';
import { TaskPanel } from './shared/TaskPanel';
import { FilterBar } from './shared/FilterBar';
import { SearchBar, type SearchResultSelection } from './shared/SearchBar';
import { api } from '../../src/lib/api-client';

interface SalesRepDashboardProps { 
    currentUser: AuthUser;
    deals: FormData[], 
    rep: SalesRepresentative | undefined, 
    onExit: () => void,
    themeToggle?: React.ReactNode;
    onPrint?: (submission: FormData) => void;
    lenders: LenderInfo[];
    onUpdateMerchant: (updatedMerchant: FormData) => FormData;
    salesReps: SalesRepresentative[];
}

type SalesRepSection = 'leads' | 'deals' | 'pipeline';

export const SalesRepDashboard: React.FC<SalesRepDashboardProps> = ({ currentUser, deals, rep, onExit, themeToggle, onPrint, lenders, onUpdateMerchant, salesReps }) => {
    const [selectedDeal, setSelectedDeal] = useState<FormData | null>(null);
    const [activeSection, setActiveSection] = useState<SalesRepSection>('leads');
    const [dealRows, setDealRows] = useState<FormData[]>(deals);
    const [dealFilters, setDealFilters] = useState<Record<string, string>>({});
    const [dealPage, setDealPage] = useState(1);
    const [dealTotal, setDealTotal] = useState(deals.length);
    const [listError, setListError] = useState<string | null>(null);
    const [leadSearchId, setLeadSearchId] = useState<string | null>(null);

    useEffect(() => setDealRows(deals), [deals]);

    useEffect(() => {
        api.merchants.listFiltered({ ...dealFilters, page: dealPage, per_page: 25 })
            .then((response: PaginatedResponse<FormData>) => { setDealRows(response.data); setDealTotal(response.total); setListError(null); })
            .catch(err => setListError(err instanceof Error ? err.message : 'Could not load deals'));
    }, [dealFilters, dealPage]);
    
    const selectedDealCurrent = selectedDeal ? dealRows.find(deal => deal.id === selectedDeal.id) || deals.find(deal => deal.id === selectedDeal.id) || selectedDeal : null;

    const handleSearchSelect = async (selection: SearchResultSelection) => {
        try {
            if (selection.type === 'merchant') {
                const merchant = await api.merchants.get(selection.id);
                setActiveSection('deals');
                setSelectedDeal(merchant);
            } else if (selection.type === 'lead') {
                setLeadSearchId(selection.id);
                setActiveSection('leads');
            } else {
                setListError('Lender search results are available to admins from the lender directory.');
            }
        } catch (err) {
            setListError(err instanceof Error ? err.message : 'Could not open search result');
        }
    };

    const renderPagination = () => {
        const totalPages = Math.max(1, Math.ceil(dealTotal / 25));
        return (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm font-black text-theme-maroon dark:text-theme-yellow">
                <PrimaryButton label="Previous" size="small" disabled={dealPage <= 1} onClick={() => setDealPage(Math.max(1, dealPage - 1))} />
                <span>Page {dealPage} of {totalPages}</span>
                <PrimaryButton label="Next" size="small" disabled={dealPage >= totalPages} onClick={() => setDealPage(Math.min(totalPages, dealPage + 1))} />
            </div>
        );
    };

    return (
        <>
        <DashboardShell<SalesRepSection>
            title="Sales Rep Dashboard"
            subtitle={`Welcome, ${rep?.name ?? currentUser.full_name ?? currentUser.name ?? currentUser.email}`}
            sections={[
                { id: 'leads', label: 'Leads' },
                { id: 'deals', label: 'My Deals' },
                { id: 'pipeline', label: 'Kamba Pipeline' },
            ]}
            activeSection={activeSection}
            onSectionChange={(section) => { setActiveSection(section); setSelectedDeal(null); }}
            onExit={onExit}
            themeToggle={themeToggle}
        >
            {selectedDealCurrent ? (
                <div className="max-w-4xl mx-auto">
                    <PrimaryButton label={`← Back to ${activeSection === 'pipeline' ? 'Kamba Pipeline' : 'My Deals'}`} size="small" onClick={() => setSelectedDeal(null)} />
                    <div className="flex justify-between items-center mb-4 gap-3">
                        <h2 className="text-2xl font-black text-theme-maroon dark:text-theme-yellow">{selectedDealCurrent.businessInfo.legalName}</h2>
                        {onPrint && (
                            <PrimaryButton label="Download PDF" size="small" onClick={() => onPrint(selectedDealCurrent)} />
                        )}
                    </div>
                    <MerchantDetailView item={selectedDealCurrent} lenders={lenders} canManageMatches={true} currentUser={currentUser} onMerchantFunded={(updatedMerchant) => { onUpdateMerchant(updatedMerchant); setSelectedDeal(updatedMerchant); }} />
                </div>
            ) : (
                <div className={activeSection === 'pipeline' ? 'w-full max-w-none' : 'max-w-7xl mx-auto'}>
                    <div className="mb-5 rounded-xl border-2 border-theme-maroon/80 bg-white/95 p-4 shadow-[6px_6px_0_var(--ct-primary)] dark:border-theme-yellow/80 dark:bg-dark-card/95 dark:shadow-[6px_6px_0_var(--ct-secondary-fixed-dim)] flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm font-bold text-theme-maroon dark:text-theme-teal">Signed in as {currentUser.full_name ?? currentUser.name ?? currentUser.email}</p>
                            {listError && <p className="mt-1 text-xs font-bold text-red-600 dark:text-red-300">{listError}</p>}
                        </div>
                        <SearchBar onSelectResult={handleSearchSelect} />
                    </div>
                    <div className="mb-6">
                        <TaskPanel currentUser={currentUser} title="My Tasks" overview />
                    </div>
                    {activeSection === 'leads' && <LeadManager isAdmin={false} salesReps={salesReps} currentUser={currentUser} initialLeadId={leadSearchId} />}
                    {activeSection === 'deals' && (
                        <div>
                            <FilterBar entityType="merchants" filters={dealFilters} onFilterChange={(next) => { setDealFilters(next); setDealPage(1); }} onReset={() => { setDealFilters({}); setDealPage(1); }} currentUserRole={currentUser.role} />
                            <Card>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                    <thead className="bg-slate-950/90">
                                        <tr className="text-left text-xs font-black uppercase tracking-wider text-theme-yellow">
                                            <th>Business Name</th>
                                            <th>Primary Contact</th>
                                            <th>Contact Info</th>
                                            <th>Status</th>
                                            <th className="relative"><span className="sr-only">View</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200 dark:bg-dark-card dark:divide-slate-700">
                                        {dealRows.length > 0 ? dealRows.map((deal) => {
                                            const primaryOwner = deal.owners[0];
                                            return (
                                                <tr key={deal.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{deal.businessInfo.legalName}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{primaryOwner?.name || 'N/A'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                        {primaryOwner?.cellPhone && <a href={`tel:${primaryOwner.cellPhone}`} className="text-theme-teal hover:text-theme-teal/80 block">Call</a>}
                                                        {primaryOwner?.email && <a href={`mailto:${primaryOwner.email}`} className="text-theme-teal hover:text-theme-teal/80 block mt-1">Email</a>}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{deal.status}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><PrimaryButton label="View Details" size="small" onClick={() => setSelectedDeal(deal)} /></td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">You have not been assigned any deals yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                        {renderPagination()}
                        </div>
                    )}
                    {activeSection === 'pipeline' && (
                        <KanbanPipelineView merchants={deals} lenders={lenders} onUpdateMerchant={onUpdateMerchant} onSelectMerchant={setSelectedDeal} />
                    )}
                </div>
            )}
        </DashboardShell>
        <Chatbot
            currentUser={currentUser}
            currentPage="Sales Rep Dashboard"
            contextData={{
                activeSection,
                assignedDealCount: deals.length,
                selectedDeal: selectedDealCurrent ? { id: selectedDealCurrent.id, businessName: selectedDealCurrent.businessInfo.legalName, status: selectedDealCurrent.status } : null,
            }}
        />
        </>
    );
};
