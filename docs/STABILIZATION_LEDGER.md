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
