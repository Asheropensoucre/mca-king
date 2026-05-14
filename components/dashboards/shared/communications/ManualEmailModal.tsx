import React, { useState } from 'react';
import type { CommunicationEntityType } from '../../../../types';
import { api } from '../../../../src/lib/api-client';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { Textarea } from '../../../ui/Textarea';
import { PrimaryButton } from '../../../../src/components/ui/PrimaryButton';

interface Props {
  entityType: CommunicationEntityType;
  entityId: string;
  defaultTo?: string | null;
  onClose: () => void;
  onSent?: () => void;
}

export const ManualEmailModal: React.FC<Props> = ({ entityType, entityId, defaultTo, onClose, onSent }) => {
  const [to, setTo] = useState(defaultTo || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setSending(true); setError(null);
    try {
      const result = await api.communications.sendEmail({ entity_type: entityType, entity_id: entityId, to, subject, body, category: 'transactional' });
      if (!result.ok) throw new Error(result.error || 'Email was not sent');
      onSent?.(); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">Send Email</h3>
          <button onClick={onClose} className="text-sm font-bold text-theme-teal">Close</button>
        </div>
        {error && <p className="text-sm font-bold text-red-600 dark:text-red-300">{error}</p>}
        <Input label="To" value={to} onChange={e => setTo(e.target.value)} />
        <Input label="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
        <Textarea label="Message" value={body} rows={8} onChange={e => setBody(e.target.value)} />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Email sends through Resend only. Suppression/do-not-contact is checked server-side before sending.</p>
        <div className="flex justify-end gap-2"><PrimaryButton label="Cancel" size="small" variant="danger" onClick={onClose} /><PrimaryButton label={sending ? 'Sending…' : 'Send Email'} size="small" disabled={sending || !subject || !body} onClick={() => void send()} /></div>
      </Card>
    </div>
  );
};
