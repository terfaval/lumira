begin;

create table if not exists public.archetype_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  canonical_key text not null,
  canonical_label text not null,
  aliases text[] null,
  alias_keys text[] null,
  status text not null default 'proposed',
  provenance text not null default 'auto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_archetype_terms_user_domain_key unique (user_id, domain, canonical_key)
);

create index if not exists idx_archetype_terms_user_domain
  on public.archetype_terms (user_id, domain);

create index if not exists idx_archetype_terms_alias_keys
  on public.archetype_terms using gin (alias_keys);

drop trigger if exists trg_archetype_terms_updated_at on public.archetype_terms;
create trigger trg_archetype_terms_updated_at
before update on public.archetype_terms
for each row execute function public.set_updated_at();

create table if not exists public.archetype_term_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  canonical_key text not null,
  canonical_label text not null,
  aliases text[] null,
  evidence jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_archetype_term_queue_user_domain
  on public.archetype_term_queue (user_id, domain);

drop trigger if exists trg_archetype_term_queue_updated_at on public.archetype_term_queue;
create trigger trg_archetype_term_queue_updated_at
before update on public.archetype_term_queue
for each row execute function public.set_updated_at();

alter table public.archetype_terms enable row level security;
alter table public.archetype_term_queue enable row level security;

drop policy if exists "read_own_archetype_terms" on public.archetype_terms;
create policy "read_own_archetype_terms" on public.archetype_terms
for select using (user_id = auth.uid());

drop policy if exists "write_own_archetype_terms" on public.archetype_terms;
create policy "write_own_archetype_terms" on public.archetype_terms
for insert with check (user_id = auth.uid());

drop policy if exists "update_own_archetype_terms" on public.archetype_terms;
create policy "update_own_archetype_terms" on public.archetype_terms
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "read_own_archetype_term_queue" on public.archetype_term_queue;
create policy "read_own_archetype_term_queue" on public.archetype_term_queue
for select using (user_id = auth.uid());

drop policy if exists "write_own_archetype_term_queue" on public.archetype_term_queue;
create policy "write_own_archetype_term_queue" on public.archetype_term_queue
for insert with check (user_id = auth.uid());

drop policy if exists "update_own_archetype_term_queue" on public.archetype_term_queue;
create policy "update_own_archetype_term_queue" on public.archetype_term_queue
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

commit;
