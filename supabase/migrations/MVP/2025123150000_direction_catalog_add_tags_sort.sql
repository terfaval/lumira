-- 2026xxxxxx_direction_catalog_add_tags_sort.sql
alter table public.direction_catalog
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists sort_order int not null default 1000;

create index if not exists direction_catalog_tags_gin
  on public.direction_catalog using gin (tags);

create index if not exists direction_catalog_sort_order_idx
  on public.direction_catalog (sort_order);
