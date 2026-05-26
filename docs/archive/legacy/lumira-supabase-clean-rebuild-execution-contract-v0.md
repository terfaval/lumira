# Lumira Supabase Clean Rebuild Execution Contract v0

## Purpose

Provide an execution-ready, safety-gated contract for a clean Supabase rebuild aligned with reflective-first architecture, before any destructive DB action.

This is an audit/plan artifact only.

## Scope and Non-Goals

Included:

- runtime dependency audit for alpha boot path
- clean baseline schema group plan
- KEEP/RECREATE/BRIDGE/REMOVE table decision matrix
- destructive-action checklist and approval gates
- ordered reset/rebuild/cutover sequence
- validation checklist and risk register

Excluded:

- no SQL execution
- no migration execution
- no Supabase reset
- no runtime code changes

## Inputs

- `docs/plans/lumira-supabase-clean-rebuild-strategy-v0.md`
- `docs/plans/lumira-reflective-schema-target-v0.md`
- `docs/plans/lumira-reflective-cognition-runtime-contract-v0.md`
- `docs/audits/alpha-runtime-truth-matrix.md`
- `docs/STABILIZATION_LEDGER.md`

## Executive Recommendation

- Proceed with **clean rebuild** and **intentional reflective-data reset** for alpha environments.
- Use a **fresh Supabase project** as primary path.
- Require explicit owner approval gates before:
  - destructive reset action
  - environment cutover
  - legacy object deletion in old project.

## Q1. Current Backend Tables Required To Boot Alpha Core Flow

Based on `alpha-runtime-truth-matrix`, current alpha core flow requires at minimum:

- `dream_sessions`
- `dream_entries`
- `dream_answers`
- `direction_catalog`
- `session_directions`
- `work_versions`
- `work_latest`
- `observation_versions`
- `observation_latest`
- `session_index_versions`
- `session_index_latest`
- `latent_versions`
- `latent_latest`
- `dream_anchor_versions`
- `dream_anchor_latest`
- `frame_versions`
- `frame_latest`
- `domain_jobs`

Operationally relevant transitional tables (non-gating but currently touched):

- `work_question_ledger`
- `user_prefs`
- `domain_events`
- `material_snapshots`

## Q2. Target Reflective Tables For Clean Baseline

Recommended clean baseline target (reflective-first):

- Root and canonical substrate:
  - `dream_sessions` (conceptual dream space root)
  - `dream_entries`
- Reflective continuity:
  - `reflective_threads`
  - `reflective_openings`
  - `reflective_responses`
  - `reflective_notes`
  - `highlights` (unified target model)
- Memory and continuity:
  - `glossary_terms`
  - `glossary_occurrences`
  - `continuity_signals` (optional but recommended)
- Attention and orientation:
  - `attention_lenses`
  - `attention_lens_events`
  - `orientation_versions`
  - `orientation_latest`
- Internal cognition substrate:
  - `observation_versions`
  - `observation_latest`
  - `latent_versions`
  - `latent_latest`
- Runtime orchestration:
  - `domain_jobs`
- Baseline catalogs:
  - `direction_catalog`

## Q3. Bridge Tables Needed Temporarily

Temporary bridge tables are needed unless runtime APIs/routes are migrated first:

- `dream_answers` (bridge to `reflective_responses`)
- `work_versions`, `work_latest` (bridge to thread/opening/response runtime)
- `session_directions` (bridge to `attention_lenses` + events)
- `frame_versions`, `frame_latest`, `session_index_versions`, `session_index_latest` (bridge to orientation unified model)
- `dream_entry_highlights`, `dream_session_highlights`, `dream_session_rejected_suggestions` (bridge to unified `highlights`)
- `glossary_notes`, `term_candidates` (bridge to notes + glossary state lifecycle)

## Q4. Immediate Replace vs Adapter Need

Immediate replacement feasibility:

- `work_versions`: **No** (adapter needed first)
- `dream_answers`: **No** (adapter needed first)
- `session_directions`: **No** (adapter needed first)
- `frame_versions`: **No** (adapter needed first)
- highlight split tables: **No** (adapter needed first)
- glossary legacy tables: **Partial**
  - `glossary_terms` / `glossary_occurrences` can be recreated as evolved core tables
  - `glossary_notes` / `term_candidates` still need bridge behavior initially

Conclusion:

- runtime adapters/compat layers must exist before removing those legacy contracts.

## Q5. Ordered Reset/Rebuild/Cutover Sequence

### Step 0 — Approval Gate A (Owner)

- Approve:
  - clean reset policy
  - fresh-project strategy
  - non-preservation of reflective legacy data

### Step 1 — Pre-Destructive Audit Freeze

- Freeze schema-affecting tickets.
- Freeze runtime contract expansion.
- Capture final pre-reset inventory:
  - active env vars
  - RLS policy map
  - storage bucket map
  - edge function list
  - extension list.

### Step 2 — Baseline Migration Authoring (No Execute Yet)

- Create clean baseline migration chain for target schema groups.
- Separate migration bundles by group and dependency order.

### Step 3 — Approval Gate B (Owner)

- Approve generated baseline migration set and object list.
- Approve destructive execution plan and rollback plan.

### Step 4 — Destructive Reset Execution

- Reset/create fresh Supabase project baseline.
- Apply baseline migrations in dependency order.

### Step 5 — Security and Policy Layer

- Apply RLS and policies for all recreated tables.
- Validate policy coverage for:
  - read
  - insert
  - update
  - delete
  by ownership boundary.

### Step 6 — Seed and Catalog

- Seed required baseline catalogs and static config:
  - `direction_catalog`
  - other core catalogs needed by frame/work selection.

### Step 7 — Backend Env/Cutover Wiring

- Update backend environment variables to new Supabase project.
- Validate service-role and anon key routing in server/client contexts.
- Validate auth provider settings and callback URLs.

### Step 8 — Runtime Compatibility Activation

- Activate bridge adapters only where required by still-legacy runtime calls.
- Keep single-write-owner principle; avoid uncontrolled dual-write.

### Step 9 — Validation Gate

- Execute full backend/runtime validation checklist before any legacy-object deletion in old project.

### Step 10 — Approval Gate C (Owner)

- Approve:
  - cutover success evidence
  - old project legacy object retirement plan.

## Q6. Manual Checks Required Before Deletion/Reset

- Confirm required runtime tables all have target equivalents.
- Confirm migration order tested in dry-run environment.
- Confirm RLS matrix complete and ownership-safe.
- Confirm `direction_catalog` and required seeds exist.
- Confirm auth config parity:
  - providers
  - redirect URLs
  - JWT settings.
- Confirm storage bucket parity for currently used assets.
- Confirm edge function deployment list and env secrets.
- Confirm application points to intended Supabase project IDs/keys.
- Confirm rollback plan:
  - old project untouched until approval gate C.

## KEEP / RECREATE / BRIDGE / REMOVE Matrix

Legend:

- `KEEP`: keep conceptual role; re-specify under reflective model where needed
- `RECREATE`: create in clean baseline now
- `BRIDGE`: temporary compatibility needed during runtime transition
- `REMOVE`: do not recreate for reflective baseline

| Current table / domain | Classification | Target equivalent / rationale |
| --- | --- | --- |
| `dream_sessions` | KEEP + RECREATE | root reflective workspace/session substrate |
| `dream_entries` | KEEP + RECREATE | canonical raw dream substrate |
| `direction_catalog` | KEEP + RECREATE | required selection catalog |
| `observation_versions` | KEEP + RECREATE | internal observation substrate |
| `observation_latest` | KEEP + RECREATE | internal pointer substrate |
| `latent_versions` | KEEP + RECREATE | internal latent substrate |
| `latent_latest` | KEEP + RECREATE | internal pointer substrate |
| `domain_jobs` | KEEP + RECREATE | orchestration/idempotency substrate |
| `reflective_threads` (new) | RECREATE | replaces implicit work continuity |
| `reflective_openings` (new) | RECREATE | invitation lifecycle substrate |
| `reflective_responses` (new) | RECREATE | replaces answer-centric persistence |
| `reflective_notes` (new) | RECREATE | separates local note semantics |
| `highlights` (new unified) | RECREATE | unified highlight target |
| `glossary_terms` | KEEP + RECREATE | continuity memory core (extended semantics) |
| `glossary_occurrences` | KEEP + RECREATE | recurrence continuity core |
| `attention_lenses` (new) | RECREATE | soft attention weighting state |
| `attention_lens_events` (new) | RECREATE | lens history/event stream |
| `orientation_versions` (new) | RECREATE | unified orientation substrate |
| `orientation_latest` (new) | RECREATE | unified orientation pointer |
| `continuity_signals` (new optional) | RECREATE | ambient continuity signal substrate |
| `dream_answers` | BRIDGE | temporary source until response cutover |
| `work_versions` | BRIDGE | temporary until thread runtime fully active |
| `work_latest` | BRIDGE | temporary pointer until thread focus runtime |
| `session_directions` | BRIDGE | temporary until attention lens runtime |
| `frame_versions` | BRIDGE | temporary until orientation unified reads |
| `frame_latest` | BRIDGE | temporary until orientation unified reads |
| `session_index_versions` | BRIDGE | temporary until orientation unified reads |
| `session_index_latest` | BRIDGE | temporary until orientation unified reads |
| `dream_entry_highlights` | BRIDGE | temporary highlight split path |
| `dream_session_highlights` | BRIDGE | temporary highlight split path |
| `dream_session_rejected_suggestions` | BRIDGE | temporary dismissal memory path |
| `glossary_notes` | BRIDGE | temporary until reflective notes + motif notes converge |
| `term_candidates` | BRIDGE | temporary candidate funnel |
| `work_question_ledger` | BRIDGE | optional anti-repeat bridge while work refactor in transition |
| `user_prefs` | BRIDGE | keep only if runtime still reads; else replace later |
| `domain_events` | BRIDGE | optional observability bridge; can be removed post-cutover |
| `material_snapshots` | BRIDGE | optional observability bridge; can be removed post-cutover |
| `dream_anchor_versions` | BRIDGE | keep only while ensure/work paths still depend on anchors |
| `dream_anchor_latest` | BRIDGE | keep only while ensure/work paths still depend on anchors |
| `dream_map_versions` | REMOVE | obsolete for reflective baseline |
| `dream_map_latest` | REMOVE | obsolete for reflective baseline |
| `dream_map_v2_versions` | REMOVE | obsolete for reflective baseline |
| `dream_map_v2_latest` | REMOVE | obsolete for reflective baseline |

## Proposed Clean Baseline Schema Groups

### Group A — Core Ownership

- `dream_sessions`
- `dream_entries`

### Group B — Internal Cognition Substrate

- `observation_versions`
- `observation_latest`
- `latent_versions`
- `latent_latest`

### Group C — Reflective Continuity Core

- `reflective_threads`
- `reflective_openings`
- `reflective_responses`
- `reflective_notes`
- `highlights`

### Group D — Continuity Memory

- `glossary_terms`
- `glossary_occurrences`
- `continuity_signals`

### Group E — Attention and Orientation

- `attention_lenses`
- `attention_lens_events`
- `orientation_versions`
- `orientation_latest`

### Group F — Orchestration and Catalog

- `domain_jobs`
- `direction_catalog`

### Group G — Temporary Compatibility (if required by runtime at cutover)

- bridge subset from matrix (`dream_answers`, `work_*`, `session_directions`, `frame_*`, `session_index_*`, highlight/glossary bridges, anchors as needed)

## Destructive-Action Checklist

Mandatory before reset/delete:

- [ ] Owner Approval Gate A granted (reset policy + clean rebuild direction).
- [ ] Runtime dependency table manifest signed off.
- [ ] Baseline migration set reviewed.
- [ ] RLS policy map reviewed.
- [ ] Seed/catalog data plan reviewed.
- [ ] Env/secret/callback inventory completed.
- [ ] Rollback path documented (old project retained until Gate C).
- [ ] Validation plan approved.

Mandatory before deleting old Supabase objects:

- [ ] Owner Approval Gate C granted.
- [ ] Cutover validation checklist passed.
- [ ] Production-like smoke checks passed.
- [ ] No unresolved blocker in compatibility risks list.

## Backend Compatibility Risks

- Risk: hidden runtime dependencies on bridge tables.
  - Mitigation: explicit table-by-endpoint audit before cutover.
- Risk: legacy read paths to `work_*` / `dream_answers` break post-reset.
  - Mitigation: adapter-first transition, keep bridge subset temporarily.
- Risk: policy regressions on new ownership model.
  - Mitigation: RLS test matrix and role-based smoke tests.
- Risk: env miswiring to wrong Supabase project.
  - Mitigation: explicit cutover checklist + project-id assertions in deploy pipeline.
- Risk: catalog/seed omission breaks direction/frame/work flows.
  - Mitigation: seed validation step required pre-cutover.

## Validation Checklist

Plan-only checkpoint list for later BUILD execution:

- [ ] Auth works for guarded app routes.
- [ ] Session creation (`dream_sessions`, `dream_entries`) succeeds.
- [ ] Ensure path can read/write required cognition substrate.
- [ ] Direction select path works with seeded catalog.
- [ ] Work generation path works (or mapped reflective equivalent path during transition).
- [ ] Answer/response persistence path works.
- [ ] Revisit/archive reads work with new schema + bridges.
- [ ] Highlight and glossary paths do not break core flow.
- [ ] No missing table/column/runtime contract errors in logs.

## Owner Approval Gates (Explicit)

- Gate A: approve clean reset strategy and non-preservation of reflective legacy data.
- Gate B: approve baseline migration set and destructive action execution plan.
- Gate C: approve post-cutover validation and old-object deletion/retirement.

No destructive execution is authorized without the relevant gate.

## Recommended Next BUILD Tickets

1. `BUILD/SQL — Reflective Baseline Migration Set v1 (Groups A-F)`
2. `BUILD — Supabase Fresh Project Provisioning + Policy/Seed Apply`
3. `BUILD — Runtime Compatibility Adapter Slice (work/answers/directions/frame-index bridges)`
4. `BUILD — Cutover Env Switch + Core Flow Validation Runbook Execution`
5. `BUILD/CLEANUP — Bridge Retirement Plan (post Gate C)`

## Validation Statement

- Plan-only ticket.
- No SQL executed.
- No migrations executed.
- No runtime code changed.
- No Supabase reset performed.
