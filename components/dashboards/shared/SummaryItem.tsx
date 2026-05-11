import React from 'react';

export const SummaryItem: React.FC<{ label: string; value?: string | number | React.ReactNode; className?: string }> = ({ label, value, className = '' }) => (
    <div className={className}>
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 break-words">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{value || value === 0 ? value : 'N/A'}</dd>
    </div>
);
