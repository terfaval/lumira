create table if not exists public.fortune_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  mode_id text not null,
  focus_text text null,
  card_selections jsonb not null default '[]'::jsonb,
  first_interpretation text null,
  state text not null default 'active',
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fortune_sessions_state_check check (state in ('active', 'completed')),
  constraint fortune_sessions_card_selections_array_check check (jsonb_typeof(card_selections) = 'array'),
  constraint fortune_sessions_completed_requires_interpretation check (state <> 'completed' or first_interpretation is not null)
);

create unique index if not exists fortune_sessions_id_user_id_idx
  on public.fortune_sessions (id, user_id);

create index if not exists fortune_sessions_user_created_at_idx
  on public.fortune_sessions (user_id, created_at desc);

create or replace function public.touch_fortune_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_fortune_sessions_updated_at on public.fortune_sessions;
create trigger trg_touch_fortune_sessions_updated_at
before update on public.fortune_sessions
for each row
execute function public.touch_fortune_sessions_updated_at();

alter table public.fortune_sessions enable row level security;

drop policy if exists fortune_sessions_select_own on public.fortune_sessions;
create policy fortune_sessions_select_own
on public.fortune_sessions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists fortune_sessions_insert_own on public.fortune_sessions;
create policy fortune_sessions_insert_own
on public.fortune_sessions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists fortune_sessions_update_own on public.fortune_sessions;
create policy fortune_sessions_update_own
on public.fortune_sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
