# Observation V2 Salience Strategy Scout v0

Date: 2026-06-06 UTC
Scope: Scout only. No runtime changes.

## Ticket Protocol

### Goal

- map the current Observation runtime from capture through persistence
- assess where Observation Salience can be introduced with the least runtime and architectural risk
- compare deterministic, inline-LLM, separate-pass LLM, and hybrid strategies against current repo reality
- recommend the smallest safe Phase 5 build

### Touched Files

- new: `docs/runtime/planning/observation-v2-salience-strategy-scout-v0.md`
- reviewed docs:
  - `docs/runtime/lumira-observation-salience-model-v0.md`
  - `docs/runtime/lumira-observation-processing-model-v0.md`
  - `docs/runtime/lumira-descriptive-observation-contract-v0.md`
  - `docs/runtime/planning/lumira-observation-v2-gap-analysis-v0.md`
  - `docs/runtime/reviews/observation-v2-phase4-multiplicity-review-v0.md`
- reviewed runtime:
  - `app/capture/page.tsx`
  - `app/api/reflective-objects/[id]/observations/route.ts`
  - `src/cognition/observation/descriptive-observation-scaffold.ts`
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/observation-extraction-validation.ts`
  - `src/cognition/observation/observation-discovery.ts`
  - `src/cognition/observation/observation-discovery-projection.ts`
  - `src/domain/observation/types.ts`
  - `src/domain/observation/v2.ts`
  - `src/domain/observation/semantic-policy.ts`
  - `src/cognition/latent/latent-engine.ts`
  - `src/cognition/glossary/extract-glossary-candidates-from-observations.ts`
  - `src/infrastructure/supabase/adapters/observation-row.ts`
  - `src/infrastructure/supabase/repositories/observation-supabase-repository.ts`

### Acceptance Criteria

- current Observation pipeline is mapped against the live codebase
- each salience placement option is evaluated against cost, latency, complexity, and failure modes
- recommendation is explicit about LLM placement
- smallest safe Phase 5 build is outlined without implementation

### Validation Plan

- ground all claims in the reviewed docs and runtime boundaries above
- keep the analysis implementation-facing, not speculative philosophy only

### Rollback Plan

- not applicable
- documentation-only ticket

---

## Executive Summary

The best Phase 5 direction is:

`Option D, but specifically inline hybrid`

- let the existing extraction call propose salience per discovered observation
- normalize and validate that salience deterministically after discovery is built
- do not add a second mandatory LLM call
- do not change V1 persistence yet

Why:

- current capture already pays for one extraction LLM call and sometimes a second repair call
- a separate salience pass would turn salience into a guaranteed second provider hop on the hot path
- a purely deterministic scorer would be cheap, but it would mostly restate category heuristics and latent weighting rather than capture dream-local prominence
- informal Hungarian dream text is exactly where anomaly, emotional intensity, agency tension, and metacognitive presence are often easiest for the model to infer from the full text and hardest to recover later from simple heuristics

The smallest safe Phase 5 build is therefore:

1. add an internal observation-level salience profile type in the discovery/V2 layer
2. extend the existing extraction schema so each extracted observation may include a salience proposal
3. normalize that proposal deterministically after validation and discovery assembly
4. produce a coarse deterministic fallback salience profile for scaffold mode
5. keep projection and durable V1 persistence unchanged for now

---

## 1. Current Runtime Cost Shape

## 1.1 Live Observation Path

Current hot path at capture:

1. `app/capture/page.tsx` creates the reflective object.
2. It calls `buildLlmObservationExtraction(...)`.
3. If LLM extraction validates, the result is projected into `CreateObservationInput`.
4. If LLM extraction falls back, scaffold output is used instead.
5. `createObservationRepository().create(...)` persists one observation row plus fragment rows.
6. The repository reloads the created observation.

Important note:

- the page also calls title generation before observation persistence
- that is another LLM call, but it is not part of the Observation pipeline itself

## 1.2 Where LLM Work Happens Today

Current Observation extraction already has two possible provider calls:

- main extraction call: always attempted on the capture path
  - `src/cognition/observation/llm-observation-extractor.ts`
  - model: `gpt-4.1-mini`
  - timeout: `25_000ms`
- repair call: only attempted when evidence validation fails for one or more fragments

So the steady-state path today is:

- `1` LLM call when extraction succeeds cleanly
- `2` LLM calls when extraction succeeds structurally but needs evidence repair
- `0` LLM calls only after the initial extractor already failed and the runtime falls back to scaffold

## 1.3 Validation And Repair Shape

Current validation is not cheap in architecture terms, but it is local compute only:

- structured extraction must include summary plus fragments
- evidence snippets are checked against the source dream text
- valid snippets get span offsets where possible
- failing evidence triggers a targeted repair pass

This matters for salience because:

- any salience strategy that needs its own validation layer increases complexity again
- current validators are built around evidence-bearing fragments, not salience profiles

## 1.4 Discovery, Projection, And Persistence Shape

After validation:

- fragments are converted into discovery observations
- discovery deduplicates shared evidence spans
- summary is rebuilt from discovery observations
- projection converts discovery back into the V1 persistence shape
- repository persists:
  - one observation row
  - many fragment rows
  - one follow-up read to reload the completed observation

This means:

- discovery, projection, and persistence are not the expensive places for salience in provider-cost terms
- any extra LLM salience work would add cost before projection, not after persistence

## 1.5 Where Extra Salience Work Would Add Cost

### If added inside the existing extraction call

- no extra network round-trip
- larger prompt/output payload
- more JSON schema surface
- more local normalization work

### If added as a separate pass after discovery

- guaranteed extra provider round-trip on the hot path
- duplicated dream-text or observation-context input tokens
- another timeout/failure boundary
- another fallback decision

### If deterministic only

- no extra provider cost
- negligible latency relative to the current LLM path
- highest risk is quality, not runtime

---

## 2. Current Pipeline Summary

The current Observation V2-compatible path is already structurally split enough to host salience:

### Capture

- capture submits raw dream text through `app/capture/page.tsx`
- LLM extraction is attempted first
- scaffold remains the fallback

### LLM Extraction

- output is still `summary + fragments[]` shaped
- the model is not yet discovery-native
- evidence is carried fragment-by-fragment

### Validation

- category normalization and evidence validation happen before durable use
- unsupported evidence does not immediately get persisted

### Repair

- only evidence repair is modeled today
- repair can replace evidence, downgrade uncertainty, or drop fragments

### Discovery

- the runtime now has real shared evidence spans and many observations per shared span
- this is the correct structural place for salience to attach

### Projection

- discovery is projected back to `CreateObservationInput`
- summary is derived from ordered discovery observations
- projection currently selects one primary evidence span per persisted fragment

### Persistence

- repository persists legacy V1 observation container plus fragments
- no salience field exists in the durable write shape yet

### Downstream Consumption

- latent already computes salience-like weights from category, evidence, uncertainty, recurrence, and summary trace
- glossary uses simple category gating and recurrence count
- V2-like adapters already exist for projecting observations into an observation-first view

---

## 3. Option Comparison

## Option A - Deterministic Salience After Discovery

### Pros

- no extra provider cost
- no extra provider latency
- available on both validated-LLM and scaffold fallback paths
- easy to test and benchmark locally
- easiest to keep separate from observation discovery conceptually

### Cons

- likely to collapse into category heuristics plus evidence heuristics
- duplicates some weighting logic that latent already performs later
- weak at dream-local prominence when the signal is phrased indirectly
- especially weak for subtle emotional intensity and metacognitive nuance in informal Hungarian text

### Runtime Risk

- latency impact: low
- token/cost impact: none
- implementation complexity: low to medium
- main failure mode: false precision from shallow rules

### Quality Risk

- anomaly: moderate
- emotional intensity: high
- agency tension: moderate
- recurrence potential: low to moderate
- metacognitive presence: moderate

### Compatibility

- V1 projection: high
- future latent/glossary/UI: medium

Reason:

- it is safe structurally
- but later systems would inherit a weaker salience signal that often just mirrors category choice

## Option B - Salience Included In Existing LLM Extraction Output

### Pros

- no second provider round-trip
- model sees full dream text while extracting observations
- best chance of capturing dream-local prominence in one pass
- strongest fit for anomaly, emotional intensity, and metacognitive presence

### Cons

- extraction prompt/schema becomes more complex
- discovery and salience responsibilities become easier to blur
- salience has no existing validator equivalent to evidence validation
- bad salience output could contaminate otherwise valid extraction output if not isolated carefully

### Runtime Risk

- latency impact: low to medium
- token/cost impact: low to medium
- implementation complexity: medium
- main failure mode: oversized schema and entangled extraction failure surface

### Quality Risk

- anomaly: low
- emotional intensity: low to moderate
- agency tension: low to moderate
- recurrence potential: moderate
- metacognitive presence: low

### Compatibility

- V1 projection: medium to high if salience stays internal
- future latent/glossary/UI: high

Reason:

- the current write shape has nowhere durable to store salience yet
- but internal observation-first use is straightforward

## Option C - Separate LLM Salience Pass After Discovery

### Pros

- cleanest conceptual separation from discovery
- salience prompt can operate on already-preserved observations rather than fragment-shaped extraction output
- easiest to make optional later

### Cons

- guaranteed second provider call in the success path
- duplicates context across provider requests
- increases failure and timeout surface substantially
- requires designing fallback semantics when extraction succeeded but salience failed

### Runtime Risk

- latency impact: high
- token/cost impact: high
- implementation complexity: medium to high
- main failure mode: success path fragmentation, where discovery succeeds but salience is missing or delayed

### Quality Risk

- anomaly: low
- emotional intensity: low to moderate
- agency tension: low to moderate
- recurrence potential: moderate
- metacognitive presence: low

### Compatibility

- V1 projection: medium to high if salience stays internal
- future latent/glossary/UI: high

Reason:

- conceptually clean, operationally expensive

## Option D - Hybrid LLM Proposal Plus Deterministic Validation/Normalization

### Pros

- keeps the model where nuance matters
- keeps code in charge of bounds, enums, defaults, and fallback behavior
- supports both strong-path LLM output and scaffold fallback
- reduces risk of salience becoming an opaque provider-only artifact

### Cons

- more implementation work than pure deterministic or pure inline-LLM
- requires careful separation between:
  - observation validity
  - salience validity
- can still drift if normalization is too weak

### Runtime Risk

- latency impact:
  - low to medium if hybrid is inline
  - high if hybrid uses a separate salience pass
- token/cost impact:
  - low to medium if inline
  - high if separate pass
- implementation complexity: medium
- main failure mode: normalization too permissive or too flattening

### Quality Risk

- anomaly: low
- emotional intensity: low to moderate
- agency tension: low
- recurrence potential: low to moderate
- metacognitive presence: low

### Compatibility

- V1 projection: high if salience remains internal in Phase 5
- future latent/glossary/UI: highest

Reason:

- this is the only option that balances nuance with runtime discipline

---

## 4. Runtime Risk By Option

## 4.1 Latency

Relative to the current path:

- Option A: near-zero added latency
- Option B: small added latency from larger generation payload and local normalization
- Option C: largest added latency because it adds a second mandatory provider step
- Option D:
  - inline hybrid: close to Option B
  - separate-pass hybrid: close to Option C

## 4.2 Token And Cost

Relative to the current path:

- Option A: no provider cost increase
- Option B: modest increase from larger schema and output
- Option C: clear increase because it duplicates model context in a second call
- Option D:
  - inline hybrid: modest increase
  - separate-pass hybrid: clear increase

## 4.3 Implementation Complexity

- Option A: simplest
- Option B: moderate
- Option C: moderate to high because of orchestration and fallback branching
- Option D: moderate, but cleaner than Option C if done inline

## 4.4 Failure Modes

### Option A

- salience becomes shallow category math
- future users read precision into a score that is not actually nuanced

### Option B

- salience schema problems interfere with otherwise valid extraction
- prompt drift causes overconfident prominence claims

### Option C

- extraction succeeds but salience times out
- repeated provider failures degrade the user path even though observations are already available
- product starts depending on optional second-hop quality

### Option D

- normalization may be too weak and accept noisy model salience
- or too strong and collapse useful distinctions back to generic defaults

---

## 5. Quality Risk For Informal Hungarian Dream Text

This is the decisive factor.

## 5.1 Why Deterministic-Only Is Weak Here

The current scaffold and many category heuristics remain strongly English-lexical. The Phase 4 multiplicity review already identified the scaffold as narrow and at real risk of weak categorization on informal Hungarian text.

That matters for salience because:

- anomaly is not always a category keyword problem
- emotional intensity is often implicit in phrasing, escalation, or compression
- agency tension can be expressed through informal verb forms rather than explicit cue words
- metacognitive presence can appear as subtle awareness, not explicit "lucid" wording

A deterministic scorer built mainly from current category or cue logic would therefore underrate the exact dimensions Phase 5 cares about most.

## 5.2 Why Inline LLM Sees Better Signals

The extraction model already reads the whole dream text while forming observations. At that moment it has access to:

- surrounding context
- local contrast
- tone shifts
- action blockage or pursuit pressure
- dream-specific weirdness that does not fit a single category keyword

That makes it better than a downstream heuristic for:

- anomaly
- emotional intensity
- agency tension
- metacognitive presence

## 5.3 Where Deterministic Logic Still Helps

Deterministic logic is still valuable for:

- schema validation
- allowed salience bands
- fallback defaults
- enforcing profile shape instead of one global rank
- coarse recurrence support from explicit repetition and continuity cues
- making scaffold fallback usable without another provider call

## 5.4 Dimension-Level Estimate

Best likely performer by dimension:

- anomaly: inline LLM or inline hybrid
- emotional intensity: inline LLM or inline hybrid
- agency tension: inline hybrid
- recurrence potential: hybrid, because model context plus deterministic recurrence cues is stronger than either alone
- metacognitive presence: inline LLM or inline hybrid

Overall for informal Hungarian dream text:

- strongest: Option D inline hybrid
- next best: Option B inline LLM
- usable but weaker: Option A deterministic
- high-quality but too expensive for default runtime: Option C separate pass

---

## 6. V1 Projection And Future Compatibility

## 6.1 V1 Projection Compatibility

All four options can be made V1-compatible only if Phase 5 keeps salience out of the current durable `CreateObservationInput` write shape.

Why:

- current observation rows and fragment rows do not contain salience fields
- projection is explicitly a V1 bridge
- adding salience directly to persistence now would mix Phase 5 strategy work with a larger contract rewrite

So the safe Phase 5 rule is:

- salience lives in discovery/V2-like internal structures only
- V1 projection ignores it for now

## 6.2 Future Latent Compatibility

Salience should eventually feed latent as observation-level prominence input, but it must not simply duplicate current latent category weighting.

Current latent already scores:

- category weights
- evidence adequacy
- semantic policy confidence
- recurrence cues
- phenomenology density
- summary-trace support

So Phase 5 should provide something latent does not already have:

- observation-local prominence profile
- not just another category multiplier

## 6.3 Future Glossary Compatibility

Glossary use is weaker in the near term.

Likely relevance:

- recurrence potential may eventually help glossary surfacing
- high-anomaly objects or locations may become stronger glossary candidates

But glossary does not need Phase 5 persistence changes yet.

## 6.4 Future UI Compatibility

UI will benefit from salience as a profile more than a single rank.

That matches the salience model doc and avoids:

- false hierarchy
- overclaiming importance
- reducing the observation field too early

This again favors hybrid normalization over raw provider output.

---

## 7. Recommendation

## Recommended Direction

Choose:

`Option D - hybrid`

Implementation placement:

`inside the existing extraction call, not as a separate mandatory salience pass`

Meaning:

- the existing extraction response should propose salience alongside each observation
- the runtime should then normalize and validate that salience after discovery assembly
- scaffold fallback should synthesize a coarse deterministic profile

## Why This Is The Best Tradeoff

It preserves the best parts of the current pipeline:

- one primary provider call in the normal path
- existing evidence validation and repair boundaries
- discovery-first architecture
- V1 projection compatibility

It also avoids the two main failure extremes:

- deterministic-only salience that mostly restates category heuristics
- separate-pass salience that adds a second provider hop to every successful capture

## What Not To Do In Phase 5

- do not add a default second LLM pass
- do not redesign persistence around salience yet
- do not expose a single global rank score as the primary salience output
- do not wire latent behavior directly to raw unnormalized LLM salience

---

## 8. Smallest Safe Phase 5 Build

## Build Goal

Add explicit Observation Salience as an internal, observation-level profile without changing durable V1 observation storage.

## Suggested Scope

### Step 1 - Internal Salience Contract

Define an internal profile for each observation with dimensions such as:

- anomaly
- emotionalIntensity
- agencyTension
- recurrencePotential
- metacognitivePresence

Use coarse bounded bands, not freeform prose and not a single scalar rank.

### Step 2 - Inline LLM Proposal

Extend the existing extraction schema so each extracted observation may include a salience proposal.

Keep it strictly bounded:

- enum-only bands
- optional confidence/source marker if needed
- no interpretive explanation text

### Step 3 - Deterministic Normalization

After evidence validation and discovery assembly:

- normalize missing fields
- clamp invalid values
- reject unsupported shapes
- optionally apply simple consistency checks

Examples:

- metacognitive salience should not be high when neither observation text nor category supports it
- recurrence potential can be boosted conservatively when explicit recurrence cues exist
- scaffold fallback should never emit a more confident profile than the validated LLM path

### Step 4 - Fallback Salience For Scaffold Path

When the pipeline falls back to `buildDescriptiveObservationScaffold(...)`, assign coarse deterministic salience so the runtime can still produce a complete internal result.

This fallback should be intentionally conservative.

### Step 5 - Keep V1 Persistence Unchanged

Do not add salience to:

- `CreateObservationInput`
- observation row storage
- fragment row storage

Phase 5 should prove the strategy before durable contract changes.

---

## 9. Minimal Next Ticket Outline

Title:

`Observation V2 Phase 5 - Internal Salience Profile With Inline Hybrid Generation`

Goal:

- add internal observation salience profiles to the discovery/V2 layer
- source salience from the existing extraction call when available
- normalize deterministically
- keep V1 persistence unchanged

Touched boundaries:

- `src/cognition/observation/llm-observation-extractor.ts`
- `src/cognition/observation/observation-discovery.ts`
- `src/domain/observation/v2.ts`
- likely a new observation salience helper in `src/cognition/observation/`
- focused tests for:
  - inline LLM salience parsing
  - normalization
  - scaffold fallback salience
  - projection ignoring salience safely

Definition of done:

- capture path still performs at most one default extraction call plus existing conditional repair
- validated extraction can produce internal salience profiles
- scaffold fallback also produces conservative salience profiles
- discovery remains observation-first
- V1 persistence shape is unchanged
- no latent consumer depends on salience yet unless explicitly scoped

---

## Final Verdict

`PROCEED WITH INLINE HYBRID`

Best default strategy:

- LLM proposes salience inside the existing extraction call
- deterministic code validates and normalizes it after discovery
- no second mandatory salience pass
- no Phase 5 persistence rewrite

This is the smallest move that is:

- quality-credible for informal Hungarian dream text
- consistent with the observation-before-salience architecture
- compatible with the current V1 bridge
- unlikely to distort capture-time latency or cost materially
