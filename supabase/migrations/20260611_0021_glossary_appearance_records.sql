create table if not exists public.glossary_appearance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  entity_id uuid not null,
  dream_id uuid not null,
  appearance_note text null,
  confirmed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint glossary_appearance_records_entity_owner_fk foreign key (entity_id, user_id)
    references public.glossary_terms (id, user_id)
    on delete cascade,
  constraint glossary_appearance_records_dream_owner_fk foreign key (dream_id, user_id)
    references public.reflective_objects (id, user_id)
    on delete cascade,
  constraint glossary_appearance_records_unique unique (user_id, entity_id, dream_id)
);

create index if not exists glossary_appearance_records_user_entity_confirmed_idx
  on public.glossary_appearance_records (user_id, entity_id, confirmed_at desc);

create index if not exists glossary_appearance_records_user_dream_confirmed_idx
  on public.glossary_appearance_records (user_id, dream_id, confirmed_at desc);

create or replace function public.touch_glossary_appearance_records_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_glossary_appearance_records_updated_at on public.glossary_appearance_records;
create trigger trg_touch_glossary_appearance_records_updated_at
before update on public.glossary_appearance_records
for each row
execute function public.touch_glossary_appearance_records_updated_at();

alter table public.glossary_appearance_records enable row level security;

drop policy if exists glossary_appearance_records_select_own on public.glossary_appearance_records;
create policy glossary_appearance_records_select_own
on public.glossary_appearance_records
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists glossary_appearance_records_insert_own on public.glossary_appearance_records;
create policy glossary_appearance_records_insert_own
on public.glossary_appearance_records
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists glossary_appearance_records_update_own on public.glossary_appearance_records;
create policy glossary_appearance_records_update_own
on public.glossary_appearance_records
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into public.glossary_appearance_records (
  user_id,
  entity_id,
  dream_id,
  appearance_note,
  confirmed_at,
  created_at,
  updated_at
)
select
  ga.user_id,
  ga.glossary_term_id,
  ga.reflective_object_id,
  null,
  ga.created_at,
  ga.created_at,
  ga.updated_at
from public.glossary_associations ga
join public.reflective_objects ro
  on ro.id = ga.reflective_object_id
 and ro.user_id = ga.user_id
 and ro.object_type = 'dream'
where ga.reflective_object_id is not null
on conflict (user_id, entity_id, dream_id) do update
set confirmed_at = least(public.glossary_appearance_records.confirmed_at, excluded.confirmed_at),
    updated_at = greatest(public.glossary_appearance_records.updated_at, excluded.updated_at);

update public.glossary_terms gt
set appearance_count = coalesce(appearance_totals.total, 0)
from (
  select entity_id, user_id, count(*)::integer as total
  from public.glossary_appearance_records
  group by entity_id, user_id
) as appearance_totals
where gt.id = appearance_totals.entity_id
  and gt.user_id = appearance_totals.user_id;

update public.glossary_terms
set appearance_count = 0
where appearance_count is null;
