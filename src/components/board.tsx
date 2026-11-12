'use client';
import { useState, type CSSProperties } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core';
import {
  CalendarDays,
  Check,
  CircleDashed,
  GripVertical,
  MessageSquare,
  Plus,
  SearchX,
} from 'lucide-react';
import { COLUMNS, STATUSES, type BoardData, type Status, type Task } from '@/lib/types';
import { dueState, formatDate, localDate, statusName } from '@/lib/utils';
import { Avatar, PriorityMark, StatusDot } from './ui';

function CardContent({
  task,
  data,
  open,
  overlay = false,
}: {
  task: Task;
  data: BoardData;
  open: () => void;
  overlay?: boolean;
}) {
  const labels = data.labels.filter((l) => task.label_ids.includes(l.id));
  const members = data.members.filter((m) => task.assignee_ids.includes(m.id));
  const comments = data.comments.filter((c) => c.task_id === task.id).length;
  const urgency = dueState(task);
  return (
    <>
      <div className="card-topline">
        <div className="card-labels">
          {labels.slice(0, 2).map((label) => (
            <span
              key={label.id}
              className="label-chip"
              style={{ '--label-color': label.color } as CSSProperties}
            >
              <span />
              {label.name}
            </span>
          ))}
          {labels.length > 2 && (
            <span
              className="more-labels"
              title={labels
                .slice(2)
                .map((l) => l.name)
                .join(', ')}
            >
              +{labels.length - 2}
            </span>
          )}
          {!labels.length && (
            <span className="task-reference">
              TASK · {task.id.replace('task-', '').slice(0, 4).toUpperCase()}
            </span>
          )}
        </div>
      </div>
      <button
        className={`task-open ${task.status === 'done' ? 'task-complete' : ''}`}
        tabIndex={overlay ? -1 : 0}
        onClick={open}
      >
        <h3>{task.title}</h3>
        {task.description && <p>{task.description}</p>}
      </button>
      <div className="card-footer">
        <div className="card-meta">
          <PriorityMark priority={task.priority} />
          {task.due_date && (
            <span
              className={`due-date due-${urgency}`}
              title={`Due ${task.due_date}${urgency === 'overdue' ? ' · Overdue' : ''}`}
            >
              <CalendarDays size={12} />
              {task.due_date === localDate() ? 'Today' : formatDate(task.due_date)}
              {urgency === 'overdue' && <span className="sr-only"> (Overdue)</span>}
            </span>
          )}
          {comments > 0 && (
            <span className="comment-count" title={`${comments} comments`}>
              <MessageSquare size={12} />
              {comments}
            </span>
          )}
        </div>
        <div className="avatar-stack">
          {members.slice(0, 3).map((member) => (
            <Avatar key={member.id} member={member} small />
          ))}
          {members.length > 3 && (
            <span
              className="avatar avatar-small avatar-overflow"
              title={members
                .slice(3)
                .map((m) => m.name)
                .join(', ')}
            >
              +{members.length - 3}
            </span>
          )}
          {task.status === 'done' && !members.length && (
            <span className="done-check">
              <Check size={14} />
            </span>
          )}
        </div>
      </div>
    </>
  );
}
function TaskCard({
  task,
  data,
  open,
  disabled,
}: {
  task: Task;
  data: BoardData;
  open: () => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled,
    data: { status: task.status },
  });
  return (
    <article
      ref={setNodeRef}
      className={`task-card ${isDragging ? 'is-dragging' : ''}`}
      data-testid={`task-${task.id}`}
    >
      <button
        className="drag-handle"
        {...attributes}
        {...listeners}
        aria-label={`Drag ${task.title}`}
        title="Drag to move · Space then arrow keys on keyboard"
      >
        <GripVertical size={15} />
      </button>
      <CardContent task={task} data={data} open={open} />
    </article>
  );
}
function Column({
  status,
  data,
  tasks,
  open,
  add,
  disabled,
  filtered,
}: {
  status: Status;
  data: BoardData;
  tasks: Task[];
  open: (task: Task) => void;
  add: (status: Status) => void;
  disabled: boolean;
  filtered: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled });
  const column = COLUMNS.find((c) => c.id === status)!;
  return (
    <section
      ref={setNodeRef}
      className={`board-column ${isOver ? 'column-over' : ''}`}
      aria-label={column.name}
      data-testid={`column-${status}`}
    >
      <header className="column-heading">
        <div>
          <StatusDot status={status} />
          <h2>{column.name}</h2>
          <span className="column-count">{tasks.length}</span>
        </div>
        <button
          className="icon-button column-add"
          onClick={() => add(status)}
          disabled={disabled}
          aria-label={`Add task to ${column.name}`}
        >
          <Plus size={16} />
        </button>
      </header>
      <div className="column-rule" />
      <div className="column-cards">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            data={data}
            open={() => open(task)}
            disabled={disabled}
          />
        ))}
        {!tasks.length && (
          <div className="column-empty">
            <CircleDashed size={24} strokeWidth={1.2} />
            <span>{filtered ? 'No matching tasks' : column.hint}</span>
          </div>
        )}
      </div>
      <button className="add-card" onClick={() => add(status)} disabled={disabled}>
        <Plus size={15} />
        Add task
      </button>
    </section>
  );
}
const keyboardCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates, context }) => {
  if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.code)) return undefined;
  event.preventDefault();
  const active = context.over?.id ?? context.active?.data.current?.status;
  const current = STATUSES.indexOf(active as Status);
  const next = Math.max(
    0,
    Math.min(
      3,
      (current < 0 ? 0 : current) +
        (event.code === 'ArrowRight' || event.code === 'ArrowDown' ? 1 : -1),
    ),
  );
  const rect = context.droppableRects.get(STATUSES[next]);
  const collision = context.collisionRect;
  if (rect && collision)
    return {
      x: currentCoordinates.x + rect.left + rect.width / 2 - (collision.left + collision.width / 2),
      y: currentCoordinates.y + rect.top + 80 - collision.top,
    };
  return currentCoordinates;
};
export function Board({
  data,
  tasks,
  busy,
  open,
  add,
  move,
  filtered,
}: {
  data: BoardData;
  tasks: Task[];
  busy: boolean;
  open: (task: Task) => void;
  add: (status: Status) => void;
  move: (id: string, status: Status) => Promise<boolean>;
  filtered: boolean;
}) {
  const [active, setActive] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }),
  );
  const task = data.tasks.find((t) => t.id === active);
  function onDragEnd(event: DragEndEvent) {
    setActive(null);
    const target = event.over?.id as Status | undefined;
    const dragged = data.tasks.find((t) => t.id === event.active.id);
    if (target && STATUSES.includes(target) && dragged && dragged.status !== target)
      void move(dragged.id, target);
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={(args) => {
        const pointer = pointerWithin(args);
        return pointer.length ? pointer : rectIntersection(args);
      }}
      onDragStart={(e) => setActive(String(e.active.id))}
      onDragCancel={() => setActive(null)}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            'Press Space to pick up a task. Use left and right arrow keys to choose a column. Press Space again to drop, or Escape to cancel.',
        },
        announcements: {
          onDragStart: ({ active }) =>
            `Picked up ${data.tasks.find((t) => t.id === active.id)?.title || 'task'}.`,
          onDragOver: ({ over }) =>
            over ? `Over ${statusName(String(over.id))}.` : 'Outside the board.',
          onDragEnd: ({ over }) =>
            over ? `Dropped in ${statusName(String(over.id))}.` : 'Move canceled.',
          onDragCancel: () => 'Move canceled.',
        },
      }}
    >
      <div className="kanban-board">
        {COLUMNS.map((column) => (
          <Column
            key={column.id}
            status={column.id}
            data={data}
            tasks={tasks.filter((t) => t.status === column.id)}
            open={open}
            add={add}
            disabled={busy}
            filtered={filtered}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
        {task && (
          <article className="task-card drag-overlay">
            <CardContent task={task} data={data} open={() => {}} overlay />
          </article>
        )}
      </DragOverlay>
    </DndContext>
  );
}
export function TaskList({
  tasks,
  data,
  open,
}: {
  tasks: Task[];
  data: BoardData;
  open: (task: Task) => void;
}) {
  if (!tasks.length)
    return (
      <div className="list-empty">
        <SearchX size={32} strokeWidth={1.3} />
        <h3>Nothing here, yet.</h3>
        <p>Try another filter, or make room for your next idea.</p>
      </div>
    );
  return (
    <div className="task-table-wrap">
      <table className="task-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Due date</th>
            <th>Assignees</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>
                <button className="table-task-button" onClick={() => open(task)}>
                  <StatusDot status={task.status} />
                  {task.title}
                </button>
              </td>
              <td>
                <span className="table-status">{statusName(task.status)}</span>
              </td>
              <td>
                <PriorityMark priority={task.priority} text />
              </td>
              <td>
                <span className={`due-date due-${dueState(task)}`}>
                  {task.due_date ? formatDate(task.due_date) : '—'}
                </span>
              </td>
              <td>
                <div className="avatar-stack">
                  {data.members
                    .filter((m) => task.assignee_ids.includes(m.id))
                    .map((m) => (
                      <Avatar key={m.id} member={m} small />
                    ))}
                  {!task.assignee_ids.length && <span className="muted">Unassigned</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
