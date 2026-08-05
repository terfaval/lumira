-- READ-ONLY DIAGNOSTIC UTILITY.
-- MANUAL EXECUTION ONLY.
-- REPLACE THE DREAM UUID ONCE BELOW, THEN RUN THE ENTIRE FILE.
-- THIS SCRIPT CREATES TEMPORARY SESSION-SCOPED VIEWS IN pg_temp ONLY.
-- IT DOES NOT MODIFY PERSISTENT DATA OR PERSISTENT SCHEMA OBJECTS.

drop view if exists pg_temp.selected_dream_scope;
create temporary view selected_dream_scope as
select
  '00000000-0000-0000-0000-000000000000'::uuid as dream_id;

drop view if exists pg_temp.selected_dream_row;
create temporary view selected_dream_row as
select ro.*
from public.reflective_objects ro
join selected_dream_scope scope
  on scope.dream_id = ro.id
where ro.object_type = 'dream';

drop view if exists pg_temp.dream_observations;
create temporary view dream_observations as
select o.*
from public.observations o
join selected_dream_row d
  on d.id = o.reflective_object_id
 and d.user_id = o.user_id;

drop view if exists pg_temp.dream_observation_fragments;
create temporary view dream_observation_fragments as
select ofr.*
from public.observation_fragments ofr
join dream_observations o
  on o.id = ofr.observation_id
 and o.user_id = ofr.user_id;

drop view if exists pg_temp.dream_observation_v2_bundles;
create temporary view dream_observation_v2_bundles as
select b.*
from public.observation_v2_bundles b
join selected_dream_row d
  on d.id = b.reflective_object_id
 and d.user_id = b.user_id;

drop view if exists pg_temp.dream_observation_v2_scenes;
create temporary view dream_observation_v2_scenes as
select s.*
from public.observation_v2_scenes s
join dream_observation_v2_bundles b
  on b.id = s.bundle_id;

drop view if exists pg_temp.dream_observation_v2_scene_observations;
create temporary view dream_observation_v2_scene_observations as
select so.*
from public.observation_v2_scene_observations so
join dream_observation_v2_scenes s
  on s.id = so.scene_row_id;

drop view if exists pg_temp.dream_glossary_terms;
create temporary view dream_glossary_terms as
select distinct gt.*
from public.glossary_terms gt
join selected_dream_row d
  on d.user_id = gt.user_id
where exists (
    select 1
    from public.glossary_appearance_records gar
    where gar.entity_id = gt.id
      and gar.user_id = gt.user_id
      and gar.dream_id = d.id
  )
   or exists (
    select 1
    from public.glossary_associations ga
    left join dream_observations o
      on o.id::text = ga.observation_id
     and o.user_id = ga.user_id
    left join dream_observation_fragments ofr
      on ofr.id::text = ga.observation_fragment_id
     and ofr.user_id = ga.user_id
    where ga.glossary_term_id = gt.id
      and ga.user_id = gt.user_id
      and (
        ga.reflective_object_id = d.id
        or o.id is not null
        or ofr.id is not null
      )
  )
   or exists (
    select 1
    from public.thread_glossary_associations tga
    join public.thread_object_associations toa
      on toa.thread_id = tga.thread_id
     and toa.user_id = tga.user_id
    where tga.glossary_term_id = gt.id
      and tga.user_id = gt.user_id
      and toa.reflective_object_id = d.id
  );

drop view if exists pg_temp.dream_latent_snapshots;
create temporary view dream_latent_snapshots as
select ls.*
from public.latent_snapshots ls
join selected_dream_row d
  on d.user_id = ls.user_id
where d.id = any (ls.source_reflective_objects)
   or exists (
    select 1
    from dream_observations o
    where o.id = any (ls.source_observations::uuid[])
  );

drop view if exists pg_temp.dream_openings;
create temporary view dream_openings as
select o.*
from public.openings o
join selected_dream_row d
  on d.user_id = o.user_id
where d.id = any (o.source_objects)
   or o.source_opportunity_manifestation_id in (
     select manifestation.id
     from public.latent_opportunity_manifestations manifestation
     where manifestation.user_id = d.user_id
       and manifestation.priority_reflective_object_id = d.id
   )
   or exists (
    select 1
    from dream_latent_snapshots ls
    where ls.id = o.latent_snapshot_id
      and ls.user_id = o.user_id
  )
   or exists (
   select 1
    from dream_observations legacy_o
    where legacy_o.id = any (coalesce(o.source_observations, '{}'::uuid[]))
  );

drop view if exists pg_temp.dream_threads;
create temporary view dream_threads as
select distinct t.*
from public.reflective_threads t
join selected_dream_row d
  on d.user_id = t.user_id
where exists (
    select 1
    from public.thread_object_associations toa
    where toa.thread_id = t.id
      and toa.user_id = t.user_id
      and toa.reflective_object_id = d.id
  )
   or exists (
    select 1
    from public.opening_response_associations ora
    join dream_openings o
      on o.id = ora.opening_id
     and o.user_id = ora.user_id
    where ora.thread_id = t.id
      and ora.user_id = t.user_id
  )
   or exists (
    select 1
    from public.reflection_candidates rc
    where rc.thread_id = t.id
      and rc.user_id = t.user_id
      and d.id = any (rc.source_reflective_object_ids)
  )
   or exists (
    select 1
    from public.reflections r
    where r.thread_id = t.id
      and r.user_id = t.user_id
      and d.id = any (r.source_reflective_object_ids)
  );

drop view if exists pg_temp.dream_responses;
create temporary view dream_responses as
select distinct r.*
from public.reflective_responses r
join selected_dream_row d
  on d.user_id = r.user_id
where exists (
    select 1
    from public.response_object_associations roa
    where roa.response_id = r.id
      and roa.user_id = r.user_id
      and roa.reflective_object_id = d.id
  )
   or exists (
    select 1
    from public.response_thread_associations rta
    join dream_threads t
      on t.id = rta.thread_id
     and t.user_id = rta.user_id
    where rta.response_id = r.id
      and rta.user_id = r.user_id
  )
   or exists (
    select 1
    from public.opening_activation_events oae
    join dream_openings o
      on o.id = oae.opening_id
     and o.user_id = oae.user_id
    where oae.response_id = r.id
      and oae.user_id = r.user_id
  )
   or exists (
    select 1
    from public.opening_response_associations ora
    join dream_openings o
      on o.id = ora.opening_id
     and o.user_id = ora.user_id
    where ora.response_id = r.id
      and ora.user_id = r.user_id
  );

drop view if exists pg_temp.dream_latent_runs;
create temporary view dream_latent_runs as
select gr.*
from public.latent_opportunity_generation_runs gr
join selected_dream_row d
  on d.id = gr.priority_reflective_object_id
 and d.user_id = gr.user_id;

drop view if exists pg_temp.dream_opportunity_manifestations;
create temporary view dream_opportunity_manifestations as
select distinct m.*
from public.latent_opportunity_manifestations m
join selected_dream_row d
  on d.user_id = m.user_id
where m.priority_reflective_object_id = d.id
   or exists (
    select 1
    from public.latent_opportunity_evidence_blocks eb
    where eb.manifestation_id = m.id
      and eb.user_id = m.user_id
      and eb.reflective_object_id = d.id
  );

drop view if exists pg_temp.dream_opportunity_identities;
create temporary view dream_opportunity_identities as
select distinct i.*
from public.latent_opportunity_identities i
join selected_dream_row d
  on d.user_id = i.user_id
where exists (
    select 1
    from dream_opportunity_manifestations m
    where m.identity_id = i.id
      and m.user_id = i.user_id
  )
   or exists (
    select 1
    from public.latent_opportunity_lifecycle_events le
    where le.identity_id = i.id
      and le.user_id = i.user_id
      and le.triggering_reflective_object_id = d.id
  );

drop view if exists pg_temp.dream_anchor_manifestations;
create temporary view dream_anchor_manifestations as
select am.*
from public.anchor_manifestations am
join selected_dream_row d
  on d.id = am.reflective_object_id
 and d.user_id = am.user_id;

drop view if exists pg_temp.dream_anchor_identities;
create temporary view dream_anchor_identities as
select distinct ai.*
from public.anchor_identities ai
join selected_dream_row d
  on d.user_id = ai.user_id
where exists (
    select 1
    from dream_anchor_manifestations am
    where am.anchor_id = ai.id
      and am.user_id = ai.user_id
  )
   or exists (
    select 1
    from public.anchor_participations ap
    join dream_opportunity_identities doi
      on doi.id = ap.opportunity_id
     and doi.user_id = ap.user_id
    where ap.anchor_id = ai.id
      and ap.user_id = ai.user_id
  );

with dream_exists as (
  select exists(select 1 from selected_dream_row) as value
),
glossary_candidate_rows as (
  select gcs.*
  from public.glossary_candidate_states gcs
  join selected_dream_row d
    on d.id = gcs.reflective_object_id
   and d.user_id = gcs.user_id
),
glossary_association_rows as (
  select ga.*
  from public.glossary_associations ga
  join selected_dream_row d
    on d.user_id = ga.user_id
  left join dream_observations o
    on o.id::text = ga.observation_id
   and o.user_id = ga.user_id
  left join dream_observation_fragments ofr
    on ofr.id::text = ga.observation_fragment_id
   and ofr.user_id = ga.user_id
  where ga.reflective_object_id = d.id
     or o.id is not null
     or ofr.id is not null
),
glossary_appearance_rows as (
  select gar.*
  from public.glossary_appearance_records gar
  where gar.dream_id in (select id from selected_dream_row)
),
opening_suppression_rows as (
  select os.*
  from public.opening_suppressions os
  where os.opening_id in (select id from dream_openings)
),
opening_surface_event_rows as (
  select ose.*
  from public.opening_surface_events ose
  where ose.opening_id in (select id from dream_openings)
),
opening_activation_event_rows as (
  select oae.*
  from public.opening_activation_events oae
  where oae.opening_id in (select id from dream_openings)
),
opening_response_association_rows as (
  select ora.*
  from public.opening_response_associations ora
  where ora.opening_id in (select id from dream_openings)
),
thread_object_association_rows as (
  select toa.*
  from public.thread_object_associations toa
  where toa.thread_id in (select id from dream_threads)
),
thread_glossary_association_rows as (
  select tga.*
  from public.thread_glossary_associations tga
  where tga.thread_id in (select id from dream_threads)
),
response_object_association_rows as (
  select roa.*
  from public.response_object_associations roa
  where roa.response_id in (select id from dream_responses)
),
response_thread_association_rows as (
  select rta.*
  from public.response_thread_associations rta
  where rta.response_id in (select id from dream_responses)
),
reflection_candidate_rows as (
  select rc.*
  from public.reflection_candidates rc
  join selected_dream_row d
    on d.user_id = rc.user_id
  where d.id = any (rc.source_reflective_object_ids)
     or rc.thread_id in (select id from dream_threads)
     or rc.source_response_id in (select id from dream_responses)
     or rc.source_opening_id in (select id from dream_openings)
),
reflection_candidate_evidence_rows as (
  select rce.*
  from public.reflection_candidate_evidence rce
  where rce.candidate_id in (select id from reflection_candidate_rows)
),
reflection_rows as (
  select r.*
  from public.reflections r
  join selected_dream_row d
    on d.user_id = r.user_id
  where d.id = any (r.source_reflective_object_ids)
     or r.thread_id in (select id from dream_threads)
     or r.source_response_id in (select id from dream_responses)
     or r.source_opening_id in (select id from dream_openings)
),
latent_generation_invalidation_rows as (
  select lgrie.*
  from public.latent_generation_run_invalidation_events lgrie
  where lgrie.target_generation_run_id in (select id from dream_latent_runs)
),
latent_evidence_block_rows as (
  select eb.*
  from public.latent_opportunity_evidence_blocks eb
  where eb.manifestation_id in (select id from dream_opportunity_manifestations)
),
latent_evidence_observation_rows as (
  select eo.*
  from public.latent_opportunity_evidence_observations eo
  where eo.evidence_block_id in (select id from latent_evidence_block_rows)
),
latent_glossary_link_rows as (
  select logl.*
  from public.latent_opportunity_glossary_links logl
  where logl.manifestation_id in (select id from dream_opportunity_manifestations)
),
latent_lifecycle_rows as (
  select le.*
  from public.latent_opportunity_lifecycle_events le
  join selected_dream_row d
    on d.user_id = le.user_id
  where le.identity_id in (select id from dream_opportunity_identities)
     or le.triggering_reflective_object_id = d.id
     or le.source_generation_run_id in (select id from dream_latent_runs)
     or le.resulting_generation_run_id in (select id from dream_latent_runs)
),
latent_identity_relationship_rows as (
  select lir.*
  from public.latent_opportunity_identity_relationships lir
  where lir.source_identity_id in (select id from dream_opportunity_identities)
     or lir.target_identity_id in (select id from dream_opportunity_identities)
),
anchor_participation_rows as (
  select ap.*
  from public.anchor_participations ap
  where ap.anchor_id in (select id from dream_anchor_identities)
     or ap.anchor_manifestation_id in (select id from dream_anchor_manifestations)
     or ap.opportunity_id in (select id from dream_opportunity_identities)
     or ap.opportunity_manifestation_id in (select id from dream_opportunity_manifestations)
),
diagnostic_multiple_current_runs as (
  select
    gr.user_id,
    gr.priority_reflective_object_id,
    count(*)::bigint as current_run_count
  from public.latent_opportunity_generation_runs gr
  join selected_dream_row d
    on d.id = gr.priority_reflective_object_id
   and d.user_id = gr.user_id
  where gr.status = 'current'
    and gr.superseded_at is null
  group by gr.user_id, gr.priority_reflective_object_id
  having count(*) > 1
),
diagnostic_unresolved_opening_manifestations as (
  select
    o.id as opening_id,
    o.user_id,
    o.source_opportunity_manifestation_id
  from dream_openings o
  left join public.latent_opportunity_manifestations m
    on m.id = o.source_opportunity_manifestation_id
   and m.user_id = o.user_id
  where o.source_opportunity_manifestation_id is not null
    and m.id is null
),
diagnostic_missing_legacy_links as (
  select
    ga.id as glossary_association_id,
    ga.user_id,
    ga.observation_id,
    ga.observation_fragment_id,
    case
      when ga.observation_id is not null and o.id is null then 'missing_observation'
      when ga.observation_fragment_id is not null and ofr.id is null then 'missing_observation_fragment'
      else 'resolved'
    end as diagnostic_status
  from public.glossary_associations ga
  join selected_dream_row d
    on d.user_id = ga.user_id
  left join dream_observations o
    on o.id::text = ga.observation_id
   and o.user_id = ga.user_id
  left join dream_observation_fragments ofr
    on ofr.id::text = ga.observation_fragment_id
   and ofr.user_id = ga.user_id
  where ga.reflective_object_id = d.id
     or ga.observation_id is not null
     or ga.observation_fragment_id is not null
),
diagnostic_indirect_only_rows as (
  select
    'response_via_thread_only'::text as diagnostic_type,
    r.id::text as record_id,
    r.created_at
  from dream_responses r
  where not exists (
      select 1
      from public.response_object_associations roa
      join selected_dream_row d
        on d.id = roa.reflective_object_id
       and d.user_id = roa.user_id
      where roa.response_id = r.id
        and roa.user_id = r.user_id
    )
    and exists (
      select 1
      from public.response_thread_associations rta
      where rta.response_id = r.id
        and rta.user_id = r.user_id
        and rta.thread_id in (select id from dream_threads)
    )
  union all
  select
    'reflection_via_thread_only'::text as diagnostic_type,
    rf.id::text as record_id,
    rf.created_at
  from reflection_rows rf
  where rf.thread_id in (select id from dream_threads)
    and not exists (
      select 1
      from selected_dream_row d
      where d.id = any (rf.source_reflective_object_ids)
    )
),
diagnostic_legacy_surface_counts as (
  select
    'legacy_observations'::text as compatibility_surface,
    count(*)::bigint as row_count
  from dream_observations
  union all
  select
    'legacy_observation_fragments'::text,
    count(*)::bigint
  from dream_observation_fragments
  union all
  select
    'legacy_glossary_associations'::text,
    count(*)::bigint
  from glossary_association_rows
),
final_report as (
  select jsonb_build_object(
    'dream_id', (select dream_id from selected_dream_scope),
    'dream_exists', (select value from dream_exists),
    'message',
      case
        when (select value from dream_exists)
          then 'Dream-scoped constitutional state export generated.'
        else 'No public.reflective_objects dream row exists for the supplied dream_id.'
      end,
    'tables',
    jsonb_build_array(
      jsonb_build_object(
        'table_name', 'public.reflective_objects',
        'status', case when exists (select 1 from selected_dream_row) then 'present' else 'expected_but_empty' end,
        'message', case when exists (select 1 from selected_dream_row) then 'Dream root row found.' else 'This dream root row should exist for a valid dream id, but no row was found.' end,
        'row_count', (select count(*) from selected_dream_row),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from selected_dream_row t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.observations',
        'status', case when exists (select 1 from dream_observations) then 'present' else 'expected_but_empty' end,
        'message', 'Legacy observation compatibility rows linked directly to the dream.',
        'row_count', (select count(*) from dream_observations),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from dream_observations t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.observation_fragments',
        'status', case when exists (select 1 from dream_observation_fragments) then 'present' else 'expected_but_empty' end,
        'message', 'Legacy observation-fragment compatibility rows derived from dream observations.',
        'row_count', (select count(*) from dream_observation_fragments),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.observation_id, t.position, t.id) from dream_observation_fragments t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.observation_v2_bundles',
        'status', case when exists (select 1 from dream_observation_v2_bundles) then 'present' else 'expected_but_empty' end,
        'message', 'Native Observation V2 bundle rows keyed directly to the dream.',
        'row_count', (select count(*) from dream_observation_v2_bundles),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from dream_observation_v2_bundles t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.observation_v2_scenes',
        'status', case when exists (select 1 from dream_observation_v2_scenes) then 'present' else 'expected_but_empty' end,
        'message', 'Scene rows under native Observation V2 bundles.',
        'row_count', (select count(*) from dream_observation_v2_scenes),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.bundle_id, t.position, t.id) from dream_observation_v2_scenes t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.observation_v2_scene_observations',
        'status', case when exists (select 1 from dream_observation_v2_scene_observations) then 'present' else 'expected_but_empty' end,
        'message', 'Scene-local native observation rows under the dream bundle.',
        'row_count', (select count(*) from dream_observation_v2_scene_observations),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.scene_row_id, t.position, t.id) from dream_observation_v2_scene_observations t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.glossary_candidate_states',
        'status', case when exists (select 1 from glossary_candidate_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Dream-scoped glossary candidate rows linked by reflective_object_id.',
        'row_count', (select count(*) from glossary_candidate_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from glossary_candidate_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.glossary_associations',
        'status', case when exists (select 1 from glossary_association_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Legacy and compatibility glossary association rows connected through dream/object/observation paths.',
        'row_count', (select count(*) from glossary_association_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from glossary_association_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.glossary_appearance_records',
        'status', case when exists (select 1 from glossary_appearance_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Canonical glossary appearance rows confirming a term appears in this dream.',
        'row_count', (select count(*) from glossary_appearance_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.confirmed_at, t.id) from glossary_appearance_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.glossary_terms',
        'status', case when exists (select 1 from dream_glossary_terms) then 'present' else 'expected_but_empty' end,
        'message', 'Glossary terms connected through appearance, association, or thread linkage.',
        'row_count', (select count(*) from dream_glossary_terms),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from dream_glossary_terms t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.latent_snapshots',
        'status', case when exists (select 1 from dream_latent_snapshots) then 'present' else 'expected_but_empty' end,
        'message', 'Latent snapshot rows connected through source arrays.',
        'row_count', (select count(*) from dream_latent_snapshots),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from dream_latent_snapshots t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.latent_signals',
        'status', case when exists (select 1 from public.latent_signals where snapshot_id in (select id from dream_latent_snapshots)) then 'present' else 'expected_but_empty' end,
        'message', 'Latent signal rows under dream-connected snapshots.',
        'row_count', (select count(*) from public.latent_signals where snapshot_id in (select id from dream_latent_snapshots)),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from public.latent_signals t where t.snapshot_id in (select id from dream_latent_snapshots)), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.latent_suggestions',
        'status', case when exists (select 1 from public.latent_suggestions where snapshot_id in (select id from dream_latent_snapshots)) then 'present' else 'expected_but_empty' end,
        'message', 'Latent suggestion rows under dream-connected snapshots.',
        'row_count', (select count(*) from public.latent_suggestions where snapshot_id in (select id from dream_latent_snapshots)),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from public.latent_suggestions t where t.snapshot_id in (select id from dream_latent_snapshots)), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.openings',
        'status', case when exists (select 1 from dream_openings) then 'present' else 'expected_but_empty' end,
        'message', 'Opening rows connected through source arrays, latent snapshot lineage, or opportunity manifestation provenance.',
        'row_count', (select count(*) from dream_openings),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from dream_openings t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.opening_suppressions',
        'status', case when exists (select 1 from opening_suppression_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Opening suppression rows under dream-connected openings.',
        'row_count', (select count(*) from opening_suppression_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from opening_suppression_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.opening_surface_events',
        'status', case when exists (select 1 from opening_surface_event_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Opening surface-event rows under dream-connected openings.',
        'row_count', (select count(*) from opening_surface_event_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from opening_surface_event_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.opening_activation_events',
        'status', case when exists (select 1 from opening_activation_event_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Opening activation rows under dream-connected openings.',
        'row_count', (select count(*) from opening_activation_event_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from opening_activation_event_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.opening_response_associations',
        'status', case when exists (select 1 from opening_response_association_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Opening-to-response lineage rows under dream-connected openings.',
        'row_count', (select count(*) from opening_response_association_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from opening_response_association_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.reflective_threads',
        'status', case when exists (select 1 from dream_threads) then 'present' else 'expected_but_empty' end,
        'message', 'Threads linked through dream object association, opening lineage, or reflection provenance.',
        'row_count', (select count(*) from dream_threads),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from dream_threads t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.thread_object_associations',
        'status', case when exists (select 1 from thread_object_association_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Thread-to-dream object association rows.',
        'row_count', (select count(*) from thread_object_association_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from thread_object_association_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.thread_glossary_associations',
        'status', case when exists (select 1 from thread_glossary_association_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Thread-to-glossary association rows under dream-connected threads.',
        'row_count', (select count(*) from thread_glossary_association_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from thread_glossary_association_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.reflective_responses',
        'status', case when exists (select 1 from dream_responses) then 'present' else 'expected_but_empty' end,
        'message', 'Responses linked through object association, thread lineage, or opening lineage.',
        'row_count', (select count(*) from dream_responses),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from dream_responses t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.response_object_associations',
        'status', case when exists (select 1 from response_object_association_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Response-to-dream object association rows.',
        'row_count', (select count(*) from response_object_association_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from response_object_association_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.response_thread_associations',
        'status', case when exists (select 1 from response_thread_association_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Response-to-thread association rows under dream-connected responses.',
        'row_count', (select count(*) from response_thread_association_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from response_thread_association_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.reflection_candidates',
        'status', case when exists (select 1 from reflection_candidate_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Reflection candidate rows linked through dream object provenance, thread, response, or opening.',
        'row_count', (select count(*) from reflection_candidate_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from reflection_candidate_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.reflection_candidate_evidence',
        'status', case when exists (select 1 from reflection_candidate_evidence_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Candidate evidence rows under dream-connected reflection candidates.',
        'row_count', (select count(*) from reflection_candidate_evidence_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from reflection_candidate_evidence_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.reflections',
        'status', case when exists (select 1 from reflection_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Admitted reflection rows linked through dream object provenance, thread, response, or opening.',
        'row_count', (select count(*) from reflection_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from reflection_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.latent_opportunity_generation_runs',
        'status', case when exists (select 1 from dream_latent_runs) then 'present' else 'expected_but_empty' end,
        'message', 'Latent generation runs keyed directly to this dream as priority_reflective_object_id.',
        'row_count', (select count(*) from dream_latent_runs),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from dream_latent_runs t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.latent_generation_run_invalidation_events',
        'status', case when exists (select 1 from latent_generation_invalidation_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Invalidation events under dream-connected latent generation runs.',
        'row_count', (select count(*) from latent_generation_invalidation_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from latent_generation_invalidation_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.latent_opportunity_identities',
        'status', case when exists (select 1 from dream_opportunity_identities) then 'present' else 'expected_but_empty' end,
        'message', 'Latent opportunity identities connected through manifestations or lifecycle events.',
        'row_count', (select count(*) from dream_opportunity_identities),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from dream_opportunity_identities t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.latent_opportunity_manifestations',
        'status', case when exists (select 1 from dream_opportunity_manifestations) then 'present' else 'expected_but_empty' end,
        'message', 'Latent manifestations keyed directly to the dream or linked through evidence blocks.',
        'row_count', (select count(*) from dream_opportunity_manifestations),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from dream_opportunity_manifestations t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.latent_opportunity_evidence_blocks',
        'status', case when exists (select 1 from latent_evidence_block_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Evidence block rows under dream-connected latent manifestations.',
        'row_count', (select count(*) from latent_evidence_block_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.manifestation_id, t.position, t.id) from latent_evidence_block_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.latent_opportunity_evidence_observations',
        'status', case when exists (select 1 from latent_evidence_observation_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Evidence-observation rows under dream-connected latent evidence blocks.',
        'row_count', (select count(*) from latent_evidence_observation_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.evidence_block_id, t.created_at, t.id) from latent_evidence_observation_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.latent_opportunity_glossary_links',
        'status', case when exists (select 1 from latent_glossary_link_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Glossary-link rows under dream-connected latent manifestations.',
        'row_count', (select count(*) from latent_glossary_link_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.manifestation_id, t.created_at, t.id) from latent_glossary_link_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.latent_opportunity_lifecycle_events',
        'status', case when exists (select 1 from latent_lifecycle_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Lifecycle-event rows connected through dream identity, triggering object, or generation run.',
        'row_count', (select count(*) from latent_lifecycle_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from latent_lifecycle_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.latent_opportunity_identity_relationships',
        'status', case when exists (select 1 from latent_identity_relationship_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Identity relationship rows connected to dream-scoped latent identities.',
        'row_count', (select count(*) from latent_identity_relationship_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from latent_identity_relationship_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.anchor_identities',
        'status', case when exists (select 1 from dream_anchor_identities) then 'present' else 'expected_but_empty' end,
        'message', 'Anchor identities connected through dream manifestations or dream-linked opportunity participation.',
        'row_count', (select count(*) from dream_anchor_identities),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from dream_anchor_identities t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.anchor_manifestations',
        'status', case when exists (select 1 from dream_anchor_manifestations) then 'present' else 'expected_but_empty' end,
        'message', 'Anchor manifestation rows keyed directly to this dream.',
        'row_count', (select count(*) from dream_anchor_manifestations),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from dream_anchor_manifestations t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'table_name', 'public.anchor_participations',
        'status', case when exists (select 1 from anchor_participation_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Anchor participation rows connected through dream-linked anchor or opportunity seams.',
        'row_count', (select count(*) from anchor_participation_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from anchor_participation_rows t), '[]'::jsonb)
      )
    ),
    'diagnostics',
    jsonb_build_array(
      jsonb_build_object(
        'name', 'multiple_current_latent_generation_runs',
        'status', case when exists (select 1 from diagnostic_multiple_current_runs) then 'present' else 'expected_but_empty' end,
        'message', 'More than one current latent generation run exists for the dream.',
        'row_count', (select count(*) from diagnostic_multiple_current_runs),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.user_id, t.priority_reflective_object_id) from diagnostic_multiple_current_runs t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'name', 'openings_with_unresolved_source_opportunity_manifestation',
        'status', case when exists (select 1 from diagnostic_unresolved_opening_manifestations) then 'present' else 'expected_but_empty' end,
        'message', 'An opening points at a source opportunity manifestation that is missing.',
        'row_count', (select count(*) from diagnostic_unresolved_opening_manifestations),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.user_id, t.opening_id) from diagnostic_unresolved_opening_manifestations t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'name', 'glossary_associations_with_missing_legacy_links',
        'status', case when exists (select 1 from diagnostic_missing_legacy_links where diagnostic_status <> 'resolved') then 'present' else 'expected_but_empty' end,
        'message', 'Legacy glossary association rows reference missing observation or fragment records.',
        'row_count', (select count(*) from diagnostic_missing_legacy_links where diagnostic_status <> 'resolved'),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.user_id, t.glossary_association_id) from diagnostic_missing_legacy_links t where t.diagnostic_status <> 'resolved'), '[]'::jsonb)
      ),
      jsonb_build_object(
        'name', 'records_linked_only_indirectly_via_thread_continuity',
        'status', case when exists (select 1 from diagnostic_indirect_only_rows) then 'present' else 'expected_but_empty' end,
        'message', 'Records connected only through thread continuity rather than direct dream-object linkage.',
        'row_count', (select count(*) from diagnostic_indirect_only_rows),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.diagnostic_type, t.created_at, t.record_id) from diagnostic_indirect_only_rows t), '[]'::jsonb)
      ),
      jsonb_build_object(
        'name', 'legacy_compatibility_surface_counts',
        'status', 'present',
        'message', 'Counts for legacy compatibility surfaces linked to the dream.',
        'row_count', (select count(*) from diagnostic_legacy_surface_counts),
        'records', coalesce((select jsonb_agg(to_jsonb(t) order by t.compatibility_surface) from diagnostic_legacy_surface_counts t), '[]'::jsonb)
      )
    ),
    'coverage_note', 'This export follows explicit FK, provenance-array, object/thread/response association, opening-lineage, latent-continuity, and anchor-participation seams. If a table is empty, the table block remains present with status expected_but_empty so absence is visible rather than silent.'
  ) as report_json
)
select report_json
from final_report;
