-- Create function to append latent log events without updating snapshot
create or replace function public.append_latent_log_event(
  p_session_id uuid,
  p_event jsonb,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
as $$
begin
  -- Ensure a row exists for this session and user
  insert into public.dream_session_summaries (session_id, user_id)
  values (p_session_id, auth.uid())
  on conflict (session_id) do nothing;

  -- Append the event to the latent log without touching the current latent snapshot
  update public.dream_session_summaries
  set latent_analysis_log =
      coalesce(latent_analysis_log, '[]'::jsonb)
      || jsonb_build_array(
           jsonb_build_object(
             'ts', now(),
             'event', p_event,
             'meta', coalesce(p_meta, '{}'::jsonb)
           )
         )
  where session_id = p_session_id
    and user_id = auth.uid();
end;
$$;

grant execute on function public.append_latent_log_event(uuid, jsonb, jsonb) to authenticated;

-- 20260110220000_append_latent_log_event.sql
-- Migration to add append_latent_log_event function. This function appends an event-only entry to latent_analysis_log
-- without overwriting the latent_analysis snapshot. It ensures a row exists for the session and current user,
-- appends the event and meta to latent_analysis_log, and grants execute permission to authenticated role.

create or replace function public.append_latent_log_event(
  p_session_id uuid,
  p_event jsonb,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
as $$
begin
  -- Ensure a row exists for this session and user. RLS will enforce user ownership on insert/update.
  insert into public.dream_session_summaries (session_id, user_id)
  values (p_session_id, auth.uid())
  on conflict (session_id) do nothing;

  -- Append the event and meta to latent_analysis_log, do not modify latent_analysis snapshot
  update public.dream_session_summaries
  set latent_analysis_log =
      coalesce(latent_analysis_log, '[]'::jsonb)
      || jsonb_build_array(
           jsonb_build_object(
             'ts', now(),
             'event', p_event,
             'meta', coalesce(p_meta, '{}'::jsonb)
           )
         )
  where session_id = p_session_id
    and user_id = auth.uid();
end;
$$;

-- Grant execution of this function to authenticated users
grant execute on function public.append_latent_log_event(uuid, jsonb, jsonb) to authenticated;
