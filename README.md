# Forma

A calmer place for good work. A private task workspace built with **Next.js App Router, React, TypeScript, and Supabase**.

**Live demo:** [forma-sigma-beryl.vercel.app](https://forma-sigma-beryl.vercel.app/)

New visitors are signed in anonymously and start with an empty, private board. No email or password is required.

## Features

- Four-column Kanban board: To do, In progress, In review, and Done.
- Mouse, touch, and keyboard drag-and-drop, with status saved when a task is dropped.
- Task creation, editing, deletion, and a detail panel with descriptions, priorities, and due dates.
- Team member management and multiple assignees per task. Members are task assignees, **not shared-board accounts or invitations**.
- Custom labels, multiple labels per task, and label filtering.
- Persistent comments with timestamps, plus an activity history for task updates, status changes, and assignments.
- Title search combined with priority, assignee, label, and status filters.
- Board and list views, completion progress, and overdue / due-soon indicators.
- Responsive layouts, loading and empty states, actionable errors, save notifications, deletion confirmation, and unsaved-change protection.
- Supabase anonymous authentication, persistent storage, row-level security (RLS), and database constraints that prevent cross-owner associations.
- An explicitly labeled **local demo mode** when Supabase is not configured.

## Quick start

Use **Node.js 22.12 or later**; Node.js 24 LTS is recommended. The application has also been built and tested on Node.js 26.

```bash
git clone https://github.com/hexasix/forma.git
cd forma
npm ci
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

If `.env.local` already exists, edit it instead of overwriting it.

With both Supabase values empty, the app runs in local demo mode with fictional sample tasks and members. Changes are stored in the current browser's localStorage and are lost if that site data is cleared. This mode is useful for exploring the interface, but **it is not Supabase-backed persistence**.

Providing only one of the two required values produces a configuration error rather than silently falling back to the demo.

## Connect Supabase

### 1. Create a project

Create a free project at <https://supabase.com/> and wait for the database to become available.

### 2. Initialize the database

Open **SQL Editor → New query**, paste the contents of this file, and run it:

```text
supabase/migrations/001_initial.sql
```

This transactional initial migration is intended for **a new project and must be run only once**. Do not rerun it against existing tables with the same names. It creates the tables, constraints, indexes, RLS policies, activity triggers, and atomic `save_task` RPC. No separate manual table setup is needed.

### 3. Enable anonymous sign-in

In **Authentication → Sign In / Providers**, enable **Anonymous Sign-Ins** and save the setting. Dashboard navigation may vary slightly.

Anonymous users do not need an email or password. Once signed in, they use Supabase's `authenticated` database role.

### 4. Set the public environment variables

Find the project URL and public **Publishable key** in Supabase's **Connect / Project Settings → API Keys**. A legacy public `anon` key is also supported.

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
```

- Never use a `service_role` key, an `sb_secret_...` key, a database password, or a connection string here.
- `NEXT_PUBLIC_` values are included in browser JavaScript. The public key identifies the project; **RLS must enforce access control**.
- `.env.local` is ignored by Git. `.env.example` contains only an empty configuration template.
- Restart the development server after changing environment variables. Deployment changes require a new build.

After restarting with `npm run dev`, the status indicator should show **Saved to Supabase**. A new guest starts with an empty cloud board. **Local demo records are never uploaded automatically.**

## Verify persistence and guest isolation

1. Create a task in a normal browser window and refresh the page to confirm it persists.
2. In Supabase's Table Editor, confirm that the task has been stored with the anonymous user's `user_id`.
3. Open the app in a private browsing session or a different browser. This creates a separate guest, who should not see the first guest's tasks.
4. Create a task in the second session, then refresh the first session. Neither guest should see the other's tasks.
5. Check that status changes, edits, comments, labels, and multiple assignees survive a refresh.

The automated database tests validate SQL, triggers, RLS, cross-owner access restrictions, and transaction rollback in an isolated PostgreSQL / PGlite instance. These tests do not replace integration checks against your own hosted Supabase Auth and PostgREST configuration.

Guest identity belongs to the current browser session's persisted authentication state. Clearing site storage, switching devices, or losing that session creates a different guest. Existing records are not automatically transferred, and there is no email-based recovery flow.

## Tests and production build

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

The test suite includes **32 unit / database tests** and **9 browser scenarios**. Browser coverage includes the task lifecycle, reload persistence, mouse / keyboard / touch dragging, comments and activity, search and filters, member and label management, phone layouts, unsaved changes, empty / damaged local storage, and automated WCAG A/AA-tagged checks of the board and task editor.

Install Playwright's Chromium browser and run the browser suite:

```bash
npx playwright install chromium
npm run test:e2e
```

If desktop Google Chrome is already installed, macOS / Linux users can instead run:

```bash
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
```

**Browser scenarios require local demo mode.** Use a separate checkout with both Supabase values empty, or clear both values and restart the local server before running the suite. Do not run these demo scenarios against personal cloud data.

Screenshots and failure traces are written to the Git-ignored `test-results/` directory.

## Deploy to Vercel

The live application is available at <https://forma-sigma-beryl.vercel.app/>.

To deploy your own instance on Vercel's free tier:

1. Import this repository into Vercel and select **Next.js**. Leave Root Directory at its default when the repository root contains `package.json`.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the deployment environment.
3. Deploy, then repeat the persistence and isolation checks using the production URL.
4. Verify that the production domain opens in a private browser window without requiring a Vercel login.
5. Rebuild and redeploy whenever public environment variables change; changing settings alone does not update an existing browser bundle.

There is no separate Go / Express service, backend service key, paid API, or additional application server to configure. The Next.js app uses the browser Supabase SDK for Auth and PostgREST access.

Keep credentials, original assessment PDFs, and private submission documents out of the repository.

A longer-lived public deployment should add CAPTCHA with a matching frontend flow, rate limiting, abuse controls, and anonymous-account cleanup. **Do not enable mandatory CAPTCHA in Supabase without implementing the corresponding frontend verification, or anonymous sign-in will fail.**

## Data model and security

| Table            | Purpose                                                               |
| ---------------- | --------------------------------------------------------------------- |
| `tasks`          | Title, description, status, priority, due date, timestamps, and owner |
| `members`        | Guest-owned team member names and colors                              |
| `labels`         | Guest-owned custom label names and colors                             |
| `task_assignees` | Many-to-many relationships between tasks and members                  |
| `task_labels`    | Many-to-many relationships between tasks and labels                   |
| `comments`       | Task comments, timestamps, and owner                                  |
| `activity_log`   | Task activity generated by database triggers                          |

- Every table has RLS enabled. Authenticated guests can access only records where `auth.uid() = user_id`.
- `WITH CHECK` policies prevent owner spoofing or transfer. Unauthenticated users with the `anon` role have no table access.
- **Composite foreign keys** on `(entity_id, user_id)` ensure that associated tasks, members, labels, and comments belong to the same owner. Client-side filtering alone is not used as a security boundary.
- `save_task` runs with the caller's permissions and saves task fields, assignees, and labels in one transaction. A failed association rolls back the entire save.
- Activity records are read-only to clients. Trigger-only functions use a fixed `search_path`, and clients cannot execute them directly.
- Deleting a task cascades to its comments, activity, assignments, and label associations. Removing a member or label does not delete tasks.
- The complete schema, policies, grants, and functions are included in the initial migration.

## Project structure

```text
src/app/                         Next.js page, layout, and global styles
src/components/workspace.tsx     Workspace navigation, filters, and panel state
src/components/board.tsx         Drag-and-drop board and list view
src/components/task-dialog.tsx   Task editor, comments, and activity panel
src/components/manage-dialog.tsx Member and label management
src/components/ui.tsx            Dialogs, avatars, and shared UI
src/lib/types.ts                 Domain models
src/lib/repository.ts            Demo and Supabase storage implementations
src/lib/use-board.ts             Loading, serialized mutations, and error recovery
src/lib/utils.ts                 Validation, filtering, and local-date helpers
supabase/migrations/             Complete database migration
tests/                          Unit, storage, PostgreSQL security, and browser tests
```

## Design decisions and tradeoffs

- A restrained neutral palette and green accent support the hierarchy; typography, spacing, status icons, and text carry meaning alongside color. Narrow phone layouts stack columns instead of requiring horizontal page scrolling.
- Search, filtering, and summaries operate within the current workspace. Status is saved on drop rather than through WebSocket-based collaboration. Use Refresh to retrieve changes from another window.
- Cross-column dragging is supported; custom ordering within a column is not. Touch and keyboard users can also update status through the task editor.
- Reads are designed for a small workspace and do not use server-side pagination. Supabase's default row limits constrain larger task, comment, and activity lists.
- Task fields and their associations are saved atomically. Comments are saved separately; posting a comment does not save unsubmitted task edits.
- Due dates use PostgreSQL `date` and local calendar comparisons to avoid UTC day shifts. Comments and activity use `timestamptz`.
- Recoverable accounts, shared-workspace permissions, real-time subscriptions, pagination, same-column ordering, and attachments are possible future improvements, not capabilities claimed by this version.
