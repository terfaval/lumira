-- Phase 3: Observation layer scaffold

create unique index if not exists reflective_objects_id_user_id_idx
  on public.reflective_objects (id, user_id);

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  reflective_object_id uuid not null,
  source text not null,
  summary text not null,
  uncertainty_notes jsonb not null default '[]'::jsonb,
  state text not null default 'active',
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint observations_source_check check (
    source in ('system_descriptive_extract', 'user_descriptive_note')
  ),
  constraint observations_state_check check (
    state in ('active', 'archived')
  ),
  constraint observations_reflective_object_owner_fk foreign key (reflective_object_id, user_id)
    references public.reflective_objects (id, user_id)
    on delete cascade
);

create unique index if not exists observations_id_user_id_idx
  on public.observations (id, user_id);

create index if not exists observations_user_object_created_idx
  on public.observations (user_id, reflective_object_id, created_at desc);

create table if not exists public.observation_fragments (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null,
  user_id uuid not null,
  reflective_object_id uuid not null,
  category text not null,
  fragment_text text not null,
  evidence_snippet text not null,
  evidence_start integer null,
  evidence_end integer null,
  evidence_context_label text null,
  uncertainty_note text null,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint observation_fragments_category_check check (
    category in (
      'scene',
      'actor',
      'interaction',
      'emotion',
      'location',
      'transition',
      'object',
      'body_state',
      'dream_quality',
      'recurrence_candidate'
    )
  ),
  constraint observation_fragments_evidence_span_check check (
    (evidence_start is null and evidence_end is null)
    or (evidence_start is not null and evidence_end is not null and evidence_end >= evidence_start)
  ),
  constraint observation_fragments_position_check check (position >= 0),
  constraint observation_fragments_observation_owner_fk foreign key (observation_id, user_id)
    references public.observations (id, user_id)
    on delete cascade,
  constraint observation_fragments_reflective_object_owner_fk foreign key (reflective_object_id, user_id)
    references public.reflective_objects (id, user_id)
    on delete cascade
);

create index if not exists observation_fragments_observation_position_idx
  on public.observation_fragments (observation_id, position asc);

create or replace function public.touch_observations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_observation_fragments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_observations_updated_at on public.observations;
create trigger trg_touch_observations_updated_at
before update on public.observations
for each row
execute function public.touch_observations_updated_at();

drop trigger if exists trg_touch_observation_fragments_updated_at on public.observation_fragments;
create trigger trg_touch_observation_fragments_updated_at
before update on public.observation_fragments
for each row
execute function public.touch_observation_fragments_updated_at();

alter table public.observations enable row level security;
alter table public.observation_fragments enable row level security;

drop policy if exists observations_select_own_active on public.observations;
create policy observations_select_own_active
on public.observations
for select
to authenticated
using (
  auth.uid() = user_id
  and archived_at is null
);

drop policy if exists observations_insert_own on public.observations;
create policy observations_insert_own
on public.observations
for insert
to authenticated
with check (
  auth.uid() = user_id
);

drop policy if exists observations_update_own on public.observations;
create policy observations_update_own
on public.observations
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

drop policy if exists observation_fragments_select_own on public.observation_fragments;
create policy observation_fragments_select_own
on public.observation_fragments
for select
to authenticated
using (
  auth.uid() = user_id
);

drop policy if exists observation_fragments_insert_own on public.observation_fragments;
create policy observation_fragments_insert_own
on public.observation_fragments
for insert
to authenticated
with check (
  auth.uid() = user_id
);

drop policy if exists observation_fragments_update_own on public.observation_fragments;
create policy observation_fragments_update_own
on public.observation_fragments
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);
