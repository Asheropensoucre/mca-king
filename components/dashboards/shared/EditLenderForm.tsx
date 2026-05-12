import React, { useState } from 'react';
import type { LenderInfo } from '../../../types';
import { Card } from '../../ui/Card';
import { PrimaryButton } from '../../../src/components/ui/PrimaryButton';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';

interface EditLenderFormProps {
    initialData: LenderInfo, 
    onSave: (data: LenderInfo) => void, 
    onCancel: () => void 
}

export const EditLenderForm: React.FC<EditLenderFormProps> = ({ initialData, onSave, onCancel }) => {
    const [data, setData] = useState<LenderInfo>(initialData);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
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

                    <h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow md:col-span-3 mt-4">Contact Info</h3>
                    <Input name="isoRep" label="ISO Rep Name" value={data.isoRep} onChange={handleChange} />
                    <Input name="cell" label="Cell Phone" type="tel" value={data.cell} onChange={handleChange} />
                    <Input name="email" label="Email" type="email" value={data.email} onChange={handleChange} />
                </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-4">
                <PrimaryButton label="Cancel" size="small" variant="danger" onClick={onCancel} />
                <PrimaryButton label="Save Changes" onClick={() => onSave(data)} />
            </div>
        </Card>
    );
};
