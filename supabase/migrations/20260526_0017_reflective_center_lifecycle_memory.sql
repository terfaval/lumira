-- Phase 16: Reflective center lifecycle memory + durable attenuation payload

alter table public.latent_snapshots
  add column if not exists center_category text null,
  add column if not exists center_state text null,
  add column if not exists center_score double precision not null default 0,
  add column if not exists center_persistence_streak integer not null default 0,
  add column if not exists center_cooldown_until timestamptz null,
  add column if not exists lifecycle_payload jsonb not null default '{}'::jsonb;

alter table public.latent_snapshots
  drop constraint if exists latent_snapshots_center_state_check;

alter table public.latent_snapshots
  add constraint latent_snapshots_center_state_check
  check (
    center_state is null
    or center_state in (
      'possible',
      'emerging',
      'stabilized',
      'weakening',
      'dormant',
      'suppressed'
    )
  );

create index if not exists latent_snapshots_user_center_state_idx
  on public.latent_snapshots (user_id, center_state, created_at desc);
