import React, { useEffect, useState } from 'react';
import type { MessageTemplate } from '../../../../types';
import { api } from '../../../../src/lib/api-client';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { Textarea } from '../../../ui/Textarea';
import { Select } from '../../../ui/Select';
import { PrimaryButton } from '../../../../src/components/ui/PrimaryButton';

export const MessageTemplateEditor: React.FC = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [form, setForm] = useState({ name: '', subject: '', body: '', category: 'campaign' as 'campaign' | 'transactional' });
  const [error, setError] = useState<string | null>(null);

  const load = () => api.communications.templates.list().then(setTemplates).catch(err => setError(err instanceof Error ? err.message : 'Could not load templates'));
  useEffect(() => { void load(); }, []);

  const create = async () => {
    try {
      await api.communications.templates.create({ ...form, channel: 'email', variables: ['{{name}}', '{{email}}', '{{phone}}'], is_active: true });
      setForm({ name: '', subject: '', body: '', category: 'campaign' }); setError(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save template'); }
  };

  return (
    <Card className="p-5 space-y-4">
      <div><h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">Email Templates</h3><p className="text-xs font-semibold text-slate-500">Campaign templates support variables: {'{{name}}'}, {'{{email}}'}, {'{{phone}}'}.</p></div>
      {error && <p className="text-sm font-bold text-red-600 dark:text-red-300">{error}</p>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2"><Input label="Template Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /><Select label="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as 'campaign' | 'transactional' })}><option value="campaign">Campaign</option><option value="transactional">Transactional</option></Select></div>
      <Input label="Subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
      <Textarea label="Body" value={form.body} rows={5} onChange={e => setForm({ ...form, body: e.target.value })} />
      <div className="flex justify-end"><PrimaryButton label="Create Template" size="small" disabled={!form.name || !form.body} onClick={() => void create()} /></div>
      <div className="space-y-2">
        {templates.map(t => <div key={t.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50"><div className="flex justify-between gap-2"><p className="font-black text-theme-maroon dark:text-theme-yellow">{t.name}</p><span className="text-xs font-bold uppercase text-theme-teal">{t.category}</span></div><p className="text-sm text-slate-600 dark:text-slate-300">{t.subject}</p></div>)}
      </div>
    </Card>
  );
};
