-- Lumira Target v0 — SAFE RESET v2 (Supabase/vector compatible)
-- Drops all tables/views in public schema EXCEPT:
-- - direction_catalog
-- - evening_card_catalog
-- - evening_card_usage_log
--
-- IMPORTANT:
-- - Does NOT drop functions / extensions (avoids pgvector conflicts)
-- - Tables are dropped CASCADE (removes policies, triggers, FKs, dependent objects)

begin;

-- 1) Drop views (except whitelisted names if you happen to have views with those names)
do $$
declare r record;
begin
  for r in
    select table_name
    from information_schema.views
    where table_schema = 'public'
      and table_name not in (
        'direction_catalog',
        'evening_card_catalog',
        'evening_card_usage_log'
      )
  loop
    execute format('drop view if exists public.%I cascade;', r.table_name);
  end loop;
end $$;

-- 2) Drop tables except the whitelist
do $$
declare r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not in (
        'direction_catalog',
        'evening_card_catalog',
        'evening_card_usage_log'
      )
  loop
    execute format('drop table if exists public.%I cascade;', r.tablename);
  end loop;
end $$;

commit;
