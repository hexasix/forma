import { beforeEach, describe, expect, it } from 'vitest';
import { createDemoRepository, STORAGE_KEY, type Repository } from '../src/lib/repository';
import type { TaskDraft } from '../src/lib/types';
let store: Map<string, string>, repo: Repository;
const draft: TaskDraft = {
  title: 'A real interaction',
  description: 'Some context',
  status: 'todo',
  priority: 'high',
  due_date: null,
  assignee_ids: ['member-1', 'member-2'],
  label_ids: ['label-1'],
};
beforeEach(() => {
  store = new Map();
  repo = createDemoRepository({
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, value) => {
      store.set(k, value);
    },
  });
});
describe('local demo repository', () => {
  it('initializes a sample board once and persists changes', async () => {
    expect((await repo.load()).tasks).toHaveLength(8);
    await repo.saveTask(draft);
    expect((await repo.load()).tasks).toHaveLength(9);
    const second = createDemoRepository({
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, value) => {
        store.set(k, value);
      },
    });
    expect((await second.load()).tasks[0].title).toBe(draft.title);
  });
  it('edits tasks, moves status, adds comments and records history', async () => {
    await repo.saveTask(draft);
    const task = (await repo.load()).tasks[0];
    await repo.moveTask(task.id, 'done');
    await repo.addComment(task.id, ' Looks good! ');
    const data = await repo.load();
    expect(data.tasks[0].status).toBe('done');
    expect(data.comments.at(-1)?.body).toBe('Looks good!');
    expect(data.activities.at(-1)?.message).toBe('Moved from To do → Done');
    await repo.saveTask({ ...data.tasks[0], title: 'Updated title', assignee_ids: ['member-1'] });
    expect((await repo.load()).activities.at(-1)?.message).toBe('Updated assignees');
  });
  it('deleting a task cascades comments and activity', async () => {
    await repo.load();
    await repo.deleteTask('task-4');
    const data = await repo.load();
    expect(data.tasks.some((t) => t.id === 'task-4')).toBe(false);
    expect(data.comments.some((c) => c.task_id === 'task-4')).toBe(false);
    expect(data.activities.some((a) => a.task_id === 'task-4')).toBe(false);
  });
  it('deleting members and labels cleans task associations', async () => {
    await repo.load();
    await repo.deleteMember('member-1');
    await repo.deleteLabel('label-1');
    const data = await repo.load();
    expect(
      data.tasks.every(
        (t) => !t.assignee_ids.includes('member-1') && !t.label_ids.includes('label-1'),
      ),
    ).toBe(true);
  });
  it('rejects unknown associations without modifying stored data', async () => {
    await repo.load();
    const before = store.get(STORAGE_KEY);
    await expect(repo.saveTask({ ...draft, label_ids: ['missing'] })).rejects.toThrow();
    expect(store.get(STORAGE_KEY)).toBe(before);
  });
  it('rejects duplicate label names', async () => {
    await repo.load();
    await expect(repo.addLabel('design', '#7C6BB5')).rejects.toThrow('already exists');
  });
  it('rejects empty comments', async () => {
    await repo.load();
    await expect(repo.addComment('task-1', '  ')).rejects.toThrow();
  });
  it('reports corrupt storage rather than silently overwriting it', async () => {
    store.set(STORAGE_KEY, 'bad json');
    await expect(repo.load()).rejects.toThrow('damaged');
    expect(store.get(STORAGE_KEY)).toBe('bad json');
  });
  it('reports storage write failures honestly', async () => {
    const blocked = createDemoRepository({
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
    });
    await expect(blocked.load()).rejects.toThrow('not saved');
  });
});
