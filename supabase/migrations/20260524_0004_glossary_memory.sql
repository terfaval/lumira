-- Phase 4: Glossary memory scaffold

create table if not exists public.glossary_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  normalized_key text not null,
  display_label text not null,
  notes text null,
  state text not null default 'active',
  suppression_state text not null default 'none',
  suppression_reason text null,
  suppressed_at timestamptz null,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint glossary_terms_state_check check (state in ('active', 'archived')),
  constraint glossary_terms_suppression_state_check check (suppression_state in ('none', 'suppressed'))
);

create unique index if not exists glossary_terms_id_user_id_idx
  on public.glossary_terms (id, user_id);

create unique index if not exists glossary_terms_user_normalized_active_idx
  on public.glossary_terms (user_id, normalized_key)
  where archived_at is null;

create index if not exists glossary_terms_user_created_idx
  on public.glossary_terms (user_id, created_at desc);

create table if not exists public.glossary_candidate_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  reflective_object_id uuid not null,
  normalized_key text not null,
  display_label text not null,
  source_category text not null,
  source_observation_id uuid null,
  source_observation_fragment_id uuid null,
  recurrence_count integer not null default 1,
  state text not null default 'candidate',
  suppression_state text not null default 'none',
  suppression_reason text null,
  suppressed_at timestamptz null,
  last_seen_at timestamptz not null default now(),
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint glossary_candidate_states_source_category_check check (
    source_category in (
      'scene',
      'actor',
      'interaction',
      'emotion',
      'location',
      'transition',
      'object',
      'body_state',
      'dream_quality',
      'recurrence_candidate'
    )
  ),
  constraint glossary_candidate_states_state_check check (
    state in ('candidate', 'pinned', 'suppressed', 'ignored')
  ),
  constraint glossary_candidate_states_suppression_state_check check (
    suppression_state in ('none', 'suppressed')
  ),
  constraint glossary_candidate_states_recurrence_count_check check (recurrence_count >= 1),
  constraint glossary_candidate_states_reflective_object_owner_fk foreign key (reflective_object_id, user_id)
    references public.reflective_objects (id, user_id)
    on delete cascade
);

create unique index if not exists glossary_candidate_states_user_object_key_active_idx
  on public.glossary_candidate_states (user_id, reflective_object_id, normalized_key)
  where archived_at is null;

create index if not exists glossary_candidate_states_user_created_idx
  on public.glossary_candidate_states (user_id, created_at desc);

create table if not exists public.glossary_associations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  glossary_term_id uuid not null,
  reflective_object_id uuid null,
  observation_id uuid null,
  observation_fragment_id uuid null,
  association_label text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint glossary_associations_glossary_term_owner_fk foreign key (glossary_term_id, user_id)
    references public.glossary_terms (id, user_id)
    on delete cascade
);

create index if not exists glossary_associations_user_term_created_idx
  on public.glossary_associations (user_id, glossary_term_id, created_at desc);

create or replace function public.touch_glossary_terms_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_glossary_candidate_states_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_glossary_associations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_glossary_terms_updated_at on public.glossary_terms;
create trigger trg_touch_glossary_terms_updated_at
before update on public.glossary_terms
for each row
execute function public.touch_glossary_terms_updated_at();

drop trigger if exists trg_touch_glossary_candidate_states_updated_at on public.glossary_candidate_states;
create trigger trg_touch_glossary_candidate_states_updated_at
before update on public.glossary_candidate_states
for each row
execute function public.touch_glossary_candidate_states_updated_at();

drop trigger if exists trg_touch_glossary_associations_updated_at on public.glossary_associations;
create trigger trg_touch_glossary_associations_updated_at
before update on public.glossary_associations
for each row
execute function public.touch_glossary_associations_updated_at();

alter table public.glossary_terms enable row level security;
alter table public.glossary_candidate_states enable row level security;
alter table public.glossary_associations enable row level security;

drop policy if exists glossary_terms_select_own_active on public.glossary_terms;
create policy glossary_terms_select_own_active
on public.glossary_terms
for select
to authenticated
using (
  auth.uid() = user_id
  and archived_at is null
);

drop policy if exists glossary_terms_insert_own on public.glossary_terms;
create policy glossary_terms_insert_own
on public.glossary_terms
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists glossary_terms_update_own on public.glossary_terms;
create policy glossary_terms_update_own
on public.glossary_terms
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists glossary_candidate_states_select_own_active on public.glossary_candidate_states;
create policy glossary_candidate_states_select_own_active
on public.glossary_candidate_states
for select
to authenticated
using (
  auth.uid() = user_id
  and archived_at is null
);

drop policy if exists glossary_candidate_states_insert_own on public.glossary_candidate_states;
create policy glossary_candidate_states_insert_own
on public.glossary_candidate_states
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists glossary_candidate_states_update_own on public.glossary_candidate_states;
create policy glossary_candidate_states_update_own
on public.glossary_candidate_states
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists glossary_associations_select_own on public.glossary_associations;
create policy glossary_associations_select_own
on public.glossary_associations
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists glossary_associations_insert_own on public.glossary_associations;
create policy glossary_associations_insert_own
on public.glossary_associations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists glossary_associations_update_own on public.glossary_associations;
create policy glossary_associations_update_own
on public.glossary_associations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
