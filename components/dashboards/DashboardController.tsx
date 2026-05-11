import React, { useState, useEffect, useCallback } from 'react';
import type { FormData, LenderInfo, SalesRepresentative } from '../../types';
import { AdminDashboard } from './AdminDashboard';
import { LenderDashboard } from './LenderDashboard';
import { MerchantDashboard } from './MerchantDashboard';
import { SalesRepDashboard } from './SalesRepDashboard';
import { api, setDemoIdentity } from '../../src/lib/api-client';

interface DashboardControllerProps {
    onExit: () => void;
    view: 'admin' | 'lender' | 'merchant' | 'sales_rep';
    currentId: string | null;
    currentSalesRepId?: string | null;
    salesReps?: SalesRepresentative[];
    onPrint?: (submission: FormData) => void;
}

const EMPTY_SALES_REPS: SalesRepresentative[] = [];

export const DashboardController: React.FC<DashboardControllerProps> = ({ onExit, view, currentId, currentSalesRepId, salesReps = EMPTY_SALES_REPS, onPrint }) => {
    const [merchantSubmissions, setMerchantSubmissions] = useState<FormData[]>([]);
    const [lenderSubmissions, setLenderSubmissions] = useState<LenderInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (view === 'admin') {
                setDemoIdentity({ role: 'admin', userId: '00000000-0000-4000-8000-000000000001', email: 'admin@demo.local', name: 'Demo Admin' });
            } else if (view === 'sales_rep' && currentSalesRepId) {
                const rep = salesReps.find(item => item.id === currentSalesRepId);
                setDemoIdentity({ role: 'sales_rep', userId: currentSalesRepId, email: rep?.email, name: rep?.name });
            } else if (view === 'merchant') {
                setDemoIdentity({ role: 'merchant', userId: '00000000-0000-4000-8000-000000000201', email: 'merchant@demo.local', name: 'Demo Merchant' });
            } else if (view === 'lender') {
                setDemoIdentity({ role: 'lender', userId: '00000000-0000-4000-8000-000000000301', email: 'lender@demo.local', name: 'Demo Lender' });
            }

            if (view === 'lender') {
                setDemoIdentity({ role: 'admin', userId: '00000000-0000-4000-8000-000000000001', email: 'admin@demo.local', name: 'Demo Admin' });
                const [merchants, lenders] = await Promise.all([api.merchants.list(), api.lenders.list()]);
                setMerchantSubmissions(merchants);
                setLenderSubmissions(lenders);
                setDemoIdentity({ role: 'lender', userId: '00000000-0000-4000-8000-000000000301', email: 'lender@demo.local', name: 'Demo Lender' });
            } else {
                const [merchants, lenders] = await Promise.all([
                    view === 'lender' ? Promise.resolve([]) : api.merchants.list(),
                    view === 'merchant' ? Promise.resolve([]) : api.lenders.list(),
                ]);
                setMerchantSubmissions(merchants);
                setLenderSubmissions(lenders);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load dashboard data.');
        } finally {
            setLoading(false);
        }
    }, [currentSalesRepId, salesReps, view]);

    useEffect(() => { void loadData(); }, [loadData]);

    const handleUpdateMerchant = (updatedSubmission: FormData): FormData => {
        setMerchantSubmissions(prev => prev.map(sub => sub.id === updatedSubmission.id ? updatedSubmission : sub));
        void api.merchants.update(updatedSubmission).then(saved => {
            setMerchantSubmissions(prev => prev.map(sub => sub.id === saved.id ? saved : sub));
        }).catch(err => setError(err instanceof Error ? err.message : 'Could not update merchant.'));
        return updatedSubmission;
    };
    
    const handleUpdateLenderInfo = (updatedLender: LenderInfo): LenderInfo => {
        setLenderSubmissions(prev => prev.map(lender => lender.id === updatedLender.id ? updatedLender : lender));
        void api.lenders.update(updatedLender).then(saved => {
            setLenderSubmissions(prev => prev.map(lender => lender.id === saved.id ? saved : lender));
        }).catch(err => setError(err instanceof Error ? err.message : 'Could not update lender.'));
        return updatedLender;
    };
    
    const handleUpdateOffer = (merchantId: string, offerId: string, status: 'Accepted' | 'Rejected') => {
        const target = merchantSubmissions.find(sub => sub.id === merchantId);
        if (!target) return;
        const updated = {
            ...target,
            offers: target.offers.map(offer => offer.id === offerId || offer.lenderId === offerId ? { ...offer, status } : offer),
            status: status === 'Accepted' ? 'Merchant accepts offer' as const : target.status,
        };
        setMerchantSubmissions(prev => prev.map(sub => sub.id === merchantId ? updated : sub));
        void api.offers.update(offerId, status).then(() => loadData()).catch(err => setError(err instanceof Error ? err.message : 'Could not update offer.'));
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading dashboard...</div>;
    }

    if (error) {
        return <div className="p-8 text-center"><p className="text-red-600 dark:text-red-300">{error}</p><button onClick={onExit} className="mt-4 px-6 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-yellow">Back</button></div>;
    }

    if (view === 'admin') {
        return <AdminDashboard 
            merchants={merchantSubmissions} 
            lenders={lenderSubmissions} 
            onExit={onExit}
            onUpdateMerchant={handleUpdateMerchant}
            onUpdateLenderInfo={handleUpdateLenderInfo}
            salesReps={salesReps}
            onPrint={onPrint}
        />;
    }

    if (view === 'merchant' && currentId) {
        const submission = merchantSubmissions.find(s => s.id === currentId);
        if (submission) {
            return <MerchantDashboard submission={submission} onExit={onExit} onUpdateOffer={(offerId, status) => handleUpdateOffer(submission.id, offerId, status)} />;
        }
    }
    
    if (view === 'lender' && currentId) {
        const profile = lenderSubmissions.find(l => l.id === currentId);
        if (profile) {
            return <LenderDashboard profile={profile} merchants={merchantSubmissions} onExit={onExit} onUpdateMerchant={handleUpdateMerchant} />;
        }
    }

    if (view === 'sales_rep' && currentSalesRepId) {
        const repDeals = merchantSubmissions.filter(m => m.salesRepId === currentSalesRepId);
        const currentRep = salesReps.find(r => r.id === currentSalesRepId);
        return <SalesRepDashboard deals={repDeals} rep={currentRep} onExit={onExit} onPrint={onPrint} lenders={lenderSubmissions} onUpdateMerchant={handleUpdateMerchant} salesReps={salesReps} />;
    }

    return (
         <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto text-center">
                 <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Error</h1>
                 <p className="text-slate-500 dark:text-slate-400 mt-4">Could not load the requested dashboard. Please try again.</p>
                 <button onClick={onExit} className="mt-6 px-6 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-yellow hover:bg-theme-yellow/90">Back to Main</button>
            </div>
        </div>
    );
};
