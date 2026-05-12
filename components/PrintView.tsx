import React, { useEffect } from 'react';
import type { FormData } from '../types';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';

const PrintSummaryItem: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
    <div className="py-2 grid grid-cols-3 gap-4 border-b">
        <dt className="text-sm font-medium text-gray-600">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{value || 'N/A'}</dd>
    </div>
);

export const PrintView: React.FC<{ formData: FormData; onClose: () => void; }> = ({ formData, onClose }) => {
    useEffect(() => {
        const handleAfterPrint = () => {
            onClose();
        };

        window.addEventListener('afterprint', handleAfterPrint);
        
        // Timeout to allow content to render before printing
        const timer = setTimeout(() => {
            window.print();
        }, 500);

        return () => {
            window.removeEventListener('afterprint', handleAfterPrint);
            clearTimeout(timer);
        };
    }, [onClose]);

    return (
        <div className="bg-white text-black font-serif p-4 sm:p-8 max-w-4xl mx-auto print:shadow-none print:p-0 print:m-0">
            <header className="flex justify-between items-center border-b-2 border-black pb-4">
                <div>
                    <h1 className="text-3xl font-bold">Merchant Cash Advance Application</h1>
                    <p className="text-gray-700 text-lg">{formData.businessInfo.legalName}</p>
                </div>
                <img src="/logo.png" alt="MCA King Logo" className="h-16 w-auto" />
            </header>
            
            <main className="mt-8">
                <div className="mb-8 text-right print:hidden">
                    <p className="text-sm text-gray-500 mb-2">Your application is ready to print or save as PDF.</p>
                    <PrimaryButton label="Print / Save as PDF" size="small" onClick={() => window.print()} />
                    <PrimaryButton label="Close" size="small" variant="danger" onClick={onClose} />
                </div>
                
                <section className="mb-8">
                    <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4">Business Information</h2>
                    <dl>
                        <PrintSummaryItem label="Business Legal Name" value={formData.businessInfo.legalName} />
                        <PrintSummaryItem label="Business D/B/A Name" value={formData.businessInfo.dbaName} />
                        <PrintSummaryItem label="Business Phone" value={formData.businessInfo.phone} />
                        <PrintSummaryItem label="Federal Tax ID #" value={formData.businessInfo.taxId} />
                        <PrintSummaryItem label="Business Address" value={formData.businessInfo.address} />
                        <PrintSummaryItem label="Business Start Date" value={formData.businessInfo.startDate} />
                        <PrintSummaryItem label="Requested Amount" value={formData.requestedAmount ? `$${Number(formData.requestedAmount).toLocaleString()}`: ''} />
                        <PrintSummaryItem label="Avg. Monthly Revenue" value={formData.businessInfo.monthlyRevenue ? `$${Number(formData.businessInfo.monthlyRevenue).toLocaleString()}`: ''} />
                        <PrintSummaryItem label="Recent NSFs (3 mo.)" value={formData.businessInfo.recentNSFs} />
                        <PrintSummaryItem label="Industry Type" value={formData.businessInfo.industryType} />
                        <PrintSummaryItem label="Entity Type" value={formData.businessInfo.entityType} />
                    </dl>
                </section>

                <section className="mb-8" style={{ pageBreakBefore: 'always' }}>
                    <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4">Owner Information</h2>
                    {formData.owners.map((owner, index) => (
                        <div key={owner.id} className="mb-6 last:mb-0 border-t pt-4 first:border-t-0 first:pt-0">
                            <h3 className="text-lg font-semibold text-gray-800">Owner #{index + 1}</h3>
                            <dl className="mt-2">
                                <PrintSummaryItem label="Name" value={owner.name} />
                                <PrintSummaryItem label="Title" value={owner.title} />
                                <PrintSummaryItem label="Home Address" value={owner.homeAddress} />
                                <PrintSummaryItem label="Cell Phone" value={owner.cellPhone} />
                                <PrintSummaryItem label="Email" value={owner.email} />
                                <PrintSummaryItem label="Date of Birth" value={owner.dateOfBirth} />
                                <PrintSummaryItem label="SSN" value={owner.ssn} />
                                <PrintSummaryItem label="Estimated Credit Score" value={owner.creditScore} />
                                <PrintSummaryItem label="Ownership" value={`${owner.ownership}%`} />
                                <PrintSummaryItem label="Signature (Typed)" value={owner.signature} />
                            </dl>
                        </div>
                    ))}
                </section>

                <section style={{ pageBreakBefore: 'always' }}>
                    <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4">Agreements & Signature</h2>
                    <dl>
                         <PrintSummaryItem label="Credit Authorization" value={formData.agreements.creditAuth ? 'Agreed' : 'Not Agreed'} />
                         <div className="py-2 grid grid-cols-3 gap-4 items-start">
                            <dt className="text-sm font-medium text-gray-600">Signature</dt>
                            <dd className="mt-1 sm:mt-0 sm:col-span-2">
                                {formData.agreements.signatureDataUrl ? (
                                    <img src={formData.agreements.signatureDataUrl} alt="Signature" className="border h-24 bg-gray-100" />
                                ): 'N/A'}
                            </dd>
                        </div>
                    </dl>
                </section>
            </main>

            <footer className="text-xs text-gray-500 border-t mt-8 pt-4">
                <p>Application submitted on {new Date().toLocaleString()}.</p>
                <p>IP Address: {formData.agreements.ipAddress}</p>
                <p>Geolocation: {formData.agreements.geolocation ? `Lat: ${formData.agreements.geolocation.latitude.toFixed(4)}, Lon: ${formData.agreements.geolocation.longitude.toFixed(4)}` : 'Not provided'}</p>
                <p className="mt-2">This is a legally binding document. All information provided is certified to be true and correct.</p>
            </footer>
        </div>
    );
};