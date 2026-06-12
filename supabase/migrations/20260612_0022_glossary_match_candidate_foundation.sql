alter table public.glossary_candidate_states
  add column if not exists candidate_class text not null default 'new_candidate',
  add column if not exists proposed_entity_ids uuid[] not null default '{}'::uuid[];

update public.glossary_candidate_states
set candidate_class = coalesce(candidate_class, 'new_candidate'),
    proposed_entity_ids = coalesce(proposed_entity_ids, '{}'::uuid[]);

alter table public.glossary_candidate_states
  drop constraint if exists glossary_candidate_states_candidate_class_check;

alter table public.glossary_candidate_states
  add constraint glossary_candidate_states_candidate_class_check check (
    candidate_class in ('match_candidate', 'ambiguous_match_candidate', 'new_candidate')
  );
