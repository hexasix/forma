import { dateOffset } from './utils';
import type { BoardData, Task } from './types';
export const DEMO_USER = 'demo-guest';
export function createSampleBoard(): BoardData {
  const now = new Date().toISOString();
  const user_id = DEMO_USER;
  const members = [
    { id: 'member-1', user_id, name: 'Alex Morgan', color: '#C87844' },
    { id: 'member-2', user_id, name: 'Jamie Chen', color: '#7C6BB5' },
    { id: 'member-3', user_id, name: 'Sam Rivera', color: '#3C8370' },
  ];
  const labels = [
    { id: 'label-1', user_id, name: 'Design', color: '#7C6BB5' },
    { id: 'label-2', user_id, name: 'Engineering', color: '#5087B6' },
    { id: 'label-3', user_id, name: 'Research', color: '#C87844' },
    { id: 'label-4', user_id, name: 'Marketing', color: '#3C8370' },
  ];
  const base = {
    user_id,
    description: '',
    priority: 'normal' as const,
    due_date: null,
    created_at: now,
    updated_at: now,
    assignee_ids: [],
    label_ids: [],
  };
  const tasks: Task[] = [
    {
      ...base,
      id: 'task-1',
      title: 'Explore a new visual direction',
      description:
        'Bring a little more personality to the everyday. Gather references, explore a warmer palette, and sketch a few directions for the new landing page.\n\nDeliverable: three initial concepts to share with the team.',
      status: 'todo',
      priority: 'high',
      due_date: dateOffset(2),
      assignee_ids: ['member-1'],
      label_ids: ['label-1'],
    },
    {
      ...base,
      id: 'task-2',
      title: 'Talk to the people who use our product',
      description:
        'Schedule five short conversations. Focus on what makes their work easier — and what gets in the way.',
      status: 'todo',
      due_date: dateOffset(4),
      assignee_ids: ['member-3'],
      label_ids: ['label-3'],
    },
    {
      ...base,
      id: 'task-3',
      title: 'Draft the launch story',
      description: 'A clear, honest introduction to what we are building and why it matters.',
      status: 'todo',
      priority: 'low',
      assignee_ids: ['member-1', 'member-3'],
      label_ids: ['label-4'],
    },
    {
      ...base,
      id: 'task-4',
      title: 'Make onboarding feel effortless',
      description:
        'Refine the first-run experience. Every step should have a clear purpose, and getting started should take less than a minute.',
      status: 'in_progress',
      priority: 'high',
      due_date: dateOffset(0),
      assignee_ids: ['member-1', 'member-2'],
      label_ids: ['label-1', 'label-2'],
    },
    {
      ...base,
      id: 'task-5',
      title: 'Build the component library',
      description:
        'Start with the essentials: buttons, inputs, cards, and a considered set of empty states. Remember keyboard focus and reduced motion.',
      status: 'in_progress',
      due_date: dateOffset(3),
      assignee_ids: ['member-2'],
      label_ids: ['label-2'],
    },
    {
      ...base,
      id: 'task-6',
      title: 'A final pass on the landing page',
      description:
        'Check copy, contrast, and the experience on a small screen. Leave comments with anything that needs a second look.',
      status: 'in_review',
      due_date: dateOffset(-1),
      assignee_ids: ['member-3'],
      label_ids: ['label-1'],
    },
    {
      ...base,
      id: 'task-7',
      title: 'Find our north star',
      description:
        'Agree on the one thing we want to help people do better. Keep it clear enough to fit on a sticky note.',
      status: 'done',
      assignee_ids: ['member-1', 'member-3'],
      label_ids: ['label-3'],
    },
    {
      ...base,
      id: 'task-8',
      title: 'Set up our shared workspace',
      description: 'A quiet corner for a team with big ideas. All set and ready to go.',
      status: 'done',
      priority: 'low',
      assignee_ids: ['member-2'],
      label_ids: ['label-2'],
    },
  ];
  return {
    tasks,
    members,
    labels,
    comments: [
      {
        id: 'comment-1',
        user_id,
        task_id: 'task-4',
        body: 'Let’s keep this simple. A welcoming first screen and one clear next step should do it.',
        created_at: now,
      },
    ],
    activities: tasks.map((task) => ({
      id: `activity-${task.id}`,
      user_id,
      task_id: task.id,
      message: 'Created this task',
      created_at: now,
    })),
  };
}
