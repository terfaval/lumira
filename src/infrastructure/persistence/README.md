# Persistence Layer

## Legacy Backend V1 Quarantine

This folder currently contains legacy backend compatibility stores and bridges.

These modules remain only so protected pages and routes continue to compile.

Do not treat these stores as active Backend V2 authority.

Known legacy bridge roots include:

- `reflective-object-store.ts`
- `observation-store.ts`
- `latent-store.ts`
- `opening-store.ts`
- `thread-store.ts`
- `response-store.ts`
- `observation-v2-write-store.ts`

## Active Backend V2 Latent Authority

Latent V2 native authority does not live in this legacy bridge folder.

The active Latent V2 persistence path is the Supabase-backed repository and native tables for:

- `latent_opportunity_identities`
- `latent_opportunity_generation_runs`
- `latent_opportunity_manifestations`
- `latent_opportunity_evidence_blocks`
- `latent_opportunity_evidence_observations`
- `latent_opportunity_glossary_links`

Generation runs are the dream-scoped authority primitive for coherent manifestation sets.

- One accepted run may be `current` for one `(user_id, priority_reflective_object_id)` pair.
- A successful initial zero-opportunity assessment is stored as terminal `empty` run authority, not recomposition `no_change`.
- Earlier accepted runs remain immutable historical state and may later be marked `superseded`.
- Manifestations remain immutable and now belong to exactly one generation run for provenance-safe grouping.
- Rollback deletion is restricted to `pending` runs and is confirmed with an explicit authoritative delete result; accepted and terminal runs remain provenance-preserving historical state.
