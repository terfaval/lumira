-- Phase 11: Observation semantic boundary guardrails (thin safety slice)

alter table public.observations
  add column if not exists provenance_tier text not null default 'manual_user',
  add column if not exists semantic_policy_result text not null default 'accept',
  add column if not exists semantic_policy_reasons jsonb not null default '[]'::jsonb,
  add column if not exists summary_trace jsonb not null default '[]'::jsonb,
  add column if not exists latent_backflow_guard text not null default 'observation_only',
  add column if not exists boundary_version text not null default 'observation_semantic_guardrails_v1';

alter table public.observation_fragments
  add column if not exists evidence_adequacy text not null default 'snippet_only';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'observations_provenance_tier_check'
  ) then
    alter table public.observations
      add constraint observations_provenance_tier_check
      check (provenance_tier in ('manual_user', 'system_extract', 'imported_transform', 'reviewed'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'observations_semantic_policy_result_check'
  ) then
    alter table public.observations
      add constraint observations_semantic_policy_result_check
      check (semantic_policy_result in ('accept', 'accept_with_uncertainty', 'reject_interpretive', 'defer_insufficient_evidence'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'observations_latent_backflow_guard_check'
  ) then
    alter table public.observations
      add constraint observations_latent_backflow_guard_check
      check (latent_backflow_guard in ('observation_only'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'observation_fragments_evidence_adequacy_check'
  ) then
    alter table public.observation_fragments
      add constraint observation_fragments_evidence_adequacy_check
      check (evidence_adequacy in ('strong_span', 'snippet_only', 'weak_fallback'));
  end if;
end $$;
