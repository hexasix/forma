-- Forma: run ONCE in the SQL Editor of a new Supabase project.
-- Also enable Authentication > Sign In / Providers > Anonymous Sign-Ins.
begin;

create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 60),
  color text not null default '#7C6BB5' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create table public.labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 24),
  color text not null default '#7C6BB5' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create unique index labels_owner_name on public.labels(user_id, lower(name));
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  description text not null default '' check (length(description) <= 10000),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create table public.task_assignees (
  task_id uuid not null,
  member_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  primary key (task_id, member_id),
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade,
  foreign key (member_id, user_id) references public.members(id, user_id) on delete cascade
);
create table public.task_labels (
  task_id uuid not null,
  label_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  primary key (task_id, label_id),
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade,
  foreign key (label_id, user_id) references public.labels(id, user_id) on delete cascade
);
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id uuid not null,
  body text not null check (length(btrim(body)) between 1 and 3000),
  created_at timestamptz not null default now(),
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade
);
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null,
  message text not null,
  created_at timestamptz not null default now(),
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade
);

create index tasks_owner_created on public.tasks(user_id, created_at desc);
create index members_owner on public.members(user_id);
create index labels_owner on public.labels(user_id);
create index assignees_owner on public.task_assignees(user_id);
create index assignees_member_owner on public.task_assignees(member_id, user_id);
create index task_labels_owner on public.task_labels(user_id);
create index task_labels_label_owner on public.task_labels(label_id, user_id);
create index comments_owner_task on public.comments(user_id, task_id, created_at);
create index activity_owner_task on public.activity_log(user_id, task_id, created_at);

-- Anonymous sign-in users have the authenticated DB role, not the anon role.
-- WITH CHECK also prevents changing a row's owner to a different account.
alter table public.tasks enable row level security;
alter table public.members enable row level security;
alter table public.labels enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_labels enable row level security;
alter table public.comments enable row level security;
alter table public.activity_log enable row level security;

create policy own_tasks on public.tasks for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_members on public.members for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_labels on public.labels for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_assignees on public.task_assignees for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_task_labels on public.task_labels for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_comments on public.comments for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy read_own_activity on public.activity_log for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.tasks, public.members, public.labels, public.task_assignees, public.task_labels, public.comments, public.activity_log from anon;
revoke all on public.tasks, public.members, public.labels, public.task_assignees, public.task_labels, public.comments, public.activity_log from authenticated;
grant select, insert, update, delete on public.tasks, public.members, public.labels, public.task_assignees, public.task_labels, public.comments to authenticated;
grant select on public.activity_log to authenticated;

create function public.touch_task() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger task_updated before update on public.tasks for each row execute function public.touch_task();

-- Trigger-only elevated functions: clients cannot fabricate activity records.
create function public.record_task_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  old_status text;
  new_status text;
begin
  if TG_OP = 'INSERT' then
    insert into public.activity_log(user_id, task_id, message) values (new.user_id, new.id, 'Created this task');
    return new;
  end if;
  if old.status is distinct from new.status then
    old_status := case old.status when 'todo' then 'To do' when 'in_progress' then 'In progress' when 'in_review' then 'In review' else 'Done' end;
    new_status := case new.status when 'todo' then 'To do' when 'in_progress' then 'In progress' when 'in_review' then 'In review' else 'Done' end;
    insert into public.activity_log(user_id, task_id, message) values (new.user_id, new.id, 'Moved from ' || old_status || ' → ' || new_status);
  end if;
  if old.title is distinct from new.title or old.description is distinct from new.description then
    insert into public.activity_log(user_id, task_id, message) values (new.user_id, new.id, 'Updated task details');
  end if;
  if old.priority is distinct from new.priority then
    insert into public.activity_log(user_id, task_id, message) values (new.user_id, new.id, 'Changed priority to ' || new.priority);
  end if;
  if old.due_date is distinct from new.due_date then
    insert into public.activity_log(user_id, task_id, message) values (new.user_id, new.id, coalesce('Set due date to ' || new.due_date::text, 'Removed the due date'));
  end if;
  return new;
end;
$$;
create trigger task_activity after insert or update on public.tasks for each row execute function public.record_task_activity();

create function public.record_assignment_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  tid uuid;
  uid uuid;
  mid uuid;
  member_name text;
begin
  if TG_OP = 'INSERT' then tid := new.task_id; uid := new.user_id; mid := new.member_id;
  else tid := old.task_id; uid := old.user_id; mid := old.member_id; end if;
  -- A task deletion cascades to assignments. Do not recreate activity for it.
  if exists (select 1 from public.tasks where id = tid and user_id = uid) then
    select name into member_name from public.members where id = mid and user_id = uid;
    insert into public.activity_log(user_id, task_id, message)
    values (uid, tid, (case when TG_OP = 'INSERT' then 'Assigned ' else 'Unassigned ' end) || coalesce(member_name, 'a team member'));
  end if;
  return null;
end;
$$;
create trigger assignment_activity after insert or delete on public.task_assignees for each row execute function public.record_assignment_activity();

-- One atomic transaction for task fields, labels, and multiple assignees.
-- SECURITY INVOKER preserves RLS; ownership also enforced by composite FKs.
create function public.save_task(
  p_task_id uuid, p_title text, p_description text, p_status text,
  p_priority text, p_due_date date, p_assignee_ids uuid[], p_label_ids uuid[]
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  tid uuid;
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in before saving a task'; end if;
  if p_assignee_ids is null or p_label_ids is null then raise exception 'Assignment arrays are required'; end if;
  if p_task_id is null then
    insert into public.tasks(user_id, title, description, status, priority, due_date)
    values (uid, btrim(p_title), p_description, p_status, p_priority, p_due_date) returning id into tid;
  else
    update public.tasks set title = btrim(p_title), description = p_description,
      status = p_status, priority = p_priority, due_date = p_due_date
      where id = p_task_id and user_id = uid returning id into tid;
    if tid is null then raise exception 'Task not found or not accessible'; end if;
  end if;
  delete from public.task_assignees where task_id = tid and user_id = uid and not (member_id = any(p_assignee_ids));
  insert into public.task_assignees(task_id, member_id, user_id)
    select tid, member_id, uid from (select distinct unnest(p_assignee_ids) as member_id) selected
    on conflict (task_id, member_id) do nothing;
  delete from public.task_labels where task_id = tid and user_id = uid and not (label_id = any(p_label_ids));
  insert into public.task_labels(task_id, label_id, user_id)
    select tid, label_id, uid from (select distinct unnest(p_label_ids) as label_id) selected
    on conflict (task_id, label_id) do nothing;
  return tid;
end;
$$;

revoke execute on function public.touch_task() from public, anon, authenticated;
revoke execute on function public.record_task_activity() from public, anon, authenticated;
revoke execute on function public.record_assignment_activity() from public, anon, authenticated;
revoke execute on function public.save_task(uuid, text, text, text, text, date, uuid[], uuid[]) from public, anon;
grant execute on function public.save_task(uuid, text, text, text, text, date, uuid[], uuid[]) to authenticated;
commit;
