alter table public.latent_opportunity_generation_runs
  add column if not exists authority_fingerprint text null,
  add column if not exists authority_provenance jsonb null,
  add column if not exists context_provenance jsonb null,
  add column if not exists execution_provenance jsonb null;
