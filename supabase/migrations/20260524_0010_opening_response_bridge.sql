-- Phase 8: Opening-to-response bridge

create table if not exists public.opening_activation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  opening_id uuid not null,
  activation_source text not null,
  activation_context text not null,
  opening_response_context text not null,
  response_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opening_activation_events_source_check check (
    activation_source in ('reflective_space_surface', 'continuity_revisit', 'manual_revisit')
  ),
  constraint opening_activation_events_context_check check (
    activation_context in ('reflective_space_surface', 'continuity_revisit', 'manual_revisit')
  ),
  constraint opening_activation_events_response_context_check check (
    opening_response_context in ('activation_without_response', 'response_authored')
  ),
  constraint opening_activation_events_opening_owner_fk foreign key (opening_id, user_id)
    references public.openings (id, user_id)
    on delete cascade,
  constraint opening_activation_events_response_owner_fk foreign key (response_id, user_id)
    references public.reflective_responses (id, user_id)
    on delete set null
);

create unique index if not exists opening_activation_events_id_user_id_idx
  on public.opening_activation_events (id, user_id);

create index if not exists opening_activation_events_user_opening_idx
  on public.opening_activation_events (user_id, opening_id, created_at desc);

create table if not exists public.opening_response_associations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  opening_id uuid not null,
  response_id uuid not null,
  activation_event_id uuid null,
  opening_response_context text not null default 'response_authored',
  opening_activation_context text not null,
  thread_id uuid null,
  association_label text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opening_response_associations_response_context_check check (
    opening_response_context in ('response_authored')
  ),
  constraint opening_response_associations_activation_context_check check (
    opening_activation_context in ('reflective_space_surface', 'continuity_revisit', 'manual_revisit')
  ),
  constraint opening_response_associations_opening_owner_fk foreign key (opening_id, user_id)
    references public.openings (id, user_id)
    on delete cascade,
  constraint opening_response_associations_response_owner_fk foreign key (response_id, user_id)
    references public.reflective_responses (id, user_id)
    on delete cascade,
  constraint opening_response_associations_activation_event_owner_fk foreign key (activation_event_id, user_id)
    references public.opening_activation_events (id, user_id)
    on delete set null,
  constraint opening_response_associations_thread_owner_fk foreign key (thread_id, user_id)
    references public.reflective_threads (id, user_id)
    on delete set null,
  constraint opening_response_associations_unique unique (opening_id, response_id)
);

create index if not exists opening_response_associations_user_opening_idx
  on public.opening_response_associations (user_id, opening_id, created_at desc);

create index if not exists opening_response_associations_user_response_idx
  on public.opening_response_associations (user_id, response_id, created_at desc);

create or replace function public.touch_opening_activation_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_opening_response_associations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_opening_activation_events_updated_at on public.opening_activation_events;
create trigger trg_touch_opening_activation_events_updated_at
before update on public.opening_activation_events
for each row
execute function public.touch_opening_activation_events_updated_at();

drop trigger if exists trg_touch_opening_response_associations_updated_at on public.opening_response_associations;
create trigger trg_touch_opening_response_associations_updated_at
before update on public.opening_response_associations
for each row
execute function public.touch_opening_response_associations_updated_at();

alter table public.opening_activation_events enable row level security;
alter table public.opening_response_associations enable row level security;

drop policy if exists opening_activation_events_select_own on public.opening_activation_events;
create policy opening_activation_events_select_own
on public.opening_activation_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists opening_activation_events_insert_own on public.opening_activation_events;
create policy opening_activation_events_insert_own
on public.opening_activation_events
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists opening_activation_events_update_own on public.opening_activation_events;
create policy opening_activation_events_update_own
on public.opening_activation_events
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists opening_activation_events_delete_own on public.opening_activation_events;
create policy opening_activation_events_delete_own
on public.opening_activation_events
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists opening_response_associations_select_own on public.opening_response_associations;
create policy opening_response_associations_select_own
on public.opening_response_associations
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists opening_response_associations_insert_own on public.opening_response_associations;
create policy opening_response_associations_insert_own
on public.opening_response_associations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists opening_response_associations_update_own on public.opening_response_associations;
create policy opening_response_associations_update_own
on public.opening_response_associations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists opening_response_associations_delete_own on public.opening_response_associations;
create policy opening_response_associations_delete_own
on public.opening_response_associations
for delete
to authenticated
using (auth.uid() = user_id);
