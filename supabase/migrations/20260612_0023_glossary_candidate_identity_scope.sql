drop index if exists public.glossary_candidate_states_user_object_key_active_idx;

create unique index if not exists glossary_candidate_states_user_object_category_key_active_idx
  on public.glossary_candidate_states (user_id, reflective_object_id, source_category, normalized_key)
  where archived_at is null;
