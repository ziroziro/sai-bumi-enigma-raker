-- Migration: Dept Head silhouette cards & per-group selection with draft-order quota
-- First 3 groups to submit choose 2 cards; the 4th (last) group chooses 1 card.
-- Each of the 9 cards can only be claimed by one group.

begin;

create table if not exists public.dept_head_cards (
  event_slug text not null,
  card_id integer not null check (card_id between 1 and 9),
  code text not null check (length(btrim(code)) between 1 and 40),
  title text not null check (length(btrim(title)) between 1 and 120),
  role_hint text not null check (length(btrim(role_hint)) between 1 and 120),
  description text not null check (length(btrim(description)) between 1 and 1000),
  silhouette_variant text not null check (
    silhouette_variant in ('fedora', 'trench', 'monocle', 'cloak', 'architect', 'strategist', 'sentinel', 'scholar', 'enigma')
  ),
  custom_image_url text,
  updated_at timestamptz not null default now(),
  primary key (event_slug, card_id)
);

create table if not exists public.dept_head_selections (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  group_number integer not null check (group_number between 1 and 4),
  selection_order integer not null check (selection_order between 1 and 4),
  required_count integer not null check (required_count in (1, 2)),
  card_ids integer[] not null check (cardinality(card_ids) = required_count),
  submitted_at timestamptz not null default now(),
  unique (event_slug, group_number),
  unique (event_slug, selection_order)
);

create table if not exists public.dept_head_claimed_cards (
  event_slug text not null,
  card_id integer not null check (card_id between 1 and 9),
  group_number integer not null check (group_number between 1 and 4),
  primary key (event_slug, card_id)
);

alter table public.dept_head_cards enable row level security;
alter table public.dept_head_selections enable row level security;
alter table public.dept_head_claimed_cards enable row level security;

revoke all on table public.dept_head_cards from public, anon, authenticated;
revoke all on table public.dept_head_selections from public, anon, authenticated;
revoke all on table public.dept_head_claimed_cards from public, anon, authenticated;

grant select, insert, update, delete on table public.dept_head_cards to service_role;
grant select, insert, update, delete on table public.dept_head_selections to service_role;
grant select, insert, update, delete on table public.dept_head_claimed_cards to service_role;

-- 1. RPC: get_dept_head_snapshot
create or replace function public.get_dept_head_snapshot(
  p_event_slug text
) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with cards_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', c.card_id,
          'code', c.code,
          'title', c.title,
          'roleHint', c.role_hint,
          'description', c.description,
          'silhouetteVariant', c.silhouette_variant,
          'customImageUrl', c.custom_image_url
        )
        order by c.card_id asc
      ),
      '[]'::jsonb
    ) as data
    from public.dept_head_cards c
    where c.event_slug = p_event_slug
  ),
  selections_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'groupNumber', s.group_number,
          'selectionOrder', s.selection_order,
          'requiredCount', s.required_count,
          'cardIds', to_jsonb(s.card_ids),
          'submittedAt', to_char(s.submitted_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        )
        order by s.selection_order asc
      ),
      '[]'::jsonb
    ) as data
    from public.dept_head_selections s
    where s.event_slug = p_event_slug
  )
  select jsonb_build_object(
    'cards', (select data from cards_json),
    'selections', (select data from selections_json)
  );
$$;

-- 2. RPC: submit_dept_head_selection (atomic & concurrency-safe)
create or replace function public.submit_dept_head_selection(
  p_event_slug text,
  p_group_number integer,
  p_card_ids integer[]
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submitted_count integer;
  v_next_order integer;
  v_required_count integer;
  v_cid integer;
  v_selection public.dept_head_selections%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('dept_head:' || p_event_slug));

  if p_group_number is null or p_group_number not between 1 and 4 then
    raise exception using errcode = 'P1001', message = 'INVALID_GROUP';
  end if;

  if exists (
    select 1 from public.dept_head_selections
    where event_slug = p_event_slug and group_number = p_group_number
  ) then
    raise exception using errcode = 'P1002', message = 'GROUP_ALREADY_SUBMITTED';
  end if;

  select count(*) into v_submitted_count
  from public.dept_head_selections
  where event_slug = p_event_slug;

  v_next_order := v_submitted_count + 1;
  if v_next_order > 4 then
    raise exception using errcode = 'P1002', message = 'ALL_GROUPS_SUBMITTED';
  end if;

  -- First 3 groups select 2; the 4th (last) group selects 1
  v_required_count := case when v_submitted_count >= 3 then 1 else 2 end;

  if p_card_ids is null
     or cardinality(p_card_ids) <> v_required_count
     or (select count(distinct x) from unnest(p_card_ids) x) <> v_required_count
     or exists (select 1 from unnest(p_card_ids) x where x is null or x not between 1 and 9) then
    raise exception using errcode = 'P1001', message = 'INVALID_CARD_COUNT';
  end if;

  if exists (
    select 1 from public.dept_head_claimed_cards
    where event_slug = p_event_slug and card_id = any(p_card_ids)
  ) then
    raise exception using errcode = 'P1002', message = 'CARD_ALREADY_TAKEN';
  end if;

  insert into public.dept_head_selections (
    event_slug,
    group_number,
    selection_order,
    required_count,
    card_ids
  ) values (
    p_event_slug,
    p_group_number,
    v_next_order,
    v_required_count,
    p_card_ids
  )
  returning * into v_selection;

  foreach v_cid in array p_card_ids loop
    insert into public.dept_head_claimed_cards (event_slug, card_id, group_number)
    values (p_event_slug, v_cid, p_group_number);
  end loop;

  return jsonb_build_object(
    'id', v_selection.id,
    'groupNumber', v_selection.group_number,
    'selectionOrder', v_selection.selection_order,
    'requiredCount', v_selection.required_count,
    'cardIds', to_jsonb(v_selection.card_ids),
    'submittedAt', to_char(v_selection.submitted_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$$;

-- 3. RPC: upsert_dept_head_card (admin customization)
create or replace function public.upsert_dept_head_card(
  p_event_slug text,
  p_card_id integer,
  p_code text,
  p_title text,
  p_role_hint text,
  p_description text,
  p_silhouette_variant text,
  p_custom_image_url text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.dept_head_cards%rowtype;
begin
  insert into public.dept_head_cards (
    event_slug, card_id, code, title, role_hint, description, silhouette_variant, custom_image_url, updated_at
  ) values (
    p_event_slug,
    p_card_id,
    btrim(p_code),
    btrim(p_title),
    btrim(p_role_hint),
    btrim(p_description),
    p_silhouette_variant,
    nullif(btrim(coalesce(p_custom_image_url, '')), ''),
    now()
  )
  on conflict (event_slug, card_id) do update set
    code = excluded.code,
    title = excluded.title,
    role_hint = excluded.role_hint,
    description = excluded.description,
    silhouette_variant = excluded.silhouette_variant,
    custom_image_url = excluded.custom_image_url,
    updated_at = excluded.updated_at
  returning * into v_card;

  return jsonb_build_object(
    'id', v_card.card_id,
    'code', v_card.code,
    'title', v_card.title,
    'roleHint', v_card.role_hint,
    'description', v_card.description,
    'silhouetteVariant', v_card.silhouette_variant,
    'customImageUrl', v_card.custom_image_url
  );
end;
$$;

-- 4. RPC: delete_dept_head_selection (resets one group and re-packs selection_order cleanly)
create or replace function public.delete_dept_head_selection(
  p_event_slug text,
  p_group_number integer
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('dept_head:' || p_event_slug));

  delete from public.dept_head_claimed_cards
  where event_slug = p_event_slug and group_number = p_group_number;

  delete from public.dept_head_selections
  where event_slug = p_event_slug and group_number = p_group_number;

  -- Re-pack remaining selection_order to 1..N without violating unique constraint
  with ranked as (
    select id, row_number() over (order by selection_order asc, submitted_at asc) as new_order
    from public.dept_head_selections
    where event_slug = p_event_slug
  )
  update public.dept_head_selections s
  set selection_order = -r.new_order
  from ranked r
  where s.id = r.id;

  update public.dept_head_selections
  set selection_order = -selection_order
  where event_slug = p_event_slug and selection_order < 0;
end;
$$;

-- 5. RPC: reset_all_dept_head_selections
create or replace function public.reset_all_dept_head_selections(
  p_event_slug text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('dept_head:' || p_event_slug));

  delete from public.dept_head_claimed_cards where event_slug = p_event_slug;
  delete from public.dept_head_selections where event_slug = p_event_slug;
end;
$$;

revoke execute on function
  public.get_dept_head_snapshot(text),
  public.submit_dept_head_selection(text, integer, integer[]),
  public.upsert_dept_head_card(text, integer, text, text, text, text, text, text),
  public.delete_dept_head_selection(text, integer),
  public.reset_all_dept_head_selections(text)
from public, anon, authenticated;

grant execute on function
  public.get_dept_head_snapshot(text),
  public.submit_dept_head_selection(text, integer, integer[]),
  public.upsert_dept_head_card(text, integer, text, text, text, text, text, text),
  public.delete_dept_head_selection(text, integer),
  public.reset_all_dept_head_selections(text)
to service_role;

commit;
