import React from 'react';

interface MobileActionRowProps {
  children: React.ReactNode;
  className?: string;
  align?: 'between' | 'end' | 'start';
}

export const MobileActionRow: React.FC<MobileActionRowProps> = ({ children, className = '', align = 'end' }) => {
  const alignClass = align === 'between' ? 'sm:justify-between' : align === 'start' ? 'sm:justify-start' : 'sm:justify-end';
  return <div className={`flex flex-col gap-2 sm:flex-row sm:flex-wrap ${alignClass} ${className}`}>{children}</div>;
};
