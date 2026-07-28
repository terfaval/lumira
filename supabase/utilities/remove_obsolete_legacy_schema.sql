-- WARNING: DESTRUCTIVE SCHEMA CLEANUP UTILITY.
-- MANUAL EXECUTION ONLY.
-- THIS FILE IS RESERVED FOR PERMANENT REMOVAL OF LEGACY DATABASE OBJECTS
-- ONLY WHEN REPOSITORY EVIDENCE PROVES THEY HAVE NO REMAINING SUPPORTED ROLE.
--
-- CURRENT RESULT:
--   NO SAFE OBSOLETE OBJECTS IDENTIFIED
--
-- Because current repository evidence still shows active or compatibility
-- references to legacy public-schema surfaces, this utility intentionally
-- performs no DROP statements at this time.
--
-- Any permanent removal of currently referenced schema should proceed through
-- a formal reviewed migration after the repository and runtime references have
-- been eliminated.

do $$
declare
  expected_tables text[] := array[
    'anchor_identities',
    'anchor_manifestations',
    'anchor_participations',
    'glossary_appearance_records',
    'glossary_associations',
    'glossary_candidate_states',
    'glossary_terms',
    'latent_generation_run_invalidation_events',
    'latent_opportunity_evidence_blocks',
    'latent_opportunity_evidence_observations',
    'latent_opportunity_generation_runs',
    'latent_opportunity_glossary_links',
    'latent_opportunity_identities',
    'latent_opportunity_identity_relationships',
    'latent_opportunity_lifecycle_events',
    'latent_opportunity_manifestations',
    'latent_signals',
    'latent_snapshots',
    'latent_suggestions',
    'observation_fragments',
    'observation_v2_bundles',
    'observation_v2_scene_observations',
    'observation_v2_scenes',
    'observations',
    'opening_activation_events',
    'opening_response_associations',
    'opening_suppressions',
    'opening_surface_events',
    'openings',
    'reflection_candidate_evidence',
    'reflection_candidates',
    'reflections',
    'reflective_objects',
    'reflective_responses',
    'reflective_threads',
    'response_object_associations',
    'response_thread_associations',
    'thread_glossary_associations',
    'thread_object_associations',
    'user_admin_roles'
  ];
  actual_tables text[];
begin
  select array_agg(t.table_name order by t.table_name)
  into actual_tables
  from information_schema.tables t
  where t.table_schema = 'public'
    and t.table_type = 'BASE TABLE';

  if actual_tables is null then
    raise exception 'Public schema inspection failed; no base tables found.';
  end if;

  if actual_tables <> expected_tables then
    raise exception 'Public schema differs from the inspected baseline. Re-audit before schema cleanup. Actual tables: %', actual_tables;
  end if;
end
$$;

-- Candidate assessment summary.
-- The classifications below are based on current repository and schema evidence.
-- Only SAFE TO REMOVE objects could be dropped here. None currently qualify.

select *
from (
  values
    (
      'public.observations + public.observation_fragments',
      'app/api/reflective-objects/[id]/observations, reflective-space composition, latent snapshot route, orchestration fallback',
      'COMPATIBILITY-RETAINED',
      'NO ACTION',
      'Live repository path still uses createObservationRepository and ObservationRepository compatibility reads.'
    ),
    (
      'public.glossary_associations',
      'src/infrastructure/supabase/repositories/glossary-supabase-repository.ts and tests',
      'LEGACY BUT STILL REFERENCED',
      'NO ACTION',
      'Current glossary repository still persists and reads legacy association rows alongside appearance records.'
    ),
    (
      'public.glossary_candidate_states',
      'src/infrastructure/supabase/repositories/glossary-supabase-repository.ts and tests',
      'CURRENT V2 AUTHORITY',
      'NO ACTION',
      'Candidate persistence remains active and repository-owned.'
    ),
    (
      'public.latent_snapshots + public.latent_signals + public.latent_suggestions',
      'src/infrastructure/supabase/repositories/latent-supabase-repository.ts and route/runtime callers',
      'CURRENT V2 AUTHORITY',
      'NO ACTION',
      'Still part of current latent persistence and API surface.'
    ),
    (
      'public.openings + public.opening_suppressions + public.opening_surface_events + public.opening_activation_events + public.opening_response_associations',
      'current opening routes, repositories, deep-reflection composition, and orchestration',
      'CURRENT V2 AUTHORITY',
      'NO ACTION',
      'These are active Opening runtime authority surfaces, not removable legacy residue.'
    ),
    (
      'public.reflective_threads + public.reflective_responses + association tables',
      'current thread/response routes and opening select/response flows',
      'COMPATIBILITY-RETAINED',
      'NO ACTION',
      'Although historically compatibility-shaped, they remain active supported runtime paths.'
    ),
    (
      'public.touch_*_updated_at functions and trg_touch_* triggers',
      'owned by current preserved tables',
      'UNCERTAIN - DO NOT REMOVE',
      'NO ACTION',
      'Dropping them would mutate active table behavior; no object-specific removal proof exists.'
    ),
    (
      'public.admit_reflection(uuid, uuid, text, text[])',
      'reflection persistence path and repository RPC admission flow',
      'CURRENT V2 AUTHORITY',
      'NO ACTION',
      'Still part of admitted Reflection write authority.'
    ),
    (
      'public.archive_observation_v2_bundle(text, uuid)',
      'latent invalidation migration and Observation V2 archival seam',
      'CURRENT V2 AUTHORITY',
      'NO ACTION',
      'Still governs bundle archival to latent invalidation linkage.'
    ),
    (
      'public.classify_opportunity_anchor_identity_exact(uuid, text, text)',
      'migration contract test coverage and current latent/anchor exactness seam',
      'CURRENT V2 AUTHORITY',
      'NO ACTION',
      'No evidence shows this exactness function is obsolete.'
    )
) as assessment(
  candidate_object,
  current_references,
  classification,
  sql_action,
  evidence
)
order by candidate_object;

select
  'NO SAFE OBSOLETE OBJECTS IDENTIFIED' as schema_cleanup_status,
  'Permanent removal should be handled by a formal reviewed migration after repository references are removed.' as guidance;
