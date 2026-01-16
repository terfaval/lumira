-- supabase/migrations/20260111120000_create_dream_glossary.sql

-- Create table for personal dream glossary items.
-- Each item belongs to a specific user and captures a recurring element
-- (such as a person, place, object or feeling) along with optional
-- categories, free-form notes and a flag for nightmare content.

create table if not exists public.dream_glossary_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),

  name text not null,
  categories text[] not null default '{}'::text[],
  notes text not null default '',
  is_nightmare boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dream_glossary_items_user_idx
  on public.dream_glossary_items (user_id, created_at desc);

create trigger trg_dream_glossary_items_updated_at
before update on public.dream_glossary_items
for each row execute function public.set_updated_at();

-- Enable Row Level Security
alter table public.dream_glossary_items
  enable row level security;

-- Policies to allow authenticated users to access their own glossary entries

drop policy if exists "Users can select own glossary items" on public.dream_glossary_items;
create policy "Users can select own glossary items"
  on public.dream_glossary_items
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own glossary items" on public.dream_glossary_items;
create policy "Users can insert own glossary items"
  on public.dream_glossary_items
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own glossary items" on public.dream_glossary_items;
create policy "Users can update own glossary items"
  on public.dream_glossary_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own glossary items" on public.dream_glossary_items;
create policy "Users can delete own glossary items"
  on public.dream_glossary_items
  for delete
  using (auth.uid() = user_id);