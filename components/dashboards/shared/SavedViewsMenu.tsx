import React, { useEffect, useState } from 'react';
import type { SavedView, SavedViewEntityType } from '../../../types';
import { api } from '../../../src/lib/api-client';
import { PrimaryButton } from '../../../src/components/ui/PrimaryButton';

interface SavedViewsMenuProps {
  entityType: SavedViewEntityType;
  filters: Record<string, string>;
  currentUserRole: 'admin' | 'sales_rep' | 'merchant' | 'lender';
  onLoadView: (view: SavedView) => void;
}

export const SavedViewsMenu: React.FC<SavedViewsMenuProps> = ({ entityType, filters, currentUserRole, onLoadView }) => {
  const [views, setViews] = useState<SavedView[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [shared, setShared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadViews = async () => {
    try {
      setError(null);
      setViews(await api.savedViews.list(entityType));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load saved views');
    }
  };

  useEffect(() => { void loadViews(); }, [entityType]);

  const saveView = async () => {
    if (!name.trim()) return;
    try {
      const created = await api.savedViews.create({
        name: name.trim(),
        entity_type: entityType,
        filters,
        sort: {},
        is_shared: currentUserRole === 'admin' ? shared : false,
      });
      setViews(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setName('');
      setShared(false);
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save view');
    }
  };

  const deleteView = async (id: string) => {
    if (!confirm('Delete this saved view?')) return;
    try {
      await api.savedViews.delete(id);
      setViews(prev => prev.filter(view => view.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete view');
    }
  };

  return (
    <div className="relative">
      <PrimaryButton label="Saved Views" size="small" onClick={() => setOpen(prev => !prev)} />
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border-2 border-line-strong bg-surface p-4 shadow-[6px_6px_0_var(--ct-primary)] dark:border-accent  dark:shadow-[6px_6px_0_var(--ct-secondary-fixed-dim)]">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-black text-main ">Saved Views</h4>
            <button className="text-sm font-bold text-secondary" onClick={() => setSaving(prev => !prev)}>{saving ? 'Cancel' : 'Save current'}</button>
          </div>
          {error && <p className="mb-2 rounded bg-danger/10 p-2 text-xs text-danger dark:bg-danger/20 dark:text-danger">{error}</p>}
          {saving && (
            <div className="mb-3 rounded-lg border border-line p-3 ">
              <input value={name} onChange={event => setName(event.target.value)} placeholder="View name" className="w-full rounded-md border px-3 py-2 text-sm text-main -muted " />
              {currentUserRole === 'admin' && (
                <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-muted">
                  <input type="checkbox" checked={shared} onChange={event => setShared(event.target.checked)} /> Shared with reps
                </label>
              )}
              <div className="mt-3"><PrimaryButton label="Save View" size="small" onClick={() => void saveView()} /></div>
            </div>
          )}
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {views.map(view => (
              <div key={view.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted p-2 -muted">
                <button type="button" onClick={() => { onLoadView(view); setOpen(false); }} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-black text-main ">{view.is_shared ? '◆ ' : ''}{view.name}</p>
                  <p className="text-xs text-muted">{view.is_shared ? 'Shared' : 'Private'}</p>
                </button>
                <button type="button" onClick={() => void deleteView(view.id)} className="text-xs font-black text-danger dark:text-danger">Delete</button>
              </div>
            ))}
            {views.length === 0 && <p className="py-6 text-center text-sm text-muted">No saved views yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
};
