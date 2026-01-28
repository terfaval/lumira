begin;

create table if not exists public.image_jobs (
  id uuid primary key default gen_random_uuid(),

  user_id uuid null,

  preset_id text not null,
  preset_version int not null,
  variant text not null,

  input_hash text not null,
  seed bigint not null,

  prompt text not null,
  negative_prompt text not null,

  width int not null,
  height int not null,

  status text not null check (status in ('queued','running','succeeded','failed')),

  result_paths text[] not null default '{}'::text[],
  error text null,

  created_at timestamptz not null default now(),
  finished_at timestamptz null
);

create index if not exists image_jobs_created_at_idx on public.image_jobs (created_at desc);
create index if not exists image_jobs_status_idx on public.image_jobs (status);
create index if not exists image_jobs_preset_variant_idx on public.image_jobs (preset_id, preset_version, variant);

alter table public.image_jobs enable row level security;

-- read: authenticated can read their own jobs; allow user_id null (system jobs) to be readable to authenticated too
drop policy if exists "image_jobs_read_authenticated" on public.image_jobs;
create policy "image_jobs_read_authenticated"
  on public.image_jobs
  for select
  to authenticated
  using (user_id = auth.uid() or user_id is null);

-- write: NO policies (service_role / SQL only) for v0 safety.
-- We'll create server-side inserts via service key later if needed.
-- For now, you can insert via SQL editor to test, but the API will attempt inserts via anon -> it will FAIL without a policy.
-- Therefore: in v0 we will write jobs using "service role" (server-side) OR temporarily allow insert/update.
-- Since you explicitly chose security-first: we will use service-role for job writes in the API.

commit;
