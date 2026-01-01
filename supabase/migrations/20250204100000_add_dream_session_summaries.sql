-- supabase/migrations/20250204100000_add_dream_session_summaries.sql

-- Dependencies
create extension if not exists vector;

-- Table for anchor summaries and retrieval embeddings
create table if not exists public.dream_session_summaries (
  session_id uuid primary key references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  anchor_summary text not null default '',
  embedding vector(1536) null,

  created_at timestamptz not null default now()
);

create index if not exists dream_session_summaries_user_created_idx
  on public.dream_session_summaries (user_id, created_at desc);

alter table public.dream_session_summaries
  enable row level security;

create policy if not exists "Users can select own dream session summaries"
  on public.dream_session_summaries
  for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert own dream session summaries"
  on public.dream_session_summaries
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update own dream session summaries"
  on public.dream_session_summaries
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);