import React, { useState } from 'react';
import type { AuthUser, FormData, LenderInfo, SalesRepresentative } from '../../types';
import { Card } from '../ui/Card';
import { MerchantDetailView } from './shared/MerchantDetailView';
import { DashboardShell } from './shared/DashboardShell';
import { KanbanPipelineView } from './shared/KanbanPipelineView';
import { LeadManager } from './LeadManager';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { Chatbot } from '../Chatbot';

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
    
    const selectedDealCurrent = selectedDeal ? deals.find(deal => deal.id === selectedDeal.id) || selectedDeal : null;

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
                    <MerchantDetailView item={selectedDealCurrent} lenders={lenders} canManageMatches={true} />
                </div>
            ) : (
                <div className={activeSection === 'pipeline' ? 'w-full max-w-none' : 'max-w-7xl mx-auto'}>
                    {activeSection === 'leads' && <LeadManager isAdmin={false} salesReps={salesReps} />}
                    {activeSection === 'deals' && (
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
                                        {deals.length > 0 ? deals.map((deal) => {
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
