begin;

alter table public.archetype_term_queue
  add column if not exists base_key text,
  add column if not exists occurrence integer,
  add column if not exists suggested_canonical_key text,
  add column if not exists evidence_spans_sample jsonb,
  add column if not exists source text,
  add column if not exists dream_map_version_id uuid,
  add column if not exists note text;

update public.archetype_term_queue
set base_key = canonical_key
where base_key is null;

update public.archetype_term_queue
set suggested_canonical_key = canonical_key
where suggested_canonical_key is null;

update public.archetype_term_queue
set occurrence = 0
where occurrence is null;

update public.archetype_term_queue
set source = 'legacy'
where source is null;

update public.archetype_term_queue
set status = 'new'
where status = 'pending';

alter table public.archetype_term_queue
  alter column status set default 'new';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'archetype_term_queue_status_check'
  ) then
    alter table public.archetype_term_queue
      add constraint archetype_term_queue_status_check
      check (status in ('new', 'approved', 'merged', 'rejected', 'pending'));
  end if;
end $$;

create unique index if not exists archetype_term_queue_user_domain_base_key_uidx
  on public.archetype_term_queue (user_id, domain, base_key);

commit;