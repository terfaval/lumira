begin;

-- ─────────────────────────────────────────────────────────────
-- 5) Memory / Glossary (non-interpretive)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.glossary_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  canonical text not null,
  created_at timestamptz not null default now(),

  constraint uq_glossary_terms_user_canonical unique (user_id, canonical)
);

create index if not exists idx_glossary_terms_user_created
on public.glossary_terms (user_id, created_at desc);

create table if not exists public.glossary_occurrences (
  term_id uuid not null references public.glossary_terms(id) on delete cascade,
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  source text not null default 'observation' check (source in ('observation','user_note','import')),
  created_at timestamptz not null default now(),

  primary key (term_id, session_id)
);

create index if not exists idx_glossary_occurrences_user_created
on public.glossary_occurrences (user_id, created_at desc);

create index if not exists idx_glossary_occurrences_session
on public.glossary_occurrences (session_id);

create table if not exists public.glossary_notes (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.glossary_terms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_glossary_notes_term_created
on public.glossary_notes (term_id, created_at desc);

create table if not exists public.term_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  term text not null,
  count int not null default 0,
  last_seen_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_term_candidates_user_term unique (user_id, term)
);

drop trigger if exists trg_term_candidates_updated_at on public.term_candidates;
create trigger trg_term_candidates_updated_at
before update on public.term_candidates
for each row execute function public.set_updated_at();

create index if not exists idx_term_candidates_user_count
on public.term_candidates (user_id, count desc);

alter table public.glossary_terms enable row level security;
alter table public.glossary_occurrences enable row level security;
alter table public.glossary_notes enable row level security;
alter table public.term_candidates enable row level security;

-- 1) glossary_terms: category
alter table public.glossary_terms
add column if not exists category text;

create index if not exists idx_glossary_terms_user_category
on public.glossary_terms(user_id, category);

-- 2) glossary_occurrence_events (scene-level)
create table if not exists public.glossary_occurrence_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  term_id uuid not null references public.glossary_terms(id) on delete cascade,
  session_id uuid not null references public.dream_sessions(id) on delete cascade,

  scene_idx int not null,
  anchor_name text,
  anchor_category text,
  evidence jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint uq_glossary_occ_event unique (user_id, term_id, session_id, scene_idx, anchor_name)
);

create index if not exists idx_glossary_occ_event_user_term_created
on public.glossary_occurrence_events(user_id, term_id, created_at desc);

create index if not exists idx_glossary_occ_event_session
on public.glossary_occurrence_events(session_id);

alter table public.glossary_occurrence_events enable row level security;

drop policy if exists "read_own_glossary_occurrence_events" on public.glossary_occurrence_events;
create policy "read_own_glossary_occurrence_events"
on public.glossary_occurrence_events for select
using (user_id = auth.uid());

drop policy if exists "write_own_glossary_occurrence_events" on public.glossary_occurrence_events;
create policy "write_own_glossary_occurrence_events"
on public.glossary_occurrence_events for insert
with check (user_id = auth.uid());

drop policy if exists "update_own_glossary_occurrence_events" on public.glossary_occurrence_events;
create policy "update_own_glossary_occurrence_events"
on public.glossary_occurrence_events for update
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3) delete policies a glossary táblákra (mert ezt döntötted el)
drop policy if exists "delete_own_glossary_terms" on public.glossary_terms;
create policy "delete_own_glossary_terms"
on public.glossary_terms for delete
using (user_id = auth.uid());

drop policy if exists "delete_own_glossary_occurrences" on public.glossary_occurrences;
create policy "delete_own_glossary_occurrences"
on public.glossary_occurrences for delete
using (user_id = auth.uid());

drop policy if exists "delete_own_glossary_notes" on public.glossary_notes;
create policy "delete_own_glossary_notes"
on public.glossary_notes for delete
using (user_id = auth.uid());

drop policy if exists "delete_own_term_candidates" on public.term_candidates;
create policy "delete_own_term_candidates"
on public.term_candidates for delete
using (user_id = auth.uid());

commit;


alter table public.glossary_terms
  add column if not exists canonical_key text;

-- backfill (ha már vannak adatok; a backfill-t appból is lehet futtatni)
-- itt csak jelzés: ha van sql anchorKey függvényed, használd, különben app script

create index if not exists idx_glossary_terms_user_canonical_key
  on public.glossary_terms(user_id, canonical_key);

-- opcionális, de erősen ajánlott: canonical_key alapján is legyen uniq (különben “Iskola” vs “iskola” duplázódhat)
create unique index if not exists uq_glossary_terms_user_canonical_key
  on public.glossary_terms(user_id, canonical_key)
  where canonical_key is not null;

-- Glossary tables
do $$
declare t text;
begin
  foreach t in array array['glossary_terms','glossary_occurrences','glossary_notes','term_candidates']
  loop
    execute format('drop policy if exists "read_own_%1$s" on public.%1$s;', t);
    execute format('create policy "read_own_%1$s" on public.%1$s for select to authenticated using (user_id = auth.uid());', t);

    execute format('drop policy if exists "write_own_%1$s" on public.%1$s;', t);
    execute format('create policy "write_own_%1$s" on public.%1$s for insert to authenticated with check (user_id = auth.uid());', t);

    execute format('drop policy if exists "update_own_%1$s" on public.%1$s;', t);
    execute format('create policy "update_own_%1$s" on public.%1$s for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());', t);
  end loop;
end $$;

alter table public.glossary_occurrences
  drop constraint if exists glossary_occurrences_pkey;

alter table public.glossary_occurrences
  add primary key (user_id, term_id, session_id);
