do $$
declare
  v_generation_family_exists boolean;
  v_generation_family_has_null boolean;
  v_generation_family_has_v3 boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'latent_opportunity_generation_runs'
      and column_name = 'observation_authority_family'
  )
  into v_generation_family_exists;

  if not v_generation_family_exists then
    alter table public.latent_opportunity_generation_runs
      add column observation_authority_family text not null default 'observation_v2';
  else
    execute $sql$
      select
        exists (
          select 1
          from public.latent_opportunity_generation_runs
          where observation_authority_family is null
        ),
        exists (
          select 1
          from public.latent_opportunity_generation_runs
          where observation_authority_family = 'observation_v3'
        )
    $sql$
    into v_generation_family_has_null, v_generation_family_has_v3;

    if v_generation_family_has_null and not v_generation_family_has_v3 then
      alter table public.latent_opportunity_generation_runs
        drop column if exists observation_authority_family;

      alter table public.latent_opportunity_generation_runs
        add column observation_authority_family text not null default 'observation_v2';
    else
      alter table public.latent_opportunity_generation_runs
        alter column observation_authority_family set default 'observation_v2';

      if v_generation_family_has_null then
        raise exception 'Cannot finalize latent observation-family migration with mixed V3 generation-run family state.';
      end if;

      alter table public.latent_opportunity_generation_runs
        alter column observation_authority_family set not null;
    end if;
  end if;
end
$$;

alter table public.latent_opportunity_generation_runs
  drop constraint if exists latent_opportunity_generation_runs_observation_authority_family_check;

alter table public.latent_opportunity_generation_runs
  add constraint latent_opportunity_generation_runs_observation_authority_family_check check (
    observation_authority_family in ('observation_v2', 'observation_v3')
  );

do $$
declare
  v_evidence_family_exists boolean;
  v_evidence_v3_authority_exists boolean;
  v_evidence_v3_unit_exists boolean;
  v_evidence_v3_locality_exists boolean;
  v_evidence_v3_evidence_exists boolean;
  v_evidence_family_has_null boolean;
  v_evidence_has_v3_data boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'latent_opportunity_evidence_observations'
      and column_name = 'observation_family'
  )
  into v_evidence_family_exists;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'latent_opportunity_evidence_observations'
      and column_name = 'observation_v3_authority_id'
  )
  into v_evidence_v3_authority_exists;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'latent_opportunity_evidence_observations'
      and column_name = 'observation_v3_unit_id'
  )
  into v_evidence_v3_unit_exists;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'latent_opportunity_evidence_observations'
      and column_name = 'observation_v3_locality_id'
  )
  into v_evidence_v3_locality_exists;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'latent_opportunity_evidence_observations'
      and column_name = 'observation_v3_evidence_id'
  )
  into v_evidence_v3_evidence_exists;

  if not v_evidence_family_exists then
    alter table public.latent_opportunity_evidence_observations
      add column observation_family text not null default 'observation_v2',
      add column if not exists observation_v3_authority_id text null,
      add column if not exists observation_v3_unit_id text null,
      add column if not exists observation_v3_locality_id text null,
      add column if not exists observation_v3_evidence_id text null;
  else
    execute $sql$
      select
        exists (
          select 1
          from public.latent_opportunity_evidence_observations
          where observation_family is null
        ),
        exists (
          select 1
          from public.latent_opportunity_evidence_observations
          where observation_family = 'observation_v3'
             or observation_v3_authority_id is not null
             or observation_v3_unit_id is not null
             or observation_v3_locality_id is not null
             or observation_v3_evidence_id is not null
        )
    $sql$
    into v_evidence_family_has_null, v_evidence_has_v3_data;

    if (v_evidence_family_has_null or not v_evidence_v3_authority_exists or not v_evidence_v3_unit_exists or not v_evidence_v3_locality_exists or not v_evidence_v3_evidence_exists)
       and not v_evidence_has_v3_data then
      alter table public.latent_opportunity_evidence_observations
        drop column if exists observation_family,
        drop column if exists observation_v3_authority_id,
        drop column if exists observation_v3_unit_id,
        drop column if exists observation_v3_locality_id,
        drop column if exists observation_v3_evidence_id;

      alter table public.latent_opportunity_evidence_observations
        add column observation_family text not null default 'observation_v2',
        add column if not exists observation_v3_authority_id text null,
        add column if not exists observation_v3_unit_id text null,
        add column if not exists observation_v3_locality_id text null,
        add column if not exists observation_v3_evidence_id text null;
    else
      alter table public.latent_opportunity_evidence_observations
        alter column observation_family set default 'observation_v2';

      if v_evidence_family_has_null then
        raise exception 'Cannot finalize latent observation-family migration with mixed V3 evidence-family state.';
      end if;

      alter table public.latent_opportunity_evidence_observations
        alter column observation_family set not null;

      alter table public.latent_opportunity_evidence_observations
        add column if not exists observation_v3_authority_id text null,
        add column if not exists observation_v3_unit_id text null,
        add column if not exists observation_v3_locality_id text null,
        add column if not exists observation_v3_evidence_id text null;
    end if;
  end if;

  alter table public.latent_opportunity_evidence_observations
    alter column observation_v2_scene_observation_id drop not null;
end
$$;

alter table public.latent_opportunity_evidence_observations
  drop constraint if exists latent_opportunity_evidence_observations_family_check;

alter table public.latent_opportunity_evidence_observations
  add constraint latent_opportunity_evidence_observations_family_check check (
    observation_family in ('observation_v2', 'observation_v3')
  );

alter table public.latent_opportunity_evidence_observations
  drop constraint if exists latent_opportunity_evidence_observations_reference_shape_check;

alter table public.latent_opportunity_evidence_observations
  add constraint latent_opportunity_evidence_observations_reference_shape_check check (
    (
      observation_family = 'observation_v2'
      and observation_v2_scene_observation_id is not null
      and observation_v3_authority_id is null
      and observation_v3_unit_id is null
      and observation_v3_locality_id is null
      and observation_v3_evidence_id is null
    )
    or (
      observation_family = 'observation_v3'
      and observation_v2_scene_observation_id is null
      and observation_v3_authority_id is not null
      and observation_v3_unit_id is not null
    )
  );

create index if not exists latent_opportunity_evidence_observations_v3_reference_idx
  on public.latent_opportunity_evidence_observations (
    observation_v3_authority_id,
    observation_v3_unit_id
  )
  where observation_family = 'observation_v3';

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
    observation_family,
    observation_v2_scene_observation_id,
    scene_id,
    observation_v3_authority_id,
    observation_v3_unit_id,
    observation_v3_locality_id,
    observation_v3_evidence_id,
    role,
    supports_node_keys,
    supports_edge_indexes
  )
  select
    observation_row.id,
    observation_row.evidence_block_id,
    p_user_id,
    coalesce(observation_row.observation_family, 'observation_v2'),
    observation_row.observation_v2_scene_observation_id,
    observation_row.scene_id,
    observation_row.observation_v3_authority_id,
    observation_row.observation_v3_unit_id,
    observation_row.observation_v3_locality_id,
    observation_row.observation_v3_evidence_id,
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
    observation_family text,
    observation_v2_scene_observation_id text,
    scene_id text,
    observation_v3_authority_id text,
    observation_v3_unit_id text,
    observation_v3_locality_id text,
    observation_v3_evidence_id text,
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
