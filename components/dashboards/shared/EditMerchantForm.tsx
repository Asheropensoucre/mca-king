import React, { useState, useCallback } from 'react';
import type { FormData, BusinessInfo, OwnerInfo } from '../../../types';
import { Card } from '../../ui/Card';
import { PrimaryButton } from '../../../src/components/ui/PrimaryButton';
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
                <h3 className="text-xl font-black text-theme-maroon dark:text-theme-yellow mb-4">Business Information</h3>
                <BusinessInfoForm data={formData.businessInfo} updateData={updateBusinessInfo} requestedAmount={formData.requestedAmount} updateParentData={updateParentData} />
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-black text-theme-maroon dark:text-theme-yellow mb-4">Owner Information</h3>
                <OwnersForm data={formData.owners} updateData={updateOwners} />
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-4">
                <PrimaryButton label="Cancel" size="small" variant="danger" onClick={onCancel} />
                <PrimaryButton label="Save Changes" onClick={() => onSave(formData)} />
            </div>
        </Card>
    );
};
