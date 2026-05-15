import React, { useEffect, useState } from 'react';
import type { AuthUser, FormData, LenderInfo, SalesRepresentative, PaginatedResponse } from '../../types';
import { Card } from '../ui/Card';
import { MerchantDetailView } from './shared/MerchantDetailView';
import { DashboardShell } from './shared/DashboardShell';
import { KanbanPipelineView } from './shared/KanbanPipelineView';
import { LeadManager } from './LeadManager';
import { RenewalsView } from './RenewalsView';
import { ReportsView } from './ReportsView';
import { CommunicationsCenter } from './CommunicationsCenter';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { Chatbot } from '../Chatbot';
import { TaskPanel } from './shared/TaskPanel';
import { UserSettingsPage } from './shared/UserSettingsPage';
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

type SalesRepSection = 'leads' | 'deals' | 'pipeline' | 'tasks' | 'renewals' | 'reports' | 'communications' | 'settings';

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
            <div className="mt-4 flex items-center justify-center gap-3 text-sm font-black text-main ">
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
                { id: 'tasks', label: 'Tasks' },
                { id: 'renewals', label: 'Renewals' },
                { id: 'reports', label: 'My Reports' },
                { id: 'communications', label: 'Communications' },
                { id: 'settings', label: '⚙ Settings' },
            ]}
            activeSection={activeSection}
            onSectionChange={(section) => { setActiveSection(section); setSelectedDeal(null); }}
            onExit={onExit}
            themeToggle={themeToggle}
            settingsSectionId="settings"
        >
            {selectedDealCurrent ? (
                <div className="max-w-4xl mx-auto">
                    <PrimaryButton label={`← Back to ${activeSection === 'pipeline' ? 'Kamba Pipeline' : 'My Deals'}`} size="small" onClick={() => setSelectedDeal(null)} />
                    <div className="flex justify-between items-center mb-4 gap-3">
                        <h2 className="text-2xl font-black text-main ">{selectedDealCurrent.businessInfo.legalName}</h2>
                        {onPrint && (
                            <PrimaryButton label="Download PDF" size="small" onClick={() => onPrint(selectedDealCurrent)} />
                        )}
                    </div>
                    <MerchantDetailView item={selectedDealCurrent} lenders={lenders} canManageMatches={true} currentUser={currentUser} onMerchantFunded={(updatedMerchant) => { onUpdateMerchant(updatedMerchant); setSelectedDeal(updatedMerchant); }} />
                </div>
            ) : (
                <div className={activeSection === 'pipeline' ? 'w-full max-w-none' : 'max-w-7xl mx-auto'}>
                    <div className="mb-5 rounded-xl border-2 border-line-strong/80 bg-surface/95 p-4 shadow-[6px_6px_0_var(--ct-primary)] dark:border-accent/80 /95 dark:shadow-[6px_6px_0_var(--ct-secondary-fixed-dim)] flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm font-bold text-main ">Signed in as {currentUser.full_name ?? currentUser.name ?? currentUser.email}</p>
                            {listError && <p className="mt-1 text-xs font-bold text-danger dark:text-danger">{listError}</p>}
                        </div>
                        <SearchBar onSelectResult={handleSearchSelect} />
                    </div>
                    {activeSection === 'leads' && <LeadManager isAdmin={false} salesReps={salesReps} currentUser={currentUser} initialLeadId={leadSearchId} />}
                    {activeSection === 'deals' && (
                        <div>
                            <FilterBar entityType="merchants" filters={dealFilters} onFilterChange={(next) => { setDealFilters(next); setDealPage(1); }} onReset={() => { setDealFilters({}); setDealPage(1); }} currentUserRole={currentUser.role} />
                            <Card>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                    <thead className="bg-primary">
                                        <tr className="text-left text-xs font-black uppercase tracking-wider text-accent">
                                            <th>Business Name</th>
                                            <th>Primary Contact</th>
                                            <th>Contact Info</th>
                                            <th>Status</th>
                                            <th className="relative"><span className="sr-only">View</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-surface divide-y divide-slate-200  dark:divide-slate-700">
                                        {dealRows.length > 0 ? dealRows.map((deal) => {
                                            const primaryOwner = deal.owners[0];
                                            return (
                                                <tr key={deal.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-main">{deal.businessInfo.legalName}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">{primaryOwner?.name || 'N/A'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                                                        {primaryOwner?.cellPhone && <a href={`tel:${primaryOwner.cellPhone}`} className="text-secondary hover:text-secondary/80 block">Call</a>}
                                                        {primaryOwner?.email && <a href={`mailto:${primaryOwner.email}`} className="text-secondary hover:text-secondary/80 block mt-1">Email</a>}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">{deal.status}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><PrimaryButton label="View Details" size="small" onClick={() => setSelectedDeal(deal)} /></td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-muted">You have not been assigned any deals yet.</td></tr>
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
                    {activeSection === 'tasks' && <TaskPanel currentUser={currentUser} title="My Tasks" />}
                    {activeSection === 'renewals' && <RenewalsView currentUser={currentUser} salesReps={salesReps} />}
                    {activeSection === 'reports' && <ReportsView currentUser={currentUser} salesReps={salesReps} lenders={lenders} />}
                    {activeSection === 'communications' && <CommunicationsCenter currentUser={currentUser} />}
                    {activeSection === 'settings' && <UserSettingsPage currentUser={currentUser} onLogout={onExit} />}
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
