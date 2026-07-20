create table if not exists public.latent_generation_run_invalidation_events (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null,
  priority_reflective_object_id uuid not null,
  target_generation_run_id text not null,
  source_layer text not null,
  source_entity_type text not null,
  source_entity_id text not null,
  source_revision text not null,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint latent_generation_run_invalidation_events_source_layer_check check (
    source_layer = 'observation'
  ),
  constraint latent_generation_run_invalidation_events_source_entity_type_check check (
    source_entity_type = 'observation_v2_bundle'
  ),
  constraint latent_generation_run_invalidation_events_reason_check check (
    reason = 'observation_bundle_archived'
  ),
  constraint latent_generation_run_invalidation_events_target_owner_fk foreign key (
    target_generation_run_id,
    user_id,
    priority_reflective_object_id
  )
    references public.latent_opportunity_generation_runs (id, user_id, priority_reflective_object_id)
    on delete restrict,
  constraint latent_generation_run_invalidation_events_priority_object_owner_fk foreign key (
    priority_reflective_object_id,
    user_id
  )
    references public.reflective_objects (id, user_id)
    on delete restrict,
  unique (target_generation_run_id, source_layer, source_entity_type, source_revision)
);

create index if not exists latent_generation_run_invalidation_events_target_created_idx
  on public.latent_generation_run_invalidation_events (target_generation_run_id, created_at desc);

create index if not exists latent_generation_run_invalidation_events_object_created_idx
  on public.latent_generation_run_invalidation_events (user_id, priority_reflective_object_id, created_at desc);

alter table public.latent_generation_run_invalidation_events enable row level security;

drop policy if exists latent_generation_run_invalidation_events_select_own
  on public.latent_generation_run_invalidation_events;
create policy latent_generation_run_invalidation_events_select_own
on public.latent_generation_run_invalidation_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists latent_generation_run_invalidation_events_insert_own
  on public.latent_generation_run_invalidation_events;
create policy latent_generation_run_invalidation_events_insert_own
on public.latent_generation_run_invalidation_events
for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.archive_observation_v2_bundle(
  p_bundle_id text,
  p_user_id uuid
)
returns public.observation_v2_bundles
language plpgsql
as $$
declare
  v_bundle public.observation_v2_bundles%rowtype;
  v_target_run public.latent_opportunity_generation_runs%rowtype;
begin
  select *
  into v_bundle
  from public.observation_v2_bundles
  where id = p_bundle_id
    and user_id = p_user_id
    and archived_at is null
    and status = 'active'
  for update;

  if not found then
    return null;
  end if;

  update public.observation_v2_bundles
  set status = 'archived',
      archived_at = now()
  where id = v_bundle.id
    and user_id = v_bundle.user_id
    and archived_at is null
    and status = 'active'
  returning *
  into v_bundle;

  if not found then
    raise exception 'Failed to archive observation v2 bundle.';
  end if;

  select *
  into v_target_run
  from public.latent_opportunity_generation_runs
  where user_id = v_bundle.user_id
    and priority_reflective_object_id = v_bundle.reflective_object_id
    and status = 'current'
    and superseded_at is null
  order by created_at desc, id desc
  limit 1;

  if not found then
    select *
    into v_target_run
    from public.latent_opportunity_generation_runs
    where user_id = v_bundle.user_id
      and priority_reflective_object_id = v_bundle.reflective_object_id
      and status = 'empty'
      and superseded_at is null
    order by created_at desc, id desc
    limit 1;
  end if;

  if found then
    insert into public.latent_generation_run_invalidation_events (
      user_id,
      priority_reflective_object_id,
      target_generation_run_id,
      source_layer,
      source_entity_type,
      source_entity_id,
      source_revision,
      reason
    )
    values (
      v_bundle.user_id,
      v_bundle.reflective_object_id,
      v_target_run.id,
      'observation',
      'observation_v2_bundle',
      v_bundle.id,
      'archive:' || v_bundle.id,
      'observation_bundle_archived'
    )
    on conflict (target_generation_run_id, source_layer, source_entity_type, source_revision) do nothing;
  end if;

  return v_bundle;
end;
$$;
