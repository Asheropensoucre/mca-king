import React, { useState, useCallback } from 'react';
import type { FormData, BusinessInfo, OwnerInfo } from '../../../types';
import { Card } from '../../ui/Card';
import { BusinessInfoForm } from '../../BusinessInfoForm';
import { OwnersForm } from '../../OwnersForm';

interface EditMerchantFormProps {
    initialData: FormData, 
    onSave: (data: FormData) => void, 
    onCancel: () => void 
}

export const EditMerchantForm: React.FC<EditMerchantFormProps> = ({ initialData, onSave, onCancel }) => {
    const [formData, setFormData] = useState<FormData>(initialData);

    const updateBusinessInfo = useCallback((data: Partial<BusinessInfo>) => {
        setFormData(prev => ({ ...prev, businessInfo: { ...prev.businessInfo, ...data } }));
    }, []);

    const updateOwners = useCallback((owners: OwnerInfo[]) => {
        setFormData(prev => ({ ...prev, owners }));
    }, []);
    
    const updateParentData = useCallback((data: Partial<Omit<FormData, 'id'>>) => {
        setFormData(prev => ({...prev, ...data}));
    }, []);
    
    return (
        <Card className="space-y-6">
            <div className="p-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Business Information</h3>
                <BusinessInfoForm data={formData.businessInfo} updateData={updateBusinessInfo} requestedAmount={formData.requestedAmount} updateParentData={updateParentData} />
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Owner Information</h3>
                <OwnersForm data={formData.owners} updateData={updateOwners} />
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-4">
                <button onClick={onCancel} type="button" className="px-6 py-2 rounded-md text-sm font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 dark:hover:bg-slate-500">Cancel</button>
                <button onClick={() => onSave(formData)} type="button" className="px-6 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-yellow hover:bg-theme-yellow/90">Save Changes</button>
            </div>
        </Card>
    );
};
