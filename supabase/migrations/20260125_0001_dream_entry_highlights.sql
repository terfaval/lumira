begin;

create table if not exists public.dream_entry_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  entry_id uuid not null references public.dream_entries(id) on delete cascade,

  start_offset int not null,
  end_offset int not null,
  text text not null,
  category text not null,
  note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dream_entry_highlights_entry
  on public.dream_entry_highlights(entry_id, created_at desc);

create index if not exists idx_dream_entry_highlights_session
  on public.dream_entry_highlights(session_id, created_at desc);

create index if not exists idx_dream_entry_highlights_user
  on public.dream_entry_highlights(user_id, created_at desc);

alter table public.dream_entry_highlights enable row level security;

drop policy if exists "read_own_dream_entry_highlights" on public.dream_entry_highlights;
create policy "read_own_dream_entry_highlights" on public.dream_entry_highlights
for select using (user_id = auth.uid());

drop policy if exists "write_own_dream_entry_highlights" on public.dream_entry_highlights;
create policy "write_own_dream_entry_highlights" on public.dream_entry_highlights
for insert with check (user_id = auth.uid());

drop policy if exists "update_own_dream_entry_highlights" on public.dream_entry_highlights;
create policy "update_own_dream_entry_highlights" on public.dream_entry_highlights
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "delete_own_dream_entry_highlights" on public.dream_entry_highlights;
create policy "delete_own_dream_entry_highlights" on public.dream_entry_highlights
for delete using (user_id = auth.uid());

drop trigger if exists trg_dream_entry_highlights_updated_at on public.dream_entry_highlights;
create trigger trg_dream_entry_highlights_updated_at
before update on public.dream_entry_highlights
for each row execute function public.set_updated_at();

drop policy if exists "update_own_entries" on public.dream_entries;
create policy "update_own_entries" on public.dream_entries
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

commit;
