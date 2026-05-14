import React, { useEffect, useState } from 'react';
import type { CommunicationEntityType, CommunicationEvent } from '../../../../types';
import { api } from '../../../../src/lib/api-client';
import { Card } from '../../../ui/Card';

interface Props {
  entityType: CommunicationEntityType;
  entityId: string;
}

export const CommunicationHistoryPanel: React.FC<Props> = ({ entityType, entityId }) => {
  const [events, setEvents] = useState<CommunicationEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.communications.history(entityType, entityId)
      .then(data => { setEvents(Array.isArray(data) ? data : []); setError(null); })
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load communications'));
  }, [entityType, entityId]);

  return (
    <Card className="p-5">
      <h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">Communication History</h3>
      {error && <p className="mt-2 text-sm font-bold text-red-600 dark:text-red-300">{error}</p>}
      {events.length === 0 ? (
        <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-300">No communications recorded yet.</p>
      ) : (
        <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
          {events.map(event => (
            <div key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-black text-theme-maroon dark:text-theme-yellow">{event.subject || event.communication_type}</p>
                <span className="text-xs font-bold uppercase text-theme-teal">{event.channel} • {event.status}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{new Date(event.created_at).toLocaleString()} → {event.to_contact || 'N/A'}</p>
              {event.body_preview && <p className="mt-2 text-slate-700 dark:text-slate-200">{event.body_preview}</p>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
