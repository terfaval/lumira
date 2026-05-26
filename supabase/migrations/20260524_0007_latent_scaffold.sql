-- Phase 6: Latent scaffold with write-protection boundaries

create table if not exists public.latent_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  summary text not null,
  confidence_band text not null,
  visibility text not null,
  generation_context text not null,
  source_reflective_objects uuid[] not null default '{}'::uuid[],
  source_observations uuid[] not null default '{}'::uuid[],
  source_glossary_terms uuid[] not null default '{}'::uuid[],
  source_threads uuid[] not null default '{}'::uuid[],
  source_responses uuid[] not null default '{}'::uuid[],
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint latent_snapshots_confidence_band_check check (
    confidence_band in ('low', 'tentative', 'moderate')
  ),
  constraint latent_snapshots_visibility_check check (
    visibility in ('internal_only', 'reflective_space_optional')
  )
);

create unique index if not exists latent_snapshots_id_user_id_idx
  on public.latent_snapshots (id, user_id);

create index if not exists latent_snapshots_user_created_idx
  on public.latent_snapshots (user_id, created_at desc);

create index if not exists latent_snapshots_user_active_idx
  on public.latent_snapshots (user_id)
  where archived_at is null;

create table if not exists public.latent_signals (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null,
  user_id uuid not null,
  signal_type text not null,
  label text not null,
  description text not null,
  confidence_band text not null,
  visibility text not null,
  generation_context text not null,
  source_reflective_objects uuid[] not null default '{}'::uuid[],
  source_observations uuid[] not null default '{}'::uuid[],
  source_glossary_terms uuid[] not null default '{}'::uuid[],
  source_threads uuid[] not null default '{}'::uuid[],
  source_responses uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint latent_signals_signal_type_check check (
    signal_type in (
      'recurrence_possibility',
      'continuity_possibility',
      'dormant_thread_resurfacing_possibility',
      'reflective_opportunity_possibility'
    )
  ),
  constraint latent_signals_confidence_band_check check (
    confidence_band in ('low', 'tentative', 'moderate')
  ),
  constraint latent_signals_visibility_check check (
    visibility in ('internal_only', 'reflective_space_optional')
  ),
  constraint latent_signals_snapshot_owner_fk foreign key (snapshot_id, user_id)
    references public.latent_snapshots (id, user_id)
    on delete cascade
);

create index if not exists latent_signals_user_snapshot_idx
  on public.latent_signals (user_id, snapshot_id);

create table if not exists public.latent_suggestions (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null,
  user_id uuid not null,
  suggestion_type text not null,
  phrasing text not null,
  confidence_band text not null,
  visibility text not null,
  generation_context text not null,
  source_reflective_objects uuid[] not null default '{}'::uuid[],
  source_observations uuid[] not null default '{}'::uuid[],
  source_glossary_terms uuid[] not null default '{}'::uuid[],
  source_threads uuid[] not null default '{}'::uuid[],
  source_responses uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint latent_suggestions_type_check check (
    suggestion_type in (
      'possible_connection',
      'possible_recurrence',
      'possible_resurfacing',
      'possible_opening'
    )
  ),
  constraint latent_suggestions_confidence_band_check check (
    confidence_band in ('low', 'tentative', 'moderate')
  ),
  constraint latent_suggestions_visibility_check check (
    visibility in ('internal_only', 'reflective_space_optional')
  ),
  constraint latent_suggestions_snapshot_owner_fk foreign key (snapshot_id, user_id)
    references public.latent_snapshots (id, user_id)
    on delete cascade
);

create index if not exists latent_suggestions_user_snapshot_idx
  on public.latent_suggestions (user_id, snapshot_id);

create or replace function public.touch_latent_snapshots_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_latent_signals_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_latent_suggestions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_latent_snapshots_updated_at on public.latent_snapshots;
create trigger trg_touch_latent_snapshots_updated_at
before update on public.latent_snapshots
for each row
execute function public.touch_latent_snapshots_updated_at();

drop trigger if exists trg_touch_latent_signals_updated_at on public.latent_signals;
create trigger trg_touch_latent_signals_updated_at
before update on public.latent_signals
for each row
execute function public.touch_latent_signals_updated_at();

drop trigger if exists trg_touch_latent_suggestions_updated_at on public.latent_suggestions;
create trigger trg_touch_latent_suggestions_updated_at
before update on public.latent_suggestions
for each row
execute function public.touch_latent_suggestions_updated_at();

alter table public.latent_snapshots enable row level security;
alter table public.latent_signals enable row level security;
alter table public.latent_suggestions enable row level security;

drop policy if exists latent_snapshots_select_own_active on public.latent_snapshots;
create policy latent_snapshots_select_own_active
on public.latent_snapshots
for select
to authenticated
using (
  auth.uid() = user_id
  and archived_at is null
);

drop policy if exists latent_snapshots_insert_own on public.latent_snapshots;
create policy latent_snapshots_insert_own
on public.latent_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists latent_snapshots_update_own on public.latent_snapshots;
create policy latent_snapshots_update_own
on public.latent_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists latent_signals_select_own on public.latent_signals;
create policy latent_signals_select_own
on public.latent_signals
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists latent_signals_insert_own on public.latent_signals;
create policy latent_signals_insert_own
on public.latent_signals
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists latent_signals_update_own on public.latent_signals;
create policy latent_signals_update_own
on public.latent_signals
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists latent_suggestions_select_own on public.latent_suggestions;
create policy latent_suggestions_select_own
on public.latent_suggestions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists latent_suggestions_insert_own on public.latent_suggestions;
create policy latent_suggestions_insert_own
on public.latent_suggestions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists latent_suggestions_update_own on public.latent_suggestions;
create policy latent_suggestions_update_own
on public.latent_suggestions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
