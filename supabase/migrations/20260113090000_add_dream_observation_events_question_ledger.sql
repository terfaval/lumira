create table if not exists public.dream_observation_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  kind text not null check (kind in ('user_answer','assistant_question','system_extract','system_synth')),

  payload jsonb not null default '{}'::jsonb,
  anchor_keys text[] not null default '{}',

  created_at timestamptz not null default now()
);

create index if not exists dream_observation_events_session_created_idx
  on public.dream_observation_events (session_id, created_at desc);

create index if not exists dream_observation_events_user_created_idx
  on public.dream_observation_events (user_id, created_at desc);

create table if not exists public.work_question_ledger (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  direction_slug text not null,
  question_text text not null,
  question_intent text null,

  anchor_keys text[] not null default '{}',

  answered boolean not null default false,
  answer_event_id uuid null references public.dream_observation_events(id) on delete set null,

  created_at timestamptz not null default now()
);

create index if not exists work_question_ledger_session_created_idx
  on public.work_question_ledger (session_id, created_at desc);

create index if not exists work_question_ledger_session_dir_idx
  on public.work_question_ledger (session_id, direction_slug, created_at desc);

create index if not exists work_question_ledger_user_created_idx
  on public.work_question_ledger (user_id, created_at desc);
