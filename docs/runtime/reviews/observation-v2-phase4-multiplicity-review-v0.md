# Observation V2 Phase 4 Multiplicity Review v0

Date: 2026-06-06 UTC
Scope: Review only. No runtime changes.

## Ticket Protocol

### Goal

- verify that Phase 4 introduces real `one evidence span -> many observations` support inside discovery
- verify that shared evidence survives projection into the V1 persistence shape without observation loss
- assess scaffold and LLM-path multiplicity risk before Phase 5 salience work
- assess whether the codebase is benchmark-ready

### Touched Files

- new: `docs/runtime/reviews/observation-v2-phase4-multiplicity-review-v0.md`
- reviewed: `src/cognition/observation/observation-discovery.ts`
- reviewed: `src/cognition/observation/observation-discovery-projection.ts`
- reviewed: `src/cognition/observation/descriptive-observation-scaffold.ts`
- reviewed: `src/cognition/observation/llm-observation-extractor.ts`
- reviewed: `src/cognition/observation/observation-engine.ts`
- reviewed: `src/cognition/observation/observation-extraction-validation.ts`
- reviewed tests:
  - `src/cognition/observation/__tests__/observation-discovery.test.ts`
  - `src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`
  - `src/cognition/observation/__tests__/observation-engine.test.ts`

### Review Steps

1. Read the required runtime and benchmark documents.
2. Inspect the Phase 4 discovery, projection, scaffold, and LLM extractor boundaries.
3. Check focused tests for multiplicity, evidence integrity, projection preservation, and fallback safety.
4. Assess benchmark readiness against `docs/runtime/research/lumira-observation-benchmark-v0.md`.

### Acceptance Criteria

- multiplicity is evaluated at discovery, not only at V1 fragment projection
- shared evidence integrity is assessed, including invalid-reference behavior
- projection preservation is checked for count, order, evidence, uncertainty, and category
- scaffold and LLM-path risks are assessed without tuning or code changes
- Phase 5 readiness ends with a concrete verdict

### Validation Plan

- run focused observation tests only
- do not create a new benchmark system during review
- identify the minimal harness needed if no benchmark harness exists

### Rollback Plan

- not applicable

## Verdict

`READY WITH MINOR CLEANUP`

Phase 4 is structurally good enough to proceed to explicit Observation Salience, but it is not benchmark-ready in a disciplined way yet. The main reasons are:

- discovery multiplicity is real and tested
- projection preserves observations into V1 fragments well enough for Phase 5
- the LLM path is still fragment-first at the schema boundary
- scaffold multiplicity is narrow and can become noisy or under-classified on Hungarian informal text
- no dedicated benchmark harness exists yet

## Strengths

- Discovery now has a real shared-evidence registry: `ObservationDiscoveryResult.evidenceSpans[]` plus observation-local `spanIds[]` references (`src/cognition/observation/observation-discovery.ts:50-57`).
- Shared evidence deduplication is explicit and bundle-local, not simulated by repeating fragment payloads (`src/cognition/observation/observation-discovery.ts:77-105`).
- Projection stays behind a single boundary and preserves the V1 contract without changing storage or downstream consumers (`src/cognition/observation/observation-discovery-projection.ts:162-225`).
- Summary derivation now follows ordered discovery observations rather than summary-first input shaping (`src/cognition/observation/observation-discovery-projection.ts:88-117`).
- Tests explicitly cover shared-evidence multiplicity in both scaffold and LLM-driven paths (`src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts:89-118`, `src/cognition/observation/__tests__/llm-observation-extractor.test.ts:222-263`).

## Weaknesses

- Projection resolves only the first valid `spanId`, so any future multi-span evidence payload would be collapsed back to a single V1 evidence snippet (`src/cognition/observation/observation-discovery-projection.ts:31-47`).
- Missing or invalid `spanIds` degrade silently to `observation.text` with null offsets instead of surfacing a discovery integrity failure (`src/cognition/observation/observation-discovery-projection.ts:39-45`).
- Span IDs are deterministic only within one bundle build; they are insertion-order IDs, not canonical IDs across runs (`src/cognition/observation/observation-discovery.ts:94-102`).
- The scaffold classifier is still overwhelmingly English-pattern-driven, so Hungarian informal text is at real risk of broad `scene` fallback or weak categorization (`src/cognition/observation/descriptive-observation-scaffold.ts:39-134`).
- The LLM schema remains fragment-oriented and cannot express discovery-native shared evidence directly (`src/cognition/observation/llm-observation-extractor.ts:37-84`).

## 1. Multiplicity Boundary

Assessment: Yes, discovery now genuinely supports `one evidence span -> many observations`.

Why:

- Discovery observations no longer store inline spans. They store `spanIds[]`, while shared evidence is stored once in `evidenceSpans[]` (`src/cognition/observation/observation-discovery.ts:23-31`, `src/cognition/observation/observation-discovery.ts:50-57`).
- `createObservationDiscoveryResult(...)` deduplicates equal evidence spans and reuses the same ID across multiple observations (`src/cognition/observation/observation-discovery.ts:77-105`).

Examples:

- Scaffold path: one sentence with `while` yields two observations but one evidence span, and the test asserts `observationCount: 2` with `evidenceSpanCount: 1` (`src/cognition/observation/descriptive-observation-scaffold.ts:185-205`, `src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts:89-118`).
- Projection path: one shared span supports three discovery observations and projects to three V1 fragments with the same evidence snippet preserved (`src/cognition/observation/__tests__/observation-discovery.test.ts:221-277`).
- LLM path: repeated evidence snippets in incoming fragment-shaped output are normalized into one shared discovery span before projection (`src/cognition/observation/llm-observation-extractor.ts:252-271`, `src/cognition/observation/__tests__/llm-observation-extractor.test.ts:222-263`).

Conclusion:

Multiplicity is now a native discovery concept. It is no longer only implicit fragment duplication.

## 2. Shared Evidence Integrity

### Span ID determinism

Assessment: Stable enough for bundle-local use, not stable across reruns.

- IDs are assigned as `span-${evidenceSpans.length}` in creation order (`src/cognition/observation/observation-discovery.ts:94-102`).
- The key is deterministic for exact-equal inputs because it is built from snippet, offsets, and context label (`src/cognition/observation/observation-discovery.ts:60-66`).
- This is sufficient for local projection and testability.
- This is not a durable identity model across re-extractions or normalization variants.

### Shared reference safety

Assessment: Yes, multiple observations can safely reference the same span.

- Discovery supports repeated `spanIds`.
- Projection resolves evidence through a span lookup map and can reuse the same resolved span for many fragments (`src/cognition/observation/observation-discovery-projection.ts:166-170`).
- Tests confirm multiple projected fragments preserve the same evidence snippet without count loss (`src/cognition/observation/__tests__/observation-discovery.test.ts:221-277`).

### Projection evidence preservation

Assessment: Preserved for current Phase 4 producers, with one important constraint.

- Current scaffold and LLM producers emit one evidence span per observation draft, so current evidence survives projection well.
- Projection only keeps the first resolvable span ID (`src/cognition/observation/observation-discovery-projection.ts:35-47`).
- That means Phase 4 is safe today, but the projection is not future-proof for richer multi-span evidence.

### Missing or invalid `spanIds`

Assessment: Safe but lossy.

- When no `spanId` resolves, projection falls back to the observation text with null offsets and no context label (`src/cognition/observation/observation-discovery-projection.ts:39-45`).
- This avoids crashes and total observation loss.
- It also hides evidence drift by converting a broken reference into weak fallback evidence.

## 3. Projection Preservation

Assessment: Good for Phase 4.

### Observation count before projection

- Projection maps every discovery observation to one V1 fragment after ordering (`src/cognition/observation/observation-discovery-projection.ts:167-170`).
- No filtering happens in `preserve_defaults` mode.

### V1 fragment count after projection

- Shared-evidence tests preserve 3 observations -> 3 fragments (`src/cognition/observation/__tests__/observation-discovery.test.ts:221-277`).
- Scaffold shared-evidence test preserves 2 observations -> 2 fragments (`src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts:89-118`).

### Ordering preservation

- Ordering is deterministic by `position`, then `text` for ties (`src/cognition/observation/observation-discovery.ts:131-139`).
- Summary rebuilding and fragment projection use the same ordering rule (`src/cognition/observation/observation-discovery-projection.ts:88-100`, `src/cognition/observation/observation-discovery-projection.ts:167-170`).

### Evidence preservation

- Evidence snippet, offsets, and context label are preserved from the resolved span into the fragment (`src/cognition/observation/observation-discovery-projection.ts:49-69`).
- For current single-span producers this is sufficient.
- For future multi-span observations it would preserve only the first span.

### Uncertainty preservation

- Observation-level `uncertaintyNote` is copied into the fragment (`src/cognition/observation/observation-discovery-projection.ts:57-68`).
- Bundle-level uncertainty notes are carried forward into the V1 payload (`src/cognition/observation/observation-discovery-projection.ts:184`, `src/cognition/observation/observation-discovery-projection.ts:216`).

### Category preservation

- Category is copied directly without remapping at projection time (`src/cognition/observation/observation-discovery-projection.ts:57-68`).

Conclusion:

Valid discovery observations are not being dropped by the Phase 4 projection boundary in the reviewed paths.

## 4. Scaffold Noise Assessment

Assessment: Moderate risk overall. Low risk of aggressive over-splitting, higher risk of weak categorization and noisy preservation on informal Hungarian text.

What the scaffold does well:

- It only adds multiplicity in a narrow way by splitting on `while|miközben` (`src/cognition/observation/descriptive-observation-scaffold.ts:156-163`).
- It reuses the whole sentence as shared evidence, which is preservation-friendly (`src/cognition/observation/descriptive-observation-scaffold.ts:185-205`).
- It merges very short punctuation fragments back into the previous segment, which reduces tiny detached garbage (`src/cognition/observation/descriptive-observation-scaffold.ts:137-154`).

Risks:

- Clause splitting is narrow. It catches a useful case, but not many other multiplicity structures common in natural dream reports.
- Sentence splitting is punctuation-driven. Repeated punctuation and malformed text can create unstable sentence boundaries before the short-fragment merge has a chance to help (`src/cognition/observation/descriptive-observation-scaffold.ts:137-154`).
- Category heuristics are mostly English lexical cues. Hungarian informal dream text is therefore likely to be preserved as raw clause text but weakly categorized (`src/cognition/observation/descriptive-observation-scaffold.ts:39-134`).
- Informal, telegraphic, or punctuation-heavy human dream notes may still produce generic `scene` outputs rather than meaningful multiplicity.

Net judgment:

- The scaffold does produce useful additional observations in the exact `while/miközben` pattern.
- The bigger risk is not runaway over-splitting. The bigger risk is shallow or noisy categorization on real Hungarian dream text.

## 5. LLM Path Assessment

Assessment: Phase 4 improves the LLM path structurally, but multiplicity is still mostly adapter-side.

What improved:

- Validated LLM fragments are now converted into discovery observations before V1 projection (`src/cognition/observation/llm-observation-extractor.ts:546-567`).
- Repeated evidence snippets from the LLM path can collapse into one shared discovery span during `createObservationDiscoveryResult(...)` (`src/cognition/observation/llm-observation-extractor.ts:252-271`, `src/cognition/observation/observation-discovery.ts:77-105`).

What remains constrained:

- The model is still asked to return `summary` + `fragments[]`, not `evidenceSpans[]` + `spanIds[]` (`src/cognition/observation/llm-observation-extractor.ts:37-84`).
- Each fragment still carries a single snippet field, not discovery-native shared evidence references (`src/cognition/observation/llm-observation-extractor.ts:60-79`).
- Repair logic is fragment-based and repairs evidence snippet drift per fragment, not at shared-evidence graph level (`src/cognition/observation/llm-observation-extractor.ts:206-229`, `src/cognition/observation/llm-observation-extractor.ts:418-543`).

Conclusion:

- The LLM path is structurally cleaner than before because it now passes through the discovery boundary.
- But native multiplicity remains mostly a discovery/runtime property, not a model-schema property.

## 6. Benchmark Readiness

Assessment: Not ready for a disciplined benchmark run yet.

What exists:

- The benchmark spec is present in `docs/runtime/research/lumira-observation-benchmark-v0.md`.
- Focused regression tests cover important local behaviors: shared evidence, evidence repair, phenomenology preservation, and projection compatibility.

What does not exist:

- There is no dedicated local benchmark harness for Cases A/B/C.
- There is no comparative scoring output for observation density, diversity, anomaly preservation, agency preservation, metacognitive preservation, atmosphere preservation, or continuity preservation.

Minimal harness needed:

1. a local table of benchmark dream texts from the benchmark doc
2. a runner that invokes at least the scaffold path and, when fixture data is available, the structured LLM validation path
3. a simple report that records:
   - discovery observation count
   - projected fragment count
   - distinct categories
   - presence/absence of anomaly, agency, metacognitive, atmosphere, and continuity observations
   - shared-evidence reuse counts
4. optional expected-coverage assertions for Cases A/B/C

Without that harness, the repo is structurally promising but not benchmark-ready in a repeatable sense.

## 7. Phase 5 Readiness

Assessment: Safe to proceed.

Reasons:

- Discovery multiplicity is now explicit and tested.
- Projection still preserves the existing persistence contract.
- The observed weaknesses are cleanup-class issues, not blockers for salience.

Minor cleanup that would improve Phase 5 confidence:

- make invalid `spanIds` observable instead of silently degrading
- document that current projection only preserves the first evidence span
- add the minimal benchmark harness before making benchmark claims
- add at least one Hungarian-informal scaffold regression case

## Evidence Integrity Assessment

Overall: `adequate for Phase 5, not yet hardened for benchmark claims`

- bundle-local shared evidence is real
- evidence reuse across many observations works
- invalid references fail soft rather than hard
- projection currently assumes one primary evidence span per persisted fragment

## Projection Preservation Assessment

Overall: `strong for current Phase 4 scope`

- observation counts are preserved in the reviewed paths
- ordering is deterministic
- category and uncertainty survive projection
- evidence survives for current single-span producers
- future richer evidence payloads would need more than first-span projection

## Scaffold Noise Assessment

Overall: `acceptable but fragile`

- useful on narrow clause-sharing patterns
- not obviously over-splitting
- likely under-classifies or produces generic observations on Hungarian informal dream text

## LLM Path Assessment

Overall: `improved boundary, not yet discovery-native`

- the path now flows through discovery before persistence
- repeated evidence can be deduplicated inside discovery
- model IO remains fragment-shaped and summary-shaped

## Benchmark Readiness Assessment

Overall: `not benchmark-ready without a small harness`

- behavior-level tests pass
- benchmark spec exists
- repeatable benchmark execution and scoring do not exist yet

## Validation Run

Focused tests executed:

```text
npm.cmd test -- src/cognition/observation/__tests__/observation-discovery.test.ts src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts src/cognition/observation/__tests__/llm-observation-extractor.test.ts src/cognition/observation/__tests__/observation-engine.test.ts
```

Result:

- 4 test files passed
- 34 tests passed

## Final Verdict

`READY WITH MINOR CLEANUP`
