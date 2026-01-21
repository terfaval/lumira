-- Anchor ranking v1: glossary canonical_key + dream anchor store

begin;

create extension if not exists unaccent;

create or replace function public.anchor_key(raw text)
returns text
language plpgsql
immutable
as $$
declare
  cleaned text;
  tokens text[];
  token text;
  out_tokens text[] := '{}';
  stopwords text[] := array[
    'a','az','egy','es','vagy','hogy','de','mert','amikor','ahogy','mar','meg',
    'is','se','sem','ott','itt','oda','ide','innen','onnan','valami','valaki',
    'nagyon','kicsit'
  ];
begin
  if raw is null then
    return '';
  end if;

  cleaned := regexp_replace(unaccent(lower(raw)), '[^a-z0-9]+', ' ', 'g');
  tokens := regexp_split_to_array(cleaned, '\s+');

  foreach token in array tokens loop
    if token is null or length(token) < 3 then
      continue;
    end if;
    if token = any(stopwords) then
      continue;
    end if;
    out_tokens := array_append(out_tokens, token);
  end loop;

  return array_to_string(out_tokens, ' ');
end;
$$;

alter table public.glossary_terms
  add column if not exists canonical_key text;

update public.glossary_terms
set canonical_key = public.anchor_key(canonical)
where canonical_key is null;

alter table public.glossary_terms
  alter column canonical_key set not null;

create index if not exists idx_glossary_terms_user_canonical_key
  on public.glossary_terms (user_id, canonical_key);

create table if not exists public.dream_anchor_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  input_hash text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint uq_dream_anchor_versions_user_session_input unique (user_id, session_id, input_hash)
);

create index if not exists idx_dream_anchor_versions_session_created
  on public.dream_anchor_versions (session_id, created_at desc);

create table if not exists public.dream_anchor_latest (
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version_id uuid not null references public.dream_anchor_versions(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

drop trigger if exists trg_dream_anchor_latest_updated_at on public.dream_anchor_latest;
create trigger trg_dream_anchor_latest_updated_at
before update on public.dream_anchor_latest
for each row execute function public.set_updated_at();

create index if not exists idx_dream_anchor_latest_user
  on public.dream_anchor_latest (user_id);

alter table public.dream_anchor_versions enable row level security;
alter table public.dream_anchor_latest enable row level security;

drop policy if exists "read_own_dream_anchor_versions" on public.dream_anchor_versions;
create policy "read_own_dream_anchor_versions" on public.dream_anchor_versions
for select using (user_id = auth.uid());

drop policy if exists "write_own_dream_anchor_versions" on public.dream_anchor_versions;
create policy "write_own_dream_anchor_versions" on public.dream_anchor_versions
for insert with check (user_id = auth.uid());

drop policy if exists "read_own_dream_anchor_latest" on public.dream_anchor_latest;
create policy "read_own_dream_anchor_latest" on public.dream_anchor_latest
for select using (user_id = auth.uid());

drop policy if exists "write_own_dream_anchor_latest" on public.dream_anchor_latest;
create policy "write_own_dream_anchor_latest" on public.dream_anchor_latest
for insert with check (user_id = auth.uid());

drop policy if exists "update_own_dream_anchor_latest" on public.dream_anchor_latest;
create policy "update_own_dream_anchor_latest" on public.dream_anchor_latest
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

commit;
