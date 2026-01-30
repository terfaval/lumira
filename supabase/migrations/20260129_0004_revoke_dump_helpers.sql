begin;

do $$
begin
  if to_regproc('public.dump_session_json(uuid)') is not null then
    revoke all on function public.dump_session_json(uuid) from public, anon, authenticated;
    grant execute on function public.dump_session_json(uuid) to service_role, supabase_admin;
  end if;

  if to_regproc('public.dump_user_json_text(text)') is not null then
    revoke all on function public.dump_user_json_text(text) from public, anon, authenticated;
    grant execute on function public.dump_user_json_text(text) to service_role, supabase_admin;
  end if;

  if to_regproc('public.dump_user_json_public_no_embeddings(text)') is not null then
    revoke all on function public.dump_user_json_public_no_embeddings(text) from public, anon, authenticated;
    grant execute on function public.dump_user_json_public_no_embeddings(text) to service_role, supabase_admin;
  end if;
end $$;

commit;
