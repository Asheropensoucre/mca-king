import React, { useState } from 'react';
import type { FormData, LenderInfo, Offer } from '../../types';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { MerchantDetailView } from './shared/MerchantDetailView';

interface LenderDashboardProps { 
    profile: LenderInfo, 
    merchants: FormData[], 
    onExit: () => void,
    onUpdateMerchant: (updatedMerchant: FormData) => FormData;
}

export const LenderDashboard: React.FC<LenderDashboardProps> = ({ profile, merchants, onExit, onUpdateMerchant }) => {
    const [selectedDeal, setSelectedDeal] = useState<FormData | null>(null);
    const [isCreatingOffer, setIsCreatingOffer] = useState(false);
    const [offerAmount, setOfferAmount] = useState('');
    const [offerTerm, setOfferTerm] = useState('');

    const assignedMerchants = merchants.filter(merchant => 
        merchant.matchedLenderIds?.includes(profile.id)
    );

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

        void import('../../src/lib/api-client').then(({ api }) => api.offers.create(selectedDeal.id, newOffer)).catch(() => undefined);
        const result = onUpdateMerchant(updatedMerchant);
        setSelectedDeal(result);
        setIsCreatingOffer(false);
        setOfferAmount('');
        setOfferTerm('');
    };

    if (selectedDeal) {
        return (
             <div className="p-4 sm:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    <button onClick={() => setSelectedDeal(null)} className="mb-4 text-sm font-medium text-theme-teal hover:text-theme-teal/80">&larr; Back to My Deals</button>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{selectedDeal.businessInfo.legalName}</h2>
                        <button onClick={() => setIsCreatingOffer(true)} className="px-4 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-yellow hover:bg-theme-yellow/90">Create Offer</button>
                    </div>
                    <MerchantDetailView item={selectedDeal} />
                </div>
                {isCreatingOffer && (
                     <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <Card className="w-full max-w-md">
                            <form onSubmit={handleCreateOffer}>
                                <div className="p-6">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Create Offer for {selectedDeal.businessInfo.legalName}</h3>
                                    <div className="mt-4 space-y-4">
                                        <Input label="Offer Amount ($)" name="amount" type="number" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} required />
                                        <Input label="Offer Term (Days)" name="term" type="number" value={offerTerm} onChange={e => setOfferTerm(e.target.value)} required />
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t flex justify-end space-x-2">
                                    <button type="button" onClick={() => setIsCreatingOffer(false)} className="px-4 py-2 text-sm rounded-md bg-white border dark:bg-slate-600 dark:border-slate-500 dark:text-slate-200">Cancel</button>
                                    <button type="submit" className="px-4 py-2 text-sm rounded-md bg-theme-yellow text-black">Send Offer</button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                 <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Lender Dashboard</h1>
                        <p className="text-slate-500 dark:text-slate-400">Welcome, {profile.lenderName}</p>
                    </div>
                    <button onClick={onExit} className="text-sm font-medium text-theme-teal hover:text-theme-teal/80">Exit Dashboard &rarr;</button>
                </div>
                <Card>
                    <div className="p-6">
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Assigned Merchants</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-800"><tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"><th>Business Name</th><th>Requested Amt</th><th>Revenue</th><th>Industry</th><th>Status</th><th></th></tr></thead>
                                <tbody className="bg-white divide-y divide-slate-200 dark:bg-dark-card dark:divide-slate-700">
                                    {assignedMerchants.length > 0 ? assignedMerchants.map((deal) => (
                                        <tr key={deal.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{deal.businessInfo.legalName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">${Number(deal.requestedAmount).toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">${Number(deal.businessInfo.monthlyRevenue).toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{deal.businessInfo.industryType}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{deal.status}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => setSelectedDeal(deal)} className="text-theme-teal hover:text-theme-teal/80">View Details</button></td>
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
    );
};
