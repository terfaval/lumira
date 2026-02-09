begin;

create table if not exists public.dream_map_v2_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_hash text not null,
  schema_version text not null,
  algo_version text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint uq_dream_map_v2_versions_user_input_schema unique (user_id, input_hash, schema_version)
);

create index if not exists idx_dream_map_v2_versions_user_created
  on public.dream_map_v2_versions (user_id, created_at desc);

create table if not exists public.dream_map_v2_latest (
  user_id uuid not null references auth.users(id) on delete cascade,
  dream_map_v2_version_id uuid not null references public.dream_map_v2_versions(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (user_id)
);

drop trigger if exists trg_dream_map_v2_latest_updated_at on public.dream_map_v2_latest;
create trigger trg_dream_map_v2_latest_updated_at
before update on public.dream_map_v2_latest
for each row execute function public.set_updated_at();

alter table public.dream_map_v2_versions enable row level security;
alter table public.dream_map_v2_latest enable row level security;

drop policy if exists "read_own_dream_map_v2_versions" on public.dream_map_v2_versions;
create policy "read_own_dream_map_v2_versions" on public.dream_map_v2_versions
for select using (user_id = auth.uid());

drop policy if exists "write_own_dream_map_v2_versions" on public.dream_map_v2_versions;
create policy "write_own_dream_map_v2_versions" on public.dream_map_v2_versions
for insert with check (user_id = auth.uid());

drop policy if exists "read_own_dream_map_v2_latest" on public.dream_map_v2_latest;
create policy "read_own_dream_map_v2_latest" on public.dream_map_v2_latest
for select using (user_id = auth.uid());

drop policy if exists "write_own_dream_map_v2_latest" on public.dream_map_v2_latest;
create policy "write_own_dream_map_v2_latest" on public.dream_map_v2_latest
for insert with check (user_id = auth.uid());

drop policy if exists "update_own_dream_map_v2_latest" on public.dream_map_v2_latest;
create policy "update_own_dream_map_v2_latest" on public.dream_map_v2_latest
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

commit;
