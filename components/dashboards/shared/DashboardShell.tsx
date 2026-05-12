import React from 'react';
import { PrimaryButton } from '../../../src/components/ui/PrimaryButton';

interface DashboardShellSection<T extends string> {
  id: T;
  label: string;
}

interface DashboardShellProps<T extends string> {
  title: string;
  subtitle?: string;
  sections: DashboardShellSection<T>[];
  activeSection: T;
  onSectionChange: (section: T) => void;
  onExit: () => void;
  exitLabel?: string;
  themeToggle?: React.ReactNode;
  children: React.ReactNode;
}

export const DashboardShell = <T extends string>({
  title,
  subtitle,
  sections,
  activeSection,
  onSectionChange,
  onExit,
  exitLabel = 'Logout',
  themeToggle,
  children,
}: DashboardShellProps<T>) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white lg:dark:border-slate-700 lg:dark:bg-dark-card">
          <div className="flex items-center justify-between gap-3 px-6 py-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/logo.png" alt="MCA King Logo" className="h-10 w-auto" />
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h1>
                {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-44">{subtitle}</p>}
              </div>
            </div>
            {themeToggle}
          </div>
          <nav className="flex-1 p-4 space-y-2" aria-label="Dashboard sections">
            {sections.map(section => (
              <button
                key={section.id}
                type="button"
                onClick={() => onSectionChange(section.id)}
                className={`w-full rounded-lg px-4 py-3 text-left text-sm font-semibold transition-colors ${
                  activeSection === section.id
                    ? 'bg-theme-yellow text-theme-black shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
          <div className="space-y-3 p-4 border-t border-slate-200 dark:border-slate-700">
            <PrimaryButton label={`${exitLabel} →`} size="small" fullWidth onClick={onExit} />
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="lg:hidden p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <img src="/logo.png" alt="MCA King Logo" className="h-10 w-auto" />
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{title}</h1>
                  {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {themeToggle}
                <PrimaryButton label="Logout" size="small" onClick={onExit} />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sections.map(section => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSectionChange(section.id)}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    activeSection === section.id
                      ? 'bg-theme-yellow text-theme-black shadow-sm'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
