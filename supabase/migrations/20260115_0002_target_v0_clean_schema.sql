-- Lumira Target v0 — Clean DB (Supabase/Postgres)
-- Migration: 20260115_0001_target_v0_clean_schema.sql
-- Notes:
-- - Append-only artefacts (versions) + *_latest tables for fast UI reads
-- - Minimal orchestration tables (events/jobs) with idempotency_key uniqueness
-- - Non-interpretive glossary (terms + occurrences + notes + candidates)
-- - Minimal RLS: user can access only own rows

begin;

-- ─────────────────────────────────────────────────────────────
-- 0) Extensions + helpers
-- ─────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 1) Core: sessions / entries / answers
-- ─────────────────────────────────────────────────────────────
create table if not exists public.dream_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  status text not null default 'draft' check (status in ('draft','submitted','closed')),
  title text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_dream_sessions_updated_at on public.dream_sessions;
create trigger trg_dream_sessions_updated_at
before update on public.dream_sessions
for each row execute function public.set_updated_at();

create index if not exists idx_dream_sessions_user_created
on public.dream_sessions (user_id, created_at desc);

create table if not exists public.dream_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  kind text not null default 'raw' check (kind in ('raw','dictation','edit','note')),
  content text not null,

  created_at timestamptz not null default now()
);

create index if not exists idx_dream_entries_session_created
on public.dream_entries (session_id, created_at asc);

create index if not exists idx_dream_entries_user_created
on public.dream_entries (user_id, created_at desc);

create table if not exists public.dream_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  work_id uuid,
  content text not null,

  created_at timestamptz not null default now()
);

create index if not exists idx_dream_answers_session_created
on public.dream_answers (session_id, created_at asc);

create index if not exists idx_dream_answers_user_created
on public.dream_answers (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 2) Artefacts (append-only versions)
-- Common pattern: version int monotonic per session (enforced by app)
-- input_hash supports idempotent writes + trace
-- ─────────────────────────────────────────────────────────────
create table if not exists public.observation_versions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  version int not null,
  input_hash text not null,
  model text,
  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint uq_observation_versions_session_version unique (session_id, version),
  constraint uq_observation_versions_session_input_hash unique (session_id, input_hash)
);

create index if not exists idx_observation_versions_session_created
on public.observation_versions (session_id, created_at desc);

create table if not exists public.anchor_versions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  version int not null,
  input_hash text not null,
  model text,
  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint uq_anchor_versions_session_version unique (session_id, version),
  constraint uq_anchor_versions_session_input_hash unique (session_id, input_hash)
);

create index if not exists idx_anchor_versions_session_created
on public.anchor_versions (session_id, created_at desc);

create table if not exists public.latent_versions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  version int not null,
  input_hash text not null,
  model text,
  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint uq_latent_versions_session_version unique (session_id, version),
  constraint uq_latent_versions_session_input_hash unique (session_id, input_hash)
);

create index if not exists idx_latent_versions_session_created
on public.latent_versions (session_id, created_at desc);

create table if not exists public.frame_versions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  version int not null,
  input_hash text not null,
  model text,
  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint uq_frame_versions_session_version unique (session_id, version),
  constraint uq_frame_versions_session_input_hash unique (session_id, input_hash)
);

create index if not exists idx_frame_versions_session_created
on public.frame_versions (session_id, created_at desc);

create table if not exists public.work_versions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  version int not null,
  input_hash text not null,
  model text,
  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint uq_work_versions_session_version unique (session_id, version),
  constraint uq_work_versions_session_input_hash unique (session_id, input_hash)
);

create index if not exists idx_work_versions_session_created
on public.work_versions (session_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 3) Latest tables (fast UI reads)
-- Each row points to the current artefact version row
-- ─────────────────────────────────────────────────────────────
create table if not exists public.observation_latest (
  session_id uuid primary key references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  observation_version_id uuid not null references public.observation_versions(id) on delete cascade,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_observation_latest_updated_at on public.observation_latest;
create trigger trg_observation_latest_updated_at
before update on public.observation_latest
for each row execute function public.set_updated_at();

create index if not exists idx_observation_latest_user
on public.observation_latest (user_id);

create table if not exists public.anchor_latest (
  session_id uuid primary key references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  anchor_version_id uuid not null references public.anchor_versions(id) on delete cascade,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_anchor_latest_updated_at on public.anchor_latest;
create trigger trg_anchor_latest_updated_at
before update on public.anchor_latest
for each row execute function public.set_updated_at();

create index if not exists idx_anchor_latest_user
on public.anchor_latest (user_id);

create table if not exists public.latent_latest (
  session_id uuid primary key references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  latent_version_id uuid not null references public.latent_versions(id) on delete cascade,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_latent_latest_updated_at on public.latent_latest;
create trigger trg_latent_latest_updated_at
before update on public.latent_latest
for each row execute function public.set_updated_at();

create index if not exists idx_latent_latest_user
on public.latent_latest (user_id);

create table if not exists public.frame_latest (
  session_id uuid primary key references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  frame_version_id uuid not null references public.frame_versions(id) on delete cascade,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_frame_latest_updated_at on public.frame_latest;
create trigger trg_frame_latest_updated_at
before update on public.frame_latest
for each row execute function public.set_updated_at();

create index if not exists idx_frame_latest_user
on public.frame_latest (user_id);

create table if not exists public.work_latest (
  session_id uuid primary key references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  work_version_id uuid not null references public.work_versions(id) on delete cascade,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_work_latest_updated_at on public.work_latest;
create trigger trg_work_latest_updated_at
before update on public.work_latest
for each row execute function public.set_updated_at();

create index if not exists idx_work_latest_user
on public.work_latest (user_id);

-- ─────────────────────────────────────────────────────────────
-- 4) Orchestration: events / jobs / material snapshots
-- ─────────────────────────────────────────────────────────────
create table if not exists public.domain_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.dream_sessions(id) on delete cascade,

  type text not null,
  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_domain_events_user_created
on public.domain_events (user_id, created_at desc);

create index if not exists idx_domain_events_session_created
on public.domain_events (session_id, created_at desc);

create table if not exists public.domain_jobs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.domain_events(id) on delete set null,

  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.dream_sessions(id) on delete cascade,

  job_type text not null,
  idempotency_key text not null,
  status text not null default 'running' check (status in ('running','success','error','skipped')),

  input_hash text,
  output_ref jsonb not null default '{}'::jsonb,
  error text,

  started_at timestamptz not null default now(),
  finished_at timestamptz,

  constraint uq_domain_jobs_idempotency unique (idempotency_key)
);

create index if not exists idx_domain_jobs_user_started
on public.domain_jobs (user_id, started_at desc);

create index if not exists idx_domain_jobs_session_started
on public.domain_jobs (session_id, started_at desc);

create table if not exists public.material_snapshots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  hash text not null,
  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint uq_material_snapshots_session_hash unique (session_id, hash)
);

create index if not exists idx_material_snapshots_user_created
on public.material_snapshots (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 5) Memory / Glossary (non-interpretive)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.glossary_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  canonical text not null,
  created_at timestamptz not null default now(),

  constraint uq_glossary_terms_user_canonical unique (user_id, canonical)
);

create index if not exists idx_glossary_terms_user_created
on public.glossary_terms (user_id, created_at desc);

create table if not exists public.glossary_occurrences (
  term_id uuid not null references public.glossary_terms(id) on delete cascade,
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  source text not null default 'observation' check (source in ('observation','user_note','import')),
  created_at timestamptz not null default now(),

  primary key (term_id, session_id)
);

create index if not exists idx_glossary_occurrences_user_created
on public.glossary_occurrences (user_id, created_at desc);

create index if not exists idx_glossary_occurrences_session
on public.glossary_occurrences (session_id);

create table if not exists public.glossary_notes (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.glossary_terms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_glossary_notes_term_created
on public.glossary_notes (term_id, created_at desc);

create table if not exists public.term_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  term text not null,
  count int not null default 0,
  last_seen_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_term_candidates_user_term unique (user_id, term)
);

drop trigger if exists trg_term_candidates_updated_at on public.term_candidates;
create trigger trg_term_candidates_updated_at
before update on public.term_candidates
for each row execute function public.set_updated_at();

create index if not exists idx_term_candidates_user_count
on public.term_candidates (user_id, count desc);

-- ─────────────────────────────────────────────────────────────
-- 6) Preferences / personalization (minimal)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.user_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,

  tone text,
  depth_level int not null default 2 check (depth_level between 0 and 5),
  pace text not null default 'normal' check (pace in ('slow','normal','fast')),
  direction_bias jsonb not null default '{}'::jsonb,

  updated_at timestamptz not null default now()
);

drop trigger if exists trg_user_prefs_updated_at on public.user_prefs;
create trigger trg_user_prefs_updated_at
before update on public.user_prefs
for each row execute function public.set_updated_at();

create table if not exists public.user_behavior_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),

  primary key (user_id, metric)
);

drop trigger if exists trg_user_behavior_stats_updated_at on public.user_behavior_stats;
create trigger trg_user_behavior_stats_updated_at
before update on public.user_behavior_stats
for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 7) RLS (minimal, consistent)
-- ─────────────────────────────────────────────────────────────
alter table public.dream_sessions enable row level security;
alter table public.dream_entries enable row level security;
alter table public.dream_answers enable row level security;

alter table public.observation_versions enable row level security;
alter table public.anchor_versions enable row level security;
alter table public.latent_versions enable row level security;
alter table public.frame_versions enable row level security;
alter table public.work_versions enable row level security;

alter table public.observation_latest enable row level security;
alter table public.anchor_latest enable row level security;
alter table public.latent_latest enable row level security;
alter table public.frame_latest enable row level security;
alter table public.work_latest enable row level security;

alter table public.domain_events enable row level security;
alter table public.domain_jobs enable row level security;
alter table public.material_snapshots enable row level security;

alter table public.glossary_terms enable row level security;
alter table public.glossary_occurrences enable row level security;
alter table public.glossary_notes enable row level security;
alter table public.term_candidates enable row level security;

alter table public.user_prefs enable row level security;
alter table public.user_behavior_stats enable row level security;

-- Helper macro pattern: user owns row via user_id = auth.uid()
-- Sessions
drop policy if exists "read_own_sessions" on public.dream_sessions;
create policy "read_own_sessions" on public.dream_sessions
for select using (user_id = auth.uid());

drop policy if exists "write_own_sessions" on public.dream_sessions;
create policy "write_own_sessions" on public.dream_sessions
for insert with check (user_id = auth.uid());

drop policy if exists "update_own_sessions" on public.dream_sessions;
create policy "update_own_sessions" on public.dream_sessions
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Entries
drop policy if exists "read_own_entries" on public.dream_entries;
create policy "read_own_entries" on public.dream_entries
for select using (user_id = auth.uid());

drop policy if exists "write_own_entries" on public.dream_entries;
create policy "write_own_entries" on public.dream_entries
for insert with check (user_id = auth.uid());

-- Answers
drop policy if exists "read_own_answers" on public.dream_answers;
create policy "read_own_answers" on public.dream_answers
for select using (user_id = auth.uid());

drop policy if exists "write_own_answers" on public.dream_answers;
create policy "write_own_answers" on public.dream_answers
for insert with check (user_id = auth.uid());

-- Artefact versions (select/insert only; updates not needed for append-only)
do $$
declare t text;
begin
  foreach t in array array[
    'observation_versions','anchor_versions','latent_versions','frame_versions','work_versions'
  ]
  loop
    execute format('drop policy if exists "read_own_%1$s" on public.%1$s;', t);
    execute format('create policy "read_own_%1$s" on public.%1$s for select using (user_id = auth.uid());', t);

    execute format('drop policy if exists "write_own_%1$s" on public.%1$s;', t);
    execute format('create policy "write_own_%1$s" on public.%1$s for insert with check (user_id = auth.uid());', t);
  end loop;
end $$;

-- Latest tables (select + upsert/update allowed)
do $$
declare t text;
begin
  foreach t in array array[
    'observation_latest','anchor_latest','latent_latest','frame_latest','work_latest'
  ]
  loop
    execute format('drop policy if exists "read_own_%1$s" on public.%1$s;', t);
    execute format('create policy "read_own_%1$s" on public.%1$s for select using (user_id = auth.uid());', t);

    execute format('drop policy if exists "write_own_%1$s" on public.%1$s;', t);
    execute format('create policy "write_own_%1$s" on public.%1$s for insert with check (user_id = auth.uid());', t);

    execute format('drop policy if exists "update_own_%1$s" on public.%1$s;', t);
    execute format('create policy "update_own_%1$s" on public.%1$s for update using (user_id = auth.uid()) with check (user_id = auth.uid());', t);
  end loop;
end $$;

-- Orchestration tables
do $$
declare t text;
begin
  foreach t in array array['domain_events','domain_jobs','material_snapshots']
  loop
    execute format('drop policy if exists "read_own_%1$s" on public.%1$s;', t);
    execute format('create policy "read_own_%1$s" on public.%1$s for select using (user_id = auth.uid());', t);

    execute format('drop policy if exists "write_own_%1$s" on public.%1$s;', t);
    execute format('create policy "write_own_%1$s" on public.%1$s for insert with check (user_id = auth.uid());', t);

    execute format('drop policy if exists "update_own_%1$s" on public.%1$s;', t);
    execute format('create policy "update_own_%1$s" on public.%1$s for update using (user_id = auth.uid()) with check (user_id = auth.uid());', t);
  end loop;
end $$;

-- Glossary tables
do $$
declare t text;
begin
  foreach t in array array['glossary_terms','glossary_occurrences','glossary_notes','term_candidates']
  loop
    execute format('drop policy if exists "read_own_%1$s" on public.%1$s;', t);
    execute format('create policy "read_own_%1$s" on public.%1$s for select using (user_id = auth.uid());', t);

    execute format('drop policy if exists "write_own_%1$s" on public.%1$s;', t);
    execute format('create policy "write_own_%1$s" on public.%1$s for insert with check (user_id = auth.uid());', t);

    execute format('drop policy if exists "update_own_%1$s" on public.%1$s;', t);
    execute format('create policy "update_own_%1$s" on public.%1$s for update using (user_id = auth.uid()) with check (user_id = auth.uid());', t);
  end loop;
end $$;

-- Prefs tables
do $$
declare t text;
begin
  foreach t in array array['user_prefs','user_behavior_stats']
  loop
    execute format('drop policy if exists "read_own_%1$s" on public.%1$s;', t);
    execute format('create policy "read_own_%1$s" on public.%1$s for select using (user_id = auth.uid());', t);

    execute format('drop policy if exists "write_own_%1$s" on public.%1$s;', t);
    execute format('create policy "write_own_%1$s" on public.%1$s for insert with check (user_id = auth.uid());', t);

    execute format('drop policy if exists "update_own_%1$s" on public.%1$s;', t);
    execute format('create policy "update_own_%1$s" on public.%1$s for update using (user_id = auth.uid()) with check (user_id = auth.uid());', t);
  end loop;
end $$;

-- Optional: allow deletes on core/user-owned tables (handy in dev)
drop policy if exists "delete_own_sessions" on public.dream_sessions;
create policy "delete_own_sessions" on public.dream_sessions
for delete using (user_id = auth.uid());

drop policy if exists "delete_own_entries" on public.dream_entries;
create policy "delete_own_entries" on public.dream_entries
for delete using (user_id = auth.uid());

drop policy if exists "delete_own_answers" on public.dream_answers;
create policy "delete_own_answers" on public.dream_answers
for delete using (user_id = auth.uid());

commit;
