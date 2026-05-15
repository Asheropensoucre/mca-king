import React, { useEffect, useState } from 'react';
import type { Activity, ActivityType, EntityType, UserRole } from '../../../types';
import { api } from '../../../src/lib/api-client';
import { Card } from '../../ui/Card';
import { Textarea } from '../../ui/Textarea';
import { PrimaryButton } from '../../../src/components/ui/PrimaryButton';
import { MCAKingLoader } from '../../../src/components/ui/MCAKingLoader';

interface ActivityTimelineProps {
  entityType: EntityType;
  entityId: string;
  currentUserRole?: UserRole;
}

const activityIcon: Record<ActivityType, string> = {
  status_change: '↔',
  note: '📝',
  call: '☎',
  upload: '⬆',
  offer: '$',
  match: '🔗',
  task: '✓',
  system: '⚙',
  email: '✉',
};

function relativeTime(value: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (hours < 48) return 'yesterday';
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ entityType, entityId, currentUserRole }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [noteBody, setNoteBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAddNote = currentUserRole === 'admin' || currentUserRole === 'sales_rep';

  const loadActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      setActivities(await api.activities.list(entityType, entityId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load activity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadActivities(); }, [entityType, entityId]);

  const addNote = async () => {
    if (!noteBody.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await api.activities.create({
        entity_type: entityType,
        entity_id: entityId,
        activity_type: 'note',
        body: noteBody.trim(),
      });
      setActivities(prev => [created, ...prev]);
      setNoteBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add note.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-main ">Activity Timeline</h3>
            <p className="mt-1 text-sm text-muted">Newest activity first. System events are append-only.</p>
          </div>
        </div>

        {error && <p className="mt-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger dark:bg-danger/20 dark:text-danger">{error}</p>}

        <div className="mt-5 space-y-4">
          {loading ? (
            <MCAKingLoader label="Loading activity..." size="small" />
          ) : activities.length > 0 ? activities.map(activity => (
            <div key={activity.id} className="relative flex gap-3 rounded-xl border border-line bg-surface-muted/80 p-4  -muted">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-primary text-sm font-black text-secondary shadow-[3px_3px_0_var(--ct-primary)]">
                {activityIcon[activity.activity_type]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-main">{activity.body || activity.activity_type.replace('_', ' ')}</p>
                <p className="mt-1 text-xs text-muted">
                  {activity.author_name || 'System'} • {relativeTime(activity.created_at)}
                </p>
              </div>
            </div>
          )) : (
            <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted  ">No activity yet.</p>
          )}
        </div>

        {canAddNote && (
          <div className="mt-6 border-t border-line pt-5 ">
            <Textarea label="Add Note" name="activity_note" value={noteBody} onChange={event => setNoteBody(event.target.value)} rows={3} />
            <div className="mt-3 flex justify-end">
              <PrimaryButton label={saving ? 'Saving...' : 'Add Note'} size="small" variant="funded" onClick={() => void addNote()} disabled={saving || !noteBody.trim()} />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
