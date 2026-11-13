-- Migration: Official attendance tracking for The Sai Bumi Enigma 2026
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null default 'the-sai-bumi-enigma-2026',
  nik text not null,
  nama text not null,
  barcode text,
  group_number integer,
  attended_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (event_slug, nik)
);

create index if not exists idx_attendance_records_event on public.attendance_records(event_slug);
create index if not exists idx_attendance_records_nik on public.attendance_records(nik);

alter table public.attendance_records enable row level security;
revoke all on public.attendance_records from public;
grant all on public.attendance_records to anon, authenticated, service_role;
