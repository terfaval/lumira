-- Phase 7c: Opening suppression lifecycle + revisit policy

alter table public.openings
  add column if not exists suppression_duration text null,
  add column if not exists suppression_expires_at timestamptz null,
  add column if not exists suppression_revisit_eligibility text null default 'revisitable_dormant',
  add column if not exists suppression_reactivated_at timestamptz null;

alter table public.opening_suppressions
  add column if not exists suppression_duration text null,
  add column if not exists suppression_expires_at timestamptz null,
  add column if not exists suppression_revisit_eligibility text null default 'revisitable_dormant',
  add column if not exists suppression_reactivated_at timestamptz null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'openings_suppression_duration_check'
  ) then
    alter table public.openings
      add constraint openings_suppression_duration_check
      check (suppression_duration in ('temporary', 'indefinite', 'user_reactivated') or suppression_duration is null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'openings_suppression_revisit_eligibility_check'
  ) then
    alter table public.openings
      add constraint openings_suppression_revisit_eligibility_check
      check (suppression_revisit_eligibility in ('hidden', 'revisitable_dormant', 'user_reactivated') or suppression_revisit_eligibility is null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'opening_suppressions_duration_check'
  ) then
    alter table public.opening_suppressions
      add constraint opening_suppressions_duration_check
      check (suppression_duration in ('temporary', 'indefinite', 'user_reactivated') or suppression_duration is null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'opening_suppressions_revisit_eligibility_check'
  ) then
    alter table public.opening_suppressions
      add constraint opening_suppressions_revisit_eligibility_check
      check (suppression_revisit_eligibility in ('hidden', 'revisitable_dormant', 'user_reactivated') or suppression_revisit_eligibility is null);
  end if;
end $$;

alter table public.opening_surface_events
  drop constraint if exists opening_surface_events_event_type_check;

alter table public.opening_surface_events
  add constraint opening_surface_events_event_type_check
  check (event_type in ('surface_viewed', 'activated', 'dismissed', 'suppressed', 'reactivated'));
