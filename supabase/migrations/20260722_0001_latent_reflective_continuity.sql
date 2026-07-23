create table if not exists public.latent_opportunity_lifecycle_events (
  id text primary key,
  user_id uuid not null,
  identity_id text not null,
  event_type text not null,
  prior_lifecycle_state text null,
  resulting_lifecycle_state text not null,
  source_generation_run_id text null,
  resulting_generation_run_id text null,
  source_manifestation_ids text[] not null default '{}'::text[],
  resulting_manifestation_ids text[] not null default '{}'::text[],
  related_identity_ids text[] not null default '{}'::text[],
  triggering_reflective_object_id uuid null,
  triggering_reflection_id text null,
  created_at timestamptz not null default now(),
  constraint latent_opportunity_lifecycle_events_identity_owner_fk foreign key (identity_id, user_id)
    references public.latent_opportunity_identities (id, user_id)
    on delete cascade,
  constraint latent_opportunity_lifecycle_events_source_run_owner_fk foreign key (
    source_generation_run_id,
    user_id,
    triggering_reflective_object_id
  )
    references public.latent_opportunity_generation_runs (id, user_id, priority_reflective_object_id)
    on delete restrict,
  constraint latent_opportunity_lifecycle_events_resulting_run_owner_fk foreign key (
    resulting_generation_run_id,
    user_id,
    triggering_reflective_object_id
  )
    references public.latent_opportunity_generation_runs (id, user_id, priority_reflective_object_id)
    on delete restrict,
  constraint latent_opportunity_lifecycle_events_event_type_check check (
    event_type in (
      'emergence',
      'reinforcement',
      'expansion',
      'recontextualization',
      'reversal',
      'weakening',
      'reactivation',
      'split',
      'merge',
      'abandonment',
      'superseded_by_recomposition'
    )
  )
);

create index if not exists latent_opportunity_lifecycle_events_identity_created_idx
  on public.latent_opportunity_lifecycle_events (identity_id, created_at asc, id asc);

alter table public.latent_opportunity_lifecycle_events enable row level security;

drop policy if exists latent_opportunity_lifecycle_events_select_own on public.latent_opportunity_lifecycle_events;
create policy latent_opportunity_lifecycle_events_select_own
on public.latent_opportunity_lifecycle_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists latent_opportunity_lifecycle_events_insert_own on public.latent_opportunity_lifecycle_events;
create policy latent_opportunity_lifecycle_events_insert_own
on public.latent_opportunity_lifecycle_events
for insert
to authenticated
with check (auth.uid() = user_id);

create table if not exists public.latent_opportunity_identity_relationships (
  id text primary key,
  user_id uuid not null,
  source_identity_id text not null,
  target_identity_id text not null,
  relationship_type text not null,
  establishing_lifecycle_event_id text not null,
  created_at timestamptz not null default now(),
  constraint latent_opportunity_identity_relationships_source_owner_fk foreign key (source_identity_id, user_id)
    references public.latent_opportunity_identities (id, user_id)
    on delete cascade,
  constraint latent_opportunity_identity_relationships_target_owner_fk foreign key (target_identity_id, user_id)
    references public.latent_opportunity_identities (id, user_id)
    on delete cascade,
  constraint latent_opportunity_identity_relationships_event_fk foreign key (establishing_lifecycle_event_id)
    references public.latent_opportunity_lifecycle_events (id)
    on delete restrict,
  constraint latent_opportunity_identity_relationships_self_check check (source_identity_id <> target_identity_id),
  constraint latent_opportunity_identity_relationships_type_check check (relationship_type in ('split', 'merge'))
);

create unique index if not exists latent_opportunity_identity_relationships_unique_idx
  on public.latent_opportunity_identity_relationships (
    user_id,
    source_identity_id,
    target_identity_id,
    relationship_type,
    establishing_lifecycle_event_id
  );

alter table public.latent_opportunity_identity_relationships enable row level security;

drop policy if exists latent_opportunity_identity_relationships_select_own on public.latent_opportunity_identity_relationships;
create policy latent_opportunity_identity_relationships_select_own
on public.latent_opportunity_identity_relationships
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists latent_opportunity_identity_relationships_insert_own on public.latent_opportunity_identity_relationships;
create policy latent_opportunity_identity_relationships_insert_own
on public.latent_opportunity_identity_relationships
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists latent_opportunity_identities_update_own on public.latent_opportunity_identities;
drop policy if exists latent_opportunity_manifestations_update_own on public.latent_opportunity_manifestations;
drop policy if exists latent_opportunity_evidence_blocks_update_own on public.latent_opportunity_evidence_blocks;
drop policy if exists latent_opportunity_evidence_observations_update_own on public.latent_opportunity_evidence_observations;
drop policy if exists latent_opportunity_glossary_links_update_own on public.latent_opportunity_glossary_links;
drop policy if exists latent_opportunity_generation_runs_update_own on public.latent_opportunity_generation_runs;

create or replace function public.latent_continuity_write_authorized()
returns boolean
language sql
stable
as $$
  select current_setting('app.latent_continuity_write_authorized', true) = 'accept_generation_run';
$$;

create or replace function public.guard_latent_authority_insert()
returns trigger
language plpgsql
as $$
begin
  if not public.latent_continuity_write_authorized() then
    raise exception 'Accepted latent authority writes must occur through the accepted continuity seam.';
  end if;

  return new;
end;
$$;

create or replace function public.guard_latent_identity_authority_update()
returns trigger
language plpgsql
as $$
begin
  if not public.latent_continuity_write_authorized() then
    raise exception 'Latent identity authority updates must occur through the accepted continuity seam.';
  end if;

  if row_to_json(new)::jsonb - array['lifecycle_state', 'updated_at'] <> row_to_json(old)::jsonb - array['lifecycle_state', 'updated_at'] then
    raise exception 'Latent identity authority fields are immutable outside accepted continuity projection updates.';
  end if;

  return new;
end;
$$;

create or replace function public.guard_latent_generation_run_authority_update()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'pending' and new.status in ('failed', 'rejected', 'empty', 'no_change') then
    return new;
  end if;

  if not public.latent_continuity_write_authorized() then
    raise exception 'Latent generation-run authority updates must occur through the accepted continuity seam.';
  end if;

  if row_to_json(new)::jsonb - array['status', 'accepted_at', 'superseded_at', 'updated_at'] <> row_to_json(old)::jsonb - array['status', 'accepted_at', 'superseded_at', 'updated_at'] then
    raise exception 'Latent generation-run authority fields are immutable outside accepted continuity projection updates.';
  end if;

  return new;
end;
$$;

create or replace function public.raise_latent_continuity_history_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Lifecycle continuity history is append-only.';
end;
$$;

drop trigger if exists trg_latent_opportunity_lifecycle_events_immutable on public.latent_opportunity_lifecycle_events;
create trigger trg_latent_opportunity_lifecycle_events_immutable
before update or delete on public.latent_opportunity_lifecycle_events
for each row
execute function public.raise_latent_continuity_history_immutable();

drop trigger if exists trg_latent_opportunity_identities_insert_guard on public.latent_opportunity_identities;
create trigger trg_latent_opportunity_identities_insert_guard
before insert on public.latent_opportunity_identities
for each row
execute function public.guard_latent_authority_insert();

drop trigger if exists trg_latent_opportunity_manifestations_insert_guard on public.latent_opportunity_manifestations;
create trigger trg_latent_opportunity_manifestations_insert_guard
before insert on public.latent_opportunity_manifestations
for each row
execute function public.guard_latent_authority_insert();

drop trigger if exists trg_latent_opportunity_evidence_blocks_insert_guard on public.latent_opportunity_evidence_blocks;
create trigger trg_latent_opportunity_evidence_blocks_insert_guard
before insert on public.latent_opportunity_evidence_blocks
for each row
execute function public.guard_latent_authority_insert();

drop trigger if exists trg_latent_opportunity_evidence_observations_insert_guard on public.latent_opportunity_evidence_observations;
create trigger trg_latent_opportunity_evidence_observations_insert_guard
before insert on public.latent_opportunity_evidence_observations
for each row
execute function public.guard_latent_authority_insert();

drop trigger if exists trg_latent_opportunity_glossary_links_insert_guard on public.latent_opportunity_glossary_links;
create trigger trg_latent_opportunity_glossary_links_insert_guard
before insert on public.latent_opportunity_glossary_links
for each row
execute function public.guard_latent_authority_insert();

drop trigger if exists trg_latent_opportunity_lifecycle_events_insert_guard on public.latent_opportunity_lifecycle_events;
create trigger trg_latent_opportunity_lifecycle_events_insert_guard
before insert on public.latent_opportunity_lifecycle_events
for each row
execute function public.guard_latent_authority_insert();

drop trigger if exists trg_latent_opportunity_identity_relationships_immutable on public.latent_opportunity_identity_relationships;
create trigger trg_latent_opportunity_identity_relationships_immutable
before update or delete on public.latent_opportunity_identity_relationships
for each row
execute function public.raise_latent_continuity_history_immutable();

drop trigger if exists trg_latent_opportunity_identity_relationships_insert_guard on public.latent_opportunity_identity_relationships;
create trigger trg_latent_opportunity_identity_relationships_insert_guard
before insert on public.latent_opportunity_identity_relationships
for each row
execute function public.guard_latent_authority_insert();

drop trigger if exists trg_latent_opportunity_identities_update_guard on public.latent_opportunity_identities;
create trigger trg_latent_opportunity_identities_update_guard
before update on public.latent_opportunity_identities
for each row
execute function public.guard_latent_identity_authority_update();

drop trigger if exists trg_latent_opportunity_generation_runs_update_guard on public.latent_opportunity_generation_runs;
create trigger trg_latent_opportunity_generation_runs_update_guard
before update on public.latent_opportunity_generation_runs
for each row
execute function public.guard_latent_generation_run_authority_update();

create or replace function public.accept_latent_generation_run_successor(
  p_user_id uuid,
  p_predecessor_run_id text,
  p_successor_run_id text,
  p_identities jsonb,
  p_manifestations jsonb,
  p_lifecycle_events jsonb,
  p_identity_relationships jsonb
)
returns public.latent_opportunity_generation_runs
language plpgsql
security definer
as $$
declare
  v_predecessor public.latent_opportunity_generation_runs%rowtype;
  v_successor public.latent_opportunity_generation_runs%rowtype;
begin
  perform set_config('app.latent_continuity_write_authorized', 'accept_generation_run', true);

  if p_predecessor_run_id is not null then
    select *
    into v_predecessor
    from public.latent_opportunity_generation_runs
    where id = p_predecessor_run_id
      and user_id = p_user_id
      and status = 'current'
      and superseded_at is null
    for update;

    if not found then
      raise exception 'Predecessor run is not the current accepted run.';
    end if;
  end if;

  select *
  into v_successor
  from public.latent_opportunity_generation_runs
  where id = p_successor_run_id
    and user_id = p_user_id
    and (
      p_predecessor_run_id is null
      or priority_reflective_object_id = v_predecessor.priority_reflective_object_id
    )
    and status = 'pending'
  for update;

  if not found then
    raise exception 'Successor run is not pending or does not match predecessor scope.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_identities, '[]'::jsonb)) as identity_row(
      id text,
      user_id uuid
    )
    where identity_row.user_id <> p_user_id
  ) then
    raise exception 'Identity rows must remain user-owned by the accepted authority operation.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_manifestations, '[]'::jsonb)) as manifestation_row(
      id text,
      generation_run_id text,
      identity_id text,
      user_id uuid,
      priority_reflective_object_id uuid,
      summary text,
      structure_payload jsonb,
      primary_category text,
      secondary_categories text[],
      credibility_score double precision,
      reflective_potential_score double precision,
      salience_band text,
      salience_rationale jsonb,
      construction_metadata jsonb
    )
    where manifestation_row.user_id <> p_user_id
       or manifestation_row.generation_run_id <> p_successor_run_id
       or manifestation_row.priority_reflective_object_id <> v_successor.priority_reflective_object_id
  ) then
    raise exception 'Manifestation rows must remain scoped to the accepted successor run.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_lifecycle_events, '[]'::jsonb)) as evt(
      id text,
      user_id uuid,
      identity_id text,
      event_type text,
      prior_lifecycle_state text,
      resulting_lifecycle_state text,
      source_generation_run_id text,
      resulting_generation_run_id text,
      source_manifestation_ids text[],
      resulting_manifestation_ids text[],
      related_identity_ids text[],
      triggering_reflective_object_id uuid,
      triggering_reflection_id text
    )
    where evt.user_id <> p_user_id
       or evt.resulting_generation_run_id <> p_successor_run_id
       or evt.triggering_reflective_object_id <> v_successor.priority_reflective_object_id
  ) then
    raise exception 'Lifecycle rows must remain scoped to the accepted successor run.';
  end if;

  insert into public.latent_opportunity_identities (
    id,
    user_id,
    title,
    primary_category,
    secondary_categories,
    lifecycle_state,
    status
  )
  select
    identity_row.id,
    identity_row.user_id,
    identity_row.title,
    identity_row.primary_category,
    coalesce(identity_row.secondary_categories, '{}'::text[]),
    identity_row.lifecycle_state,
    coalesce(identity_row.status, 'active')
  from jsonb_to_recordset(coalesce(p_identities, '[]'::jsonb)) as identity_row(
    id text,
    user_id uuid,
    title text,
    primary_category text,
    secondary_categories text[],
    lifecycle_state text,
    status text
  );

  insert into public.latent_opportunity_manifestations (
    id,
    generation_run_id,
    identity_id,
    user_id,
    priority_reflective_object_id,
    summary,
    structure_payload,
    primary_category,
    secondary_categories,
    credibility_score,
    reflective_potential_score,
    salience_band,
    salience_rationale,
    construction_metadata
  )
  select
    manifestation_row.id,
    manifestation_row.generation_run_id,
    manifestation_row.identity_id,
    manifestation_row.user_id,
    manifestation_row.priority_reflective_object_id,
    manifestation_row.summary,
    coalesce(manifestation_row.structure_payload, '{}'::jsonb),
    manifestation_row.primary_category,
    coalesce(manifestation_row.secondary_categories, '{}'::text[]),
    manifestation_row.credibility_score,
    manifestation_row.reflective_potential_score,
    manifestation_row.salience_band,
    coalesce(manifestation_row.salience_rationale, '{}'::jsonb),
    coalesce(manifestation_row.construction_metadata, '{}'::jsonb)
  from jsonb_to_recordset(coalesce(p_manifestations, '[]'::jsonb)) as manifestation_row(
    id text,
    generation_run_id text,
    identity_id text,
    user_id uuid,
    priority_reflective_object_id uuid,
    summary text,
    structure_payload jsonb,
    primary_category text,
    secondary_categories text[],
    credibility_score double precision,
    reflective_potential_score double precision,
    salience_band text,
    salience_rationale jsonb,
    construction_metadata jsonb
  );

  insert into public.latent_opportunity_evidence_blocks (
    id,
    manifestation_id,
    user_id,
    reflective_object_id,
    role,
    summary,
    position
  )
  select
    block_row.id,
    block_row.manifestation_id,
    p_user_id,
    block_row.reflective_object_id,
    block_row.role,
    block_row.summary,
    block_row.position
  from jsonb_to_recordset(coalesce(p_manifestations, '[]'::jsonb)) as manifestation_row(
    id text,
    evidence_blocks jsonb
  )
  cross join lateral jsonb_to_recordset(coalesce(manifestation_row.evidence_blocks, '[]'::jsonb)) as block_row(
    id text,
    manifestation_id text,
    reflective_object_id uuid,
    role text,
    summary text,
    position integer,
    observations jsonb
  );

  insert into public.latent_opportunity_evidence_observations (
    id,
    evidence_block_id,
    user_id,
    observation_v2_scene_observation_id,
    scene_id,
    role,
    supports_node_keys,
    supports_edge_indexes
  )
  select
    observation_row.id,
    observation_row.evidence_block_id,
    p_user_id,
    observation_row.observation_v2_scene_observation_id,
    observation_row.scene_id,
    observation_row.role,
    coalesce(observation_row.supports_node_keys, '{}'::text[]),
    coalesce(observation_row.supports_edge_indexes, '{}'::integer[])
  from jsonb_to_recordset(coalesce(p_manifestations, '[]'::jsonb)) as manifestation_row(
    evidence_blocks jsonb
  )
  cross join lateral jsonb_to_recordset(coalesce(manifestation_row.evidence_blocks, '[]'::jsonb)) as block_row(
    observations jsonb
  )
  cross join lateral jsonb_to_recordset(coalesce(block_row.observations, '[]'::jsonb)) as observation_row(
    id text,
    evidence_block_id text,
    observation_v2_scene_observation_id text,
    scene_id text,
    role text,
    supports_node_keys text[],
    supports_edge_indexes integer[]
  );

  insert into public.latent_opportunity_glossary_links (
    id,
    manifestation_id,
    user_id,
    glossary_term_id,
    role
  )
  select
    glossary_row.id,
    glossary_row.manifestation_id,
    p_user_id,
    glossary_row.glossary_term_id,
    glossary_row.role
  from jsonb_to_recordset(coalesce(p_manifestations, '[]'::jsonb)) as manifestation_row(
    glossary_links jsonb
  )
  cross join lateral jsonb_to_recordset(coalesce(manifestation_row.glossary_links, '[]'::jsonb)) as glossary_row(
    id text,
    manifestation_id text,
    glossary_term_id uuid,
    role text
  );

  insert into public.latent_opportunity_lifecycle_events (
    id,
    user_id,
    identity_id,
    event_type,
    prior_lifecycle_state,
    resulting_lifecycle_state,
    source_generation_run_id,
    resulting_generation_run_id,
    source_manifestation_ids,
    resulting_manifestation_ids,
    related_identity_ids,
    triggering_reflective_object_id,
    triggering_reflection_id
  )
  select
    evt.id,
    evt.user_id,
    evt.identity_id,
    evt.event_type,
    evt.prior_lifecycle_state,
    evt.resulting_lifecycle_state,
    evt.source_generation_run_id,
    evt.resulting_generation_run_id,
    coalesce(evt.source_manifestation_ids, '{}'::text[]),
    coalesce(evt.resulting_manifestation_ids, '{}'::text[]),
    coalesce(evt.related_identity_ids, '{}'::text[]),
    evt.triggering_reflective_object_id,
    evt.triggering_reflection_id
  from jsonb_to_recordset(coalesce(p_lifecycle_events, '[]'::jsonb)) as evt(
    id text,
    user_id uuid,
    identity_id text,
    event_type text,
    prior_lifecycle_state text,
    resulting_lifecycle_state text,
    source_generation_run_id text,
    resulting_generation_run_id text,
    source_manifestation_ids text[],
    resulting_manifestation_ids text[],
    related_identity_ids text[],
    triggering_reflective_object_id uuid,
    triggering_reflection_id text
  );

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_identity_relationships, '[]'::jsonb)) as rel(
      id text,
      user_id uuid,
      source_identity_id text,
      target_identity_id text,
      relationship_type text,
      establishing_lifecycle_event_id text
    )
    left join public.latent_opportunity_lifecycle_events evt
      on evt.id = rel.establishing_lifecycle_event_id
     and evt.user_id = rel.user_id
    where rel.user_id <> p_user_id
       or rel.source_identity_id = rel.target_identity_id
       or evt.id is null
       or evt.identity_id not in (rel.source_identity_id, rel.target_identity_id)
       or (
         rel.relationship_type = 'split'
         and evt.event_type <> 'split'
       )
       or (
         rel.relationship_type = 'merge'
         and evt.event_type <> 'merge'
       )
  ) then
    raise exception 'Identity relationships must be anchored by matching split or merge lifecycle events.';
  end if;

  insert into public.latent_opportunity_identity_relationships (
    id,
    user_id,
    source_identity_id,
    target_identity_id,
    relationship_type,
    establishing_lifecycle_event_id
  )
  select
    rel.id,
    rel.user_id,
    rel.source_identity_id,
    rel.target_identity_id,
    rel.relationship_type,
    rel.establishing_lifecycle_event_id
  from jsonb_to_recordset(coalesce(p_identity_relationships, '[]'::jsonb)) as rel(
    id text,
    user_id uuid,
    source_identity_id text,
    target_identity_id text,
    relationship_type text,
    establishing_lifecycle_event_id text
  );

  update public.latent_opportunity_identities as identity_row
  set lifecycle_state = projected.resulting_lifecycle_state
  from (
    select distinct on (evt.identity_id)
      evt.identity_id,
      evt.resulting_lifecycle_state
    from public.latent_opportunity_lifecycle_events evt
    join (
      select distinct lifecycle_input.identity_id
      from jsonb_to_recordset(coalesce(p_lifecycle_events, '[]'::jsonb)) as lifecycle_input(
        identity_id text
      )
    ) affected on affected.identity_id = evt.identity_id
    where evt.user_id = p_user_id
    order by evt.identity_id, evt.created_at desc, evt.id desc
  ) projected
  where identity_row.id = projected.identity_id
    and identity_row.user_id = p_user_id;

  update public.latent_opportunity_generation_runs
  set status = 'superseded',
      superseded_at = now()
  where p_predecessor_run_id is not null
    and id = v_predecessor.id
    and user_id = p_user_id
    and status = 'current'
    and superseded_at is null;

  update public.latent_opportunity_generation_runs
  set status = 'current',
      accepted_at = now()
  where id = v_successor.id
    and user_id = p_user_id
    and status = 'pending';

  return (
    select run
    from public.latent_opportunity_generation_runs as run
    where run.id = p_successor_run_id
      and run.user_id = p_user_id
  );
end;
$$;
