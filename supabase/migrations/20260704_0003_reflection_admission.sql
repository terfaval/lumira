create or replace function public.admit_reflection(
  p_user_id uuid,
  p_candidate_id uuid,
  p_statement text,
  p_pattern text[]
)
returns public.reflections
language plpgsql
as $$
declare
  v_candidate public.reflection_candidates%rowtype;
  v_reflection public.reflections%rowtype;
begin
  select *
  into v_candidate
  from public.reflection_candidates
  where id = p_candidate_id
    and user_id = p_user_id
    and archived_at is null
  for update;

  if not found then
    raise exception 'Reflection admission candidate not found or already archived.';
  end if;

  insert into public.reflections (
    user_id,
    candidate_id,
    thread_id,
    source_response_id,
    source_opening_id,
    source_reflective_object_ids,
    statement,
    pattern
  )
  values (
    v_candidate.user_id,
    v_candidate.id,
    v_candidate.thread_id,
    v_candidate.source_response_id,
    v_candidate.source_opening_id,
    v_candidate.source_reflective_object_ids,
    p_statement,
    coalesce(p_pattern, '{}'::text[])
  )
  returning *
  into v_reflection;

  update public.reflection_candidates
  set archived_at = now()
  where id = v_candidate.id
    and user_id = p_user_id
    and archived_at is null;

  if not found then
    raise exception 'Failed to archive admitted reflection candidate.';
  end if;

  return v_reflection;
end;
$$;
