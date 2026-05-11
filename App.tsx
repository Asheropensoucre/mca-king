import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { FormData, BusinessInfo, OwnerInfo, Agreements, DocumentInfo, LenderInfo, SalesRepresentative } from './types';
import { BusinessInfoForm } from './components/BusinessInfoForm';
import { OwnersForm } from './components/OwnersForm';
import { AgreementsForm } from './components/AgreementsForm';
import { Summary } from './components/Summary';
import { StepIndicator } from './components/StepIndicator';
import { DashboardController } from './components/dashboards/DashboardController';
import { LenderForm } from './components/LenderForm';
import { DocumentUploadStep } from './components/DocumentUploadStep';
import { ThemeToggle } from './components/ThemeToggle';
import { PrintView } from './components/PrintView';
import { Chatbot } from './components/Chatbot';
import { DEFAULT_APPLICATION_STATUS } from './components/dashboards/shared/applicationStatus';
import { api, DEMO_SALES_REPS, setDemoIdentity } from './src/lib/api-client';

const STEPS = [
    { name: 'Business Info', description: 'Tell us about your company.' },
    { name: 'Owner Info', description: 'Provide details for all owners.' },
    { name: 'Agreements', description: 'Review and sign.' },
    { name: 'Review', description: 'Final check of your info.' },
    { name: 'Upload Documents', description: 'Provide required files.' },
];

// Mock data for sales reps
const MOCK_SALES_REPS: SalesRepresentative[] = DEMO_SALES_REPS;


const initialFormData: Omit<FormData, 'id'> = {
  businessInfo: {
    legalName: '', dbaName: '', address: '', monthlyRevenue: '', phone: '',
    taxId: '', startDate: '', industryType: '', entityType: '', recentNSFs: '',
  },
  owners: [
    {
      id: crypto.randomUUID(), name: '', homeAddress: '', signature: '',
      ownership: '', title: '', cellPhone: '', dateOfBirth: '', ssn: '', email: '',
      creditScore: '',
    },
  ],
  agreements: {
      creditAuth: false,
      signatureDataUrl: '',
      ipAddress: '',
      geolocation: null,
  },
  documents: [],
  status: DEFAULT_APPLICATION_STATUS,
  offers: [],
  requestedAmount: '',
  matchedLenderIds: [],
};

const initialLenderData: LenderInfo = {
    id: crypto.randomUUID(),
    lenderName: '', positions: '', longestTerm: '', maxFundingAmount: '', minRevenue: '',
    minCreditScore: '', industryRestrictions: '', nsfs: '', timeInBusiness: '',
    stateRestrictions: '', isoRep: '', cell: '', email: '', notes: '', buyRate: '',
    fees: '', trucking: '',
};


export type Theme = 'light' | 'dark';
export type View = 'merchant' | 'admin' | 'lender' | 'main' | 'merchant_dashboard' | 'lender_dashboard' | 'sales_rep_login' | 'sales_rep_dashboard' | 'lender_login' | 'merchant_login';


interface ProfilePickerProps<T> {
  title: string;
  load: () => Promise<T[]>;
  getLabel: (item: T) => string;
  empty: string;
  onBack: () => void;
  onSelect: (item: T) => void;
}

function ProfilePicker<T>({ title, load, getLabel, empty, onBack, onSelect }: ProfilePickerProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => { void load().then(setItems).catch(() => setItems([])); }, [load]);
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg text-center p-8 max-w-md w-full">
        <img src="/logo.png" alt="MCA King Logo" className="mx-auto mb-6 h-20 w-auto" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-4">{title}</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Choose your profile to access your dashboard.</p>
        <div className="mt-6 space-y-3">
          {items.length > 0 ? items.map((item, index) => (
            <button key={index} onClick={() => onSelect(item)} className="w-full px-6 py-3 rounded-md text-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors truncate">{getLabel(item)}</button>
          )) : <p className="text-slate-500 dark:text-slate-400">{empty}</p>}
        </div>
        <div className="text-center mt-6"><button onClick={onBack} className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-theme-teal transition-colors">&larr; Back to Main</button></div>
      </div>
    </div>
  );
}

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Omit<FormData, 'id'>>(initialFormData);
  const [lenderData, setLenderData] = useState<LenderInfo>(initialLenderData);
  const [isSubmitted, setIsSubmitted] = useState<'merchant' | 'lender' | false>(false);
  const [view, setView] = useState<View>('main');
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null);
  const [currentSalesRepId, setCurrentSalesRepId] = useState<string | null>(null);
  const [printingSubmission, setPrintingSubmission] = useState<FormData | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTheme = window.localStorage.getItem('theme') as Theme;
      if (storedTheme) return storedTheme;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);




  const updateBusinessInfo = useCallback((data: Partial<BusinessInfo>) => {
    setFormData((prev) => ({ ...prev, businessInfo: { ...prev.businessInfo, ...data } }));
  }, []);

  const updateOwners = useCallback((owners: OwnerInfo[]) => {
    setFormData((prev) => ({ ...prev, owners }));
  }, []);

  const updateAgreements = useCallback((data: Partial<Agreements>) => {
    setFormData((prev) => ({ ...prev, agreements: { ...prev.agreements, ...data } }));
  }, []);
  
  const updateDocuments = useCallback((documents: DocumentInfo[]) => {
    setFormData((prev) => ({ ...prev, documents }));
  }, []);
  
  const updateLenderInfo = useCallback((data: Partial<LenderInfo>) => {
    setLenderData((prev) => ({ ...prev, ...data }));
  }, []);

  const updateFormData = useCallback((data: Partial<Omit<FormData, 'id'>>) => {
    setFormData(prev => ({ ...prev, ...data }));
  }, []);


  const isStepValid = useMemo(() => {
    if (currentStep === 1) { // Owner Info
      const totalOwnership = formData.owners.reduce((acc, owner) => acc + (parseFloat(owner.ownership) || 0), 0);
      return totalOwnership === 100;
    }
    if (currentStep === 2) { // Agreements
      return formData.agreements.creditAuth && formData.agreements.signatureDataUrl !== '';
    }
    return true;
  }, [currentStep, formData]);


  const handleNext = () => {
    if (currentStep < STEPS.length - 1 && isStepValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleEditStep = (stepIndex: number) => {
    if (stepIndex < currentStep) { 
        setCurrentStep(stepIndex);
    }
  }

  const handleMerchantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.documents.length === 0) {
        alert("Please upload the required bank statements before submitting.");
        return;
    }
    
    // Assign to a random sales rep
    const randomRepIndex = Math.floor(Math.random() * MOCK_SALES_REPS.length);
    const assignedRepId = MOCK_SALES_REPS[randomRepIndex].id;

    const newSubmission: FormData = { ...formData, id: crypto.randomUUID(), salesRepId: assignedRepId };
    try {
      setDemoIdentity({ role: 'merchant', userId: '00000000-0000-4000-8000-000000000201', email: 'merchant@demo.local', name: newSubmission.owners[0]?.name || 'Demo Merchant' });
      const created = await api.merchants.create(newSubmission);
      setCurrentSubmissionId(created.id);
      setIsSubmitted('merchant');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not submit application.');
    }
  };
  
  const handleLenderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newLenderData = { ...lenderData, id: crypto.randomUUID() };
    try {
      setDemoIdentity({ role: 'lender', userId: '00000000-0000-4000-8000-000000000301', email: newLenderData.email || 'lender@demo.local', name: newLenderData.lenderName || 'Demo Lender' });
      const created = await api.lenders.create(newLenderData);
      setCurrentSubmissionId(created.id);
      setIsSubmitted('lender');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not submit lender profile.');
    }
  };

  const handleSelectRep = (repId: string) => {
    const rep = MOCK_SALES_REPS.find(item => item.id === repId);
    setDemoIdentity({ role: 'sales_rep', userId: repId, email: rep?.email, name: rep?.name });
    setCurrentSalesRepId(repId);
    setView('sales_rep_dashboard');
  };

  const chatContext = useMemo(() => {
    switch (view) {
      case 'merchant': return `The user is a merchant filling out an application and is currently on the "${STEPS[currentStep].name}" step.`;
      case 'admin': return 'The user is an administrator viewing the admin dashboard.';
      case 'lender': return 'The user is a lender filling out their criteria form.';
      case 'lender_dashboard': return 'The user is a lender viewing their dashboard.';
      case 'sales_rep_dashboard': return 'The user is a sales representative viewing their dashboard.';
      case 'merchant_dashboard': return 'The user is a merchant viewing their application dashboard.';
      default: return 'The user is on the main landing page.';
    }
  }, [view, currentStep]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <BusinessInfoForm data={formData.businessInfo} updateData={updateBusinessInfo} requestedAmount={formData.requestedAmount} updateParentData={updateFormData} />;
      case 1:
        return <OwnersForm data={formData.owners} updateData={updateOwners} />;
      case 2:
        return <AgreementsForm data={formData.agreements} updateData={updateAgreements} />
      case 3:
        return <Summary formData={formData} onEditStep={handleEditStep} />;
      case 4:
        return <DocumentUploadStep onDocumentsChange={updateDocuments} />;
      default:
        return null;
    }
  };

  if (printingSubmission) {
    return <PrintView formData={printingSubmission} onClose={() => setPrintingSubmission(null)} />;
  }

  if (isSubmitted) {
    const isMerchant = isSubmitted === 'merchant';
    
    const handleDownloadPdf = async () => {
        if (!currentSubmissionId) return;
        try {
            const submission = await api.merchants.get(currentSubmissionId);
            setPrintingSubmission(submission);
        } catch {
            alert("Error: Could not find submission data to generate PDF.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg text-center p-8 max-w-lg">
                <img src="/logo.png" alt="MCA King Logo" className="mx-auto mb-6 h-20 w-auto" />
                <svg className="w-16 h-16 mx-auto text-theme-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-4">{isMerchant ? 'Application Submitted!' : 'Lender Info Submitted!'}</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">Thank you. We have received your {isMerchant ? 'application' : 'information'} and will be in touch shortly.</p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center mt-6">
                    <button 
                      onClick={() => {
                        setIsSubmitted(false); 
                        if (isMerchant) {
                          setFormData(initialFormData); 
                          setCurrentStep(0);
                          setView('main');
                        } else {
                          setLenderData(initialLenderData);
                          setView('main');
                        }
                      }} 
                      className="px-6 py-2 rounded-md text-sm font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 dark:text-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
                    >
                      {isMerchant ? 'Submit Another Application' : 'Back to Main'}
                    </button>
                    <button 
                      onClick={() => {
                        setIsSubmitted(false);
                        setView(isMerchant ? 'merchant_dashboard' : 'lender_dashboard');
                      }}
                      className="px-6 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-yellow hover:bg-theme-yellow/90"
                    >
                      View My Dashboard
                    </button>
                    {isMerchant && (
                        <button
                          onClick={handleDownloadPdf}
                          className="px-6 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-teal hover:bg-theme-teal/90"
                        >
                          Download Application PDF
                        </button>
                    )}
                </div>
            </div>
            <Chatbot context={chatContext} />
        </div>
    );
  }

  if (view === 'admin') {
      setDemoIdentity({ role: 'admin', userId: '00000000-0000-4000-8000-000000000001', email: 'admin@demo.local', name: 'Demo Admin' });
      return (
        <>
            <DashboardController view="admin" onExit={() => setView('main')} currentId={null} salesReps={MOCK_SALES_REPS} onPrint={setPrintingSubmission} />
            <Chatbot context={chatContext} />
        </>
      );
  }
  if (view === 'merchant_dashboard') {
      return (
        <>
            <DashboardController view="merchant" onExit={() => setView('main')} currentId={currentSubmissionId} onPrint={setPrintingSubmission} />
            <Chatbot context={chatContext} />
        </>
      );
  }
  if (view === 'lender_dashboard') {
      return (
        <>
            <DashboardController view="lender" onExit={() => setView('main')} currentId={currentSubmissionId} />
            <Chatbot context={chatContext} />
        </>
      );
  }
  if (view === 'sales_rep_dashboard') {
      return (
        <>
            <DashboardController view="sales_rep" onExit={() => { setView('main'); setCurrentSalesRepId(null); }} currentId={null} currentSalesRepId={currentSalesRepId} salesReps={MOCK_SALES_REPS} onPrint={setPrintingSubmission} />
            <Chatbot context={chatContext} />
        </>
      );
  }
  
  if (view === 'lender') {
      return (
        <>
            <LenderForm data={lenderData} updateData={updateLenderInfo} onSubmit={handleLenderSubmit} onExit={() => setView('main')} />
            <Chatbot context={chatContext} />
        </>
      );
  }

  if (view === 'sales_rep_login') {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg text-center p-8 max-w-md w-full">
                <img src="/logo.png" alt="MCA King Logo" className="mx-auto mb-6 h-20 w-auto" />
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-4">Select Sales Rep Profile</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">Choose your profile to access your dashboard.</p>
                <div className="mt-6 space-y-3">
                    {MOCK_SALES_REPS.map(rep => (
                        <button 
                            key={rep.id}
                            onClick={() => handleSelectRep(rep.id)}
                            className="w-full px-6 py-3 rounded-md text-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                        >
                            {rep.name}
                        </button>
                    ))}
                </div>
                 <div className="text-center mt-6">
                    <button onClick={() => setView('main')} className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-theme-teal transition-colors">&larr; Back to Main</button>
                </div>
            </div>
             <Chatbot context={chatContext} />
        </div>
    );
  }

  if (view === 'merchant_login') {
      return <ProfilePicker title="Select Merchant Profile" load={api.merchants.list} getLabel={(merchant: FormData) => merchant.businessInfo.legalName || 'Unnamed Business'} empty="No applications submitted yet. Please submit a merchant application first." onBack={() => setView('main')} onSelect={(merchant: FormData) => { setDemoIdentity({ role: 'merchant', userId: '00000000-0000-4000-8000-000000000201', email: merchant.owners[0]?.email, name: merchant.owners[0]?.name }); setCurrentSubmissionId(merchant.id); setView('merchant_dashboard'); }} />;
  }


  if (view === 'lender_login') {
      return <ProfilePicker title="Select Lender Profile" load={api.lenders.list} getLabel={(lender: LenderInfo) => lender.lenderName || 'Unnamed Lender'} empty="No lenders registered yet. Please submit a lender application first." onBack={() => setView('main')} onSelect={(lender: LenderInfo) => { setDemoIdentity({ role: 'lender', userId: '00000000-0000-4000-8000-000000000301', email: lender.email, name: lender.lenderName }); setCurrentSubmissionId(lender.id); setView('lender_dashboard'); }} />;
  }


  if (view === 'main') {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-8 sm:p-12">
          <div className="absolute top-4 right-4 z-10">
              <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
          <div className="text-center w-full max-w-5xl">
              <img src="/logo.png" alt="MCA King Logo" className="mx-auto mb-8 h-32 w-auto" />
              <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">Welcome</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2 mb-8">Please select an option to continue.</p>
              <div className="flex flex-wrap justify-center gap-4">
                  <button onClick={() => setView('merchant')} className="px-8 py-4 text-lg font-semibold rounded-lg text-theme-black bg-theme-yellow hover:bg-theme-yellow/90 transition-colors">Merchant Application Form</button>
                  <button onClick={() => setView('lender')} className="px-8 py-4 text-lg font-semibold rounded-lg text-theme-black bg-theme-teal hover:bg-theme-teal/90 transition-colors">Lender Application Form</button>
                  <button onClick={() => setView('admin')} className="px-8 py-4 text-lg font-semibold rounded-lg text-slate-700 bg-slate-200 hover:bg-slate-300 dark:text-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors">Admin View</button>
                  <button onClick={() => setView('sales_rep_login')} className="px-8 py-4 text-lg font-semibold rounded-lg text-slate-700 bg-slate-200 hover:bg-slate-300 dark:text-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors">Sales Rep View</button>
                  <button onClick={() => setView('merchant_login')} className="px-8 py-4 text-lg font-semibold rounded-lg text-slate-700 bg-slate-200 hover:bg-slate-300 dark:text-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors">Merchant View</button>
                  <button onClick={() => setView('lender_login')} className="px-8 py-4 text-lg font-semibold rounded-lg text-slate-700 bg-slate-200 hover:bg-slate-300 dark:text-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors">Lender View</button>
              </div>
          </div>
          <Chatbot context={chatContext} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-8 sm:p-12">
        <img src="/logo.png" alt="MCA King Logo" className="mb-8 h-24 w-auto" />
        <div className="w-full max-w-6xl relative">
             <div className="absolute top-4 right-4 z-10">
                <ThemeToggle theme={theme} setTheme={setTheme} />
            </div>
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg grid md:grid-cols-3">
                {/* Step Indicator */}
                <div className="p-12 border-r border-slate-200 dark:border-theme-maroon/50 hidden md:block">
                    <StepIndicator steps={STEPS.map(s => s.name)} descriptions={STEPS.map(s => s.description)} currentStep={currentStep} />
                </div>

                {/* Form Content */}
                <div className="md:col-span-2 p-12">
                     <header className="mb-8">
                        <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">{STEPS[currentStep].name}</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">{STEPS[currentStep].description}</p>
                    </header>
                    <main>
                        <form onSubmit={handleMerchantSubmit} noValidate>
                            <div className="mb-8">
                                {renderStepContent()}
                            </div>
                            <div className="mt-8 pt-5 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                                    currentStep === 0
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
                                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 dark:hover:bg-slate-500'
                                    }`}
                                    disabled={currentStep === 0}
                                >
                                    Back
                                </button>
                                {currentStep < STEPS.length - 1 ? (
                                    <button
                                    type="button"
                                    onClick={handleNext}
                                    className={`px-6 py-2 rounded-md text-sm font-medium text-theme-black transition-colors ${
                                        isStepValid ? 'bg-theme-yellow hover:bg-theme-yellow/90' : 'bg-theme-yellow/50 cursor-not-allowed'
                                    }`}
                                    disabled={!isStepValid}
                                    >
                                    Next
                                    </button>
                                ) : (
                                    <button
                                    type="submit"
                                    className="px-6 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-teal hover:bg-theme-teal/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-teal/80 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    disabled={formData.documents.length === 0}
                                    >
                                    Submit Application
                                    </button>
                                )}
                            </div>
                        </form>
                    </main>
                </div>
            </div>
            <div className="text-center mt-4">
                <button onClick={() => setView('main')} className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-theme-teal transition-colors">&larr; Back to Main</button>
            </div>
        </div>
        <Chatbot context={chatContext} />
    </div>
  );
};

export default App;