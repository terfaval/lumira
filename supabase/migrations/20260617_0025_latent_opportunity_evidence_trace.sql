alter table public.latent_opportunity_evidence_observations
  add column if not exists supports_node_keys text[] null,
  add column if not exists supports_edge_indexes integer[] null;
