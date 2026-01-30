begin;

create table if not exists public.dream_map_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  version int not null,
  input_hash text not null,
  algo_version text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint uq_dream_map_versions_user_session_input_algo unique (user_id, session_id, input_hash, algo_version)
);

create index if not exists idx_dream_map_versions_user_session_created
  on public.dream_map_versions (user_id, session_id, created_at desc);

create table if not exists public.dream_map_latest (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  dream_map_version_id uuid not null references public.dream_map_versions(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (user_id, session_id)
);

drop trigger if exists trg_dream_map_latest_updated_at on public.dream_map_latest;
create trigger trg_dream_map_latest_updated_at
before update on public.dream_map_latest
for each row execute function public.set_updated_at();

create index if not exists idx_dream_map_latest_user
  on public.dream_map_latest (user_id);

alter table public.dream_map_versions enable row level security;
alter table public.dream_map_latest enable row level security;

drop policy if exists "read_own_dream_map_versions" on public.dream_map_versions;
create policy "read_own_dream_map_versions" on public.dream_map_versions
for select using (user_id = auth.uid());

drop policy if exists "write_own_dream_map_versions" on public.dream_map_versions;
create policy "write_own_dream_map_versions" on public.dream_map_versions
for insert with check (user_id = auth.uid());

drop policy if exists "read_own_dream_map_latest" on public.dream_map_latest;
create policy "read_own_dream_map_latest" on public.dream_map_latest
for select using (user_id = auth.uid());

drop policy if exists "write_own_dream_map_latest" on public.dream_map_latest;
create policy "write_own_dream_map_latest" on public.dream_map_latest
for insert with check (user_id = auth.uid());

drop policy if exists "update_own_dream_map_latest" on public.dream_map_latest;
create policy "update_own_dream_map_latest" on public.dream_map_latest
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

commit;
