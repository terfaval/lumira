begin;

-- Deduplicate notes so we can enforce 1 note per (user_id, term_id).
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, term_id
      order by created_at desc, id desc
    ) as rn
  from public.glossary_notes
)
delete from public.glossary_notes
using ranked
where public.glossary_notes.id = ranked.id
  and ranked.rn > 1;

alter table public.glossary_notes
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_glossary_notes_updated_at on public.glossary_notes;
create trigger trg_glossary_notes_updated_at
before update on public.glossary_notes
for each row execute function public.set_updated_at();

create unique index if not exists uq_glossary_notes_user_term
  on public.glossary_notes(user_id, term_id);

commit;
