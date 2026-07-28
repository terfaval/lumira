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

-- 1. Dream root record
select *
from selected_dream_row
order by created_at, id;

-- 2. Legacy observations
select *
from dream_observations
order by created_at, id;

-- 3. Legacy observation fragments
select *
from dream_observation_fragments
order by observation_id, position, id;

-- 4. Observation V2 bundles
select *
from dream_observation_v2_bundles
order by created_at, id;

-- 5. Observation V2 scenes
select *
from dream_observation_v2_scenes
order by bundle_id, position, id;

-- 6. Observation V2 scene observations
select *
from dream_observation_v2_scene_observations
order by scene_row_id, position, id;

-- 7. Glossary candidate state directly scoped to the dream
select *
from public.glossary_candidate_states gcs
join selected_dream_row d
  on d.id = gcs.reflective_object_id
 and d.user_id = gcs.user_id
order by gcs.created_at, gcs.id;

-- 8. Glossary associations connected to the dream
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
order by ga.created_at, ga.id;

-- 9. Glossary appearance records for the dream
select *
from public.glossary_appearance_records
where dream_id in (select id from selected_dream_row)
order by confirmed_at, id;

-- 10. Glossary terms connected through appearance, legacy association, or thread linkage
select *
from dream_glossary_terms
order by created_at, id;

-- 11. Latent snapshots connected through source arrays
select *
from dream_latent_snapshots
order by created_at, id;

-- 12. Latent signals for dream-connected snapshots
select *
from public.latent_signals
where snapshot_id in (select id from dream_latent_snapshots)
order by created_at, id;

-- 13. Latent suggestions for dream-connected snapshots
select *
from public.latent_suggestions
where snapshot_id in (select id from dream_latent_snapshots)
order by created_at, id;

-- 14. Openings connected to the dream
select *
from dream_openings
order by created_at, id;

-- 15. Opening suppressions
select *
from public.opening_suppressions
where opening_id in (select id from dream_openings)
order by created_at, id;

-- 16. Opening surface events
select *
from public.opening_surface_events
where opening_id in (select id from dream_openings)
order by created_at, id;

-- 17. Opening activation events
select *
from public.opening_activation_events
where opening_id in (select id from dream_openings)
order by created_at, id;

-- 18. Opening response associations
select *
from public.opening_response_associations
where opening_id in (select id from dream_openings)
order by created_at, id;

-- 19. Dream threads
select *
from dream_threads
order by created_at, id;

-- 20. Thread object associations
select *
from public.thread_object_associations
where thread_id in (select id from dream_threads)
order by created_at, id;

-- 21. Thread glossary associations
select *
from public.thread_glossary_associations
where thread_id in (select id from dream_threads)
order by created_at, id;

-- 22. Dream responses
select *
from dream_responses
order by created_at, id;

-- 23. Response object associations
select *
from public.response_object_associations
where response_id in (select id from dream_responses)
order by created_at, id;

-- 24. Response thread associations
select *
from public.response_thread_associations
where response_id in (select id from dream_responses)
order by created_at, id;

-- 25. Reflection candidates connected to the dream
select rc.*
from public.reflection_candidates rc
join selected_dream_row d
  on d.user_id = rc.user_id
where d.id = any (rc.source_reflective_object_ids)
   or rc.thread_id in (select id from dream_threads)
   or rc.source_response_id in (select id from dream_responses)
   or rc.source_opening_id in (select id from dream_openings)
order by rc.created_at, rc.id;

-- 26. Reflection candidate evidence connected to the dream
select rce.*
from public.reflection_candidate_evidence rce
where rce.candidate_id in (
  select rc.id
  from public.reflection_candidates rc
  join selected_dream_row d
    on d.user_id = rc.user_id
  where d.id = any (rc.source_reflective_object_ids)
     or rc.thread_id in (select id from dream_threads)
     or rc.source_response_id in (select id from dream_responses)
     or rc.source_opening_id in (select id from dream_openings)
)
order by rce.created_at, rce.id;

-- 27. Admitted reflections connected to the dream
select r.*
from public.reflections r
join selected_dream_row d
  on d.user_id = r.user_id
where d.id = any (r.source_reflective_object_ids)
   or r.thread_id in (select id from dream_threads)
   or r.source_response_id in (select id from dream_responses)
   or r.source_opening_id in (select id from dream_openings)
order by r.created_at, r.id;

-- 28. Latent generation runs keyed to this dream
select *
from dream_latent_runs
order by created_at, id;

-- 29. Latent generation run invalidation events
select *
from public.latent_generation_run_invalidation_events
where target_generation_run_id in (select id from dream_latent_runs)
order by created_at, id;

-- 30. Dream-connected latent opportunity identities
select *
from dream_opportunity_identities
order by created_at, id;

-- 31. Dream-connected latent opportunity manifestations
select *
from dream_opportunity_manifestations
order by created_at, id;

-- 32. Dream-connected latent opportunity evidence blocks
select eb.*
from public.latent_opportunity_evidence_blocks eb
where eb.manifestation_id in (select id from dream_opportunity_manifestations)
order by eb.manifestation_id, eb.position, eb.id;

-- 33. Dream-connected latent opportunity evidence observations
select eo.*
from public.latent_opportunity_evidence_observations eo
where eo.evidence_block_id in (
  select eb.id
  from public.latent_opportunity_evidence_blocks eb
  where eb.manifestation_id in (select id from dream_opportunity_manifestations)
)
order by eo.evidence_block_id, eo.created_at, eo.id;

-- 34. Dream-connected latent opportunity glossary links
select *
from public.latent_opportunity_glossary_links
where manifestation_id in (select id from dream_opportunity_manifestations)
order by manifestation_id, created_at, id;

-- 35. Latent lifecycle events connected through dream scope
select le.*
from public.latent_opportunity_lifecycle_events le
join selected_dream_row d
  on d.user_id = le.user_id
where le.identity_id in (select id from dream_opportunity_identities)
   or le.triggering_reflective_object_id = d.id
   or le.source_generation_run_id in (select id from dream_latent_runs)
   or le.resulting_generation_run_id in (select id from dream_latent_runs)
order by le.created_at, le.id;

-- 36. Latent identity relationships connected through dream identities
select *
from public.latent_opportunity_identity_relationships
where source_identity_id in (select id from dream_opportunity_identities)
   or target_identity_id in (select id from dream_opportunity_identities)
order by created_at, id;

-- 37. Anchor identities connected to this dream
select *
from dream_anchor_identities
order by created_at, id;

-- 38. Anchor manifestations connected to this dream
select *
from dream_anchor_manifestations
order by created_at, id;

-- 39. Anchor participations connected through dream opportunities or dream anchor manifestations
select ap.*
from public.anchor_participations ap
where ap.anchor_id in (select id from dream_anchor_identities)
   or ap.anchor_manifestation_id in (select id from dream_anchor_manifestations)
   or ap.opportunity_id in (select id from dream_opportunity_identities)
   or ap.opportunity_manifestation_id in (select id from dream_opportunity_manifestations)
order by ap.created_at, ap.id;

-- 40. Diagnostic: multiple active/current latent generation runs for the same dream
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
having count(*) > 1;

-- 41. Diagnostic: openings with unresolved source opportunity manifestation references
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
order by o.created_at, o.id;

-- 42. Diagnostic: glossary associations that reference missing dream-scoped legacy observations or fragments
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
order by ga.created_at, ga.id;

-- 43. Diagnostic: records linked only indirectly through thread continuity, not direct dream object linkage
select
  'response_via_thread_only' as diagnostic_type,
  r.id as record_id,
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
  'reflection_via_thread_only' as diagnostic_type,
  rf.id as record_id,
  rf.created_at
from public.reflections rf
where rf.thread_id in (select id from dream_threads)
  and not exists (
    select 1
    from selected_dream_row d
    where d.id = any (rf.source_reflective_object_ids)
  )
order by diagnostic_type, created_at, record_id;

-- 44. Diagnostic: legacy compatibility records still attached to the dream
select
  'legacy_observations' as compatibility_surface,
  count(*)::bigint as row_count
from dream_observations
union all
select
  'legacy_observation_fragments',
  count(*)::bigint
from dream_observation_fragments
union all
select
  'legacy_glossary_associations',
  count(*)::bigint
from public.glossary_associations
where reflective_object_id in (select id from selected_dream_row)
order by compatibility_surface;

-- Coverage note:
--   This utility follows direct FKs, array provenance, object/thread/response
--   associations, opening lineage, latent continuity records, and Anchor
--   participation links. Tables without a reliable dream path in the current
--   schema are intentionally not inferred beyond those explicit seams.
