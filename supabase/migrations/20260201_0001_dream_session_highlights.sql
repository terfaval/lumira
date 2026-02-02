begin;

create table if not exists public.dream_session_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.dream_sessions(id) on delete cascade,

  label text not null,
  label_norm text not null,
  kind text not null default 'other',
  source text not null default 'user',
  source_ref jsonb,
  status text not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uniq_dream_session_highlights_dedup
  on public.dream_session_highlights(session_id, kind, label_norm);

create index if not exists idx_dream_session_highlights_session
  on public.dream_session_highlights(session_id, created_at desc);

create index if not exists idx_dream_session_highlights_user
  on public.dream_session_highlights(user_id, created_at desc);

alter table public.dream_session_highlights enable row level security;

drop policy if exists "read_own_dream_session_highlights" on public.dream_session_highlights;
create policy "read_own_dream_session_highlights" on public.dream_session_highlights
for select using (user_id = auth.uid());

drop policy if exists "write_own_dream_session_highlights" on public.dream_session_highlights;
create policy "write_own_dream_session_highlights" on public.dream_session_highlights
for insert with check (user_id = auth.uid());

drop policy if exists "update_own_dream_session_highlights" on public.dream_session_highlights;
create policy "update_own_dream_session_highlights" on public.dream_session_highlights
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "delete_own_dream_session_highlights" on public.dream_session_highlights;
create policy "delete_own_dream_session_highlights" on public.dream_session_highlights
for delete using (user_id = auth.uid());

drop trigger if exists trg_dream_session_highlights_updated_at on public.dream_session_highlights;
create trigger trg_dream_session_highlights_updated_at
before update on public.dream_session_highlights
for each row execute function public.set_updated_at();

create table if not exists public.dream_session_rejected_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.dream_sessions(id) on delete cascade,

  suggestion_key text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists uniq_dream_session_rejected_suggestions
  on public.dream_session_rejected_suggestions(session_id, suggestion_key);

create index if not exists idx_dream_session_rejected_session
  on public.dream_session_rejected_suggestions(session_id, created_at desc);

create index if not exists idx_dream_session_rejected_user
  on public.dream_session_rejected_suggestions(user_id, created_at desc);

alter table public.dream_session_rejected_suggestions enable row level security;

drop policy if exists "read_own_dream_session_rejected_suggestions" on public.dream_session_rejected_suggestions;
create policy "read_own_dream_session_rejected_suggestions" on public.dream_session_rejected_suggestions
for select using (user_id = auth.uid());

drop policy if exists "write_own_dream_session_rejected_suggestions" on public.dream_session_rejected_suggestions;
create policy "write_own_dream_session_rejected_suggestions" on public.dream_session_rejected_suggestions
for insert with check (user_id = auth.uid());

drop policy if exists "delete_own_dream_session_rejected_suggestions" on public.dream_session_rejected_suggestions;
create policy "delete_own_dream_session_rejected_suggestions" on public.dream_session_rejected_suggestions
for delete using (user_id = auth.uid());

commit;
