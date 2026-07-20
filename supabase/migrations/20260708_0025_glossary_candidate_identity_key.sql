alter table public.glossary_candidate_states
  add column if not exists identity_key text null;
