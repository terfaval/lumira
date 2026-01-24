begin;

alter table public.term_candidates
  add column if not exists display_label text;

update public.term_candidates
set display_label = term
where display_label is null;

commit;
