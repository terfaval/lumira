-- Phase 10: User auth + admin bootstrap

create table if not exists public.user_admin_roles (
  user_id uuid primary key,
  role text not null default 'admin',
  granted_by uuid null,
  created_at timestamptz not null default now(),
  constraint user_admin_roles_role_check check (role in ('admin'))
);

create index if not exists user_admin_roles_created_at_idx
  on public.user_admin_roles (created_at desc);

alter table public.user_admin_roles enable row level security;

drop policy if exists user_admin_roles_select_authenticated on public.user_admin_roles;
create policy user_admin_roles_select_authenticated
on public.user_admin_roles
for select
to authenticated
using (true);

drop policy if exists user_admin_roles_insert_bootstrap_or_admin on public.user_admin_roles;
create policy user_admin_roles_insert_bootstrap_or_admin
on public.user_admin_roles
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    not exists (
      select 1
      from public.user_admin_roles existing_admins
    )
    or exists (
      select 1
      from public.user_admin_roles own_admin
      where own_admin.user_id = auth.uid()
    )
  )
);
