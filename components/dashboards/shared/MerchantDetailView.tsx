import React from 'react';
import type { FormData, LenderInfo } from '../../../types';
import { Card } from '../../ui/Card';
import { SummaryItem } from './SummaryItem';

interface MerchantDetailViewProps { 
    item: FormData, 
    lenders?: LenderInfo[] 
}

export const MerchantDetailView: React.FC<MerchantDetailViewProps> = ({ item, lenders }) => (
    <div className="space-y-6">
        <Card><div className="p-6"><h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Business Information</h3><dl className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"><SummaryItem label="Legal Name" value={item.businessInfo.legalName} /><SummaryItem label="DBA Name" value={item.businessInfo.dbaName} /><SummaryItem label="Phone" value={item.businessInfo.phone} /><SummaryItem label="Tax ID" value={item.businessInfo.taxId} /><SummaryItem label="Address" value={item.businessInfo.address} /><SummaryItem label="Start Date" value={item.businessInfo.startDate} /><SummaryItem label="Requested Amount" value={`$${Number(item.requestedAmount).toLocaleString()}`} /><SummaryItem label="Avg. Monthly Revenue" value={`$${Number(item.businessInfo.monthlyRevenue).toLocaleString()}`} /><SummaryItem label="Recent NSFs" value={item.businessInfo.recentNSFs} /><SummaryItem label="Industry" value={item.businessInfo.industryType} /></dl></div></Card>
        {item.owners.map((owner, index) => (<Card key={owner.id}><div className="p-6"><h4 className="text-md font-semibold text-slate-700 dark:text-slate-300">Owner #{index + 1}</h4><dl className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"><SummaryItem label="Name" value={owner.name} /><SummaryItem label="Title" value={owner.title} /><SummaryItem label="Email" value={owner.email} /><SummaryItem label="Cell Phone" value={owner.cellPhone} /><SummaryItem label="Home Address" value={owner.homeAddress} /><SummaryItem label="DOB" value={owner.dateOfBirth} /><SummaryItem label="SSN" value={owner.ssn} /><SummaryItem label="Credit Score" value={owner.creditScore} /><SummaryItem label="Ownership" value={`${owner.ownership}%`} /></dl></div></Card>))}
        
        {lenders && item.matchedLenderIds && item.matchedLenderIds.length > 0 && (
            <Card>
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Matched Lenders</h3>
                    <ul className="space-y-2 mt-2 list-disc list-inside">
                        {item.matchedLenderIds.map(lenderId => {
                            const lender = lenders.find(l => l.id === lenderId);
                            return (
                                <li key={lenderId} className="text-sm text-slate-700 dark:text-slate-300">
                                    {lender ? lender.lenderName : `Unknown Lender (ID: ${lenderId})`}
                                </li>
                            )
                        })}
                    </ul>
                </div>
            </Card>
        )}
        
        <Card><div className="p-6"><h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Offers</h3>
            {item.offers && item.offers.length > 0 ? (
                <ul className="space-y-2 mt-2">
                    {item.offers.map(o => <li key={o.lenderId} className="text-sm text-slate-700 dark:text-slate-300">{o.lenderName}: ${Number(o.amount).toLocaleString()} for {o.term} days ({o.status})</li>)}
                </ul>
            ) : <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">No offers yet.</p>}
        </div></Card>
    </div>
);
