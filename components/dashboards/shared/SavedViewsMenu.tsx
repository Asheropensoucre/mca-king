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
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border-2 border-theme-maroon bg-white p-4 shadow-[6px_6px_0_var(--ct-primary)] dark:border-theme-yellow dark:bg-slate-950 dark:shadow-[6px_6px_0_var(--ct-secondary-fixed-dim)]">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-black text-theme-maroon dark:text-theme-yellow">Saved Views</h4>
            <button className="text-sm font-bold text-theme-teal" onClick={() => setSaving(prev => !prev)}>{saving ? 'Cancel' : 'Save current'}</button>
          </div>
          {error && <p className="mb-2 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          {saving && (
            <div className="mb-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <input value={name} onChange={event => setName(event.target.value)} placeholder="View name" className="w-full rounded-md border px-3 py-2 text-sm text-slate-900 dark:bg-slate-900 dark:text-slate-100" />
              {currentUserRole === 'admin' && (
                <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={shared} onChange={event => setShared(event.target.checked)} /> Shared with reps
                </label>
              )}
              <div className="mt-3"><PrimaryButton label="Save View" size="small" onClick={() => void saveView()} /></div>
            </div>
          )}
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {views.map(view => (
              <div key={view.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-900/60">
                <button type="button" onClick={() => { onLoadView(view); setOpen(false); }} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-black text-theme-maroon dark:text-theme-yellow">{view.is_shared ? '◆ ' : ''}{view.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{view.is_shared ? 'Shared' : 'Private'}</p>
                </button>
                <button type="button" onClick={() => void deleteView(view.id)} className="text-xs font-black text-red-600 dark:text-red-300">Delete</button>
              </div>
            ))}
            {views.length === 0 && <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No saved views yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
};
