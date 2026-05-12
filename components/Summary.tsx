import React from 'react';
import type { FormData } from '../types';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';

interface SummaryProps {
  formData: Omit<FormData, 'id'>;
  onEditStep: (stepIndex: number) => void;
}

const SummaryItem: React.FC<{ label: string; value?: string | number }> = ({ label, value }) => (
  <div>
    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</dt>
    <dd className="mt-1 text-sm text-slate-900 dark:text-slate-100">{value || 'N/A'}</dd>
  </div>
);

const Section: React.FC<{title: string, onEdit: () => void, children: React.ReactNode}> = ({ title, onEdit, children }) => (
    <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
            <PrimaryButton label="Edit" size="small" onClick={onEdit} />
        </div>
        {children}
    </div>
);


export const Summary: React.FC<SummaryProps> = ({ formData, onEditStep }) => {
  return (
    <div className="space-y-8">
      {/* Business Info */}
      <Section title="Business Information" onEdit={() => onEditStep(0)}>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <SummaryItem label="Business Legal Name" value={formData.businessInfo.legalName} />
            <SummaryItem label="Business D/B/A Name" value={formData.businessInfo.dbaName} />
            <SummaryItem label="Business Phone" value={formData.businessInfo.phone} />
            <SummaryItem label="Federal Tax ID #" value={formData.businessInfo.taxId} />
            <SummaryItem label="Business Address" value={formData.businessInfo.address} />
            <SummaryItem label="Business Start Date" value={formData.businessInfo.startDate} />
            <SummaryItem label="Requested Amount" value={formData.requestedAmount ? `$${Number(formData.requestedAmount).toLocaleString()}`: ''} />
            <SummaryItem label="Avg. Monthly Revenue" value={formData.businessInfo.monthlyRevenue ? `$${Number(formData.businessInfo.monthlyRevenue).toLocaleString()}`: ''} />
            <SummaryItem label="Recent NSFs (3 mo.)" value={formData.businessInfo.recentNSFs} />
            <SummaryItem label="Industry Type" value={formData.businessInfo.industryType} />
            <SummaryItem label="Entity Type" value={formData.businessInfo.entityType} />
          </dl>
      </Section>
      
      {/* Owner Info */}
      <Section title="Owner Information" onEdit={() => onEditStep(1)}>
        <div className="space-y-6">
        {formData.owners.map((owner, index) => (
          <div key={owner.id} className="border-t border-slate-200 dark:border-slate-700 pt-4 first:border-t-0 first:pt-0">
              <h4 className="text-md font-semibold text-slate-700 dark:text-slate-300">Owner #{index + 1} - {owner.name}</h4>
              <dl className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <SummaryItem label="Name" value={owner.name} />
                <SummaryItem label="Title" value={owner.title} />
                <SummaryItem label="Home Address" value={owner.homeAddress} />
                <SummaryItem label="Cell Phone" value={owner.cellPhone} />
                <SummaryItem label="Email" value={owner.email} />
                <SummaryItem label="Date of Birth" value={owner.dateOfBirth} />
                <SummaryItem label="SSN" value={owner.ssn} />
                <SummaryItem label="Estimated Credit Score" value={owner.creditScore} />
                <SummaryItem label="Ownership" value={`${owner.ownership}%`} />
                <SummaryItem label="Signature (Typed)" value={owner.signature} />
              </dl>
            </div>
        ))}
        </div>
      </Section>

      {/* Agreements */}
       <Section title="Agreements" onEdit={() => onEditStep(2)}>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
             <SummaryItem label="Credit Authorization" value={formData.agreements.creditAuth ? 'Agreed' : 'Not Agreed'} />
             <div>
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Signature</dt>
                <dd className="mt-1">
                    {formData.agreements.signatureDataUrl ? (
                         <img src={formData.agreements.signatureDataUrl} alt="Signature" className="border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-300 h-24" />
                    ): 'N/A'}
                </dd>
            </div>
          </dl>
      </Section>
    </div>
  );
};