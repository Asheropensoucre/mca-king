import React from 'react';
import type { LenderInfo } from '../../../types';
import { Card } from '../../ui/Card';
import { SummaryItem } from './SummaryItem';

interface LenderDetailViewProps { 
    item: LenderInfo
}

export const LenderDetailView: React.FC<LenderDetailViewProps> = ({ item }) => (
    <Card>
        <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">{item.lenderName}</h3>
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                <SummaryItem label="Positions" value={item.positions} />
                <SummaryItem label="Longest Term (Days)" value={item.longestTerm} />
                <SummaryItem label="Max Funding Amount" value={item.maxFundingAmount} />
                <SummaryItem label="Min. Monthly Revenue" value={item.minRevenue} />
                <SummaryItem label="Min. Credit Score" value={item.minCreditScore} />
                <SummaryItem label="NSFs Allowed" value={item.nsfs} />
                <SummaryItem label="Min. Time in Business" value={item.timeInBusiness} />
                <SummaryItem label="State Restrictions" value={item.stateRestrictions} />
                <SummaryItem label="Trucking Allowed?" value={item.trucking} />
                <SummaryItem label="Buy Rate" value={item.buyRate} />
                <SummaryItem label="Fees" value={item.fees} />
                <SummaryItem label="Industry Restrictions" value={item.industryRestrictions} className="md:col-span-3" />
                <SummaryItem label="Notes" value={item.notes} className="md:col-span-3" />
                <h4 className="text-md font-semibold text-slate-700 dark:text-slate-300 md:col-span-3 mt-2">Contact Info</h4>
                <SummaryItem label="ISO Rep Name" value={item.isoRep} />
                <SummaryItem label="Cell Phone" value={item.cell} />
                <SummaryItem label="Email" value={item.email} />
            </dl>
        </div>
    </Card>
);
