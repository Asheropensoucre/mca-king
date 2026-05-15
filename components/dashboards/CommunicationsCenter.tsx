import React, { useState } from 'react';
import type { AuthUser } from '../../types';
import { Card } from '../ui/Card';
import { CampaignBuilder } from './shared/communications/CampaignBuilder';
import { MessageTemplateEditor } from './shared/communications/MessageTemplateEditor';
import { SmsComingSoonNotice } from './shared/communications/SmsComingSoonNotice';

interface Props { currentUser: AuthUser; }

type CommunicationsTab = 'campaigns' | 'templates' | 'sms';

const tabClass = (active: boolean) => `rounded-lg px-4 py-2 text-sm font-black transition ${active ? 'bg-theme-maroon text-theme-yellow dark:bg-theme-yellow dark:text-theme-maroon' : 'bg-slate-100 text-theme-maroon hover:bg-slate-200 dark:bg-slate-900 dark:text-theme-yellow dark:hover:bg-slate-800'}`;

export const CommunicationsCenter: React.FC<Props> = ({ currentUser }) => {
  const [tab, setTab] = useState<CommunicationsTab>('campaigns');

  if (currentUser.role !== 'admin' && currentUser.role !== 'sales_rep') {
    return <Card className="p-6"><p className="text-sm font-bold text-red-600">Communications are available only to broker admins and internal sales reps.</p></Card>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-black text-theme-maroon dark:text-theme-yellow">Communications Center</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          Email-first communications through Resend. Campaign sends require unsubscribe handling, suppression checks, recipient preview,
          and a configured physical mailing address. Zoho Mail is not used for app campaigns. SMS sending is intentionally disabled.
        </p>
      </Card>

      <Card className="p-6">
        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4 dark:border-slate-700">
          <button className={tabClass(tab === 'campaigns')} onClick={() => setTab('campaigns')}>Email Campaigns</button>
          <button className={tabClass(tab === 'templates')} onClick={() => setTab('templates')}>Email Templates</button>
          <button className={tabClass(tab === 'sms')} onClick={() => setTab('sms')}>SMS Future Readiness</button>
        </div>

        {tab === 'campaigns' && <CampaignBuilder />}
        {tab === 'templates' && <MessageTemplateEditor />}
        {tab === 'sms' && <SmsComingSoonNotice />}
      </Card>
    </div>
  );
};
