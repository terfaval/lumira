-- WARNING: DESTRUCTIVE SQL UTILITY.
-- MANUAL EXECUTION ONLY.
-- THIS SCRIPT PERMANENTLY REMOVES BACKEND V2 APPLICATION CONTENT FROM
-- EXPLICIT PUBLIC-SCHEMA TABLES WHILE PRESERVING TABLE DEFINITIONS,
-- CONSTRAINTS, INDEXES, POLICIES, FUNCTIONS, TRIGGERS, VIEWS, ENUMS,
-- MIGRATION HISTORY, AUTH USERS, STORAGE, AND SUPABASE-OWNED SCHEMAS.
--
-- DO NOT RUN THIS AGAINST A LIVE OR SHARED ENVIRONMENT UNLESS THE USER
-- HAS EXPLICITLY CHOSEN TO DESTROY ALL CURRENT AND LEGACY BACKEND V2
-- RUNTIME CONTENT.

-- Scope classification used by this reset:
--   Disposable Backend V2 runtime or legacy compatibility content:
--     public.reflective_objects
--     public.observations
--     public.observation_fragments
--     public.glossary_terms
--     public.glossary_candidate_states
--     public.glossary_associations
--     public.glossary_appearance_records
--     public.reflective_threads
--     public.thread_object_associations
--     public.thread_glossary_associations
--     public.reflective_responses
--     public.response_object_associations
--     public.response_thread_associations
--     public.latent_snapshots
--     public.latent_signals
--     public.latent_suggestions
--     public.openings
--     public.opening_suppressions
--     public.opening_surface_events
--     public.opening_activation_events
--     public.opening_response_associations
--     public.observation_v2_bundles
--     public.observation_v2_scenes
--     public.observation_v2_scene_observations
--     public.latent_opportunity_generation_runs
--     public.latent_generation_run_invalidation_events
--     public.latent_opportunity_identities
--     public.latent_opportunity_manifestations
--     public.latent_opportunity_evidence_blocks
--     public.latent_opportunity_evidence_observations
--     public.latent_opportunity_glossary_links
--     public.latent_opportunity_lifecycle_events
--     public.latent_opportunity_identity_relationships
--     public.anchor_identities
--     public.anchor_manifestations
--     public.anchor_participations
--     public.reflection_candidates
--     public.reflection_candidate_evidence
--     public.reflections
--
--   Operational or configuration data preserved:
--     public.user_admin_roles
--
--   Supabase-owned or platform data preserved:
--     auth.*
--     storage.*
--     supabase_migrations.*
--     realtime.*
--     vault.*
--
--   Ambiguous tables requiring explicit handling:
--     none found in the current public schema; this script fails if the
--     inspected public schema contains unexpected extra base tables.

begin;

do $$
declare
  unexpected_tables text[];
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_type <> 'BASE TABLE'
  ) then
    raise exception 'Unexpected non-base-table relation found in public schema. Re-audit reset utility before execution.';
  end if;

  select array_agg(t.table_name order by t.table_name)
  into unexpected_tables
  from information_schema.tables t
  where t.table_schema = 'public'
    and t.table_type = 'BASE TABLE'
    and t.table_name not in (
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
    );

  if unexpected_tables is not null then
    raise exception 'Public schema drift detected. Unexpected tables: %', unexpected_tables;
  end if;

  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'user_admin_roles'
  ) then
    raise exception 'Expected preserved table public.user_admin_roles is missing.';
  end if;
end
$$;

-- All disposable application tables are truncated together so foreign-key
-- relationships are satisfied without wildcard discovery or implicit
-- schema-wide cascade.
truncate table
  public.anchor_participations,
  public.anchor_manifestations,
  public.anchor_identities,
  public.glossary_appearance_records,
  public.glossary_associations,
  public.glossary_candidate_states,
  public.glossary_terms,
  public.latent_generation_run_invalidation_events,
  public.latent_opportunity_identity_relationships,
  public.latent_opportunity_lifecycle_events,
  public.latent_opportunity_evidence_observations,
  public.latent_opportunity_evidence_blocks,
  public.latent_opportunity_glossary_links,
  public.latent_opportunity_manifestations,
  public.latent_opportunity_identities,
  public.latent_opportunity_generation_runs,
  public.latent_signals,
  public.latent_suggestions,
  public.latent_snapshots,
  public.observation_fragments,
  public.observations,
  public.observation_v2_scene_observations,
  public.observation_v2_scenes,
  public.observation_v2_bundles,
  public.opening_response_associations,
  public.opening_activation_events,
  public.opening_surface_events,
  public.opening_suppressions,
  public.openings,
  public.reflection_candidate_evidence,
  public.reflections,
  public.reflection_candidates,
  public.response_thread_associations,
  public.response_object_associations,
  public.reflective_responses,
  public.thread_glossary_associations,
  public.thread_object_associations,
  public.reflective_threads,
  public.reflective_objects
restart identity;

commit;

-- Post-reset verification: cleared tables should report zero rows.
select *
from (
  values
    ('public.anchor_identities', (select count(*)::bigint from public.anchor_identities)),
    ('public.anchor_manifestations', (select count(*)::bigint from public.anchor_manifestations)),
    ('public.anchor_participations', (select count(*)::bigint from public.anchor_participations)),
    ('public.glossary_appearance_records', (select count(*)::bigint from public.glossary_appearance_records)),
    ('public.glossary_associations', (select count(*)::bigint from public.glossary_associations)),
    ('public.glossary_candidate_states', (select count(*)::bigint from public.glossary_candidate_states)),
    ('public.glossary_terms', (select count(*)::bigint from public.glossary_terms)),
    ('public.latent_generation_run_invalidation_events', (select count(*)::bigint from public.latent_generation_run_invalidation_events)),
    ('public.latent_opportunity_generation_runs', (select count(*)::bigint from public.latent_opportunity_generation_runs)),
    ('public.latent_opportunity_evidence_blocks', (select count(*)::bigint from public.latent_opportunity_evidence_blocks)),
    ('public.latent_opportunity_evidence_observations', (select count(*)::bigint from public.latent_opportunity_evidence_observations)),
    ('public.latent_opportunity_glossary_links', (select count(*)::bigint from public.latent_opportunity_glossary_links)),
    ('public.latent_opportunity_identities', (select count(*)::bigint from public.latent_opportunity_identities)),
    ('public.latent_opportunity_identity_relationships', (select count(*)::bigint from public.latent_opportunity_identity_relationships)),
    ('public.latent_opportunity_lifecycle_events', (select count(*)::bigint from public.latent_opportunity_lifecycle_events)),
    ('public.latent_opportunity_manifestations', (select count(*)::bigint from public.latent_opportunity_manifestations)),
    ('public.latent_signals', (select count(*)::bigint from public.latent_signals)),
    ('public.latent_snapshots', (select count(*)::bigint from public.latent_snapshots)),
    ('public.latent_suggestions', (select count(*)::bigint from public.latent_suggestions)),
    ('public.observation_fragments', (select count(*)::bigint from public.observation_fragments)),
    ('public.observation_v2_bundles', (select count(*)::bigint from public.observation_v2_bundles)),
    ('public.observation_v2_scene_observations', (select count(*)::bigint from public.observation_v2_scene_observations)),
    ('public.observation_v2_scenes', (select count(*)::bigint from public.observation_v2_scenes)),
    ('public.observations', (select count(*)::bigint from public.observations)),
    ('public.opening_activation_events', (select count(*)::bigint from public.opening_activation_events)),
    ('public.opening_response_associations', (select count(*)::bigint from public.opening_response_associations)),
    ('public.opening_suppressions', (select count(*)::bigint from public.opening_suppressions)),
    ('public.opening_surface_events', (select count(*)::bigint from public.opening_surface_events)),
    ('public.openings', (select count(*)::bigint from public.openings)),
    ('public.reflection_candidate_evidence', (select count(*)::bigint from public.reflection_candidate_evidence)),
    ('public.reflection_candidates', (select count(*)::bigint from public.reflection_candidates)),
    ('public.reflections', (select count(*)::bigint from public.reflections)),
    ('public.reflective_objects', (select count(*)::bigint from public.reflective_objects)),
    ('public.reflective_responses', (select count(*)::bigint from public.reflective_responses)),
    ('public.reflective_threads', (select count(*)::bigint from public.reflective_threads)),
    ('public.response_object_associations', (select count(*)::bigint from public.response_object_associations)),
    ('public.response_thread_associations', (select count(*)::bigint from public.response_thread_associations)),
    ('public.thread_glossary_associations', (select count(*)::bigint from public.thread_glossary_associations)),
    ('public.thread_object_associations', (select count(*)::bigint from public.thread_object_associations))
) as verification(table_name, remaining_rows)
order by verification.table_name;

-- Preserved operational/configuration data checks.
select
  'public.user_admin_roles' as preserved_table,
  count(*)::bigint as row_count
from public.user_admin_roles;

-- Current Backend V2 public tables use UUID or text identifiers rather than
-- owned serial identity sequences. Any sequence-related cleanup concern would
-- therefore indicate schema drift requiring a fresh audit.
select
  sequence_schema,
  sequence_name
from information_schema.sequences
where sequence_schema = 'public'
order by sequence_schema, sequence_name;

-- Manual completion guidance:
--   1. Inspect the zero-row verification output above.
--   2. Confirm public.user_admin_roles remains intact if administrative access
--      should persist across validation runs.
--   3. If any unexpected public sequences appear, stop and re-audit before
--      assuming this reset fully matches the live schema.
