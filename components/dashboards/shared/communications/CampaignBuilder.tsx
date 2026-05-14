import React, { useEffect, useState } from 'react';
import type { Campaign, RecipientPreview } from '../../../../types';
import { api } from '../../../../src/lib/api-client';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { Textarea } from '../../../ui/Textarea';
import { Select } from '../../../ui/Select';
import { PrimaryButton } from '../../../../src/components/ui/PrimaryButton';
import { CampaignRecipientPreview } from './CampaignRecipientPreview';
import { SmsComingSoonNotice } from './SmsComingSoonNotice';

export const CampaignBuilder: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState({ name: '', subject: '', body: '', entity_type: 'lead' as 'lead' | 'merchant' });
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [preview, setPreview] = useState<RecipientPreview | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.communications.campaigns.list().then(setCampaigns).catch(err => setError(err instanceof Error ? err.message : 'Could not load campaigns'));
  useEffect(() => { void load(); }, []);

  const create = async () => {
    try {
      const created = await api.communications.campaigns.create({ name: form.name, subject: form.subject, body: form.body, metadata: { recipient_entity_type: form.entity_type } });
      setActiveCampaign(created); setError(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not create campaign'); }
  };
  const previewRecipients = async () => {
    const campaign = activeCampaign || await api.communications.campaigns.create({ name: form.name, subject: form.subject, body: form.body, metadata: { recipient_entity_type: form.entity_type } });
    setActiveCampaign(campaign);
    setPreview(await api.communications.campaigns.previewRecipients(campaign.id, { entity_type: form.entity_type }));
    await load();
  };
  const send = async () => {
    if (!activeCampaign) return;
    try {
      const sent = await api.communications.campaigns.send(activeCampaign.id, { entity_type: form.entity_type });
      setResult(`Sent ${sent.sent}, skipped ${sent.skipped}, failed ${sent.failed}.`); setError(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not send campaign'); }
  };

  return (
    <Card className="p-5 space-y-4">
      <div><h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">Email Campaigns</h3><p className="text-xs font-semibold text-slate-500">Selected-recipient email only. Suppressions, opt-outs, do-not-contact, physical address, and unsubscribe footer are enforced server-side.</p></div>
      {error && <p className="text-sm font-bold text-red-600 dark:text-red-300">{error}</p>}{result && <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{result}</p>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2"><Input label="Campaign Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /><Select label="Recipient Type" value={form.entity_type} onChange={e => setForm({ ...form, entity_type: e.target.value as 'lead' | 'merchant' })}><option value="lead">Leads</option><option value="merchant">Merchants</option></Select></div>
      <Input label="Subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
      <Textarea label="Body" rows={6} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
      <div className="flex flex-wrap justify-end gap-2"><PrimaryButton label="Save Draft" size="small" disabled={!form.name || !form.subject || !form.body} onClick={() => void create()} /><PrimaryButton label="Preview Recipients" size="small" disabled={!form.name || !form.subject || !form.body} onClick={() => void previewRecipients()} /><PrimaryButton label="Send Batch" size="small" variant="funded" disabled={!activeCampaign || !preview || preview.sendable === 0} onClick={() => void send()} /></div>
      <CampaignRecipientPreview preview={preview} />
      <SmsComingSoonNotice />
      <div className="space-y-2"><h4 className="text-sm font-black uppercase text-theme-yellow">Recent Campaigns</h4>{campaigns.map(c => <button key={c.id} onClick={() => { setActiveCampaign(c); setForm({ name: c.name, subject: c.subject || '', body: c.body || '', entity_type: (c.metadata?.recipient_entity_type as 'lead' | 'merchant') || 'lead' }); setPreview(null); }} className="block w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm dark:border-slate-700 dark:bg-slate-900/60"><span className="font-black text-theme-maroon dark:text-theme-yellow">{c.name}</span><span className="float-right text-xs font-bold uppercase text-theme-teal">{c.status}</span></button>)}</div>
    </Card>
  );
};
