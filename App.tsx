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

const STEPS = [
    { name: 'Business Info', description: 'Tell us about your company.' },
    { name: 'Owner Info', description: 'Provide details for all owners.' },
    { name: 'Agreements', description: 'Review and sign.' },
    { name: 'Review', description: 'Final check of your info.' },
    { name: 'Upload Documents', description: 'Provide required files.' },
];

// Mock data for sales reps
const MOCK_SALES_REPS: SalesRepresentative[] = [
    { id: 'rep1', name: 'Alex Johnson', email: 'alex.j@mcaking.com' },
    { id: 'rep2', name: 'Brenda Chen', email: 'brenda.c@mcaking.com' },
    { id: 'rep3', name: 'Carlos Diaz', email: 'carlos.d@mcaking.com' },
];


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

  // Seed mock data for demo purposes
  useEffect(() => {
    if (!localStorage.getItem('mcaSubmissions')) {
      const mockMerchants: FormData[] = [
        {
          id: 'mock-merchant-1',
          businessInfo: {
            legalName: 'Acme Corp',
            dbaName: 'Acme Superstore',
            address: '123 Fake St, Springfield IL',
            monthlyRevenue: '50000',
            phone: '555-123-4567',
            taxId: '12-3456789',
            startDate: '2010-01-01',
            industryType: 'Retail',
            entityType: 'LLC',
            recentNSFs: '0',
          },
          owners: [
            {
              id: 'mock-owner-1',
              name: 'John Doe',
              homeAddress: '456 Elm St, Springfield IL',
              signature: 'JD',
              ownership: '100',
              title: 'CEO',
              cellPhone: '555-987-6543',
              dateOfBirth: '1980-01-01',
              ssn: '000-00-0000',
              email: 'john.doe@example.com',
              creditScore: '720',
            }
          ],
          agreements: {
              creditAuth: true,
              signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
              ipAddress: '192.168.1.1',
              geolocation: { latitude: 40.7128, longitude: -74.0060 },
          },
          documents: [
            { name: 'statement.pdf', type: 'Bank Statement', size: 0 }
          ],
          status: "one or more lender's sent offer",
          offers: [
            {
              id: 'mock-offer-1',
              lenderId: 'mock-lender-1',
              lenderName: 'Capital Funding Partners',
              amount: '100000',
              rate: '1.25',
              term: '12 months',
              status: 'Pending',
              notes: 'Pre-approved based on revenue'
            }
          ],
          requestedAmount: '100000',
          matchedLenderIds: ['mock-lender-1'],
          salesRepId: 'rep1',
        },
        {
          id: 'mock-merchant-2',
          businessInfo: {
            legalName: 'Tech Innovators LLC',
            dbaName: 'Tech Innovators',
            address: '456 Innovation Way, San Francisco CA',
            monthlyRevenue: '120000',
            phone: '555-987-6543',
            taxId: '98-7654321',
            startDate: '2018-05-15',
            industryType: 'Software',
            entityType: 'LLC',
            recentNSFs: '0',
          },
          owners: [
            {
              id: 'mock-owner-2',
              name: 'Jane Smith',
              homeAddress: '789 Tech Blvd, San Francisco CA',
              signature: 'JS',
              ownership: '100',
              title: 'Founder',
              cellPhone: '555-345-6789',
              dateOfBirth: '1985-06-15',
              ssn: '000-00-1111',
              email: 'jane.smith@techinnovators.com',
              creditScore: '750',
            }
          ],
          agreements: {
              creditAuth: true,
              signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
              ipAddress: '192.168.1.2',
              geolocation: { latitude: 37.7749, longitude: -122.4194 },
          },
          documents: [
            { name: 'return.pdf', type: 'Tax Return', size: 0 }
          ],
          status: 'FUNDED',
          offers: [
            {
              id: 'mock-offer-2',
              lenderId: 'mock-lender-2',
              lenderName: 'Swift Capital',
              amount: '150000',
              rate: '1.15',
              term: '18 months',
              status: 'Accepted',
              notes: 'Best rate available'
            }
          ],
          requestedAmount: '150000',
          matchedLenderIds: ['mock-lender-1', 'mock-lender-2'],
          salesRepId: 'rep2',
        }
      ];
      localStorage.setItem('mcaSubmissions', JSON.stringify(mockMerchants));
    }

    if (!localStorage.getItem('lenderSubmissions')) {
      const mockLenders: LenderInfo[] = [
        {
          id: 'mock-lender-1',
          lenderName: 'Capital Funding Partners',
          positions: '1st, 2nd, 3rd',
          longestTerm: '12 months',
          maxFundingAmount: '500000',
          minRevenue: '10000',
          minCreditScore: '600',
          industryRestrictions: 'None',
          nsfs: 'Max 5 per month',
          timeInBusiness: '6 months',
          stateRestrictions: 'CA, NY, FL only',
          isoRep: 'Jane Smith',
          cell: '555-222-3333',
          email: 'jane@capitalfunding.com',
          notes: 'Fast funding turnaround.',
          buyRate: '1.25',
          fees: 'Standard origination',
          trucking: 'Yes',
        },
        {
          id: 'mock-lender-2',
          lenderName: 'Swift Capital',
          positions: '1st, 2nd',
          longestTerm: '24 months',
          maxFundingAmount: '1000000',
          minRevenue: '25000',
          minCreditScore: '650',
          industryRestrictions: 'Real Estate, Construction',
          nsfs: 'Max 2 per month',
          timeInBusiness: '12 months',
          stateRestrictions: 'None',
          isoRep: 'Michael Brown',
          cell: '555-333-4444',
          email: 'michael@swiftcapital.com',
          notes: 'Focus on established businesses.',
          buyRate: '1.15',
          fees: 'Low fees',
          trucking: 'No',
        }
      ];
      localStorage.setItem('lenderSubmissions', JSON.stringify(mockLenders));
    }
  }, []);


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

  const handleMerchantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.documents.length === 0) {
        alert("Please upload the required bank statements before submitting.");
        return;
    }
    
    // Assign to a random sales rep
    const randomRepIndex = Math.floor(Math.random() * MOCK_SALES_REPS.length);
    const assignedRepId = MOCK_SALES_REPS[randomRepIndex].id;

    const newSubmission: FormData = { ...formData, id: crypto.randomUUID(), salesRepId: assignedRepId };
    const storedSubmissions = localStorage.getItem('mcaSubmissions');
    const submissions = storedSubmissions ? JSON.parse(storedSubmissions) : [];
    submissions.push(newSubmission);
    localStorage.setItem('mcaSubmissions', JSON.stringify(submissions));
    
    setCurrentSubmissionId(newSubmission.id);
    setIsSubmitted('merchant');
  };
  
  const handleLenderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLenderData = { ...lenderData, id: crypto.randomUUID() };
    const storedSubmissions = localStorage.getItem('lenderSubmissions');
    const submissions = storedSubmissions ? JSON.parse(storedSubmissions) : [];
    submissions.push(newLenderData);
    localStorage.setItem('lenderSubmissions', JSON.stringify(submissions));
    
    setCurrentSubmissionId(newLenderData.id);
    setIsSubmitted('lender');
  };

  const handleSelectRep = (repId: string) => {
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
    
    const handleDownloadPdf = () => {
        if (!currentSubmissionId) return;
        const storedSubmissions = localStorage.getItem('mcaSubmissions');
        const submissions = storedSubmissions ? JSON.parse(storedSubmissions) as FormData[] : [];
        const submission = submissions.find(s => s.id === currentSubmissionId);
        if (submission) {
            setPrintingSubmission(submission);
        } else {
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
      const storedMerchants = localStorage.getItem('mcaSubmissions');
      const merchants = storedMerchants ? JSON.parse(storedMerchants) as FormData[] : [];

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg text-center p-8 max-w-md w-full">
                <img src="/logo.png" alt="MCA King Logo" className="mx-auto mb-6 h-20 w-auto" />
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-4">Select Merchant Profile</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">Choose your profile to access your dashboard.</p>
                <div className="mt-6 space-y-3">
                    {merchants.length > 0 ? merchants.map(merchant => (
                        <button 
                            key={merchant.id}
                            onClick={() => {
                                setCurrentSubmissionId(merchant.id);
                                setView('merchant_dashboard');
                            }}
                            className="w-full px-6 py-3 rounded-md text-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors truncate"
                        >
                            {merchant.businessInfo.legalName || 'Unnamed Business'}
                        </button>
                    )) : (
                        <p className="text-slate-500 dark:text-slate-400">No applications submitted yet. Please submit a merchant application first.</p>
                    )}
                </div>
                 <div className="text-center mt-6">
                    <button onClick={() => setView('main')} className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-theme-teal transition-colors">&larr; Back to Main</button>
                </div>
            </div>
             <Chatbot context={chatContext} />
        </div>
      );
  }

  if (view === 'lender_login') {
      const storedLenders = localStorage.getItem('lenderSubmissions');
      const lenders = storedLenders ? JSON.parse(storedLenders) as LenderInfo[] : [];

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg text-center p-8 max-w-md w-full">
                <img src="/logo.png" alt="MCA King Logo" className="mx-auto mb-6 h-20 w-auto" />
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-4">Select Lender Profile</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">Choose your profile to access your dashboard.</p>
                <div className="mt-6 space-y-3">
                    {lenders.length > 0 ? lenders.map(lender => (
                        <button 
                            key={lender.id}
                            onClick={() => {
                                setCurrentSubmissionId(lender.id);
                                setView('lender_dashboard');
                            }}
                            className="w-full px-6 py-3 rounded-md text-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors truncate"
                        >
                            {lender.lenderName || 'Unnamed Lender'}
                        </button>
                    )) : (
                        <p className="text-slate-500 dark:text-slate-400">No lenders registered yet. Please submit a lender application first.</p>
                    )}
                </div>
                 <div className="text-center mt-6">
                    <button onClick={() => setView('main')} className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-theme-teal transition-colors">&larr; Back to Main</button>
                </div>
            </div>
             <Chatbot context={chatContext} />
        </div>
      );
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