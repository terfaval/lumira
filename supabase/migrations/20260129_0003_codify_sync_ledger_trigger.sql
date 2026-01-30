begin;

-- Codify trigger for sync_ledger_on_work_block_answer() if missing.
-- Safe/idempotent: only creates if function + table exist and no trigger already uses the function.
do $$
declare
  fn_oid oid;
  trg_exists boolean;
begin
  if to_regclass('public.work_blocks') is null then
    raise notice 'work_blocks table not found; skipping trigger creation.';
    return;
  end if;

  fn_oid := to_regproc('public.sync_ledger_on_work_block_answer');
  if fn_oid is null then
    raise notice 'sync_ledger_on_work_block_answer() not found; skipping trigger creation.';
    return;
  end if;

  select exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal
      and n.nspname = 'public'
      and c.relname = 'work_blocks'
      and t.tgfoid = fn_oid
  ) into trg_exists;

  if not trg_exists then
    create trigger trg_work_blocks_sync_ledger_answer
    after update of content on public.work_blocks
    for each row
    when (
      new.block_type = 'dream_analysis'
      and pg_catalog.coalesce(old.content #>> '{user,answer}', '') = ''
      and pg_catalog.coalesce(new.content #>> '{user,answer}', '') <> ''
    )
    execute function public.sync_ledger_on_work_block_answer();
  end if;
end $$;

commit;
