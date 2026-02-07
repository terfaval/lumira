begin;

alter table public.glossary_occurrences
  add column if not exists count int not null default 1;

update public.glossary_occurrences
  set count = 1
  where count is null;

commit;
