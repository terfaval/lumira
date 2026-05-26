-- Phase 2b: Reflective Object ownership + RLS hardening

alter table public.reflective_objects enable row level security;

-- Ensure reads are user-scoped and archived rows remain hidden by default.
drop policy if exists reflective_objects_select_own_active on public.reflective_objects;
create policy reflective_objects_select_own_active
on public.reflective_objects
for select
to authenticated
using (
  auth.uid() = user_id
  and archived_at is null
);

-- Inserts require ownership alignment.
drop policy if exists reflective_objects_insert_own on public.reflective_objects;
create policy reflective_objects_insert_own
on public.reflective_objects
for insert
to authenticated
with check (
  auth.uid() = user_id
);

-- Updates (including archive) require ownership alignment.
drop policy if exists reflective_objects_update_own on public.reflective_objects;
create policy reflective_objects_update_own
on public.reflective_objects
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);
