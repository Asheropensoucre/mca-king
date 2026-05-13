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
  settingsSectionId?: T;
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
  settingsSectionId,
  children,
}: DashboardShellProps<T>) => {
  const mainSections = settingsSectionId ? sections.filter(section => section.id !== settingsSectionId) : sections;
  const settingsSection = settingsSectionId ? sections.find(section => section.id === settingsSectionId) : undefined;

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:border-r-2 lg:border-theme-maroon/70 lg:bg-slate-950/90 lg:shadow-[8px_0_0_var(--ct-secondary-fixed-dim)] lg:backdrop-blur-sm lg:dark:border-theme-yellow/80 lg:dark:bg-slate-950/95">
          <div className="flex items-center justify-between gap-3 border-b-2 border-theme-maroon/70 px-6 py-6 dark:border-theme-yellow/70">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/logo.png" alt="MCA King Logo" className="h-10 w-auto" />
              <div className="min-w-0">
                <h1 className="text-lg font-black text-theme-yellow">{title}</h1>
                {subtitle && <p className="max-w-44 truncate text-xs font-semibold text-theme-teal/90">{subtitle}</p>}
              </div>
            </div>
            {themeToggle}
          </div>
          <nav className="flex-1 space-y-3 p-4" aria-label="Dashboard sections">
            {mainSections.map(section => (
              <button
                key={section.id}
                type="button"
                onClick={() => onSectionChange(section.id)}
                className={`w-full rounded-lg border-2 px-4 py-3 text-left text-sm font-black transition-all ${
                  activeSection === section.id
                    ? 'border-theme-maroon bg-theme-yellow text-theme-black shadow-[4px_4px_0_var(--ct-secondary-fixed-dim)]'
                    : 'border-theme-teal/40 bg-slate-900/80 text-theme-teal hover:border-theme-yellow hover:bg-slate-800 hover:text-theme-yellow'
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
          <div className="space-y-3 border-t-2 border-theme-maroon/70 p-4 dark:border-theme-yellow/70">
            {settingsSection && (
              <button
                type="button"
                onClick={() => onSectionChange(settingsSection.id)}
                className={`w-full rounded-lg border-2 px-4 py-3 text-left text-sm font-black transition-all ${
                  activeSection === settingsSection.id
                    ? 'border-theme-maroon bg-theme-yellow text-theme-black shadow-[4px_4px_0_var(--ct-secondary-fixed-dim)]'
                    : 'border-theme-teal/40 bg-slate-900/80 text-theme-teal hover:border-theme-yellow hover:bg-slate-800 hover:text-theme-yellow'
                }`}
              >
                {settingsSection.label}
              </button>
            )}
            <PrimaryButton label={`${exitLabel} →`} size="small" fullWidth onClick={onExit} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="border-b-2 border-theme-maroon/70 bg-white/90 p-4 shadow-[0_6px_0_var(--ct-primary)] backdrop-blur-sm dark:border-theme-yellow/70 dark:bg-slate-950/90 dark:shadow-[0_6px_0_var(--ct-secondary-fixed-dim)] lg:hidden">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <img src="/logo.png" alt="MCA King Logo" className="h-10 w-auto" />
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-black text-theme-maroon dark:text-theme-yellow">{title}</h1>
                  {subtitle && <p className="truncate text-xs font-semibold text-theme-teal">{subtitle}</p>}
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
                  className={`shrink-0 rounded-lg border-2 px-4 py-2 text-sm font-black transition-colors ${
                    activeSection === section.id
                      ? 'border-theme-maroon bg-theme-yellow text-theme-black shadow-[3px_3px_0_var(--ct-secondary-fixed-dim)]'
                      : 'border-theme-teal/50 bg-white/90 text-theme-maroon dark:bg-slate-900 dark:text-theme-teal'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden border-b-2 border-theme-maroon/70 bg-white/90 px-8 py-5 shadow-[0_6px_0_var(--ct-primary)] backdrop-blur-sm dark:border-theme-yellow/70 dark:bg-slate-950/80 dark:shadow-[0_6px_0_var(--ct-secondary-fixed-dim)] lg:block">
            <h2 className="text-2xl font-black text-theme-maroon dark:text-theme-yellow">{title}</h2>
            {subtitle && <p className="mt-1 text-sm font-semibold text-theme-teal">{subtitle}</p>}
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
