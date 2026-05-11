import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { AuthUser, FormData, BusinessInfo, OwnerInfo, Agreements, DocumentInfo, LenderInfo } from './types';
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
import { api } from './src/lib/api-client';
import { LoginPage } from './src/components/auth/LoginPage';
import { RegisterPage } from './src/components/auth/RegisterPage';

const STEPS = [
    { name: 'Business Info', description: 'Tell us about your company.' },
    { name: 'Owner Info', description: 'Provide details for all owners.' },
    { name: 'Agreements', description: 'Review and sign.' },
    { name: 'Review', description: 'Final check of your info.' },
    { name: 'Upload Documents', description: 'Provide required files.' },
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
type AuthMode = 'login' | 'register';
type SetupView = 'dashboard' | 'merchant_form' | 'lender_form';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Omit<FormData, 'id'>>(initialFormData);
  const [lenderData, setLenderData] = useState<LenderInfo>(initialLenderData);
  const [isSubmitted, setIsSubmitted] = useState<'merchant' | 'lender' | false>(false);
  const [setupView, setSetupView] = useState<SetupView>('dashboard');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null);
  const [printingSubmission, setPrintingSubmission] = useState<FormData | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTheme = window.localStorage.getItem('theme') as Theme;
      if (storedTheme) return storedTheme;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) setCurrentUser(await res.json() as AuthUser);
        else setCurrentUser(null);
      } catch {
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    void checkSession();
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setCurrentUser(null);
    setSetupView('dashboard');
    setAuthMode('login');
  }, []);

  const updateBusinessInfo = useCallback((data: Partial<BusinessInfo>) => setFormData(prev => ({ ...prev, businessInfo: { ...prev.businessInfo, ...data } })), []);
  const updateOwners = useCallback((owners: OwnerInfo[]) => setFormData(prev => ({ ...prev, owners })), []);
  const updateAgreements = useCallback((data: Partial<Agreements>) => setFormData(prev => ({ ...prev, agreements: { ...prev.agreements, ...data } })), []);
  const updateDocuments = useCallback((documents: DocumentInfo[]) => setFormData(prev => ({ ...prev, documents })), []);
  const updateLenderInfo = useCallback((data: Partial<LenderInfo>) => setLenderData(prev => ({ ...prev, ...data })), []);
  const updateFormData = useCallback((data: Partial<Omit<FormData, 'id'>>) => setFormData(prev => ({ ...prev, ...data })), []);

  const isStepValid = useMemo(() => {
    if (currentStep === 1) return formData.owners.reduce((acc, owner) => acc + (parseFloat(owner.ownership) || 0), 0) === 100;
    if (currentStep === 2) return formData.agreements.creditAuth && formData.agreements.signatureDataUrl !== '';
    return true;
  }, [currentStep, formData]);

  const chatContext = useMemo(() => {
    if (!currentUser) return 'The user is on the authentication screen.';
    if (setupView === 'merchant_form') return `The user is a merchant filling out an application and is currently on the "${STEPS[currentStep].name}" step.`;
    if (setupView === 'lender_form') return 'The user is a lender filling out their criteria form.';
    return `The user is viewing the ${currentUser.role} dashboard.`;
  }, [currentUser, setupView, currentStep]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return <BusinessInfoForm data={formData.businessInfo} updateData={updateBusinessInfo} requestedAmount={formData.requestedAmount} updateParentData={updateFormData} />;
      case 1: return <OwnersForm data={formData.owners} updateData={updateOwners} />;
      case 2: return <AgreementsForm data={formData.agreements} updateData={updateAgreements} />;
      case 3: return <Summary formData={formData} onEditStep={(stepIndex) => { if (stepIndex < currentStep) setCurrentStep(stepIndex); }} />;
      case 4: return <DocumentUploadStep onDocumentsChange={updateDocuments} />;
      default: return null;
    }
  };

  const handleMerchantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.documents.length === 0) {
        alert('Please upload the required bank statements before submitting.');
        return;
    }
    const newSubmission: FormData = { ...formData, id: crypto.randomUUID() };
    try {
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
      const created = await api.lenders.create(newLenderData);
      setCurrentSubmissionId(created.id);
      setIsSubmitted('lender');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not submit lender profile.');
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg"><div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-theme-yellow" /></div>;
  }

  if (!currentUser) {
    return authMode === 'login' ? <LoginPage onLogin={setCurrentUser} onModeChange={setAuthMode} /> : <RegisterPage onRegister={setCurrentUser} onModeChange={setAuthMode} />;
  }

  if (printingSubmission) return <PrintView formData={printingSubmission} onClose={() => setPrintingSubmission(null)} />;

  if (isSubmitted) {
    const isMerchant = isSubmitted === 'merchant';
    const handleDownloadPdf = async () => {
        if (!currentSubmissionId) return;
        try { setPrintingSubmission(await api.merchants.get(currentSubmissionId)); }
        catch { alert('Error: Could not find submission data to generate PDF.'); }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg text-center p-8 max-w-lg">
                <img src="/logo.png" alt="MCA King Logo" className="mx-auto mb-6 h-20 w-auto" />
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-4">{isMerchant ? 'Application Submitted!' : 'Lender Info Submitted!'}</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">Thank you. We have received your {isMerchant ? 'application' : 'information'}.</p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center mt-6">
                    <button onClick={() => { setIsSubmitted(false); setSetupView('dashboard'); }} className="px-6 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-yellow hover:bg-theme-yellow/90">View My Dashboard</button>
                    {isMerchant && <button onClick={handleDownloadPdf} className="px-6 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-teal hover:bg-theme-teal/90">Download Application PDF</button>}
                </div>
            </div>
            <Chatbot context={chatContext} />
        </div>
    );
  }

  if (setupView === 'merchant_form') {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-8 sm:p-12">
        <img src="/logo.png" alt="MCA King Logo" className="mb-8 h-24 w-auto" />
        <div className="w-full max-w-6xl relative">
          <div className="absolute top-4 right-4 z-10"><ThemeToggle theme={theme} setTheme={setTheme} /></div>
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg grid md:grid-cols-3">
            <div className="p-12 border-r border-slate-200 dark:border-theme-maroon/50 hidden md:block"><StepIndicator steps={STEPS.map(s => s.name)} descriptions={STEPS.map(s => s.description)} currentStep={currentStep} /></div>
            <div className="md:col-span-2 p-12">
              <header className="mb-8"><h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">{STEPS[currentStep].name}</h1><p className="text-slate-500 dark:text-slate-400 mt-1">{STEPS[currentStep].description}</p></header>
              <form onSubmit={handleMerchantSubmit} noValidate>
                <div className="mb-8">{renderStepContent()}</div>
                <div className="mt-8 pt-5 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                  <button type="button" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0} className="px-6 py-2 rounded-md text-sm font-medium bg-white text-slate-700 border border-slate-300 disabled:opacity-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500">Back</button>
                  {currentStep < STEPS.length - 1 ? <button type="button" onClick={() => isStepValid && setCurrentStep(currentStep + 1)} disabled={!isStepValid} className="px-6 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-yellow disabled:opacity-50">Next</button> : <button type="submit" className="px-6 py-2 rounded-md text-sm font-medium text-theme-black bg-theme-teal disabled:opacity-50" disabled={formData.documents.length === 0}>Submit Application</button>}
                </div>
              </form>
            </div>
          </div>
          <div className="text-center mt-4"><button onClick={() => setSetupView('dashboard')} className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-theme-teal">&larr; Back to Dashboard</button></div>
        </div>
        <Chatbot context={chatContext} />
      </div>
    );
  }

  if (setupView === 'lender_form') {
    return <><LenderForm data={lenderData} updateData={updateLenderInfo} onSubmit={handleLenderSubmit} onExit={() => setSetupView('dashboard')} /><Chatbot context={chatContext} /></>;
  }

  return (
    <>
      <div className="absolute top-4 right-4 z-50"><ThemeToggle theme={theme} setTheme={setTheme} /></div>
      {(currentUser.role === 'merchant' || currentUser.role === 'lender') && (
        <div className="fixed bottom-4 right-4 z-50">
          <button onClick={() => setSetupView(currentUser.role === 'merchant' ? 'merchant_form' : 'lender_form')} className="rounded-full bg-theme-yellow px-5 py-3 text-sm font-bold text-theme-black shadow-lg hover:bg-theme-yellow/90">
            {currentUser.role === 'merchant' ? 'New Application' : 'Edit Lender Profile'}
          </button>
        </div>
      )}
      <DashboardController currentUser={currentUser} onLogout={handleLogout} onPrint={setPrintingSubmission} />
      <Chatbot context={chatContext} />
    </>
  );
};

export default App;
