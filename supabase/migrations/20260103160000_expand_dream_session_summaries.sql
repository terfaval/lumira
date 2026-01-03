-- Expand dream_session_summaries to store Mira-generated outputs in one place

alter table public.dream_session_summaries
  add column if not exists title text null,
  add column if not exists framing_text text null,
  add column if not exists recommended_directions jsonb null,
  add column if not exists latent_analysis jsonb null,
  add column if not exists ai_meta jsonb null,
  add column if not exists updated_at timestamptz not null default now();

-- Keep updated_at fresh on any update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_dream_session_summaries_updated_at on public.dream_session_summaries;

create trigger trg_dream_session_summaries_updated_at
before update on public.dream_session_summaries
for each row execute function public.set_updated_at();

-- Useful indexes
create index if not exists dream_session_summaries_user_updated_idx
  on public.dream_session_summaries (user_id, updated_at desc);

-- Optional: if you plan to filter/search by title in archive/sidebar
create index if not exists dream_session_summaries_user_title_idx
  on public.dream_session_summaries (user_id, title);

-- 1) Add log column (JSON array stored as jsonb)
alter table public.dream_session_summaries
  add column if not exists latent_analysis_log jsonb null;

-- 2) Optional: initialize existing rows to empty array (safe)
update public.dream_session_summaries
set latent_analysis_log = '[]'::jsonb
where latent_analysis_log is null;

-- 3) RPC: atomic append into latent_analysis_log + update latent_analysis snapshot
-- Runs as INVOKER (default), so RLS still applies.
create or replace function public.append_latent_analysis(
  p_session_id uuid,
  p_output jsonb,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
as $$
begin
  -- ensure row exists for this user + session (RLS will enforce ownership on insert/update)
  insert into public.dream_session_summaries (session_id, user_id)
  values (p_session_id, auth.uid())
  on conflict (session_id) do nothing;

  update public.dream_session_summaries
  set
    latent_analysis = p_output,
    latent_analysis_log =
      coalesce(latent_analysis_log, '[]'::jsonb)
      || jsonb_build_array(
           jsonb_build_object(
             'ts', now(),
             'output', p_output,
             'meta', coalesce(p_meta, '{}'::jsonb)
           )
         )
  where session_id = p_session_id
    and user_id = auth.uid();
end;
$$;

-- 4) Allow authenticated users to call the function
grant execute on function public.append_latent_analysis(uuid, jsonb, jsonb) to authenticated;

-- Optional: GIN index if you later search inside the log
create index if not exists dream_session_summaries_latent_log_gin
  on public.dream_session_summaries using gin (latent_analysis_log);
