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
        border: 'border-t-4 border-t-danger',
        title: 'text-danger',
        badge: 'bg-danger text-on-danger',
      };
    case 'warning':
      return {
        border: 'border-t-4 border-t-warning',
        title: 'text-warning ',
        badge: 'bg-warning text-on-warning',
      };
    case 'success':
      return {
        border: 'border-t-4 border-t-success',
        title: 'text-success ',
        badge: 'bg-success text-on-success',
      };
    default:
      return {
        border: 'border-t-4 border-t-line-strong',
        title: 'text-main',
        badge: 'bg-surface-muted text-main border border-line',
      };
  }
};
