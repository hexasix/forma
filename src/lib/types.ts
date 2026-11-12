export const STATUSES = ['todo', 'in_progress', 'in_review', 'done'] as const;
export type Status = (typeof STATUSES)[number];
export const PRIORITIES = ['low', 'normal', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];
export const COLUMNS: { id: Status; name: string; hint: string }[] = [
  { id: 'todo', name: 'To do', hint: 'Good things start here' },
  { id: 'in_progress', name: 'In progress', hint: 'Making things happen' },
  { id: 'in_review', name: 'In review', hint: 'A fresh pair of eyes' },
  { id: 'done', name: 'Done', hint: 'A little victory, every time' },
];
export const COLORS = ['#7C6BB5', '#3C8370', '#C87844', '#5087B6', '#B76683', '#8B8246'];
export interface Member {
  id: string;
  user_id: string;
  name: string;
  color: string;
}
export interface Label {
  id: string;
  user_id: string;
  name: string;
  color: string;
}
export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  assignee_ids: string[];
  label_ids: string[];
}
export interface Comment {
  id: string;
  user_id: string;
  task_id: string;
  body: string;
  created_at: string;
}
export interface Activity {
  id: string;
  user_id: string;
  task_id: string;
  message: string;
  created_at: string;
}
export interface BoardData {
  tasks: Task[];
  members: Member[];
  labels: Label[];
  comments: Comment[];
  activities: Activity[];
}
export interface TaskDraft {
  id?: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  due_date: string | null;
  assignee_ids: string[];
  label_ids: string[];
}
export interface Filters {
  search: string;
  priority: string;
  assignee: string;
  label: string;
  status: string;
}
export const EMPTY_FILTERS: Filters = {
  search: '',
  priority: '',
  assignee: '',
  label: '',
  status: '',
};
export const EMPTY_BOARD: BoardData = {
  tasks: [],
  members: [],
  labels: [],
  comments: [],
  activities: [],
};
