-- Phase 5: Reflective thread scaffold

create table if not exists public.reflective_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  context_note text null,
  state text not null default 'active',
  visibility text not null default 'ambient',
  continuity_cues jsonb not null default '[]'::jsonb,
  dormant_since timestamptz null,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reflective_threads_state_check check (
    state in ('active', 'dormant', 'quiet', 'archived')
  ),
  constraint reflective_threads_visibility_check check (
    visibility in ('foreground', 'ambient', 'hidden')
  )
);

create unique index if not exists reflective_threads_id_user_id_idx
  on public.reflective_threads (id, user_id);

create index if not exists reflective_threads_user_created_idx
  on public.reflective_threads (user_id, created_at desc);

create index if not exists reflective_threads_user_active_idx
  on public.reflective_threads (user_id)
  where archived_at is null;

create table if not exists public.thread_object_associations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  thread_id uuid not null,
  reflective_object_id uuid not null,
  association_label text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint thread_object_associations_thread_owner_fk foreign key (thread_id, user_id)
    references public.reflective_threads (id, user_id)
    on delete cascade,
  constraint thread_object_associations_object_owner_fk foreign key (reflective_object_id, user_id)
    references public.reflective_objects (id, user_id)
    on delete cascade,
  constraint thread_object_associations_unique unique (thread_id, reflective_object_id)
);

create index if not exists thread_object_associations_user_thread_idx
  on public.thread_object_associations (user_id, thread_id);

create table if not exists public.thread_glossary_associations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  thread_id uuid not null,
  glossary_term_id uuid not null,
  association_label text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint thread_glossary_associations_thread_owner_fk foreign key (thread_id, user_id)
    references public.reflective_threads (id, user_id)
    on delete cascade,
  constraint thread_glossary_associations_term_owner_fk foreign key (glossary_term_id, user_id)
    references public.glossary_terms (id, user_id)
    on delete cascade,
  constraint thread_glossary_associations_unique unique (thread_id, glossary_term_id)
);

create index if not exists thread_glossary_associations_user_thread_idx
  on public.thread_glossary_associations (user_id, thread_id);

create or replace function public.touch_reflective_threads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_thread_object_associations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_thread_glossary_associations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_reflective_threads_updated_at on public.reflective_threads;
create trigger trg_touch_reflective_threads_updated_at
before update on public.reflective_threads
for each row
execute function public.touch_reflective_threads_updated_at();

drop trigger if exists trg_touch_thread_object_associations_updated_at on public.thread_object_associations;
create trigger trg_touch_thread_object_associations_updated_at
before update on public.thread_object_associations
for each row
execute function public.touch_thread_object_associations_updated_at();

drop trigger if exists trg_touch_thread_glossary_associations_updated_at on public.thread_glossary_associations;
create trigger trg_touch_thread_glossary_associations_updated_at
before update on public.thread_glossary_associations
for each row
execute function public.touch_thread_glossary_associations_updated_at();

alter table public.reflective_threads enable row level security;
alter table public.thread_object_associations enable row level security;
alter table public.thread_glossary_associations enable row level security;

drop policy if exists reflective_threads_select_own_active on public.reflective_threads;
create policy reflective_threads_select_own_active
on public.reflective_threads
for select
to authenticated
using (
  auth.uid() = user_id
  and archived_at is null
);

drop policy if exists reflective_threads_insert_own on public.reflective_threads;
create policy reflective_threads_insert_own
on public.reflective_threads
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists reflective_threads_update_own on public.reflective_threads;
create policy reflective_threads_update_own
on public.reflective_threads
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists thread_object_associations_select_own on public.thread_object_associations;
create policy thread_object_associations_select_own
on public.thread_object_associations
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists thread_object_associations_insert_own on public.thread_object_associations;
create policy thread_object_associations_insert_own
on public.thread_object_associations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists thread_object_associations_update_own on public.thread_object_associations;
create policy thread_object_associations_update_own
on public.thread_object_associations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists thread_glossary_associations_select_own on public.thread_glossary_associations;
create policy thread_glossary_associations_select_own
on public.thread_glossary_associations
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists thread_glossary_associations_insert_own on public.thread_glossary_associations;
create policy thread_glossary_associations_insert_own
on public.thread_glossary_associations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists thread_glossary_associations_update_own on public.thread_glossary_associations;
create policy thread_glossary_associations_update_own
on public.thread_glossary_associations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
