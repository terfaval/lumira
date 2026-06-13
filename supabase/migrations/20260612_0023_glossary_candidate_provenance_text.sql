alter table public.glossary_candidate_states
  alter column source_observation_id type text using source_observation_id::text,
  alter column source_observation_fragment_id type text using source_observation_fragment_id::text;

alter table public.glossary_associations
  alter column observation_id type text using observation_id::text,
  alter column observation_fragment_id type text using observation_fragment_id::text;
