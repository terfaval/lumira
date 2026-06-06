# Lumira Observation Runtime Redesign Plan v0

## Status

Planning document only.

This document proposes a migration path for the Observation runtime from:

```text
Observation Bundle
|- Summary
`- Category Fragments
```

toward:

```text
Observation Bundle
|- Descriptive Observations
|- Summary (derived)
`- Metadata
```

This document does not implement the redesign.
It does not define schema changes, API changes, or prompt changes.

---

## Ticket Framing

### Goal

- Preserve the existing one-bundle-per-dream container while making the descriptive observation the primary durable unit.
- Move summary from primary runtime object to derived orientation artifact.
- Keep Observation descriptive, evidence-linked, non-interpretive, and useful to downstream systems.
- Provide a migration path with explicit compatibility options.

### Touched Files

- New: `docs/runtime/planning/lumira-observation-runtime-redesign-plan-v0.md`

### Acceptance Criteria

- The current runtime model is summarized clearly.
- A target descriptive observation shape is proposed and justified field-by-field.
- The target bundle model, extraction flow, compatibility impacts, and migration options are defined.
- No code, schema, or implementation behavior is changed.

### Validation Plan

- Check the proposal against:
  - `docs/runtime/lumira-observation-extraction-principle-v0.md`
  - `docs/runtime/lumira-observation-runtime-target-v0.md`
  - `docs/runtime/lumira-descriptive-observation-contract-v0.md`
  - `docs/runtime/research/lumira-observation-benchmark-v0.md`
  - `docs/runtime/research/observation-preservation-audit-v0.md`
  - `docs/runtime/lumira-observation-category-role-map-v1.md`
- Check the impact section against current runtime boundaries visible in:
  - `src/domain/observation/types.ts`
  - `src/domain/observation/http-contract.ts`
  - `src/infrastructure/supabase/repositories/observation-supabase-repository.ts`
  - `src/cognition/glossary/extract-glossary-candidates-from-observations.ts`
  - `src/cognition/latent/latent-engine.ts`
  - `src/ui/reflective-space/reflective-space-workspace.tsx`
  - `app/api/reflective-objects/[id]/observations/route.ts`

### Rollback Plan

- Not applicable.
- This ticket creates planning documentation only.

---

## 1. Current Model

## Current Runtime Summary

The current runtime already has a durable container: one Observation Bundle per dream.

In practice, that bundle is modeled as:

- one top-level observation record
- one top-level summary
- many flat category-tagged fragments

The current system therefore behaves like:

```text
Dream Text
-> one extraction bundle
-> one summary-centered observation record
-> many fragments under that record
```

This is useful, but it centers the bundle and the summary rather than the individual descriptive observation.

The preservation audit identifies the main structural effects:

- early bundling
- early summarization
- single-category fragment pressure
- evidence fragility for subtle phenomenology
- fallback behavior that collapses rich material into sentence-level fragments

## Concepts That Can Remain Unchanged

The redesign does not need to replace the entire Observation system. These concepts can remain:

- one Observation Bundle per dream
- Observation as a descriptive, non-interpretive boundary
- evidence-linking as a hard requirement
- the existing category vocabulary as an organizational vocabulary
- the category role map as the conceptual reading layer
- phenomenology as valid first-class observation material
- continuity cues as preserved candidates rather than resolved continuity truth
- summary as a useful orientation artifact
- provenance, status, and boundary metadata as runtime concerns

## Concepts That Should Change

These parts are the actual redesign target:

- the primary durable unit should shift from `summary + fragments` to `descriptive observations`
- categories should organize observations rather than define extraction units
- summary should become derived from observations rather than primary input
- preservation should prefer keeping valid observations even when they share evidence
- bundle internals should model observation multiplicity directly

---

## 2. Target Observation Object

## Proposed Runtime Shape

```ts
type DescriptiveObservation = {
  id: string;
  text: string;
  language: "hu";
  category: ObservationCategory;
  role: "structure" | "relation" | "phenomenology" | "continuity";
  evidence: {
    spans: Array<{
      snippet: string;
      spanStart: number | null;
      spanEnd: number | null;
      contextLabel: string | null;
    }>;
    adequacy: "strong_span" | "snippet_only" | "weak_fallback";
  };
  position: number;
  uncertaintyNote: string | null;
};
```

## Why Each Field Exists

### `id`

The observation must be independently addressable inside the bundle.

Why it exists:

- observations become first-class runtime units
- downstream systems need stable references
- summary derivation, UI display, glossary generation, and continuity linking should be able to point to specific observations rather than only fragment positions

### `text`

This is the core descriptive statement.

Why it exists:

- the contract defines the observation as a user-facing descriptive statement
- the observation must stand alone
- reflection, UI, glossary, and continuity work should be able to consume the observation directly without reconstructing it from fragment internals

### `language`

The contract says current Lumira observations should be generated in Hungarian.

Why it exists:

- observation text is user-facing content
- the runtime should preserve the language requirement explicitly
- language should not be inferred later from mixed downstream use

### `category`

Each observation still needs one primary organizational dimension.

Why it exists:

- the contract explicitly includes category
- categories remain useful for indexing, retrieval, grouping, and downstream weighting
- a primary category keeps the observation legible without reducing it to summary text

This field should be read as organization, not justification for existence.

### `role`

This is the conceptual role class derived from the category role map.

Why it exists:

- it helps consumers distinguish structure, relation, phenomenology, and continuity material without overloading category names
- it preserves the layered reading model described in the role map
- it reduces repeated downstream reclassification work

This should be treated as a derived semantic helper, not a second extraction decision.

### `evidence.spans`

The observation must remain evidence-linked.

Why it exists:

- evidence-linking is part of the core principle and contract
- one observation may need one or more supporting spans
- multiple observations may share the same evidence span
- preserving spans directly supports auditability and future downstream reuse

Allowing `spans[]` is important because preservation should not force one-span-only behavior when the noticing is supported by more than one local passage.

### `evidence.adequacy`

The current runtime already distinguishes evidence strength.

Why it exists:

- downstream systems already react to evidence quality
- preservation should not erase support quality
- subtle observations can remain preserved while still being marked as weaker

This supports preservation without pretending all observations are equally well-supported.

### `position`

Observations should be ordered in bundle-local reading sequence.

Why it exists:

- summary derivation benefits from stable ordering
- UI can display observations in readable sequence
- downstream systems can preserve dream-local flow without rebuilding order from evidence offsets alone

### `uncertaintyNote`

The current runtime already preserves uncertainty material.

Why it exists:

- preservation sometimes requires keeping a plausible descriptive observation without overstating certainty
- subtle phenomenology and continuity seams are often better handled as preserved-with-uncertainty than dropped
- this supports graceful degradation rather than deletion

## Deliberate Omissions

The observation object should not contain:

- interpretation
- salience ranking
- thread identity
- latent center claims
- reflection suggestions
- meaning claims

Those remain downstream responsibilities.

---

## 3. Bundle Design

## Proposed Bundle Shape

```ts
type ObservationBundle = {
  id: string;
  reflectiveObjectId: string;
  userId: string;
  observations: DescriptiveObservation[];
  summary: {
    text: string;
    derivedFromObservationIds: string[];
  } | null;
  metadata: {
    source: ObservationSource;
    provenanceTier: ObservationProvenanceTier;
    semanticPolicyResult: ObservationSemanticPolicyResult;
    semanticPolicyReasons: string[];
    boundaryVersion: string;
    uncertaintyNotes: string[];
    status: "active" | "archived";
  };
};
```

## Relationship Between Bundle And Observations

The bundle remains the durable dream-local container.

Its responsibilities are:

- hold the ordered set of descriptive observations for one dream
- preserve bundle-level provenance and policy metadata
- provide a stable unit for API and persistence boundaries
- support downstream read models

The bundle is not the observation.
The bundle is the field in which observations are preserved.

## Relationship Between Observations And Categories

Each observation has one primary category.

That category should be understood as:

- an index
- a retrieval lens
- a grouping handle
- a downstream weighting hook

It should not be understood as:

- the thing that caused the observation to exist
- a requirement that one evidence span only produce one observation
- a reason to suppress equally valid cross-layer observations

In the target model:

- one evidence span may support many observations
- those observations may belong to different categories
- categories remain flat runtime vocabulary, while `role` gives the conceptual layer

## Relationship Between Observations And Summary

The summary becomes derived bundle orientation.

That means:

- observations are valid without the summary
- the summary is not allowed to contain claims unsupported by the observation set
- the summary should compress for orientation only, not replace the observation field

A good summary is:

- shorter than the observation set
- faithful to the observation set
- useful for quick orientation

A bad summary is:

- the primary durable representation
- the place where extra interpretation enters
- a substitute for preservation

## Why Metadata Stays At Bundle Level

Some information belongs to the extraction event rather than to each observation:

- source
- semantic policy result
- boundary version
- bundle-level uncertainty notes
- status

Keeping these at bundle level avoids unnecessary duplication and matches the current runtime's one-extraction-per-dream shape.

---

## 4. Extraction Flow

## Conceptual Flow

```text
Dream Text
-> Evidence-Preserving Reading
-> Descriptive Observation Set
-> Bundle Organization + Metadata
-> Derived Summary
-> Observation Bundle
```

## Stage 1: Evidence-Preserving Reading

The system reads dream material as observable material, not as a classification problem.

Primary questions:

- what appears
- what happens
- how it is experienced
- what changes
- what may matter later for continuity

This stage should prefer preservation over compression.

## Stage 2: Descriptive Observation Set

The first durable descriptive outputs should be observations, not summary fragments.

Rules:

- each observation captures one bounded noticing
- multiple observations may come from one evidence span
- phenomenology is equal to structure
- continuity cues are preserved as candidates only
- weak but useful observations should degrade into uncertainty rather than disappear when possible

## Stage 3: Bundle Organization + Metadata

Once observations exist, the runtime organizes them into the bundle.

This stage:

- orders observations
- assigns categories
- derives role classes
- attaches bundle-level policy and provenance metadata

Classification belongs here, after observation generation.

## Stage 4: Derived Summary

Only after the observation field exists should the summary be produced.

The summary should:

- orient a human quickly
- remain descriptive
- be faithful to the observation field
- never become the canonical source of additional claims

## Preservation Principle In The Flow

The redesign should preserve material in this priority order:

1. preserve a valid observation if evidence exists
2. preserve multiple observations when one span supports multiple noticings
3. preserve uncertainty when certainty is weak
4. derive summary last
5. allow downstream systems to reduce or weight later

---

## 5. Backward Compatibility

## Impact Overview

### APIs

Impact: High

Why:

- the current API returns `Observation` objects shaped around top-level `summary` and `fragments`
- write contracts parse `summary` plus flat `fragments`
- the read model assumes bundle-centered payloads rather than observation-first payloads

Compatibility concern:

- existing clients expect `summary` and `fragments`

### Persistence

Impact: High

Why:

- current persistence is split across one `observations` row and many `observation_fragments` rows
- the durable unit is still effectively bundle plus fragments
- bundle metadata and observation-level data are not currently separated the target way

Compatibility concern:

- persistence shape currently encodes the old runtime assumption directly

### Glossary Candidate Generation

Impact: Medium-High

Why:

- current glossary extraction iterates `observation.fragments`
- candidate generation uses fragment category and fragment text as source material

Compatibility concern:

- glossary generation would need an observation-first input or a compatibility projection from observations into legacy fragment-like cues

### Continuity

Impact: High

Why:

- continuity-sensitive material already relies on fragment category, evidence quality, and recurrence wording
- the current latent engine scores categories by iterating fragment lists

Compatibility concern:

- continuity logic currently treats fragment arrays as the descriptive substrate

### Reflection

Impact: Medium-High

Why:

- reflection-facing systems consume observation-derived latent and opening behavior indirectly
- any change in observation substrate affects what reflective opportunity can be surfaced downstream

Compatibility concern:

- even if reflection APIs do not read observations directly, their inputs and weighting logic will drift unless adapted

### UI

Impact: Medium

Why:

- current reflective-space UI shows `observations[0].summary` and a small slice of `fragments`
- the UI can adapt cleanly, but it is currently built around the legacy shape

Compatibility concern:

- the UI needs a new display model for direct observations, derived summary, and bundle metadata

## Practical Compatibility Conclusion

The redesign is not just a schema reshuffle.

It changes the center of gravity of the observation substrate.

Any system that currently means "fragment" when it says "observation" is affected.

---

## 6. Migration Options

## Option A: Minimal Change

### Shape

Keep the current bundle record and fragment persistence model.
Reclassify each fragment conceptually as a descriptive observation.
Keep summary where it is, but impose a rule that it is derived from the preserved fragment/observation set.

### Advantages

- lowest disruption
- smallest API and persistence changes
- easiest short-term compatibility

### Costs

- the system still behaves structurally like `summary + fragments`
- observations are not truly first-class runtime units
- shared evidence and observation multiplicity remain awkward
- the redesign goal is only partially achieved

### Best Use

- when delivery speed and migration safety matter more than model integrity

## Option B: Moderate Redesign

### Shape

Keep one bundle per dream.
Introduce first-class descriptive observations inside the bundle runtime contract.
Treat summary as explicitly derived.
Retain compatibility adapters that can project the observation set into legacy fragment-oriented consumers during transition.

### Advantages

- aligns runtime behavior with the extraction principle
- preserves the stable outer container
- supports migration without requiring every downstream consumer to change at once
- gives the cleanest path to observation-first APIs and UI

### Costs

- requires adapter logic during transition
- temporary duplication of concepts may exist
- persistence and downstream cognition layers still need coordinated migration

### Best Use

- when the goal is a real redesign with controlled migration risk

## Option C: Full Redesign

### Shape

Make descriptive observations the only primary durable units.
Treat bundles as projection containers assembled from first-class observations plus metadata.
Rebuild persistence, API contracts, and downstream consumers around observation-first primitives.

### Advantages

- strongest conceptual alignment
- best long-term model clarity
- cleanest support for shared evidence, derived summaries, and future observation reuse

### Costs

- highest migration cost
- highest compatibility risk
- largest impact on APIs, persistence, latent/continuity logic, glossary extraction, and UI

### Best Use

- when the team is willing to do a coordinated runtime boundary rewrite

## Recommended Direction

Recommend Option B.

Reason:

- Option A does not really solve the identified mismatch.
- Option C is structurally cleanest but too disruptive for the current runtime surface area.
- Option B preserves the stable outer bundle while moving the true durable center of gravity to descriptive observations.

---

## Final Recommendation

The redesign should preserve the Observation Bundle but redefine what the bundle contains.

The target model should be read as:

```text
one dream
-> one bundle
-> many descriptive observations
-> one derived summary
-> bundle metadata for provenance, policy, and status
```

This keeps what is already working:

- one bundle per dream
- descriptive boundary discipline
- category vocabulary
- evidence-linking

while changing what currently causes preservation loss:

- summary-first extraction
- fragment-first durability
- category-singular compression

The key migration principle is simple:

Observation should first preserve what can be noticed.
Only after that should the runtime organize, summarize, and project that material for later systems.
