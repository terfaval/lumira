alter table public.glossary_terms
  add column if not exists type text not null default 'concept',
  add column if not exists canonical_label text,
  add column if not exists aliases text[] not null default '{}'::text[],
  add column if not exists general_note text null,
  add column if not exists appearance_count integer not null default 0;

update public.glossary_terms
set canonical_label = coalesce(canonical_label, display_label),
    general_note = coalesce(general_note, notes),
    aliases = coalesce(aliases, '{}'::text[]),
    appearance_count = coalesce(appearance_count, 0),
    type = coalesce(type, 'concept');

alter table public.glossary_terms
  alter column canonical_label set not null;

alter table public.glossary_terms
  drop constraint if exists glossary_terms_type_check;

alter table public.glossary_terms
  add constraint glossary_terms_type_check check (
    type in (
      'person',
      'place',
      'animal_or_creature',
      'object',
      'setting_or_space',
      'role',
      'concept'
    )
  );
