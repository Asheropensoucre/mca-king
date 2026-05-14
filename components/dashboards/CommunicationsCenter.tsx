import React from 'react';
import type { AuthUser } from '../../types';
import { Card } from '../ui/Card';
import { CampaignBuilder } from './shared/communications/CampaignBuilder';
import { MessageTemplateEditor } from './shared/communications/MessageTemplateEditor';
import { SmsComingSoonNotice } from './shared/communications/SmsComingSoonNotice';

interface Props { currentUser: AuthUser; }

export const CommunicationsCenter: React.FC<Props> = ({ currentUser }) => {
  if (currentUser.role !== 'admin' && currentUser.role !== 'sales_rep') {
    return <Card className="p-6"><p className="text-sm font-bold text-red-600">Communications are available only to broker admins and internal sales reps.</p></Card>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-black text-theme-maroon dark:text-theme-yellow">Communications Center</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          Email-first communications through Resend. Campaign sends require unsubscribe handling, suppression checks, and recipient preview.
          Zoho Mail is not used for app campaigns. SMS sending is intentionally disabled.
        </p>
      </Card>
      <SmsComingSoonNotice />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CampaignBuilder />
        <MessageTemplateEditor />
      </div>
    </div>
  );
};
