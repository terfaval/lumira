begin;

alter table public.observation_latest
  add column if not exists latest_dream_id uuid references public.observation_versions(id) on delete set null;

alter table public.observation_latest
  add column if not exists latest_v0_id uuid references public.observation_versions(id) on delete set null;

alter table public.observation_latest
  alter column observation_version_id drop not null;

create index if not exists idx_observation_latest_latest_dream
  on public.observation_latest (latest_dream_id);

create index if not exists idx_observation_latest_latest_v0
  on public.observation_latest (latest_v0_id);

update public.observation_latest
set latest_v0_id = observation_version_id
where latest_v0_id is null;

commit;
