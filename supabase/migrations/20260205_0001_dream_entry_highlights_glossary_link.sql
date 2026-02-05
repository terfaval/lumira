begin;

alter table public.dream_entry_highlights
  add column if not exists glossary_term_id uuid references public.glossary_terms(id) on delete set null;

create index if not exists idx_dream_entry_highlights_glossary_term
  on public.dream_entry_highlights(glossary_term_id);

commit;
