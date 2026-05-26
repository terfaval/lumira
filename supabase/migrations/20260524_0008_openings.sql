-- Phase 7: Opening scaffold

create table if not exists public.openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  opening_type text not null,
  tone text not null,
  utterance text not null,
  state text not null default 'available',
  visibility text not null default 'invitation_surface',
  suppression_state text not null default 'none',
  suppression_reason text null,
  latent_snapshot_id uuid null,
  source_objects uuid[] not null default '{}'::uuid[],
  source_observations uuid[] not null default '{}'::uuid[],
  source_glossary_terms uuid[] not null default '{}'::uuid[],
  source_threads uuid[] not null default '{}'::uuid[],
  source_responses uuid[] not null default '{}'::uuid[],
  confidence_band text not null,
  opening_generation_context text not null,
  activated_at timestamptz null,
  dismissed_at timestamptz null,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint openings_type_check check (
    opening_type in (
      'reflective_question',
      'continuity_noticing',
      'reflective_recall',
      'atmospheric_reflection',
      'juxtaposition'
    )
  ),
  constraint openings_tone_check check (tone in ('gentle', 'curious', 'spacious', 'calm')),
  constraint openings_state_check check (state in ('available', 'activated', 'dismissed', 'archived')),
  constraint openings_visibility_check check (visibility in ('invitation_surface', 'opened')),
  constraint openings_suppression_state_check check (suppression_state in ('none', 'suppressed')),
  constraint openings_confidence_band_check check (confidence_band in ('low', 'tentative', 'moderate')),
  constraint openings_latent_snapshot_owner_fk foreign key (latent_snapshot_id, user_id)
    references public.latent_snapshots (id, user_id)
    on delete set null
);

create unique index if not exists openings_id_user_id_idx
  on public.openings (id, user_id);

create index if not exists openings_user_created_idx
  on public.openings (user_id, created_at desc);

create index if not exists openings_user_active_idx
  on public.openings (user_id)
  where archived_at is null;

create table if not exists public.opening_suppressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  opening_id uuid not null,
  suppression_state text not null,
  suppression_reason text null,
  suppressed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opening_suppressions_state_check check (suppression_state in ('none', 'suppressed')),
  constraint opening_suppressions_opening_owner_fk foreign key (opening_id, user_id)
    references public.openings (id, user_id)
    on delete cascade,
  constraint opening_suppressions_unique unique (opening_id, user_id)
);

create index if not exists opening_suppressions_user_opening_idx
  on public.opening_suppressions (user_id, opening_id);

create table if not exists public.opening_surface_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  opening_id uuid not null,
  event_type text not null,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opening_surface_events_event_type_check check (
    event_type in ('surface_viewed', 'activated', 'dismissed', 'suppressed')
  ),
  constraint opening_surface_events_source_check check (
    source in ('reflective_space_surface', 'continuity_revisit', 'manual_revisit')
  ),
  constraint opening_surface_events_opening_owner_fk foreign key (opening_id, user_id)
    references public.openings (id, user_id)
    on delete cascade
);

create index if not exists opening_surface_events_user_opening_idx
  on public.opening_surface_events (user_id, opening_id, created_at desc);

create or replace function public.touch_openings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_opening_suppressions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_opening_surface_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_openings_updated_at on public.openings;
create trigger trg_touch_openings_updated_at
before update on public.openings
for each row
execute function public.touch_openings_updated_at();

drop trigger if exists trg_touch_opening_suppressions_updated_at on public.opening_suppressions;
create trigger trg_touch_opening_suppressions_updated_at
before update on public.opening_suppressions
for each row
execute function public.touch_opening_suppressions_updated_at();

drop trigger if exists trg_touch_opening_surface_events_updated_at on public.opening_surface_events;
create trigger trg_touch_opening_surface_events_updated_at
before update on public.opening_surface_events
for each row
execute function public.touch_opening_surface_events_updated_at();

alter table public.openings enable row level security;
alter table public.opening_suppressions enable row level security;
alter table public.opening_surface_events enable row level security;

drop policy if exists openings_select_own_active on public.openings;
create policy openings_select_own_active
on public.openings
for select
to authenticated
using (
  auth.uid() = user_id
  and archived_at is null
);

drop policy if exists openings_insert_own on public.openings;
create policy openings_insert_own
on public.openings
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists openings_update_own on public.openings;
create policy openings_update_own
on public.openings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists opening_suppressions_select_own on public.opening_suppressions;
create policy opening_suppressions_select_own
on public.opening_suppressions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists opening_suppressions_insert_own on public.opening_suppressions;
create policy opening_suppressions_insert_own
on public.opening_suppressions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists opening_suppressions_update_own on public.opening_suppressions;
create policy opening_suppressions_update_own
on public.opening_suppressions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists opening_suppressions_delete_own on public.opening_suppressions;
create policy opening_suppressions_delete_own
on public.opening_suppressions
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists opening_surface_events_select_own on public.opening_surface_events;
create policy opening_surface_events_select_own
on public.opening_surface_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists opening_surface_events_insert_own on public.opening_surface_events;
create policy opening_surface_events_insert_own
on public.opening_surface_events
for insert
to authenticated
with check (auth.uid() = user_id);

