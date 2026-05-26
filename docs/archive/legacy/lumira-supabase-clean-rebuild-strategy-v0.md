# Lumira Supabase Clean Rebuild Strategy v0

## Purpose

Define a safe, coherent strategy for replacing the current organically grown Supabase schema/migration chain with a clean reflective-first baseline, aligned with:

- `docs/plans/lumira-reflective-schema-target-v0.md`
- thread/opening/response architecture
- unified highlight direction
- orientation substrate redesign
- glossary continuity model
- retained internal observation/latent substrate

This is planning-only. No SQL, migration execution, schema reset, or runtime code change is part of this ticket.

## Decision Summary

Recommended direction: **Option B — Clean rebuild**.

Rationale:

- Reflective architecture is now a structural model shift, not a patch-level extension.
- Existing migration chain carries legacy workflow-era contracts that increase bridge complexity.
- A clean reflective baseline reduces long-term maintenance cost and mental-model load.
- Runtime/domain cleanups already completed (dream-map runtime removal, wrapper collapse) support a clean pivot point.

## Rebuild vs Patch Evaluation

### Option A — Continue patching current chain

Pros:

- lower immediate disruption
- migration chronology preserved

Cons:

- deep schema drift remains
- bridge contracts keep multiplying
- legacy concepts remain embedded in canonical tables
- harder contributor/agent onboarding

### Option B — Clean rebuild (recommended)

Pros:

- coherent reflective-first data model
- clean ownership boundaries
- better runtime reasoning and observability
- cleaner long-term migration/tooling posture

Cons:

- explicit reset/cutover strategy required
- compatibility stage must be deliberately managed

Recommendation:

- choose **Option B** now, while alpha is still stabilization-stage and reflective architecture is converging.

## Table Classification Matrix

Legend:

- `KEEP`: recreate cleanly as canonical reflective substrate
- `BRIDGE`: temporary compatibility substrate only
- `REMOVE`: do not recreate in reflective rebuild baseline
- `DEFER`: not part of alpha rebuild baseline; revisit later

| Table | Classification | Action |
| --- | --- | --- |
| `dream_sessions` | KEEP | Recreate as root workspace/session substrate (conceptual `dream_space`) |
| `dream_entries` | KEEP | Recreate canonical raw dream substrate |
| `observation_versions` | KEEP | Recreate internal descriptive version history |
| `observation_latest` | KEEP | Recreate internal latest pointer |
| `latent_versions` | KEEP | Recreate internal probabilistic version history |
| `latent_latest` | KEEP | Recreate internal latest pointer |
| `domain_jobs` | KEEP | Recreate orchestration idempotency/trace substrate |
| `reflective_threads` (new) | KEEP | Create canonical thread continuity table |
| `reflective_openings` (new) | KEEP | Create canonical invitation lifecycle table |
| `reflective_responses` (new) | KEEP | Create canonical reflective writing table |
| `reflective_notes` (new) | KEEP | Create canonical local-context note table |
| `highlights` (new unified target) | KEEP | Create canonical highlight table with provenance/state |
| `attention_lenses` (new) | KEEP | Create canonical lens state table |
| `attention_lens_events` (new) | KEEP | Create canonical lens event history |
| `orientation_versions` (new) | KEEP | Create unified orientation substrate |
| `orientation_latest` (new) | KEEP | Create unified orientation pointer |
| `glossary_terms` | KEEP | Recreate glossary memory core with candidate/pinned/suppression semantics |
| `glossary_occurrences` | KEEP | Recreate recurrence continuity substrate |
| `continuity_signals` (new optional) | KEEP | Create explicit ambient continuity signal substrate |
| `dream_answers` | BRIDGE | Transitional source to reflective responses during cutover |
| `work_versions` | BRIDGE | Transitional pre-thread reflective activity history |
| `work_latest` | BRIDGE | Transitional pointer before thread-first latest model |
| `session_directions` | BRIDGE | Transitional source for attention lens selection/events |
| `dream_entry_highlights` | BRIDGE | Transitional part of split highlight model |
| `dream_session_highlights` | BRIDGE | Transitional part of split highlight model |
| `dream_session_rejected_suggestions` | BRIDGE | Transitional dismissal memory store |
| `glossary_notes` | BRIDGE | Transitional source for reflective notes/motif notes |
| `term_candidates` | BRIDGE | Transitional candidate funnel before consolidated glossary state |
| `session_index_versions` | BRIDGE | Transitional input into unified orientation versions |
| `session_index_latest` | BRIDGE | Transitional input into unified orientation latest |
| `frame_versions` | BRIDGE | Transitional input into unified orientation versions |
| `frame_latest` | BRIDGE | Transitional input into unified orientation latest |
| `dream_anchor_versions` | DEFER | Keep out of first reflective baseline unless needed by runtime cutover |
| `dream_anchor_latest` | DEFER | Keep out of first reflective baseline unless needed by runtime cutover |
| `domain_events` | DEFER | Re-evaluate after reflective observability contract is finalized |
| `material_snapshots` | DEFER | Re-evaluate after reflective observability contract is finalized |
| `dream_map_versions` | REMOVE | Do not recreate in reflective baseline |
| `dream_map_latest` | REMOVE | Do not recreate in reflective baseline |
| `dream_map_v2_versions` | REMOVE | Do not recreate in reflective baseline |
| `dream_map_v2_latest` | REMOVE | Do not recreate in reflective baseline |

## Rebuild Phases

### Phase 0 — Runtime Freeze

- Freeze schema-expanding stabilization patches unless critical for alpha safety.
- Freeze legacy-contract proliferation (new bridge columns/patches).
- Lock canonical planning artifacts:
  - reflective schema target
  - compatibility contract
  - migration sequence.

Exit criteria:

- approved table classification matrix
- approved reset policy
- approved cutover guardrails.

### Phase 1 — Clean Target Schema Baseline

- Author a clean migration baseline for reflective schema (new baseline chain).
- Recreate `KEEP` substrate only.
- Define ownership boundaries and RLS model per reflective entity family.
- Exclude `REMOVE` and `DEFER` domains from baseline.

Exit criteria:

- clean schema shape accepted
- no legacy patch carryover in canonical baseline.

### Phase 2 — Compatibility Bridge Stage

- Add temporary compatibility reads/adapters only where needed.
- Migrate runtime callers progressively to reflective tables.
- Keep write authority controlled: prefer **single canonical write path per behavior**.
- Avoid uncontrolled multi-table dual-write.

Exit criteria:

- critical runtime routes can operate from reflective schema through bounded adapters.

### Phase 3 — Runtime Cutover

- Switch canonical runtime reads/writes to reflective tables.
- Demote `BRIDGE` tables to read-only fallback (short window).
- Remove compatibility reads once parity is verified.

Exit criteria:

- no critical runtime dependency on bridge tables.

### Phase 4 — Cleanup and Simplification

- Drop bridge-only contracts/tables from active runtime model.
- Remove obsolete compatibility code paths.
- Finalize simplified migration/docs ownership map.

Exit criteria:

- reflective schema is sole canonical runtime substrate.

## Runtime Compatibility Strategy

Principles:

- prefer **adapter-based dual-read** over uncontrolled dual-write.
- keep one authoritative write path per domain object.
- introduce compatibility windows with explicit expiry criteria.

Recommended compatibility approach:

- Stage 1: write legacy + reflectively mapped shadow only for strictly required paths (if unavoidable).
- Stage 2: read-from-new with legacy fallback adapter.
- Stage 3: remove legacy fallback once parity checks pass.

Minimum continuity requirement during rebuild:

- `session -> observe -> frame/orientation -> direction/lens -> work/reflection -> answer/response -> revisit`
  must remain operational.

## Data Preservation Policy

### Option A — Full migration

Pros:

- preserves all legacy user artifacts

Cons:

- highest complexity/risk due legacy contract drift and semantic remapping uncertainty.

### Option B — Partial migration

Pros:

- preserves critical identity/session essentials

Cons:

- still requires selective transform logic and edge-case handling.

### Option C — Intentional reflective-data reset (recommended)

Pros:

- clean reflective baseline
- minimal semantic migration ambiguity
- fastest path to coherent alpha runtime

Cons:

- old reflective/workflow-era per-session reflective artifacts intentionally discarded.

Recommended policy:

- choose **Option C** for alpha rebuild environments.
- preserve only critical platform continuity elements:
  - auth accounts
  - essential user profile/preferences needed for login/guardrails.
- treat reflective runtime data as disposable during alpha reset transition.

## Supabase Operational Strategy

### Recommended default: Fresh Supabase project for rebuild

Why:

- clean migration lineage
- reduced hidden drift risk
- clearer rollback boundary
- easier environment-level verification

Operational requirements:

- re-provision auth config and RLS policies
- recreate required storage buckets
- reapply secrets/env/edge function configuration
- define explicit cutover checklist for app env switching.

### Alternative: Schema reset in existing project

Use only if operational constraints block fresh project creation.

Risks:

- hidden residual objects/policies/extensions
- weaker confidence in cleanliness
- harder provenance of rebuild correctness.

## Architectural Guardrails

Rebuild must preserve:

- canonical dream-entry ownership
- non-authoritative reflective stance
- thread-first continuity
- user-owned meaning
- glossary as continuity memory (not symbolic authority)
- internal probabilistic latent cognition
- source-trace durability
- soft reflective flow over rigid workflow progression.

## Risks and Mitigations

- Risk: compatibility stage expands indefinitely.
  - Mitigation: define strict bridge expiry gates per table/domain.
- Risk: accidental dual-write divergence.
  - Mitigation: single-write-owner rule + explicit adapter strategy.
- Risk: auth/storage/env reconfiguration errors in fresh project path.
  - Mitigation: scripted operational checklist + pre-cutover dry-run.
- Risk: scope creep into UX/runtime redesign during schema rebuild.
  - Mitigation: enforce planning boundary and phase gates.

## Recommended Rebuild Strategy

- **Recommended direction:** clean rebuild now (not incremental chain patching).
- **Recommended reset policy:** intentional reflective-data reset for alpha environments; preserve auth/core identity essentials.
- **Recommended migration approach:** clean baseline migration chain with KEEP tables first, BRIDGE tables only as temporary compatibility where strictly required.
- **Recommended runtime transition philosophy:** adapter-led staged cutover, single canonical write paths, bounded dual-read windows, no uncontrolled dual-write sprawl.
- **Justification:** reflective architecture is now fundamentally thread-centered and continuity-oriented; old schema is no longer an efficient long-term substrate.

## Recommended Next Documents

- `docs/plans/lumira-reflective-runtime-compat-contract-v0.md`
- `docs/plans/lumira-reflective-migration-sequence-v0.md`
- `docs/plans/lumira-reflective-cutover-gates-v0.md`
- `docs/plans/lumira-supabase-fresh-project-cutover-checklist-v0.md`
