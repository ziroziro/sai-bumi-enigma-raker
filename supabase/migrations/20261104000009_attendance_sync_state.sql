-- Migration: Authoritative attendance sync metadata (reset timestamp & deleted NIKs)
-- Ensures all serverless instances share the same reset/delete state in PostgreSQL.

create table if not exists public.attendance_sync_state (
  event_slug text primary key,
  last_reset_at timestamptz,
  deleted_niks text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.attendance_sync_state enable row level security;

revoke all on table public.attendance_sync_state from public, anon, authenticated;
grant select, insert, update, delete on table public.attendance_sync_state to service_role;
