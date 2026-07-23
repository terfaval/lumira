create or replace function public.guard_latent_authority_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Accepted latent authority deletes are not permitted.';
end;
$$;

drop trigger if exists trg_latent_opportunity_identities_delete_guard on public.latent_opportunity_identities;
create trigger trg_latent_opportunity_identities_delete_guard
before delete on public.latent_opportunity_identities
for each row
execute function public.guard_latent_authority_delete();

drop trigger if exists trg_latent_opportunity_manifestations_delete_guard on public.latent_opportunity_manifestations;
create trigger trg_latent_opportunity_manifestations_delete_guard
before delete on public.latent_opportunity_manifestations
for each row
execute function public.guard_latent_authority_delete();

drop trigger if exists trg_latent_opportunity_evidence_blocks_delete_guard on public.latent_opportunity_evidence_blocks;
create trigger trg_latent_opportunity_evidence_blocks_delete_guard
before delete on public.latent_opportunity_evidence_blocks
for each row
execute function public.guard_latent_authority_delete();

drop trigger if exists trg_latent_opportunity_evidence_observations_delete_guard on public.latent_opportunity_evidence_observations;
create trigger trg_latent_opportunity_evidence_observations_delete_guard
before delete on public.latent_opportunity_evidence_observations
for each row
execute function public.guard_latent_authority_delete();

drop trigger if exists trg_latent_opportunity_glossary_links_delete_guard on public.latent_opportunity_glossary_links;
create trigger trg_latent_opportunity_glossary_links_delete_guard
before delete on public.latent_opportunity_glossary_links
for each row
execute function public.guard_latent_authority_delete();

create or replace function public.guard_latent_generation_run_delete()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'pending' and old.accepted_at is null and old.superseded_at is null then
    return old;
  end if;

  raise exception 'Pending latent generation runs may be deleted only before accepted authority exists.';
end;
$$;

drop trigger if exists trg_latent_opportunity_generation_runs_delete_guard on public.latent_opportunity_generation_runs;
create trigger trg_latent_opportunity_generation_runs_delete_guard
before delete on public.latent_opportunity_generation_runs
for each row
execute function public.guard_latent_generation_run_delete();
