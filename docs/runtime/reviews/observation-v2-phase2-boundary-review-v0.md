# Observation V2 Phase 2 Boundary Review v0

Date: 2026-06-06 UTC  
Scope type: REVIEW / ARCHITECTURE / BOUNDARY VERIFICATION  
Mode: Verification only. No code changes reviewed or requested beyond this document.

## Ticket Protocol

### 1) Goal restatement

- Verify whether Observation V2 Phase 2 created a real boundary between Observation Discovery and persistence shaping.
- Identify every current `CreateObservationInput` assembly path and determine whether projection truthfully owns V1 payload creation.
- Check whether `ObservationDiscoveryResult` is discovery-oriented or still carries V1 persistence assumptions.
- Assess behavior preservation, residual risks, and readiness for Phase 3 (`Derived Summary From Discovery Output`).

### 2) Touched files

- New: `docs/runtime/reviews/observation-v2-phase2-boundary-review-v0.md`

### 3) Review steps

1. Read required redesign and planning documents:
   - `docs/runtime/planning/lumira-observation-v2-gap-analysis-v0.md`
   - `docs/runtime/planning/lumira-observation-runtime-redesign-plan-v0.md`
   - `docs/runtime/lumira-observation-runtime-target-v0.md`
   - `docs/runtime/lumira-observation-processing-model-v0.md`
   - `docs/runtime/lumira-descriptive-observation-contract-v0.md`
2. Inspect the current Observation implementation and tests:
   - `src/cognition/observation/*`
   - `src/domain/observation/*`
   - `app/api/reflective-objects/[id]/observations/route.ts`
   - `app/capture/page.tsx`
   - observation repository / adapter tests
3. Run focused Observation tests covering projection, scaffold fallback, ingress parsing, and persistence adapters.

### 4) Acceptance criteria (DoD)

- Boundary verdict is evidence-backed.
- All `CreateObservationInput` assembly paths are enumerated.
- Discovery purity is evaluated against current types and call sites.
- Behavior-preservation judgment includes concrete risk areas.
- Phase 3 readiness ends with a single explicit status.

### 5) Testing / validation plan

- Documentary and code review with source cross-checking.
- Focused test run:
  - `npm.cmd test -- src/cognition/observation/__tests__/observation-discovery.test.ts src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts src/cognition/observation/__tests__/llm-observation-extractor.test.ts src/domain/observation/__tests__/http-contract.test.ts "app/api/reflective-objects/[id]/observations/__tests__/route.test.ts" src/infrastructure/supabase/adapters/__tests__/observation-row.test.ts src/infrastructure/supabase/repositories/__tests__/observation-supabase-repository.test.ts`
- Result: 7 files passed, 43 tests passed.

### 6) Rollback plan

- Not applicable. Review-only deliverable.

---

## Required Context

The Phase 2 target in the gap analysis is explicit:

- Step 2 requires separating discovery output from bundle persistence shaping because V2 cannot emerge cleanly while extraction emits `CreateObservationInput` directly (`docs/runtime/planning/lumira-observation-v2-gap-analysis-v0.md:634-645`).
- Step 3 then expects summary to become projection logic over preserved observations (`docs/runtime/planning/lumira-observation-v2-gap-analysis-v0.md:650-659`).
- The redesign plan also states that the target model is `many descriptive observations -> one derived summary -> bundle metadata` (`docs/runtime/planning/lumira-observation-runtime-redesign-plan-v0.md:631-640`).

Phase 2 should therefore be judged narrowly:

- Was discovery separated from persistence shaping?
- Did V1 payload creation move behind projection?
- Did summary cease to be a primary upstream assumption?

---

## 1. Boundary Integrity

## Verdict

A real boundary was created, but it is incomplete.

The strongest improvement is that the cognition path now has an explicit intermediate object:

- `ObservationDiscoveryResult` exists as a distinct type in `src/cognition/observation/observation-discovery.ts:26-32`.
- Projection from discovery into V1 persistence happens in one named module: `src/cognition/observation/observation-discovery-projection.ts:131-190`.
- The main scaffold engine uses `buildDescriptiveObservationDiscoveryScaffold(...)` and only later projects into `CreateObservationInput` in `src/cognition/observation/observation-engine.ts:15-33`.
- The LLM path also converts validated structured output into discovery first, then projects: `src/cognition/observation/llm-observation-extractor.ts:228-260`, `547-566`.

That is a genuine architectural improvement over direct extraction-to-persistence shaping.

## Where persistence shaping still leaks

Persistence concerns still appear inside discovery-adjacent code in three places:

1. `buildDescriptiveObservationDiscoveryScaffold(...)` is pure on return type, but it is implemented by first constructing `CreateObservationFragmentInput[]` (`src/cognition/observation/descriptive-observation-scaffold.ts:175-187`).
   - This means discovery is still mentally modeled through V1 fragment inputs, then rewrapped into discovery observations at `213-235`.
   - The boundary exists at the API surface, but the internal construction logic still uses persistence-shaped primitives.

2. `buildObservationDiscoveryResult(...)` in the LLM extractor consumes `normalized.fragments: CreateObservationInput["fragments"]` (`src/cognition/observation/llm-observation-extractor.ts:230-234`).
   - Discovery is not being produced from a discovery-native normalized structure.
   - It is reconstructed from already V1-shaped fragments.

3. `ProjectOptions.defaultPersistence` in the projection layer carries V1 persistence metadata directly (`src/cognition/observation/observation-discovery-projection.ts:15-25`).
   - This is appropriate for projection itself.
   - But the scaffold path depends on `semanticPolicyMode: "preserve_defaults"` and injects persistence defaults from upstream (`src/cognition/observation/descriptive-observation-scaffold.ts:255-260`, `src/cognition/observation/observation-engine.ts:23-32`).
   - That keeps the old persistence contract alive as a first-class input to the transition path.

## Assessment

Phase 2 created a real module boundary, but not a fully clean conceptual boundary.

Discovery is now separated at the handoff object level.

However, discovery producers still think in terms of:

- V1 fragment shapes
- preselected summary candidates
- persistence-default metadata for scaffold mode

So the answer is:

`Observation Discovery` and `Persistence Shaping` are no longer the same step, but persistence shaping still influences how discovery is assembled.

---

## 2. CreateObservationInput Ownership

## Every current assembly path

### A. Projection layer

- `projectObservationDiscoveryResultToCreateObservationInput(...)`
  - `src/cognition/observation/observation-discovery-projection.ts:131-190`

This is the intended Phase 2 owner.

### B. Scaffold convenience wrapper

- `buildDescriptiveObservationScaffold(...)`
  - returns `CreateObservationInput`
  - `src/cognition/observation/descriptive-observation-scaffold.ts:239-260`

This uses the projection layer internally, but it still exposes a direct `CreateObservationInput` constructor API.

### C. Observation engine

- `DescriptiveObservationEngine.describe(...)`
  - returns `CreateObservationInput`
  - `src/cognition/observation/observation-engine.ts:15-33`

This also uses the projection layer internally.

### D. LLM extraction path

- `buildValidatedPayload(...)`
  - constructs discovery, then assigns `payload: CreateObservationInput`
  - `src/cognition/observation/llm-observation-extractor.ts:547-570`

Again, this uses projection.

### E. HTTP ingress path

- `parseCreateObservationInput(...)`
  - directly assembles `CreateObservationInput` from request payload
  - `src/domain/observation/http-contract.ts:170-272`
- Route uses it directly:
  - `app/api/reflective-objects/[id]/observations/route.ts:70-91`

This is a true parallel path. It bypasses discovery entirely.

### F. Ephemeral placeholder/view-model shaping

- `toEphemeralObservation(scaffold: ReturnType<typeof buildDescriptiveObservationScaffold>)`
  - consumes scaffolded `CreateObservationInput` and converts it into an in-memory `Observation`
  - `src/reflective-space/composition/get-reflective-space-viewport.ts:35-69`

This is not a durable write path, but it confirms the repo still exposes V1-shaped scaffolds directly outside the projection module.

## Ownership verdict

Projection does not yet fully own V1 payload creation.

Truthful statement:

- Projection owns V1 payload creation for the cognition-driven generation paths.

Not yet truthful:

- Projection owns all V1 payload creation.

The blocker is the manual ingress path:

- `parseCreateObservationInput(...)` still constructs `CreateObservationInput` directly from raw request payload (`src/domain/observation/http-contract.ts:256-270`).

This may be acceptable as a compatibility/API path, but it is still a parallel constructor for the persistence payload.

---

## 3. Discovery Purity

## What is discovery-oriented

`ObservationDiscoveryResult` is materially more discovery-oriented than `CreateObservationInput`.

Good signs:

- It uses `observations` rather than `fragments` (`src/cognition/observation/observation-discovery.ts:26-32`).
- Each observation has evidence with `spans[]`, which aligns better with the redesign direction than single persisted fragment evidence (`15-23`).
- It carries no semantic policy result, provenance tier, summary trace, latent guard, or boundary version.

That is a meaningful improvement.

## Remaining V1 persistence assumptions inside the type

Two fields still read as persistence-era compatibility rather than pure discovery:

### `summaryCandidate`

- `src/cognition/observation/observation-discovery.ts:30`

Why it is persistence-driven:

- The redesign explicitly expects summary to become derived downstream, not primary upstream input.
- Keeping a top-level summary candidate in discovery preserves the V1 pattern where summary is part of extraction output.
- Projection still prefers `summaryCandidate.trim()` before deriving a summary (`src/cognition/observation/observation-discovery-projection.ts:138`).

This is the clearest remaining blocker to a fully pure discovery model.

### `source`

- `src/cognition/observation/observation-discovery.ts:29`

This is less problematic than `summaryCandidate`, because source is useful provenance. But it also directly feeds persistence policy evaluation and persistence defaults.

It is acceptable in discovery, but it is not purely descriptive content.

## Other mild impurity

The discovery observation still uses persistence category enums and persistence evidence adequacy enums imported from domain types (`src/cognition/observation/observation-discovery.ts:1-5`).

That is probably acceptable for now, but it confirms discovery is not yet independent from V1 domain vocabulary.

## Purity verdict

`ObservationDiscoveryResult` is directionally correct but not fully pure.

Best description:

- discovery-oriented shape
- still carrying a V1 summary assumption
- still coupled to V1 category/evidence enums

The major persistence-driven field is `summaryCandidate`.

---

## 4. Behavioral Equivalence

## Preserved behavior

The refactor appears to preserve current runtime behavior at the main external boundaries it touched.

Evidence:

- Focused Observation tests passed: 43/43.
- Projection tests confirm preservation of category, evidence, uncertainty, summary trace, and downstream metadata expectations:
  - `src/cognition/observation/__tests__/observation-discovery.test.ts`
- HTTP ingress tests still validate manual POST behavior and semantic rejection/defer behavior:
  - `app/api/reflective-objects/[id]/observations/__tests__/route.test.ts`
  - `src/domain/observation/__tests__/http-contract.test.ts`
- Repository and adapter tests confirm the persisted V1 shape still maps as before:
  - `src/infrastructure/supabase/adapters/__tests__/observation-row.test.ts`
  - `src/infrastructure/supabase/repositories/__tests__/observation-supabase-repository.test.ts`

## Subtle behavior changes or risk areas

### 1. Scaffold summary behavior is now projection-mediated

`buildDescriptiveObservationDiscoveryScaffold(...)` emits a constant `summaryCandidate`:

- `summaryCandidate: "Descriptive orientation scaffold extracted from reflective material."`
- `src/cognition/observation/descriptive-observation-scaffold.ts:217-218`

And scaffold persistence uses `preserve_defaults`, which returns that summary unless empty:

- `src/cognition/observation/observation-discovery-projection.ts:138-160`

Risk:

- scaffold-mode summaries are still not observation-derived in practice.
- This preserves existing transitional behavior, but it is directly at odds with the intended Phase 3 direction.

### 2. Discovery-to-summary fallback changes are now centralized

Projection can rebuild summary from ordered observations if `summaryCandidate` is empty:

- `src/cognition/observation/observation-discovery-projection.ts:75-85`, `138`

This is good centralization, but it also means summary derivation logic now exists in the projection layer before Phase 3 is formally complete.

Risk:

- multiple summary behaviors coexist:
  - explicit candidate summary
  - rebuilt summary from observation text
  - scaffold fixed summary candidate
  - repaired LLM fallback summary rebuilt from surviving fragments (`src/cognition/observation/llm-observation-extractor.ts:480-505`)

The behavior is still stable, but the summary story is transitional rather than singular.

### 3. LLM discovery is reconstructed from V1-normalized fragments

The LLM path normalizes structured output into V1 fragments first, then rebuilds discovery from those fragments:

- `src/cognition/observation/llm-observation-extractor.ts:228-260`

Risk:

- behavior is preserved, but the path still depends on fragment-shaped normalization assumptions.
- This makes Phase 3 and later native multi-observation work more brittle than it needs to be.

### 4. Manual POST remains a non-discovery write path

The route still allows direct user/API construction of `CreateObservationInput` through parsing and semantic policy:

- `app/api/reflective-objects/[id]/observations/route.ts:54-93`
- `src/domain/observation/http-contract.ts:170-272`

Risk:

- runtime behavior is preserved for current APIs.
- but architectural equivalence is broader than cognition equivalence; the system still has two write philosophies:
  - discovery -> projection -> persistence
  - request payload -> parse -> persistence

## Equivalence verdict

Behavior looks preserved for the implemented Phase 2 paths.

I do not see evidence of a major runtime regression.

The risks are architectural and transitional, not obvious correctness breaks.

---

## 5. Phase 3 Readiness

## Can the codebase proceed safely to `Derived Summary From Discovery Output`?

Yes, but not as a completely clean next step.

## What is already ready

- Discovery now exists as a named intermediate boundary.
- Projection is centralized enough to be the natural place for derived summary logic.
- Both scaffold and LLM cognition paths already pass through that projection layer.

This means the codebase can proceed to Phase 3 without reopening the entire Phase 2 split.

## Remaining blockers / cleanup needs

### Blocker 1: `summaryCandidate` still holds the old ownership model

- `src/cognition/observation/observation-discovery.ts:30`
- `src/cognition/observation/observation-discovery-projection.ts:138`

Why it matters:

- As long as discovery owns a top-level summary field, Phase 3 cannot honestly claim that summary is downstream-derived.
- The code already supports derivation fallback, but candidate-summary precedence keeps the old contract semantically in control.

### Blocker 2: discovery producers still build from V1 fragment-shaped inputs

- scaffold path: `src/cognition/observation/descriptive-observation-scaffold.ts:175-187`
- LLM path: `src/cognition/observation/llm-observation-extractor.ts:230-258`

Why it matters:

- Phase 3 can derive summary from discovery output, but later Phase 4 native multi-observation support will still be constrained if discovery continues to be built out of fragment-era helper shapes.

### Blocker 3: direct HTTP `CreateObservationInput` assembly remains parallel

- `src/domain/observation/http-contract.ts:170-272`
- `app/api/reflective-objects/[id]/observations/route.ts:76-91`

Why it matters:

- This does not block derived summary for the cognition pipeline.
- It does block any stronger claim that the codebase has one canonical observation-write model.

## Readiness verdict

The codebase is ready to proceed to Phase 3, but only with minor cleanup expectations kept explicit.

Phase 3 does not require undoing Phase 2.

It does require treating the following as active transition debt:

- `summaryCandidate` precedence
- fragment-shaped discovery producers
- manual ingress bypass of discovery

---

## Strengths

- A genuine intermediate `ObservationDiscoveryResult` boundary now exists.
- Projection into the V1 persistence contract is centralized in one module.
- Both scaffold and LLM generation paths use the new projection boundary.
- The projection layer already contains the natural Phase 3 home for summary derivation.
- Focused tests show current external behavior remains stable across route, projection, repository, and adapter boundaries.

## Weaknesses

- Discovery producers still internally construct V1 fragment-shaped data before wrapping it as discovery.
- `ObservationDiscoveryResult.summaryCandidate` preserves a V1-era summary-first assumption.
- `buildDescriptiveObservationScaffold(...)` and `parseCreateObservationInput(...)` keep parallel `CreateObservationInput` assembly surfaces alive.
- Manual POST creation remains outside the discovery boundary entirely.

## Architectural Risks

- Summary ownership is still ambiguous because candidate summary, rebuilt summary, and scaffold fixed summary all coexist.
- Later native multi-observation support will be harder if discovery continues to originate from fragment-era helper shapes.
- API-level direct V1 payload construction may preserve a long-lived alternate write model unless intentionally treated as compatibility-only.

## Readiness Assessment

Phase 2 succeeded at creating a meaningful boundary module and a real intermediate discovery object.

It did not fully remove V1 persistence assumptions from discovery, and it did not fully centralize all `CreateObservationInput` creation behind projection.

That leaves the implementation in a good transitional state, not an end-state-clean one.

READY WITH MINOR CLEANUP
