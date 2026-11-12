'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Command,
  Filter,
  Flag,
  LayoutGrid,
  List,
  LoaderCircle,
  LockKeyhole,
  Menu,
  PanelLeftClose,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useBoard } from '@/lib/use-board';
import { COLUMNS, EMPTY_FILTERS, type Filters, type Status, type Task } from '@/lib/types';
import { dueState, filterTasks } from '@/lib/utils';
import { Avatar, Dialog } from './ui';
import { Board, TaskList } from './board';
import { TaskDialog } from './task-dialog';
import { ManageDialog } from './manage-dialog';

type Modal =
  | { type: 'new'; status: Status }
  | { type: 'task'; id: string }
  | { type: 'members' | 'labels' | 'help' }
  | null;
type Section = 'board' | 'all' | 'priority' | 'completed';
export function Workspace() {
  const board = useBoard();
  const { data, loading, busy, mode, error, notice } = board;
  const [modal, setModal] = useState<Modal>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [view, setView] = useState<'board' | 'list'>('board');
  const [section, setSection] = useState<Section>('board');
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarTrigger = useRef<HTMLButtonElement>(null);
  const completed = data.tasks.filter((t) => t.status === 'done').length;
  const overdue = data.tasks.filter((t) => dueState(t) === 'overdue').length;
  const progress = data.tasks.length ? Math.round((completed / data.tasks.length) * 100) : 0;
  const visibleTasks = filterTasks(data.tasks, filters);
  const filterCount = Object.entries(filters).filter(
    ([key, value]) => key !== 'search' && value,
  ).length;
  const filtered = Object.values(filters).some(Boolean);
  const currentTask =
    modal?.type === 'task' ? data.tasks.find((t) => t.id === modal.id) : undefined;
  const title =
    section === 'priority'
      ? 'A little extra focus.'
      : section === 'completed'
        ? 'Look how far you’ve come.'
        : 'Good work, in motion.';
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const editing =
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !modal) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (
        event.key.toLowerCase() === 'n' &&
        !editing &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !modal &&
        !loading &&
        !error
      ) {
        event.preventDefault();
        setModal({ type: 'new', status: 'todo' });
      }
      if (event.key === 'Escape' && !modal) {
        if (mobileSidebar) setMobileSidebar(false);
        else {
          setFilters((f) => ({ ...f, search: '' }));
          searchRef.current?.blur();
        }
      }
    }
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, [modal, loading, error, mobileSidebar]);
  useEffect(() => {
    if (!mobileSidebar) return;
    const trigger = sidebarTrigger.current;
    sidebarRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    function trap(event: KeyboardEvent) {
      if (event.key !== 'Tab') return;
      const items = Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') || [],
      ).filter((el) => el.getClientRects().length);
      const first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener('keydown', trap);
    return () => {
      document.removeEventListener('keydown', trap);
      trigger?.focus();
    };
  }, [mobileSidebar]);
  function navigate(next: Section) {
    setSection(next);
    setFilters({
      ...EMPTY_FILTERS,
      priority: next === 'priority' ? 'high' : '',
      status: next === 'completed' ? 'done' : '',
    });
    setView(next === 'board' ? 'board' : 'list');
    setMobileSidebar(false);
  }
  function openManager(type: 'members' | 'labels' | 'help') {
    setMobileSidebar(false);
    setModal({ type });
  }
  function add(status: Status = 'todo') {
    setModal({ type: 'new', status });
  }
  function open(task: Task) {
    setModal({ type: 'task', id: task.id });
  }
  return (
    <div className="app-shell">
      <a href="#workspace-main" className="skip-link">
        Skip to board
      </a>
      {mobileSidebar && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileSidebar(false)}
        />
      )}
      <aside
        className={`sidebar ${mobileSidebar ? 'sidebar-open' : ''}`}
        ref={sidebarRef}
        aria-label="Workspace navigation"
        {...(mobileSidebar ? { role: 'dialog' as const, 'aria-modal': true } : {})}
      >
        <div className="brand-row">
          <Link href="/" className="brand" aria-label="Forma home">
            <span className="brand-mark">
              <i />
              <i />
              <i />
              <i />
            </span>
            forma<span className="brand-period">.</span>
          </Link>
          <button
            className="icon-button mobile-close"
            onClick={() => setMobileSidebar(false)}
            aria-label="Close navigation"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
        <button className="workspace-switch" onClick={() => openManager('help')}>
          <span className="workspace-avatar">
            S<span>✳</span>
          </span>
          <span>
            <strong>Studio workspace</strong>
            <small>Your space to make things</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="main-nav">
          <button className={section === 'board' ? 'active' : ''} onClick={() => navigate('board')}>
            <LayoutGrid size={17} />
            Project board
            <span className="nav-dot" />
          </button>
          <button className={section === 'all' ? 'active' : ''} onClick={() => navigate('all')}>
            <List size={17} />
            All tasks<span className="nav-count">{data.tasks.length}</span>
          </button>
          <button
            className={section === 'priority' ? 'active' : ''}
            onClick={() => navigate('priority')}
          >
            <Flag size={17} />
            High priority
            <span className="nav-count">
              {data.tasks.filter((t) => t.priority === 'high').length}
            </span>
          </button>
          <button
            className={section === 'completed' ? 'active' : ''}
            onClick={() => navigate('completed')}
          >
            <CheckCheck size={17} />
            Completed<span className="nav-count">{completed}</span>
          </button>
        </nav>
        <div className="sidebar-section-label label-heading">
          LABELS
          <button
            className="icon-button"
            aria-label="Manage labels"
            disabled={loading || !!error}
            onClick={() => openManager('labels')}
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="sidebar-labels">
          {data.labels.map((label) => (
            <button
              key={label.id}
              className={filters.label === label.id ? 'active' : ''}
              onClick={() => {
                setFilters((f) => ({ ...f, label: f.label === label.id ? '' : label.id }));
                setMobileSidebar(false);
              }}
            >
              <span className="sidebar-label-dot" style={{ background: label.color }} />
              {label.name}
              <span>{data.tasks.filter((t) => t.label_ids.includes(label.id)).length}</span>
            </button>
          ))}
          {!data.labels.length && (
            <button
              className="sidebar-empty"
              onClick={() => openManager('labels')}
              disabled={loading || !!error}
            >
              <Tags size={14} />
              Create your first label
            </button>
          )}
        </div>
        <div className="sidebar-section-label label-heading">
          THE PEOPLE
          <button
            className="icon-button"
            aria-label="Manage team members"
            disabled={loading || !!error}
            onClick={() => openManager('members')}
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="sidebar-people">
          {data.members.slice(0, 4).map((member) => (
            <button
              key={member.id}
              onClick={() => {
                setFilters((f) => ({ ...f, assignee: f.assignee === member.id ? '' : member.id }));
                setMobileSidebar(false);
              }}
              className={filters.assignee === member.id ? 'active' : ''}
            >
              <Avatar member={member} small />
              <span>{member.name}</span>
              {filters.assignee === member.id && <Check size={13} />}
            </button>
          ))}
          {!data.members.length && (
            <button
              className="sidebar-empty"
              onClick={() => openManager('members')}
              disabled={loading || !!error}
            >
              <Users size={14} />
              Add your team
            </button>
          )}
          {data.members.length > 4 && (
            <button className="text-button" onClick={() => openManager('members')}>
              View all {data.members.length} members <ArrowRight size={12} />
            </button>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="little-note">
            <span className="note-sparkle">✳</span>
            <strong>
              Less noise.
              <br />
              More good work.
            </strong>
            <p>
              One task at a time.
              <br />
              You’re getting somewhere.
            </p>
            <span className="note-line" />
          </div>
          <button className="guest-profile" onClick={() => openManager('help')}>
            <Avatar member={{ name: 'You', color: '#3C8370' }} />
            <span>
              <strong>Your private space</strong>
              <small>
                <LockKeyhole size={10} />
                Guest workspace
              </small>
            </span>
            <CircleHelp size={16} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              ref={sidebarTrigger}
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-expanded={mobileSidebar}
              onClick={() => setMobileSidebar(true)}
            >
              <Menu size={19} />
            </button>
            <span className="breadcrumb-root">Workspace</span>
            <ChevronRight size={13} />
            <span>Product launch</span>
            <span className="private-badge">
              <LockKeyhole size={10} />
              Private
            </span>
          </div>
          <div className="topbar-actions">
            <span className="today-label">A little progress, every day.</span>
            <button
              className="icon-button"
              aria-label="Help and keyboard shortcuts"
              onClick={() => setModal({ type: 'help' })}
            >
              <CircleHelp size={17} />
            </button>
            <span className="topbar-divider" />
            <Avatar member={{ name: 'You', color: '#3C8370' }} small />
          </div>
        </header>
        <main id="workspace-main" className="workspace-main" tabIndex={-1}>
          <section className="project-heading">
            <div>
              <div className="project-eyebrow">
                <span className="project-symbol">✳</span>PRODUCT LAUNCH{' '}
                <span className="eyebrow-dot">·</span> YOUR TEAM’S NEXT CHAPTER
              </div>
              <h1>{title}</h1>
              <p>
                {section === 'priority'
                  ? 'The important things, with room to breathe.'
                  : section === 'completed'
                    ? 'Every finished task is a small victory worth keeping.'
                    : 'A shared space for big ideas and the small steps that get you there.'}
              </p>
            </div>
            <div className="project-heading-actions">
              <button
                className="team-button"
                onClick={() => setModal({ type: 'members' })}
                disabled={loading || !!error}
                aria-label="Manage project team"
              >
                <span className="avatar-stack">
                  {data.members.slice(0, 3).map((member) => (
                    <Avatar key={member.id} member={member} small />
                  ))}
                </span>
                <span className="team-add">
                  <Users size={15} />
                </span>
              </button>
              <button
                className="button button-primary new-task-button"
                onClick={() => add()}
                disabled={loading || !!error || busy}
              >
                <Plus size={17} />
                New task<kbd>N</kbd>
              </button>
            </div>
          </section>
          <div className="board-overview">
            <div className="overview-summary">
              <span className="completion-icon">
                <CheckCheck size={15} />
              </span>
              <strong>{completed}</strong>
              <span>of {data.tasks.length} tasks complete</span>
              <span
                className="progress-track"
                role="progressbar"
                aria-label="Tasks completed"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                title={`${completed} of ${data.tasks.length} tasks completed (${progress}%)`}
              >
                <span style={{ width: `${progress}%` }} />
              </span>
              <span className="progress-percent">{progress}%</span>
            </div>
            <div className="overview-right">
              {overdue > 0 && (
                <span className="overdue-summary">
                  <span />
                  {overdue} overdue
                </span>
              )}
              <span className={`connection-status ${mode === 'demo' ? 'is-demo' : ''}`}>
                <span />
                {loading
                  ? 'Getting things ready'
                  : error
                    ? 'Connection unavailable'
                    : mode === 'demo'
                      ? 'Local demo'
                      : 'Saved to Supabase'}
              </span>
            </div>
          </div>
          <section className="board-toolbar" aria-label="Board controls">
            <div className="view-tabs" role="group" aria-label="Board view">
              <button
                aria-pressed={view === 'board'}
                className={view === 'board' ? 'active' : ''}
                onClick={() => setView('board')}
              >
                <LayoutGrid size={15} />
                Board
              </button>
              <button
                aria-pressed={view === 'list'}
                className={view === 'list' ? 'active' : ''}
                onClick={() => setView('list')}
              >
                <List size={16} />
                List
              </button>
            </div>
            <div className="toolbar-controls">
              <div className="search-field">
                <Search size={15} />
                <input
                  ref={searchRef}
                  aria-label="Search tasks"
                  placeholder="Search tasks…"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
                {filters.search ? (
                  <button
                    className="clear-search"
                    aria-label="Clear search"
                    onClick={() => setFilters({ ...filters, search: '' })}
                  >
                    <X size={12} />
                  </button>
                ) : (
                  <kbd>
                    <Command size={10} />K
                  </kbd>
                )}
              </div>
              <button
                className={`button button-filter ${showFilters || filterCount ? 'filter-active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
                aria-expanded={showFilters}
              >
                <Filter size={14} />
                <span>Filter</span>
                {filterCount > 0 && <span className="filter-count">{filterCount}</span>}
              </button>
              <button
                className={`icon-button refresh-button ${busy ? 'spinning' : ''}`}
                aria-label="Refresh board"
                title="Refresh board"
                disabled={loading || busy || (!!error && !data.tasks.length)}
                onClick={() => void board.refresh()}
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </section>
          {showFilters && (
            <section className="filter-panel" aria-label="Task filters">
              <label>
                Priority
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                >
                  <option value="">All priorities</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label>
                Assignee
                <select
                  value={filters.assignee}
                  onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
                >
                  <option value="">Everyone</option>
                  <option value="unassigned">Unassigned</option>
                  {data.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Label
                <select
                  value={filters.label}
                  onChange={(e) => setFilters({ ...filters, label: e.target.value })}
                >
                  <option value="">All labels</option>
                  {data.labels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All statuses</option>
                  {COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="text-button"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setSection('board');
                }}
              >
                Reset filters
              </button>
            </section>
          )}
          {filtered && (
            <div className="filter-summary">
              <span>
                {visibleTasks.length} of {data.tasks.length} tasks
                {filters.search && <> matching “{filters.search}”</>}
              </span>
              <button
                className="text-button"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setSection('board');
                }}
              >
                Clear all
                <X size={12} />
              </button>
            </div>
          )}
          {error && (
            <section className="error-banner" role="alert">
              <WifiOff size={21} />
              <div>
                <strong>Let’s get you connected.</strong>
                <p>{error}</p>
              </div>
              <button
                className="button button-secondary"
                onClick={() => void (data.tasks.length ? board.refresh() : board.initialize())}
                disabled={busy || loading}
              >
                Try again
              </button>
            </section>
          )}
          {loading ? (
            <div className="loading-board" aria-label="Loading tasks" role="status">
              <span className="sr-only">Loading your workspace…</span>
              {COLUMNS.map((column, index) => (
                <div className="skeleton-column" key={column.id}>
                  <div className="skeleton skeleton-heading" />
                  {Array.from({ length: [3, 2, 1, 2][index] }, (_, i) => (
                    <div key={i} className="skeleton skeleton-card">
                      <span />
                      <span />
                      <span />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : !error || data.tasks.length ? (
            <>
              <div className="board-content" aria-busy={busy}>
                {view === 'board' ? (
                  <Board
                    data={data}
                    tasks={visibleTasks}
                    busy={busy}
                    open={open}
                    add={add}
                    move={board.moveTask}
                    filtered={filtered}
                  />
                ) : (
                  <TaskList tasks={visibleTasks} data={data} open={open} />
                )}
              </div>
              {!data.tasks.length && !filtered && (
                <div className="first-task-prompt">
                  <Sparkles size={19} />
                  <div>
                    <strong>A fresh start. What will you make?</strong>
                    <p>Add your first task and give your next idea a little room.</p>
                  </div>
                  <button className="button button-secondary" onClick={() => add()}>
                    Create a task
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              )}
            </>
          ) : null}
          <footer className="board-footer">
            <span>
              {mode === 'demo' ? (
                <>
                  <span className="demo-marker" />
                  Demo data · saved only in this browser
                </>
              ) : (
                <>
                  <ShieldCheck size={12} />
                  Private by design · only you can access this board
                </>
              )}
            </span>
            <span className="drag-tip">
              <ArrowDown size={11} />
              Drag between columns to move things forward
            </span>
            <button className="text-button" onClick={() => setModal({ type: 'help' })}>
              {mode === 'demo' ? 'Connect Supabase' : 'About your workspace'}
              <ArrowUpRight size={12} />
            </button>
          </footer>
        </main>
        <div className="bottom-signature">A LITTLE STRUCTURE. A LOT OF POSSIBILITY.</div>
      </div>
      {modal?.type === 'new' && (
        <TaskDialog
          status={modal.status}
          data={data}
          busy={busy}
          mutate={board.mutate}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'task' && currentTask && (
        <TaskDialog
          task={currentTask}
          data={data}
          busy={busy}
          mutate={board.mutate}
          onClose={() => setModal(null)}
        />
      )}
      {(modal?.type === 'members' || modal?.type === 'labels') && (
        <ManageDialog
          kind={modal.type}
          items={modal.type === 'members' ? data.members : data.labels}
          busy={busy}
          mutate={board.mutate}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'help' && (
        <Dialog
          title="A calmer kind of workspace."
          subtitle="A little structure. A lot of possibility."
          onClose={() => setModal(null)}
        >
          <div className="help-content">
            <div className="help-highlight">
              <ShieldCheck size={24} />
              <div>
                <strong>Your board is yours.</strong>
                <p>
                  {mode === 'demo'
                    ? 'You are exploring the local demo. Changes are saved in this browser only — not in Supabase. Sample people and tasks are fictional.'
                    : 'You are signed in as an anonymous Supabase user. Row-level security keeps your tasks, comments, labels, and members private.'}
                </p>
              </div>
            </div>
            {mode === 'demo' && (
              <>
                <h3>Ready for the real thing?</h3>
                <ol>
                  <li>Create a free Supabase project.</li>
                  <li>
                    Run <code>supabase/migrations/001_initial.sql</code> in the SQL Editor.
                  </li>
                  <li>
                    Enable <strong>Anonymous Sign-Ins</strong> in Authentication.
                  </li>
                  <li>
                    Copy <code>.env.example</code> to <code>.env.local</code> and add your project
                    URL and public key.
                  </li>
                  <li>Restart Next.js. Your private cloud board starts empty.</li>
                </ol>
                <p className="field-help">
                  Demo data is intentionally separate and is never uploaded automatically. Use only
                  a publishable or anon key — never a secret or service-role key.
                </p>
              </>
            )}
            <h3>Small shortcuts, big difference.</h3>
            <div className="shortcut-row">
              <span>Find a task</span>
              <kbd>⌘ / Ctrl + K</kbd>
            </div>
            <div className="shortcut-row">
              <span>Create a task</span>
              <kbd>N</kbd>
            </div>
            <div className="shortcut-row">
              <span>Drag with a keyboard</span>
              <kbd>Space → arrows → Space</kbd>
            </div>
            <div className="shortcut-row">
              <span>Close a panel</span>
              <kbd>Esc</kbd>
            </div>
            <p className="help-footnote">
              {mode === 'demo'
                ? 'Clearing browser storage removes local demo changes.'
                : 'Your guest session belongs to this browser. Clearing its storage or switching devices creates a different guest; there is no email-based account recovery.'}{' '}
              Team members are assignees, not shared-board accounts.
            </p>
          </div>
        </Dialog>
      )}
      {notice && (
        <div
          className={`toast toast-${notice.kind}`}
          role={notice.kind === 'error' ? 'alert' : 'status'}
          key={notice.id}
        >
          {notice.kind === 'error' ? <WifiOff size={17} /> : <Check size={17} />}
          <span>{notice.message}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => board.setNotice(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {busy && (
        <div className="saving-indicator" role="status">
          <LoaderCircle size={12} className="spin" />
          Syncing workspace…
        </div>
      )}
    </div>
  );
}
