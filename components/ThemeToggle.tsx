import React from 'react';

export type Theme = 'light' | 'dark';

interface ThemeToggleProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  className?: string;
  compact?: boolean;
}

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
  </svg>
);

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, setTheme, className = '', compact = false }) => {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface/95 px-3 py-2 text-xs font-bold text-main shadow-sm transition hover:border-secondary/50 hover:bg-surface-muted hover:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/70  -muted/90  dark:hover:border-accent/50 hover:bg-surface-muted dark:hover:text-accent ${className}`}
    >
      <span className={`flex h-7 w-7 items-center justify-center rounded-full ${isDark ? 'bg-accent text-on-accent' : 'bg-secondary text-on-accent'}`}>
        {isDark ? <SunIcon /> : <MoonIcon />}
      </span>
      {!compact && <span>{isDark ? 'Light' : 'Dark'} Mode</span>}
    </button>
  );
};
