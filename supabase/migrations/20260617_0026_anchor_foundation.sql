create table if not exists public.anchor_identities (
  id text primary key,
  user_id uuid not null,
  anchor_type text not null,
  identity_label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anchor_identities_anchor_type_check check (
    anchor_type in ('ENTITY', 'ROLE', 'STRUCTURE')
  )
);

create unique index if not exists anchor_identities_id_user_idx
  on public.anchor_identities (id, user_id);

create index if not exists anchor_identities_user_created_idx
  on public.anchor_identities (user_id, created_at desc);

create table if not exists public.anchor_manifestations (
  id text primary key,
  anchor_id text not null,
  user_id uuid not null,
  reflective_object_id uuid not null,
  manifestation_label text not null,
  source_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anchor_manifestations_anchor_owner_fk foreign key (anchor_id, user_id)
    references public.anchor_identities (id, user_id)
    on delete cascade,
  constraint anchor_manifestations_reflective_object_owner_fk foreign key (reflective_object_id, user_id)
    references public.reflective_objects (id, user_id)
    on delete cascade,
  constraint anchor_manifestations_source_type_check check (
    source_type in ('DREAM_DERIVED', 'REFLECTIVE_OBJECT_DERIVED')
  )
);

create unique index if not exists anchor_manifestations_id_user_idx
  on public.anchor_manifestations (id, user_id);

create index if not exists anchor_manifestations_anchor_created_idx
  on public.anchor_manifestations (anchor_id, created_at desc);

create index if not exists anchor_manifestations_user_object_created_idx
  on public.anchor_manifestations (user_id, reflective_object_id, created_at desc);

create table if not exists public.anchor_participations (
  id text primary key,
  user_id uuid not null,
  anchor_id text not null,
  anchor_manifestation_id text null,
  opportunity_id text not null,
  opportunity_manifestation_id text null,
  participation_role text not null,
  confidence text not null,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anchor_participations_anchor_owner_fk foreign key (anchor_id, user_id)
    references public.anchor_identities (id, user_id)
    on delete cascade,
  constraint anchor_participations_anchor_manifestation_owner_fk foreign key (anchor_manifestation_id, user_id)
    references public.anchor_manifestations (id, user_id)
    on delete cascade,
  constraint anchor_participations_opportunity_owner_fk foreign key (opportunity_id, user_id)
    references public.latent_opportunity_identities (id, user_id)
    on delete cascade,
  constraint anchor_participations_opportunity_manifestation_owner_fk foreign key (opportunity_manifestation_id, user_id)
    references public.latent_opportunity_manifestations (id, user_id)
    on delete cascade,
  constraint anchor_participations_participation_role_check check (
    participation_role in ('EVIDENCE', 'CONTEXT', 'STRUCTURAL_SUPPORT', 'SALIENT_LINK')
  ),
  constraint anchor_participations_confidence_check check (
    confidence in ('LOW', 'MEDIUM', 'HIGH')
  ),
  constraint anchor_participations_source_check check (
    source in ('LLM_CONSTRUCTED', 'SYSTEM_DERIVED', 'USER_CONFIRMED')
  ),
  constraint anchor_participations_manifestation_pair_check check (
    (anchor_manifestation_id is null and opportunity_manifestation_id is null)
    or
    (anchor_manifestation_id is not null and opportunity_manifestation_id is not null)
  )
);

create unique index if not exists anchor_participations_id_user_idx
  on public.anchor_participations (id, user_id);

create index if not exists anchor_participations_anchor_created_idx
  on public.anchor_participations (anchor_id, created_at desc);

create index if not exists anchor_participations_opportunity_created_idx
  on public.anchor_participations (opportunity_id, created_at desc);

create or replace function public.touch_anchor_identities_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_anchor_manifestations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_anchor_participations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_anchor_identities_updated_at on public.anchor_identities;
create trigger trg_touch_anchor_identities_updated_at
before update on public.anchor_identities
for each row
execute function public.touch_anchor_identities_updated_at();

drop trigger if exists trg_touch_anchor_manifestations_updated_at on public.anchor_manifestations;
create trigger trg_touch_anchor_manifestations_updated_at
before update on public.anchor_manifestations
for each row
execute function public.touch_anchor_manifestations_updated_at();

drop trigger if exists trg_touch_anchor_participations_updated_at on public.anchor_participations;
create trigger trg_touch_anchor_participations_updated_at
before update on public.anchor_participations
for each row
execute function public.touch_anchor_participations_updated_at();

alter table public.anchor_identities enable row level security;
alter table public.anchor_manifestations enable row level security;
alter table public.anchor_participations enable row level security;

drop policy if exists anchor_identities_select_own on public.anchor_identities;
create policy anchor_identities_select_own
on public.anchor_identities
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists anchor_identities_insert_own on public.anchor_identities;
create policy anchor_identities_insert_own
on public.anchor_identities
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists anchor_identities_update_own on public.anchor_identities;
create policy anchor_identities_update_own
on public.anchor_identities
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists anchor_manifestations_select_own on public.anchor_manifestations;
create policy anchor_manifestations_select_own
on public.anchor_manifestations
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists anchor_manifestations_insert_own on public.anchor_manifestations;
create policy anchor_manifestations_insert_own
on public.anchor_manifestations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists anchor_manifestations_update_own on public.anchor_manifestations;
create policy anchor_manifestations_update_own
on public.anchor_manifestations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists anchor_participations_select_own on public.anchor_participations;
create policy anchor_participations_select_own
on public.anchor_participations
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists anchor_participations_insert_own on public.anchor_participations;
create policy anchor_participations_insert_own
on public.anchor_participations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists anchor_participations_update_own on public.anchor_participations;
create policy anchor_participations_update_own
on public.anchor_participations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
