-- Create dream_observation for PRE outputs

create table if not exists public.dream_observation (
  session_id uuid primary key references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  obs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists dream_observation_user_created_idx
  on public.dream_observation (user_id, created_at desc);

create index if not exists dream_observation_session_user_idx
  on public.dream_observation (session_id, user_id);

alter table public.dream_observation
  enable row level security;

-- SELECT
drop policy if exists "Users can select own dream observations"
  on public.dream_observation;

create policy "Users can select own dream observations"
  on public.dream_observation
  for select
  using (auth.uid() = user_id);

-- INSERT
drop policy if exists "Users can insert own dream observations"
  on public.dream_observation;

create policy "Users can insert own dream observations"
  on public.dream_observation
  for insert
  with check (auth.uid() = user_id);

-- UPDATE
drop policy if exists "Users can update own dream observations"
  on public.dream_observation;

create policy "Users can update own dream observations"
  on public.dream_observation
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);