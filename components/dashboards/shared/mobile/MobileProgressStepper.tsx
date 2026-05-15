import React from 'react';

interface MobileProgressStepperProps {
  steps: string[];
  descriptions?: string[];
  currentStep: number;
}

export const MobileProgressStepper: React.FC<MobileProgressStepperProps> = ({ steps, descriptions = [], currentStep }) => {
  const total = Math.max(steps.length, 1);
  const safeStep = Math.min(Math.max(currentStep, 0), total - 1);
  const progress = ((safeStep + 1) / total) * 100;

  return (
    <div className="rounded-xl border-2 border-line bg-surface-muted p-4 shadow-sm md:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-secondary">Step {safeStep + 1} of {total}</p>
          <h2 className="mt-1 truncate text-lg font-black text-main">{steps[safeStep]}</h2>
          {descriptions[safeStep] && <p className="mt-1 text-sm font-semibold text-muted">{descriptions[safeStep]}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-black text-on-accent">{Math.round(progress)}%</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Application step list">
        {steps.map((step, index) => (
          <span
            key={step}
            className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-black ${index === safeStep ? 'border-accent bg-accent text-on-accent' : index < safeStep ? 'border-secondary bg-secondary/15 text-secondary' : 'border-line bg-surface text-muted'}`}
          >
            {index + 1}. {step}
          </span>
        ))}
      </div>
    </div>
  );
};
