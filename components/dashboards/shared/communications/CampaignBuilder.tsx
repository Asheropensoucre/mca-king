import React, { useEffect, useMemo, useState } from 'react';
import type { Campaign, MessageTemplate, RecipientPreview } from '../../../../types';
import { api } from '../../../../src/lib/api-client';
import { Input } from '../../../ui/Input';
import { Textarea } from '../../../ui/Textarea';
import { Select } from '../../../ui/Select';
import { PrimaryButton } from '../../../../src/components/ui/PrimaryButton';
import { CampaignRecipientPreview } from './CampaignRecipientPreview';
import { SmsComingSoonNotice } from './SmsComingSoonNotice';
import { buildCommunicationEmailHtml, starterCampaignHtml } from '../../../../src/lib/communications/html';

type BodyMode = 'html' | 'text';

export const CampaignBuilder: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [form, setForm] = useState({ name: '', subject: '', body: starterCampaignHtml(), entity_type: 'lead' as 'lead' | 'merchant', template_id: '', body_mode: 'html' as BodyMode });
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [preview, setPreview] = useState<RecipientPreview | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const htmlPreview = useMemo(() => buildCommunicationEmailHtml({ title: form.subject || 'Email Preview', body: form.body, preheader: form.subject }), [form.subject, form.body]);

  const load = async () => {
    try {
      const [campaignRows, templateRows] = await Promise.all([
        api.communications.campaigns.list(),
        api.communications.templates.list(),
      ]);
      setCampaigns(campaignRows);
      setTemplates(templateRows.filter(t => t.channel === 'email' && t.is_active));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load communications');
    }
  };
  useEffect(() => { void load(); }, []);

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      setForm({ ...form, template_id: '' });
      return;
    }
    setForm({
      ...form,
      template_id: template.id,
      subject: template.subject || form.subject,
      body: template.body,
      body_mode: /<\s*(p|div|table|h1|h2|a|ul|li|br|strong|span)\b/i.test(template.body) ? 'html' : 'text',
    });
    setPreview(null);
  };

  const saveDraft = async (): Promise<Campaign> => {
    const payload = {
      name: form.name,
      subject: form.subject,
      body: form.body,
      template_id: form.template_id || null,
      metadata: { recipient_entity_type: form.entity_type, body_mode: form.body_mode },
    };
    const saved = activeCampaign
      ? await api.communications.campaigns.update(activeCampaign.id, payload as Partial<Campaign>)
      : await api.communications.campaigns.create(payload);
    setActiveCampaign(saved);
    await load();
    return saved;
  };

  const create = async () => {
    try {
      await saveDraft();
      setResult('Draft saved. Next: preview recipients, then send the batch.');
      setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save campaign'); }
  };

  const previewRecipients = async () => {
    try {
      const campaign = await saveDraft();
      setPreview(await api.communications.campaigns.previewRecipients(campaign.id, { entity_type: form.entity_type }));
      setResult('Recipient preview loaded. Review skipped/suppressed counts before sending.');
      setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not preview recipients'); }
  };

  const send = async () => {
    if (!activeCampaign) return;
    try {
      const campaign = await saveDraft();
      const sent = await api.communications.campaigns.send(campaign.id, { entity_type: form.entity_type });
      setResult(`Sent ${sent.sent}, skipped ${sent.skipped}, failed ${sent.failed}.`); setError(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not send campaign'); }
  };

  const loadCampaign = (campaign: Campaign) => {
    setActiveCampaign(campaign);
    setForm({
      name: campaign.name,
      subject: campaign.subject || '',
      body: campaign.body || '',
      entity_type: (campaign.metadata?.recipient_entity_type as 'lead' | 'merchant') || 'lead',
      template_id: campaign.template_id || '',
      body_mode: (campaign.metadata?.body_mode as BodyMode) || (/<\s*(p|div|table|h1|h2|a|ul|li|br|strong|span)\b/i.test(campaign.body || '') ? 'html' : 'text'),
    });
    setPreview(null);
    setResult('Draft loaded. You can edit, preview recipients, or send.');
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-black text-theme-maroon dark:text-theme-yellow">Email Campaigns</h3>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          Step 1: choose a saved template or write HTML. Step 2: save/preview recipients. Step 3: send a controlled Resend batch.
        </p>
      </div>
      {error && <p className="text-sm font-bold text-red-600 dark:text-red-300">{error}</p>}
      {result && <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{result}</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Input label="Campaign Name" value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setPreview(null); }} />
        <Select label="Recipient Type" value={form.entity_type} onChange={e => { setForm({ ...form, entity_type: e.target.value as 'lead' | 'merchant' }); setPreview(null); }}><option value="lead">Leads</option><option value="merchant">Merchants</option></Select>
      </div>

      <Select label="Use Saved Template" value={form.template_id} onChange={e => applyTemplate(e.target.value)}>
        <option value="">No template / custom campaign</option>
        {templates.map(template => <option key={template.id} value={template.id}>{template.name} ({template.category})</option>)}
      </Select>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Templates are sent by selecting them here. Choosing one fills the subject/body below, then the campaign sends that template content.</p>

      <Input label="Subject" value={form.subject} onChange={e => { setForm({ ...form, subject: e.target.value }); setPreview(null); }} />
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
        <span className="text-sm font-black text-theme-maroon dark:text-theme-yellow">Editor mode</span>
        <label className="text-sm font-bold"><input type="radio" checked={form.body_mode === 'html'} onChange={() => setForm({ ...form, body_mode: 'html' })} /> HTML</label>
        <label className="text-sm font-bold"><input type="radio" checked={form.body_mode === 'text'} onChange={() => setForm({ ...form, body_mode: 'text' })} /> Plain text auto-styled</label>
        <PrimaryButton label="Load Nice Starter HTML" size="small" onClick={() => setForm({ ...form, body: starterCampaignHtml(), body_mode: 'html' })} />
      </div>
      <Textarea label={form.body_mode === 'html' ? 'HTML Body' : 'Plain Text Body'} rows={12} value={form.body} onChange={e => { setForm({ ...form, body: e.target.value }); setPreview(null); }} />

      <div>
        <h4 className="mb-2 text-sm font-black uppercase text-theme-yellow">Email Preview</h4>
        <iframe title="Email preview" srcDoc={htmlPreview} className="h-[460px] w-full rounded-xl border-2 border-slate-200 bg-white dark:border-slate-700" />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <PrimaryButton label="Save Draft" size="small" disabled={!form.name || !form.subject || !form.body} onClick={() => void create()} />
        <PrimaryButton label="Preview Recipients" size="small" disabled={!form.name || !form.subject || !form.body} onClick={() => void previewRecipients()} />
        <PrimaryButton label="Send Batch" size="small" variant="funded" disabled={!activeCampaign || !preview || preview.sendable === 0} onClick={() => void send()} />
      </div>
      <CampaignRecipientPreview preview={preview} />
      <SmsComingSoonNotice />
      <div className="space-y-2">
        <h4 className="text-sm font-black uppercase text-theme-yellow">Recent Campaign Drafts</h4>
        {campaigns.map(c => <button key={c.id} onClick={() => loadCampaign(c)} className="block w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm dark:border-slate-700 dark:bg-slate-900/60"><span className="font-black text-theme-maroon dark:text-theme-yellow">{c.name}</span><span className="float-right text-xs font-bold uppercase text-theme-teal">{c.status}</span></button>)}
      </div>
    </div>
  );
};
