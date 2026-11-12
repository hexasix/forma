'use client';
import { useState, type CSSProperties, type FormEvent } from 'react';
import {
  CalendarDays,
  Check,
  Clock3,
  MessageSquare,
  Send,
  Tags,
  Trash2,
  Users,
} from 'lucide-react';
import { COLUMNS, type BoardData, type Status, type Task, type TaskDraft } from '@/lib/types';
import type { Repository } from '@/lib/repository';
import { errorMessage, relativeTime, validateDraft } from '@/lib/utils';
import { Avatar, Dialog } from './ui';
type Mutate = (action: (repo: Repository) => Promise<void>, message: string) => Promise<boolean>;
export function TaskDialog({
  task,
  status = 'todo',
  data,
  busy,
  mutate,
  onClose,
}: {
  task?: Task;
  status?: Status;
  data: BoardData;
  busy: boolean;
  mutate: Mutate;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<TaskDraft>(
    task
      ? { ...task }
      : {
          title: '',
          description: '',
          status,
          priority: 'normal',
          due_date: null,
          assignee_ids: [],
          label_ids: [],
        },
  );
  const [tab, setTab] = useState<'comments' | 'activity'>('comments');
  const [comment, setComment] = useState('');
  const [validation, setValidation] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const original: TaskDraft = task
    ? {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        assignee_ids: task.assignee_ids,
        label_ids: task.label_ids,
      }
    : {
        title: '',
        description: '',
        status,
        priority: 'normal',
        due_date: null,
        assignee_ids: [],
        label_ids: [],
      };
  const dirty = (Object.keys(original) as (keyof TaskDraft)[]).some(
    (key) => JSON.stringify(original[key]) !== JSON.stringify(draft[key]),
  );
  function close() {
    if (busy) return;
    if (dirty || comment.trim()) setConfirmClose(true);
    else onClose();
  }
  function toggle(key: 'assignee_ids' | 'label_ids', id: string) {
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(id) ? d[key].filter((v) => v !== id) : [...d[key], id],
    }));
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setValidation('');
    try {
      const input = validateDraft(draft);
      if (
        await mutate(
          (repo) => repo.saveTask(input),
          task ? 'Task updated' : 'A new idea, ready to go',
        )
      )
        onClose();
    } catch (error) {
      setValidation(errorMessage(error));
    }
  }
  const comments = data.comments
    .filter((c) => c.task_id === task?.id)
    .toSorted((a, b) => a.created_at.localeCompare(b.created_at));
  const activities = data.activities
    .filter((a) => a.task_id === task?.id)
    .toSorted((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <Dialog
      title={task ? 'A closer look' : 'Make something happen'}
      subtitle={
        task
          ? 'The details that move good work forward.'
          : 'Big projects begin with one small task.'
      }
      onClose={close}
      drawer={!!task}
      wide
    >
      <form onSubmit={save} className="task-form">
        <fieldset disabled={busy}>
          <label className="field-label" htmlFor="task-title">
            Task title <span>*</span>
          </label>
          <input
            id="task-title"
            className="title-input"
            data-autofocus
            placeholder="What’s on your mind?"
            maxLength={200}
            required
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <label className="field-label" htmlFor="task-description">
            Description <span className="optional">optional</span>
          </label>
          <textarea
            id="task-description"
            className="description-input"
            placeholder="A little context goes a long way…"
            rows={4}
            maxLength={10000}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
          <div className="form-grid">
            <label className="field-label">
              Status
              <select
                aria-label="Task status"
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as Status })}
              >
                {COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Priority
              <select
                aria-label="Task priority"
                value={draft.priority}
                onChange={(e) =>
                  setDraft({ ...draft, priority: e.target.value as TaskDraft['priority'] })
                }
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          <label className="field-label date-label" htmlFor="task-due">
            <CalendarDays size={14} />
            Due date <span className="optional">optional</span>
          </label>
          <input
            id="task-due"
            type="date"
            className="date-input"
            value={draft.due_date || ''}
            max="9999-12-31"
            onChange={(e) => setDraft({ ...draft, due_date: e.target.value || null })}
          />
          <div className="field-label field-icon">
            <Users size={14} />
            Assignees
          </div>
          <div className="selection-chips">
            {data.members.map((member) => (
              <button
                key={member.id}
                type="button"
                className={`member-option ${draft.assignee_ids.includes(member.id) ? 'selected' : ''}`}
                aria-pressed={draft.assignee_ids.includes(member.id)}
                onClick={() => toggle('assignee_ids', member.id)}
              >
                <Avatar member={member} small />
                {member.name}
                {draft.assignee_ids.includes(member.id) && <Check size={13} />}
              </button>
            ))}
            {!data.members.length && (
              <p className="field-help">No members yet. Add people from the workspace sidebar.</p>
            )}
          </div>
          <div className="field-label field-icon">
            <Tags size={14} />
            Labels
          </div>
          <div className="selection-chips">
            {data.labels.map((label) => (
              <button
                key={label.id}
                type="button"
                className={`label-option ${draft.label_ids.includes(label.id) ? 'selected' : ''}`}
                style={{ '--label-color': label.color } as CSSProperties}
                aria-pressed={draft.label_ids.includes(label.id)}
                onClick={() => toggle('label_ids', label.id)}
              >
                <span className="label-dot" />
                {label.name}
                {draft.label_ids.includes(label.id) && <Check size={12} />}
              </button>
            ))}
            {!data.labels.length && (
              <p className="field-help">
                Create a few labels from the sidebar to organize your tasks.
              </p>
            )}
          </div>
          {validation && (
            <p className="inline-error" role="alert">
              {validation}
            </p>
          )}
          <div className="form-actions">
            {task && (
              <button
                type="button"
                className="button-danger-quiet"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={15} />
                Delete task
              </button>
            )}
            <div className="form-actions-right">
              <button type="button" className="button button-secondary" onClick={close}>
                Cancel
              </button>
              <button type="submit" className="button button-primary">
                {busy ? 'Saving…' : task ? 'Save changes' : 'Create task'}
              </button>
            </div>
          </div>
        </fieldset>
      </form>
      {task && (
        <section className="task-conversation">
          <div className="conversation-tabs">
            <button
              className={tab === 'comments' ? 'active' : ''}
              onClick={() => setTab('comments')}
            >
              <MessageSquare size={15} />
              Comments <span>{comments.length}</span>
            </button>
            <button
              className={tab === 'activity' ? 'active' : ''}
              onClick={() => setTab('activity')}
            >
              <Clock3 size={15} />
              Activity
            </button>
          </div>
          {tab === 'comments' ? (
            <>
              <div className="comment-list">
                {!comments.length && (
                  <p className="conversation-empty">
                    A good conversation starts with a thought. Leave yours below.
                  </p>
                )}
                {comments.map((item) => (
                  <article key={item.id} className="comment">
                    <Avatar member={{ name: 'You', color: '#3C8370' }} small />
                    <div>
                      <header>
                        <strong>You</strong>
                        <time
                          dateTime={item.created_at}
                          title={new Date(item.created_at).toLocaleString()}
                        >
                          {relativeTime(item.created_at)}
                        </time>
                      </header>
                      <p>{item.body}</p>
                    </div>
                  </article>
                ))}
              </div>
              <form
                className="comment-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await mutate((repo) => repo.addComment(task.id, comment), 'Comment added'))
                    setComment('');
                }}
              >
                <label className="sr-only" htmlFor="comment-body">
                  Write a comment
                </label>
                <textarea
                  id="comment-body"
                  placeholder="Add a thought, a question, a little encouragement…"
                  rows={2}
                  maxLength={3000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={busy}
                />
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={busy || !comment.trim()}
                >
                  <Send size={14} />
                  Post comment
                </button>
              </form>
            </>
          ) : (
            <ol className="activity-list">
              {activities.map((item) => (
                <li key={item.id}>
                  <span className="activity-dot" />
                  <div>
                    <p>{item.message}</p>
                    <time
                      dateTime={item.created_at}
                      title={new Date(item.created_at).toLocaleString()}
                    >
                      {relativeTime(item.created_at)}
                    </time>
                  </div>
                </li>
              ))}
              {!activities.length && (
                <li className="conversation-empty">The story of this task starts here.</li>
              )}
            </ol>
          )}
        </section>
      )}
      {confirmDelete && (
        <div className="inline-confirm" role="alert">
          <strong>Delete “{task?.title}”?</strong>
          <p>This also removes its comments and history. This cannot be undone.</p>
          <div>
            <button
              className="button button-secondary"
              disabled={busy}
              onClick={() => setConfirmDelete(false)}
            >
              Keep task
            </button>
            <button
              className="button button-danger"
              disabled={busy}
              onClick={async () => {
                if (task && (await mutate((repo) => repo.deleteTask(task.id), 'Task deleted')))
                  onClose();
              }}
            >
              Delete permanently
            </button>
          </div>
        </div>
      )}
      {confirmClose && (
        <div className="inline-confirm" role="alert">
          <strong>Leave your changes behind?</strong>
          <p>Your unsaved task changes or comment draft will be lost.</p>
          <div>
            <button className="button button-secondary" onClick={() => setConfirmClose(false)}>
              Keep editing
            </button>
            <button className="button button-danger" onClick={onClose}>
              Discard changes
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
