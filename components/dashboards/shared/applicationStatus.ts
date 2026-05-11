import type { ApplicationStatus } from '../../../types';

export type StatusTheme = 'default' | 'error' | 'warning' | 'success';

export interface ApplicationStatusConfig {
  id: string;
  label: ApplicationStatus;
  theme: StatusTheme;
}

export const APPLICATION_STATUS_CONFIG: ApplicationStatusConfig[] = [
  { id: 'application-docs-in', label: 'application & 3 months bank statements in', theme: 'default' },
  { id: 'sent-to-lender', label: 'sent to lender', theme: 'default' },
  { id: 'all-lenders-decline', label: 'all lenders decline', theme: 'error' },
  { id: 'offer-received', label: "one or more lender's sent offer", theme: 'default' },
  { id: 'merchant-accepts-offer', label: 'Merchant accepts offer', theme: 'default' },
  { id: 'merchant-declines-offers', label: "Merchant Declines Offer's", theme: 'error' },
  { id: 'more-docs-requested', label: 'more docs requested', theme: 'warning' },
  { id: 'contract-sent', label: 'contract sent', theme: 'default' },
  { id: 'contract-signed', label: 'contract signed', theme: 'default' },
  { id: 'contract-declined-by-merchant', label: 'contract declined by the merchant', theme: 'error' },
  { id: 'declined-by-funder', label: 'Declined by funder', theme: 'error' },
  { id: 'funded', label: 'FUNDED', theme: 'success' },
];

export const APPLICATION_STATUSES = APPLICATION_STATUS_CONFIG.map(status => status.label);


export const DEFAULT_APPLICATION_STATUS: ApplicationStatus = APPLICATION_STATUS_CONFIG[0].label;

export const isApplicationStatus = (value: unknown): value is ApplicationStatus => (
  typeof value === 'string' && APPLICATION_STATUSES.includes(value as ApplicationStatus)
);

export const normalizeApplicationStatus = (status: unknown): ApplicationStatus => {
  if (isApplicationStatus(status)) return status;
  return DEFAULT_APPLICATION_STATUS;
};

export const getStatusIndex = (status: ApplicationStatus) => (
  APPLICATION_STATUSES.indexOf(normalizeApplicationStatus(status))
);

export const getStatusThemeClasses = (theme: StatusTheme) => {
  switch (theme) {
    case 'error':
      return {
        border: 'border-t-4 border-t-theme-red',
        title: 'text-theme-red',
        badge: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
      };
    case 'warning':
      return {
        border: 'border-t-4 border-t-amber-500',
        title: 'text-amber-600 dark:text-amber-400',
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
      };
    case 'success':
      return {
        border: 'border-t-4 border-t-emerald-500',
        title: 'text-emerald-600 dark:text-emerald-400',
        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
      };
    default:
      return {
        border: '',
        title: 'text-slate-600 dark:text-slate-300',
        badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
      };
  }
};
