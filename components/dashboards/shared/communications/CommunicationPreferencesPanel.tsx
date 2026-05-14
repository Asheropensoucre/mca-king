import React, { useEffect, useState } from 'react';
import type { CommunicationEntityType, CommunicationPreference } from '../../../../types';
import { api } from '../../../../src/lib/api-client';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { PrimaryButton } from '../../../../src/components/ui/PrimaryButton';
import { SmsComingSoonNotice } from './SmsComingSoonNotice';

interface Props {
  entityType: CommunicationEntityType;
  entityId: string;
  defaultEmail?: string | null;
  defaultPhone?: string | null;
}

export const CommunicationPreferencesPanel: React.FC<Props> = ({ entityType, entityId, defaultEmail, defaultPhone }) => {
  const [pref, setPref] = useState<CommunicationPreference | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.communications.preferences(entityType, entityId)
      .then(data => setPref({ ...data, email: data.email || defaultEmail || null, phone: data.phone || defaultPhone || null }))
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load preferences'));
  }, [entityType, entityId, defaultEmail, defaultPhone]);

  const save = async () => {
    if (!pref) return;
    try {
      const updated = await api.communications.updatePreferences({ ...pref, entity_type: entityType, entity_id: entityId });
      setPref(updated); setMessage('Preferences saved'); setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save preferences');
    }
  };

  if (!pref) return <Card className="p-5"><p className="text-sm font-semibold text-slate-500">Loading communication preferences…</p>{error && <p className="text-sm font-bold text-red-600">{error}</p>}</Card>;

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">Communication Preferences</h3>
        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Campaign email checks this record and the global suppression list before every send. SMS is stored for future readiness only.</p>
      </div>
      {message && <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{message}</p>}
      {error && <p className="text-sm font-bold text-red-600 dark:text-red-300">{error}</p>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Input label="Email" value={pref.email || ''} onChange={e => setPref({ ...pref, email: e.target.value })} />
        <Input label="Phone" value={pref.phone || ''} onChange={e => setPref({ ...pref, phone: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200"><input type="checkbox" checked={pref.email_opt_out} onChange={e => setPref({ ...pref, email_opt_out: e.target.checked, email_opt_in: !e.target.checked })} /> Email opted out</label>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200"><input type="checkbox" checked={pref.do_not_contact} onChange={e => setPref({ ...pref, do_not_contact: e.target.checked })} /> Do not contact</label>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200"><input type="checkbox" checked={pref.sms_opt_in} onChange={e => setPref({ ...pref, sms_opt_in: e.target.checked })} /> SMS opt-in recorded</label>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200"><input type="checkbox" checked={pref.sms_opt_out} onChange={e => setPref({ ...pref, sms_opt_out: e.target.checked, sms_opt_in: e.target.checked ? false : pref.sms_opt_in })} /> SMS opted out</label>
      </div>
      <SmsComingSoonNotice />
      <div className="flex justify-end"><PrimaryButton label="Save Preferences" size="small" onClick={() => void save()} /></div>
    </Card>
  );
};
