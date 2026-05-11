import React, { useState, useEffect, useCallback } from 'react';
import type { FormData, LenderInfo, ApplicationStatus, SalesRepresentative, BusinessInfo, OwnerInfo, Offer } from '../types';
import { Card } from './ui/Card';
import { BusinessInfoForm } from './BusinessInfoForm';
import { OwnersForm } from './OwnersForm';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { APPLICATION_STATUSES } from './dashboards/shared/applicationStatus';

interface DashboardProps {
    onExit: () => void;
    view: 'admin' | 'lender' | 'merchant' | 'sales_rep';
    currentId: string | null;
    currentSalesRepId?: string | null;
    salesReps?: SalesRepresentative[];
    onPrint?: (submission: FormData) => void;
}

const SummaryItem: React.FC<{ label: string; value?: string | number | React.ReactNode; className?: string }> = ({ label, value, className = '' }) => (
    <div className={className}>
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 break-words">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{value || value === 0 ? value : 'N/A'}</dd>
    </div>
);

const ALL_STATUSES: ApplicationStatus[] = APPLICATION_STATUSES;


const LenderDetailView: React.FC<{ item: LenderInfo }> = ({ item }) => (
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

const EditMerchantForm: React.FC<{ initialData: FormData, onSave: (data: FormData) => void, onCancel: () => void }> = ({ initialData, onSave, onCancel }) => {
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

const EditLenderForm: React.FC<{ initialData: LenderInfo, onSave: (data: LenderInfo) => void, onCancel: () => void }> = ({ initialData, onSave, onCancel }) => {
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

                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 md:col-span-3 mt-4">Contact Info</h3>
                    <Input name="isoRep" label="ISO Rep Name" value={data.isoRep} onChange={handleChange} />
                    <Input name="cell" label="Cell Phone" type="tel" value={data.cell} onChange={handleChange} />
                    <Input name="email" label="Email" type="email" value={data.email} onChange={handleChange} />
                </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-4">
                <button onClick={onCancel} type="button" className="px-6 py-2 rounded-md text-sm font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 dark:hover:bg-slate-500">Cancel</button>
                <button onClick={() => onSave(data)} type="button" className="px-6 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-yellow hover:bg-theme-yellow/90">Save Changes</button>
            </div>
        </Card>
    );
};


const MerchantDetailView: React.FC<{ item: FormData, lenders?: LenderInfo[] }> = ({ item, lenders }) => (
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


// ==================================
// MERCHANT DASHBOARD
// ==================================
const MerchantDashboard: React.FC<{ 
    submission: FormData, 
    onExit: () => void,
    onUpdateOffer: (offerId: string, status: 'Accepted' | 'Rejected') => void 
}> = ({ submission, onExit, onUpdateOffer }) => {
    const currentStatusIndex = ALL_STATUSES.indexOf(submission.status);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">My Application Dashboard</h1>
                        <p className="text-slate-500 dark:text-slate-400">Welcome, {submission.owners[0]?.name || 'Valued Client'}</p>
                    </div>
                    <button onClick={onExit} className="text-sm font-medium text-theme-teal hover:text-theme-teal/80">Exit Dashboard &rarr;</button>
                </div>

                <Card className="mb-6">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Application Status</h2>
                        <nav aria-label="Progress">
                            <ol role="list" className="flex items-center">
                                {ALL_STATUSES.map((status, statusIdx) => (
                                    <li key={status} className={`relative ${statusIdx !== ALL_STATUSES.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                                        {statusIdx <= currentStatusIndex ? (
                                            <>
                                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                                     <div className={`h-0.5 w-full ${statusIdx < currentStatusIndex ? 'bg-theme-yellow' : 'bg-gray-200'}`} />
                                                </div>
                                                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-theme-yellow">
                                                    <svg className="h-5 w-5 text-black" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" /></svg>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                                    <div className="h-0.5 w-full bg-gray-200 dark:bg-slate-700" />
                                                </div>
                                                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white dark:border-slate-700 dark:bg-dark-card" />
                                            </>
                                        )}
                                         <p className="absolute -bottom-6 w-max text-center text-xs text-slate-500 dark:text-slate-400">{status}</p>
                                    </li>
                                ))}
                            </ol>
                        </nav>
                    </div>
                </Card>

                <Card>
                    <div className="p-6">
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Offers</h2>
                        {submission.offers && submission.offers.length > 0 ? (
                            <div className="space-y-4">
                                {submission.offers.map(offer => (
                                    <div key={offer.lenderId} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{offer.lenderName}</p>
                                            <p className="text-slate-600 dark:text-slate-400">Amount: <span className="font-medium">${Number(offer.amount).toLocaleString()}</span></p>
                                            <p className="text-slate-600 dark:text-slate-400">Term: <span className="font-medium">{offer.term} Days</span></p>
                                        </div>
                                        <div className="mt-4 sm:mt-0 flex space-x-2">
                                            {offer.status === 'Pending' ? (
                                                <>
                                                    <button onClick={() => onUpdateOffer(offer.lenderId, 'Rejected')} className="px-3 py-1.5 text-xs font-medium rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 dark:hover:bg-slate-500">Reject</button>
                                                    <button onClick={() => onUpdateOffer(offer.lenderId, 'Accepted')} className="px-3 py-1.5 text-xs font-medium rounded-md text-theme-black bg-theme-teal hover:bg-theme-teal/90">Accept</button>
                                                </>
                                            ) : (
                                                <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${offer.status === 'Accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'}`}>{offer.status}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                           <p className="text-sm text-slate-500 dark:text-slate-400">No offers have been made yet. You will be notified when an offer is available.</p>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    )
}

// ==================================
// LENDER DASHBOARD
// ==================================
const LenderDashboard: React.FC<{ 
    profile: LenderInfo, 
    merchants: FormData[], 
    onExit: () => void,
    onUpdateMerchant: (updatedMerchant: FormData) => FormData;
}> = ({ profile, merchants, onExit, onUpdateMerchant }) => {
    const [selectedDeal, setSelectedDeal] = useState<FormData | null>(null);
    const [isCreatingOffer, setIsCreatingOffer] = useState(false);
    const [offerAmount, setOfferAmount] = useState('');
    const [offerTerm, setOfferTerm] = useState('');

    const assignedMerchants = merchants.filter(merchant => 
        merchant.matchedLenderIds?.includes(profile.id)
    );

    const handleCreateOffer = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDeal) return;

        const newOffer: Offer = {
            lenderId: profile.id,
            lenderName: profile.lenderName,
            amount: offerAmount,
            term: offerTerm,
            status: 'Pending',
        };

        const updatedMerchant = {
            ...selectedDeal,
            offers: [...(selectedDeal.offers || []), newOffer],
            status: "one or more lender's sent offer" as ApplicationStatus,
        };

        const result = onUpdateMerchant(updatedMerchant);
        setSelectedDeal(result);
        setIsCreatingOffer(false);
        setOfferAmount('');
        setOfferTerm('');
    };

    if (selectedDeal) {
        return (
             <div className="p-4 sm:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    <button onClick={() => setSelectedDeal(null)} className="mb-4 text-sm font-medium text-theme-teal hover:text-theme-teal/80">&larr; Back to My Deals</button>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{selectedDeal.businessInfo.legalName}</h2>
                        <button onClick={() => setIsCreatingOffer(true)} className="px-4 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-yellow hover:bg-theme-yellow/90">Create Offer</button>
                    </div>
                    <MerchantDetailView item={selectedDeal} />
                </div>
                {isCreatingOffer && (
                     <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <Card className="w-full max-w-md">
                            <form onSubmit={handleCreateOffer}>
                                <div className="p-6">
                                    <h3 className="text-lg font-bold">Create Offer for {selectedDeal.businessInfo.legalName}</h3>
                                    <div className="mt-4 space-y-4">
                                        <Input label="Offer Amount ($)" name="amount" type="number" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} required />
                                        <Input label="Offer Term (Days)" name="term" type="number" value={offerTerm} onChange={e => setOfferTerm(e.target.value)} required />
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t flex justify-end space-x-2">
                                    <button type="button" onClick={() => setIsCreatingOffer(false)} className="px-4 py-2 text-sm rounded-md bg-white border">Cancel</button>
                                    <button type="submit" className="px-4 py-2 text-sm rounded-md bg-theme-yellow text-black">Send Offer</button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                 <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Lender Dashboard</h1>
                        <p className="text-slate-500 dark:text-slate-400">Welcome, {profile.lenderName}</p>
                    </div>
                    <button onClick={onExit} className="text-sm font-medium text-theme-teal hover:text-theme-teal/80">Exit Dashboard &rarr;</button>
                </div>
                <Card>
                    <div className="p-6">
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Assigned Merchants</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-800"><tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"><th>Business Name</th><th>Requested Amt</th><th>Revenue</th><th>Industry</th><th>Status</th><th></th></tr></thead>
                                <tbody className="bg-white divide-y divide-slate-200 dark:bg-dark-card dark:divide-slate-700">
                                    {assignedMerchants.length > 0 ? assignedMerchants.map((deal) => (
                                        <tr key={deal.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{deal.businessInfo.legalName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">${Number(deal.requestedAmount).toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">${Number(deal.businessInfo.monthlyRevenue).toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{deal.businessInfo.industryType}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{deal.status}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => setSelectedDeal(deal)} className="text-theme-teal hover:text-theme-teal/80">View Details</button></td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">No merchants have been assigned to you yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}


// ==================================
// SALES REP DASHBOARD
// ==================================
const SalesRepDashboard: React.FC<{ 
    deals: FormData[], 
    rep: SalesRepresentative | undefined, 
    onExit: () => void,
    onPrint?: (submission: FormData) => void;
    lenders: LenderInfo[];
}> = ({ deals, rep, onExit, onPrint, lenders }) => {
    const [selectedDeal, setSelectedDeal] = useState<FormData | null>(null);
    
    if (selectedDeal) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    <button onClick={() => setSelectedDeal(null)} className="mb-4 text-sm font-medium text-theme-teal hover:text-theme-teal/80">&larr; Back to My Deals</button>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{selectedDeal.businessInfo.legalName}</h2>
                        {onPrint && (
                            <button
                                onClick={() => onPrint(selectedDeal)}
                                className="px-4 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-yellow hover:bg-theme-yellow/90"
                            >
                                Download PDF
                            </button>
                        )}
                    </div>
                    <MerchantDetailView item={selectedDeal} lenders={lenders} />
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Sales Rep Dashboard</h1>
                        <p className="text-slate-500 dark:text-slate-400">Welcome, {rep?.name}</p>
                    </div>
                    <button onClick={onExit} className="text-sm font-medium text-theme-teal hover:text-theme-teal/80">Exit Dashboard &rarr;</button>
                </div>
                <Card>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <th>Business Name</th>
                                    <th>Primary Contact</th>
                                    <th>Contact Info</th>
                                    <th>Status</th>
                                    <th className="relative"><span className="sr-only">View</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200 dark:bg-dark-card dark:divide-slate-700">
                                {deals.length > 0 ? deals.map((deal) => {
                                    const primaryOwner = deal.owners[0];
                                    return (
                                        <tr key={deal.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{deal.businessInfo.legalName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{primaryOwner?.name || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                {primaryOwner?.cellPhone && <a href={`tel:${primaryOwner.cellPhone}`} className="text-theme-teal hover:text-theme-teal/80 block">Call</a>}
                                                {primaryOwner?.email && <a href={`mailto:${primaryOwner.email}`} className="text-theme-teal hover:text-theme-teal/80 block mt-1">Email</a>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{deal.status}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => setSelectedDeal(deal)} className="text-theme-teal hover:text-theme-teal/80">View Details</button></td>
                                        </tr>
                                    )
                                }) : (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">You have not been assigned any deals yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    )
}


// ==================================
// ADMIN DASHBOARD
// ==================================
const AdminDashboard: React.FC<{ 
    merchants: FormData[], 
    lenders: LenderInfo[], 
    onExit: () => void,
    onUpdateMerchant: (updatedMerchant: FormData) => FormData;
    onUpdateLenderInfo: (data: LenderInfo) => LenderInfo;
    salesReps: SalesRepresentative[],
    onPrint?: (submission: FormData) => void;
}> = ({ merchants, lenders, onExit, onUpdateMerchant, onUpdateLenderInfo, salesReps, onPrint }) => {
    const [activeTab, setActiveTab] = useState<'merchants' | 'lenders'>('merchants');
    const [selectedItem, setSelectedItem] = useState<FormData | LenderInfo | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isMatching, setIsMatching] = useState(false);

    const handleSelectItem = (item: FormData | LenderInfo) => {
        setSelectedItem(item);
        setIsEditing(false);
    }
    
    const handleSaveMerchant = (data: FormData) => {
        const updatedData = onUpdateMerchant(data);
        setSelectedItem(updatedData);
        setIsEditing(false);
    };

    const handleSaveLender = (data: LenderInfo) => {
        const updatedData = onUpdateLenderInfo(data);
        setSelectedItem(updatedData);
        setIsEditing(false);
    };
    
    const getMatchedLenders = (merchant: FormData) => {
        if (!merchant) return [];
        const merchantState = merchant.businessInfo.address.split(',').pop()?.trim().toUpperCase();
        const highestCreditScore = Math.max(...merchant.owners.map(o => parseInt(o.creditScore, 10)).filter(Boolean));

        return lenders.filter(lender => {
            const meetsRevenue = parseInt(merchant.businessInfo.monthlyRevenue, 10) >= parseInt(lender.minRevenue, 10);
            const meetsCredit = highestCreditScore >= parseInt(lender.minCreditScore, 10);
            const meetsNSFs = parseInt(merchant.businessInfo.recentNSFs, 10) <= parseInt(lender.nsfs, 10);
            const meetsFundingAmount = parseInt(merchant.requestedAmount, 10) <= parseInt(lender.maxFundingAmount, 10);
            const notStateRestricted = !lender.stateRestrictions.toUpperCase().split(',').map(s => s.trim()).includes(merchantState || '');
            const notIndustryRestricted = !lender.industryRestrictions.toLowerCase().includes(merchant.businessInfo.industryType.toLowerCase());
            
            return meetsRevenue && meetsCredit && meetsNSFs && meetsFundingAmount && notStateRestricted && notIndustryRestricted;
        });
    };

    const handleNotifyLender = (lenderId: string) => {
        if (!selectedItem || !('businessInfo' in selectedItem)) return;

        const currentMatchedIds = selectedItem.matchedLenderIds || [];
        if (currentMatchedIds.includes(lenderId)) {
            setIsMatching(false);
            return;
        }

        const updatedMerchant = {
            ...selectedItem,
            matchedLenderIds: [...currentMatchedIds, lenderId],
        };

        const result = onUpdateMerchant(updatedMerchant as FormData);
        setSelectedItem(result);
        setIsMatching(false);
    };


     if (selectedItem) {
        const isMerchant = 'businessInfo' in selectedItem;
        const matchedLenders = isMerchant ? getMatchedLenders(selectedItem as FormData) : [];
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                     <div className="flex justify-between items-center mb-4">
                        <button onClick={() => setSelectedItem(null)} className="text-sm font-medium text-theme-teal hover:text-theme-teal/80">&larr; Back to Directory</button>
                        {!isEditing && (
                             <div className="flex items-center space-x-2">
                                {isMerchant && <button onClick={() => setIsMatching(true)} className="px-4 py-2 rounded-md text-sm font-medium text-white bg-theme-maroon hover:bg-theme-maroon/90">Find Matches</button>}
                                {isMerchant && onPrint && (
                                     <button onClick={() => onPrint(selectedItem as FormData)} className="px-4 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-yellow hover:bg-theme-yellow/90">Download PDF</button>
                                )}
                                <button onClick={() => setIsEditing(true)} className="px-4 py-2 rounded-md text-sm font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 dark:text-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600">Edit</button>
                            </div>
                        )}
                    </div>
                    {isEditing ? (
                        isMerchant ? (
                            <EditMerchantForm initialData={selectedItem as FormData} onSave={handleSaveMerchant} onCancel={() => setIsEditing(false)} />
                        ) : (
                            <EditLenderForm initialData={selectedItem as LenderInfo} onSave={handleSaveLender} onCancel={() => setIsEditing(false)} />
                        )
                    ) : (
                        isMerchant ? (
                            <MerchantDetailView item={selectedItem as FormData} />
                        ) : (
                            <LenderDetailView item={selectedItem as LenderInfo} />
                        )
                    )}
                </div>
                {isMatching && isMerchant && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                                <h3 className="text-lg font-bold">Matched Lenders for {selectedItem.businessInfo.legalName}</h3>
                                <p className="text-sm text-slate-500">Found {matchedLenders.length} potential matches.</p>
                            </div>
                            <div className="p-6 overflow-y-auto space-y-3">
                                {matchedLenders.length > 0 ? matchedLenders.map(lender => (
                                    <div key={lender.id} className="p-3 border rounded-lg flex justify-between items-center dark:border-slate-700">
                                        <p className="font-semibold">{lender.lenderName}</p>
                                        <button 
                                            onClick={() => handleNotifyLender(lender.id)} 
                                            className="px-3 py-1 text-sm rounded-md bg-theme-yellow text-black disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:text-slate-500"
                                            disabled={(selectedItem as FormData).matchedLenderIds?.includes(lender.id)}
                                        >
                                            {(selectedItem as FormData).matchedLenderIds?.includes(lender.id) ? 'Notified' : 'Notify Lender'}
                                        </button>
                                    </div>
                                )) : <p>No lenders match the criteria.</p>}
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t flex justify-end">
                                <button onClick={() => setIsMatching(false)} className="px-4 py-2 text-sm rounded-md bg-white border dark:bg-slate-600 dark:border-slate-500 dark:text-slate-200">Close</button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-4"><img src="/logo.png" alt="MCA King Logo" className="h-12 w-auto" /><h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Admin Dashboard</h1></div>
                    <button onClick={onExit} className="text-sm font-medium text-theme-teal hover:text-theme-teal/80">Exit Admin View &rarr;</button>
                </div>
                <div className="border-b border-gray-200 dark:border-gray-700 mb-4"><nav className="-mb-px flex space-x-8" aria-label="Tabs"><button onClick={() => setActiveTab('merchants')} className={`${activeTab === 'merchants' ? 'border-theme-yellow text-theme-yellow' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Merchant Directory</button><button onClick={() => setActiveTab('lenders')} className={`${activeTab === 'lenders' ? 'border-theme-yellow text-theme-yellow' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Lender Directory</button></nav></div>
                <Card>
                    <div className="overflow-x-auto">
                        {activeTab === 'merchants' ? (
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-800"><tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"><th>Business Name</th><th>Sales Rep</th><th>Monthly Revenue</th><th>Status</th><th className="relative"><span className="sr-only">View</span></th></tr></thead>
                                <tbody className="bg-white divide-y divide-slate-200 dark:bg-dark-card dark:divide-slate-700">
                                    {merchants.length > 0 ? merchants.map((sub) => (
                                        <tr key={sub.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{sub.businessInfo.legalName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                <select
                                                    value={sub.salesRepId || ''}
                                                    onChange={(e) => onUpdateMerchant({ ...sub, salesRepId: e.target.value || undefined })}
                                                    className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-theme-yellow sm:text-sm sm:leading-6 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600"
                                                    aria-label={`Sales rep for ${sub.businessInfo.legalName}`}
                                                >
                                                    <option value="">Unassigned</option>
                                                    {salesReps.map(rep => (
                                                        <option key={rep.id} value={rep.id}>{rep.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">${Number(sub.businessInfo.monthlyRevenue).toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                <select value={sub.status} onChange={(e) => onUpdateMerchant({ ...sub, status: e.target.value as ApplicationStatus })} className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-theme-yellow sm:text-sm sm:leading-6 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600">
                                                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => handleSelectItem(sub)} className="text-theme-teal hover:text-theme-teal/80">View Details</button></td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">No merchant submissions yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                             <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-800"><tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lender</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Min Revenue</th><th className="relative"><span className="sr-only">View</span></th></tr></thead>
                                <tbody className="bg-white divide-y divide-slate-200 dark:bg-dark-card dark:divide-slate-700">
                                    {lenders.length > 0 ? lenders.map((sub) => (
                                        <tr key={sub.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{sub.lenderName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{sub.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{sub.minRevenue}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => handleSelectItem(sub)} className="text-theme-teal hover:text-theme-teal/80">View Details</button></td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">No lender submissions yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}


export const Dashboard: React.FC<DashboardProps> = ({ onExit, view, currentId, currentSalesRepId, salesReps = [], onPrint }) => {
    const [merchantSubmissions, setMerchantSubmissions] = useState<FormData[]>([]);
    const [lenderSubmissions, setLenderSubmissions] = useState<LenderInfo[]>([]);

    useEffect(() => {
        const storedMerchants = localStorage.getItem('mcaSubmissions');
        if (storedMerchants) setMerchantSubmissions(JSON.parse(storedMerchants));
        
        const storedLenders = localStorage.getItem('lenderSubmissions');
        if (storedLenders) setLenderSubmissions(JSON.parse(storedLenders));
    }, []);

    const handleUpdateMerchant = (updatedSubmission: FormData): FormData => {
        const updatedSubmissions = merchantSubmissions.map(sub =>
            sub.id === updatedSubmission.id ? updatedSubmission : sub
        );
        setMerchantSubmissions(updatedSubmissions);
        localStorage.setItem('mcaSubmissions', JSON.stringify(updatedSubmissions));
        return updatedSubmission;
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
                const newStatus = status === 'Accepted' ? 'Merchant accepts offer' : sub.status;
                return { ...sub, offers: newOffers, status: newStatus };
            }
            return sub;
        });
        setMerchantSubmissions(updatedSubmissions);
        localStorage.setItem('mcaSubmissions', JSON.stringify(updatedSubmissions));
    }


    if (view === 'admin') {
        return <AdminDashboard 
            merchants={merchantSubmissions} 
            lenders={lenderSubmissions} 
            onExit={onExit}
            onUpdateMerchant={handleUpdateMerchant}
            onUpdateLenderInfo={handleUpdateLenderInfo}
            salesReps={salesReps}
            onPrint={onPrint}
        />
    }

    if (view === 'merchant' && currentId) {
        const submission = merchantSubmissions.find(s => s.id === currentId);
        if (submission) {
            return <MerchantDashboard 
                submission={submission} 
                onExit={onExit} 
                onUpdateOffer={(offerId, status) => handleUpdateOffer(submission.id, offerId, status)}
            />
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
            />
        }
    }

    if (view === 'sales_rep' && currentSalesRepId) {
        const repDeals = merchantSubmissions.filter(m => m.salesRepId === currentSalesRepId);
        const currentRep = salesReps.find(r => r.id === currentSalesRepId);
        return <SalesRepDashboard deals={repDeals} rep={currentRep} onExit={onExit} onPrint={onPrint} lenders={lenderSubmissions} />
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