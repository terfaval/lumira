create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  candidate_id uuid not null,
  thread_id uuid not null,
  source_response_id uuid not null,
  source_opening_id uuid null,
  source_reflective_object_ids uuid[] not null default '{}'::uuid[],
  statement text not null,
  pattern text[] not null default '{}'::text[],
  admitted_at timestamptz not null default now(),
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reflections_candidate_owner_fk foreign key (candidate_id, user_id)
    references public.reflection_candidates (id, user_id)
    on delete cascade,
  constraint reflections_thread_owner_fk foreign key (thread_id, user_id)
    references public.reflective_threads (id, user_id)
    on delete cascade,
  constraint reflections_response_owner_fk foreign key (source_response_id, user_id)
    references public.reflective_responses (id, user_id)
    on delete cascade,
  constraint reflections_opening_owner_fk foreign key (source_opening_id, user_id)
    references public.openings (id, user_id)
    on delete set null,
  constraint reflections_candidate_unique unique (candidate_id)
);

create unique index if not exists reflections_id_user_id_idx
  on public.reflections (id, user_id);

create index if not exists reflections_user_thread_idx
  on public.reflections (user_id, thread_id, created_at desc);

create index if not exists reflections_user_active_idx
  on public.reflections (user_id)
  where archived_at is null;

create or replace function public.touch_reflections_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_reflections_updated_at on public.reflections;
create trigger trg_touch_reflections_updated_at
before update on public.reflections
for each row
execute function public.touch_reflections_updated_at();

alter table public.reflections enable row level security;

drop policy if exists reflections_select_own_active on public.reflections;
create policy reflections_select_own_active
on public.reflections
for select
to authenticated
using (
  auth.uid() = user_id
  and archived_at is null
);

drop policy if exists reflections_insert_own on public.reflections;
create policy reflections_insert_own
on public.reflections
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists reflections_update_own on public.reflections;
create policy reflections_update_own
on public.reflections
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
