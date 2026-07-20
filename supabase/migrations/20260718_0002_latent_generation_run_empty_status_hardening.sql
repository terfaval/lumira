alter table public.latent_opportunity_generation_runs
  drop constraint if exists latent_opportunity_generation_runs_status_check;

alter table public.latent_opportunity_generation_runs
  add constraint latent_opportunity_generation_runs_status_check check (
    status in ('pending', 'current', 'superseded', 'empty', 'no_change', 'failed', 'rejected')
  );

update public.latent_opportunity_generation_runs as run
set status = 'empty'
where run.status = 'no_change'
  and not exists (
    select 1
    from public.latent_opportunity_manifestations as manifestation
    where manifestation.generation_run_id = run.id
  );
