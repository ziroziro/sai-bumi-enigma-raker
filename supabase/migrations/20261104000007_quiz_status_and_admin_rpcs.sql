-- Migration: quiz status persistence and admin delete/reset RPCs
-- Completes Supabase database backing for quiz status (open/close) and admin deletion/reset actions.

begin;

-- 1. Table for persistent quiz open/closed state per event
create table if not exists public.quiz_settings (
  event_slug text primary key,
  is_open boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.quiz_settings enable row level security;

revoke all on table public.quiz_settings from public, anon, authenticated;
grant select, insert, update, delete on table public.quiz_settings to service_role;

-- 2. RPC: get_quiz_system_status
create or replace function public.get_quiz_system_status(
  p_event_slug text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.quiz_settings%rowtype;
begin
  select * into v_row
    from public.quiz_settings
   where event_slug = p_event_slug;

  if not found then
    return jsonb_build_object(
      'isOpen', false,
      'updatedAt', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );
  end if;

  return jsonb_build_object(
    'isOpen', v_row.is_open,
    'updatedAt', to_char(v_row.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$$;

-- 3. RPC: set_quiz_system_status
create or replace function public.set_quiz_system_status(
  p_event_slug text,
  p_is_open boolean
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.quiz_settings%rowtype;
begin
  insert into public.quiz_settings (event_slug, is_open, updated_at)
  values (p_event_slug, coalesce(p_is_open, false), now())
  on conflict (event_slug) do update set
    is_open = excluded.is_open,
    updated_at = excluded.updated_at
  returning * into v_row;

  return jsonb_build_object(
    'isOpen', v_row.is_open,
    'updatedAt', to_char(v_row.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$$;

-- 4. RPC: delete_quiz_submission (deletes by submission id or participant_id within event)
create or replace function public.delete_quiz_submission(
  p_event_slug text,
  p_target_id text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
begin
  select id into v_event_id
    from public.events
   where slug = p_event_slug;

  if not found then
    return;
  end if;

  delete from public.quiz_submissions
   where event_id = v_event_id
     and (id::text = p_target_id or participant_id::text = p_target_id);
end;
$$;

-- 5. RPC: reset_all_quiz_submissions (clears all quiz submissions for an event)
create or replace function public.reset_all_quiz_submissions(
  p_event_slug text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
begin
  select id into v_event_id
    from public.events
   where slug = p_event_slug;

  if not found then
    return;
  end if;

  delete from public.quiz_submissions
   where event_id = v_event_id;
end;
$$;

revoke execute on function
  public.get_quiz_system_status(text),
  public.set_quiz_system_status(text, boolean),
  public.delete_quiz_submission(text, text),
  public.reset_all_quiz_submissions(text)
from public, anon, authenticated;

grant execute on function
  public.get_quiz_system_status(text),
  public.set_quiz_system_status(text, boolean),
  public.delete_quiz_submission(text, text),
  public.reset_all_quiz_submissions(text)
to service_role;

commit;

