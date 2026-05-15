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
      <h3 className="text-lg font-black text-main ">Communication History</h3>
      {error && <p className="mt-2 text-sm font-bold text-danger dark:text-danger">{error}</p>}
      {events.length === 0 ? (
        <p className="mt-3 text-sm font-semibold text-muted ">No communications recorded yet.</p>
      ) : (
        <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
          {events.map(event => (
            <div key={event.id} className="rounded-lg border border-line bg-surface-muted p-3 text-sm  -muted">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-black text-main ">{event.subject || event.communication_type}</p>
                <span className="text-xs font-bold uppercase text-secondary">{event.channel} • {event.status}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{new Date(event.created_at).toLocaleString()} → {event.to_contact || 'N/A'}</p>
              {event.body_preview && <p className="mt-2 text-main">{event.body_preview}</p>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
