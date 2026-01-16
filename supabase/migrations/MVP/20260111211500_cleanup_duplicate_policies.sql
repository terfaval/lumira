-- PR1.1 Cleanup: remove duplicate/legacy RLS policies
-- Goal: exactly one clear policy set per table.

-- work_blocks: keep only *_via_session
drop policy if exists "work_blocks_select_own" on public.work_blocks;
drop policy if exists "work_blocks_insert_own" on public.work_blocks;
drop policy if exists "work_blocks_update_own" on public.work_blocks;
drop policy if exists "work_blocks_delete_own" on public.work_blocks;

-- morning_direction_choices: keep only *_via_session
drop policy if exists "mdc_select_own" on public.morning_direction_choices;
drop policy if exists "mdc_insert_own" on public.morning_direction_choices;
drop policy if exists "mdc_update_own" on public.morning_direction_choices;
drop policy if exists "mdc_delete_own" on public.morning_direction_choices;

-- evening_card_usage_log: keep only evening_card_usage_log_*
drop policy if exists "evening_log_select_own" on public.evening_card_usage_log;
drop policy if exists "evening_log_insert_own" on public.evening_card_usage_log;
drop policy if exists "evening_log_update_own" on public.evening_card_usage_log;
drop policy if exists "evening_log_delete_own" on public.evening_card_usage_log;
