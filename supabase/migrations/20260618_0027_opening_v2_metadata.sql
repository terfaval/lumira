alter table public.openings
  add column if not exists opening_context jsonb null;

alter table public.openings
  add column if not exists source_opportunity_manifestation_id text null;
