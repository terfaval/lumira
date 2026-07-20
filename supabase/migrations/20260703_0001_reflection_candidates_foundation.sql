create table if not exists public.reflection_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  thread_id uuid not null,
  source_response_id uuid not null,
  source_opening_id uuid null,
  source_reflective_object_ids uuid[] not null default '{}'::uuid[],
  state text not null default 'provisional',
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reflection_candidates_state_check check (state in ('provisional')),
  constraint reflection_candidates_thread_owner_fk foreign key (thread_id, user_id)
    references public.reflective_threads (id, user_id)
    on delete cascade,
  constraint reflection_candidates_response_owner_fk foreign key (source_response_id, user_id)
    references public.reflective_responses (id, user_id)
    on delete cascade,
  constraint reflection_candidates_opening_owner_fk foreign key (source_opening_id, user_id)
    references public.openings (id, user_id)
    on delete set null,
  constraint reflection_candidates_response_unique unique (source_response_id)
);

create unique index if not exists reflection_candidates_id_user_id_idx
  on public.reflection_candidates (id, user_id);

create index if not exists reflection_candidates_user_thread_idx
  on public.reflection_candidates (user_id, thread_id, created_at desc);

create index if not exists reflection_candidates_user_active_idx
  on public.reflection_candidates (user_id)
  where archived_at is null;

create or replace function public.touch_reflection_candidates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_reflection_candidates_updated_at on public.reflection_candidates;
create trigger trg_touch_reflection_candidates_updated_at
before update on public.reflection_candidates
for each row
execute function public.touch_reflection_candidates_updated_at();

alter table public.reflection_candidates enable row level security;

drop policy if exists reflection_candidates_select_own_active on public.reflection_candidates;
create policy reflection_candidates_select_own_active
on public.reflection_candidates
for select
to authenticated
using (
  auth.uid() = user_id
  and archived_at is null
);

drop policy if exists reflection_candidates_insert_own on public.reflection_candidates;
create policy reflection_candidates_insert_own
on public.reflection_candidates
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists reflection_candidates_update_own on public.reflection_candidates;
create policy reflection_candidates_update_own
on public.reflection_candidates
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
