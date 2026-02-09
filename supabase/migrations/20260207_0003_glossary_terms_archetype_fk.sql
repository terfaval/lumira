begin;

alter table public.glossary_terms
  add column if not exists archetype_term_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'glossary_terms_archetype_term_id_fkey'
  ) then
    alter table public.glossary_terms
      add constraint glossary_terms_archetype_term_id_fkey
      foreign key (archetype_term_id)
      references public.archetype_terms(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_glossary_terms_user_archetype_term
  on public.glossary_terms(user_id, archetype_term_id);

-- Backfill: link glossary_terms to archetype_terms when there is exactly one match per user_id + canonical_key.
with matches as (
  select
    gt.id as glossary_term_id,
    at.id as archetype_term_id,
    gt.user_id,
    gt.canonical_key
  from public.glossary_terms gt
  join public.archetype_terms at
    on at.user_id = gt.user_id
   and at.canonical_key = gt.canonical_key
  where gt.archetype_term_id is null
    and gt.canonical_key is not null
),
unique_matches as (
  select user_id, canonical_key
  from matches
  group by 1,2
  having count(*) = 1
)
update public.glossary_terms gt
set archetype_term_id = m.archetype_term_id
from matches m
join unique_matches u using (user_id, canonical_key)
where gt.id = m.glossary_term_id;

commit;
