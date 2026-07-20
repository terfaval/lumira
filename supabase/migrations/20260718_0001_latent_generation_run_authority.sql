create table if not exists public.latent_opportunity_generation_runs (
  id text primary key,
  user_id uuid not null,
  priority_reflective_object_id uuid not null,
  status text not null,
  input_fingerprint text not null,
  trigger_reason text null,
  predecessor_run_id text null,
  accepted_at timestamptz null,
  superseded_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint latent_opportunity_generation_runs_status_check check (
    status in ('pending', 'current', 'superseded', 'no_change', 'failed', 'rejected')
  ),
  constraint latent_opportunity_generation_runs_priority_object_owner_fk foreign key (priority_reflective_object_id, user_id)
    references public.reflective_objects (id, user_id)
    on delete cascade,
  constraint latent_opportunity_generation_runs_predecessor_self_check check (
    predecessor_run_id is null or predecessor_run_id <> id
  )
);

create unique index if not exists latent_opportunity_generation_runs_id_user_object_idx
  on public.latent_opportunity_generation_runs (id, user_id, priority_reflective_object_id);

alter table public.latent_opportunity_generation_runs
  add constraint latent_opportunity_generation_runs_predecessor_fk foreign key (
    predecessor_run_id,
    user_id,
    priority_reflective_object_id
  )
  references public.latent_opportunity_generation_runs (id, user_id, priority_reflective_object_id)
  on delete restrict;

create index if not exists latent_opportunity_generation_runs_object_created_idx
  on public.latent_opportunity_generation_runs (user_id, priority_reflective_object_id, created_at desc);

create unique index if not exists latent_opportunity_generation_runs_one_current_idx
  on public.latent_opportunity_generation_runs (user_id, priority_reflective_object_id)
  where status = 'current' and superseded_at is null;

alter table public.latent_opportunity_manifestations
  add column if not exists generation_run_id text null;

with grouped_existing_manifestations as (
  select
    m.user_id,
    m.priority_reflective_object_id,
    'legacy:' || m.user_id::text || ':' || m.priority_reflective_object_id::text || ':current' as synthetic_run_id,
    min(m.created_at) as synthetic_created_at
  from public.latent_opportunity_manifestations m
  where m.generation_run_id is null
  group by m.user_id, m.priority_reflective_object_id
)
insert into public.latent_opportunity_generation_runs (
  id,
  user_id,
  priority_reflective_object_id,
  status,
  input_fingerprint,
  trigger_reason,
  predecessor_run_id,
  accepted_at,
  superseded_at,
  created_at,
  updated_at
)
select
  grouped_existing_manifestations.synthetic_run_id,
  grouped_existing_manifestations.user_id,
  grouped_existing_manifestations.priority_reflective_object_id,
  'current',
  'legacy_migration:' || grouped_existing_manifestations.priority_reflective_object_id::text,
  'legacy_manifestation_grouping',
  null,
  grouped_existing_manifestations.synthetic_created_at,
  null,
  grouped_existing_manifestations.synthetic_created_at,
  grouped_existing_manifestations.synthetic_created_at
from grouped_existing_manifestations
on conflict (id) do nothing;

update public.latent_opportunity_manifestations m
set generation_run_id = 'legacy:' || m.user_id::text || ':' || m.priority_reflective_object_id::text || ':current'
where m.generation_run_id is null;

alter table public.latent_opportunity_manifestations
  alter column generation_run_id set not null;

create unique index if not exists latent_opportunity_generation_runs_id_user_idx
  on public.latent_opportunity_generation_runs (id, user_id);

alter table public.latent_opportunity_manifestations
  add constraint latent_opportunity_manifestations_generation_run_owner_fk foreign key (
    generation_run_id,
    user_id,
    priority_reflective_object_id
  )
  references public.latent_opportunity_generation_runs (
    id,
    user_id,
    priority_reflective_object_id
  )
  on delete restrict;

create index if not exists latent_opportunity_manifestations_generation_run_created_idx
  on public.latent_opportunity_manifestations (generation_run_id, created_at desc);

create or replace function public.touch_latent_opportunity_generation_runs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_latent_opportunity_generation_runs_updated_at on public.latent_opportunity_generation_runs;
create trigger trg_touch_latent_opportunity_generation_runs_updated_at
before update on public.latent_opportunity_generation_runs
for each row
execute function public.touch_latent_opportunity_generation_runs_updated_at();

alter table public.latent_opportunity_generation_runs enable row level security;

drop policy if exists latent_opportunity_generation_runs_select_own on public.latent_opportunity_generation_runs;
create policy latent_opportunity_generation_runs_select_own
on public.latent_opportunity_generation_runs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists latent_opportunity_generation_runs_insert_own on public.latent_opportunity_generation_runs;
create policy latent_opportunity_generation_runs_insert_own
on public.latent_opportunity_generation_runs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists latent_opportunity_generation_runs_update_own on public.latent_opportunity_generation_runs;
create policy latent_opportunity_generation_runs_update_own
on public.latent_opportunity_generation_runs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists latent_opportunity_generation_runs_delete_own on public.latent_opportunity_generation_runs;
create policy latent_opportunity_generation_runs_delete_own
on public.latent_opportunity_generation_runs
for delete
to authenticated
using (auth.uid() = user_id);
