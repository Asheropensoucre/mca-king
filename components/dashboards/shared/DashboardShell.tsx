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

const navButton = (active: boolean) => `w-full rounded-lg border-2 px-4 py-3 text-left text-sm font-black transition-all ${active ? 'border-accent bg-accent text-on-accent shadow-[4px_4px_0_rgb(var(--color-secondary))]' : 'border-secondary/50 bg-surface-muted text-main hover:border-accent hover:bg-surface-strong'}`;
const mobileNavButton = (active: boolean) => `shrink-0 rounded-lg border-2 px-4 py-2 text-sm font-black transition-colors ${active ? 'border-accent bg-accent text-on-accent shadow-[3px_3px_0_rgb(var(--color-secondary))]' : 'border-secondary/50 bg-surface text-main hover:bg-surface-muted'}`;

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
    <div className="min-h-screen text-main">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:border-r-2 lg:border-line-strong lg:bg-surface lg:shadow-[8px_0_0_rgb(var(--color-accent))] lg:backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 border-b-2 border-line-strong px-6 py-6">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/logo.png" alt="MCA King Logo" className="h-10 w-auto" />
              <div className="min-w-0">
                <h1 className="text-lg font-black text-main">{title}</h1>
                {subtitle && <p className="max-w-44 truncate text-xs font-bold text-muted">{subtitle}</p>}
              </div>
            </div>
            {themeToggle}
          </div>
          <nav className="flex-1 space-y-3 p-4" aria-label="Dashboard sections">
            {mainSections.map(section => (
              <button key={section.id} type="button" onClick={() => onSectionChange(section.id)} className={navButton(activeSection === section.id)}>
                {section.label}
              </button>
            ))}
          </nav>
          <div className="space-y-3 border-t-2 border-line-strong p-4">
            {settingsSection && (
              <button type="button" onClick={() => onSectionChange(settingsSection.id)} className={navButton(activeSection === settingsSection.id)}>
                {settingsSection.label}
              </button>
            )}
            <PrimaryButton label={`${exitLabel} →`} size="small" fullWidth onClick={onExit} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="border-b-2 border-line-strong bg-surface/95 p-4 shadow-[0_6px_0_rgb(var(--color-border-strong))] backdrop-blur-sm dark:shadow-[0_6px_0_rgb(var(--color-accent))] lg:hidden">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <img src="/logo.png" alt="MCA King Logo" className="h-10 w-auto" />
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-black text-main">{title}</h1>
                  {subtitle && <p className="truncate text-xs font-bold text-muted">{subtitle}</p>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {themeToggle}
                <PrimaryButton label="Logout" size="small" onClick={onExit} />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sections.map(section => (
                <button key={section.id} type="button" onClick={() => onSectionChange(section.id)} className={mobileNavButton(activeSection === section.id)}>
                  {section.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden border-b-2 border-line-strong bg-surface/95 px-8 py-5 shadow-[0_6px_0_rgb(var(--color-border-strong))] backdrop-blur-sm dark:shadow-[0_6px_0_rgb(var(--color-accent))] lg:block">
            <h2 className="text-2xl font-black text-main">{title}</h2>
            {subtitle && <p className="mt-1 text-sm font-bold text-muted">{subtitle}</p>}
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
