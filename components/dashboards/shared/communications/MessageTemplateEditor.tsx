import React, { useEffect, useMemo, useState } from 'react';
import type { MessageTemplate } from '../../../../types';
import { api } from '../../../../src/lib/api-client';
import { Input } from '../../../ui/Input';
import { Textarea } from '../../../ui/Textarea';
import { Select } from '../../../ui/Select';
import { PrimaryButton } from '../../../../src/components/ui/PrimaryButton';
import { buildCommunicationEmailHtml, starterCampaignHtml } from '../../../../src/lib/communications/html';

type BodyMode = 'html' | 'text';

export const MessageTemplateEditor: React.FC = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({ name: '', subject: '', body: starterCampaignHtml(), category: 'campaign' as 'campaign' | 'transactional', body_mode: 'html' as BodyMode });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const htmlPreview = useMemo(() => buildCommunicationEmailHtml({ title: form.subject || form.name || 'Template Preview', body: form.body, preheader: form.subject }), [form.subject, form.name, form.body]);

  const load = () => api.communications.templates.list()
    .then(rows => { setTemplates(rows); setError(null); })
    .catch(err => setError(err instanceof Error ? err.message : 'Could not load templates'));
  useEffect(() => { void load(); }, []);

  const reset = () => {
    setSelectedId('');
    setForm({ name: '', subject: '', body: starterCampaignHtml(), category: 'campaign', body_mode: 'html' });
    setMessage(null);
  };

  const loadTemplate = (id: string) => {
    const template = templates.find(t => t.id === id);
    setSelectedId(id);
    if (!template) return;
    setForm({
      name: template.name,
      subject: template.subject || '',
      body: template.body,
      category: template.category,
      body_mode: /<\s*(p|div|table|h1|h2|a|ul|li|br|strong|span)\b/i.test(template.body) ? 'html' : 'text',
    });
    setMessage('Template loaded for editing. Campaigns send templates by selecting them in the Campaigns tab.');
  };

  const save = async () => {
    try {
      if (selectedId) {
        await api.communications.templates.update(selectedId, { ...form, channel: 'email', variables: ['{{name}}', '{{email}}', '{{phone}}'], is_active: true });
        setMessage('Template updated. Use it from the Campaigns tab by choosing it in “Use Saved Template”.');
      } else {
        const created = await api.communications.templates.create({ ...form, channel: 'email', variables: ['{{name}}', '{{email}}', '{{phone}}'], is_active: true });
        setSelectedId(created.id);
        setMessage('Template created. Use it from the Campaigns tab by choosing it in “Use Saved Template”.');
      }
      setError(null);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save template'); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-black text-theme-maroon dark:text-theme-yellow">Email Templates</h3>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          Build reusable HTML templates here. To send one, open the Campaigns tab and select it under “Use Saved Template”.
        </p>
      </div>
      {error && <p className="text-sm font-bold text-red-600 dark:text-red-300">{error}</p>}
      {message && <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{message}</p>}

      <Select label="Edit Existing Template" value={selectedId} onChange={e => loadTemplate(e.target.value)}>
        <option value="">Create new template</option>
        {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
      </Select>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Input label="Template Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <Select label="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as 'campaign' | 'transactional' })}><option value="campaign">Campaign</option><option value="transactional">Transactional</option></Select>
      </div>
      <Input label="Subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
        <span className="text-sm font-black text-theme-maroon dark:text-theme-yellow">Editor mode</span>
        <label className="text-sm font-bold"><input type="radio" checked={form.body_mode === 'html'} onChange={() => setForm({ ...form, body_mode: 'html' })} /> HTML</label>
        <label className="text-sm font-bold"><input type="radio" checked={form.body_mode === 'text'} onChange={() => setForm({ ...form, body_mode: 'text' })} /> Plain text auto-styled</label>
        <PrimaryButton label="Load Nice Starter HTML" size="small" onClick={() => setForm({ ...form, body: starterCampaignHtml(), body_mode: 'html' })} />
      </div>
      <Textarea label={form.body_mode === 'html' ? 'HTML Body' : 'Plain Text Body'} value={form.body} rows={12} onChange={e => setForm({ ...form, body: e.target.value })} />
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Available variables: {'{{name}}'}, {'{{email}}'}, {'{{phone}}'}. HTML is wrapped in the MCA King email shell automatically unless you paste a full HTML document.</p>

      <div>
        <h4 className="mb-2 text-sm font-black uppercase text-theme-yellow">Template Preview</h4>
        <iframe title="Template preview" srcDoc={htmlPreview} className="h-[460px] w-full rounded-xl border-2 border-slate-200 bg-white dark:border-slate-700" />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <PrimaryButton label="New Template" size="small" onClick={reset} />
        <PrimaryButton label={selectedId ? 'Update Template' : 'Create Template'} size="small" disabled={!form.name || !form.body} onClick={() => void save()} />
      </div>
    </div>
  );
};
