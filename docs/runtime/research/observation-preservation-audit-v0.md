# Observation Preservation Audit v0

## Status

Diagnostic audit of the current Lumira Observation extraction pipeline.

This is:

- a preservation audit
- a runtime-flow audit
- a density and loss audit

This is not:

- a schema audit
- an ontology review
- a prompt rewrite
- a solution proposal

---

## Scope

Primary runtime path audited:

`Dream Text -> capture action -> LLM observation extractor -> structured normalization/evidence validation -> optional evidence repair -> semantic policy gate -> persisted observation record + fragments -> observation API/read models`

Primary sources inspected:

- `docs/runtime/lumira-observation-extraction-principle-v0.md`
- `docs/runtime/research/lumira-observation-benchmark-v0.md`
- `docs/runtime/lumira-observation-category-role-map-v1.md`
- `docs/runtime/lumira-observation-extraction-contract-v1.md`
- `docs/runtime/lumira-observation-generation-strategy-v1.md`
- `app/capture/page.tsx`
- `src/cognition/observation/llm-observation-extractor.ts`
- `src/cognition/observation/observation-extraction-validation.ts`
- `src/cognition/observation/descriptive-observation-scaffold.ts`
- `src/domain/observation/http-contract.ts`
- `src/domain/observation/semantic-policy.ts`
- `src/domain/observation/types.ts`
- `src/infrastructure/supabase/repositories/observation-supabase-repository.ts`
- `app/api/reflective-objects/[id]/observations/route.ts`

---

## Executive Finding

The current runtime does not primarily preserve observations as independent descriptive units.

It primarily preserves:

- one persisted `Observation` record per extraction run
- one top-level summary for that record
- a flat list of category-tagged fragments under that summary

This means the live system is closer to:

- `one dream text -> one observation bundle`

than to:

- `one dream text -> many independent descriptive observations`

The largest preservation bottlenecks are:

1. the single-summary bundle shape
2. single-category fragment encoding
3. evidence validation plus repair/drop behavior
4. semantic-policy deferral for weak evidence
5. deterministic fallback scaffold heuristics
6. prompt and validation pressure toward category selection rather than observation multiplication

The practical result is that the system can preserve some descriptive richness, but it is structurally biased toward compressed, categorized extraction rather than maximal observation preservation.

---

## 1. Extraction Flow

### Runtime flow

Current capture-time runtime path:

1. Dream text is submitted in `app/capture/page.tsx` and stored as a reflective object.
   Evidence: `app/capture/page.tsx:56-84`
2. The capture action calls `buildLlmObservationExtraction(...)`.
   Evidence: `app/capture/page.tsx:56`
3. The LLM is prompted to emit one structured JSON object containing:
   - `summary`
   - `uncertaintyNotes`
   - `summaryTrace`
   - `fragments`
   Evidence: `src/cognition/observation/llm-observation-extractor.ts:32-66`
4. Structured output is normalized and checked against the dream text.
   Evidence: `src/cognition/observation/observation-extraction-validation.ts:167-257`
5. If evidence snippets do not match source text, fragments are separated into:
   - `validFragments`
   - `failingFragments`
   Evidence: `src/cognition/observation/observation-extraction-validation.ts:183-257`
6. If some fragments fail evidence validation, the runtime attempts an LLM repair pass.
   Evidence: `src/cognition/observation/llm-observation-extractor.ts:440-561`
7. Repair can:
   - replace evidence
   - downgrade uncertainty
   - drop the fragment
   Evidence: `src/cognition/observation/llm-observation-extractor.ts:91-102`, `200-206`, `472-473`
8. The normalized payload is passed through semantic policy.
   Evidence: `src/cognition/observation/llm-observation-extractor.ts:563-600`
9. If semantic policy returns `reject_interpretive` or `defer_insufficient_evidence`, the LLM path is abandoned and capture falls back to the deterministic scaffold.
   Evidence: `src/cognition/observation/llm-observation-extractor.ts:581-585`, `app/capture/page.tsx:63-69`
10. The fallback scaffold builds a single summary plus sentence-derived fragments.
    Evidence: `src/cognition/observation/descriptive-observation-scaffold.ts:172-229`
11. The chosen payload is persisted as one observation row plus fragment rows.
    Evidence: `src/infrastructure/supabase/repositories/observation-supabase-repository.ts:31-50`
12. The observation API returns that persisted observation bundle.
    Evidence: `app/api/reflective-objects/[id]/observations/route.ts:76-93`

### Preservation-loss points by stage

#### A. Prompt schema stage

The prompt requires one JSON object with one `summary` and one `fragments` array, not a list of independent observations.

Loss tendency:

- early bundling
- top-level compression
- fragment subordinate to summary

Evidence:

- `src/cognition/observation/llm-observation-extractor.ts:32-66`

#### B. Prompt instruction stage

The prompt says to prefer the more specific phenomenological category and use broad categories only when needed.

Why this matters:

- it encourages category choice
- it does not encourage observation multiplication
- it subtly frames extraction as selecting the best category per fragment

Evidence:

- `src/cognition/observation/llm-observation-extractor.ts:179-180`

#### C. Structured normalization stage

Normalization rejects non-canonical categories, requires a non-empty summary, requires at least one fragment, and validates evidence snippets against source text.

Loss tendency:

- unsupported categories are never preserved
- paraphrased evidence can fail
- unmatched fragments are moved into the failing bucket

Evidence:

- `src/cognition/observation/observation-extraction-validation.ts:43-85`
- `src/cognition/observation/observation-extraction-validation.ts:172-176`
- `src/cognition/observation/observation-extraction-validation.ts:210-257`

#### D. Evidence repair stage

Repair is preservation-oriented compared to hard failure, but it still allows fragment dropping when exact local support is unavailable.

Loss tendency:

- unsupported observations disappear entirely
- repaired output is narrowed to fragments that can be defended by exact quote

Evidence:

- `src/cognition/observation/llm-observation-extractor.ts:200-206`
- `src/cognition/observation/llm-observation-extractor.ts:472-473`

#### E. Summary rebuild after repair

When repair happens, the final summary is rebuilt from surviving fragments.

Loss tendency:

- summary is rewritten as a concatenation of surviving fragment texts
- anything not represented by retained fragments disappears from the summary

Evidence:

- `src/cognition/observation/llm-observation-extractor.ts:224-234`
- `src/cognition/observation/llm-observation-extractor.ts:514`

#### F. Semantic policy stage

Semantic policy defers persistence when evidence is weak, when summary trace is missing, or when category coherence looks weak.

Loss tendency:

- observations can be excluded from durable persistence even if descriptively plausible
- phenomenological categories face extra cue-gate pressure

Evidence:

- `src/domain/observation/semantic-policy.ts:677-723`
- `src/domain/observation/semantic-policy.ts:701-709`

#### G. LLM fallback boundary

If the LLM path fails for timeout, provider error, invalid JSON, invalid categories, missing summary, missing fragments, evidence failure, interpretive output, or insufficient evidence, capture falls back to the deterministic scaffold.

Loss tendency:

- all richer extraction possibilities collapse to heuristic sentence classification
- output density becomes sentence-bound and category-singular

Evidence:

- `src/cognition/observation/llm-observation-extractor.ts:107-117`
- `src/cognition/observation/llm-observation-extractor.ts:616-643`
- `src/cognition/observation/llm-observation-extractor.ts:675-693`
- `app/capture/page.tsx:63-69`, `77-84`

#### H. Deterministic scaffold stage

The scaffold splits text into sentences, merges very short trailing fragments into the previous sentence, then assigns exactly one category per sentence using ordered heuristics.

Loss tendency:

- multiple observations inside one sentence are collapsed
- short detached details are merged into previous material
- one sentence gets one category, not many observations

Evidence:

- `src/cognition/observation/descriptive-observation-scaffold.ts:40-135`
- `src/cognition/observation/descriptive-observation-scaffold.ts:138-148`

#### I. Persistence shape

Persistence writes one observation row with one summary and many fragments.

Loss tendency:

- the durable unit is bundle-oriented, not observation-oriented
- downstream consumers naturally read a summarized bundle rather than a field of independent observations

Evidence:

- `src/domain/observation/types.ts:83-97`
- `src/domain/observation/types.ts:109-121`
- `src/infrastructure/supabase/repositories/observation-supabase-repository.ts:31-50`

---

## 2. Observation Unit

### Canonical target

The principle document says the canonical unit is a descriptive observation, not a scene, fragment, or category.

Evidence:

- `docs/runtime/lumira-observation-extraction-principle-v0.md`
- `docs/runtime/lumira-observation-extraction-contract-v1.md`

### Live runtime unit

The live runtime implicitly treats the unit as:

- one observation bundle per extraction pass
- containing one summary
- plus a flat array of category-tagged fragments

The bundle, not the independent observation, is the durable object.

Evidence:

- `src/domain/observation/types.ts:83-97`
- `src/domain/observation/types.ts:109-121`
- `src/infrastructure/supabase/repositories/observation-supabase-repository.ts:31-50`
- `app/capture/page.tsx:56-84`

### Secondary unit inside the bundle

Inside the bundle, the operative sub-unit is usually:

- one fragment
- one category
- one evidence snippet

Evidence:

- each fragment has a single `category` field, not multiple categories:
  `src/domain/observation/types.ts:70-81`
- the extractor schema also gives each fragment exactly one category:
  `src/cognition/observation/llm-observation-extractor.ts:46-63`

### What this means in practice

The current runtime does not naturally model:

- many independent observations as first-class top-level objects

It models:

- one summary-centered extraction bundle
- populated by category-coded evidence fragments

That is a meaningful mismatch with the preservation principle.

---

## 3. Observation Density

### Mechanism 1: Single-summary bundle shape

Why it exists:

- the extractor prompt and persistence contract are built around one observation payload
- the database write path expects one `CreateObservationInput`

What may be lost:

- multiple equally valid observation statements become subordinate details
- local descriptive richness is compressed into one top-level summary

Evidence:

- `src/cognition/observation/llm-observation-extractor.ts:32-66`
- `src/domain/observation/types.ts:109-121`

### Mechanism 2: Single-category fragment encoding

Why it exists:

- both LLM schema and fragment types require one category per fragment
- this makes validation and downstream use simpler

What may be lost:

- one evidence span can support actor, interaction, agency, atmosphere, and anomaly simultaneously
- the runtime pushes that richness toward one chosen label unless the extractor duplicates the span into multiple fragments

Evidence:

- `src/domain/observation/types.ts:70-81`
- `src/cognition/observation/llm-observation-extractor.ts:46-63`

### Mechanism 3: Category-first prompt pressure

Why it exists:

- the prompt is trying to force canonical runtime vocabulary and avoid category drift

What may be lost:

- extraction can become a best-fit labeling exercise
- the system is nudged to choose the most specific category rather than proliferate multiple observations from one span

Evidence:

- `src/cognition/observation/llm-observation-extractor.ts:179-180`

### Mechanism 4: Category alias normalization

Why it exists:

- to tolerate some LLM vocabulary drift while still landing in canonical categories

What may be lost:

- distinctions expressed in alternate wording are collapsed into runtime category buckets
- some descriptive nuance is normalized away at category level

Evidence:

- `src/cognition/observation/observation-extraction-validation.ts:43-75`

### Mechanism 5: Exact evidence validation

Why it exists:

- to enforce evidence-linked descriptive extraction
- to prevent hallucinated or paraphrased support

What may be lost:

- valid observations supported by loose paraphrase or cross-sentence synthesis can fail
- descriptive material without exact local quotation becomes fragile

Evidence:

- `src/cognition/observation/observation-extraction-validation.ts:148-149`
- `src/cognition/observation/observation-extraction-validation.ts:210-232`

### Mechanism 6: Repair-or-drop behavior

Why it exists:

- to salvage partially valid LLM outputs instead of failing the full extraction

What may be lost:

- unsupported but potentially real descriptive material gets dropped
- repaired output is only as dense as the fragments that survive exact evidence discipline

Evidence:

- `src/cognition/observation/llm-observation-extractor.ts:200-206`
- `src/cognition/observation/llm-observation-extractor.ts:472-473`

### Mechanism 7: Summary-trace requirement

Why it exists:

- to keep the summary grounded in extracted fragments

What may be lost:

- summaries that capture broader descriptive structure but do not token-overlap with fragment text are penalized
- missing trace can defer the whole payload

Evidence:

- `src/domain/observation/semantic-policy.ts:416-436`
- `src/domain/observation/semantic-policy.ts:701-709`

### Mechanism 8: Weak-evidence deferral

Why it exists:

- to avoid durable persistence of under-supported claims

What may be lost:

- atmosphere
- agency shading
- altered realism
- continuity seams
- ambiguous phenomenology

These are often exactly the kinds of observations that are descriptively important but evidence-fragile.

Evidence:

- `src/domain/observation/semantic-policy.ts:682-709`

### Mechanism 9: Category coherence cue checks

Why it exists:

- to prevent phenomenological categories from being assigned without direct support

What may be lost:

- subtle or multilingual expressions that do not match the cue bank cleanly
- valid phenomenology can be downgraded into uncertainty or deferral

Evidence:

- `src/domain/observation/semantic-policy.ts:355-404`
- `src/domain/observation/semantic-policy.ts:584-616`
- `src/domain/observation/semantic-policy.ts:677-723`

### Mechanism 10: Deterministic scaffold sentence heuristic

Why it exists:

- safe fallback when LLM extraction fails

What may be lost:

- intra-sentence multiplicity
- cross-sentence phenomenology
- compound observations
- implicit continuity relations

Evidence:

- `src/cognition/observation/descriptive-observation-scaffold.ts:138-148`
- `src/cognition/observation/descriptive-observation-scaffold.ts:40-135`

### Mechanism 11: Fallback summary compression

Why it exists:

- the scaffold emits a stable generic summary regardless of dream content

What may be lost:

- dream-specific descriptive density at the top level
- phenomenological specificity in the persisted summary itself

Evidence:

- `src/cognition/observation/descriptive-observation-scaffold.ts:223-228`

---

## 4. Multi-Observation Support

### Does the architecture naturally support:

`one evidence span -> multiple observations`?

Only partially, and not naturally.

### Why the answer is only partial

The LLM could duplicate the same snippet across multiple fragments, each with a different category. Nothing in the schema absolutely forbids this.

But the architecture does not represent this directly as:

- one evidence span
- many independent observation objects

Instead it represents:

- many flat fragments
- each fragment with one category
- all nested under one summary bundle

Evidence:

- `src/cognition/observation/llm-observation-extractor.ts:46-63`
- `src/domain/observation/types.ts:70-81`

### What the architecture implicitly prefers

The live system implicitly prefers:

`one fragment/sentence/evidence snippet -> one category assignment`

Strongest evidence for this:

1. the fragment schema is single-category
2. the prompt says to prefer the more specific category
3. the fallback scaffold assigns exactly one category per sentence

Evidence:

- `src/cognition/observation/llm-observation-extractor.ts:179-180`
- `src/cognition/observation/descriptive-observation-scaffold.ts:40-135`

### Deterministic fallback example

If one sentence contains:

- motion
- pursuit
- fear
- blocked agency
- impossible space

the fallback scaffold still returns one category from its ordered checks, not five observations.

That means fallback mode is structurally one-sentence-to-one-label.

Evidence:

- `src/cognition/observation/descriptive-observation-scaffold.ts:40-135`

### LLM-path example

The LLM path is more flexible than the scaffold, but still shaped as:

- one summary
- one fragment array
- one category per fragment

This allows multiplicity only by repetition, not by first-class observation modeling.

Evidence:

- `src/cognition/observation/llm-observation-extractor.ts:32-66`

---

## 5. Phenomenology Coverage

### Structural bias assessment

The current extractor is structurally biased toward:

- actors
- objects
- locations
- interactions

and only conditionally sensitive to:

- agency states
- atmosphere
- metacognition
- dream anomalies
- altered realism
- spatial instability

### Why structure is favored

#### 1. Bundle shape favors summary plus fragment inventory

This makes the runtime comfortable with item-like extraction.

#### 2. Fallback scaffold uses ordered lexical heuristics

If LLM extraction fails, the scaffold routes sentences through a category ladder that strongly includes location, actor, interaction, object, emotion, transition, and only some phenomenology classes.

Evidence:

- `src/cognition/observation/descriptive-observation-scaffold.ts:40-135`

#### 3. Many phenomenological categories require explicit cue matches

Agency, metacognition, atmosphere, spatial instability, dream-state quality, continuity fragment, and altered realism all depend on cue banks in semantic policy.

Evidence:

- `src/domain/observation/semantic-policy.ts:355-404`

### Where phenomenology is likely strongest

Likely strongest phenomenology classes:

- `agency_state`
- `metacognitive_moment`

Reason:

- both are explicitly privileged in the LLM prompt
- both have dedicated cue checks in semantic policy

Evidence:

- `src/cognition/observation/llm-observation-extractor.ts:181-183`
- `src/domain/observation/semantic-policy.ts:355-360`

### Where phenomenology is likely weakest

Likely weakest:

- `affective_atmosphere`
- `spatial_instability`
 - especially when described indirectly
- `altered_realism`
 - especially if the dream text uses unusual wording
- `continuity_fragment`
 - when discontinuity is implicit rather than named

Reason:

- these depend on narrower phrasing
- they are easier to miss under single-category selection pressure
- they are vulnerable to weak-evidence deferral

Evidence:

- `src/domain/observation/semantic-policy.ts:384-404`
- `src/domain/observation/semantic-policy.ts:677-709`

### Metacognition and dream anomaly note

The LLM prompt explicitly instructs the model to use:

- `metacognitive_moment`
- `dream_state_quality`
- `altered_realism`
- `spatial_instability`
- `continuity_fragment`

That is a real structural improvement over pure structural tagging.

But because the runtime then validates exact evidence, category coherence, and summary trace, those categories remain more fragile than structure classes.

Evidence:

- `src/cognition/observation/llm-observation-extractor.ts:181-191`
- `src/domain/observation/semantic-policy.ts:677-709`

---

## 6. Benchmark Readiness

Using the benchmark philosophy, not benchmark implementation, the likely readiness profile is:

### Strongest: structure

Why:

- locations, actors, objects, and broad interactions fit the current bundle-and-fragment architecture well
- deterministic fallback also handles these relatively easily
- even reduced extraction tends to preserve some structural inventory

Evidence:

- `src/cognition/observation/descriptive-observation-scaffold.ts:96-132`

### Second strongest: relations

Why:

- `interaction` and `transition` are available in both LLM and fallback modes
- relation preservation is still reduced by single-category assignment, but broad event structure survives better than subtle phenomenology

Evidence:

- `src/cognition/observation/descriptive-observation-scaffold.ts:108-116`

### Weaker: phenomenology

Why:

- phenomenology is present in the prompt and vocabulary, but more fragile at runtime
- exact evidence checks, cue dependence, and one-category pressure make it easy to under-preserve atmosphere, altered realism, and layered agency states

Evidence:

- `src/cognition/observation/llm-observation-extractor.ts:179-191`
- `src/domain/observation/semantic-policy.ts:355-404`
- `src/domain/observation/semantic-policy.ts:677-709`

### Weakest: continuity

Why:

- continuity material is structurally treated as tentative
- recurrence semantics are explicitly hardened and can trigger deferral
- continuity often depends on weak or indirect cues that are precisely the kinds of material the runtime is cautious about persisting

Evidence:

- `src/domain/observation/semantic-policy.ts:548-568`
- `src/domain/observation/semantic-policy.ts:682-709`

### Benchmark risk summary

Likely benchmark profile:

- `structure`: strongest
- `relations`: moderate to strong
- `phenomenology`: moderate to weak
- `continuity`: weakest

This is consistent with the benchmark’s stated failure concerns:

- over-summarization
- entity-only extraction drift
- missed atmosphere
- missed agency
- missed anomalies
- missed continuity candidates

---

## Preservation Bottlenecks

The most important bottlenecks are:

### 1. Bundle-first persistence

One top-level record with one summary compresses descriptive multiplicity early.

### 2. Fragment single-category design

A fragment can only directly express one category at a time.

### 3. Exact evidence discipline

Good for safety and traceability, but hostile to fragile phenomenology and paraphrased support.

### 4. Semantic-policy deferral

Weak evidence and missing trace do not degrade gracefully into tentative preservation; they often block durable persistence on the LLM path.

### 5. Deterministic scaffold fallback

Fallback is safe but aggressively reductive:

- sentence-bound
- category-singular
- generic-summary

### 6. Category-preference prompting

The prompt constrains vocabulary successfully, but also nudges the extractor toward selecting the best category instead of preserving multiple valid observations.

---

## Likely Observation-Loss Points

Most likely loss points in order of impact:

1. LLM output never generates multiple fragments for one rich evidence span.
2. Evidence validation rejects paraphrased or weakly localized support.
3. Repair drops unsupported fragments.
4. Semantic policy defers phenomenology-heavy fragments as weak/coherence-risk material.
5. Capture falls back to scaffold mode.
6. Scaffold assigns one sentence one category.
7. Bundle summary compresses what remains.

---

## Final Assessment

The current Lumira Observation pipeline is no longer a pure structural extractor. It has meaningful phenomenological ambition in:

- prompt design
- category vocabulary
- semantic-policy cue support

But its preservation architecture still behaves more like:

- validated categorized summarization

than like:

- maximal observation preservation

The central runtime mismatch is not that phenomenological categories are absent.

It is that the durable extraction unit and its validation/fallback machinery still encourage:

- bundle-level compression
- one-category fragmenting
- cautious omission of fragile observations

That makes the system more likely to preserve:

- who
- where
- what happened

than:

- how agency shifted
- how the dream felt
- how reality bent
- how continuity broke

Those are the main preservation pressures visible in the current pipeline.
