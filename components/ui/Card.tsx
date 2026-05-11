import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-dark-card rounded-lg shadow-md border border-slate-200 dark:border-slate-700 ${className}`}>
      {children}
    </div>
  );
};