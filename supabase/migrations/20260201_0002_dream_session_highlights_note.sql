begin;

alter table public.dream_session_highlights
  add column if not exists note text;

commit;
