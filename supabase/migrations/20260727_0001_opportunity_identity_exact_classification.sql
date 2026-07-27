create index if not exists anchor_participations_user_opportunity_anchor_idx
  on public.anchor_participations (user_id, opportunity_id, anchor_id)
  where opportunity_id is not null;

create index if not exists anchor_participations_user_opportunity_manifestation_anchor_idx
  on public.anchor_participations (user_id, opportunity_manifestation_id, anchor_id)
  where opportunity_manifestation_id is not null;

create or replace function public.classify_opportunity_anchor_identity_exact(
  p_user_id uuid,
  p_lookup_kind text,
  p_lookup_value text
)
returns table (
  kind text,
  representative_anchor_ids text[]
)
language plpgsql
stable
as $$
declare
  v_representative_anchor_ids text[];
begin
  if p_lookup_kind not in ('opportunity_id', 'opportunity_manifestation_id') then
    raise exception 'Unsupported opportunity lookup kind: %', p_lookup_kind;
  end if;

  if p_lookup_kind = 'opportunity_id' then
    select coalesce(array_agg(distinct_anchor_id order by distinct_anchor_id), array[]::text[])
    into v_representative_anchor_ids
    from (
      select ap.anchor_id as distinct_anchor_id
      from public.anchor_participations ap
      where ap.user_id = p_user_id
        and ap.opportunity_id = p_lookup_value
      group by ap.anchor_id
      order by ap.anchor_id
      limit 2
    ) distinct_anchors;
  else
    select coalesce(array_agg(distinct_anchor_id order by distinct_anchor_id), array[]::text[])
    into v_representative_anchor_ids
    from (
      select ap.anchor_id as distinct_anchor_id
      from public.anchor_participations ap
      where ap.user_id = p_user_id
        and ap.opportunity_manifestation_id = p_lookup_value
      group by ap.anchor_id
      order by ap.anchor_id
      limit 2
    ) distinct_anchors;
  end if;

  if coalesce(array_length(v_representative_anchor_ids, 1), 0) = 0 then
    return query
    select 'none'::text, array[]::text[];
  elsif array_length(v_representative_anchor_ids, 1) = 1 then
    return query
    select 'unique'::text, v_representative_anchor_ids;
  else
    return query
    select 'ambiguous'::text, v_representative_anchor_ids;
  end if;
end;
$$;

comment on function public.classify_opportunity_anchor_identity_exact(uuid, text, text) is
  'Returns an exact zero/one/many Anchor identity classification for one user-scoped opportunity lookup. The result remains exact under transport-layer row limits because distinct-anchor detection happens inside PostgreSQL before the repository receives the response.';
