# Alpha Reset Scope Plan

## Purpose

Define a safe alpha-reset scope that keeps only the runtime needed for:

- auth/basic access
- session -> observe -> frame -> direction -> work
- answer save + continuity
- continue/revisit session (minimal list/archive)

This is an AUDIT/PLAN document only. No code, schema, migration, or route changes are included.

## Owner Strategy

- Prioritize alpha stability over feature breadth.
- Reduce legacy/transitional complexity before further hardening.
- Keep core flow intact while isolating non-core domains.
- Treat runtime evidence as source of truth; do not treat target docs as current runtime truth.

## Alpha Core Flow

Current runtime core path (evidence: `app/new/NewClient.tsx`, `app/api/session/ensure/route.ts`, `app/session/[id]/(flow)/*`, `app/api/work-block/next/route.ts`, `app/api/work/answer/route.ts`):

- auth gate (`/`, `/login`, `/signup`, `useRequireAuth`)
- create session + raw entry (`dream_sessions`, `dream_entries`)
- ensure pipeline (`/api/session/ensure`) to produce observation/frame/latent/index/anchors
- frame selection step (`/session/[id]/(flow)/frame`)
- direction selection (`/session/[id]/(flow)/direction`, `/api/direction/select`)
- work card generation (`/api/work-block/next`, `work_versions/work_latest`)
- answer persistence (`/api/work/answer`, `dream_answers`)
- revisit (`/session/[id]`, `/archive`, `/session/[id]/summary`)

## Keep for Alpha

- Auth + access pages/routes:
  - `/`, `/login`, `/signup`, `proxy.ts` protected matcher
- Core UI flow:
  - `/new`
  - `/session/[id]/(flow)/frame`
  - `/session/[id]/(flow)/direction`
  - `/session/[id]/(flow)/work`
  - `/session/[id]` (minimal revisit)
- Minimal revisit/list:
  - `/archive`
  - `/session` (optional list; currently active)
  - `/api/session-summary` (if summary page kept)
- Core APIs:
  - `/api/session/ensure`
  - `/api/frame/ensure`
  - `/api/direction/select`
  - `/api/work-block/next`
  - `/api/work/answer`
  - `/api/session/delete` (optional but valid alpha lifecycle endpoint)
- Core data assets:
  - `dream_sessions`, `dream_entries`, `dream_answers`
  - `work_versions`, `work_latest`
  - `frame_versions`, `frame_latest`
  - `session_directions`, `direction_catalog`
  - `observation_versions`, `observation_latest` (per D5 v0 ensure runtime truth)

## Simplify for Alpha

- Duplicate entry/orchestration endpoints:
  - `session bootstrap` and `frame wrapper` layers (`/api/session/bootstrap`, `/api/frame`) are delegation wrappers; keep one canonical entrypoint per concern.
- Observation path duality:
  - `session/ensure` is v0-centric core path; `/api/observe` + `dream_v1` adapter fallback is transitional and should be narrowed for alpha.
- Work answer contract:
  - Keep one canonical answer schema naming across read/write/generation continuity (existing mismatch history documented in `docs/audits/answer-schema-contract-audit.md`).
- Summary/revisit surface:
  - `/session/[id]/summary` currently carries highlights + glossary coupling; simplify summary to core-only data if retained for alpha.
- Guest pathway:
  - Guest mode is coupled into shell + ensure + auth endpoints via `user_flags`; simplify/remove if not required for alpha.

## Defer Until After Alpha

- Dream map runtime and admin tooling:
  - `/dreammap`, `/api/dreammap/*`, `/api/admin/dreammap/backfill`
  - `dream_map_versions/latest`, `dream_map_v2_versions/latest`
- Glossary ecosystem and admin workflows:
  - `/glossary*`, `/api/glossary/*`, `/api/highlights/pin`, `/api/sessions/[sessionId]/highlights*`
  - `/admin/archetypes*`, `/api/admin/archetypes/*`
  - `glossary_*`, `term_candidates`, `archetype_*`, `dream_session_highlights`, `dream_session_rejected_suggestions`, `dream_entry_highlights`
- Evening domain:
  - `/evening*`
  - `evening_card_catalog`, `evening_card_usage_log`
- Image generation/background:
  - `/api/image/*`, `/api/background/resolve`
  - `image_style_presets`, `image_jobs`
- Synthesis side route:
  - `/api/synthesize` (non-core path relative to ensure-based alpha flow)

## Remove Later / Candidate Legacy

- Clearly legacy/duplicate tables still present in migration history but not active runtime reads/writes:
  - `dream_observation`
  - `dream_observation_events`
  - `dream_session_summaries`
  - `work_blocks`
  - `morning_direction_choices`
  - `dream_glossary_items`
  - `user_behavior_stats`
  - `anchor_versions` + `anchor_latest` (superseded by `dream_anchor_*` tables in current runtime code)
- Legacy wrappers/endpoints likely removable after freeze validation:
  - `/api/frame` (wrapper to `/api/frame/ensure`)
  - `/api/session/bootstrap` (wrapper to `/api/session/ensure`)
  - `/api/session/submit` (not used by current main UI path)
  - `/api/work/persist` (no runtime caller found in `app/src/components`)

## Unclear / Needs Owner Decision

- `user_flags` table is actively used by runtime (`session/ensure`, guest APIs, shell) but no `create table user_flags` migration was found in `supabase/migrations/**`.
- Whether guest mode is in or out of alpha scope.
- Whether highlights should be part of alpha revisit UX or moved post-alpha.
- Whether latent/index/anchor support (`latent_*`, `session_index_*`, `dream_anchor_*`, `work_question_ledger`) should remain in alpha core generation or be simplified out of first alpha baseline.
- Whether `/session/[id]/summary` stays as alpha-facing route or becomes post-alpha.

## DB Simplification Findings

### Current DB complexity summary

- Migration history includes mixed eras (MVP tables + target-v0 tables + later extensions), creating parallel models for similar concepts.
- Runtime table usage inventory from code includes tables not defined in repo migrations (`user_flags`), indicating migration/runtime drift risk.
- `create table` inventory and runtime inventory show both:
  - active tables not created in visible migrations
  - created legacy tables no longer used by active runtime code

### Tables likely required for alpha

- Session + raw data:
  - `dream_sessions`, `dream_entries`
- Core generated flow:
  - `observation_versions`, `observation_latest`
  - `frame_versions`, `frame_latest`
  - `work_versions`, `work_latest`
  - `session_directions`, `direction_catalog`
- Answer continuity:
  - `dream_answers`
- Likely required support for current generation path:
  - `dream_anchor_versions`, `dream_anchor_latest`
  - `latent_versions`, `latent_latest`
  - `session_index_versions`, `session_index_latest`
  - `work_question_ledger`
  - `user_prefs`

### Tables likely transitional

- `anchor_versions`, `anchor_latest` (parallel to `dream_anchor_*`)
- `dream_observation`, `dream_observation_events` (parallel to `observation_versions/latest`)
- `dream_session_summaries` (parallel to `frame_*`, `latent_*`, `session_index_*`)
- `work_blocks` (parallel to `work_versions/work_latest`)
- `morning_direction_choices` (parallel to `session_directions`)

### Tables likely deferred

- Dream map:
  - `dream_map_versions`, `dream_map_latest`, `dream_map_v2_versions`, `dream_map_v2_latest`
- Glossary/archetype/highlight:
  - `glossary_terms`, `glossary_occurrences`, `glossary_notes`, `term_candidates`, `glossary_occurrence_events`
  - `archetype_terms`, `archetype_term_queue`
  - `dream_entry_highlights`, `dream_session_highlights`, `dream_session_rejected_suggestions`
- Evening/image:
  - `evening_card_catalog`, `evening_card_usage_log`
  - `image_style_presets`, `image_jobs`

### Tables needing owner decision

- `user_flags` (active runtime dependency, migration gap)
- `domain_events`, `domain_jobs`, `material_snapshots` (core observability/idempotency vs alpha minimalism tradeoff)
- `latent_*`, `session_index_*`, `dream_anchor_*`, `work_question_ledger` (keep for current question quality vs simplify alpha baseline)

## Proposed Alpha DB Direction

Describe-only direction:

- Freeze one alpha canonical contract set around current core flow tables.
- Mark transitional/legacy table families as read-only legacy candidates.
- Resolve migration/runtime drift first (`user_flags` and any other undeclared runtime tables).
- Keep schema changes additive in design docs first; implement after owner sign-off.
- Prefer one canonical naming contract for answers and one canonical observation path for alpha.
- Preserve future latent-engine direction as post-alpha:
  - observation descriptive
  - latent probabilistic/traceable multi-hypothesis
  - user-facing non-authoritative stance

## Repo Cleanup Strategy

- Establish explicit alpha-allowed route/API/table list before deletion.
- Separate runtime truth docs from target/spec docs:
  - runtime truth: current route + repo usage evidence
  - target docs: design intent only
- Isolate deferred domains behind clear boundary labels:
  - dreammap
  - glossary/archetype/highlights
  - evening
  - image/background
  - admin backfills
- Remove wrappers/duplicates only after callsite proof confirms no active dependency.

## Safe Sequence

### Phase 1 — Freeze alpha scope

- Finalize keep/simplify/defer lists for routes, APIs, and tables.
- Add explicit “alpha runtime truth” doc pointers.
- Lock removal actions until owner signs off on UNCLEAR items.

### Phase 2 — DB schema simplification design

- Produce schema map:
  - canonical alpha tables
  - transitional table families
  - deferred table families
- Document migration gaps (especially `user_flags`).
- Design migration sequence (no execution yet).

### Phase 3 — Controlled cleanup / removal

- Remove or quarantine wrapper endpoints and unreachable paths first.
- Isolate deferred feature routes from alpha nav/entrypoints.
- Keep core-flow APIs and tables unchanged during this phase.

### Phase 4 — Runtime rebuild against simplified core

- Re-align core flow on one contract set for:
  - observation
  - answers
  - direction/work continuity
- Re-run core flow manually end-to-end after each narrow change group.

### Phase 5 — Manual alpha validation

- Validate user journey:
  - login -> new session -> observe -> frame -> direction -> work -> answer -> revisit
- Validate minimal revisit/list/archive behavior.
- Validate no deferred feature dependency blocks core flow.

## Risks

- Removing tables/routes that are still transitively used by `session/ensure` or `work-block/next`.
- Migration/runtime drift (`user_flags`) causing cleanup assumptions to be wrong.
- Confusing target-v0 docs with live runtime behavior during removal decisions.
- Over-simplifying support tables (`latent/index/anchors/ledger`) and degrading work-card quality unexpectedly.

## Owner Decisions Needed

- Keep or remove guest mode for alpha (`user_flags` + guest endpoints/UI handling).
- Keep or defer highlights in alpha summary/revisit.
- Keep full summary page in alpha, or reduce to minimal revisit view.
- Keep current latent/index/anchor support in alpha generation, or intentionally simplify quality/depth.
- Preferred canonical answer naming for alpha contract alignment (retain `work_id/content` short-term vs planned rename path).

## Recommended Next Tickets

1. `AUDIT — Alpha Runtime Truth Matrix`
   - Deliver one canonical matrix of routes -> APIs -> tables for core flow only.
2. `AUDIT — DB Drift Check (Repo Migrations vs Runtime Usage)`
   - Resolve `user_flags` and any other undeclared runtime dependencies.
3. `PLAN — Alpha Core Schema Contract (No Migration Execution)`
   - Define canonical alpha tables/fields and transitional aliases.
4. `BUILD — Core Wrapper Collapse`
   - Remove/merge wrapper APIs (`frame`, `session/bootstrap`, etc.) after proof.
5. `BUILD — Answer/Observation Contract Alignment`
   - Align continuity paths on one persisted contract.
6. `CLEANUP — Deferred Domain Isolation`
   - Remove deferred domains from primary navigation and alpha-critical execution paths.
