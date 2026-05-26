-- Phase 2: Reflective Object persistence substrate

create extension if not exists pgcrypto;

create table if not exists public.reflective_objects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  object_type text not null,
  title text not null,
  primary_content text not null,
  source_context text not null,
  state text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reflective_objects_object_type_check check (
    object_type in ('dream', 'journal_entry', 'memory', 'reflective_note')
  ),
  constraint reflective_objects_source_context_check check (
    source_context in ('manual', 'imported', 'runtime-generated')
  ),
  constraint reflective_objects_state_check check (
    state in ('active', 'archived')
  )
);

create index if not exists reflective_objects_user_created_idx
  on public.reflective_objects (user_id, created_at desc);

create index if not exists reflective_objects_user_active_idx
  on public.reflective_objects (user_id)
  where archived_at is null;

create or replace function public.touch_reflective_objects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_reflective_objects_updated_at on public.reflective_objects;

create trigger trg_touch_reflective_objects_updated_at
before update on public.reflective_objects
for each row
execute function public.touch_reflective_objects_updated_at();
