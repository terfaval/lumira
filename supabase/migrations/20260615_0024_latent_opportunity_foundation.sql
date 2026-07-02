create table if not exists public.latent_opportunity_identities (
  id text primary key,
  user_id uuid not null,
  title text not null,
  primary_category text not null,
  secondary_categories text[] not null default '{}'::text[],
  lifecycle_state text not null default 'emerging',
  status text not null default 'active',
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint latent_opportunity_identities_primary_category_check check (
    primary_category in (
      'pattern',
      'continuity',
      'relationship',
      'transition',
      'transformation',
      'reversal',
      'tension',
      'contradiction',
      'ambiguity',
      'gap',
      'unresolved_pattern',
      'unknown',
      'curiosity',
      'novelty',
      'salience_signal'
    )
  ),
  constraint latent_opportunity_identities_lifecycle_state_check check (
    lifecycle_state in (
      'emerging',
      'reinforced',
      'expanded',
      'recontextualized',
      'reversed',
      'weakening',
      'reactivated',
      'split',
      'merged',
      'abandoned'
    )
  ),
  constraint latent_opportunity_identities_status_check check (
    status in ('active', 'archived')
  )
);

create index if not exists latent_opportunity_identities_user_created_idx
  on public.latent_opportunity_identities (user_id, created_at desc);

create index if not exists latent_opportunity_identities_user_active_idx
  on public.latent_opportunity_identities (user_id)
  where archived_at is null;

create unique index if not exists latent_opportunity_identities_id_user_idx
  on public.latent_opportunity_identities (id, user_id);

create table if not exists public.latent_opportunity_manifestations (
  id text primary key,
  identity_id text not null,
  user_id uuid not null,
  priority_reflective_object_id uuid not null,
  summary text not null,
  structure_payload jsonb not null default '{}'::jsonb,
  primary_category text not null,
  secondary_categories text[] not null default '{}'::text[],
  credibility_score double precision not null,
  reflective_potential_score double precision not null,
  salience_band text not null,
  salience_rationale jsonb not null default '{}'::jsonb,
  construction_metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint latent_opportunity_manifestations_identity_owner_fk foreign key (identity_id, user_id)
    references public.latent_opportunity_identities (id, user_id)
    on delete cascade,
  constraint latent_opportunity_manifestations_priority_object_owner_fk foreign key (priority_reflective_object_id, user_id)
    references public.reflective_objects (id, user_id)
    on delete cascade,
  constraint latent_opportunity_manifestations_primary_category_check check (
    primary_category in (
      'pattern',
      'continuity',
      'relationship',
      'transition',
      'transformation',
      'reversal',
      'tension',
      'contradiction',
      'ambiguity',
      'gap',
      'unresolved_pattern',
      'unknown',
      'curiosity',
      'novelty',
      'salience_signal'
    )
  ),
  constraint latent_opportunity_manifestations_credibility_score_check check (
    credibility_score >= 0 and credibility_score <= 1
  ),
  constraint latent_opportunity_manifestations_reflective_potential_score_check check (
    reflective_potential_score >= 0 and reflective_potential_score <= 1
  ),
  constraint latent_opportunity_manifestations_salience_band_check check (
    salience_band in ('low', 'moderate', 'high')
  )
);

create index if not exists latent_opportunity_manifestations_user_priority_created_idx
  on public.latent_opportunity_manifestations (user_id, priority_reflective_object_id, created_at desc);

create index if not exists latent_opportunity_manifestations_identity_created_idx
  on public.latent_opportunity_manifestations (identity_id, created_at desc);

create unique index if not exists latent_opportunity_manifestations_id_user_idx
  on public.latent_opportunity_manifestations (id, user_id);

create table if not exists public.latent_opportunity_evidence_blocks (
  id text primary key,
  manifestation_id text not null,
  user_id uuid not null,
  reflective_object_id uuid not null,
  role text not null,
  summary text null,
  position integer not null,
  created_at timestamptz not null default now(),
  constraint latent_opportunity_evidence_blocks_manifestation_owner_fk foreign key (manifestation_id, user_id)
    references public.latent_opportunity_manifestations (id, user_id)
    on delete cascade,
  constraint latent_opportunity_evidence_blocks_reflective_object_owner_fk foreign key (reflective_object_id, user_id)
    references public.reflective_objects (id, user_id)
    on delete cascade,
  constraint latent_opportunity_evidence_blocks_role_check check (
    role in ('priority', 'context', 'historical_resonance', 'contrast')
  ),
  constraint latent_opportunity_evidence_blocks_position_check check (position >= 0)
);

create unique index if not exists latent_opportunity_evidence_blocks_manifestation_position_idx
  on public.latent_opportunity_evidence_blocks (manifestation_id, position);

create unique index if not exists latent_opportunity_evidence_blocks_id_user_idx
  on public.latent_opportunity_evidence_blocks (id, user_id);

create table if not exists public.latent_opportunity_evidence_observations (
  id text primary key,
  evidence_block_id text not null,
  user_id uuid not null,
  observation_v2_scene_observation_id text not null,
  scene_id text null,
  role text not null,
  created_at timestamptz not null default now(),
  constraint latent_opportunity_evidence_observations_block_owner_fk foreign key (evidence_block_id, user_id)
    references public.latent_opportunity_evidence_blocks (id, user_id)
    on delete cascade,
  constraint latent_opportunity_evidence_observations_observation_fk foreign key (observation_v2_scene_observation_id)
    references public.observation_v2_scene_observations (id)
    on delete cascade,
  constraint latent_opportunity_evidence_observations_role_check check (
    role in ('primary_support', 'context_support', 'historical_resonance_support', 'contrast_support')
  )
);

create index if not exists latent_opportunity_evidence_observations_block_created_idx
  on public.latent_opportunity_evidence_observations (evidence_block_id, created_at asc);

create table if not exists public.latent_opportunity_glossary_links (
  id text primary key,
  manifestation_id text not null,
  user_id uuid not null,
  glossary_term_id uuid not null,
  role text not null,
  created_at timestamptz not null default now(),
  constraint latent_opportunity_glossary_links_manifestation_owner_fk foreign key (manifestation_id, user_id)
    references public.latent_opportunity_manifestations (id, user_id)
    on delete cascade,
  constraint latent_opportunity_glossary_links_term_owner_fk foreign key (glossary_term_id, user_id)
    references public.glossary_terms (id, user_id)
    on delete cascade,
  constraint latent_opportunity_glossary_links_role_check check (
    role in ('continuity', 'contrast', 'resonance', 'context')
  )
);

create index if not exists latent_opportunity_glossary_links_manifestation_created_idx
  on public.latent_opportunity_glossary_links (manifestation_id, created_at asc);

create or replace function public.touch_latent_opportunity_identities_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_latent_opportunity_manifestations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_latent_opportunity_identities_updated_at on public.latent_opportunity_identities;
create trigger trg_touch_latent_opportunity_identities_updated_at
before update on public.latent_opportunity_identities
for each row
execute function public.touch_latent_opportunity_identities_updated_at();

drop trigger if exists trg_touch_latent_opportunity_manifestations_updated_at on public.latent_opportunity_manifestations;
create trigger trg_touch_latent_opportunity_manifestations_updated_at
before update on public.latent_opportunity_manifestations
for each row
execute function public.touch_latent_opportunity_manifestations_updated_at();

alter table public.latent_opportunity_identities enable row level security;
alter table public.latent_opportunity_manifestations enable row level security;
alter table public.latent_opportunity_evidence_blocks enable row level security;
alter table public.latent_opportunity_evidence_observations enable row level security;
alter table public.latent_opportunity_glossary_links enable row level security;

drop policy if exists latent_opportunity_identities_select_own_active on public.latent_opportunity_identities;
create policy latent_opportunity_identities_select_own_active
on public.latent_opportunity_identities
for select
to authenticated
using (
  auth.uid() = user_id
  and archived_at is null
);

drop policy if exists latent_opportunity_identities_insert_own on public.latent_opportunity_identities;
create policy latent_opportunity_identities_insert_own
on public.latent_opportunity_identities
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists latent_opportunity_identities_update_own on public.latent_opportunity_identities;
create policy latent_opportunity_identities_update_own
on public.latent_opportunity_identities
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists latent_opportunity_manifestations_select_own_active on public.latent_opportunity_manifestations;
create policy latent_opportunity_manifestations_select_own_active
on public.latent_opportunity_manifestations
for select
to authenticated
using (
  auth.uid() = user_id
  and archived_at is null
);

drop policy if exists latent_opportunity_manifestations_insert_own on public.latent_opportunity_manifestations;
create policy latent_opportunity_manifestations_insert_own
on public.latent_opportunity_manifestations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists latent_opportunity_manifestations_update_own on public.latent_opportunity_manifestations;
create policy latent_opportunity_manifestations_update_own
on public.latent_opportunity_manifestations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists latent_opportunity_evidence_blocks_select_own on public.latent_opportunity_evidence_blocks;
create policy latent_opportunity_evidence_blocks_select_own
on public.latent_opportunity_evidence_blocks
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists latent_opportunity_evidence_blocks_insert_own on public.latent_opportunity_evidence_blocks;
create policy latent_opportunity_evidence_blocks_insert_own
on public.latent_opportunity_evidence_blocks
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists latent_opportunity_evidence_blocks_update_own on public.latent_opportunity_evidence_blocks;
create policy latent_opportunity_evidence_blocks_update_own
on public.latent_opportunity_evidence_blocks
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists latent_opportunity_evidence_observations_select_own on public.latent_opportunity_evidence_observations;
create policy latent_opportunity_evidence_observations_select_own
on public.latent_opportunity_evidence_observations
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists latent_opportunity_evidence_observations_insert_own on public.latent_opportunity_evidence_observations;
create policy latent_opportunity_evidence_observations_insert_own
on public.latent_opportunity_evidence_observations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists latent_opportunity_evidence_observations_update_own on public.latent_opportunity_evidence_observations;
create policy latent_opportunity_evidence_observations_update_own
on public.latent_opportunity_evidence_observations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists latent_opportunity_glossary_links_select_own on public.latent_opportunity_glossary_links;
create policy latent_opportunity_glossary_links_select_own
on public.latent_opportunity_glossary_links
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists latent_opportunity_glossary_links_insert_own on public.latent_opportunity_glossary_links;
create policy latent_opportunity_glossary_links_insert_own
on public.latent_opportunity_glossary_links
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists latent_opportunity_glossary_links_update_own on public.latent_opportunity_glossary_links;
create policy latent_opportunity_glossary_links_update_own
on public.latent_opportunity_glossary_links
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
