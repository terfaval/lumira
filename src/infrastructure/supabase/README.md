# Supabase Infrastructure Boundary

Supabase integration is infrastructure-only plumbing.

This folder owns:
- environment-safe Supabase client construction
- trusted auth identity extraction from Supabase auth context
- row/domain adapters
- repository implementations

This folder does not own:
- reflective meaning
- cognition logic
- continuity reasoning

## Identity Rules

Production identity must come from trusted Supabase auth context.

`x-lumira-user-id` exists only as a non-production fallback for local development.
Never use the header as authoritative identity in production.

## Archive Visibility Rule

Default repository reads hide archived rows (`archived_at is null`).
RLS policies mirror this rule for authenticated reads.

## Observation Boundary Rule

Observations are descriptive orientation records only.
They must stay evidence-linked and non-authoritative.
No latent inference or interpretation logic belongs in this layer.

## Glossary Boundary Rule

Glossary persistence stores autobiographical continuity anchors only.
Candidate lifecycle state (`candidate`, `pinned`, `suppressed`, `ignored`) is user-steerable.
Suppression state prevents aggressive resurfacing without introducing symbolic interpretation logic.

## Thread Boundary Rule

Thread persistence stores continuity trajectories and associations.
It does not create narrative progression, completion semantics, or hidden continuity scoring.

## Response Boundary Rule

Reflective response persistence stores user-authored reflective artifacts and explicit associations.
It does not summarize, reinterpret, score, or mutate user-authored meaning.
Opening-to-response bridge records explicit activation lineage and user-authored response linkage.
Activation without response is preserved as a valid, non-obligatory event.

## Latent Boundary Rule

Latent persistence stores bounded internal cognition snapshots with explicit provenance.
Latent infrastructure may persist signals and suggestions, but it does not mutate canonical reflective domains.

## Opening Boundary Rule

Opening persistence stores optional reflective invitations and suppression state.
Opening surfaces remain user-gated; no unsolicited activation, engagement loops, or pressure mechanics belong here.
Suppression lifecycle supports temporary and indefinite states with explicit user-driven reactivation.
