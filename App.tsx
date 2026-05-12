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
import { DarkModeToggle } from './src/components/ui/DarkModeToggle';
import { PrimaryButton } from './src/components/ui/PrimaryButton';
import { MCAKingLoader } from './src/components/ui/MCAKingLoader';
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

type Theme = 'light' | 'dark';
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

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const darkModeToggle = <DarkModeToggle isDark={theme === 'dark'} onToggle={toggleTheme} />;

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
    return <div className="min-h-screen flex items-center justify-center"><MCAKingLoader label="Loading MCA King..." size="large" /></div>;
  }

  if (!currentUser) {
    return authMode === 'login'
      ? <LoginPage onLogin={setCurrentUser} onModeChange={setAuthMode} theme={theme} setTheme={setTheme} />
      : <RegisterPage onRegister={setCurrentUser} onModeChange={setAuthMode} theme={theme} setTheme={setTheme} />;
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
                    <PrimaryButton label="View My Dashboard" onClick={() => { setIsSubmitted(false); setSetupView('dashboard'); }} />
                    {isMerchant && <PrimaryButton label="Download Application PDF" onClick={handleDownloadPdf} variant="funded" />}
                </div>
            </div>
            <Chatbot currentUser={currentUser} currentPage={isMerchant ? 'Application Submitted' : 'Lender Profile Submitted'} contextData={{ submissionType: isMerchant ? 'merchant_application' : 'lender_profile', currentSubmissionId }} />
        </div>
    );
  }

  if (setupView === 'merchant_form') {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-8 pb-36 sm:p-12 sm:pb-36">
        <img src="/logo.png" alt="MCA King Logo" className="mb-8 h-24 w-auto" />
        <div className="w-full max-w-6xl relative">
          <div className="mb-4 flex justify-end">{darkModeToggle}</div>
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg grid md:grid-cols-3">
            <div className="p-12 border-r border-slate-200 dark:border-theme-maroon/50 hidden md:block"><StepIndicator steps={STEPS.map(s => s.name)} descriptions={STEPS.map(s => s.description)} currentStep={currentStep} /></div>
            <div className="md:col-span-2 p-12">
              <header className="mb-8"><h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">{STEPS[currentStep].name}</h1><p className="text-slate-500 dark:text-slate-400 mt-1">{STEPS[currentStep].description}</p></header>
              <form onSubmit={handleMerchantSubmit} noValidate>
                <div className="mb-8">{renderStepContent()}</div>
                <div className="mt-8 pt-5 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                  <PrimaryButton label="Back" size="small" variant="danger" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0} />
                  {currentStep < STEPS.length - 1 ? <PrimaryButton label="Next" onClick={() => isStepValid && setCurrentStep(currentStep + 1)} disabled={!isStepValid} /> : <PrimaryButton type="submit" label="Submit Application" disabled={formData.documents.length === 0} variant="funded" />}
                </div>
              </form>
            </div>
          </div>
          <div className="mt-6 flex justify-center"><PrimaryButton label="Back to Dashboard" size="small" onClick={() => setSetupView('dashboard')} /></div>
        </div>
        <Chatbot currentUser={currentUser} currentPage="Application Form" contextData={{ currentStep: STEPS[currentStep].name, stepNumber: currentStep + 1, totalSteps: STEPS.length, requestedAmount: formData.requestedAmount, documentsUploaded: formData.documents.length }} />
      </div>
    );
  }

  if (setupView === 'lender_form') {
    return <><LenderForm data={lenderData} updateData={updateLenderInfo} onSubmit={handleLenderSubmit} onExit={() => setSetupView('dashboard')} headerAction={darkModeToggle} /><Chatbot currentUser={currentUser} currentPage="Lender Criteria Form" contextData={{ lenderName: lenderData.lenderName, minRevenue: lenderData.minRevenue, maxFundingAmount: lenderData.maxFundingAmount, minCreditScore: lenderData.minCreditScore }} /></>;
  }

  return (
    <>
      {currentUser.role === 'lender' && (
        <div className="fixed bottom-6 left-6 z-50">
          <PrimaryButton
            label="Edit Profile"
            onClick={() => setSetupView('lender_form')}
          />
        </div>
      )}
      <DashboardController currentUser={currentUser} onLogout={handleLogout} onStartMerchantApplication={() => setSetupView('merchant_form')} themeToggle={darkModeToggle} onPrint={setPrintingSubmission} />
    </>
  );
};

export default App;
