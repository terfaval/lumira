alter table public.fortune_sessions
  add column if not exists reflection_started_at timestamptz null;

update public.fortune_sessions as sessions
set reflection_started_at = coalesce(
  (
    select min(turns.created_at)
    from public.fortune_session_turns as turns
    where turns.session_id = sessions.id
  ),
  sessions.paused_at,
  sessions.completed_at,
  sessions.updated_at,
  sessions.created_at
)
where sessions.reflection_started_at is null
  and (
    sessions.first_interpretation is not null
    or sessions.state in ('paused', 'completed')
    or exists (
      select 1
      from public.fortune_session_turns as turns
      where turns.session_id = sessions.id
    )
  );

create index if not exists fortune_sessions_user_reflection_started_at_idx
  on public.fortune_sessions (user_id, reflection_started_at desc)
  where reflection_started_at is not null;
