-- Enforce pointer-only latest row for dream anchors (drop legacy payload column if present)

begin;

alter table public.dream_anchor_latest
  drop column if exists payload;

commit;
