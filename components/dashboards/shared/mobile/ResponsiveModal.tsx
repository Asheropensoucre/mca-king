import React from 'react';
import { Card } from '../../../ui/Card';

interface ResponsiveModalProps {
  children: React.ReactNode;
  className?: string;
  zIndexClass?: string;
  ariaLabel?: string;
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({ children, className = '', zIndexClass = 'z-50', ariaLabel = 'Dialog' }) => (
  <div className={`fixed inset-0 ${zIndexClass} flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4`} role="dialog" aria-modal="true" aria-label={ariaLabel}>
    <Card className={`max-h-[92dvh] w-full overflow-y-auto rounded-b-none sm:rounded-b-xl ${className}`}>
      {children}
    </Card>
  </div>
);
