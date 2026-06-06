# Lumira Observation V2 Gap Analysis v0

## Status

Planning document only.

This document compares:

- the current live Observation runtime
- the Observation V2 target runtime described in the redesign documents

It focuses on implementation readiness.

It does not propose code changes.
It does not implement the redesign.
It does not redefine the philosophy layer.

---

## Scope

Required documents read:

- `docs/runtime/lumira-observation-extraction-principle-v0.md`
- `docs/runtime/lumira-descriptive-observation-contract-v0.md`
- `docs/runtime/lumira-observation-runtime-target-v0.md`
- `docs/runtime/lumira-observation-processing-model-v0.md`
- `docs/runtime/lumira-observation-salience-model-v0.md`
- `docs/runtime/research/lumira-observation-benchmark-v0.md`
- `docs/runtime/research/observation-preservation-audit-v0.md`
- `docs/runtime/planning/lumira-observation-runtime-redesign-plan-v0.md`

Live runtime inspected:

- `app/capture/page.tsx`
- `src/cognition/observation/observation-engine.ts`
- `src/cognition/observation/llm-observation-extractor.ts`
- `src/cognition/observation/observation-extraction-validation.ts`
- `src/cognition/observation/descriptive-observation-scaffold.ts`
- `src/domain/observation/types.ts`
- `src/domain/observation/http-contract.ts`
- `src/domain/observation/semantic-policy.ts`
- `src/infrastructure/supabase/adapters/observation-row.ts`
- `src/infrastructure/supabase/repositories/observation-supabase-repository.ts`
- `app/api/reflective-objects/[id]/observations/route.ts`
- `src/cognition/glossary/extract-glossary-candidates-from-observations.ts`
- `src/cognition/latent/latent-engine.ts`
- `src/ui/reflective-space/reflective-space-workspace.tsx`

Note:

- The ticket names an Observation Salience Model without version.
- The live repo contains `docs/runtime/lumira-observation-salience-model-v0.md`.
- `lumira-observation-salience-model-v1.md` is not present in the repository at the time of this analysis on June 6, 2026.

---

## Ticket Framing

### Goal

- identify what the current runtime already has that V2 can reuse
- identify what V2 concepts are still missing
- identify which concepts exist only in partial or legacy form
- order the work by safe implementation dependency
- identify concepts that should remain conceptual for now

### Touched Files

- New: `docs/runtime/planning/lumira-observation-v2-gap-analysis-v0.md`

### Acceptance Criteria

- The live runtime is compared directly to the V2 target.
- The answer is organized around implementation readiness, not philosophy.
- Existing, missing, and partial concepts are separated clearly.
- A dependency-ordered roadmap is provided without implementation.

### Validation Plan

- Check every claim against the live code boundaries listed above.
- Keep the analysis aligned with the runtime target, processing model, salience model, benchmark, audit, and redesign plan.

### Rollback Plan

- Not applicable.
- This ticket creates planning documentation only.

---

## Executive Summary

The current runtime is not Observation V2, but it is not a blank slate either.

What already exists is a strong V1.5 substrate:

- evidence-linked fragments
- broad category coverage
- uncertainty handling
- provenance and semantic-policy metadata
- a durable bundle container
- downstream consumers already built around descriptive observation material

The central V2 gap is structural:

- the live runtime persists `Observation = summary + fragments`
- V2 requires `Observation Bundle = descriptive observations + derived summary + metadata`

The second major V2 gap is processing separation:

- the live runtime has extraction, validation, policy, and downstream latent weighting
- V2 expects explicit stages for Observation Discovery and Observation Salience before Latent

The third major gap is multiplicity:

- the live runtime can carry many fragments
- it does not model many first-class descriptive observations from shared evidence

Implementation readiness is therefore moderate:

- many supporting primitives already exist
- the primary missing work is runtime model refactoring, not greenfield invention

---

## 1. What Already Exists?

## 1.1 Observation Bundle Container

Exists: Yes

Live form:

- one persisted `Observation` record per extraction run
- one summary
- many fragments

Evidence:

- `src/domain/observation/types.ts`
- `src/infrastructure/supabase/repositories/observation-supabase-repository.ts`
- `src/infrastructure/supabase/adapters/observation-row.ts`

Closeness to V2:

- medium

Why:

- V2 still wants one bundle per dream
- the durable container already exists
- the internal organizing unit is still wrong for V2

Conclusion:

- the outer container can remain
- the interior model needs redesign

## 1.2 Evidence

Exists: Yes

Live form:

- each fragment has evidence snippet, optional span start/end, context label, and evidence adequacy
- evidence validation against source text already exists
- repair logic already exists

Evidence:

- `src/domain/observation/types.ts`
- `src/cognition/observation/observation-extraction-validation.ts`
- `src/cognition/observation/llm-observation-extractor.ts`
- `src/domain/observation/semantic-policy.ts`

Closeness to V2:

- high

Why:

- V2 requires evidence-linked descriptive observations
- the runtime already has strong evidence primitives
- the main mismatch is that evidence is attached to fragments rather than first-class observations

Conclusion:

- evidence is one of the most reusable V2-ready primitives

## 1.3 Categories

Exists: Yes

Live form:

- runtime enum of observation categories
- phenomenology and continuity categories already present
- downstream consumers weight and filter by category

Evidence:

- `src/domain/observation/types.ts`
- `src/domain/observation/semantic-policy.ts`
- `src/cognition/latent/latent-engine.ts`
- `src/cognition/glossary/extract-glossary-candidates-from-observations.ts`

Closeness to V2:

- high

Why:

- V2 keeps categories as organizational dimensions
- the current category vocabulary already spans structure, relations, phenomenology, and continuity
- the gap is not category absence, but category overloading as the fragment unit selector

Conclusion:

- categories can carry forward
- their runtime role must narrow from extraction unit to organization/indexing dimension

## 1.4 Uncertainty

Exists: Yes

Live form:

- observation-level `uncertaintyNotes`
- fragment-level `uncertaintyNote`
- semantic policy can degrade to `accept_with_uncertainty`
- weak evidence classification exists

Evidence:

- `src/domain/observation/types.ts`
- `src/domain/observation/semantic-policy.ts`
- `src/cognition/observation/llm-observation-extractor.ts`

Closeness to V2:

- high

Why:

- V2 needs graceful preservation without overstating weak observations
- the live runtime already supports uncertainty as a preserved state

Conclusion:

- uncertainty handling is already a strong V2-aligned primitive

## 1.5 Provenance

Exists: Yes

Live form:

- source
- provenance tier
- semantic policy result
- semantic policy reasons
- boundary version
- latent backflow guard
- status

Evidence:

- `src/domain/observation/types.ts`
- `src/domain/observation/http-contract.ts`
- `src/domain/observation/semantic-policy.ts`

Closeness to V2:

- high

Why:

- V2 explicitly retains bundle-level metadata
- the live runtime already has most of the needed metadata concepts

Conclusion:

- provenance and boundary metadata are largely V2-ready at bundle level

## 1.6 Summary

Exists: Yes

Live form:

- required top-level `summary`
- summary trace exists and is validated
- semantic policy requires summary grounding
- UI and downstream systems display or tokenize summary

Evidence:

- `src/domain/observation/types.ts`
- `src/domain/observation/http-contract.ts`
- `src/domain/observation/semantic-policy.ts`
- `src/ui/reflective-space/reflective-space-workspace.tsx`

Closeness to V2:

- low to medium

Why:

- V2 keeps summary
- but V2 requires summary to be derived and secondary
- the live runtime still treats summary as required primary payload

Conclusion:

- summary exists, but in the wrong architectural position

## 1.7 Fragments

Exists: Yes

Live form:

- fragments are the main durable sub-unit
- each fragment has text, one category, evidence, position, and uncertainty

Evidence:

- `src/domain/observation/types.ts`
- `src/infrastructure/supabase/adapters/observation-row.ts`

Closeness to V2:

- medium

Why:

- fragments already contain many fields a V2 descriptive observation would need
- but fragments are subordinate to summary and constrained to the old one-fragment/one-category bundle logic

Conclusion:

- fragments are the clearest precursor to V2 descriptive observations
- they are not yet the same thing

## 1.8 Preservation-Oriented Validation

Exists: Yes

Live form:

- evidence normalization
- category alias normalization
- evidence failure diagnostics
- LLM repair pass
- semantic policy protection against interpretation

Evidence:

- `src/cognition/observation/observation-extraction-validation.ts`
- `src/cognition/observation/llm-observation-extractor.ts`
- `src/domain/observation/semantic-policy.ts`

Closeness to V2:

- medium to high

Why:

- V2 still needs safety, evidence, and non-interpretive enforcement
- the current logic is useful but still tuned for `summary + fragments`

Conclusion:

- the guardrail machinery is reusable
- its target unit needs to shift from fragment bundle to descriptive observation set

---

## 2. What Is Missing?

## 2.1 First-Class `DescriptiveObservation`

Missing: Yes

Current gap:

- there is no runtime type representing one bounded descriptive observation as the primary durable unit
- the closest live sub-unit is `ObservationFragment`

Why this matters:

- V2 requires observation-first durability
- the live system still persists bundle-first with fragment subordinates

## 2.2 Explicit Observation Discovery Stage

Missing: Yes

Current gap:

- there is extraction logic
- but there is no explicit stage or contract named and modeled as `Observation Discovery`
- the live extraction outputs a bundle payload directly

Why this matters:

- the processing model separates discovery from salience and latent
- the current runtime collapses discovery and persistence shaping into one step

## 2.3 Explicit Observation Salience Stage

Missing: Yes

Current gap:

- there is no observation-level salience profile or salience pass between observation extraction and latent formation
- the only meaningful weighting happens inside latent logic

Evidence of absence:

- no observation salience type in `src/domain/observation/types.ts`
- no salience computation in `src/cognition/observation/*`
- latent computes its own category and prominence weights directly in `src/cognition/latent/latent-engine.ts`

Why this matters:

- V2 processing model expects:
  - Observation Discovery
  - Observation Salience
  - Latent Formation

## 2.4 Multi-Observation Support As A Native Runtime Concept

Missing: Yes

Current gap:

- one span can only become many outputs indirectly by duplicating fragments
- there is no explicit model for one evidence span supporting many first-class observations

Why this matters:

- V2 requires multi-observation preservation as a native property
- current multiplicity is accidental, not modeled

## 2.5 Derived Summary As A Real Runtime Rule

Missing: Yes

Current gap:

- summary is always required on input
- summary is not generated from a first-class observation set
- summary absence is treated as invalid rather than derivable

Why this matters:

- V2 requires summary to be a secondary artifact

## 2.6 Observation Role Layer

Missing: Mostly

Current gap:

- the category role map exists in docs
- no runtime field or explicit derived layer distinguishes structure, relation, phenomenology, and continuity at observation level

Why this matters:

- V2 bundle design in the redesign plan assumes categories remain flat but roles become conceptually useful runtime organization

## 2.7 Observation-Level Reuse Surface

Missing: Yes

Current gap:

- downstream consumers still consume bundle fragments
- glossary, latent, and UI do not operate on a first-class observation collection

Why this matters:

- V2 expects direct reuse of descriptive observations without reconstructing them from summary-centered bundles

---

## 3. What Is Partially Implemented?

## 3.1 `ObservationFragment` As Proto-Observation

Partially implemented: Yes

Why:

- fragments already have text, category, evidence, position, and uncertainty
- that is close to the target descriptive observation shape

What is still missing:

- first-class identity as the primary durable unit
- independence from summary-first bundle logic
- explicit observation semantics rather than fragment semantics

## 3.2 Summary Trace As Proto-Derivation Support

Partially implemented: Yes

Why:

- `summaryTrace` already links summary text to fragment positions
- semantic policy already verifies trace coherence

What is still missing:

- summary is not actually downstream-derived from first-class observations
- trace is still built to defend a required summary, not to document a derived one

## 3.3 Phenomenology Support

Partially implemented: Yes

Why:

- phenomenological categories exist
- prompt instructions explicitly privilege several phenomenology categories
- semantic policy has cue checks for them
- latent already weights phenomenology heavily

What is still missing:

- first-class observation preservation across shared evidence
- robust capture of subtle phenomenology without weak-evidence loss
- equal footing in the runtime model, not just in the vocabulary

## 3.4 Continuity Candidate Preservation

Partially implemented: Yes

Why:

- `recurrence_candidate` and `continuity_fragment` exist
- semantic policy hardens recurrence language
- latent consumes recurrence-oriented material

What is still missing:

- continuity remains fragment-based
- continuity salience is not separated from latent pattern scoring
- weak continuity cues are still fragile under the current persistence rules

## 3.5 Observation Salience In Displaced Form

Partially implemented: Indirectly

Why:

- the latent engine already computes weights that look like salience substitutes:
  - category weighting
  - evidence weighting
  - uncertainty penalties
  - recurrence amplification
  - phenomenology scoring

Evidence:

- `src/cognition/latent/latent-engine.ts`

What is still missing:

- observation-level salience remains implicit and entangled inside latent formation
- no explicit `SalientObservation[]` output exists
- weighting is category-and-fragment-centric rather than observation-centric

## 3.6 Bundle Metadata

Partially implemented: Yes

Why:

- source, provenance, policy result, reasons, uncertainty, status, and boundary version already exist

What is still missing:

- a cleaner split between:
  - bundle metadata
  - observation-level properties
- the live runtime still mixes target-ready bundle metadata with legacy payload structure

## 3.7 UI Readiness For Observation-First Display

Partially implemented: Weakly

Why:

- the UI already has an Observation Orientation surface
- it already displays summary and descriptive items

Evidence:

- `src/ui/reflective-space/reflective-space-workspace.tsx`

What is still missing:

- direct display model for first-class descriptive observations
- observation grouping without fragment semantics
- understanding of derived summary versus primary observation field

---

## 4. What Can Be Implemented First?

This roadmap is dependency-ordered and aims for the smallest safe first step.

## Step 1: Introduce A V2 Analysis/Mapping Layer Without Changing Persistence

Why first:

- lowest-risk step
- can be additive
- allows the codebase to name V2 concepts explicitly

Typical scope:

- define internal V2 observation vocabulary and mapping rules
- map current fragments to proto-observations in a non-breaking adapter layer

Reason this is the smallest safe step:

- no schema change required
- no API change required
- gives later phases a stable target surface

## Step 2: Separate Observation Discovery Output From Bundle Persistence Shaping

Why second:

- V2 cannot emerge cleanly while extraction emits `CreateObservationInput` directly
- this is the key pipeline separation required by the processing model

Typical scope:

- discovery stage yields an observation-set-like intermediate result
- bundle shaping remains a later step

Dependency:

- benefits from Step 1 naming and mapping layer

## Step 3: Make Summary Derivable From Discovery Output

Why third:

- once discovery is separated, summary can become downstream-derived instead of primary input

Typical scope:

- summary becomes projection logic over a preserved observation set

Dependency:

- requires Step 2

## Step 4: Add Native Multi-Observation Support In The Intermediate Runtime Model

Why fourth:

- V2 observation multiplicity is easier once discovery output is no longer hardwired to fragments

Typical scope:

- one evidence span may yield many observation objects in the intermediate model

Dependency:

- requires Step 2
- strengthened by Step 3 because summary is no longer the limiting top-level object

## Step 5: Introduce Explicit Observation Salience As A Separate Stage

Why fifth:

- V2 salience should come after preservation is structurally safe
- salience should not be introduced while the runtime is still bundle-fragment constrained

Typical scope:

- compute salience over preserved observations
- keep it separate from latent formation

Dependency:

- requires first-class or adapter-level observation sets

## Step 6: Move Downstream Consumers From Fragment-Centric To Observation-Centric Consumption

Why sixth:

- glossary, latent, and UI should migrate after the new observation surface exists

Affected areas:

- glossary candidate extraction
- latent formation input
- observation UI

Dependency:

- requires Steps 1 through 5 in at least minimal form

## Step 7: Redesign Persistence And API Contracts Around The V2 Runtime Shape

Why seventh:

- this is the most invasive step
- it should come after the runtime concepts are stable in code

Dependency:

- all earlier steps

---

## 5. What Should NOT Be Implemented Yet?

## 5.1 Full Observation Salience Sophistication

Do not implement yet:

- complex salience profiles
- fine-grained salience dimensions in persistence or API
- advanced salience ranking systems

Reason:

- the salience model itself says preservation and multiplicity should come first
- current runtime still lacks observation-first durability

## 5.2 Full Persistence Rewrite

Do not implement yet:

- schema-first conversion to V2
- hard cutover from fragments to observations everywhere

Reason:

- persistence is not the first dependency
- V2 concepts should stabilize above the storage layer first

## 5.3 UI-Heavy V2 Observation Presentation

Do not implement yet:

- major observation UI redesign
- salience visualizations
- observation grouping interfaces built on unstable concepts

Reason:

- the UI should follow a stabilized runtime model, not define it prematurely

## 5.4 Rich Continuity Or Reflection Logic Based On V2 Assumptions

Do not implement yet:

- new continuity heuristics assuming first-class observations
- reflection behavior that depends on future salience layers

Reason:

- current downstream systems still consume fragment-era data structures
- premature downstream redesign would deepen coupling to transitional shapes

## 5.5 Category Vocabulary Expansion

Do not implement yet:

- adding many new categories
- ontology growth to compensate for structural gaps

Reason:

- the main problem is not category coverage
- the main problem is runtime unit shape and processing separation

## 5.6 High-Complexity Multi-Span Evidence Modeling

Do not implement yet:

- sophisticated evidence graphs
- complex cross-passage support structures

Reason:

- current evidence primitives are already strong enough for a first V2 step
- the first need is observation-first modeling, not evidence overengineering

---

## Final Assessment

Observation V2 is implementation-reachable from the current codebase, but not by small prompt tuning or category additions.

The live runtime already has strong primitives for:

- evidence
- category vocabulary
- uncertainty
- provenance
- descriptive safety
- bundle persistence

The missing pieces are structural and sequencing-related:

- first-class descriptive observations
- explicit Observation Discovery stage
- explicit Observation Salience stage
- native multi-observation support
- truly derived summary

The safest path is not:

- rewrite persistence first
- add salience sophistication first
- expand categories first

The safest path is:

1. name and map V2 concepts inside the runtime
2. separate discovery from bundle shaping
3. make summary derivable
4. add native observation multiplicity
5. add explicit salience
6. migrate downstream consumers
7. only then redesign durable contracts fully

That is the implementation-readiness gap in its simplest form:

- the current runtime already has many V2 ingredients
- but it still assembles them inside a V1 bundle model
- V2 requires those same ingredients to be reorganized around the descriptive observation as the primary durable unit
