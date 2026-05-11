import React from 'react';

interface StepIndicatorProps {
  steps: string[];
  descriptions: string[];
  currentStep: number;
}

const CheckIcon = () => (
    <svg className="h-6 w-6 text-theme-black" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
    </svg>
);


export const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, descriptions, currentStep }) => {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="overflow-hidden">
        {steps.map((step, stepIdx) => {
          const status =
            stepIdx < currentStep ? 'complete' : stepIdx === currentStep ? 'current' : 'upcoming';

          return (
            <li key={step} className="relative pb-10">
              {stepIdx !== steps.length - 1 && (
                <div
                  className={`absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 ${
                    status === 'complete' ? 'bg-theme-yellow' : 'bg-gray-300 dark:bg-slate-700'
                  }`}
                  aria-hidden="true"
                />
              )}
              <div className="group relative flex items-start">
                <span className="flex h-9 items-center">
                  <span
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                      status === 'complete' ? 'bg-theme-yellow' : status === 'current' ? 'border-2 border-theme-yellow bg-white dark:bg-dark-card' : 'border-2 border-gray-300 bg-white dark:border-slate-700 dark:bg-dark-card'
                    }`}
                  >
                    {status === 'complete' ? (
                      <CheckIcon />
                    ) : status === 'current' ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-theme-yellow" />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-transparent" />
                    )}
                  </span>
                </span>
                <span className="ml-4 flex min-w-0 flex-col">
                  <span
                    className={`text-base font-medium ${
                      status === 'current' ? 'text-theme-yellow' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {step}
                  </span>
                  <span className="text-base text-gray-500 dark:text-gray-400">{descriptions[stepIdx]}</span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};