begin;

-- 1) sync_ledger_on_work_block_answer()
-- NOTE: trigger function, so search_path pin matters.
create or replace function public.sync_ledger_on_work_block_answer()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  q_text text;
  dir_slug text;
  ans text;
begin
  -- only for dream_analysis direction cards
  if new.block_type <> 'dream_analysis' then
    return new;
  end if;

  -- extract fields
  q_text := new.content #>> '{ai,question}';
  dir_slug := pg_catalog.coalesce(new.content #>> '{direction_slug}', 'unknown');
  ans := new.content #>> '{user,answer}';

  -- only when answer becomes non-empty (null -> value, or empty -> value)
  if (pg_catalog.coalesce(old.content #>> '{user,answer}', '') = '')
     and (pg_catalog.coalesce(ans, '') <> '') then

    update public.work_question_ledger l
    set
      answered = true,
      answer_event_id = pg_catalog.coalesce(l.answer_event_id, new.id) -- optional: use work_block id
    where l.session_id = new.session_id
      and l.user_id = new.user_id
      and l.direction_slug = dir_slug
      and l.question_text = q_text
      and l.answered = false;

  end if;

  return new;
end;
$function$;


-- 2) dump_session_json(uuid)
create or replace function public.dump_session_json(p_session_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $function$
declare
  r record;
  rows_json jsonb;
  out_json jsonb := '{}'::jsonb;
begin
  for r in
    select c.table_schema, c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema
     and t.table_name = c.table_name
    where c.column_name = 'session_id'
      and c.table_schema not in ('pg_catalog', 'information_schema')
      and t.table_type = 'BASE TABLE'
    order by c.table_schema, c.table_name
  loop
    -- For each table, aggregate matching rows into a JSON array (or [] if none)
    execute pg_catalog.format(
      'select pg_catalog.coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(x)), ''[]''::jsonb)
         from %I.%I x
        where x.session_id = $1',
      r.table_schema, r.table_name
    )
    using p_session_id
    into rows_json;

    out_json := out_json || pg_catalog.jsonb_build_object(r.table_schema || '.' || r.table_name, rows_json);
  end loop;

  return out_json;
end;
$function$;


-- 3) dump_user_json_text(text)
create or replace function public.dump_user_json_text(p_user_id text)
returns jsonb
language plpgsql
set search_path = ''
as $function$
declare
  r record;
  rows_json jsonb;
  out_json jsonb := '{}'::jsonb;
begin
  for r in
    select c.table_schema, c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema
     and t.table_name = c.table_name
    where c.column_name = 'user_id'
      and c.table_schema not in ('pg_catalog', 'information_schema')
      and t.table_type = 'BASE TABLE'
    order by c.table_schema, c.table_name
  loop
    execute pg_catalog.format(
      'select pg_catalog.coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(x)), ''[]''::jsonb)
         from %I.%I x
        where (x.user_id::text) = $1',
      r.table_schema, r.table_name
    )
    using p_user_id
    into rows_json;

    out_json := out_json || pg_catalog.jsonb_build_object(r.table_schema || '.' || r.table_name, rows_json);
  end loop;

  return out_json;
end;
$function$;


-- 4) dump_user_json_public_no_embeddings(text)
create or replace function public.dump_user_json_public_no_embeddings(p_user_id text)
returns jsonb
language plpgsql
set search_path = ''
as $function$
declare
  r record;
  drop_cols text[];
  col_name text;
  row_expr text;
  rows_json jsonb;
  out_json jsonb := '{}'::jsonb;
begin
  for r in
    select c.table_schema, c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema
     and t.table_name = c.table_name
    where c.column_name = 'user_id'
      and c.table_schema = 'public'
      and t.table_type = 'BASE TABLE'
    order by c.table_name
  loop
    -- find embedding-like columns for this table
    select pg_catalog.coalesce(pg_catalog.array_agg(c2.column_name order by c2.ordinal_position), '{}'::text[])
      into drop_cols
    from information_schema.columns c2
    where c2.table_schema = r.table_schema
      and c2.table_name = r.table_name
      and c2.column_name ilike '%embedding%';

    -- build to_jsonb(x) minus embedding-like columns (works even if none)
    row_expr := 'pg_catalog.to_jsonb(x)';
    foreach col_name in array drop_cols
    loop
      row_expr := pg_catalog.format('(%s - %L)', row_expr, col_name);
    end loop;

    execute pg_catalog.format(
      'select pg_catalog.coalesce(pg_catalog.jsonb_agg(%s), ''[]''::jsonb)
         from %I.%I x
        where (x.user_id::text) = $1',
      row_expr,
      r.table_schema, r.table_name
    )
    using p_user_id
    into rows_json;

    out_json := out_json || pg_catalog.jsonb_build_object(r.table_schema || '.' || r.table_name, rows_json);
  end loop;

  return out_json;
end;
$function$;

commit;
