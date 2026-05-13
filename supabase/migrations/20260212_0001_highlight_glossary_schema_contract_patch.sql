begin;

-- Highlight/Glossary schema-contract patch (alpha, minimal, idempotent)
-- 1) glossary_terms runtime compatibility columns selected by summary/highlights pages
alter table if exists public.glossary_terms
  add column if not exists canonical_name text,
  add column if not exists name text,
  add column if not exists term text;

update public.glossary_terms
set
  canonical_name = coalesce(canonical_name, canonical),
  name = coalesce(name, canonical),
  term = coalesce(term, canonical)
where canonical is not null
  and (canonical_name is null or name is null or term is null);

-- 2) glossary_notes optional visibility gate column used by runtime (with fallback)
alter table if exists public.glossary_notes
  add column if not exists do_not_surface boolean;

alter table if exists public.glossary_notes
  alter column do_not_surface set default false;

update public.glossary_notes
set do_not_surface = false
where do_not_surface is null;

alter table if exists public.glossary_notes
  alter column do_not_surface set not null;

-- 3) dream_session_rejected_suggestions upsert conflict path may require UPDATE policy
--    Keep owner-scoped RLS semantics.
do $$
begin
  if to_regclass('public.dream_session_rejected_suggestions') is not null then
    execute 'alter table public.dream_session_rejected_suggestions enable row level security';
    execute 'drop policy if exists "update_own_dream_session_rejected_suggestions" on public.dream_session_rejected_suggestions';
    execute 'create policy "update_own_dream_session_rejected_suggestions" on public.dream_session_rejected_suggestions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';
  end if;
end $$;

commit;
