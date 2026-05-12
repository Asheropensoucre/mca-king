import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`rounded-xl border-2 border-theme-maroon/80 bg-white/95 shadow-[6px_6px_0_var(--ct-primary)] backdrop-blur-sm dark:border-theme-yellow/80 dark:bg-dark-card/95 dark:shadow-[6px_6px_0_var(--ct-secondary-fixed-dim)] ${className}`}>
      {children}
    </div>
  );
};
