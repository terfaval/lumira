# RO-010 Long-Dream Extraction Investigation

## 1. Executive finding

Executive verdict: ROOT CAUSE PARTIALLY PROVEN.

Repository evidence proves that the investigated late-section loss can already exist in the provider/model structured output before normalization, compatibility projection, native V2 persistence, or runtime rehydration. The repo now emits attempt-scoped diagnostics that distinguish provider response metadata, raw structured counts, normalized counts, guard metrics, projection counts, and persistence counts.

What is proven:

- The active live path persists the native `ObservationV2Bundle`, not the legacy compatibility payload.
- The new diagnostics show raw structured undercoverage, late-section thin traces, and overmerge patterns before downstream persistence.
- Compatibility projection retains later-scene ordering and evidence spans in characterized tests.
- Native V2 persistence and rehydration already retain scene and observation material in the active persistence path.

What is not yet fully proven:

- Whether the dominant live failure is provider-side truncation, model omission without explicit provider incompleteness, or output-budget pressure in the real long-dream benchmark.

## 2. Active runtime path

The active generated capture path is:

1. `app/capture/page.tsx`
2. `buildLlmSceneObservationExtraction(...)`
3. `constructDerivedStructuresFromObservationBundle(...)`
4. `createObservationV2WriteStore().createFromBundle(...)`
5. `generateGlossaryCandidatesForReflectiveObject(...)`

Important trace result:

- `src/cognition/observation/scene-discovery-projection.ts` still builds a compatibility `CreateObservationInput`, but that projection is not the active live persistence boundary for generated capture.
- The active persistence boundary is the native V2 write store and its repository-backed rehydration path.

## 3. Reproduction method

This ticket used sanitized synthetic long-dream fixtures and mocked structured provider responses in focused Vitest coverage. No personal dream content was committed or logged.

Reproduction approach:

1. Build long synthetic dream text with meaningful beginning, middle, and ending sections.
2. Return shaped structured outputs that intentionally:
   - under-cover the dream,
   - compress the ending into a thin late trace,
   - overmerge transitions into one macro-scene,
   - or preserve the ending adequately.
3. Run the extractor and inspect emitted attempt diagnostics.
4. Compare raw structured metrics, normalized metrics, guard metrics, projection counts, and persistence-stage counts.

This establishes sanitized runtime-equivalent evidence for repository behavior. It does not constitute live-provider proof for the original benchmark.

## 4. Attempt-one evidence

Attempt-one diagnostics now expose:

- provider metadata:
  - `providerStatus`
  - `providerIncompleteReason`
  - `inputTokenUsage`
  - `outputTokenUsage`
  - `totalTokenUsage`
- raw structured metrics:
  - `rawSceneCount`
  - `rawObservationCount`
  - `rawLargestCoveredSpanEnd`
  - `rawLateSectionObservationCount`
- normalized metrics:
  - `normalizedSceneCount`
  - `normalizedObservationCount`
  - `largestCoveredSpanEnd`
  - `coverageRatio`
  - `uncoveredTailChars`
  - `lateSectionStart`
  - `lateSectionSentenceUnits`
  - `lateSectionObservationCount`
  - `overmergeMatchedCueGroups`
  - `overmergeTotalCueMatches`
  - `guardVerdict`

Sanitized characterization results:

- Severe undercoverage case:
  - raw scene count already collapses to one early scene
  - coverage ratio is low
  - uncovered tail is large
  - late-section observation count is zero
  - verdict is `coverage_guard_failed`
- Thin-trace ending case:
  - late-section sentence units remain meaningful
  - late-section observation count remains only one
  - verdict is `late_section_guard_failed`
- Transition-heavy macro-scene case:
  - matched cue groups and total cue matches are both high
  - verdict is `overmerge_guard_failed`

## 5. Attempt-two evidence

Attempt-two diagnostics are stored separately under the same extraction result and are distinguished by `attempt: 2`.

Sanitized retry comparison coverage proves:

- attempt one and attempt two can report different raw and normalized counts
- both attempts preserve separate coverage and late-section metrics
- merged retry diagnostics preserve stochastic variation instead of hiding it behind a single fallback reason
- accepted results now expose `acceptedAttempt`

What this proves:

- the repository can now show whether retry behavior changes the omitted region or repeats the same omission pattern
- the previous blind retry no longer prevents structural comparison

## 6. Provider response findings

The active OpenAI request currently:

- uses `model: "gpt-4.1-mini"`
- sets `max_output_tokens: 20_000`
- uses structured JSON schema output
- sets `timeout: 180_000`

The repository now captures, where available from the SDK response:

- `response.status`
- `response.incomplete_details?.reason`
- `response.usage.input_tokens`
- `response.usage.output_tokens`
- `response.usage.total_tokens`

Repository conclusion:

- Output-token limit is explicitly configured.
- The SDK response does expose incomplete/usage metadata that the previous implementation did not surface.
- The chosen model plus large long-dream structured schema remains a plausible output-budget pressure point.
- Timeout fallback classification remains separate from guard fallback classification; this ticket did not weaken or merge those paths.

Live-benchmark conclusion:

- No live provider reproduction evidence is committed in this ticket, so provider-side truncation versus omission remains unproven for the original benchmark.

## 7. Normalization findings

New diagnostics distinguish raw structured output from normalized bundle output and count defaulted fields inserted during normalization.

Characterized findings:

- normalization can replace malformed or missing optional fields with defaults
- normalization can increase apparent structural completeness by filling missing IDs, positions, evidence wrappers, or derived arrays
- normalization does not fabricate missing late-scene content
- normalization diagnostics now prevent default insertion from being mistaken for preserved extraction completeness

Assessment:

- Normalization can conceal malformed structure if raw-only visibility is absent.
- Normalization is not proven to be the source of late-section loss in the characterized failures.

## 8. Guard findings

Guard metrics are now explicitly emitted per attempt.

Observed guard classifications in sanitized tests:

- Genuine omission pattern:
  - low coverage ratio
  - large uncovered tail
  - no meaningful late observations
  - `coverage_guard_failed`
- Thin late trace:
  - meaningful late section exists in dream text
  - only one late observation survives
  - `late_section_guard_failed`
- Transition-heavy macro-scene:
  - one scene with many cue matches across cue groups
  - `overmerge_guard_failed`
- Adequate ending retention:
  - later material remains represented
  - relevant guards pass

Assessment:

- For the characterized sanitized cases, the guards behave as intended and do not appear to be false positives.
- False-positive status for the original constitutional benchmark remains unproven without live benchmark evidence.

## 9. Projection findings

Compatibility projection was directly tested with a multi-scene bundle containing later observations and evidence spans.

Proven behavior:

- all projected observations remain present
- order remains stable
- later-scene positions remain traceable
- evidence spans survive projection
- summary trace still points at late fragments

Assessment:

- Compatibility projection is not the primary late-section loss point for the characterized cases.

## 10. Persistence findings

The active generated path persists the enriched native `ObservationV2Bundle` through the V2 write store, then rehydrates the bundle. This ticket adds a persistence-stage diagnostic emitted after `createFromBundle(...)` returns.

Proven behavior from repository trace and tests:

- the live path writes and rehydrates a native bundle
- persisted scene count and observation count are now logged without logging dream text
- existing V2 repository and write-store tests already cover authoritative persistence/rehydration expectations
- the new capture-route test proves persistence-stage diagnostics can report retained late-scene counts after rehydration

Assessment:

- No repository evidence in this ticket shows accepted later material being dropped after extraction during active V2 persistence.
- Persistence loss is rejected as the primary cause for the characterized failures.

## 11. Root-cause classification

### Proven root cause

- In characterized long-dream failures, the loss is already present before normalization, compatibility projection, or native V2 persistence. The earliest demonstrated loss point is the provider/model structured extraction output consumed by `buildSceneObservationExtractionFromStructuredResult(...)`.

### Strong root-cause candidate

- Provider/model omission under long structured-output pressure.
- Provider-side incomplete output caused by output-budget exhaustion, if live diagnostics later show incomplete status or reason.

### Rejected hypotheses

- Projection loss in the active generated capture path.
- Native V2 persistence loss after accepted extraction.
- Guard false positive for the sanitized characterized failures.
- Normalization as the primary creator of the missing late-scene content.

## 12. Remediation options

Evidence-supported options, not implemented in this ticket:

- `request/output-budget correction`
  - justified if live diagnostics show incomplete provider status or output-budget exhaustion
- `targeted late-section extraction`
  - smallest behavioral remediation if provider output is structurally complete enough to parse but still omits the ending
- `model change`
  - justified only if repeated evidence shows the current model omits later material even without incomplete provider status
- `guard-threshold correction`
  - not justified by current sanitized evidence
- `projection correction`
  - not justified by current repository evidence
- `persistence correction`
  - not justified by current repository evidence

## 13. Recommended next ticket

Recommended next ticket: targeted long-dream remediation gated by the new diagnostics.

Classification:

- primary recommendation: `targeted late-section extraction`
- conditional companion recommendation: `request/output-budget correction` if live diagnostics show incomplete provider status or max-output exhaustion

Why this is the smallest constitutionally adequate next step:

- downstream loss has been materially ruled out
- guards are correctly rejecting incomplete endings in characterized cases
- the remaining gap is at the extraction boundary itself
- a targeted ending-focused follow-up is narrower than chunking or full multi-pass redesign

## 14. Remaining uncertainties

- The original constitutional long-dream benchmark was not committed, and no committed live-provider reproduction artifact exists in this ticket.
- The exact live provider incomplete reason remains unknown until the benchmark is rerun with the new diagnostics enabled.
- It remains possible that more than one failure subtype exists across different long dreams:
  - explicit provider incompleteness
  - silent model omission
  - transition-heavy overmerge
  - weak evidence-span coverage without outright content loss
