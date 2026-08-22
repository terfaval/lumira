create table if not exists public.observation_v3_authorities (
  authority_id text primary key,
  user_id uuid not null,
  reflective_object_id uuid not null,
  canonical_candidate_id text not null,
  canonical_hash text not null,
  source_id text not null,
  source_hash text not null,
  source_length integer not null,
  admission_disposition text not null,
  policy_fingerprint text not null,
  admission_contract_fingerprint text not null,
  canonical_candidate jsonb not null,
  provenance_manifest jsonb not null,
  completeness_payload jsonb not null,
  memory_realization_validation jsonb not null,
  evidence_integrity jsonb not null,
  uncertainty_preservation jsonb not null,
  admission_identity_input_comparison jsonb not null,
  governance_observations jsonb not null default '[]'::jsonb,
  admission_decision jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint observation_v3_authorities_admission_disposition_check check (
    admission_disposition in ('admitted', 'admitted_with_observations')
  ),
  constraint observation_v3_authorities_reflective_object_owner_fk foreign key (reflective_object_id, user_id)
    references public.reflective_objects (id, user_id)
    on delete cascade
);

create unique index if not exists observation_v3_authorities_reflective_object_user_idx
  on public.observation_v3_authorities (reflective_object_id, user_id);

create unique index if not exists observation_v3_authorities_canonical_candidate_idx
  on public.observation_v3_authorities (canonical_candidate_id);

create index if not exists observation_v3_authorities_user_created_idx
  on public.observation_v3_authorities (user_id, created_at desc);

create or replace function public.touch_observation_v3_authorities_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_observation_v3_authorities_updated_at on public.observation_v3_authorities;
create trigger trg_touch_observation_v3_authorities_updated_at
before update on public.observation_v3_authorities
for each row
execute function public.touch_observation_v3_authorities_updated_at();

alter table public.observation_v3_authorities enable row level security;

drop policy if exists observation_v3_authorities_select_own on public.observation_v3_authorities;
create policy observation_v3_authorities_select_own
on public.observation_v3_authorities
for select
to authenticated
using (
  auth.uid() = user_id
);

drop policy if exists observation_v3_authorities_insert_own on public.observation_v3_authorities;
create policy observation_v3_authorities_insert_own
on public.observation_v3_authorities
for insert
to authenticated
with check (
  auth.uid() = user_id
);

drop policy if exists observation_v3_authorities_update_own on public.observation_v3_authorities;
create policy observation_v3_authorities_update_own
on public.observation_v3_authorities
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);
