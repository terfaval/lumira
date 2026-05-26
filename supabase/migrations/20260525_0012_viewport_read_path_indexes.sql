-- Phase 9c: Viewport guardrails + read-path hardening
-- Index hygiene for bounded dialogue windows in reflective-space viewport reads.

create index if not exists opening_activation_events_user_created_id_idx
  on public.opening_activation_events (user_id, created_at desc, id desc);

create index if not exists opening_activation_events_user_opening_created_id_idx
  on public.opening_activation_events (user_id, opening_id, created_at desc, id desc);
