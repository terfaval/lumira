/* PR1: Enable RLS + policies on core tables
   Tables:
   - public.dream_sessions           (user_id-based)
   - public.work_blocks              (session ownership-based)
   - public.morning_direction_choices(session ownership-based)
   - public.evening_card_usage_log   (user_id-based)
*/

set search_path = public;

-- ─────────────────────────────────────────────────────────────
-- 1) dream_sessions – USER_ID-BASED
-- ─────────────────────────────────────────────────────────────

alter table if exists public.dream_sessions enable row level security;

drop policy if exists "dream_sessions_select_own" on public.dream_sessions;
create policy "dream_sessions_select_own"
on public.dream_sessions
for select
using (auth.uid() = user_id);

drop policy if exists "dream_sessions_insert_own" on public.dream_sessions;
create policy "dream_sessions_insert_own"
on public.dream_sessions
for insert
with check (auth.uid() = user_id);

drop policy if exists "dream_sessions_update_own" on public.dream_sessions;
create policy "dream_sessions_update_own"
on public.dream_sessions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "dream_sessions_delete_own" on public.dream_sessions;
create policy "dream_sessions_delete_own"
on public.dream_sessions
for delete
using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 2) work_blocks – SESSION OWNERSHIP-BASED
-- ─────────────────────────────────────────────────────────────

alter table if exists public.work_blocks enable row level security;

drop policy if exists "work_blocks_select_own_via_session" on public.work_blocks;
create policy "work_blocks_select_own_via_session"
on public.work_blocks
for select
using (
  exists (
    select 1
    from public.dream_sessions s
    where s.id = work_blocks.session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "work_blocks_insert_own_via_session" on public.work_blocks;
create policy "work_blocks_insert_own_via_session"
on public.work_blocks
for insert
with check (
  exists (
    select 1
    from public.dream_sessions s
    where s.id = work_blocks.session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "work_blocks_update_own_via_session" on public.work_blocks;
create policy "work_blocks_update_own_via_session"
on public.work_blocks
for update
using (
  exists (
    select 1
    from public.dream_sessions s
    where s.id = work_blocks.session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.dream_sessions s
    where s.id = work_blocks.session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "work_blocks_delete_own_via_session" on public.work_blocks;
create policy "work_blocks_delete_own_via_session"
on public.work_blocks
for delete
using (
  exists (
    select 1
    from public.dream_sessions s
    where s.id = work_blocks.session_id
      and s.user_id = auth.uid()
  )
);

-- ─────────────────────────────────────────────────────────────
-- 3) morning_direction_choices – SESSION OWNERSHIP-BASED
-- ─────────────────────────────────────────────────────────────

alter table if exists public.morning_direction_choices enable row level security;

drop policy if exists "morning_direction_choices_select_own_via_session" on public.morning_direction_choices;
create policy "morning_direction_choices_select_own_via_session"
on public.morning_direction_choices
for select
using (
  exists (
    select 1
    from public.dream_sessions s
    where s.id = morning_direction_choices.session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "morning_direction_choices_insert_own_via_session" on public.morning_direction_choices;
create policy "morning_direction_choices_insert_own_via_session"
on public.morning_direction_choices
for insert
with check (
  exists (
    select 1
    from public.dream_sessions s
    where s.id = morning_direction_choices.session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "morning_direction_choices_update_own_via_session" on public.morning_direction_choices;
create policy "morning_direction_choices_update_own_via_session"
on public.morning_direction_choices
for update
using (
  exists (
    select 1
    from public.dream_sessions s
    where s.id = morning_direction_choices.session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.dream_sessions s
    where s.id = morning_direction_choices.session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "morning_direction_choices_delete_own_via_session" on public.morning_direction_choices;
create policy "morning_direction_choices_delete_own_via_session"
on public.morning_direction_choices
for delete
using (
  exists (
    select 1
    from public.dream_sessions s
    where s.id = morning_direction_choices.session_id
      and s.user_id = auth.uid()
  )
);

-- ─────────────────────────────────────────────────────────────
-- 4) evening_card_usage_log – USER_ID-BASED
-- ─────────────────────────────────────────────────────────────

alter table if exists public.evening_card_usage_log enable row level security;

drop policy if exists "evening_card_usage_log_select_own" on public.evening_card_usage_log;
create policy "evening_card_usage_log_select_own"
on public.evening_card_usage_log
for select
using (auth.uid() = user_id);

drop policy if exists "evening_card_usage_log_insert_own" on public.evening_card_usage_log;
create policy "evening_card_usage_log_insert_own"
on public.evening_card_usage_log
for insert
with check (auth.uid() = user_id);

drop policy if exists "evening_card_usage_log_update_own" on public.evening_card_usage_log;
create policy "evening_card_usage_log_update_own"
on public.evening_card_usage_log
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "evening_card_usage_log_delete_own" on public.evening_card_usage_log;
create policy "evening_card_usage_log_delete_own"
on public.evening_card_usage_log
for delete
using (auth.uid() = user_id);
