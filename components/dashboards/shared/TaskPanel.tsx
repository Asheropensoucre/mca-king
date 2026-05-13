import React, { useEffect, useMemo, useState } from 'react';
import type { AuthUser, EntityType, Task, TaskPriority } from '../../../types';
import { api } from '../../../src/lib/api-client';
import { Card } from '../../ui/Card';
import { PrimaryButton } from '../../../src/components/ui/PrimaryButton';
import { MCAKingLoader } from '../../../src/components/ui/MCAKingLoader';
import { CreateTaskModal } from './CreateTaskModal';

interface TaskPanelProps {
  entityType?: EntityType;
  entityId?: string;
  currentUser: AuthUser;
  title?: string;
  overview?: boolean;
}

const priorityClasses: Record<TaskPriority, string> = {
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
  high: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  normal: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200',
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
};

function isOverdue(task: Task): boolean {
  return task.status === 'open' && Boolean(task.due_at) && new Date(task.due_at as string).getTime() < new Date().setHours(0, 0, 0, 0);
}

function isDueToday(task: Task): boolean {
  if (!task.due_at) return false;
  const due = new Date(task.due_at);
  const today = new Date();
  return due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth() && due.getDate() === today.getDate();
}

function dueLabel(task: Task): string {
  if (!task.due_at) return 'No due date';
  return new Date(task.due_at).toLocaleDateString();
}

export const TaskPanel: React.FC<TaskPanelProps> = ({ entityType, entityId, currentUser, title = 'Tasks', overview = false }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState(!overview);

  const canCreate = Boolean(entityType && entityId && (currentUser.role === 'admin' || currentUser.role === 'sales_rep'));

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      setTasks(await api.tasks.list(entityType && entityId ? { entity_type: entityType, entity_id: entityId } : undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadTasks(); }, [entityType, entityId]);

  const openTasks = useMemo(() => tasks.filter(task => task.status === 'open'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(task => task.status === 'completed'), [tasks]);
  const cancelledTasks = useMemo(() => tasks.filter(task => task.status === 'cancelled'), [tasks]);

  const urgentCount = openTasks.filter(task => task.priority === 'urgent').length;
  const overdueCount = openTasks.filter(isOverdue).length;
  const dueTodayCount = openTasks.filter(isDueToday).length;
  const visibleTasks = overview && !expanded ? openTasks.slice(0, 5) : openTasks;

  const completeTask = async (task: Task) => {
    try {
      const updated = await api.tasks.update(task.id, { status: 'completed' });
      setTasks(prev => prev.map(item => item.id === task.id ? updated : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete task.');
    }
  };

  const renderTask = (task: Task) => (
    <div key={task.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`font-black ${task.status === 'completed' ? 'text-slate-500 line-through' : 'text-theme-maroon dark:text-theme-yellow'}`}>{task.title}</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClasses[task.priority]}`}>{task.priority}</span>
          </div>
          {task.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{task.description}</p>}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {task.entity_name ? `${task.entity_name} • ` : ''}Assigned to {task.assignee_name || 'Unassigned'} • <span className={isOverdue(task) ? 'font-black text-red-600 dark:text-red-300' : ''}>{dueLabel(task)}</span>
          </p>
        </div>
        {task.status === 'open' && (
          <PrimaryButton label="✓ Complete" size="small" variant="funded" onClick={() => void completeTask(task)} />
        )}
      </div>
    </div>
  );

  return (
    <Card>
      <div className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-theme-maroon dark:text-theme-yellow">{title}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Follow-ups, reminders, and next actions.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {overview && <PrimaryButton label={expanded ? 'Show Less' : 'View All'} size="small" onClick={() => setExpanded(prev => !prev)} />}
            {canCreate && <PrimaryButton label="Create Task" size="small" onClick={() => setShowCreate(true)} />}
          </div>
        </div>

        {overview && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-black text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">Urgent: {urgentCount}</div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-black text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">Overdue: {overdueCount}</div>
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm font-black text-teal-700 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-300">Due Today: {dueTodayCount}</div>
          </div>
        )}

        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

        <div className="mt-5 space-y-3">
          {loading ? <MCAKingLoader label="Loading tasks..." size="small" /> : visibleTasks.length > 0 ? visibleTasks.map(renderTask) : <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">No open tasks.</p>}
        </div>

        {!overview && completedTasks.length > 0 && (
          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-black text-slate-500 dark:text-slate-400">Completed ({completedTasks.length})</summary>
            <div className="mt-3 space-y-3 opacity-75">{completedTasks.map(renderTask)}</div>
          </details>
        )}

        {!overview && cancelledTasks.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-black text-slate-500 dark:text-slate-400">Cancelled ({cancelledTasks.length})</summary>
            <div className="mt-3 space-y-3 opacity-60">{cancelledTasks.map(renderTask)}</div>
          </details>
        )}
      </div>

      {showCreate && entityType && entityId && (
        <CreateTaskModal entityType={entityType} entityId={entityId} currentUser={currentUser} onCreated={() => void loadTasks()} onClose={() => setShowCreate(false)} />
      )}
    </Card>
  );
};
