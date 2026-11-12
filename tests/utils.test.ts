import { describe, expect, it } from 'vitest';
import { dueState, filterTasks, initials, localDate, validateDraft } from '../src/lib/utils';
import { EMPTY_FILTERS, type TaskDraft } from '../src/lib/types';
import { createSampleBoard } from '../src/lib/demo';
const draft: TaskDraft = {
  title: ' Write tests ',
  description: '',
  status: 'todo',
  priority: 'normal',
  due_date: null,
  assignee_ids: [],
  label_ids: [],
};
describe('task rules', () => {
  it('validates and trims a task', () => expect(validateDraft(draft).title).toBe('Write tests'));
  it('rejects blank titles', () =>
    expect(() => validateDraft({ ...draft, title: '  ' })).toThrow());
  it('rejects long titles and descriptions', () => {
    expect(() => validateDraft({ ...draft, title: 'x'.repeat(201) })).toThrow();
    expect(() => validateDraft({ ...draft, description: 'x'.repeat(10001) })).toThrow();
  });
  it('rejects impossible calendar dates', () =>
    expect(() => validateDraft({ ...draft, due_date: '2026-02-30' })).toThrow());
  it('accepts leap days', () =>
    expect(validateDraft({ ...draft, due_date: '2028-02-29' }).due_date).toBe('2028-02-29'));
  it('deduplicates assignees and labels', () =>
    expect(validateDraft({ ...draft, assignee_ids: ['a', 'a'] }).assignee_ids).toEqual(['a']));
  it('formats local dates without UTC shifts', () =>
    expect(localDate(new Date(2026, 10, 11, 23, 59))).toBe('2026-11-11'));
  it('never marks completed tasks as overdue', () =>
    expect(dueState({ due_date: '2020-01-01', status: 'done' }, '2026-11-11')).toBe('normal'));
  it('detects overdue, today, tomorrow, and later', () => {
    expect(dueState({ due_date: '2026-11-10', status: 'todo' }, '2026-11-11')).toBe('overdue');
    expect(dueState({ due_date: '2026-11-11', status: 'todo' }, '2026-11-11')).toBe('soon');
    expect(dueState({ due_date: '2026-11-12', status: 'todo' }, '2026-11-11')).toBe('soon');
    expect(dueState({ due_date: '2026-11-13', status: 'todo' }, '2026-11-11')).toBe('normal');
  });
  it('combines search with priority, assignee, labels, and status', () => {
    const tasks = filterTasks(createSampleBoard().tasks, {
      ...EMPTY_FILTERS,
      search: ' ONBOARDING ',
      priority: 'high',
      assignee: 'member-2',
      label: 'label-1',
      status: 'in_progress',
    });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('task-4');
  });
  it('filters unassigned tasks', () =>
    expect(
      filterTasks(createSampleBoard().tasks, { ...EMPTY_FILTERS, assignee: 'unassigned' }),
    ).toHaveLength(0));
  it('builds initials from Unicode names', () => {
    expect(initials(' Alex Morgan ')).toBe('AM');
    expect(initials('李 明')).toBe('李明');
  });
});
