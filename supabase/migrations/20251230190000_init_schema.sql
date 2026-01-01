-- supabase/migrations/20251230190000_init_schema.sql

-- 1) Extensions
create extension if not exists pgcrypto;

-- 2) Common updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 4.1 dream_sessions
create table if not exists public.dream_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  raw_dream_text text not null,
  raw_dream_redacted text null,

  ai_framing_text text null,
  ai_framing_audit jsonb null,

  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  deleted_at timestamptz null,

  constraint dream_sessions_status_check
    check (status in ('draft','framed','complete','archived'))
);

create index if not exists dream_sessions_user_created_idx
  on public.dream_sessions (user_id, created_at desc);

create index if not exists dream_sessions_user_updated_idx
  on public.dream_sessions (user_id, updated_at desc);

create index if not exists dream_sessions_user_status_idx
  on public.dream_sessions (user_id, status);

create trigger trg_dream_sessions_updated_at
before update on public.dream_sessions
for each row execute function public.set_updated_at();


-- 4.2 morning_direction_choices
create table if not exists public.morning_direction_choices (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,

  direction_slug text not null,

  created_at timestamptz not null default now()
);

create index if not exists morning_direction_choices_session_idx
  on public.morning_direction_choices (session_id, created_at);


-- 4.3 work_blocks
create table if not exists public.work_blocks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  block_type text not null,
  content jsonb not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint work_blocks_block_type_check
    check (block_type in ('free_journal','dream_analysis','reflection','ai'))
);

create index if not exists work_blocks_session_idx
  on public.work_blocks (session_id, created_at);

create index if not exists work_blocks_user_idx
  on public.work_blocks (user_id, created_at);

create trigger trg_work_blocks_updated_at
before update on public.work_blocks
for each row execute function public.set_updated_at();


-- 4.4 evening_card_usage_log
create table if not exists public.evening_card_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  card_slug text not null,
  version text not null,

  created_at timestamptz not null default now()
);

create index if not exists evening_card_usage_log_user_created_idx
  on public.evening_card_usage_log (user_id, created_at desc);

create index if not exists evening_card_usage_log_card_created_idx
  on public.evening_card_usage_log (card_slug, created_at desc);


-- 5.1 direction_catalog (UPDATED: tags + sort_order + updated_at)
create table if not exists public.direction_catalog (
  slug text primary key,
  version text not null default 'v1',
  title text not null,
  description text not null,

  -- flexible payload for AI + UX
  content jsonb not null default '{}'::jsonb,

  -- filtering + ordering (explicit columns)
  tags text[] not null default '{}'::text[],
  sort_order int not null default 1000,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists direction_catalog_active_idx
  on public.direction_catalog (is_active);

create index if not exists direction_catalog_tags_gin
  on public.direction_catalog using gin (tags);

create index if not exists direction_catalog_sort_order_idx
  on public.direction_catalog (sort_order);

create trigger trg_direction_catalog_updated_at
before update on public.direction_catalog
for each row execute function public.set_updated_at();


-- 5.2 evening_card_catalog (UPDATED: tags + sort_order + level + updated_at)
create table if not exists public.evening_card_catalog (
  slug text primary key,
  version text not null default 'v3',
  title text not null,

  -- flexible payload. Convention:
  -- {
  --   type:'evening_card',
  --   goal_md:'...',
  --   steps:[{context_md:'Gyakorlat', question:'...'}, ...],
  --   ...
  -- }
  content jsonb not null default '{}'::jsonb,

  -- filtering + ordering (explicit columns)
  tags text[] not null default '{}'::text[],
  sort_order int not null default 1000,
  level int null,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.evening_card_catalog
  drop constraint if exists evening_card_level_check;

alter table public.evening_card_catalog
  add constraint evening_card_level_check
  check (level is null or level between 1 and 3);

create index if not exists evening_card_catalog_active_idx
  on public.evening_card_catalog (is_active);

create index if not exists evening_card_catalog_tags_gin
  on public.evening_card_catalog using gin (tags);

create index if not exists evening_card_catalog_sort_order_idx
  on public.evening_card_catalog (sort_order);

create index if not exists evening_card_catalog_level_idx
  on public.evening_card_catalog (level);

create trigger trg_evening_card_catalog_updated_at
before update on public.evening_card_catalog
for each row execute function public.set_updated_at();

-- 2026xxxxxx_direction_catalog_add_tags_sort.sql
alter table public.direction_catalog
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists sort_order int not null default 1000;

create index if not exists direction_catalog_tags_gin
  on public.direction_catalog using gin (tags);

create index if not exists direction_catalog_sort_order_idx
  on public.direction_catalog (sort_order);
