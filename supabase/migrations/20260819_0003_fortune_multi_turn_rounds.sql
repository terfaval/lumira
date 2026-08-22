alter table public.fortune_sessions
  drop constraint if exists fortune_sessions_state_check;

alter table public.fortune_sessions
  add column if not exists paused_at timestamptz null;

alter table public.fortune_sessions
  add constraint fortune_sessions_state_check
  check (state in ('active', 'paused', 'completed'));

alter table public.fortune_session_turns
  add column if not exists round_index integer not null default 0;

drop index if exists fortune_session_turns_single_prompt_per_session_idx;
drop index if exists fortune_session_turns_single_reply_per_session_idx;

create unique index if not exists fortune_session_turns_single_prompt_per_round_idx
  on public.fortune_session_turns (session_id, round_index)
  where turn_kind = 'reflective_prompt';

create unique index if not exists fortune_session_turns_single_reply_per_round_idx
  on public.fortune_session_turns (session_id, round_index)
  where turn_kind = 'reflective_reply';

create index if not exists fortune_session_turns_session_round_created_at_idx
  on public.fortune_session_turns (session_id, round_index asc, created_at asc);
