-- Allow admin (glossary allowlist) to read/write across users for backfill workflows.

create or replace function public.is_glossary_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select uid = 'ebb541e7-44c1-4eab-b3ed-986a63f14dd0'::uuid;
$$;

-- Core session + dream map tables
alter table if exists public.dream_sessions enable row level security;
drop policy if exists "admin_full_access" on public.dream_sessions;
create policy "admin_full_access" on public.dream_sessions
  for all
  using (public.is_glossary_admin(auth.uid()))
  with check (public.is_glossary_admin(auth.uid()));

alter table if exists public.dream_map_versions enable row level security;
drop policy if exists "admin_full_access" on public.dream_map_versions;
create policy "admin_full_access" on public.dream_map_versions
  for all
  using (public.is_glossary_admin(auth.uid()))
  with check (public.is_glossary_admin(auth.uid()));

alter table if exists public.dream_map_latest enable row level security;
drop policy if exists "admin_full_access" on public.dream_map_latest;
create policy "admin_full_access" on public.dream_map_latest
  for all
  using (public.is_glossary_admin(auth.uid()))
  with check (public.is_glossary_admin(auth.uid()));

-- Observation + anchor + index sources
alter table if exists public.observation_latest enable row level security;
drop policy if exists "admin_full_access" on public.observation_latest;
create policy "admin_full_access" on public.observation_latest
  for all
  using (public.is_glossary_admin(auth.uid()))
  with check (public.is_glossary_admin(auth.uid()));

alter table if exists public.observation_versions enable row level security;
drop policy if exists "admin_full_access" on public.observation_versions;
create policy "admin_full_access" on public.observation_versions
  for all
  using (public.is_glossary_admin(auth.uid()))
  with check (public.is_glossary_admin(auth.uid()));

alter table if exists public.dream_anchor_latest enable row level security;
drop policy if exists "admin_full_access" on public.dream_anchor_latest;
create policy "admin_full_access" on public.dream_anchor_latest
  for all
  using (public.is_glossary_admin(auth.uid()))
  with check (public.is_glossary_admin(auth.uid()));

alter table if exists public.dream_anchor_versions enable row level security;
drop policy if exists "admin_full_access" on public.dream_anchor_versions;
create policy "admin_full_access" on public.dream_anchor_versions
  for all
  using (public.is_glossary_admin(auth.uid()))
  with check (public.is_glossary_admin(auth.uid()));

alter table if exists public.session_index_latest enable row level security;
drop policy if exists "admin_full_access" on public.session_index_latest;
create policy "admin_full_access" on public.session_index_latest
  for all
  using (public.is_glossary_admin(auth.uid()))
  with check (public.is_glossary_admin(auth.uid()));

alter table if exists public.session_index_versions enable row level security;
drop policy if exists "admin_full_access" on public.session_index_versions;
create policy "admin_full_access" on public.session_index_versions
  for all
  using (public.is_glossary_admin(auth.uid()))
  with check (public.is_glossary_admin(auth.uid()));

-- Session content
alter table if exists public.dream_entries enable row level security;
drop policy if exists "admin_full_access" on public.dream_entries;
create policy "admin_full_access" on public.dream_entries
  for all
  using (public.is_glossary_admin(auth.uid()))
  with check (public.is_glossary_admin(auth.uid()));

alter table if exists public.dream_entry_highlights enable row level security;
drop policy if exists "admin_full_access" on public.dream_entry_highlights;
create policy "admin_full_access" on public.dream_entry_highlights
  for all
  using (public.is_glossary_admin(auth.uid()))
  with check (public.is_glossary_admin(auth.uid()));

alter table if exists public.dream_session_highlights enable row level security;
drop policy if exists "admin_full_access" on public.dream_session_highlights;
create policy "admin_full_access" on public.dream_session_highlights
  for all
  using (public.is_glossary_admin(auth.uid()))
  with check (public.is_glossary_admin(auth.uid()));

-- Glossary + archetypes
alter table if exists public.glossary_terms enable row level security;
drop policy if exists "admin_full_access" on public.glossary_terms;
create policy "admin_full_access" on public.glossary_terms
  for all
  using (public.is_glossary_admin(auth.uid()))
  with check (public.is_glossary_admin(auth.uid()));

alter table if exists public.glossary_occurrences enable row level security;
drop policy if exists "admin_full_access" on public.glossary_occurrences;
create policy "admin_full_access" on public.glossary_occurrences
  for all
  using (public.is_glossary_admin(auth.uid()))
  with check (public.is_glossary_admin(auth.uid()));

alter table if exists public.archetype_terms enable row level security;
drop policy if exists "admin_full_access" on public.archetype_terms;
create policy "admin_full_access" on public.archetype_terms
  for all
  using (public.is_glossary_admin(auth.uid()))
  with check (public.is_glossary_admin(auth.uid()));

alter table if exists public.archetype_term_queue enable row level security;
drop policy if exists "admin_full_access" on public.archetype_term_queue;
create policy "admin_full_access" on public.archetype_term_queue
  for all
  using (public.is_glossary_admin(auth.uid()))
  with check (public.is_glossary_admin(auth.uid()));

-- Admin backfill flow support tables
alter table if exists public.domain_events enable row level security;
drop policy if exists "admin_full_access" on public.domain_events;
create policy "admin_full_access" on public.domain_events
  for all
  using (public.is_glossary_admin(auth.uid()))
  with check (public.is_glossary_admin(auth.uid()));

alter table if exists public.domain_jobs enable row level security;
drop policy if exists "admin_full_access" on public.domain_jobs;
create policy "admin_full_access" on public.domain_jobs
  for all
  using (public.is_glossary_admin(auth.uid()))
  with check (public.is_glossary_admin(auth.uid()));

alter table if exists public.user_flags enable row level security;
drop policy if exists "admin_full_access" on public.user_flags;
create policy "admin_full_access" on public.user_flags
  for all
  using (public.is_glossary_admin(auth.uid()))
  with check (public.is_glossary_admin(auth.uid()));
