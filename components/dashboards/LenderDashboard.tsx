import React, { useState } from 'react';
import type { AuthUser, FormData, LenderInfo, Offer } from '../../types';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { MerchantDetailView } from './shared/MerchantDetailView';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { api } from '../../src/lib/api-client';
import { Chatbot } from '../Chatbot';

interface LenderDashboardProps { 
    currentUser: AuthUser;
    profile: LenderInfo, 
    merchants: FormData[], 
    onExit: () => void,
    themeToggle?: React.ReactNode;
    onUpdateMerchant: (updatedMerchant: FormData) => FormData;
}

export const LenderDashboard: React.FC<LenderDashboardProps> = ({ currentUser, profile, merchants, onExit, themeToggle, onUpdateMerchant }) => {
    const [selectedDeal, setSelectedDeal] = useState<FormData | null>(null);
    const [isCreatingOffer, setIsCreatingOffer] = useState(false);
    const [isRequestingDoc, setIsRequestingDoc] = useState(false);
    const [offerAmount, setOfferAmount] = useState('');
    const [offerTerm, setOfferTerm] = useState('');
    const [stipDescription, setStipDescription] = useState('');
    const [message, setMessage] = useState<string | null>(null);

    const assignedMerchants = merchants;

    const handleCreateOffer = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDeal) return;

        const newOffer: Offer = {
            id: crypto.randomUUID(),
            lenderId: profile.id,
            lenderName: profile.lenderName,
            amount: offerAmount,
            term: offerTerm,
            status: 'Pending',
        };

        const updatedMerchant: FormData = {
            ...selectedDeal,
            offers: [...(selectedDeal.offers || []), newOffer],
            status: "one or more lender's sent offer",
        };

        void api.offers.create(selectedDeal.id, newOffer).catch(() => undefined);
        const result = onUpdateMerchant(updatedMerchant);
        setSelectedDeal(result);
        setIsCreatingOffer(false);
        setOfferAmount('');
        setOfferTerm('');
    };

    const handleRequestDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDeal || !stipDescription.trim()) return;
        try {
            await api.stipulations.create(selectedDeal.id, profile.id, stipDescription);
            const updatedMerchant: FormData = { ...selectedDeal, status: 'more docs requested' };
            const result = onUpdateMerchant(updatedMerchant);
            setSelectedDeal(result);
            setMessage('Document request sent.');
            setStipDescription('');
            setIsRequestingDoc(false);
        } catch (err) {
            setMessage(err instanceof Error ? err.message : 'Could not request document.');
        }
    };

    if (selectedDeal) {
        return (
             <>
             <div className="p-4 sm:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    <PrimaryButton label="← Back to My Deals" size="small" onClick={() => setSelectedDeal(null)} />
                    <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
                        <h2 className="text-2xl font-black text-theme-maroon dark:text-theme-yellow">{selectedDeal.businessInfo.legalName}</h2>
                        <div className="flex gap-2 flex-wrap">
                            <PrimaryButton label="Request Document" variant="danger" onClick={() => setIsRequestingDoc(true)} />
                            <PrimaryButton label="Create Offer" onClick={() => setIsCreatingOffer(true)} />
                        </div>
                    </div>
                    {message && <p className="mb-4 text-sm text-theme-teal">{message}</p>}
                    <MerchantDetailView item={selectedDeal} />
                </div>
                {isCreatingOffer && (
                     <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <Card className="w-full max-w-md">
                            <form onSubmit={handleCreateOffer}>
                                <div className="p-6">
                                    <h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">Create Offer for {selectedDeal.businessInfo.legalName}</h3>
                                    <div className="mt-4 space-y-4">
                                        <Input label="Offer Amount ($)" name="amount" type="number" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} required />
                                        <Input label="Offer Term (Days)" name="term" type="number" value={offerTerm} onChange={e => setOfferTerm(e.target.value)} required />
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t flex justify-end space-x-2">
                                    <PrimaryButton label="Cancel" size="small" variant="danger" onClick={() => setIsCreatingOffer(false)} />
                                    <PrimaryButton type="submit" label="Send Offer" onClick={() => undefined} />
                                </div>
                            </form>
                        </Card>
                    </div>
                )}
                {isRequestingDoc && (
                     <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <Card className="w-full max-w-md">
                            <form onSubmit={handleRequestDocument}>
                                <div className="p-6">
                                    <h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">Request Document</h3>
                                    <div className="mt-4">
                                        <Textarea label="What document is needed?" name="description" value={stipDescription} onChange={e => setStipDescription(e.target.value)} required />
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t flex justify-end space-x-2">
                                    <PrimaryButton label="Cancel" size="small" variant="danger" onClick={() => setIsRequestingDoc(false)} />
                                    <PrimaryButton type="submit" label="Send Request" onClick={() => undefined} />
                                </div>
                            </form>
                        </Card>
                    </div>
                )}
            </div>
            <Chatbot
                currentUser={currentUser}
                currentPage="Lender Dashboard"
                contextData={{
                    lenderProfile: { id: profile.id, lenderName: profile.lenderName, minRevenue: profile.minRevenue, maxFundingAmount: profile.maxFundingAmount, minCreditScore: profile.minCreditScore },
                    selectedDeal: selectedDeal ? { id: selectedDeal.id, businessName: selectedDeal.businessInfo.legalName, status: selectedDeal.status, offers: selectedDeal.offers ?? [] } : null,
                }}
            />
            </>
        );
    }

    return (
        <>
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                 <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-black text-theme-maroon dark:text-theme-yellow">Lender Dashboard</h1>
                        <p className="text-slate-500 dark:text-slate-400">Welcome, {currentUser.full_name ?? currentUser.name ?? profile.lenderName}</p>
                    </div>
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                        {themeToggle}
                        <PrimaryButton label="Logout" size="small" onClick={onExit} />
                    </div>
                </div>
                <Card>
                    <div className="p-6">
                        <h2 className="text-xl font-black text-theme-maroon dark:text-theme-yellow mb-4">Assigned Merchants</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead className="bg-slate-950/90"><tr className="text-left text-xs font-black uppercase tracking-wider text-theme-yellow"><th>Business Name</th><th>Requested Amt</th><th>Revenue</th><th>Industry</th><th>Status</th><th></th></tr></thead>
                                <tbody className="bg-white divide-y divide-slate-200 dark:bg-dark-card dark:divide-slate-700">
                                    {assignedMerchants.length > 0 ? assignedMerchants.map((deal) => (
                                        <tr key={deal.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{deal.businessInfo.legalName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">${Number(deal.requestedAmount).toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">${Number(deal.businessInfo.monthlyRevenue).toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{deal.businessInfo.industryType}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{deal.status}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><PrimaryButton label="View Details" size="small" onClick={() => setSelectedDeal(deal)} /></td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">No merchants have been assigned to you yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
        <Chatbot
            currentUser={currentUser}
            currentPage="Lender Dashboard"
            contextData={{
                lenderProfile: { id: profile.id, lenderName: profile.lenderName, minRevenue: profile.minRevenue, maxFundingAmount: profile.maxFundingAmount, minCreditScore: profile.minCreditScore },
                assignedMerchantCount: assignedMerchants.length,
                assignedMerchants: assignedMerchants.map(merchant => ({ id: merchant.id, businessName: merchant.businessInfo.legalName, status: merchant.status })),
            }}
        />
        </>
    );
};
