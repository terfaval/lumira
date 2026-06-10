# Observation V2 Foundation Phase 1 Design

Date: 2026-06-08
Status: Draft for owner review
Scope: Backend V2 Observation foundation only

## 1. Goal

Build the first real Backend V2 Observation foundation from canon.

Phase 1 establishes a scene-first runtime model:

```text
Dream
-> Scene Segmentation
-> Scenes
-> Observations
-> Derived Structures
```

This phase is additive.

It does not migrate:

- Glossary
- Latent
- Openings
- Reflections
- Dream Map
- UI

It does not cut over existing V1 Observation routes or persistence contracts.

V1 remains a temporary projection target only.

## 2. Canonical Constraints

The design is governed by:

- `docs/canon/backend-v2/LUMIRA_BACKEND_V2_CANON.md`
- `docs/canon/backend-v2/by-layer/LUMIRA OBSERVATION DATA PHILOSOPHY v0.docx`

The following rules are binding:

- Observation must answer `What appeared?`
- Observation must remain descriptive, evidence-linked, non-interpretive, and uncertainty-aware.
- The primary organizational unit is the Scene.
- Observations are the primary content inside Scenes.
- Structured extraction is derived from Observations, not the reverse.
- Existing V1 fragment-first structures must not shape the V2 runtime model.
- Deterministic fallback must remain minimal and subordinate to the LLM-first path.

## 3. Phase 1 Outcome

Phase 1 delivers a new additive Observation V2 runtime that:

- models Scenes as first-class units,
- models scene-contained Observations as first-class units,
- preserves boundary reasoning and evidence context,
- derives minimal structured outputs from scene-contained observations,
- projects V2 output into the current V1 persistence write shape when needed,
- documents all downstream fallout without migrating downstream systems.

## 4. Non-Goals

- No schema redesign for V2 storage in this phase.
- No V1 route cutover in this phase.
- No migration of downstream layer inputs.
- No UI redesign or new UI surface.
- No repo-wide cleanup of V1 structures yet.
- No attempt to solve full long-term Observation persistence now.

## 5. Runtime Design

### 5.1 Primary V2 shape

Phase 1 introduces a canon-first runtime model conceptually shaped as:

```text
ObservationBundleV2
\- scenes[]
   |- sceneId
   |- position
   |- summary
   |- boundaryReasoning
   |- evidenceContext
   |- observations[]
   \- derived
```

### 5.2 Scene

A Scene represents a coherent dream situation.

Each Scene should preserve:

- stable position/order within the dream,
- a concise scene-level summary or description,
- scene boundary reasoning,
- local evidence context,
- scene-local observations,
- scene-local derived structures,
- uncertainty notes when needed.

Scene boundaries are situational, not merely spatial.

Boundary reasoning should preserve the signals that justify segmentation, such as:

- spatial change
- temporal change
- actor change
- goal change
- narrative change
- perspective change
- world-rule change

Phase 1 does not need to claim boundary certainty.
It only needs to preserve a defensible scene-boundary rationale.

### 5.3 Observation

Each Observation exists inside a Scene.

Each Observation should preserve:

- concise descriptive text,
- position within the scene,
- evidence references kept separately from text,
- uncertainty note if needed,
- optional local salience or prominence metadata only if already reusable and bounded.

Observation text may be LLM-generated if it remains grounded and descriptive.

Observation text must not:

- interpret
- explain
- symbolize
- diagnose
- infer meaning

### 5.4 Derived Structures

Derived structures are secondary products of scene-local observations.

Minimum derived outputs for Phase 1:

- actors
- locations
- objects
- interactions
- affect
- agency
- phenomenology
- metacognition

These must be modeled explicitly as derived from scene-contained observations.

The runtime must not treat these structures as the primary organization layer.

## 6. LLM-First Extraction Design

### 6.1 Primary cognition path

Phase 1 should introduce a new LLM-first extraction path that directly requests:

- ordered scenes
- boundary reasoning for each scene after the first when applicable
- scene-contained descriptive observations
- minimal derived structures per scene
- evidence snippets for scene observations and scene-level grounding

The LLM output contract should be scene-first from the start.

It should not ask for `summary + fragments` and then reconstruct scenes later.

### 6.2 Validation posture

Existing reusable infrastructure should be applied where it strengthens V2 without distorting the model:

- evidence validation
- uncertainty handling
- semantic policy
- provenance metadata
- non-interpretive boundary enforcement

Validation should operate over scene-contained observations and their projected outputs where practical.

### 6.3 Fallback posture

Fallback is allowed only as a resilience mechanism.

Fallback should remain:

- minimal
- subordinate
- obviously lower-fidelity
- non-authoritative

Fallback should not become a second architecture.

Phase 1 fallback may create:

- one or more coarse scenes
- simple descriptive observations from source text slices
- sparse derived structures

It should avoid large deterministic ontology logic where the LLM path can do the work more directly.

## 7. Integration Strategy

### 7.1 Additive runtime only

Phase 1 adds new runtime types and cognition flow without cutting over current storage or public API contracts.

The new V2 runtime should sit beside the current V1 model.

### 7.2 V1 as projection target

Current V1 persistence and route contracts may remain temporarily, but only as a projection target from V2.

This means:

- V2 is the source runtime model.
- V1 `CreateObservationInput` is a compatibility output shape.
- Projection is a temporary bridge, not the design center.

### 7.3 Downstream boundaries

Phase 1 must not migrate:

- Glossary inputs
- Latent inputs
- Opening generation inputs
- Reflection inputs
- Dream Map inputs
- UI read models

Instead, Phase 1 should record:

- what those systems currently consume,
- why that consumption is V1-shaped,
- where future V2 cutovers will be needed.

## 8. Reuse Policy

V1 structures are presumed transitional unless clearly reusable as infrastructure.

Reuse is encouraged only where it provides architectural value without forcing fragment-first design.

Likely reusable:

- evidence primitives
- uncertainty primitives
- provenance primitives
- semantic policy enforcement
- projection utilities
- bounded salience normalization if it remains local and optional

Likely transitional:

- fragment adapters
- V1 summary trace logic
- V1 observation bundle projection

Not acceptable as V2 design drivers:

- fragment-first ordering assumptions
- fragment categories as the root organizational model
- top-level required `summary + fragments` cognition contracts

## 9. Fallout Ledger

Phase 1 creates:

- `docs/backend-v2-migration/Observation-V2-Fallout-Ledger.md`

The ledger must track:

- affected routes
- affected UI surfaces
- affected downstream layers
- known incompatibilities
- future cutover points
- future cleanup/removal candidates
- V1 structures that appear likely removable later

The ledger is documentary only in this phase.

Phase 1 must not automatically fix fallout.

## 10. Expected Code Changes

Expected additions:

- first-class V2 Scene domain types
- first-class V2 scene-contained Observation types
- scene-level derived-structure types
- scene-first discovery/extraction runtime
- scene-first projection to current V1 write shape
- tests covering scene segmentation, scene-contained observations, and compatibility projection
- fallout ledger documentation

Expected reuse:

- existing evidence and semantic-policy infrastructure where adaptable
- existing observation extraction integration patterns for OpenAI access and bounded validation

Expected preservation:

- current V1 route contracts
- current V1 repository persistence contracts
- current downstream consumption behavior

## 11. Acceptance Criteria

Phase 1 is complete when all of the following are true:

1. A new additive scene-first Observation V2 runtime exists in code.
2. Scene is modeled as a first-class concept with ordering, summary, boundary reasoning, and evidence context.
3. Observation is modeled as a first-class concept inside Scenes.
4. Minimal derived structures exist and are explicitly downstream of observations.
5. The primary cognition path is LLM-first and scene-first.
6. Deterministic fallback exists only as a minimal resilience layer.
7. V2 output can project into the current V1 persistence input shape.
8. Existing routes are not cut over.
9. The Observation V2 Fallout Ledger exists and is updated.

## 12. Testing And Validation Plan

Implementation should follow TDD at the new V2 runtime boundaries.

Minimum test areas:

- scene bundle creation
- scene ordering preservation
- boundary reasoning preservation
- scene-local observation preservation
- evidence linkage preservation
- derived-structure extraction shape
- V2 to V1 projection behavior
- fallout ledger presence/update

Required validation commands after implementation:

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Build must run via repo script so logging is preserved.

## 13. Risks

- V1 projection may encourage accidental reintroduction of fragment-first thinking.
- Existing semantic validation may assume flatter fragment units than V2 wants.
- Existing downstream systems may implicitly rely on V1 summary/fragments semantics in more places than are obvious.
- Minimal fallback may still need enough structure to avoid operational brittleness.
- LLM extraction prompt shape will strongly influence whether scene segmentation remains canon-faithful.

## 14. Open Questions For Implementation

- Should scene-level summaries be mandatory in V2 runtime, or derivable when absent?
- Should derived structures reference observation IDs directly in Phase 1, or remain scene-local lists without graph-like linkage?
- How much of current salience support is worth carrying into V2 now versus deferring?
- How should scene evidence context differ from observation-local evidence spans in the first implementation?
- How aggressively should projection compress multi-scene V2 output into the single-record V1 persistence shape?

## 15. Final Principle

Phase 1 succeeds if it establishes the real scene-first Backend V2 Observation foundation without letting transitional V1 compatibility become the architectural center.
