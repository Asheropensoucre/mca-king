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
  urgent: 'bg-danger/15 text-danger dark:bg-danger/25 dark:text-danger',
  high: 'bg-warning/15 text-warning dark:bg-warning/25 dark:text-warning',
  normal: 'bg-secondary/15 text-secondary /25 ',
  low: 'bg-surface-muted text-main  ',
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
    <div key={task.id} className="rounded-xl border border-line bg-surface-muted/80 p-4  -muted">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`font-black ${task.status === 'completed' ? 'text-muted line-through' : 'text-main '}`}>{task.title}</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClasses[task.priority]}`}>{task.priority}</span>
          </div>
          {task.description && <p className="mt-1 text-sm text-muted">{task.description}</p>}
          <p className="mt-2 text-xs text-muted">
            {task.entity_name ? `${task.entity_name} • ` : ''}Assigned to {task.assignee_name || 'Unassigned'} • <span className={isOverdue(task) ? 'font-black text-danger dark:text-danger' : ''}>{dueLabel(task)}</span>
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
            <h3 className="text-lg font-black text-main ">{title}</h3>
            <p className="mt-1 text-sm text-muted">Follow-ups, reminders, and next actions.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {overview && <PrimaryButton label={expanded ? 'Show Less' : 'View All'} size="small" onClick={() => setExpanded(prev => !prev)} />}
            {canCreate && <PrimaryButton label="Create Task" size="small" onClick={() => setShowCreate(true)} />}
          </div>
        </div>

        {overview && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm font-black text-danger dark:border-danger/40 dark:bg-danger/15 dark:text-danger">Urgent: {urgentCount}</div>
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm font-black text-warning dark:border-warning/40 dark:bg-warning/15 dark:text-warning">Overdue: {overdueCount}</div>
            <div className="rounded-lg border border-secondary/30 bg-secondary/10 p-3 text-sm font-black text-secondary dark:border-secondary/40 /15 ">Due Today: {dueTodayCount}</div>
          </div>
        )}

        {error && <p className="mt-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger dark:bg-danger/20 dark:text-danger">{error}</p>}

        <div className="mt-5 space-y-3">
          {loading ? <MCAKingLoader label="Loading tasks..." size="small" /> : visibleTasks.length > 0 ? visibleTasks.map(renderTask) : <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted  ">No open tasks.</p>}
        </div>

        {!overview && completedTasks.length > 0 && (
          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-black text-muted">Completed ({completedTasks.length})</summary>
            <div className="mt-3 space-y-3 opacity-75">{completedTasks.map(renderTask)}</div>
          </details>
        )}

        {!overview && cancelledTasks.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-black text-muted">Cancelled ({cancelledTasks.length})</summary>
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
