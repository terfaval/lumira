# Observation Live Scaffold Fallback Diagnostic v0

Date: 2026-06-06 UTC  
Scope: Diagnostic only. No code changes.  
Mode: SCOUT

## Ticket Protocol

### Goal

- trace the live capture path from submit through persistence
- identify where validated LLM Observation V2 output can fall back to scaffold mode
- determine the most likely live fallback cause from code evidence and the reported Supabase outputs
- assess whether current Phase 5 salience work is reachable in the live capture path

### Touched Files

- new: `docs/runtime/reviews/observation-live-scaffold-fallback-diagnostic-v0.md`

### Review Steps

1. Read the required Observation V2 runtime docs, review docs, and recent planning material.
2. Inspect the live capture entrypoint and observation extraction pipeline.
3. Trace every fallback branch from provider/config through validation, repair, semantic policy, and persistence.
4. Compare those branches against the reported live Supabase outputs.
5. Assess observability and salience reachability.

### Acceptance Criteria

- the live path is mapped end to end
- scaffold fallback selection point is explicit
- likely fallback cause is ranked with evidence and confidence
- logging and persistence behavior for fallback reasons is identified
- Phase 5 salience reachability is assessed against the current live path

### Validation Plan

- documentary review
- code-path inspection only
- no runtime edits
- no fix implementation

### Rollback Plan

- not applicable

---

## Executive Verdict

Live capture is definitely persisting scaffold-mode observations when `buildLlmObservationExtraction(...)` returns `mode: "fallback"`. The exact persisted markers reported from Supabase are scaffold-only markers and do not come from the validated LLM path.

Most likely root cause: the observation extractor is failing after the OpenAI call succeeds, most plausibly in structured-output validation, evidence validation / repair, or semantic-policy projection. Confidence on that exact ranking is `medium`.

Confidence that live capture is using scaffold fallback rather than validated LLM output is `high`.

Why the confidence split:

- `high` that scaffold fallback is active because the stored semantic policy markers are hard-coded only in scaffold mode
- `medium` on the exact upstream cause because the current persistence shape does not store the fallback reason and title generation evidence changes the ranking

---

## 1. Live Path Map

### Actual live capture path

```text
capture submit
-> create reflective object
-> title generation attempt
-> observation extraction attempt
-> fallback decision
-> observation persistence
```

### Code path

1. `submitCapture` creates the reflective object first in `app/capture/page.tsx:32`.
2. It then attempts title generation with `generateDreamTitleSuggestion(...)` in `app/capture/page.tsx:41`.
3. It calls `buildLlmObservationExtraction(...)` in `app/capture/page.tsx:56`.
4. If extraction returns `mode: "validated_llm"`, capture uses `extraction.payload`.
5. If extraction returns `mode: "fallback"`, capture uses `buildDescriptiveObservationScaffold(...)` in `app/capture/page.tsx:65`.
6. Capture logs the fallback reason with `console.warn("llm_observation_extraction_fallback", ...)` in `app/capture/page.tsx:77`.
7. The chosen payload is persisted through `observationRepository.create(...)` in `app/capture/page.tsx:84`.

### Where scaffold fallback is selected

The selection happens only in `app/capture/page.tsx:63-69`.

That means the persisted scaffold output is not produced by semantic policy directly. It is produced only after the extractor has already returned `mode: "fallback"`.

---

## 2. Why The Supabase Output Proves Scaffold Mode

The reported stored values match the scaffold defaults exactly:

- `semantic_policy_result: accept_with_uncertainty`
- `semantic_policy_reasons: ["scaffold_mode_descriptive_only"]`
- `uncertainty_notes: ["Descriptive scaffold only; interpretation intentionally omitted."]`

Those values are hard-coded in scaffold mode:

- scaffold uncertainty note: `src/cognition/observation/descriptive-observation-scaffold.ts:250`
- scaffold summary compatibility text: `src/cognition/observation/descriptive-observation-scaffold.ts:252`
- scaffold semantic policy result: `src/cognition/observation/descriptive-observation-scaffold.ts:265`
- scaffold semantic policy reason: `src/cognition/observation/descriptive-observation-scaffold.ts:266`

The validated LLM path does not emit those scaffold markers. Instead it projects discovery through semantic policy evaluation in `src/cognition/observation/observation-discovery-projection.ts:196` and only persists the evaluated result if policy returns `accept` or `accept_with_uncertainty`.

So the live rows are not “LLM output downgraded a bit.” They are scaffold payloads.

---

## 3. Fallback Cause Analysis

## All possible fallback causes in code

`buildLlmObservationExtraction(...)` can fall back for these reasons:

- missing provider config: `missing_openai_api_key`
  - `src/cognition/observation/llm-observation-extractor.ts:133-136`
- provider returned no usable payload: `empty_response`
  - `src/cognition/observation/llm-observation-extractor.ts:662`
- response JSON parse failure: `invalid_json`
  - `src/cognition/observation/llm-observation-extractor.ts:672`
- provider timeout or provider error
  - `src/cognition/observation/llm-observation-extractor.ts:675-680`
- invalid structured payload such as `missing_summary`, `missing_fragments`, `invalid_fragment_shape`, `invalid_fragment_content`, `invalid_category:*`
  - normalization and analysis: `src/cognition/observation/observation-extraction-validation.ts:177-212`
  - fallback handoff: `src/cognition/observation/llm-observation-extractor.ts:603-610`
- evidence validation failure leading to repair attempt
  - evidence mismatch detection: `src/cognition/observation/observation-extraction-validation.ts:215-283`
  - repair flow: `src/cognition/observation/llm-observation-extractor.ts:434-558`
- repair failure, including `repair_left_no_fragments`
  - `src/cognition/observation/llm-observation-extractor.ts:448-505`
- semantic policy rejection or deferral, converted into fallback
  - semantic policy evaluation in projection: `src/cognition/observation/observation-discovery-projection.ts:196-208`
  - projection error caught and converted to fallback in `buildValidatedPayload`: `src/cognition/observation/llm-observation-extractor.ts:562-584`

## Most likely cause

### Ranked likelihood

1. systematic structured-output validation failure, evidence validation failure, repair failure, or semantic-policy projection failure inside the observation extractor
2. observation-specific provider failure or timeout
3. build/runtime mismatch specific to the extractor path
4. `missing_openai_api_key`

### Why extractor-specific failure is now most likely

The strongest new evidence is that title generation works in the deployed app. Title generation and observation extraction use the same environment gate for `OPENAI_API_KEY`.

Relevant code:

- title path env gate: `src/cognition/title/llm-dream-title-generator.ts:40-47`
- extractor env gate: `src/cognition/observation/llm-observation-extractor.ts:133-140`

If title generation is succeeding in the same live deployment, the runtime almost certainly has a usable API key. That pushes the highest-probability failure point downstream into the observation-specific path:

- stricter response schema
- evidence-substring validation
- optional repair pass
- semantic-policy projection that can throw and force fallback

That matches the code architecture better than a missing-key explanation once successful title generation is observed.

### Why the other causes are less likely

#### Structured output schema failure, evidence validation failure, repair failure, or semantic-policy projection failure

This is now the strongest cluster of causes.

Evidence:

- structured payload can fail on `missing_summary`, `missing_fragments`, `invalid_fragment_shape`, `invalid_fragment_content`, or `invalid_category:*`
  - `src/cognition/observation/observation-extraction-validation.ts:177-212`
- evidence snippet validation is strict substring-based validation against the dream text
  - `src/cognition/observation/observation-extraction-validation.ts:153`
  - `src/cognition/observation/observation-extraction-validation.ts:215-283`
- repair failure can still force fallback
  - `src/cognition/observation/llm-observation-extractor.ts:448-505`
- semantic policy projection can throw `interpretive_output:*` or `insufficient_evidence:*`, which becomes fallback
  - `src/cognition/observation/observation-discovery-projection.ts:196-208`
  - `src/cognition/observation/llm-observation-extractor.ts:562-584`

This cluster is also observation-specific, unlike title generation, which is why it now ranks above a missing-key explanation.

#### Timeout or provider error

Still possible, but now less likely than an extractor-internal failure because title generation already demonstrates that the provider is reachable at least for some requests in the same deployment.

Evidence:

- timeout and provider failures are handled as fallback
  - `src/cognition/observation/llm-observation-extractor.ts:675-680`
- the observation call is heavier than title generation and has a 25-second timeout
  - `src/cognition/observation/llm-observation-extractor.ts:36`

#### Missing API key

This remains theoretically possible only if the observed successful title generation came from a different environment, a stale deploy, or a different execution path than the failing capture path. But with current evidence it is no longer the lead hypothesis.

#### Feature flag or disabled LLM path

I did not find a feature flag or alternate runtime switch disabling observation LLM extraction. Capture imports and calls the extractor directly.

Evidence:

- extractor call in capture: `app/capture/page.tsx:56`
- no feature-flagged branch found in the reviewed files

#### Exception swallowed and fallback used

Yes, this happens by design for several classes of failure.

- provider exceptions are converted to fallback reasons
  - `src/cognition/observation/llm-observation-extractor.ts:675-680`
- projection exceptions, including semantic reject/defer, are also converted to fallback
  - `src/cognition/observation/llm-observation-extractor.ts:562-584`

This is real, but it is a mechanism, not the most likely root cause by itself.

---

## 4. Logging And Observability

## What is logged today

### Logged

- capture-level fallback reason is logged:
  - `console.warn("llm_observation_extraction_fallback", { reflectiveObjectId, reason })`
  - `app/capture/page.tsx:77`
- evidence-validation diagnostics are logged:
  - `src/cognition/observation/llm-observation-extractor.ts:603-615`
- repair lifecycle is logged:
  - `src/cognition/observation/llm-observation-extractor.ts:360`
  - `src/cognition/observation/llm-observation-extractor.ts:448-558`
- provider errors are logged:
  - `src/cognition/observation/llm-observation-extractor.ts:422`
  - `src/cognition/observation/llm-observation-extractor.ts:675`

### Not persisted

The fallback reason is not written into the durable observation row or fragment rows.

The persisted row only records the scaffolded output that capture chose to save. That means Supabase shows the aftermath but not the trigger.

Result:

- logs can reveal the cause if deployment logs are available
- Supabase rows alone cannot distinguish `missing_openai_api_key` from `provider_timeout`, `invalid_json`, `evidence_validation_failed`, or `insufficient_evidence:*`

## Smallest safe observability improvement

Persist one bounded non-user-facing fallback reason string for scaffolded capture writes.

Smallest useful payload:

```text
observation_extraction_mode = scaffold_fallback
observation_extraction_fallback_reason = <reason>
```

Why this is the smallest safe improvement:

- it preserves current runtime behavior
- it avoids expanding user-facing semantics
- it turns future live captures into deterministic evidence instead of inference from scaffold-shaped rows

If schema work is considered too heavy for the first step, the next smallest improvement is to ensure `llm_observation_extraction_fallback` logs are retained and queryable in production by `reflectiveObjectId`.

---

## 5. Runtime Configuration And Live Environment Risk

## Required runtime dependency

Observation LLM extraction depends on:

- `process.env.OPENAI_API_KEY`
  - read in `src/infrastructure/environment/env.ts:23`
  - returned as `openAiApiKey` in `src/infrastructure/environment/env.ts:30`

If that variable is absent, the extractor falls back immediately:

- `src/cognition/observation/llm-observation-extractor.ts:133-136`

## Important nuance

This is a runtime env read, not a build-time constant baked into the module. So the most relevant mismatch is:

- live server runtime missing `OPENAI_API_KEY`

not:

- local dev build having the key while production build does not

## Shared provider dependency with title generation

The title generator uses the same `OPENAI_API_KEY` gate:

- title env gate: `src/cognition/title/llm-dream-title-generator.ts:40-43`
- title request call: `src/cognition/title/llm-dream-title-generator.ts:98`

This matters operationally:

- if live title generation is also falling back, missing `OPENAI_API_KEY` becomes very likely
- if live title generation is succeeding, missing `OPENAI_API_KEY` becomes much less likely and attention should shift to observation-specific failure modes

Current user-reported evidence says title generation does succeed in the deployed app, so the runtime configuration section should be read as:

- env/config dependency exists
- but current evidence does not point to it as the primary live failure

## Feature flags or provider routing

No observation feature flag, disable switch, or alternate provider-routing layer was found in the reviewed live capture path.

---

## 6. Semantic Policy And Fallback Boundary

## Where semantic policy still matters

Validated LLM extraction is not automatically persisted after basic JSON validation. It still passes through semantic policy during projection:

- projection evaluates semantic policy: `src/cognition/observation/observation-discovery-projection.ts:196`
- `reject_interpretive` throws: `src/cognition/observation/observation-discovery-projection.ts:204`
- `defer_insufficient_evidence` throws: `src/cognition/observation/observation-discovery-projection.ts:207-208`

Those throws are then caught and converted into extractor fallback:

- `src/cognition/observation/llm-observation-extractor.ts:562-584`

So the LLM path can fail after:

- provider success
- valid JSON
- valid normalized fragments

if semantic policy later rejects or defers the payload.

## Why the reported live markers still point away from semantic-policy success

The reported persisted reasons are scaffold defaults, not semantic-policy reasons produced by evaluated LLM output.

If the LLM path had succeeded and merely degraded to `accept_with_uncertainty`, the reasons would come from semantic policy, such as:

- `category_coherence_risk:*`
- `summary_trace_missing`

Relevant semantic policy branches:

- category coherence risk: `src/domain/observation/semantic-policy.ts:676-677`
- summary trace missing: `src/domain/observation/semantic-policy.ts:701`
- defer on weak evidence or missing trace: `src/domain/observation/semantic-policy.ts:704-709`
- accept with uncertainty on non-fatal reasons: `src/domain/observation/semantic-policy.ts:721-723`

Instead, live rows show the exact scaffold reason string: `scaffold_mode_descriptive_only`.

---

## 7. Phase 5 Salience Reachability

## Short answer

Current Phase 5 salience work is not durably reachable through the live persisted capture path, regardless of whether capture uses validated LLM extraction or scaffold fallback.

## Why

### Internal discovery does carry salience

- discovery observations have optional `salience`
  - `src/cognition/observation/observation-discovery.ts:23`
- discovery normalizes incoming salience proposals
  - `src/cognition/observation/observation-discovery.ts:91-94`
- scaffold discovery also assigns conservative salience
  - scaffold salience generation: `src/cognition/observation/descriptive-observation-scaffold.ts:194`
  - scaffold fallback helper: `src/cognition/observation/observation-salience.ts:130-151`

### But capture discards discovery

Capture persists only `CreateObservationInput`, not `discovery`:

- extractor returns `payload` plus optional `discovery`
- capture uses only `payload` or scaffolded `CreateObservationInput`
  - `app/capture/page.tsx:56-84`

### Projection intentionally strips salience

Phase 5 salience is internal and intentionally ignored when projecting into the V1 persistence payload.

Evidence:

- projection builds fragments without salience fields
  - `src/cognition/observation/observation-discovery-projection.ts:44-61`
- tests explicitly state projection ignores internal salience
  - search result in `src/cognition/observation/__tests__/observation-discovery.test.ts`

### Persisted V1 -> V2-like adapters also do not recover salience

- `DescriptiveObservation` has optional `salience`
  - `src/domain/observation/v2.ts:26`
- but `adaptFragmentToDescriptiveObservation(...)` does not populate it from persisted fragments
  - `src/domain/observation/v2.ts:90-103`

## Practical verdict for live capture

If the LLM path is falling back:

- scaffold mode still creates conservative salience internally at discovery time
- but that salience does not survive projection or persistence

If the LLM path succeeds:

- validated inline salience can exist on `result.discovery`
- but capture still discards it before persistence

So current Phase 5 salience work is effectively unreachable in the live durable capture output.

---

## 8. Confidence Assessment

### Scaffold fallback is active

`high`

Reason:

- the persisted semantic policy markers exactly match scaffold hard-coded defaults

### Exact fallback reason is extractor-internal validation / projection failure

`medium`

Reason:

- this is now the strongest code-based explanation once successful title generation is taken into account
- but the current persistence model does not store the reason, so this still cannot be proven from Supabase rows alone

### No feature flag / disabled LLM branch

`high`

Reason:

- the reviewed live capture path calls the extractor directly
- no alternate runtime gate was found

### Phase 5 salience is not durably reachable in live persisted capture

`high`

Reason:

- discovery salience exists
- projection strips it
- capture persists only V1 payload

---

## 9. Recommended Smallest Next Fix

Recommended smallest next fix:

1. Inspect the live `llm_observation_extraction_fallback` logs for the actual fallback `reason`.
2. If the reason is not currently retained in deployment logs, add the smallest bounded persistence or log-retention improvement for that reason string.

Reason:

- the main uncertainty is no longer whether the key exists
- the main uncertainty is which observation-specific fallback branch is firing in production
- logs already contain the decisive discriminator; Supabase rows do not

Recommended smallest follow-up engineering change after that:

- persist `observation_extraction_fallback_reason` for scaffolded capture writes so the next live failure is diagnosable from Supabase without depending on deployment logs

---

## Final Answer

Live capture currently persists scaffold-mode observations whenever `buildLlmObservationExtraction(...)` returns fallback, and the Supabase rows you reported are definitive scaffold markers rather than validated LLM output.

Given the additional evidence that title generation succeeds in the deployed app, missing `OPENAI_API_KEY` is no longer the leading hypothesis. The most likely cause is now an observation-extractor-specific fallback branch after the OpenAI call, most plausibly strict structured-output validation, evidence validation / repair, or semantic-policy projection failure. The repo logs the decisive fallback reason but does not persist it, so the exact cause still cannot be proven from the stored rows alone.

Phase 5 salience work is not durably reachable in the current live capture path because salience exists only on internal discovery objects and is intentionally discarded before V1 persistence.
