-- PR1 FIX: Enable RLS + correct owner-only policies on core tables
-- Based on schema:
-- - dream_sessions has user_id
-- - work_blocks has user_id + session_id
-- - morning_direction_choices has session_id only (NO user_id)
-- - evening_card_usage_log has user_id

-- ─────────────────────────────────────────────────────────────
-- dream_sessions (user_id-based)
-- ─────────────────────────────────────────────────────────────
alter table if exists public.dream_sessions enable row level security;

drop policy if exists "dream_sessions_select_own" on public.dream_sessions;
create policy "dream_sessions_select_own"
on public.dream_sessions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "dream_sessions_insert_own" on public.dream_sessions;
create policy "dream_sessions_insert_own"
on public.dream_sessions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "dream_sessions_update_own" on public.dream_sessions;
create policy "dream_sessions_update_own"
on public.dream_sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "dream_sessions_delete_own" on public.dream_sessions;
create policy "dream_sessions_delete_own"
on public.dream_sessions
for delete
to authenticated
using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- work_blocks (session ownership-based = safest)
-- ─────────────────────────────────────────────────────────────
alter table if exists public.work_blocks enable row level security;

drop policy if exists "work_blocks_select_own_via_session" on public.work_blocks;
create policy "work_blocks_select_own_via_session"
on public.work_blocks
for select
to authenticated
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
to authenticated
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
to authenticated
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
to authenticated
using (
  exists (
    select 1
    from public.dream_sessions s
    where s.id = work_blocks.session_id
      and s.user_id = auth.uid()
  )
);

-- ─────────────────────────────────────────────────────────────
-- morning_direction_choices (session ownership-based; NO user_id)
-- ─────────────────────────────────────────────────────────────
alter table if exists public.morning_direction_choices enable row level security;

drop policy if exists "morning_direction_choices_select_own_via_session" on public.morning_direction_choices;
create policy "morning_direction_choices_select_own_via_session"
on public.morning_direction_choices
for select
to authenticated
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
to authenticated
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
to authenticated
using (
  exists (
    select 1
    from public.dream_sessions s
    where s.id = morning_direction_choices.session_id
      and s.user_id = auth.uid()
  )
);

-- (Update policy only if you actually update rows later)
drop policy if exists "morning_direction_choices_update_own_via_session" on public.morning_direction_choices;
create policy "morning_direction_choices_update_own_via_session"
on public.morning_direction_choices
for update
to authenticated
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

-- ─────────────────────────────────────────────────────────────
-- evening_card_usage_log (user_id-based)
-- ─────────────────────────────────────────────────────────────
alter table if exists public.evening_card_usage_log enable row level security;

drop policy if exists "evening_card_usage_log_select_own" on public.evening_card_usage_log;
create policy "evening_card_usage_log_select_own"
on public.evening_card_usage_log
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "evening_card_usage_log_insert_own" on public.evening_card_usage_log;
create policy "evening_card_usage_log_insert_own"
on public.evening_card_usage_log
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "evening_card_usage_log_update_own" on public.evening_card_usage_log;
create policy "evening_card_usage_log_update_own"
on public.evening_card_usage_log
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "evening_card_usage_log_delete_own" on public.evening_card_usage_log;
create policy "evening_card_usage_log_delete_own"
on public.evening_card_usage_log
for delete
to authenticated
using (auth.uid() = user_id);
