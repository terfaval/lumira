-- image_style_presets: versioned, canonical style presets for image generation
-- v0: stores full preset payload as jsonb for reproducibility.

begin;

create table if not exists public.image_style_presets (
  id text not null,
  version int not null,
  name text not null,
  payload jsonb not null,

  created_at timestamptz not null default now(),

  constraint image_style_presets_pkey primary key (id, version)
);

-- Helpful index for "latest version" lookup
create index if not exists image_style_presets_id_version_desc_idx
  on public.image_style_presets (id, version desc);

-- RLS
alter table public.image_style_presets enable row level security;

-- Policies:
-- - authenticated users can read presets (safe; these are not user-private)
-- - only service_role (or postgres) should write in production
-- If you want "admin writes from app", we can add a gated policy later.

drop policy if exists "image_style_presets_read_authenticated" on public.image_style_presets;
create policy "image_style_presets_read_authenticated"
  on public.image_style_presets
  for select
  to authenticated
  using (true);

-- Optional: allow anon read if you ever need it (disabled by default)
-- drop policy if exists "image_style_presets_read_anon" on public.image_style_presets;
-- create policy "image_style_presets_read_anon"
--   on public.image_style_presets
--   for select
--   to anon
--   using (true);

commit;