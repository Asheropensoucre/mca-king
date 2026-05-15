import React, { useEffect, useMemo, useState } from 'react';
import type { AuthUser, EntityType, SalesRepresentative, TaskPriority } from '../../../types';
import { api } from '../../../src/lib/api-client';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { PrimaryButton } from '../../../src/components/ui/PrimaryButton';
import { ResponsiveModal } from './mobile/ResponsiveModal';

interface CreateTaskModalProps {
  entityType: EntityType;
  entityId: string;
  currentUser: AuthUser;
  onCreated: () => void;
  onClose: () => void;
}

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ entityType, entityId, currentUser, onCreated, onClose }) => {
  const [salesReps, setSalesReps] = useState<SalesRepresentative[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [assignedTo, setAssignedTo] = useState(currentUser.role === 'sales_rep' ? currentUser.id : '');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.users.salesReps()
      .then(reps => {
        setSalesReps(reps);
        if (!assignedTo && currentUser.role !== 'sales_rep') {
          setAssignedTo(reps[0]?.id ?? currentUser.id);
        }
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load sales reps.'));
  }, [assignedTo, currentUser.id, currentUser.role]);

  const assigneeOptions = useMemo(() => {
    const existingIds = new Set(salesReps.map(rep => rep.id));
    if (!existingIds.has(currentUser.id) && (currentUser.role === 'admin' || currentUser.role === 'sales_rep')) {
      return [{ id: currentUser.id, name: currentUser.full_name ?? currentUser.name ?? currentUser.email, email: currentUser.email }, ...salesReps];
    }
    return salesReps;
  }, [currentUser, salesReps]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.tasks.create({
        entity_type: entityType,
        entity_id: entityId,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        assigned_to: assignedTo || currentUser.id,
        due_at: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : null,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create task.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveModal className="max-w-xl" zIndexClass="z-[70]" ariaLabel="Create Task">
        <form onSubmit={handleSubmit}>
          <div className="border-b border-line p-6 ">
            <h3 className="text-xl font-black text-main ">Create Task</h3>
            <p className="mt-1 text-sm text-muted">Add a follow-up reminder for this {entityType}.</p>
          </div>

          <div className="space-y-4 p-6">
            {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger dark:bg-danger/20 dark:text-danger">{error}</p>}
            <Input label="Title" name="title" value={title} onChange={event => setTitle(event.target.value)} required />
            <Textarea label="Description" name="description" value={description} onChange={event => setDescription(event.target.value)} rows={3} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-sm font-medium text-main">Priority</span>
                <select value={priority} onChange={event => setPriority(event.target.value as TaskPriority)} className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-main ring-1 ring-inset ring-line focus:ring-2 focus:ring-accent   ring-line">
                  {priorityOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-main">Assign To</span>
                <select value={assignedTo} onChange={event => setAssignedTo(event.target.value)} className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-main ring-1 ring-inset ring-line focus:ring-2 focus:ring-accent   ring-line">
                  {assigneeOptions.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                </select>
              </label>

              <Input label="Due Date" name="due_at" type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-line bg-surface-muted p-4 sm:flex-row sm:justify-end  -muted/50">
            <PrimaryButton label="Cancel" size="small" variant="danger" onClick={onClose} />
            <PrimaryButton type="submit" label={submitting ? 'Creating...' : 'Create Task'} size="small" disabled={submitting || !title.trim()} />
          </div>
        </form>
    </ResponsiveModal>
  );
};
