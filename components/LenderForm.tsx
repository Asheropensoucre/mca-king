import React from 'react';
import type { LenderInfo } from '../types';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Select } from './ui/Select';
import { Card } from './ui/Card';

interface LenderFormProps {
    data: LenderInfo;
    updateData: (data: Partial<LenderInfo>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onExit: () => void;
}

export const LenderForm: React.FC<LenderFormProps> = ({ data, updateData, onSubmit, onExit }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        updateData({ [e.target.name]: e.target.value } as Partial<LenderInfo>);
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                 <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-4">
                        <img src="/logo.png" alt="MCA King Logo" className="h-12 w-auto" />
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Lender Criteria Submission</h1>
                    </div>
                    <button onClick={onExit} className="text-sm font-medium text-theme-teal hover:text-theme-teal/80">Exit Form &rarr;</button>
                </div>
                <form onSubmit={onSubmit}>
                    <Card>
                        <div className="p-6">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Input name="lenderName" label="Lender Name" value={data.lenderName} onChange={handleChange} required className="md:col-span-3"/>
                                <Input name="positions" label="Positions" value={data.positions} onChange={handleChange} />
                                <Input name="longestTerm" label="Longest Term (Days)" value={data.longestTerm} onChange={handleChange} />
                                <Input name="maxFundingAmount" label="Max Funding Amount" value={data.maxFundingAmount} onChange={handleChange} />
                                <Input name="minRevenue" label="Min. Monthly Revenue" value={data.minRevenue} onChange={handleChange} />
                                <Input name="minCreditScore" label="Min. Credit Score" value={data.minCreditScore} onChange={handleChange} />
                                <Input name="nsfs" label="NSFs Allowed" value={data.nsfs} onChange={handleChange} />
                                <Input name="timeInBusiness" label="Min. Time in Business" value={data.timeInBusiness} onChange={handleChange} />
                                <Input name="stateRestrictions" label="State Restrictions" value={data.stateRestrictions} onChange={handleChange} />
                                <Select name="trucking" label="Trucking Allowed?" value={data.trucking} onChange={handleChange}>
                                    <option value="">Select an option</option>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </Select>
                                <Input name="buyRate" label="Buy Rate" value={data.buyRate} onChange={handleChange} />
                                <Input name="fees" label="Fees" value={data.fees} onChange={handleChange} />

                                <Textarea name="industryRestrictions" label="Industry Restrictions" value={data.industryRestrictions} onChange={handleChange} className="md:col-span-3" rows={5}/>
                                <Textarea name="notes" label="Notes" value={data.notes} onChange={handleChange} className="md:col-span-3" rows={3}/>

                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 md:col-span-3 mt-4">Contact Info</h3>
                                <Input name="isoRep" label="ISO Rep Name" value={data.isoRep} onChange={handleChange} />
                                <Input name="cell" label="Cell Phone" type="tel" value={data.cell} onChange={handleChange} />
                                <Input name="email" label="Email" type="email" value={data.email} onChange={handleChange} />
                            </div>
                        </div>
                         <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                            <button
                                type="submit"
                                className="px-6 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-yellow hover:bg-theme-yellow/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-yellow/80"
                            >
                                Submit Lender Info
                            </button>
                        </div>
                    </Card>
                </form>
            </div>
        </div>
    );
};
