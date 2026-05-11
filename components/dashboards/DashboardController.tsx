import React, { useState, useEffect, useCallback } from 'react';
import type { AuthUser, FormData, LenderInfo, SalesRepresentative } from '../../types';
import { AdminDashboard } from './AdminDashboard';
import { LenderDashboard } from './LenderDashboard';
import { MerchantDashboard } from './MerchantDashboard';
import { SalesRepDashboard } from './SalesRepDashboard';
import { api } from '../../src/lib/api-client';

interface DashboardControllerProps {
    currentUser: AuthUser;
    onLogout: () => void;
    themeToggle?: React.ReactNode;
    onPrint?: (submission: FormData) => void;
}

export const DashboardController: React.FC<DashboardControllerProps> = ({ currentUser, onLogout, themeToggle, onPrint }) => {
    const [merchantSubmissions, setMerchantSubmissions] = useState<FormData[]>([]);
    const [lenderSubmissions, setLenderSubmissions] = useState<LenderInfo[]>([]);
    const [salesReps, setSalesReps] = useState<SalesRepresentative[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [merchants, lenders, reps] = await Promise.all([
                api.merchants.list(),
                currentUser.role === 'merchant' ? Promise.resolve([]) : api.lenders.list(),
                currentUser.role === 'admin' || currentUser.role === 'sales_rep' ? api.users.salesReps() : Promise.resolve([]),
            ]);
            setMerchantSubmissions(merchants);
            setLenderSubmissions(lenders);
            setSalesReps(reps);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load dashboard data.');
        } finally {
            setLoading(false);
        }
    }, [currentUser.role]);

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

    const handleSalesRepCreated = (rep: SalesRepresentative) => {
        setSalesReps(prev => prev.some(item => item.id === rep.id) ? prev : [...prev, rep]);
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading dashboard...</div>;
    }

    if (error) {
        return <div className="p-8 text-center"><p className="text-red-600 dark:text-red-300">{error}</p><button onClick={onLogout} className="mt-4 px-6 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-yellow">Logout</button></div>;
    }

    if (currentUser.role === 'admin') {
        return <AdminDashboard 
            currentUser={currentUser}
            merchants={merchantSubmissions} 
            lenders={lenderSubmissions} 
            onExit={onLogout}
            themeToggle={themeToggle}
            onUpdateMerchant={handleUpdateMerchant}
            onUpdateLenderInfo={handleUpdateLenderInfo}
            salesReps={salesReps}
            onSalesRepCreated={handleSalesRepCreated}
            onPrint={onPrint}
        />;
    }

    if (currentUser.role === 'merchant') {
        const submission = merchantSubmissions[0];
        if (submission) {
            return <MerchantDashboard currentUser={currentUser} submission={submission} onExit={onLogout} themeToggle={themeToggle} onUpdateOffer={(offerId, status) => handleUpdateOffer(submission.id, offerId, status)} />;
        }
    }
    
    if (currentUser.role === 'lender') {
        const profile = lenderSubmissions[0];
        if (profile) {
            const [merchants] = merchantSubmissions.length > 0 ? [merchantSubmissions] : [[]];
            return <LenderDashboard currentUser={currentUser} profile={profile} merchants={merchants} onExit={onLogout} themeToggle={themeToggle} onUpdateMerchant={handleUpdateMerchant} />;
        }
    }

    if (currentUser.role === 'sales_rep') {
        const repDeals = merchantSubmissions.filter(m => m.salesRepId === currentUser.id);
        const currentRep = salesReps.find(r => r.id === currentUser.id) ?? {
            id: currentUser.id,
            name: currentUser.full_name ?? currentUser.name ?? currentUser.email,
            email: currentUser.email,
        };
        return <SalesRepDashboard currentUser={currentUser} deals={repDeals} rep={currentRep} onExit={onLogout} themeToggle={themeToggle} onPrint={onPrint} lenders={lenderSubmissions} onUpdateMerchant={handleUpdateMerchant} salesReps={salesReps} />;
    }

    return (
         <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto text-center">
                 <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Dashboard Setup Needed</h1>
                 <p className="text-slate-500 dark:text-slate-400 mt-4">Your account is active, but there is not yet a matching dashboard profile.</p>
                 <button onClick={onLogout} className="mt-6 px-6 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-yellow hover:bg-theme-yellow/90">Logout</button>
            </div>
        </div>
    );
};
