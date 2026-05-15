import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'strong';
}

const variants: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'border-line bg-surface text-main shadow-[6px_6px_0_rgb(var(--color-border-strong))] dark:shadow-[6px_6px_0_rgb(var(--color-accent))]',
  subtle: 'border-line bg-surface-muted text-main shadow-sm',
  strong: 'border-line-strong bg-surface-strong text-main shadow-[6px_6px_0_rgb(var(--color-accent))]',
};

export const Card: React.FC<CardProps> = ({ children, className = '', variant = 'default' }) => {
  return (
    <div className={`rounded-xl border-2 backdrop-blur-sm ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};
