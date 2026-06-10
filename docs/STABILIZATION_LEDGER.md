# Stabilization Ledger

## Purpose

Append-only historical stabilization record for the clean-room rebuild.

This ledger exists to record:
- what was completed
- when it was completed
- which boundaries were affected
- how completion was validated

Use this file to understand how Lumira reached its current state.

Do not use this file as:
- the primary onboarding document
- the primary current-state summary
- the coordinator workflow guide

For present operational reality, use `docs/CURRENT_STATE.md`.
For onboarding and navigation, use `docs/DOCS_INDEX.md` and `docs/AGENT_START_HERE.md`.

## Logging Rule

For every completed build ticket:

1. Add/update an entry here with date, phase, and touched boundaries.
2. Run build through `npm run build` so logs are written to:
- `docs/BUILD_LOG.md` (summary)
- `docs/build-logs/<timestamp>.log` (full output)

## Ledger Scope

This ledger should contain:
- milestone chronology
- completed work history
- touched-boundary summaries
- validation references
- historically relevant limitations
- stabilization history

This ledger should not become:
- a current-state tracker
- an active-priority tracker
- a roadmap
- a plan
- a general discussion log

`docs/CURRENT_STATE.md` answers:
- what is true now
- what we are working on now
- what changed recently enough to affect safe contribution

`docs/STABILIZATION_LEDGER.md` answers:
- how we got here
- what completed stabilization work changed the repository
- what validation supported those completions

## Entry Guidance

## 2026-06-09 - Observation V2 Foundation Phase 1

- Phase: BUILD
- Touched boundaries:
  - `src/domain/observation/v2-runtime.ts`
  - `src/domain/observation/__tests__/v2-runtime.test.ts`
  - `src/cognition/observation/scene-discovery.ts`
  - `src/cognition/observation/scene-observation-scaffold.ts`
  - `src/cognition/observation/scene-discovery-projection.ts`
  - `src/cognition/observation/llm-scene-observation-extractor.ts`
  - `src/cognition/observation/observation-engine.ts`
  - `src/cognition/observation/__tests__/scene-discovery.test.ts`
  - `src/cognition/observation/__tests__/scene-observation-scaffold.test.ts`
  - `src/cognition/observation/__tests__/scene-discovery-projection.test.ts`
  - `src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts`
  - `src/cognition/observation/__tests__/observation-engine.test.ts`
  - `docs/backend-v2-migration/Observation-V2-Fallout-Ledger.md`
- Verification:
  - `npm test` -> pass (`94` files, `353` tests)
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-09T07-11-09-266Z.log`
- Notes:
  - Added the first additive scene-first Observation V2 runtime foundation.
  - Defined first-class Scene, scene-contained Observation, boundary reasoning, evidence context, and minimal derived structures.
  - Added a scene-first compatibility projection so V1 persistence and API remain temporary targets rather than design drivers.
  - Added a provider-backed scene-first LLM extraction entrypoint and embedded the approved observation granularity rule in its prompt.
  - Kept downstream layers, live routes, and UI surfaces uncut over in this phase, and documented the resulting fallout and likely future removals in the Observation V2 Fallout Ledger.

Ledger entries are appropriate for:
- completed milestones
- completed stabilization phases
- meaningful boundary changes
- historically significant implementation work
- validation-backed completion records

Ledger entries are not appropriate for:
- every small documentation edit
- every audit
- every discussion
- transient operational notes
- routine current-state updates

## 2026-06-06 - Observation V2 Phase 1 Mapping Layer

- Phase: BUILD
- Touched boundaries:
  - `src/domain/observation/v2.ts`
  - `src/domain/observation/__tests__/v2.test.ts`
- Verification:
  - `npm run typecheck` -> pass
  - `npm test` -> pass (`86` files, `321` tests)
  - `npm run lint` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-06T11-37-32-178Z.log`
- Notes:
  - Added a pure internal Observation V2 bridge in the observation domain layer without changing persistence, public API contracts, extraction behavior, UI behavior, glossary behavior, or latent behavior.
  - The new module defines `DescriptiveObservation`, `ObservationBundleV2Like`, deterministic category-to-role mapping, fragment-to-descriptive-observation adaptation, and bundle projection from the existing V1 `Observation` shape.
  - Projection remains additive and side-effect-free; current V1 fragments and bundles stay canonical for runtime, storage, and downstream consumers in this phase.

## 2026-06-05 - Capture Space v1 Implementation

- Phase: BUILD
- Touched boundaries:
  - `app/capture/page.tsx`
  - `app/capture/page.module.css`
  - `app/capture/page.test.tsx`
  - `app/capture/capture-space.tsx`
  - `app/capture/capture-metrics.ts`
  - `app/capture/capture-metrics.test.ts`
- Verification:
  - `npm test` -> pass (`84` files, `304` tests)
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-05T17-24-20-667Z.log`
- Notes:
  - `/capture` now renders as a single-purpose writing surface with one large textarea, Hungarian-only title copy, passive word/character metrics, and a single `Rögzítés` action.
  - Capture no longer asks for a manual title; the persisted reflective object title is derived from the dream text so the existing save pipeline and post-save redirect remain intact.
  - Successful capture still lands on `/objects/[objectId]`, preserving the orientation-first handoff instead of returning to reflection directly.

## 2026-06-05 - Orientation + Homepage Visual Consistency Pass

- Phase: BUILD
- Touched boundaries:
  - `src/ui/object-orientation/object-orientation-layer.tsx`
  - `src/ui/object-orientation/object-orientation-layer.module.css`
  - `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`
  - `src/ui/homepage/homepage-orientation-hub.module.css`
- Verification:
  - `npm test` -> pass (`81` files, `279` tests)
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-05T06-29-16-142Z.log`
- Notes:
  - Orientation shell atmosphere was calmed toward Homepage.
  - Dream header label was removed and the edit affordance was reduced to a pencil icon control.
  - Hover/focus language was aligned across Orientation and Homepage interactive surfaces.

## 2026-06-05 - Observation Evidence Diagnostics and Timeout Hardening

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/observation-extraction-validation.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`
  - `src/cognition/observation/__tests__/observation-extraction-validation.test.ts`
- Verification:
  - `npm run typecheck` -> pass
  - `npm test` -> pass (`83` files, `293` tests)
  - `npm run lint` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-05T13-15-14-242Z.log`
- Notes:
  - Evidence-validation failures now emit bounded diagnostics with category, fragment text, received snippet, exact-match result, and a nearest source excerpt.
  - OpenAI observation extraction now uses a 25-second request timeout and classifies timeout fallbacks separately from other provider failures.
  - Validation remains strict exact-normalized substring matching; this pass adds observability and capture-time hardening only.

## 2026-06-05 - LLM Observation Partial Evidence Repair v1

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/observation-extraction-validation.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`
  - `src/cognition/observation/__tests__/observation-extraction-validation.test.ts`
- Verification:
  - `npm run typecheck` -> pass
  - `npm test` -> pass (`83` files, `297` tests)
  - `npm run lint` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-05T14-00-20-349Z.log`
- Notes:
  - Evidence validation now splits valid fragments from failing fragments instead of collapsing the whole extraction immediately.
  - A one-shot repair-only LLM pass can replace unsupported evidence with exact local quotes or explicitly drop unsupported fragments, while preserving untouched valid fragments.
  - Any repaired aggregate is rebuilt and then fully revalidated through the existing strict evidence validator and semantic policy before persistence.

## 2026-06-05 - LLM Observation Extractor v1

- Phase: BUILD
- Touched boundaries:
  - `app/capture/page.tsx`
  - `app/capture/page.test.tsx`
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/observation-extraction-validation.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`
  - `src/domain/observation/types.ts`
  - `src/domain/observation/semantic-policy.ts`
  - `src/domain/observation/__tests__/http-contract.test.ts`
  - `src/domain/observation/__tests__/semantic-policy.test.ts`
  - `src/infrastructure/environment/env.ts`
  - `src/infrastructure/environment/__tests__/env.test.ts`
  - `src/infrastructure/supabase/adapters/observation-row.ts`
  - `src/infrastructure/supabase/adapters/__tests__/observation-row.test.ts`
  - `src/infrastructure/supabase/client/__tests__/create-supabase-infrastructure-client.test.ts`
  - `supabase/migrations/20260605_0018_observation_llm_source.sql`
- Verification:
  - `npm run typecheck` -> pass
  - `npm test` -> pass (`82` files, `287` tests)
  - `npm run lint` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-05T07-28-33-856Z.log`
- Notes:
  - Capture now prefers validated LLM observation extraction and falls back to the deterministic scaffold when extraction is unsafe, invalid, or unavailable.
  - Observation persistence remains compatible with existing downstream Latent and reflection paths via the existing `CreateObservationInput` shape.
  - A new explicit observation source `system_llm_extract` distinguishes LLM-generated observation provenance from deterministic scaffold output.

## 2026-06-04 - Orientation Layer Layout Convergence Pass

- Phase: BUILD
- Touched boundaries:
  - `src/ui/object-orientation/object-orientation-layer.tsx`
  - `src/ui/object-orientation/object-orientation-layer.module.css`
  - `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`
- Verification:
  - `npm test` -> pass (`81` files, `279` tests)
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-04T19-45-48-974Z.log`
  - Desktop screenshot to be captured manually by owner
- Notes:
  - A corrupted ignored `.next/dev/types` artifact blocked an intermediate `typecheck` / `build` run.
  - Removing the stale generated `.next/dev/types` files restored clean `typecheck` and `build` results without source changes.

## Historical Reset Baseline

Date: 2026-05-24

1. Documentation authority split completed:
- `docs/canon/`
- `docs/runtime/`
- `docs/archive/legacy-transition/`

2. Legacy runtime/application trees removed (clean-room reset performed).
3. Legacy artifacts/build leftovers removed.
4. Remaining `.worktrees/` filesystem residue noted as non-canonical blocker.

## Clean-room Build Backfill (retrospective)

Date window: 2026-05-24 to 2026-05-25
Source references: `supabase/migrations/20260524_0001` .. `20260525_0012`, runtime/UI/composition route code, and ticket outputs.

### Phase 1 - Foundation Skeleton
- Domain-first structure established: `app/`, `src/domain`, `src/runtime`, `src/cognition`, `src/reflective-space`, `src/infrastructure`, `src/ui`, `src/shared`.
- Thin-route and reflective-space-first boundaries established.

### Phase 2 / 2b - Reflective Object Persistence + Ownership Hardening
- Reflective object persistence model introduced.
- User ownership + RLS hardening introduced.
- References:
  - `supabase/migrations/20260524_0001_reflective_objects.sql`
  - `supabase/migrations/20260524_0002_reflective_objects_rls.sql`

### Phase 3 - Observation Layer Scaffold
- Observation entities + persistence introduced.
- Evidence-linked descriptive observation boundaries established.
- Reference: `supabase/migrations/20260524_0003_observations.sql`

### Phase 4 - Glossary Memory Scaffold
- Glossary continuity memory + candidate/suppression persistence introduced.
- Reference: `supabase/migrations/20260524_0004_glossary_memory.sql`

### Phase 5 - Reflective Thread Scaffold
- Durable thread continuity structures + object/glossary associations introduced.
- Reference: `supabase/migrations/20260524_0005_reflective_threads.sql`

### Phase 5b - Reflective Response Scaffold
- User-authored reflective response persistence + associations introduced.
- Reference: `supabase/migrations/20260524_0006_reflective_responses.sql`

### Phase 6 - Latent Scaffold + Write Protection
- Latent snapshots/signals/suggestions persistence introduced with bounded confidence/visibility.
- Canonical-state non-mutation boundary maintained.
- Reference: `supabase/migrations/20260524_0007_latent_scaffold.sql`

### Phase 6b - Runtime Integrity Audit + Boundary Hardening
- Cross-layer boundary checks and hardening applied (read-only composition, no latent authority leak, thin routes).
- Verification culture established across typecheck/lint/test/build gates.

### Phase 7 / 7b / 7c - Openings + Cadence + Suppression Lifecycle
- Opening infrastructure introduced with user-gating and optional surfacing.
- Cadence/dedupe/silence-first behavior introduced.
- Suppression lifecycle + revisit policy introduced.
- References:
  - `supabase/migrations/20260524_0008_openings.sql`
  - `supabase/migrations/20260524_0009_opening_suppression_lifecycle.sql`

### Phase 8 / 8b - Opening-to-Response Bridge + Revisitable Dialogue Read Model
- Opening activation events + opening-response associations introduced.
- Activation-without-response legitimacy preserved.
- Bridge FK issue fixed by adding `(id, user_id)` uniqueness for owner-safe composite references.
- Reference: `supabase/migrations/20260524_0010_opening_response_bridge.sql`

### Phase 9 / 9b / 9c - Reflective Space UI + Viewport API + Guardrails
- Minimal contemplative Reflective Space UI integrated.
- Backend-composed `/api/reflective-space/viewport` read path introduced.
- Viewport guardrails, section windows, bounded dialogue windows, and anti-feed constraints hardened.
- Read-path index hygiene added.
- References:
  - `supabase/migrations/20260525_0012_viewport_read_path_indexes.sql`
  - `docs/runtime/reflective-space-viewport-guardrails-v1.md`

### Phase 10 - User Auth + Admin Bootstrap
- Supabase auth flow integrated for protected Reflective Space access.
- Minimal admin bootstrap boundary introduced.
- Reference: `supabase/migrations/20260525_0011_user_admin_bootstrap.sql`

## Known Ongoing Risks

- Large historical dirty-worktree residue can hide unrelated diffs during reviews.
- Cursor stability and section caps should stay under regression tests as data volume grows.
- Build logging discipline depends on consistent use of `npm run build` (now enforced by documented process + wrapper).

## New Entry (2026-05-25)

### Stabilization Observability + Process Hardening

- Backfilled this ledger with clean-room Phase 1-10 + hardening sequence from repository evidence.
- Added mandatory build logging wrapper:
  - `scripts/run-build-with-log.mjs`
  - `docs/BUILD_LOG.md`
  - `docs/build-logs/`
- Wired `npm run build` to always write summary + full-output build logs.
- Added process guardrails in:
  - `AGENTS.md`
  - `docs/README.md`

## New Entry (2026-05-25 UTC)

### Phase 11 - Observation Semantic Boundary Guardrails v1 (Infrastructure Hardening)

- Ticket type: BUILD / COGNITION-INFRASTRUCTURE / SAFETY-HARDENING.
- Scope delivered:
  - semantic boundary gate at Observation ingress,
  - provenance + evidence-strength seam persistence,
  - summary-to-fragment trace linkage seam,
  - explicit latent backflow prevention on durable observation writes,
  - recurrence candidate trust hardening,
  - thin ontology-preparation extension seams.

Touched boundaries:
- Domain contracts and policy:
  - `src/domain/observation/types.ts`
  - `src/domain/observation/http-contract.ts`
  - `src/domain/observation/semantic-policy.ts`
- Observation route boundary:
  - `app/api/reflective-objects/[id]/observations/route.ts`
- Observation persistence adapters/repository:
  - `src/infrastructure/supabase/adapters/observation-row.ts`
  - `src/infrastructure/supabase/repositories/observation-supabase-repository.ts`
- Recurrence trust in latent scaffold:
  - `src/cognition/latent/latent-engine.ts`
- Schema hardening:
  - `supabase/migrations/20260525_0013_observation_semantic_guardrails.sql`
- Tests updated/added across observation + recurrence paths.

Architectural impact:
- Observation durability now requires descriptive semantic pass before persistence.
- Interpretive and insufficient-evidence payloads are blocked from durable Observation state.
- Observation records now carry explicit semantic/provenance/boundary metadata for future auditability.

Known limitations:
- Guardrail evaluator is heuristic v1 and may require iterative tuning for edge phrasing.
- Historical observations rely on migration defaults for new boundary columns.
- B-level ontology dimensions (agency/metacognition/affect transitions) are still pending.

Future-safe note:
- This phase hardens infrastructure boundaries only; it does not complete ontology expansion or latent redesign.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-25T21-02-55-337Z.log`

## New Entry (2026-05-25 UTC)

### Phase 12 - Observation Ontology Slice v1 (Agency States + Metacognitive Moments)

- Ticket type: BUILD / ONTOLOGY / OBSERVATION-BLEVEL.
- Scope delivered:
  - first-class Observation categories added: `agency_state`, `metacognitive_moment`,
  - bounded extraction support for explicit agency/metacognitive phenomenology cues,
  - semantic policy coherence integration for new categories,
  - evidence/provenance compatibility preserved for new dimensions,
  - latent-safe consumption seam added without Observation backflow.

Touched boundaries:
- Observation domain and category contracts:
  - `src/domain/observation/types.ts`
  - `src/domain/observation/semantic-policy.ts`
  - `src/domain/observation/README.md`
- Extraction scaffold:
  - `src/cognition/observation/descriptive-observation-scaffold.ts`
- Latent seam calibration (downstream-only):
  - `src/cognition/latent/latent-engine.ts`
- Supabase row adapters:
  - `src/infrastructure/supabase/adapters/observation-row.ts`
  - `src/infrastructure/supabase/adapters/glossary-row.ts`
- Minimal schema extension:
  - `supabase/migrations/20260525_0014_observation_ontology_slice_agency_metacognition.sql`
- Tests:
  - `src/domain/observation/__tests__/semantic-policy.test.ts`
  - `src/domain/observation/__tests__/http-contract.test.ts`
  - `src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts`
  - `src/cognition/latent/__tests__/latent-engine.test.ts`

Architectural impact:
- Observation can now persist agency and metacognitive phenomenology as explicit substrate dimensions.
- Semantic hardening remains active; interpretive and authoritative phrasing still rejected at ingress.
- Latent can consume the new dimensions probabilistically (`internal_only` signal) without mutating durable Observation truth.

Known limitations:
- Category detection remains cue-based and intentionally conservative.
- Agency/metacognitive transition granularity is partial (not full B-level ontology coverage yet).
- No reflective-space surfacing expansion was introduced in this slice.

Future-safe note:
- This phase is a bounded ontology slice, not full ontology completion.
- Next slices should follow the same pattern: semantic boundary first, thin category expansion second.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-25T21-30-29-868Z.log`

## New Entry (2026-05-26 UTC)

### Phase 13 - Observation Ontology Slice v2 (Affect Transitions + Contradiction + Atmosphere)

- Ticket type: BUILD / ONTOLOGY / OBSERVATION-BLEVEL.
- Scope delivered:
  - first-class Observation categories added:
    - `affect_transition`
    - `emotional_contradiction`
    - `affective_atmosphere`
  - semantic boundary integration for new affect categories (coherence + anti-interpretive enforcement),
  - bounded extraction cue support for affect transitions, contradiction, and atmospheric affect structure,
  - additive schema/category-constraint extension for observation and glossary category lineage,
  - latent-safe downstream seam extension without Observation backflow.

Touched boundaries:
- Observation domain and semantic policy:
  - `src/domain/observation/types.ts`
  - `src/domain/observation/semantic-policy.ts`
  - `src/domain/observation/README.md`
- Extraction scaffold:
  - `src/cognition/observation/descriptive-observation-scaffold.ts`
- Latent seam calibration (downstream-only):
  - `src/cognition/latent/latent-engine.ts`
- Supabase adapters:
  - `src/infrastructure/supabase/adapters/observation-row.ts`
  - `src/infrastructure/supabase/adapters/glossary-row.ts`
- Schema extension:
  - `supabase/migrations/20260526_0015_observation_ontology_slice_affect_structure.sql`
- Canon spec:
  - `docs/canon/observation-ontology-slice-spec-v2.md`
- Tests:
  - `src/domain/observation/__tests__/semantic-policy.test.ts`
  - `src/domain/observation/__tests__/http-contract.test.ts`
  - `src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts`
  - `src/cognition/latent/__tests__/latent-engine.test.ts`

Architectural impact:
- Observation can now persist affect movement, contradiction, and atmospheric affect as explicit descriptive substrate.
- Semantic hardening remains primary gate; interpretive/diagnostic affect wording is rejected at ingress.
- Latent continues to consume ontology slices probabilistically with `internal_only` seams and no durable backflow.

Known limitations:
- Affect classification remains cue-based and conservative.
- Fine-grained affect intensity calibration is not implemented in this slice.
- Reflective-space surfacing behavior remains intentionally unchanged (substrate-facing slice).

Future-safe note:
- This phase is a bounded ontology slice and not full affect ontology completion.
- Further affect enrichment should keep the same sequence: semantic boundary integrity before representational breadth.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T04-15-28-421Z.log`

## New Entry (2026-05-26 UTC)

### Phase 14 - Observation B3 Completion + Runtime Alignment v1 (Spatial Instability + Dream-State Phenomenology)

- Ticket type: BUILD / ONTOLOGY-ALIGNMENT / OBSERVATION.
- Scope delivered:
  - first-class Observation categories added:
    - `spatial_instability`
    - `dream_state_quality`
    - `continuity_fragment`
    - `altered_realism`
  - semantic boundary expansion for metaphysical/spiritual authority rejection while preserving phenomenological dream wording,
  - bounded extraction cue support for spatial/dream-state instability with lightweight flattening mitigation,
  - additive schema/category-constraint extension for observation fragments and glossary source-category lineage,
  - latent-safe downstream seam extension (`internal_only`, low-confidence) without Observation backflow,
  - roadmap/runtime reconciliation plus canonical v3 slice spec creation.

Touched boundaries:
- Observation domain and semantic policy:
  - `src/domain/observation/types.ts`
  - `src/domain/observation/semantic-policy.ts`
  - `src/domain/observation/README.md`
- Extraction scaffold:
  - `src/cognition/observation/descriptive-observation-scaffold.ts`
- Latent seam calibration (downstream-only):
  - `src/cognition/latent/latent-engine.ts`
- Supabase adapters:
  - `src/infrastructure/supabase/adapters/observation-row.ts`
  - `src/infrastructure/supabase/adapters/glossary-row.ts`
- Schema extension:
  - `supabase/migrations/20260526_0016_observation_ontology_slice_spatial_dreamstate.sql`
- Canon/roadmap docs:
  - `docs/canon/Observation-Ontology-Slice-Spec-v3-Spatial-DreamState.md`
  - `docs/superpowers/plans/2026-05-25-observation-architecture-completion-roadmap-v1.md`
- Tests:
  - `src/domain/observation/__tests__/semantic-policy.test.ts`
  - `src/domain/observation/__tests__/http-contract.test.ts`
  - `src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts`
  - `src/cognition/latent/__tests__/latent-engine.test.ts`

Architectural impact:
- Repo runtime now includes explicit B3 spatial/dream-state descriptive substrate categories end-to-end (types, validation, extraction, adapters, schema constraints, latent seam).
- Semantic guardrails now block metaphysical authority drift cases identified in the 2026-05-26 drift audit while still allowing uncertain phenomenological dream language.
- Extraction remains conservative and omission-friendly with reduced broad actor-regex dominance and reduced tiny-fragment context loss.

Known limitations:
- Category detection remains cue-based and intentionally bounded.
- Dream-state/metaphysical phrasing coverage is heuristic and may need iterative edge-case tuning.
- Reflective-space surfacing remains intentionally unchanged (substrate-facing completion ticket).

Reconciliation note:
- This phase resolves B3 alignment drift identified by audit:
  - `docs/superpowers/audits/2026-05-26-observation-b-level-slice-drift-review-v1.md`

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T04-50-59-032Z.log`

## New Entry (2026-05-26 UTC)

### Phase 15 - Latent Recalibration v1 Governance Primitives Foundation

- Ticket type: BUILD / COGNITION-GOVERNANCE / LATENT.
- Scope delivered:
  - provenance-aware and evidence-aware latent weighting,
  - uncertainty propagation into confidence shaping and center eligibility,
  - deterministic reflective-center candidate selection with no-center legitimacy,
  - anti-amplification primitives (repetition saturation / weak recurrence suppression),
  - scope discipline for dormant resurfacing (local-overlap gating),
  - silence-preserving demotion behavior with optional-suggestion withholding,
  - bounded processing-mode seam preparation (internal-only phrasing seam).

Touched boundaries:
- Latent governance runtime:
  - `src/cognition/latent/latent-engine.ts`
- Latent governance tests:
  - `src/cognition/latent/__tests__/latent-engine.test.ts`
- Opening cadence anti-amplification tests:
  - `src/cognition/openings/__tests__/opening-cadence-policy.test.ts`
- Latent scaffold route/runtime call sites:
  - `app/api/reflective-objects/[id]/latent-snapshots/route.ts`
  - `src/reflective-space/composition/get-reflective-space-viewport.ts`
- Runtime governance documentation:
  - `docs/runtime/latent-governance-primitives-v1.md`
  - `docs/runtime/README.md`

Architectural impact:
- Latent confidence is no longer static-by-signal; it is now weighted by provenance/evidence/uncertainty quality.
- Weak repeated continuity no longer self-amplifies into recurrence importance.
- Dormant global continuity no longer enters local attention without overlap evidence.
- No-center outcome is now explicit and suggestion surfacing can remain intentionally silent.

Known limitations:
- Heuristic weighting model (not learned calibration).
- Center stabilization is deterministic per invocation but not yet cross-snapshot memory-governed.
- Processing mode behavior is seam-only and does not orchestrate dialogue/runtime modes yet.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T10-56-03-659Z.log`

## New Entry (2026-05-26 UTC)

### Phase 16 - Reflective Center Engine v1 (Lifecycle + Salience + Longitudinal Attenuation)

- Ticket type: BUILD / LATENT / REFLECTIVE-CENTER.
- Scope delivered:
  - durable reflective-center lifecycle payload on latent snapshots,
  - lifecycle states (`possible`, `emerging`, `stabilized`, `weakening`, `dormant`, `suppressed`),
  - user-owned salience integration (highlight proxy, glossary note density, revisitation, explicit emphasis, writing persistence),
  - cross-snapshot attenuation (repetition decay, refractory penalty, cooldown penalty),
  - anti-thrashing hysteresis and bounded center switching,
  - lifecycle-aware demotion + suppression-aware transitions,
  - bounded continuity neighborhood persistence,
  - preservation of no-center/silence legitimacy.

Touched boundaries:
- Latent runtime engine:
  - `src/cognition/latent/latent-engine.ts`
- Latent lifecycle/persistence domain and validation:
  - `src/domain/latent/types.ts`
  - `src/domain/latent/validation.ts`
- Latent persistence adapters:
  - `src/infrastructure/supabase/adapters/latent-row.ts`
- Latent snapshot route integration (history + salience context):
  - `app/api/reflective-objects/[id]/latent-snapshots/route.ts`
- Route test harness updates:
  - `app/api/reflective-objects/[id]/latent-snapshots/__tests__/route.test.ts`
- Lifecycle-focused tests:
  - `src/cognition/latent/__tests__/latent-engine.test.ts`
  - `src/domain/latent/__tests__/validation.test.ts`
- Schema extension:
  - `supabase/migrations/20260526_0017_reflective_center_lifecycle_memory.sql`
- Runtime documentation:
  - `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`
  - `docs/runtime/latent-governance-primitives-v1.md`
  - `docs/runtime/README.md`

Architectural impact:
- Latent center behavior is no longer snapshot-local only; lifecycle continuity is persisted per snapshot and influences subsequent center selection.
- User-owned salience has explicit leverage against recurrence-only inflation while keeping interpretation boundaries internal and probabilistic.
- Cross-snapshot anti-amplification now exists in latent scoring path before continuity expansion.
- Quiet/no-center outcomes remain first-class and test-covered.

Known limitations:
- Highlight salience currently uses bounded proxy + metadata channels in this clean-room schema.
- Lifecycle and attenuation heuristics remain deterministic and may require calibration against broader usage.
- Neighborhood persistence remains intentionally capped/local-first to avoid narrative graph inflation.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T11-59-18-406Z.log`

## New Entry (2026-05-26 UTC)

### Phase 17 - Lifecycle Cooldown Enforcement Patch 1 (Active Governance Gate)

- Ticket type: BUILD / LATENT / GOVERNANCE-PATCH.
- Scope delivered:
  - active cooldown enforcement in lifecycle eligibility and recurrence surfacing,
  - cooldown-aware challenger damping with salience-based override to preserve revisability,
  - cooldown-window extension under repeated challenge pressure during active cooldown,
  - cooldown-aware no-center preservation (`cooldown_active` reason) without forced fallback center,
  - lifecycle test expansion for cooldown reactivation, expiry, no-center coexistence, challenger interaction, extension persistence, and strong-user-salience fairness.

Touched boundaries:
- Latent runtime engine:
  - `src/cognition/latent/latent-engine.ts`
- Lifecycle governance tests:
  - `src/cognition/latent/__tests__/latent-engine.test.ts`
- Runtime documentation:
  - `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`
  - `docs/runtime/latent-governance-primitives-v1.md`

Architectural impact:
- `cooldownUntil` now actively influences reflective cognition rather than persisting as inert metadata.
- Rapid oscillation and weak repetition resurfacing are damped longitudinally while preserving non-locking user-owned salience override.
- Silence legitimacy remains intact under active cooldown pressure.

Known limitations:
- Cooldown enforcement remains deterministic threshold logic and should be tuned with broader production distributions.
- Salience override currently depends on bounded proxy channels (metadata/highlight proxies) until dedicated highlight infrastructure is canonical.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T12-34-48-687Z.log`

## New Entry (2026-05-26 UTC)

### Phase 18 - Center-Scoped Suppression Semantics Patch 2 (Local Reflective Quieting)

- Ticket type: BUILD / LATENT / GOVERNANCE-PATCH.
- Scope delivered:
  - suppression evaluation narrowed from reflective-object scope to continuity-line locality,
  - suppression overlap now requires bounded lineage overlap (center/neighborhood observations, glossary, thread/response, affect-adjacent observation),
  - unrelated continuity lines remain eligible and are not auto-suppressed,
  - suppression precedence over cooldown preserved for overlapping local continuity,
  - no-center/silence legitimacy preserved without forced fallback-center substitution.

Touched boundaries:
- Latent runtime engine:
  - `src/cognition/latent/latent-engine.ts`
- Lifecycle governance tests:
  - `src/cognition/latent/__tests__/latent-engine.test.ts`
- Runtime documentation:
  - `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`
  - `docs/runtime/latent-governance-primitives-v1.md`

Architectural impact:
- Suppression now behaves as local reflective quieting rather than global reflective shutdown at object boundary.
- Continuity neighborhoods stay separable under suppression pressure while anti-thrashing/cooldown/attenuation remain active.

Known limitations:
- Lineage overlap remains heuristic and bounded; no graph-level continuity inference is introduced.
- Locality checks depend on available provenance channels and may need tuning on broader distributions.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T13-01-21-643Z.log`

## New Entry (2026-05-26 UTC)

### Phase 19 - Lifecycle Payload Shape Hardening Patch 3 (Integrity Boundaries)

- Ticket type: BUILD / LATENT / GOVERNANCE-PATCH.
- Scope delivered:
  - strict lifecycle payload validation + normalization introduced as canonical read/write boundary,
  - empty payload (`{}`) treated as lifecycle-empty rather than lifecycle-valid,
  - malformed/partial payloads degraded safely with bounded defaults or lifecycle-null fallback,
  - legacy center columns preserved as bounded compatibility fallback when payload invalid,
  - adapter contract hardened to normalize lifecycle payload before persistence.

Touched boundaries:
- Lifecycle validation primitives:
  - `src/domain/latent/validation.ts`
  - `src/domain/latent/__tests__/validation.test.ts`
- Persistence adapters:
  - `src/infrastructure/supabase/adapters/latent-row.ts`
  - `src/infrastructure/supabase/adapters/__tests__/latent-row.test.ts`
- Runtime documentation:
  - `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`
  - `docs/runtime/latent-governance-primitives-v1.md`

Architectural impact:
- Lifecycle payload is now a deterministic, normalized contract rather than implicitly trusted JSON.
- Invalid lifecycle memory degrades toward lifecycle-null/quiet behavior instead of synthetic continuity execution.
- Adapter read/write semantics align with one canonical lifecycle shape boundary.

Known limitations:
- Integrity hardening is currently adapter/validation-layer bounded (non-throwing), not DB-enforced JSON schema validation.
- Legacy fallback remains intentionally minimal and should eventually be versioned when payload schema evolution begins.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T15-17-04-176Z.log`

## New Entry (2026-05-26 UTC)

### Phase 20 - Response Provenance Locality Hardening Patch 4 (Suppression Lineage Boundaries)

- Ticket type: BUILD / LATENT / GOVERNANCE-PATCH.
- Scope delivered:
  - response provenance narrowed to continuity-local overlap before lifecycle/opening propagation,
  - latent snapshot route switched from broad user-wide response loading to object-local response retrieval,
  - suppression overlap tightened so response overlap cannot trigger suppression on its own,
  - ambiguous locality now degrades toward non-suppression,
  - opening lineage now inherits bounded local response provenance instead of broad carryover.

Touched boundaries:
- Latent runtime engine:
  - `src/cognition/latent/latent-engine.ts`
- Latent lifecycle tests:
  - `src/cognition/latent/__tests__/latent-engine.test.ts`
- Latent snapshot route + route tests:
  - `app/api/reflective-objects/[id]/latent-snapshots/route.ts`
  - `app/api/reflective-objects/[id]/latent-snapshots/__tests__/route.test.ts`
- Response repository contracts + implementation:
  - `src/domain/responses/contracts.ts`
  - `src/infrastructure/supabase/repositories/response-supabase-repository.ts`
- Runtime governance docs:
  - `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`
  - `docs/runtime/latent-governance-primitives-v1.md`

Architectural impact:
- Suppression locality no longer relies on broad response-history inheritance.
- Response lineage is now bounded by object association and local reflective-text overlap.
- Continuity-line suppression requires stronger locality evidence and avoids accidental cross-line collapse.

Known limitations:
- Response locality remains lexical/object-association heuristic, not graph-level continuity reasoning.
- Locality thresholds may still require tuning with broader real-user distributions.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T16-10-52-257Z.log`

## New Entry (2026-05-26 UTC)

### Phase 21 - Observation Provenance Locality Hardening Patch 5 (Continuity-Scoped Suppression Boundaries)

- Ticket type: BUILD / LATENT / GOVERNANCE-PATCH.
- Scope delivered:
  - latent snapshot ingestion tightened to a bounded local-first observation window,
  - observation provenance narrowed to continuity-local subsets via locality scoring,
  - opening provenance now carries bounded observation lineage instead of full object observation history,
  - suppression overlap tightened so broad observation overlap alone does not force strong suppression,
  - ambiguous observation locality now degrades toward non-suppression.

Touched boundaries:
- Latent runtime engine:
  - `src/cognition/latent/latent-engine.ts`
- Latent snapshot route + route tests:
  - `app/api/reflective-objects/[id]/latent-snapshots/route.ts`
  - `app/api/reflective-objects/[id]/latent-snapshots/__tests__/route.test.ts`
- Lifecycle governance tests:
  - `src/cognition/latent/__tests__/latent-engine.test.ts`
- Runtime governance docs:
  - `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`
  - `docs/runtime/latent-governance-primitives-v1.md`

Architectural impact:
- Observation lineage now behaves as nearby reflective continuity memory instead of reflective-object-global carryover.
- Suppression overlap remains center-scoped but now requires stronger locality semantics for observation-driven suppression.
- Shared-object continuity lines remain separable under suppression pressure without weakening silence legitimacy or cooldown behavior.

Known limitations:
- Observation locality selection remains heuristic (category proximity + token lineage cues + bounded windows), not graph-level continuity inference.
- Thresholds and lineage window sizes are deterministic and may need tuning against broader real-user distributions.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T16-39-32-854Z.log`

## New Entry (2026-05-26 UTC)

### Phase 22 - Processing-Mode Orchestration v1 (Bounded Internal Orientation Layer)

- Ticket type: BUILD / LATENT / ORCHESTRATION.
- Scope delivered:
  - lifecycle payload extended with bounded processing-mode state,
  - internal mode orchestration added for `exploratory`, `affective`, `agency_oriented`, `existential`, `continuity_oriented`,
  - mode confidence/uncertainty and no-mode legitimacy implemented,
  - nearby material prioritization seams added (`observations`, `glossary`, `notes`, `responses`, `neighborhood`),
  - cooldown/suppression-compatible mode degradation behavior added,
  - processing-mode state retained as internal-only non-authoritative runtime primitive.

Touched boundaries:
- Latent runtime engine:
  - `src/cognition/latent/latent-engine.ts`
- Latent domain model + validation:
  - `src/domain/latent/types.ts`
  - `src/domain/latent/validation.ts`
  - `src/domain/latent/__tests__/validation.test.ts`
- Latent persistence adapters:
  - `src/infrastructure/supabase/adapters/latent-row.ts`
  - `src/infrastructure/supabase/adapters/__tests__/latent-row.test.ts`
- Latent orchestration tests:
  - `src/cognition/latent/__tests__/latent-engine.test.ts`
- Runtime governance docs:
  - `docs/runtime/latent-processing-modes-and-architecture-clarifications-v1.md`
  - `docs/runtime/latent-governance-primitives-v1.md`
  - `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`
  - `docs/runtime/README.md`

Architectural impact:
- Latent now produces orientation-level processing tendencies without introducing interpretation-layer output.
- Ambiguous or weak mode competition can degrade to no-mode instead of forcing synthetic certainty.
- Lifecycle calmness controls continue to bound orchestration through suppression/cooldown-compatible confidence degradation.

Known limitations:
- Mode scoring remains deterministic heuristic logic and not learned calibration.
- Conflict/no-mode thresholds are bounded constants that may need tuning on broader usage distributions.
- Nearby material prioritization is a preparation seam and not yet connected to downstream dialogue/UX orchestration.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T17-44-03-376Z.log`

## New Entry (2026-05-26 UTC)

### Phase 23 - Homepage Orientation Hub v1 Scaffold (Routes + Payload + Responsive Composition)

- Ticket type: BUILD / HOMEPAGE / ROUTES / PAYLOAD / RESPONSIVE-COMPOSITION.
- Scope delivered:
  - homepage shell replaced with Orientation Hub composition,
  - bounded homepage aggregate composer added in reflective-space composition layer,
  - explicit homepage route target registry added with `implemented` / `placeholder` / `missing` statuses,
  - scaffold routes added for capture, glossary, journal, guide, object orientation, and deep reflection,
  - mobile composition updated to capture-first + 2x2 tile threshold with preview suppression.

Touched boundaries:
- Homepage route + composition wiring:
  - `app/page.tsx`
  - `src/reflective-space/composition/compose-homepage-orientation-payload.ts`
  - `src/reflective-space/composition/homepage-route-target-registry.ts`
- Homepage UI composition:
  - `src/ui/homepage/homepage-orientation-hub.tsx`
  - `src/ui/homepage/homepage-orientation-hub.module.css`
- Shared auth/placeholder scaffolding:
  - `src/ui/shared/require-authenticated-user.ts`
  - `src/ui/shared/calm-placeholder-page.tsx`
  - `src/ui/shared/calm-placeholder-page.module.css`
- New scaffold routes:
  - `app/capture/page.tsx`
  - `app/glossary/page.tsx`
  - `app/journal/page.tsx`
  - `app/guide/page.tsx`
  - `app/objects/[objectId]/page.tsx`
  - `app/objects/[objectId]/reflect/page.tsx`
- Tests:
  - `src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts`

Architectural impact:
- Homepage now consumes a bounded orientation payload and no longer renders as a broad dashboard-like workspace shell.
- Route href/status decisions are centralized in composition registry rather than inferred in UI.
- Mobile homepage uses entry-first tiles and suppresses dense desktop preview lists.

Known limitations:
- Route destinations are scaffold-level placeholders and intentionally minimal for v1 pass.
- Glossary item-level detail route remains `missing` and non-blocking in this scaffold.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Lint: `npm.cmd run lint` (pass)
- Tests: `npm.cmd test` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T17-58-59-778Z.log`

## New Entry (2026-05-31 UTC)

### Phase 24 - Internal Transport Boundary for Processing Modes (Governance Patch 6)

- Ticket type: BUILD / LATENT / GOVERNANCE-PATCH.
- Scope delivered:
  - explicit internal vs public latent transport projection layer added,
  - latent snapshot APIs now return public-safe projection payloads by default,
  - internal orchestration internals (`processingMode`, candidates, rationale traces, material priorities, lifecycle weighting internals) removed from default route transport payloads,
  - bounded public lifecycle state retained (`centerState`, `noCenterReason`),
  - public summary transport language sanitized to avoid raw mode/category leakage.

Touched boundaries:
- Latent transport boundary contracts:
  - `src/domain/latent/transport.ts`
  - `src/domain/latent/types.ts`
  - `src/domain/latent/README.md`
- Latent snapshot route transport hardening:
  - `app/api/latent/snapshots/route.ts`
  - `app/api/latent/snapshots/[id]/route.ts`
  - `app/api/reflective-objects/[id]/latent-snapshots/route.ts`
- Boundary verification tests:
  - `src/domain/latent/__tests__/transport.test.ts`
  - `app/api/latent/snapshots/__tests__/route.test.ts`
  - `app/api/latent/snapshots/[id]/__tests__/route.test.ts`
  - `app/api/reflective-objects/[id]/latent-snapshots/__tests__/route.test.ts`
- Runtime boundary documentation:
  - `docs/runtime/latent-processing-modes-and-architecture-clarifications-v1.md`
  - `docs/runtime/latent-governance-primitives-v1.md`
  - `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`
  - `docs/runtime/README.md`

Architectural impact:
- Internal latent orchestration richness is preserved server-side while default route transport contracts now enforce non-interpretive downstream boundaries.
- Processing-mode outputs are explicitly infrastructural and no longer leaked as raw route payload artifacts.
- Future dialogue-preparation can consume internal orchestration intentionally without relying on raw public snapshot payload exposure.

Known limitations:
- Public projection currently applies at route transport boundaries; repository/domain objects remain full-fidelity internal models by design.
- Summary sanitization is deterministic and bounded; future dialogue contracts may replace this with dedicated public continuity summary fields.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-31T11-55-51-742Z.log`

## New Entry (2026-05-31 UTC)

### Phase 25 - True No-Mode Silence (Governance Patch 7)

- Ticket type: BUILD / LATENT / GOVERNANCE-PATCH.
- Scope delivered:
  - removed derived-mode fallback wording when `selectedMode === null`,
  - no-mode reflective-opportunity descriptions now remain mode-silent,
  - no-mode opening phrasing now remains generic and non-orienting,
  - high-uncertainty weak-gravity handling now degrades toward no-mode silence instead of weak exploratory substitution,
  - exploratory/no-mode distinction hardened with explicit regression coverage.

Touched boundaries:
- Latent orchestration behavior:
  - `src/cognition/latent/latent-engine.ts`
- No-mode semantics tests:
  - `src/cognition/latent/__tests__/latent-engine.test.ts`
  - `src/domain/latent/__tests__/transport.test.ts`
  - `app/api/latent/snapshots/[id]/__tests__/route.test.ts`
- Runtime documentation:
  - `docs/runtime/latent-processing-modes-and-architecture-clarifications-v1.md`
  - `docs/runtime/latent-governance-primitives-v1.md`
  - `docs/runtime/README.md`

Architectural impact:
- No-mode is now treated as true orientation absence rather than fallback mode flavor.
- Internal and public payload paths can no longer reconstruct implicit mode flavor from no-mode phrasing paths.
- Exploratory remains available as an explicit mode only when reflective gravity is sufficient.

Known limitations:
- Exploratory/no-mode separation remains deterministic heuristic logic and may require distribution tuning as longitudinal production data grows.
- No-mode semantics are enforced in latent orchestration and transport projection paths; downstream consumers must continue to treat internal payloads as non-authoritative orchestration artifacts.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-31T12-29-36-501Z.log`

## New Entry (2026-06-01 UTC)

### Phase 26 - Reflection Entry Activation v1 (Live Orientation -> Reflection Route)

- Ticket type: BUILD / REFLECTION ENTRY / PHASE 1.
- Scope delivered:
  - mounted first live reflection entry route at `/objects/[objectId]/reflect`,
  - replaced route placeholder with real `ReflectiveSpaceWorkspace` mount,
  - added initial center-object hydration from route params into viewport bootstrap,
  - promoted orientation route target `reflective_object_orientation` from `placeholder` to `implemented`,
  - documented route/navigation/hydration/limitations in runtime docs.

Touched boundaries:
- Route activation:
  - `app/objects/[objectId]/reflect/page.tsx`
- Workspace hydration seam:
  - `src/ui/reflective-space/reflective-space-workspace.tsx`
- Orientation navigation target registry:
  - `src/reflective-space/composition/homepage-route-target-registry.ts`
- Regression coverage:
  - `src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts`
- Runtime delivery docs:
  - `docs/runtime/reflection-entry-activation-v1.md`

Architectural impact:
- Users can now enter a live reflection workspace from Orientation Recent Objects without hitting placeholder reflection route walls.
- Reflection viewport loading remains contract-stable and uses existing `centerObjectId` query wiring without payload redesign.
- Refresh preserves entry context through route-param-driven hydration.

Known limitations:
- Capture redesign and automated `Capture -> Observation -> Latent -> Opening` chain are intentionally out of scope in this phase.
- `/objects/[objectId]` and other non-reflection scaffold routes remain placeholders.
- Reflection entry is currently provided through recent object links, not full orientation IA completion.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-01T11-11-02-287Z.log`

## New Entry (2026-06-01 UTC)

### Phase 27 - Capture -> Observation Operational Path v1 (First Real User Input Loop)

- Ticket type: BUILD / CAPTURE / OBSERVATION / PHASE 2.
- Scope delivered:
  - replaced `/capture` placeholder with minimal operational dream capture form,
  - persisted reflective object from user input (`title`, `dreamText`),
  - generated and persisted descriptive observation scaffold from submitted dream text,
  - redirected capture flow to live reflection route `/objects/[objectId]/reflect`,
  - promoted orientation capture route target from `placeholder` to `implemented`.

Touched boundaries:
- Capture route and server action:
  - `app/capture/page.tsx`
  - `app/capture/page.module.css`
- Observation scaffold ingestion path:
  - `src/cognition/observation/descriptive-observation-scaffold.ts` (consumed)
  - `src/infrastructure/supabase/repositories/create-observation-repository.ts` (consumed)
- Reflective object creation path:
  - `src/infrastructure/supabase/repositories/create-reflective-object-repository.ts` (consumed)
- Orientation route status and regression coverage:
  - `src/reflective-space/composition/homepage-route-target-registry.ts`
  - `src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts`
- Runtime delivery docs:
  - `docs/runtime/capture-observation-operational-path-v1.md`

Architectural impact:
- First live user-authored capture loop now persists real input and immediately hands off into mounted reflection workspace.
- No runtime contract redesign was introduced; flow composes existing reflective object + observation domain boundaries.
- Refresh/re-entry behavior is persistence-backed and route-stable via existing reflection hydration seam.

Known limitations:
- Latent/opening generation remains intentionally out of scope for this phase.
- Validation UX remains minimal and non-polished.
- Journal/glossary continuity orchestration remains unchanged.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-01T11-42-09-721Z.log`

## New Entry (2026-06-01 UTC)

### Phase 28 - Latent -> Opening Operational Path v1 (Automatic Reflection Preparation)

- Ticket type: BUILD / LATENT / OPENING / PHASE 3.
- Scope delivered:
  - added automatic reflection preparation trigger on reflection route entry,
  - implemented route/service-level operational chain:
    - `Observation -> Latent Snapshot -> Opening Evaluation`,
  - reused existing latent/opening artifacts on re-entry to avoid duplicate generation,
  - preserved no-opening legitimacy and reflection workspace silence fallback,
  - preserved failure safety by keeping reflection workspace usable when preparation fails.

Touched boundaries:
- Reflection entry route integration:
  - `app/objects/[objectId]/reflect/page.tsx`
- Runtime orchestration service:
  - `src/runtime/orchestration/prepare-latent-opening-for-reflection.ts`
- Orchestration regression coverage:
  - `src/runtime/orchestration/__tests__/prepare-latent-opening-for-reflection.test.ts`
- Runtime delivery docs:
  - `docs/runtime/latent-opening-operational-path-v1.md`

Architectural impact:
- Reflection entry now performs automatic latent/opening preparation without changing schema or API contracts.
- Existing cadence/suppression/cooldown/no-center semantics remain authoritative because the implementation reuses:
  - `buildLatentSnapshotScaffold`
  - `deriveOpeningCandidatesFromLatent`
  - `applyOpeningCadencePolicy`
- Route-level error handling prevents preparation failures from blocking workspace rendering.

Known limitations:
- Reuse detection for latent snapshots is provenance-based (`sourceReflectiveObjects` overlap), not direct object-keyed snapshot ownership.
- No response, continuity, glossary, topology, or dialogue redesign is included in this phase.
- No new opening types or latent cognition rules were introduced.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-01T12-14-41-981Z.log`

## New Entry (2026-06-01 UTC)

### Phase 29 - Response + Continuity Completion v1 (First Closed Reflection Loop)

- Ticket type: BUILD / RESPONSE / CONTINUITY / PHASE 4.
- Scope delivered:
  - verified and kept mounted workspace response authoring path,
  - persisted response-object associations during opening response save for object continuity lineage,
  - scoped reflection viewport response and dialogue surfaces to current reflection object context,
  - added explicit continuity cue in workspace when prior reflection exists for selected object,
  - preserved fallback behavior for no-opening/no-response/no-dialogue and save failures.

Touched boundaries:
- Opening response API persistence path:
  - `app/api/openings/[id]/responses/route.ts`
- Route tests:
  - `app/api/openings/[id]/responses/__tests__/route.test.ts`
- Object-scoped viewport composition:
  - `src/reflective-space/composition/compose-reflective-space-viewport.ts`
- Workspace continuity cue:
  - `src/ui/reflective-space/reflective-space-workspace.tsx`
- Runtime delivery docs:
  - `docs/runtime/response-continuity-completion-v1.md`

Architectural impact:
- Response saves now preserve object context explicitly through response-object associations.
- Refresh/re-entry on `/objects/[objectId]/reflect` now uses object-scoped response/dialogue surfaces for clearer remembered-reflection continuity.
- No schema/migration changes were required.

Known limitations:
- Continuity cue is intentionally MVP-level and does not include advanced thread navigation/topology views.
- No glossary/highlight integration was added in this phase.
- Dialogue UX model remains bounded archive view (no redesign).

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-01T15-57-40-035Z.log`

## New Entry (2026-06-01 UTC)

### Phase 30 - Homepage Orientation Hub P0 Experiential Convergence Pass

- Ticket type: BUILD / UX / HOMEPAGE / EXPERIENTIAL-CONVERGENCE.
- Scope delivered:
  - removed homepage hero copy block so homepage opens directly into panel composition,
  - restored Capture panel as immediate first visual entry by structure (no replacement hero/onboarding content),
  - moved auth/session controls out of primary homepage hierarchy into a low-emphasis secondary utility disclosure.

Touched boundaries:
- Homepage route composition:
  - `app/page.tsx`
  - `app/page.module.css`
- Homepage UI composition:
  - `src/ui/homepage/homepage-orientation-hub.tsx`
  - `src/ui/homepage/homepage-orientation-hub.module.css`

Architectural impact:
- No runtime, payload, orchestration, route-registry, preview-count, or mobile tile contract changes.
- Homepage now starts with orientation panel structure itself, reducing launcher/app-shell first-fold pressure.
- Session controls remain accessible while no longer competing with orientation panels in first-fold hierarchy.

Known limitations:
- This pass is intentionally P0-only and does not redesign panel visuals/copy system-wide.
- Screenshots were not generated in this terminal-only execution context.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Lint: `npm.cmd run lint` (pass)
- Tests: `npm.cmd test` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-01T20-25-18-322Z.log`

## New Entry (2026-06-01 UTC)

### Phase 31 - Homepage Orientation Hub P1 Visual Hierarchy Convergence Pass

- Ticket type: BUILD / UX / HOMEPAGE / VISUAL-HIERARCHY.
- Scope delivered:
  - homepage copy switched to Hungarian-first at UI level for orientation panel labels and CTA language,
  - Capture panel upgraded to distinct primary entry surface with atmospheric background image (`public/home/capture_day.png`) and readability-preserving overlay,
  - glossary/journal/guide explicit "Open ..." CTA buttons removed; entry behavior moved to panel-surface linking,
  - panel hierarchy rebalanced (primary/secondary/tertiary visual weighting) with reduced secondary competition and tighter viewport-fit spacing,
  - homepage-specific vertical rhythm tightened to preserve one-surface orientation feel on common desktop heights.

Touched boundaries:
- Homepage route shell:
  - `app/page.tsx`
  - `app/page.module.css`
- Homepage UI composition:
  - `src/ui/homepage/homepage-orientation-hub.tsx`
  - `src/ui/homepage/homepage-orientation-hub.module.css`

Architectural impact:
- No runtime, payload shape, orchestration, cognition, route registry, or preview count contract changes were introduced.
- Capture now carries stronger entry gravity without introducing new homepage features.
- Secondary panels are visually demoted while preserving bounded orientation composition behavior.

Known limitations:
- Automated screenshot generation could not be completed without adding local Playwright test dependency; dependency was not added to respect ticket constraints.
- Dynamic user-generated preview text may still contain non-Hungarian content when source data is non-Hungarian.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Lint: `npm.cmd run lint` (pass)
- Tests: `npm.cmd test` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-01T20-41-47-466Z.log`

## New Entry (2026-06-02 UTC)

### Phase 32 - Homepage Orientation Hub P1.1 Polish Pass

- Ticket type: BUILD / UX / HOMEPAGE / POLISH.
- Scope delivered:
  - typography foundation switched to `Space Grotesk` (display) + `Source Sans 3` (text) through root layout font wiring,
  - session/admin controls moved from in-flow accordion into a compact floating lower-left utility rail,
  - Capture surface converted to full-surface entry interaction with single overlay link and non-interactive affordance chip,
  - duplicate Capture CTA wording removed,
  - Capture visual layering softened and hierarchy stabilized with calmer image treatment and hover/focus behavior,
  - Hungarian-first homepage copy encoding repaired at component level.

Touched boundaries:
- Global font shell:
  - `app/layout.tsx`
- Homepage route shell:
  - `app/page.tsx`
  - `app/page.module.css`
- Homepage UI composition:
  - `src/ui/homepage/homepage-orientation-hub.tsx`
  - `src/ui/homepage/homepage-orientation-hub.module.css`
- Utility controls:
  - `src/ui/auth/session-controls.tsx`
  - `src/ui/auth/session-controls.module.css`

Architectural impact:
- No runtime, payload, route, or orchestration contract changes were introduced.
- Homepage composition remains structurally identical while Capture now behaves as an entry surface rather than a peer card.
- Utility controls remain accessible without consuming homepage orientation space.

Known limitations:
- Screenshot generation was not repeated in this pass.
- Source-derived preview content can still reflect the language of stored user data.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Lint: `npm.cmd run lint` (pass)
- Tests: `npm.cmd test` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-02T06-55-56-165Z.log`

## New Entry (2026-06-02 UTC)

### Phase 33 - Homepage Orientation Hub P1.2 Final Polish and Bugfix Pass

- Ticket type: BUILD / UX / HOMEPAGE / BUGFIX / POLISH.
- Scope delivered:
  - replaced unicode escape sequences in homepage-facing strings with direct Hungarian text to prevent immersion-breaking literal escape rendering,
  - tightened homepage vertical rhythm and reduced excess whitespace below the composition,
  - softened Capture surface image treatment with stronger overlay and reduced visual lift,
  - preserved full-surface Capture interaction while simplifying its affordance posture,
  - normalized remaining homepage utility copy to proper Hungarian diacritics.

Touched boundaries:
- Homepage route shell:
  - `app/page.tsx`
  - `app/page.module.css`
- Homepage UI composition:
  - `src/ui/homepage/homepage-orientation-hub.tsx`
  - `src/ui/homepage/homepage-orientation-hub.module.css`
- Utility controls:
  - `src/ui/auth/session-controls.tsx`

Architectural impact:
- No runtime, payload, route, or orchestration changes were introduced.
- Homepage remains structurally identical while final text/rendering and compositional polish issues are resolved.

Known limitations:
- Screenshot capture was not rerun in this pass.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Lint: `npm.cmd run lint` (pass)
- Tests: `npm.cmd test` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-02T07-15-05-654Z.log`

## New Entry (2026-06-02 UTC)

### Phase 34 - Homepage Capture Surface Correction Pass

- Ticket type: BUILD / UX / HOMEPAGE / CAPTURE-CORRECTION.
- Scope delivered:
  - removed the unwanted `Belépési felület` eyebrow from the Capture panel,
  - replaced the separate title and small affordance with a single large CTA row: `+ Új álom rögzítése`,
  - kept the full Capture surface clickable while simplifying it to one visual action target,
  - centered Capture content horizontally, increased vertical breathing room, and reduced awkward desktop line wrapping,
  - lightened the daytime image treatment so the surface reads brighter and less heavy,
  - added a homepage UI regression test to lock the new Capture markup in place.

Touched boundaries:
- Homepage UI composition:
  - `src/ui/homepage/homepage-orientation-hub.tsx`
  - `src/ui/homepage/homepage-orientation-hub.module.css`
- Homepage UI regression tests:
  - `src/ui/homepage/__tests__/homepage-orientation-hub.test.tsx`

Architectural impact:
- No runtime, payload, route, or orchestration changes were introduced.
- The change is limited to homepage presentation and a targeted UI regression test.

Known limitations:
- Screenshot capture was not produced in this terminal pass.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Lint: `npm.cmd run lint` (pass)
- Tests: `npm.cmd test` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-02T08-49-28-872Z.log`

## New Entry (2026-06-02 UTC)

### Phase 35 - Homepage Capture Typography and Centering Follow-up

- Ticket type: BUILD / UX / HOMEPAGE / POLISH.
- Scope delivered:
  - forced the Capture CTA label onto the display font stack so it no longer falls back to body typography,
  - increased Capture top and bottom padding and slightly expanded its minimum height,
  - vertically centered the homepage panel composition within the desktop page shell while preserving mobile top-flow behavior.

Touched boundaries:
- Homepage route shell:
  - `app/page.module.css`
- Homepage UI composition:
  - `src/ui/homepage/homepage-orientation-hub.module.css`

Architectural impact:
- No runtime, payload, route, or orchestration changes were introduced.
- Changes are limited to homepage layout and typography presentation.

## New Entry (2026-06-03 UTC)

### Phase 36 - Reflective Space Orientation Layer v1

- Ticket type: BUILD / REFLECTIVE SPACE / ORIENTATION.
- Scope delivered:
  - replaced the `/objects/[objectId]` calm placeholder with the first real Orientation Layer route,
  - introduced a dream-first orientation composition with Dream Surface, Glossary Surface, Opening Stack, and Thread Overview,
  - reused existing observation, glossary-candidate, opening, and latent-opening preparation flows instead of creating a parallel runtime,
  - preserved `/objects/[objectId]/reflect` as the Deep Reflection route and used it as the handoff target for title editing and opening entry,
  - added orientation payload, view-model, and UI tests to lock the smallest coherent build in place.

Touched boundaries:
- Object orientation route:
  - `app/objects/[objectId]/page.tsx`
- Reflective-space orientation composition:
  - `src/reflective-space/composition/compose-object-orientation-payload.ts`
  - `src/reflective-space/composition/__tests__/compose-object-orientation-payload.test.ts`
- Object orientation UI:
  - `src/ui/object-orientation/object-orientation-layer.tsx`
  - `src/ui/object-orientation/object-orientation-layer.module.css`
  - `src/ui/object-orientation/view-model.ts`
  - `src/ui/object-orientation/__tests__/view-model.test.ts`
  - `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`

Architectural impact:
- Added a dedicated orientation read-model composition for a single reflective object without changing persistence contracts.
- Reused existing latent opening preparation, opening lifecycle APIs, and glossary extraction/runtime semantics.
- Deep Reflection route behavior remains intact and unchanged in purpose.

Known limitations:
- Opening and thread continuity remain the current runtime approximation; this pass does not add thread topology, emotion surfaces, notes, or deep-reflection redesign.
- Screenshot capture for desktop, laptop, and mobile was not produced in this terminal pass.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Lint: `npm.cmd run lint` (pass)
- Tests: `npm.cmd test` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-03T13-42-25-046Z.log`

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Lint: `npm.cmd run lint` (pass)
- Tests: `npm.cmd test` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-02T08-55-23-599Z.log`

## New Entry (2026-06-03 UTC)

### Phase 37 - Capture Save RLS Infrastructure Key Fix

- Ticket type: BUILD / BUGFIX / CAPTURE / PERSISTENCE.
- Scope delivered:
  - traced the `capture` save failure to server-side Supabase infrastructure writes using the public anon key,
  - verified the live failure mode as RLS rejection on `reflective_objects` writes with anon credentials,
  - updated server-side infrastructure env loading to expose `SUPABASE_SERVICE_ROLE_KEY`,
  - updated the infrastructure client to prefer the service-role key for trusted server persistence while preserving anon fallback,
  - added regression coverage for both environment loading and infrastructure key selection.

Touched boundaries:
- Runtime environment loading:
  - `src/infrastructure/environment/env.ts`
  - `src/infrastructure/environment/__tests__/env.test.ts`
- Server-side Supabase infrastructure client:
  - `src/infrastructure/supabase/client/create-supabase-infrastructure-client.ts`
  - `src/infrastructure/supabase/client/__tests__/create-supabase-infrastructure-client.test.ts`

Architectural impact:
- No schema or route contract changed.
- Server-side repository writes now use the intended privileged server credential when available, which aligns persistence behavior with authenticated capture and reflective-object creation flows.

Verification references:
- Targeted tests: `npm.cmd test -- src/infrastructure/supabase/client/__tests__/create-supabase-infrastructure-client.test.ts src/infrastructure/environment/__tests__/env.test.ts` (pass)
- Typecheck: `npm.cmd run typecheck` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-03T15-03-38-891Z.log`

## New Entry (2026-06-04 UTC)

### Phase 38 - Capture to Orientation Redirect Fix

- Ticket type: BUILD / BUGFIX / ROUTING / CAPTURE.
- Scope delivered:
  - corrected the post-capture redirect target so a newly created reflective object lands on `/objects/[objectId]`,
  - preserved the existing Deep Reflection destination at `/objects/[objectId]/reflect` for orientation-layer handoff and existing reflection links,
  - added a capture-page regression test that exercises the server action and locks the first destination to the orientation route.

Touched boundaries:
- Capture route:
  - `app/capture/page.tsx`
  - `app/capture/page.test.tsx`

Architectural impact:
- No payload, runtime, persistence, or route-shape changes.
- The fix is limited to the first navigation handoff after capture submission.

Verification references:
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Typecheck: `npm.cmd run typecheck` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-04T06-45-09-904Z.log`

## New Entry (2026-06-05 UTC)

### Phase 39 - Observation Ontology Alignment and Schema Enforcement

- Ticket type: BUILD / RUNTIME ALIGNMENT / OBSERVATION.
- Scope delivered:
  - identified live extractor category drift with repository evidence from the Hungarian regression dream probe: `Location`, `Social Interaction`, `Action`, `Response`, `Physical Sensation`, `Visual Perception`, `Overall Feeling`,
  - constrained LLM observation extraction schema categories to the canonical runtime vocabulary via explicit enum enforcement,
  - added deterministic normalization for safe ontology-adjacent aliases such as `affect_state` -> `emotion`, `continuity_candidate` -> `continuity_fragment`, and formatting-only variants,
  - upgraded invalid-category validation diagnostics so fallback logs now include the offending category and the full allowed vocabulary,
  - aligned observation runtime docs and Supabase adapter typing to the same canonical category set.

Touched boundaries:
- Observation extraction runtime:
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/observation-extraction-validation.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`
  - `src/cognition/observation/__tests__/observation-extraction-validation.test.ts`
- Observation domain and persistence typing:
  - `src/domain/observation/README.md`
  - `src/infrastructure/supabase/adapters/observation-row.ts`
- Runtime documentation:
  - `docs/runtime/lumira-observation-extraction-contract-v1.md`

Architectural impact:
- Observation extraction, validation, runtime typing, and persistence now share one explicit category vocabulary.
- The LLM schema no longer permits category labels that cannot be persisted.
- Validator fallback reasons now expose ontology drift immediately instead of collapsing to bare `invalid_category`.

Verification references:
- Targeted tests: `npm.cmd test -- src/cognition/observation/__tests__/llm-observation-extractor.test.ts src/cognition/observation/__tests__/observation-extraction-validation.test.ts src/infrastructure/supabase/adapters/__tests__/observation-row.test.ts` (pass)
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (fails: existing timeouts in `app/api/reflective-objects/[id]/latent-snapshots/__tests__/route.test.ts` and `app/api/reflective-objects/[id]/observations/__tests__/route.test.ts`)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-05T12-38-11-646Z.log`

## New Entry (2026-06-05 UTC)

### Phase 40 - Observation Phenomenological Category Emission Tuning

- Ticket type: BUILD / OBSERVATION / LLM EXTRACTOR.
- Scope delivered:
  - strengthened the LLM observation extractor prompt so it explicitly prefers evidence-backed phenomenological categories over broad descriptive fallbacks,
  - added regression coverage for Hungarian fragments that map to `agency_state`, `metacognitive_moment`, `altered_realism`, and `affect_transition`,
  - added focused latent handoff coverage confirming those center-relevant categories surface as reflective-opportunity material without changing latent thresholds.

Touched boundaries:
- Observation extraction runtime:
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`
- Latent handoff regression coverage:
  - `src/cognition/latent/__tests__/latent-engine.test.ts`

Architectural impact:
- No schema, persistence, semantic-policy, or latent-threshold changes.
- Category vocabulary remains aligned across extractor schema, validation, typing, persistence, and latent consumption.
- Strict evidence validation and repair behavior remain unchanged.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-05T15-59-44-686Z.log`

## New Entry (2026-06-05 UTC)

### Phase 41 - Observation Phenomenology Policy Alignment v1

- Ticket type: BUILD / OBSERVATION / SEMANTIC POLICY ALIGNMENT.
- Scope delivered:
  - aligned semantic-policy coherence cues with explicit phenomenological cases already encouraged by the LLM extractor,
  - added bounded agency cues for refusal, resistance, coercion-adjacent force, escape pressure, slowed movement, and inability-to-reach style control loss,
  - added bounded altered-reality cues for mirror anomaly, missing reflection, distorted reflection, impossible perceived image, and reality-behaving-strangely cases,
  - expanded explicit affect-transition and discontinuity cue coverage without converting generic recurrence into continuity,
  - clarified extractor prompt boundaries between `dream_state_quality`, `altered_realism`, `spatial_instability`, and `continuity_fragment`,
  - added regression coverage for policy acceptance and prompt-boundary guidance without changing latent weights, thresholds, or downstream runtime behavior.

Touched boundaries:
- Observation semantic policy:
  - `src/domain/observation/semantic-policy.ts`
  - `src/domain/observation/__tests__/semantic-policy.test.ts`
- Observation extractor prompt guidance:
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`

Architectural impact:
- Observation remains evidence-first and non-interpretive; this change only narrows false uncertainty for explicit phenomenological cases.
- Category vocabulary, persistence constraints, repair validation, and latent scoring remain unchanged.
- Broad recurrence is still kept separate from explicit discontinuity.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-05T17-59-36-011Z.log`

## New Entry (2026-06-05 UTC)

### Phase 42 - AI-Generated Editable Dream Title v0

- Ticket type: BUILD / CAPTURE / ORIENTATION.
- Scope delivered:
  - added a dedicated AI dream-title helper separate from observation extraction,
  - kept the deterministic capture-title fallback and updated the stored reflective object title only when the AI title succeeds,
  - preserved capture route flow and observation extraction boundaries,
  - added a minimal inline rename affordance on the orientation dream header using the existing reflective-object patch route.

Touched boundaries:
- Capture flow:
  - `app/capture/page.tsx`
  - `app/capture/page.test.tsx`
  - `app/capture/capture-metrics.ts`
- Dedicated dream title generation:
  - `src/cognition/title/llm-dream-title-generator.ts`
  - `src/cognition/title/__tests__/llm-dream-title-generator.test.ts`
- Orientation title editing:
  - `src/ui/object-orientation/object-orientation-layer.tsx`
  - `src/ui/object-orientation/object-orientation-layer.module.css`
  - `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`

Architectural impact:
- No schema changes.
- Observation extractor schema and latent/opening/thread orchestration remain unchanged.
- Title generation is isolated from descriptive observation extraction and remains non-interpretive by prompt contract.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-05T18-30-47-648Z.log`

## New Entry (2026-06-05 UTC)

### Phase 43 - LLM Observation SummaryTrace Alignment v1

- Ticket type: BUILD / OBSERVATION / RUNTIME FIX.
- Scope delivered:
  - made `summaryTrace` explicit in the LLM extraction schema and prompt,
  - added deterministic final `summaryTrace` rebuild from the surviving validated fragments after evidence repair/drop,
  - ensured fragment drop cannot leave stale trace references in the final persisted observation payload,
  - added semantic-policy diagnostics for invalid, stale, and unsupported caller-supplied summary traces without loosening evidence or category guardrails,
  - added regression coverage for missing-trace rebuild, stale-trace survivor rebuild, and the Hungarian phenomenology case that previously risked `summary_trace_missing`.

Touched boundaries:
- Observation extraction:
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`
- Observation semantic policy:
  - `src/domain/observation/semantic-policy.ts`
  - `src/domain/observation/__tests__/semantic-policy.test.ts`

Architectural impact:
- Final Observation runtime order now follows:
  - LLM extraction
  - schema/category validation
  - evidence validation + repair/drop
  - final surviving fragments
  - deterministic `summaryTrace` rebuild
  - semantic policy
  - persist
- Semantic policy remains authoritative; unsupported evidence and interpretive output are still rejected or deferred.
- No latent, opening, thread, glossary, UI, or schema changes.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-05T18-52-27-528Z.log`

## New Entry (2026-06-05 UTC)

### Phase 44 - Orientation Inline Dream Title Editing Polish

- Ticket type: BUILD / ORIENTATION / UI POLISH.
- Scope delivered:
  - reduced the orientation-layer dream title scale slightly,
  - removed the separate rename button and helper copy,
  - moved title editing onto the existing pencil affordance with inline single-line editing,
  - added keyboard-safe save/cancel controls using the existing reflective-object patch route.

Touched boundaries:
- Orientation header title editing:
  - `src/ui/object-orientation/object-orientation-layer.tsx`
  - `src/ui/object-orientation/object-orientation-layer.module.css`
  - `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`

Architectural impact:
- No schema, route-flow, or reflective-space architecture changes.
- Title editing remains local to the orientation header and persists through the existing `PATCH /api/reflective-objects/[id]` boundary.
- A stale generated `.next/dev/types` artifact had to be removed before final verification; no source behavior changed as part of that cleanup.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-05T20-13-28-670Z.log`

## New Entry (2026-06-06 UTC)

### Observation V2 Phase 2 - Separate Discovery Output From Persistence Shape

- Ticket type: BUILD / RUNTIME / OBSERVATION V2.
- Scope delivered:
  - introduced `ObservationDiscoveryResult` as an explicit pre-persistence runtime concept,
  - added a deterministic discovery-to-persistence projection boundary for `ObservationDiscoveryResult -> CreateObservationInput`,
  - refactored scaffold and LLM extraction to produce discovery-oriented intermediates before V1 payload shaping,
  - preserved V1 persistence shape, schema, API surface, UI behavior, glossary behavior, and latent behavior.

Touched boundaries:
- Observation discovery runtime:
  - `src/cognition/observation/observation-discovery.ts`
  - `src/cognition/observation/observation-discovery-projection.ts`
- Observation extraction:
  - `src/cognition/observation/descriptive-observation-scaffold.ts`
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/observation-engine.ts`
- Observation discovery verification:
  - `src/cognition/observation/__tests__/observation-discovery.test.ts`

Architectural impact:
- Observation discovery now exists as its own runtime stage inside cognition.
- Persistence shaping is isolated to a single projection step that emits the unchanged V1 `CreateObservationInput`.
- Semantic policy behavior remains intact with minimal breakage by being preserved at the compatibility boundary rather than forcing a broader runtime rewrite.
- No schema, repository, API contract, UI, glossary, or latent contract changes were introduced.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-06T12-37-23-725Z.log`

## New Entry (2026-06-06 UTC)

### Observation V2 Phase 2.1 - Clean Discovery Boundary Before Derived Summary

- Ticket type: BUILD / RUNTIME / OBSERVATION V2.
- Scope delivered:
  - demoted discovery-owned summary compatibility from top-level `summaryCandidate` to transitional `projectionCompatibility.summaryText`,
  - reduced obvious V1 fragment-shaped coupling by constructing scaffold discovery observations directly and by remapping validated LLM fragments into discovery observations before projection,
  - documented direct HTTP `CreateObservationInput` parsing as a manual/API compatibility ingress rather than the canonical cognition path,
  - preserved cognition flow as `ObservationDiscoveryResult -> projection -> CreateObservationInput` for generation paths.

Touched boundaries:
- Observation discovery boundary:
  - `src/cognition/observation/observation-discovery.ts`
  - `src/cognition/observation/observation-discovery-projection.ts`
- Observation cognition producers:
  - `src/cognition/observation/descriptive-observation-scaffold.ts`
  - `src/cognition/observation/llm-observation-extractor.ts`
- Observation compatibility ingress:
  - `src/domain/observation/http-contract.ts`
  - `app/api/reflective-objects/[id]/observations/route.ts`
- Verification:
  - `src/cognition/observation/__tests__/observation-discovery.test.ts`
  - `src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts`
  - `src/cognition/observation/__tests__/observation-engine.test.ts`

Architectural impact:
- Discovery output is now more clearly observation-first and no longer implies top-level summary ownership.
- V1 summary compatibility behavior remains available only as transitional projection metadata.
- Manual POST creation remains intentionally parallel for compatibility, with explicit inline documentation.
- No schema, API behavior, UI behavior, glossary behavior, latent behavior, or semantic-policy behavior changes were introduced.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-06T13-43-38-945Z.log`

## New Entry (2026-06-06 UTC)

### Observation V2 Phase 3 - Derive Summary From Discovery Output

- Ticket type: BUILD / RUNTIME / OBSERVATION V2.
- Scope delivered:
  - moved V1 summary ownership fully into projection by deriving `CreateObservationInput.summary` from ordered `ObservationDiscoveryResult.observations`,
  - kept `projectionCompatibility.summaryText` only as a transitional fallback when ordered discovery observations cannot produce a usable summary,
  - added a safe generic summary fallback for preserve-defaults compatibility cases where neither discovery observations nor compatibility summary can produce text,
  - removed scaffold-only summary-trace injection so scaffold projection now rebuilds `summaryTrace` from the same derived summary behavior used by the general projection path.

Touched boundaries:
- Observation discovery projection:
  - `src/cognition/observation/observation-discovery-projection.ts`
- Scaffold compatibility path:
  - `src/cognition/observation/descriptive-observation-scaffold.ts`
- Verification:
  - `src/cognition/observation/__tests__/observation-discovery.test.ts`
  - `src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts`

Architectural impact:
- Projection is now the canonical summary-shaping boundary for cognition-driven Observation V2 flow.
- Summary precedence is now:
  - ordered discovery observations
  - transitional compatibility summary
  - safe generic fallback
- V1 persistence shape remains unchanged, including `summary`, `summaryTrace`, and fragment persistence contracts.
- Manual HTTP `CreateObservationInput` ingress remains transitional and parallel by design; this phase does not remove it.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass: `88` files, `330` tests)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-06T14-11-34-104Z.log`

## New Entry (2026-06-06 UTC)

### Observation V2 Phase 4 - Native Multi-Observation Support In Discovery

- Ticket type: BUILD / RUNTIME / OBSERVATION V2.
- Scope delivered:
  - introduced a discovery-level shared-evidence registry so multiple observations can reference one evidence span without duplicating discovery metadata,
  - changed discovery observations from inline `spans[]` storage to `spanIds[]` references against bundle-local `evidenceSpans`,
  - added internal discovery metrics for observation count and evidence span count,
  - expanded scaffold fallback so one sentence can safely emit multiple clause observations while preserving one shared source-evidence span,
  - preserved V1 persistence projection by resolving discovery evidence references back into the existing fragment payload shape.

Touched boundaries:
- Observation discovery runtime:
  - `src/cognition/observation/observation-discovery.ts`
  - `src/cognition/observation/observation-discovery-projection.ts`
- Observation cognition producers:
  - `src/cognition/observation/descriptive-observation-scaffold.ts`
  - `src/cognition/observation/llm-observation-extractor.ts`
- Verification:
  - `src/cognition/observation/__tests__/observation-discovery.test.ts`
  - `src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts`
  - `src/cognition/observation/__tests__/observation-extraction-validation.test.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`

Architectural impact:
- Discovery now models shared evidence explicitly as bundle-local evidence spans plus observation references.
- Projection remains the only V1 shaping boundary; schema, API contracts, UI behavior, and repository persistence stay unchanged.
- Structured normalization and LLM validation continue accepting repeated evidence snippets, but discovery now preserves them as one shared span before projection.
- Manual HTTP `CreateObservationInput` ingress remains a compatibility-era parallel path and is still outside the discovery-native model.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass: `88` files, `334` tests)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-06T15-06-09-195Z.log`

## New Entry (2026-06-06 UTC)

### Observation V2 Phase 5 - Internal Salience Profiles (Inline Hybrid)

- Ticket type: BUILD / RUNTIME / OBSERVATION V2.
- Scope delivered:
  - introduced bounded internal salience profiles for discovery observations with Phase 5 v1 dimensions:
    - `anomaly`
    - `agencyTension`
    - `metacognitivePresence`
  - extended the existing single LLM extraction schema so fragments may propose inline salience without adding a second provider pass,
  - normalized salience after discovery assembly by removing unknown dimensions, dropping unsupported values, and rejecting obviously unsupported metacognitive salience,
  - added conservative scaffold salience generation for anomaly, agency tension, and explicit dream-awareness cues,
  - kept projection, persistence, API, UI, latent, and glossary behavior unchanged by ignoring salience on the V1 bridge.

Touched boundaries:
- Observation salience runtime:
  - `src/domain/observation/salience.ts`
  - `src/cognition/observation/observation-salience.ts`
- Observation discovery and extraction:
  - `src/cognition/observation/observation-discovery.ts`
  - `src/cognition/observation/observation-extraction-validation.ts`
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/descriptive-observation-scaffold.ts`
- V2 observation projection surface:
  - `src/domain/observation/v2.ts`
- Verification:
  - `src/cognition/observation/__tests__/observation-discovery.test.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`
  - `src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts`
  - `src/domain/observation/__tests__/v2.test.ts`

Architectural impact:
- Observation salience now exists as an internal Observation V2 concept attached to `ObservationDiscoveryObservation`.
- The validated LLM path can propose salience inline, but deterministic normalization remains the final guardrail.
- Scaffold fallback produces conservative salience only; it does not attempt parity with validated LLM nuance.
- The V1 bridge still projects `ObservationDiscoveryResult` to `CreateObservationInput` without salience fields, preserving storage and downstream compatibility.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass: `88` files, `342` tests)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-06T16-11-48-548Z.log`

## New Entry (2026-06-06 UTC)

### Observation LLM Structured Output Salience Schema Fix

- Ticket type: BUILD / RUNTIME / OBSERVATION V2.
- Scope delivered:
  - fixed the OpenAI structured-output `salience` JSON schema so every declared nested property is listed in nested `required`,
  - kept `anomaly`, `agencyTension`, and `metacognitivePresence` as nullable enums with values `present | strong | null`,
  - preserved optional `salience` at the fragment level while making provided salience objects strict-schema compliant,
  - added regression coverage for schema construction and parsing of `null` salience dimensions.

Touched boundaries:
- Observation extraction schema:
  - `src/cognition/observation/llm-observation-extractor.ts`
- Verification:
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`

Architectural impact:
- This change is limited to the OpenAI response-format contract and extractor regression coverage.
- Discovery normalization still treats `null` salience dimensions as absent while preserving supported non-null dimensions.
- Persistence, API, UI, latent, and glossary boundaries remain unchanged.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass: `88` files, `343` tests)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-06T19-36-34-135Z.log`

## New Entry (2026-06-06 UTC)

### Capture Path Hard-Fail On Observation LLM Failure

- Ticket type: BUILD / RUNTIME / CAPTURE.
- Scope delivered:
  - removed the capture-route scaffold fallback for observation generation,
  - changed capture to require validated LLM observation extraction before any dream object or observation is persisted,
  - redirected failed observation analysis back to `/capture?error=analysis` instead of saving partial capture state,
  - preserved title generation as best-effort metadata enrichment after validated observation success,
  - added repository support for caller-supplied reflective object ids so capture can generate the object id before persistence and still keep the flow all-or-nothing.

Touched boundaries:
- Capture route:
  - `app/capture/page.tsx`
  - `app/capture/page.test.tsx`
- Reflective object creation contract:
  - `src/domain/reflective-objects/types.ts`
  - `src/infrastructure/supabase/adapters/reflective-object-row.ts`
- Observation extraction runtime:
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`

Architectural impact:
- Capture no longer treats deterministic scaffold observation output as an acceptable success path.
- Observation LLM success is now a hard prerequisite for persistence in the manual dream capture flow.
- Partial persistence is prevented by generating the reflective object id before save and writing only after validated extraction returns.
- This hard-fail policy is currently scoped to capture and does not remove scaffold behavior from unrelated observation runtime surfaces.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass: `88` files, `345` tests)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-06T20-06-31-296Z.log`

## 2026-06-07 - Observation Extraction Schema + Timeout Stabilization

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`
  - `src/cognition/observation/__tests__/observation-salience.test.ts`
- Verification:
  - `npm run typecheck` -> pass
  - `npm test` -> pass (`89` files, `346` tests)
  - `npm run lint` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-07T06-08-18-959Z.log`
- Notes:
  - Re-encoded the nullable observation `salience` response-format field as an `anyOf` object-or-null schema so the nested object branch keeps explicit required keys for `anomaly`, `agencyTension`, and `metacognitivePresence`.
  - Raised the observation extraction OpenAI timeout to `40_000ms`; the inspected runtime source previously used `25_000ms`.
  - Existing fallback diagnostics remained sufficient: capture still logs `llm_observation_extraction_failed` with the extractor reason, and extractor-level provider/repair/evidence failures remain logged with bounded detail.

## 2026-06-10 - Sleep & Dream Guide Route v1

- Phase: BUILD
- Touched boundaries:
  - `app/guide/page.tsx`
  - `src/ui/guide/view-model.ts`
  - `src/ui/guide/guide-workspace.tsx`
  - `src/ui/guide/guide-card.tsx`
  - `src/ui/guide/guide-modal.tsx`
  - `src/ui/guide/guide-tips.tsx`
  - `src/ui/guide/guide-safety-note.tsx`
  - `src/ui/guide/guide-related-cards.tsx`
  - `src/ui/guide/guide-workspace.module.css`
  - `src/reflective-space/composition/homepage-route-target-registry.ts`
  - `app/guide/page.test.tsx`
  - `src/ui/guide/__tests__/view-model.test.ts`
  - `src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts`
- Verification:
  - `npm.cmd test -- app/guide/page.test.tsx src/ui/guide/__tests__/view-model.test.ts src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts` -> pass (`3` files, `9` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-10T10-37-42-510Z.log`
- Notes:
  - Replaced the `/guide` placeholder with a public Sleep & Dream Guide route backed by the existing guide card content and search helpers.
  - Added guide-specific filtering, responsive card grid, modal detail flow, related-card switching, and route-scoped semantic guide tokens for category, safety, and surface treatments.
  - Updated the homepage route target registry so `guide_home` now resolves as an implemented route.

## 2026-06-10 - Sleep & Dream Guide Polish v1

- Phase: BUILD
- Touched boundaries:
  - `app/guide/page.test.tsx`
  - `src/ui/guide/__tests__/guide-modal.test.tsx`
  - `src/ui/guide/__tests__/view-model.test.ts`
  - `src/ui/guide/view-model.ts`
  - `src/ui/guide/guide-workspace.tsx`
  - `src/ui/guide/guide-modal.tsx`
  - `src/ui/guide/guide-workspace.module.css`
- Verification:
  - `npm.cmd test -- app/guide/page.test.tsx src/ui/guide/__tests__/view-model.test.ts src/ui/guide/__tests__/guide-modal.test.tsx` -> pass (`3` files, `6` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-10T11-39-57-376Z.log`
- Notes:
  - Replaced the large guide hero with a lighter page header and subtle home back control.
  - Removed secondary filtering from both UI and guide filtering logic, leaving search plus primary category only.
  - Reduced preview density on cards and related cards, demoted the secondary pill visually, and changed the modal close control to an icon-style affordance.
  - Smoothed the modal reading flow by rendering the main content as one continuous reading block and moved the home back control into an overlaid left-side position so the title and subtitle keep their original alignment.

## 2026-06-10 - Guide Homepage Entry Panel v1

- Phase: BUILD
- Touched boundaries:
  - `app/guide/page.tsx`
  - `app/guide/page.test.tsx`
  - `src/ui/guide/guide-workspace.tsx`
  - `src/ui/guide/guide-modal-state.ts`
  - `src/ui/guide/__tests__/guide-modal-state.test.ts`
  - `src/ui/homepage/homepage-orientation-hub.tsx`
  - `src/ui/homepage/homepage-orientation-hub.module.css`
  - `src/ui/homepage/__tests__/homepage-orientation-hub.test.tsx`
- Verification:
  - `.\node_modules\.bin\vitest.cmd run src/ui/homepage/__tests__/homepage-orientation-hub.test.tsx app/guide/page.test.tsx src/ui/guide/__tests__/guide-modal-state.test.ts src/ui/guide/__tests__/guide-modal.test.tsx src/ui/guide/__tests__/view-model.test.ts src/content/sleep-dream-guide/__tests__/search.test.ts` -> pass (`6` files, `23` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-10T13-59-01-335Z.log`
- Notes:
  - Replaced the homepage `Útmutató` placeholder content with a compact guide-entry panel containing three fixed featured links and a subtle `/guide` chevron action.
  - Added minimal `/guide?card=<slug>` support by resolving a valid slug on page load, opening the existing modal, and removing only the `card` param on close.
  - Left homepage search, guide card content, and the broader guide page layout unchanged outside this URL-entry behavior.

## 2026-06-10 - Homepage Panel Polish After Guide Entry

- Phase: BUILD
- Touched boundaries:
  - `src/ui/homepage/homepage-orientation-hub.module.css`
- Verification:
  - `.\node_modules\.bin\vitest.cmd run src/ui/homepage/__tests__/homepage-orientation-hub.test.tsx app/guide/page.test.tsx src/ui/guide/__tests__/guide-modal-state.test.ts src/ui/guide/__tests__/guide-modal.test.tsx src/ui/guide/__tests__/view-model.test.ts src/content/sleep-dream-guide/__tests__/search.test.ts` -> pass (`6` files, `23` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-10T14-20-20-646Z.log`
- Notes:
  - Clamped Dream Journal preview copy to two lines so long summaries stop overgrowing the shared dashboard row.
  - Moved the Guide panel chevron into reserved layout flow at the bottom-right instead of absolute overlap, while keeping featured-row chevrons untouched.
  - Visual verification of the polished homepage was confirmed by the user after the local changes; an attempted automated Playwright screenshot path was blocked because browser installation was declined.
