-- Phase 13: Observation ontology slice v2 (affect transitions + contradiction + atmosphere)

alter table public.observation_fragments
  drop constraint if exists observation_fragments_category_check;

alter table public.observation_fragments
  add constraint observation_fragments_category_check
  check (
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
      'recurrence_candidate',
      'agency_state',
      'metacognitive_moment',
      'affect_transition',
      'emotional_contradiction',
      'affective_atmosphere'
    )
  );

alter table public.glossary_candidate_states
  drop constraint if exists glossary_candidate_states_source_category_check;

alter table public.glossary_candidate_states
  add constraint glossary_candidate_states_source_category_check
  check (
    source_category in (
      'scene',
      'actor',
      'interaction',
      'emotion',
      'location',
      'transition',
      'object',
      'body_state',
      'dream_quality',
      'recurrence_candidate',
      'agency_state',
      'metacognitive_moment',
      'affect_transition',
      'emotional_contradiction',
      'affective_atmosphere'
    )
  );
