create table if not exists public.observation_v2_bundles (
  id text primary key,
  user_id uuid not null,
  reflective_object_id uuid not null,
  source text not null,
  provenance_metadata jsonb not null default '{}'::jsonb,
  bundle_uncertainty_notes jsonb not null default '[]'::jsonb,
  runtime_version text not null,
  status text not null default 'active',
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint observation_v2_bundles_source_check check (
    source in ('system_descriptive_extract', 'system_llm_extract', 'user_descriptive_note')
  ),
  constraint observation_v2_bundles_status_check check (
    status in ('active', 'archived')
  ),
  constraint observation_v2_bundles_reflective_object_owner_fk foreign key (reflective_object_id, user_id)
    references public.reflective_objects (id, user_id)
    on delete cascade
);

create unique index if not exists observation_v2_bundles_reflective_object_user_idx
  on public.observation_v2_bundles (reflective_object_id, user_id);

create index if not exists observation_v2_bundles_user_created_idx
  on public.observation_v2_bundles (user_id, created_at desc);

create table if not exists public.observation_v2_scenes (
  id text primary key,
  bundle_id text not null,
  user_id uuid not null,
  reflective_object_id uuid not null,
  scene_id text not null,
  position integer not null,
  summary text not null,
  boundary_signals jsonb not null default '[]'::jsonb,
  uncertainty_notes jsonb not null default '[]'::jsonb,
  evidence_context jsonb not null default '{}'::jsonb,
  derived_structures jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint observation_v2_scenes_position_check check (position >= 0),
  constraint observation_v2_scenes_bundle_owner_fk foreign key (bundle_id)
    references public.observation_v2_bundles (id)
    on delete cascade,
  constraint observation_v2_scenes_reflective_object_owner_fk foreign key (reflective_object_id, user_id)
    references public.reflective_objects (id, user_id)
    on delete cascade
);

create unique index if not exists observation_v2_scenes_bundle_scene_idx
  on public.observation_v2_scenes (bundle_id, scene_id);

create index if not exists observation_v2_scenes_bundle_position_idx
  on public.observation_v2_scenes (bundle_id, position asc);

create table if not exists public.observation_v2_scene_observations (
  id text primary key,
  bundle_id text not null,
  scene_row_id text not null,
  user_id uuid not null,
  reflective_object_id uuid not null,
  observation_id text not null,
  position integer not null,
  text text not null,
  evidence jsonb not null default '[]'::jsonb,
  uncertainty_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint observation_v2_scene_observations_position_check check (position >= 0),
  constraint observation_v2_scene_observations_bundle_fk foreign key (bundle_id)
    references public.observation_v2_bundles (id)
    on delete cascade,
  constraint observation_v2_scene_observations_scene_fk foreign key (scene_row_id)
    references public.observation_v2_scenes (id)
    on delete cascade,
  constraint observation_v2_scene_observations_reflective_object_owner_fk foreign key (reflective_object_id, user_id)
    references public.reflective_objects (id, user_id)
    on delete cascade
);

create unique index if not exists observation_v2_scene_observations_scene_observation_idx
  on public.observation_v2_scene_observations (scene_row_id, observation_id);

create index if not exists observation_v2_scene_observations_scene_position_idx
  on public.observation_v2_scene_observations (scene_row_id, position asc);

create or replace function public.touch_observation_v2_bundles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_observation_v2_scenes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_observation_v2_scene_observations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_observation_v2_bundles_updated_at on public.observation_v2_bundles;
create trigger trg_touch_observation_v2_bundles_updated_at
before update on public.observation_v2_bundles
for each row
execute function public.touch_observation_v2_bundles_updated_at();

drop trigger if exists trg_touch_observation_v2_scenes_updated_at on public.observation_v2_scenes;
create trigger trg_touch_observation_v2_scenes_updated_at
before update on public.observation_v2_scenes
for each row
execute function public.touch_observation_v2_scenes_updated_at();

drop trigger if exists trg_touch_observation_v2_scene_observations_updated_at on public.observation_v2_scene_observations;
create trigger trg_touch_observation_v2_scene_observations_updated_at
before update on public.observation_v2_scene_observations
for each row
execute function public.touch_observation_v2_scene_observations_updated_at();

alter table public.observation_v2_bundles enable row level security;
alter table public.observation_v2_scenes enable row level security;
alter table public.observation_v2_scene_observations enable row level security;

drop policy if exists observation_v2_bundles_select_own_active on public.observation_v2_bundles;
create policy observation_v2_bundles_select_own_active
on public.observation_v2_bundles
for select
to authenticated
using (
  auth.uid() = user_id
  and archived_at is null
);

drop policy if exists observation_v2_bundles_insert_own on public.observation_v2_bundles;
create policy observation_v2_bundles_insert_own
on public.observation_v2_bundles
for insert
to authenticated
with check (
  auth.uid() = user_id
);

drop policy if exists observation_v2_bundles_update_own on public.observation_v2_bundles;
create policy observation_v2_bundles_update_own
on public.observation_v2_bundles
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

drop policy if exists observation_v2_scenes_select_own on public.observation_v2_scenes;
create policy observation_v2_scenes_select_own
on public.observation_v2_scenes
for select
to authenticated
using (
  auth.uid() = user_id
);

drop policy if exists observation_v2_scenes_insert_own on public.observation_v2_scenes;
create policy observation_v2_scenes_insert_own
on public.observation_v2_scenes
for insert
to authenticated
with check (
  auth.uid() = user_id
);

drop policy if exists observation_v2_scenes_update_own on public.observation_v2_scenes;
create policy observation_v2_scenes_update_own
on public.observation_v2_scenes
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

drop policy if exists observation_v2_scene_observations_select_own on public.observation_v2_scene_observations;
create policy observation_v2_scene_observations_select_own
on public.observation_v2_scene_observations
for select
to authenticated
using (
  auth.uid() = user_id
);

drop policy if exists observation_v2_scene_observations_insert_own on public.observation_v2_scene_observations;
create policy observation_v2_scene_observations_insert_own
on public.observation_v2_scene_observations
for insert
to authenticated
with check (
  auth.uid() = user_id
);

drop policy if exists observation_v2_scene_observations_update_own on public.observation_v2_scene_observations;
create policy observation_v2_scene_observations_update_own
on public.observation_v2_scene_observations
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);
