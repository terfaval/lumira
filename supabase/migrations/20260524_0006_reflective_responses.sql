-- Phase 5b: Reflective response scaffold

create table if not exists public.reflective_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  response_text text not null,
  state text not null default 'active',
  visibility text not null default 'ambient',
  source text not null default 'manual_entry',
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reflective_responses_state_check check (state in ('active', 'quiet', 'archived')),
  constraint reflective_responses_visibility_check check (visibility in ('foreground', 'ambient', 'hidden')),
  constraint reflective_responses_source_check check (source in ('manual_entry', 'guided_prompt_response'))
);

create unique index if not exists reflective_responses_id_user_id_idx
  on public.reflective_responses (id, user_id);

create index if not exists reflective_responses_user_created_idx
  on public.reflective_responses (user_id, created_at desc);

create index if not exists reflective_responses_user_active_idx
  on public.reflective_responses (user_id)
  where archived_at is null;

create table if not exists public.response_object_associations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  response_id uuid not null,
  reflective_object_id uuid not null,
  association_label text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint response_object_associations_response_owner_fk foreign key (response_id, user_id)
    references public.reflective_responses (id, user_id)
    on delete cascade,
  constraint response_object_associations_object_owner_fk foreign key (reflective_object_id, user_id)
    references public.reflective_objects (id, user_id)
    on delete cascade,
  constraint response_object_associations_unique unique (response_id, reflective_object_id)
);

create index if not exists response_object_associations_user_response_idx
  on public.response_object_associations (user_id, response_id);

create table if not exists public.response_thread_associations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  response_id uuid not null,
  thread_id uuid not null,
  association_label text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint response_thread_associations_response_owner_fk foreign key (response_id, user_id)
    references public.reflective_responses (id, user_id)
    on delete cascade,
  constraint response_thread_associations_thread_owner_fk foreign key (thread_id, user_id)
    references public.reflective_threads (id, user_id)
    on delete cascade,
  constraint response_thread_associations_unique unique (response_id, thread_id)
);

create index if not exists response_thread_associations_user_response_idx
  on public.response_thread_associations (user_id, response_id);

create or replace function public.touch_reflective_responses_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_response_object_associations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_response_thread_associations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_reflective_responses_updated_at on public.reflective_responses;
create trigger trg_touch_reflective_responses_updated_at
before update on public.reflective_responses
for each row
execute function public.touch_reflective_responses_updated_at();

drop trigger if exists trg_touch_response_object_associations_updated_at on public.response_object_associations;
create trigger trg_touch_response_object_associations_updated_at
before update on public.response_object_associations
for each row
execute function public.touch_response_object_associations_updated_at();

drop trigger if exists trg_touch_response_thread_associations_updated_at on public.response_thread_associations;
create trigger trg_touch_response_thread_associations_updated_at
before update on public.response_thread_associations
for each row
execute function public.touch_response_thread_associations_updated_at();

alter table public.reflective_responses enable row level security;
alter table public.response_object_associations enable row level security;
alter table public.response_thread_associations enable row level security;

drop policy if exists reflective_responses_select_own_active on public.reflective_responses;
create policy reflective_responses_select_own_active
on public.reflective_responses
for select
to authenticated
using (
  auth.uid() = user_id
  and archived_at is null
);

drop policy if exists reflective_responses_insert_own on public.reflective_responses;
create policy reflective_responses_insert_own
on public.reflective_responses
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists reflective_responses_update_own on public.reflective_responses;
create policy reflective_responses_update_own
on public.reflective_responses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists response_object_associations_select_own on public.response_object_associations;
create policy response_object_associations_select_own
on public.response_object_associations
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists response_object_associations_insert_own on public.response_object_associations;
create policy response_object_associations_insert_own
on public.response_object_associations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists response_object_associations_update_own on public.response_object_associations;
create policy response_object_associations_update_own
on public.response_object_associations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists response_object_associations_delete_own on public.response_object_associations;
create policy response_object_associations_delete_own
on public.response_object_associations
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists response_thread_associations_select_own on public.response_thread_associations;
create policy response_thread_associations_select_own
on public.response_thread_associations
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists response_thread_associations_insert_own on public.response_thread_associations;
create policy response_thread_associations_insert_own
on public.response_thread_associations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists response_thread_associations_update_own on public.response_thread_associations;
create policy response_thread_associations_update_own
on public.response_thread_associations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists response_thread_associations_delete_own on public.response_thread_associations;
create policy response_thread_associations_delete_own
on public.response_thread_associations
for delete
to authenticated
using (auth.uid() = user_id);
