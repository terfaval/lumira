alter table public.observations
  drop constraint if exists observations_source_check;

alter table public.observations
  add constraint observations_source_check
  check (
    source in ('system_descriptive_extract', 'system_llm_extract', 'user_descriptive_note')
  );
