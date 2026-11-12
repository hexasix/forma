import { COLUMNS, PRIORITIES, STATUSES, type Filters, type Task, type TaskDraft } from './types';

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDate(date);
}
export function dueState(
  task: Pick<Task, 'due_date' | 'status'>,
  today = localDate(),
): 'overdue' | 'soon' | 'normal' {
  if (!task.due_date || task.status === 'done') return 'normal';
  if (task.due_date < today) return 'overdue';
  const tomorrow = new Date(`${today}T12:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return task.due_date <= localDate(tomorrow) ? 'soon' : 'normal';
}
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(
    new Date(`${value}T12:00:00`),
  );
}
export function relativeTime(value: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => Array.from(part)[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
export function statusName(status: string): string {
  return COLUMNS.find((c) => c.id === status)?.name || status;
}
export function filterTasks(tasks: Task[], filters: Filters): Task[] {
  const search = filters.search.trim().toLocaleLowerCase();
  return tasks.filter(
    (task) =>
      (!search || task.title.toLocaleLowerCase().includes(search)) &&
      (!filters.priority || task.priority === filters.priority) &&
      (!filters.assignee ||
        (filters.assignee === 'unassigned'
          ? !task.assignee_ids.length
          : task.assignee_ids.includes(filters.assignee))) &&
      (!filters.label || task.label_ids.includes(filters.label)) &&
      (!filters.status || task.status === filters.status),
  );
}
export function validateDraft(draft: TaskDraft): TaskDraft {
  const title = draft.title.trim();
  if (!title || title.length > 200)
    throw new Error('Give your task a title between 1 and 200 characters.');
  if (draft.description.length > 10000)
    throw new Error('Description must be 10,000 characters or fewer.');
  if (!STATUSES.includes(draft.status) || !PRIORITIES.includes(draft.priority))
    throw new Error('Choose a valid status and priority.');
  if (draft.due_date) {
    const parsed = new Date(`${draft.due_date}T12:00:00`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(draft.due_date) ||
      Number.isNaN(parsed.getTime()) ||
      localDate(parsed) !== draft.due_date
    )
      throw new Error('Choose a valid due date.');
  }
  return {
    ...draft,
    title,
    assignee_ids: [...new Set(draft.assignee_ids)],
    label_ids: [...new Set(draft.label_ids)],
  };
}
export function errorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String(error.message)
        : 'Something went wrong. Please try again.';
  if (/anonymous sign-ins are disabled/i.test(message))
    return 'Enable Anonymous Sign-Ins in your Supabase Authentication settings, then retry.';
  if (
    /relation .* does not exist|schema cache|could not find the table|could not find the function/i.test(
      message,
    )
  )
    return 'Database setup is missing. Run supabase/migrations/001_initial.sql in the Supabase SQL Editor, then retry.';
  if (/failed to fetch|networkerror|load failed/i.test(message))
    return 'Could not reach Supabase. Check your connection and project URL, then retry.';
  return message;
}
