-- Create new dream_observation with lifecycle support
create table public.dream_observation (
  session_id uuid primary key
    references public.dream_sessions(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  -- Latest observation payload (schema enforced in app code)
  obs jsonb not null default '{}'::jsonb,

  -- Lifecycle / state
  raw_seen_len integer not null default 0,
  answers_seen integer not null default 0,
  refresh_count integer not null default 0,
  last_refresh_reason text not null default 'initial',

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index dream_observation_user_updated_idx
  on public.dream_observation (user_id, updated_at desc);

create index dream_observation_session_user_idx
  on public.dream_observation (session_id, user_id);

-- updated_at trigger
create or replace function public.set_dream_observation_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_dream_observation_updated_at
before update on public.dream_observation
for each row
execute function public.set_dream_observation_updated_at();

-- Enable RLS
alter table public.dream_observation
  enable row level security;

-- SELECT policy
create policy "Users can select own dream observations"
  on public.dream_observation
  for select
  using (auth.uid() = user_id);

-- INSERT policy
create policy "Users can insert own dream observations"
  on public.dream_observation
  for insert
  with check (auth.uid() = user_id);

-- UPDATE policy
create policy "Users can update own dream observations"
  on public.dream_observation
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
