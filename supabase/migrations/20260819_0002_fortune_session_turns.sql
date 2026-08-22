create table if not exists public.fortune_session_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.fortune_sessions(id) on delete cascade,
  user_id uuid not null,
  role text not null,
  turn_kind text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint fortune_session_turns_role_check check (role in ('assistant', 'user')),
  constraint fortune_session_turns_turn_kind_check check (turn_kind in ('reflective_prompt', 'reflective_reply'))
);

create unique index if not exists fortune_session_turns_single_prompt_per_session_idx
  on public.fortune_session_turns (session_id)
  where turn_kind = 'reflective_prompt';

create unique index if not exists fortune_session_turns_single_reply_per_session_idx
  on public.fortune_session_turns (session_id)
  where turn_kind = 'reflective_reply';

create index if not exists fortune_session_turns_session_created_at_idx
  on public.fortune_session_turns (session_id, created_at asc);

create unique index if not exists fortune_session_turns_id_user_id_idx
  on public.fortune_session_turns (id, user_id);

alter table public.fortune_session_turns enable row level security;

drop policy if exists fortune_session_turns_select_own on public.fortune_session_turns;
create policy fortune_session_turns_select_own
on public.fortune_session_turns
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists fortune_session_turns_insert_own on public.fortune_session_turns;
create policy fortune_session_turns_insert_own
on public.fortune_session_turns
for insert
to authenticated
with check (auth.uid() = user_id);
