import React from 'react';
import { Card } from '../../../ui/Card';

interface ReportSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export const ReportSection: React.FC<ReportSectionProps> = ({ title, description, children, action }) => (
  <Card>
    <div className="p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">{title}</h3>
          {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  </Card>
);
