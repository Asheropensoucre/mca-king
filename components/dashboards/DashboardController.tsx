import React, { useState, useEffect } from 'react';
import type { FormData, LenderInfo, SalesRepresentative } from '../../types';
import { AdminDashboard } from './AdminDashboard';
import { LenderDashboard } from './LenderDashboard';
import { MerchantDashboard } from './MerchantDashboard';
import { SalesRepDashboard } from './SalesRepDashboard';
import { migrateMerchantStatus } from './shared/applicationStatus';

interface DashboardControllerProps {
    onExit: () => void;
    view: 'admin' | 'lender' | 'merchant' | 'sales_rep';
    currentId: string | null;
    currentSalesRepId?: string | null;
    salesReps?: SalesRepresentative[];
    onPrint?: (submission: FormData) => void;
}

export const DashboardController: React.FC<DashboardControllerProps> = ({ onExit, view, currentId, currentSalesRepId, salesReps = [], onPrint }) => {
    const [merchantSubmissions, setMerchantSubmissions] = useState<FormData[]>([]);
    const [lenderSubmissions, setLenderSubmissions] = useState<LenderInfo[]>([]);

    useEffect(() => {
        const storedMerchants = localStorage.getItem('mcaSubmissions');
        if (storedMerchants) {
            const migratedMerchants = (JSON.parse(storedMerchants) as FormData[]).map(migrateMerchantStatus);
            setMerchantSubmissions(migratedMerchants);
            localStorage.setItem('mcaSubmissions', JSON.stringify(migratedMerchants));
        }
        
        const storedLenders = localStorage.getItem('lenderSubmissions');
        if (storedLenders) setLenderSubmissions(JSON.parse(storedLenders));
    }, []);

    const handleUpdateMerchant = (updatedSubmission: FormData): FormData => {
        const migratedSubmission = migrateMerchantStatus(updatedSubmission);
        const updatedSubmissions = merchantSubmissions.map(sub =>
            sub.id === migratedSubmission.id ? migratedSubmission : sub
        );
        setMerchantSubmissions(updatedSubmissions);
        localStorage.setItem('mcaSubmissions', JSON.stringify(updatedSubmissions));
        return migratedSubmission;
    };
    
    const handleUpdateLenderInfo = (updatedLender: LenderInfo): LenderInfo => {
        const updatedSubmissions = lenderSubmissions.map(lender =>
            lender.id === updatedLender.id ? updatedLender : lender
        );
        setLenderSubmissions(updatedSubmissions);
        localStorage.setItem('lenderSubmissions', JSON.stringify(updatedSubmissions));
        return updatedLender;
    };
    
    const handleUpdateOffer = (merchantId: string, offerLenderId: string, status: 'Accepted' | 'Rejected') => {
        const updatedSubmissions = merchantSubmissions.map(sub => {
            if (sub.id === merchantId) {
                const newOffers = sub.offers.map(offer => 
                    offer.lenderId === offerLenderId ? { ...offer, status } : offer
                );
                const allOffersRejected = newOffers.length > 0 && newOffers.every(offer => offer.status === 'Rejected');
                const newStatus = status === 'Accepted'
                    ? 'Merchant accepts offer'
                    : allOffersRejected
                        ? "Merchant Declines Offer's"
                        : sub.status;
                return { ...sub, offers: newOffers, status: newStatus } as FormData;
            }
            return sub;
        });
        setMerchantSubmissions(updatedSubmissions);
        localStorage.setItem('mcaSubmissions', JSON.stringify(updatedSubmissions));
    };


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
            return <MerchantDashboard 
                submission={submission} 
                onExit={onExit} 
                onUpdateOffer={(offerId, status) => handleUpdateOffer(submission.id, offerId, status)}
            />;
        }
    }
    
    if (view === 'lender' && currentId) {
        const profile = lenderSubmissions.find(l => l.id === currentId);
        if (profile) {
            return <LenderDashboard 
                profile={profile} 
                merchants={merchantSubmissions} 
                onExit={onExit} 
                onUpdateMerchant={handleUpdateMerchant}
            />;
        }
    }

    if (view === 'sales_rep' && currentSalesRepId) {
        const repDeals = merchantSubmissions.filter(m => m.salesRepId === currentSalesRepId);
        const currentRep = salesReps.find(r => r.id === currentSalesRepId);
        return <SalesRepDashboard deals={repDeals} rep={currentRep} onExit={onExit} onPrint={onPrint} lenders={lenderSubmissions} onUpdateMerchant={handleUpdateMerchant} />;
    }

    return (
         <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto text-center">
                 <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Error</h1>
                 <p className="text-slate-500 dark:text-slate-400 mt-4">Could not load the requested dashboard. Please try again.</p>
                 <button onClick={onExit} className="mt-6 px-6 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-yellow hover:bg-theme-yellow/90">
                    Back to Main
                </button>
            </div>
        </div>
    );
};
