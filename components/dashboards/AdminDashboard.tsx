import React, { useEffect, useState } from 'react';
import type { AuthUser, FormData, LenderInfo, ApplicationStatus, SalesRepresentative, PaginatedResponse } from '../../types';
import { Card } from '../ui/Card';
import { MerchantDetailView } from './shared/MerchantDetailView';
import { LenderDetailView } from './shared/LenderDetailView';
import { EditMerchantForm } from './shared/EditMerchantForm';
import { EditLenderForm } from './shared/EditLenderForm';
import { DashboardShell } from './shared/DashboardShell';
import { KanbanPipelineView } from './shared/KanbanPipelineView';
import { APPLICATION_STATUSES } from './shared/applicationStatus';
import { LeadManager } from './LeadManager';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { Chatbot } from '../Chatbot';
import { TaskPanel } from './shared/TaskPanel';
import { AdminFinanceView } from './AdminFinanceView';
import { AdminSettingsPage } from './AdminSettingsPage';
import { RenewalsView } from './RenewalsView';
import { FilterBar } from './shared/FilterBar';
import { SearchBar, type SearchResultSelection } from './shared/SearchBar';
import { api } from '../../src/lib/api-client';

interface AdminDashboardProps { 
    currentUser: AuthUser;
    merchants: FormData[], 
    lenders: LenderInfo[], 
    onExit: () => void,
    themeToggle?: React.ReactNode;
    onUpdateMerchant: (updatedMerchant: FormData) => FormData;
    onUpdateLenderInfo: (data: LenderInfo) => LenderInfo;
    salesReps: SalesRepresentative[],
    onSalesRepCreated: (rep: SalesRepresentative) => void;
    onPrint?: (submission: FormData) => void;
}

type AdminSection = 'leads' | 'merchants' | 'lenders' | 'pipeline' | 'tasks' | 'finance' | 'renewals' | 'settings';

const themedSelectClass = 'w-full rounded-lg border-2 border-theme-yellow bg-slate-950 px-3 py-2 text-sm font-bold text-theme-teal shadow-[4px_4px_0_var(--ct-tertiary-container)] outline-none transition focus:border-theme-teal focus:shadow-[4px_4px_0_var(--ct-secondary-fixed-dim)]';
const headerClass = 'text-left text-xs font-black uppercase tracking-wider text-theme-yellow';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, merchants, lenders, onExit, themeToggle, onUpdateMerchant, onUpdateLenderInfo, salesReps, onSalesRepCreated, onPrint }) => {
    const [activeSection, setActiveSection] = useState<AdminSection>('leads');
    const [selectedItem, setSelectedItem] = useState<FormData | LenderInfo | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [merchantRows, setMerchantRows] = useState<FormData[]>(merchants);
    const [lenderRows, setLenderRows] = useState<LenderInfo[]>(lenders);
    const [merchantFilters, setMerchantFilters] = useState<Record<string, string>>({});
    const [lenderFilters, setLenderFilters] = useState<Record<string, string>>({});
    const [merchantPage, setMerchantPage] = useState(1);
    const [lenderPage, setLenderPage] = useState(1);
    const [merchantTotal, setMerchantTotal] = useState(merchants.length);
    const [lenderTotal, setLenderTotal] = useState(lenders.length);
    const [listError, setListError] = useState<string | null>(null);
    const [leadSearchId, setLeadSearchId] = useState<string | null>(null);

    useEffect(() => setMerchantRows(merchants), [merchants]);
    useEffect(() => setLenderRows(lenders), [lenders]);

    useEffect(() => {
        const params = { ...merchantFilters, page: merchantPage, per_page: 25 };
        api.merchants.listFiltered(params)
            .then((response: PaginatedResponse<FormData>) => { setMerchantRows(response.data); setMerchantTotal(response.total); setListError(null); })
            .catch(err => setListError(err instanceof Error ? err.message : 'Could not load merchants'));
    }, [merchantFilters, merchantPage]);

    useEffect(() => {
        const params = { ...lenderFilters, page: lenderPage, per_page: 25 };
        api.lenders.listFiltered(params)
            .then((response: PaginatedResponse<LenderInfo>) => { setLenderRows(response.data); setLenderTotal(response.total); setListError(null); })
            .catch(err => setListError(err instanceof Error ? err.message : 'Could not load lenders'));
    }, [lenderFilters, lenderPage]);

    const handleSelectItem = (item: FormData | LenderInfo) => {
        setSelectedItem(item);
        setIsEditing(false);
    };
    
    const handleSaveMerchant = (data: FormData) => {
        const updatedData = onUpdateMerchant(data);
        setMerchantRows(prev => prev.map(item => item.id === updatedData.id ? updatedData : item));
        setSelectedItem(updatedData);
        setIsEditing(false);
    };

    const handleSaveLender = (data: LenderInfo) => {
        const updatedData = onUpdateLenderInfo(data);
        setLenderRows(prev => prev.map(item => item.id === updatedData.id ? updatedData : item));
        setSelectedItem(updatedData);
        setIsEditing(false);
    };

    const handleSearchSelect = async (selection: SearchResultSelection) => {
        try {
            if (selection.type === 'merchant') {
                const merchant = await api.merchants.get(selection.id);
                setActiveSection('merchants');
                setSelectedItem(merchant);
            } else if (selection.type === 'lender') {
                const lender = await api.lenders.get(selection.id);
                setActiveSection('lenders');
                setSelectedItem(lender);
            } else {
                setLeadSearchId(selection.id);
                setActiveSection('leads');
            }
        } catch (err) {
            setListError(err instanceof Error ? err.message : 'Could not open search result');
        }
    };

    const renderSelectedItem = () => {
        if (!selectedItem) return null;
        const isMerchant = 'businessInfo' in selectedItem;
        return (
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                    <PrimaryButton label={`← Back to ${activeSection === 'pipeline' ? 'Kamba Pipeline' : 'Directory'}`} size="small" onClick={() => setSelectedItem(null)} />
                    {!isEditing && (
                        <div className="flex items-center gap-2 flex-wrap">
                            {isMerchant && onPrint && (
                                <PrimaryButton label="Download PDF" size="small" onClick={() => onPrint(selectedItem as FormData)} />
                            )}
                            <PrimaryButton label="Edit" size="small" onClick={() => setIsEditing(true)} />
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
                        <MerchantDetailView item={selectedItem as FormData} lenders={lenders} canDeleteDocuments={true} canManageMatches={true} canRemoveMatches={true} currentUser={currentUser} onMerchantFunded={handleSaveMerchant} />
                    ) : (
                        <LenderDetailView item={selectedItem as LenderInfo} />
                    )
                )}
            </div>
        );
    };

    const renderPagination = (page: number, total: number, onPage: (page: number) => void) => {
        const totalPages = Math.max(1, Math.ceil(total / 25));
        return (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm font-black text-theme-maroon dark:text-theme-yellow">
                <PrimaryButton label="Previous" size="small" disabled={page <= 1} onClick={() => onPage(Math.max(1, page - 1))} />
                <span>Page {page} of {totalPages}</span>
                <PrimaryButton label="Next" size="small" disabled={page >= totalPages} onClick={() => onPage(Math.min(totalPages, page + 1))} />
            </div>
        );
    };

    const renderMerchants = () => (
        <div className="space-y-4">
            <FilterBar entityType="merchants" filters={merchantFilters} onFilterChange={(next) => { setMerchantFilters(next); setMerchantPage(1); }} onReset={() => { setMerchantFilters({}); setMerchantPage(1); }} salesReps={salesReps} isAdmin currentUserRole={currentUser.role} />
            <div className="grid grid-cols-12 gap-4 px-4 text-xs font-black uppercase tracking-wider text-theme-yellow">
                <div className="col-span-12 md:col-span-3">Business Name</div>
                <div className="col-span-12 md:col-span-2">Sales Rep</div>
                <div className="col-span-12 md:col-span-2">Monthly Revenue</div>
                <div className="col-span-12 md:col-span-3">Status</div>
                <div className="col-span-12 md:col-span-2 text-right">Action</div>
            </div>
            {merchantRows.length > 0 ? merchantRows.map((sub) => (
                <div key={sub.id} className="grid grid-cols-12 items-center gap-4 rounded-xl border-2 border-theme-maroon/80 bg-white/95 p-4 shadow-[6px_6px_0_var(--ct-primary)] dark:border-theme-yellow/80 dark:bg-dark-card/95 dark:shadow-[6px_6px_0_var(--ct-secondary-fixed-dim)]">
                    <div className="col-span-12 md:col-span-3">
                        <p className="text-sm font-black text-theme-maroon dark:text-theme-yellow">{sub.businessInfo.legalName}</p>
                    </div>
                    <div className="col-span-12 md:col-span-2">
                        <select
                            value={sub.salesRepId || ''}
                            onChange={(e) => onUpdateMerchant({ ...sub, salesRepId: e.target.value || undefined })}
                            className={themedSelectClass}
                            aria-label={`Sales rep for ${sub.businessInfo.legalName}`}
                        >
                            <option value="">Unassigned</option>
                            {salesReps.map(rep => (
                                <option key={rep.id} value={rep.id}>{rep.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-span-12 md:col-span-2">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">${Number(sub.businessInfo.monthlyRevenue).toLocaleString()}</p>
                    </div>
                    <div className="col-span-12 md:col-span-3">
                        <select value={sub.status} onChange={(e) => onUpdateMerchant({ ...sub, status: e.target.value as ApplicationStatus })} className={themedSelectClass}>
                            {APPLICATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="col-span-12 text-right md:col-span-2"><PrimaryButton label="View Details" size="small" onClick={() => handleSelectItem(sub)} /></div>
                </div>
            )) : (
                <Card className="p-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-300">No merchant submissions yet.</Card>
            )}
            {renderPagination(merchantPage, merchantTotal, setMerchantPage)}
        </div>
    );

    const renderLenders = () => (
        <div className="space-y-4">
            <FilterBar entityType="lenders" filters={lenderFilters} onFilterChange={(next) => { setLenderFilters(next); setLenderPage(1); }} onReset={() => { setLenderFilters({}); setLenderPage(1); }} currentUserRole={currentUser.role} />
            <Card>
                <div className="overflow-x-auto p-4">
                    <table className="min-w-full border-separate border-spacing-y-3">
                        <thead><tr><th className={headerClass}>Lender</th><th className={headerClass}>Contact</th><th className={headerClass}>Min Revenue</th><th className="relative"><span className="sr-only">View</span></th></tr></thead>
                        <tbody>
                            {lenderRows.length > 0 ? lenderRows.map((sub) => (
                                <tr key={sub.id} className="rounded-xl bg-slate-950/5 dark:bg-slate-950/40">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-theme-maroon dark:text-theme-yellow">{sub.lenderName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{sub.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{sub.minRevenue}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><PrimaryButton label="View Details" size="small" onClick={() => handleSelectItem(sub)} /></td>
                                </tr>
                            )) : (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">No lender submissions yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
            {renderPagination(lenderPage, lenderTotal, setLenderPage)}
        </div>
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
                { id: 'tasks', label: 'Tasks' },
                { id: 'finance', label: 'Finance' },
                { id: 'renewals', label: 'Renewals' },
                { id: 'settings', label: '⚙ Settings' },
            ]}
            activeSection={activeSection}
            onSectionChange={(section) => { setActiveSection(section); setSelectedItem(null); setIsEditing(false); }}
            onExit={onExit}
            exitLabel="Logout"
            themeToggle={themeToggle}
            settingsSectionId="settings"
        >
            {selectedItem ? renderSelectedItem() : (
                <div className={activeSection === 'pipeline' ? 'w-full max-w-none' : 'max-w-7xl mx-auto'}>
                    <div className="mb-5 rounded-xl border-2 border-theme-maroon/80 bg-white/95 p-4 shadow-[6px_6px_0_var(--ct-primary)] dark:border-theme-yellow/80 dark:bg-dark-card/95 dark:shadow-[6px_6px_0_var(--ct-secondary-fixed-dim)] flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm font-bold text-theme-maroon dark:text-theme-teal">Signed in as {currentUser.full_name ?? currentUser.name ?? currentUser.email}</p>
                            {listError && <p className="mt-1 text-xs font-bold text-red-600 dark:text-red-300">{listError}</p>}
                        </div>
                        <SearchBar onSelectResult={handleSearchSelect} />
                    </div>
                    {activeSection === 'leads' && <LeadManager isAdmin={true} salesReps={salesReps} currentUser={currentUser} initialLeadId={leadSearchId} />}
                    {activeSection === 'merchants' && renderMerchants()}
                    {activeSection === 'lenders' && renderLenders()}
                    {activeSection === 'pipeline' && (
                        <KanbanPipelineView merchants={merchants} lenders={lenders} onUpdateMerchant={onUpdateMerchant} onSelectMerchant={handleSelectItem} />
                    )}
                    {activeSection === 'tasks' && <TaskPanel currentUser={currentUser} title="Tasks" />}
                    {activeSection === 'finance' && <AdminFinanceView />}
                    {activeSection === 'renewals' && <RenewalsView currentUser={currentUser} salesReps={salesReps} />}
                    {activeSection === 'settings' && <AdminSettingsPage currentUser={currentUser} onSalesRepCreated={onSalesRepCreated} />}
                </div>
            )}
        </DashboardShell>
        <Chatbot
            currentUser={currentUser}
            currentPage="Admin Dashboard"
            contextData={{
                activeSection,
                merchantCount: merchants.length,
                lenderCount: lenders.length,
                salesRepCount: salesReps.length,
                selectedItemType: selectedItem ? ('businessInfo' in selectedItem ? 'merchant' : 'lender') : null,
            }}
        />
        </>
    );
};
