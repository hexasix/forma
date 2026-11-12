import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createSampleBoard, DEMO_USER } from './demo';
import { statusName, validateDraft } from './utils';
import type { Activity, BoardData, Comment, Label, Member, Status, Task, TaskDraft } from './types';

export interface Repository {
  mode: 'demo' | 'supabase';
  load(): Promise<BoardData>;
  saveTask(draft: TaskDraft): Promise<void>;
  moveTask(id: string, status: Status): Promise<void>;
  deleteTask(id: string): Promise<void>;
  addMember(name: string, color: string): Promise<void>;
  deleteMember(id: string): Promise<void>;
  addLabel(name: string, color: string): Promise<void>;
  deleteLabel(id: string): Promise<void>;
  addComment(taskId: string, body: string): Promise<void>;
}
export const STORAGE_KEY = 'forma.workspace.v1';
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
function validateName(name: string, max: number) {
  const clean = name.trim();
  if (!clean || clean.length > max)
    throw new Error(`Name must be between 1 and ${max} characters.`);
  return clean;
}
function validateColor(color: string) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Choose a valid color.');
  return color;
}
function validateComment(body: string) {
  const clean = body.trim();
  if (!clean || clean.length > 3000)
    throw new Error('Comments must be between 1 and 3,000 characters.');
  return clean;
}

export function createDemoRepository(storage: StorageLike): Repository {
  function read(): BoardData {
    let raw: string | null;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      throw new Error('Browser storage is unavailable. Allow site storage to use the local demo.');
    }
    if (!raw) {
      const data = createSampleBoard();
      write(data);
      return data;
    }
    try {
      const data = JSON.parse(raw) as BoardData;
      if (
        !data ||
        !['tasks', 'members', 'labels', 'comments', 'activities'].every((key) =>
          Array.isArray(data[key as keyof BoardData]),
        )
      )
        throw new Error();
      for (const task of data.tasks) {
        if (
          typeof task.id !== 'string' ||
          !Array.isArray(task.assignee_ids) ||
          !Array.isArray(task.label_ids)
        )
          throw new Error();
        validateDraft(task);
      }
      if (
        !data.members.every(
          (m) =>
            typeof m.id === 'string' &&
            typeof m.name === 'string' &&
            /^#[0-9a-f]{6}$/i.test(m.color),
        ) ||
        !data.labels.every(
          (l) =>
            typeof l.id === 'string' &&
            typeof l.name === 'string' &&
            /^#[0-9a-f]{6}$/i.test(l.color),
        ) ||
        !data.comments.every(
          (c) =>
            typeof c.id === 'string' &&
            typeof c.task_id === 'string' &&
            typeof c.body === 'string' &&
            typeof c.created_at === 'string',
        ) ||
        !data.activities.every(
          (a) =>
            typeof a.id === 'string' &&
            typeof a.task_id === 'string' &&
            typeof a.message === 'string' &&
            typeof a.created_at === 'string',
        )
      )
        throw new Error();
      return data;
    } catch {
      throw new Error(
        'Local demo data is damaged. Remove the “forma.workspace.v1” site-storage entry to start a fresh demo.',
      );
    }
  }
  function write(data: BoardData) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      throw new Error(
        'Could not save to browser storage. It may be full or blocked. Your change was not saved.',
      );
    }
  }
  function activity(data: BoardData, taskId: string, message: string) {
    data.activities.push({
      id: crypto.randomUUID(),
      user_id: DEMO_USER,
      task_id: taskId,
      message,
      created_at: new Date().toISOString(),
    });
  }
  function getTask(data: BoardData, id: string) {
    const task = data.tasks.find((t) => t.id === id);
    if (!task) throw new Error('This task no longer exists. Refresh your board.');
    return task;
  }
  return {
    mode: 'demo',
    async load() {
      return read();
    },
    async saveTask(input) {
      const draft = validateDraft(input),
        data = read(),
        now = new Date().toISOString();
      if (
        draft.assignee_ids.some((id) => !data.members.some((m) => m.id === id)) ||
        draft.label_ids.some((id) => !data.labels.some((l) => l.id === id))
      )
        throw new Error('A selected member or label no longer exists.');
      if (draft.id) {
        const task = getTask(data, draft.id);
        if (task.status !== draft.status)
          activity(
            data,
            task.id,
            `Moved from ${statusName(task.status)} → ${statusName(draft.status)}`,
          );
        if (task.title !== draft.title || task.description !== draft.description)
          activity(data, task.id, 'Updated task details');
        if (task.priority !== draft.priority)
          activity(data, task.id, `Changed priority to ${draft.priority}`);
        if (task.due_date !== draft.due_date)
          activity(
            data,
            task.id,
            draft.due_date ? `Set due date to ${draft.due_date}` : 'Removed the due date',
          );
        if ([...task.assignee_ids].sort().join() !== [...draft.assignee_ids].sort().join())
          activity(data, task.id, 'Updated assignees');
        if ([...task.label_ids].sort().join() !== [...draft.label_ids].sort().join())
          activity(data, task.id, 'Updated labels');
        Object.assign(task, draft, { updated_at: now });
      } else {
        const id = crypto.randomUUID();
        data.tasks.unshift({ ...draft, id, user_id: DEMO_USER, created_at: now, updated_at: now });
        activity(data, id, 'Created this task');
      }
      write(data);
    },
    async moveTask(id, status) {
      const data = read(),
        task = getTask(data, id);
      if (task.status === status) return;
      activity(data, id, `Moved from ${statusName(task.status)} → ${statusName(status)}`);
      task.status = status;
      task.updated_at = new Date().toISOString();
      write(data);
    },
    async deleteTask(id) {
      const data = read();
      getTask(data, id);
      data.tasks = data.tasks.filter((t) => t.id !== id);
      data.comments = data.comments.filter((c) => c.task_id !== id);
      data.activities = data.activities.filter((a) => a.task_id !== id);
      write(data);
    },
    async addMember(name, color) {
      const data = read();
      data.members.push({
        id: crypto.randomUUID(),
        user_id: DEMO_USER,
        name: validateName(name, 60),
        color: validateColor(color),
      });
      write(data);
    },
    async deleteMember(id) {
      const data = read(),
        member = data.members.find((m) => m.id === id);
      data.members = data.members.filter((m) => m.id !== id);
      data.tasks.forEach((t) => {
        if (t.assignee_ids.includes(id)) {
          t.assignee_ids = t.assignee_ids.filter((a) => a !== id);
          activity(data, t.id, `Unassigned ${member?.name || 'a team member'}`);
        }
      });
      write(data);
    },
    async addLabel(name, color) {
      const data = read(),
        clean = validateName(name, 24);
      if (data.labels.some((l) => l.name.toLowerCase() === clean.toLowerCase()))
        throw new Error('A label with that name already exists.');
      data.labels.push({
        id: crypto.randomUUID(),
        user_id: DEMO_USER,
        name: clean,
        color: validateColor(color),
      });
      write(data);
    },
    async deleteLabel(id) {
      const data = read();
      data.labels = data.labels.filter((l) => l.id !== id);
      data.tasks.forEach((t) => {
        t.label_ids = t.label_ids.filter((l) => l !== id);
      });
      write(data);
    },
    async addComment(taskId, body) {
      const data = read();
      getTask(data, taskId);
      data.comments.push({
        id: crypto.randomUUID(),
        user_id: DEMO_USER,
        task_id: taskId,
        body: validateComment(body),
        created_at: new Date().toISOString(),
      });
      write(data);
    },
  };
}

let client: SupabaseClient | null = null;
let sessionPromise: Promise<string> | null = null;
function publicConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url && !key) return null;
  if (!url || !key)
    throw new Error(
      'Supabase configuration is incomplete. Set both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then restart Next.js.',
    );
  if (key.startsWith('sb_secret_'))
    throw new Error(
      'A secret Supabase key was configured. Replace it with a public publishable / anon key and rotate the exposed secret.',
    );
  if (key.split('.').length === 3) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role === 'service_role') throw new Error('SERVICE_ROLE');
    } catch (error) {
      if (error instanceof Error && error.message === 'SERVICE_ROLE')
        throw new Error(
          'Never use a service_role key in the frontend. Use the public anon key and rotate the exposed service_role key.',
        );
    }
  }
  return { url, key };
}
export function createRepository(): Repository {
  const config = publicConfiguration();
  if (!config) return createDemoRepository(window.localStorage);
  client ??= createClient(config.url, config.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return createSupabaseRepository(client);
}
export function createSupabaseRepository(supabase: SupabaseClient): Repository {
  async function userId(): Promise<string> {
    if (!sessionPromise) {
      sessionPromise = (async () => {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session) return data.session.user.id;
        const result = await supabase.auth.signInAnonymously();
        if (result.error) throw result.error;
        if (!result.data.user) throw new Error('Could not create a guest session. Please retry.');
        return result.data.user.id;
      })();
      sessionPromise.catch(() => {
        sessionPromise = null;
      });
    }
    return sessionPromise;
  }
  async function checked<T>(request: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
    const { data, error } = await request;
    if (error) throw error;
    return data;
  }
  return {
    mode: 'supabase',
    async load() {
      const uid = await userId();
      const [taskRows, members, labels, comments, activities] = await Promise.all([
        checked(
          supabase
            .from('tasks')
            .select('*, task_assignees(member_id), task_labels(label_id)')
            .eq('user_id', uid)
            .order('created_at', { ascending: false }),
        ),
        checked(supabase.from('members').select('*').eq('user_id', uid).order('created_at')),
        checked(supabase.from('labels').select('*').eq('user_id', uid).order('created_at')),
        checked(supabase.from('comments').select('*').eq('user_id', uid).order('created_at')),
        checked(supabase.from('activity_log').select('*').eq('user_id', uid).order('created_at')),
      ]);
      const tasks: Task[] = (taskRows || []).map((row) => {
        const { task_assignees, task_labels, ...task } = row;
        return {
          ...task,
          assignee_ids: (task_assignees || []).map((a: { member_id: string }) => a.member_id),
          label_ids: (task_labels || []).map((l: { label_id: string }) => l.label_id),
        } as Task;
      });
      return {
        tasks,
        members: (members || []) as Member[],
        labels: (labels || []) as Label[],
        comments: (comments || []) as Comment[],
        activities: (activities || []) as Activity[],
      };
    },
    async saveTask(input) {
      await userId();
      const draft = validateDraft(input);
      await checked(
        supabase.rpc('save_task', {
          p_task_id: draft.id || null,
          p_title: draft.title,
          p_description: draft.description,
          p_status: draft.status,
          p_priority: draft.priority,
          p_due_date: draft.due_date,
          p_assignee_ids: draft.assignee_ids,
          p_label_ids: draft.label_ids,
        }),
      );
    },
    async moveTask(id, status) {
      const uid = await userId();
      const rows = await checked(
        supabase.from('tasks').update({ status }).eq('id', id).eq('user_id', uid).select('id'),
      );
      if (!rows?.length) throw new Error('This task no longer exists. Refresh your board.');
    },
    async deleteTask(id) {
      const uid = await userId();
      await checked(supabase.from('tasks').delete().eq('id', id).eq('user_id', uid));
    },
    async addMember(name, color) {
      const uid = await userId();
      await checked(
        supabase
          .from('members')
          .insert({ user_id: uid, name: validateName(name, 60), color: validateColor(color) }),
      );
    },
    async deleteMember(id) {
      const uid = await userId();
      await checked(supabase.from('members').delete().eq('id', id).eq('user_id', uid));
    },
    async addLabel(name, color) {
      const uid = await userId();
      await checked(
        supabase
          .from('labels')
          .insert({ user_id: uid, name: validateName(name, 24), color: validateColor(color) }),
      );
    },
    async deleteLabel(id) {
      const uid = await userId();
      await checked(supabase.from('labels').delete().eq('id', id).eq('user_id', uid));
    },
    async addComment(taskId, body) {
      const uid = await userId();
      await checked(
        supabase
          .from('comments')
          .insert({ user_id: uid, task_id: taskId, body: validateComment(body) }),
      );
    },
  };
}
