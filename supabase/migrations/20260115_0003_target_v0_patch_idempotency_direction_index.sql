-- Lumira Target v0 — Patch
-- Migration: 20260115_0002_target_v0_patch_idempotency_direction_index.sql

begin;

-- ─────────────────────────────────────────────────────────────
-- 1) domain_jobs idempotency: scope to (user_id, idempotency_key)
-- ─────────────────────────────────────────────────────────────
do $$
begin
  -- Drop old unique constraint if it exists (name may vary in some DBs)
  if exists (
    select 1
    from pg_constraint
    where conname = 'uq_domain_jobs_idempotency'
      and conrelid = 'public.domain_jobs'::regclass
  ) then
    alter table public.domain_jobs drop constraint uq_domain_jobs_idempotency;
  end if;
end $$;

alter table public.domain_jobs
  add constraint uq_domain_jobs_user_idempotency unique (user_id, idempotency_key);

-- ─────────────────────────────────────────────────────────────
-- 2) session_directions: record chosen direction(s) per session
-- ─────────────────────────────────────────────────────────────
create table if not exists public.session_directions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  direction_slug text not null,
  source text not null default 'frame' check (source in ('frame','direction_modal','work','import','system')),
  chosen_at timestamptz not null default now()
);

create index if not exists idx_session_directions_session_chosen
on public.session_directions (session_id, chosen_at desc);

create index if not exists idx_session_directions_user_chosen
on public.session_directions (user_id, chosen_at desc);

-- Minimal: avoid duplicates if the user clicks twice fast
create unique index if not exists uq_session_directions_session_slug
on public.session_directions (session_id, direction_slug);

-- RLS + policies
alter table public.session_directions enable row level security;

drop policy if exists "read_own_session_directions" on public.session_directions;
create policy "read_own_session_directions" on public.session_directions
for select using (user_id = auth.uid());

drop policy if exists "write_own_session_directions" on public.session_directions;
create policy "write_own_session_directions" on public.session_directions
for insert with check (user_id = auth.uid());

drop policy if exists "update_own_session_directions" on public.session_directions;
create policy "update_own_session_directions" on public.session_directions
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "delete_own_session_directions" on public.session_directions;
create policy "delete_own_session_directions" on public.session_directions
for delete using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 3) session_index_versions: place for anchor_summary + embedding + search helpers
-- ─────────────────────────────────────────────────────────────
create table if not exists public.session_index_versions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  version int not null,
  input_hash text not null,

  -- human-readable index payload (e.g. anchor_summary, keywords, etc.)
  payload jsonb not null default '{}'::jsonb,

  -- embedding storage (v0-safe): store as float array
  embedding_model text,
  embedding real[],

  created_at timestamptz not null default now(),

  constraint uq_session_index_versions_session_version unique (session_id, version),
  constraint uq_session_index_versions_session_input_hash unique (session_id, input_hash)
);

create index if not exists idx_session_index_versions_session_created
on public.session_index_versions (session_id, created_at desc);

-- Optional: if you store keywords as payload->'terms', JSONB GIN can help
create index if not exists idx_session_index_versions_payload_gin
on public.session_index_versions using gin (payload jsonb_path_ops);

create table if not exists public.session_index_latest (
  session_id uuid primary key references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_index_version_id uuid not null references public.session_index_versions(id) on delete cascade,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_session_index_latest_updated_at on public.session_index_latest;
create trigger trg_session_index_latest_updated_at
before update on public.session_index_latest
for each row execute function public.set_updated_at();

create index if not exists idx_session_index_latest_user
on public.session_index_latest (user_id);

-- RLS + policies
alter table public.session_index_versions enable row level security;
alter table public.session_index_latest enable row level security;

drop policy if exists "read_own_session_index_versions" on public.session_index_versions;
create policy "read_own_session_index_versions" on public.session_index_versions
for select using (user_id = auth.uid());

drop policy if exists "write_own_session_index_versions" on public.session_index_versions;
create policy "write_own_session_index_versions" on public.session_index_versions
for insert with check (user_id = auth.uid());

drop policy if exists "read_own_session_index_latest" on public.session_index_latest;
create policy "read_own_session_index_latest" on public.session_index_latest
for select using (user_id = auth.uid());

drop policy if exists "write_own_session_index_latest" on public.session_index_latest;
create policy "write_own_session_index_latest" on public.session_index_latest
for insert with check (user_id = auth.uid());

drop policy if exists "update_own_session_index_latest" on public.session_index_latest;
create policy "update_own_session_index_latest" on public.session_index_latest
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

commit;
