create table if not exists public.reflection_candidate_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  candidate_id uuid not null,
  response_id uuid not null,
  opening_id uuid null,
  created_at timestamptz not null default now(),
  constraint reflection_candidate_evidence_candidate_owner_fk foreign key (candidate_id, user_id)
    references public.reflection_candidates (id, user_id)
    on delete cascade,
  constraint reflection_candidate_evidence_response_owner_fk foreign key (response_id, user_id)
    references public.reflective_responses (id, user_id)
    on delete cascade,
  constraint reflection_candidate_evidence_opening_owner_fk foreign key (opening_id, user_id)
    references public.openings (id, user_id)
    on delete set null,
  constraint reflection_candidate_evidence_candidate_response_unique unique (candidate_id, response_id)
);

create unique index if not exists reflection_candidate_evidence_id_user_id_idx
  on public.reflection_candidate_evidence (id, user_id);

create index if not exists reflection_candidate_evidence_candidate_created_idx
  on public.reflection_candidate_evidence (candidate_id, created_at asc);

create index if not exists reflection_candidate_evidence_user_candidate_created_idx
  on public.reflection_candidate_evidence (user_id, candidate_id, created_at asc);

alter table public.reflection_candidate_evidence enable row level security;

drop policy if exists reflection_candidate_evidence_select_own on public.reflection_candidate_evidence;
create policy reflection_candidate_evidence_select_own
on public.reflection_candidate_evidence
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists reflection_candidate_evidence_insert_own on public.reflection_candidate_evidence;
create policy reflection_candidate_evidence_insert_own
on public.reflection_candidate_evidence
for insert
to authenticated
with check (auth.uid() = user_id);
