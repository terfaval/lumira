# Latent Opportunity Discovery Model v0 Design

Date: 2026-06-20
Status: Proposed design, pending owner review
Scope: Introduce an explicit Discovery phase in the Backend V2 Latent Opportunity path without changing canon, persistence, or current implementation in this ticket

## Goal

Define the recommended architecture for a Latent Discovery model that separates:

```text
Discovery
```

from:

```text
Opportunity Construction
```

The purpose of Discovery is:

- identify potentially distinct reflective structures in the current dream,
- preserve multiplicity before convergence,
- keep dream evidence grouped enough to support later construction,
- and remain internal-only.

This design does not include:

- code changes,
- prompt changes,
- persistence changes,
- schema changes,
- validator changes,
- migrations,
- or user-facing UI exposure.

## Priority Order

This design follows the owner-provided priority order:

1. strongest long-term canon clarity
2. maximum discovery fidelity
3. minimal implementation risk

This means the design should prefer the correct primitive over the cheapest short-term patch, as long as it does not become a needlessly future-proofed monster.

## Product And Runtime Boundaries

### Discovery is internal-only

Discovery must not become a user-facing layer.

Discovery output must never appear directly in:

- Orientation UI,
- Deep Reflection UI,
- Openings,
- Threads,
- Reflections,
- or debugging-like payloads shown to the user.

Discovery exists to prepare later Latent work.

It is not a reflective object visible to the user.

### Discovery must not own later decisions

Discovery must not make:

- Opportunity identity decisions,
- lifecycle decisions,
- salience scoring decisions,
- final inclusion/exclusion decisions for the Opportunity Set,
- or opening/thread-facing language decisions.

Those remain the responsibility of Opportunity Construction and later lifecycle layers.

## Canon Basis

### Why Discovery is canon-aligned

The existing canon already implies Discovery as a real conceptual boundary.

#### Observation canon

The Observation Bundle is explicitly:

- scene-first,
- observation-centered inside each scene,
- evidence-linked,
- uncertainty-aware,
- and able to support downstream derived structures without making them primary memory.

Canonical flow:

```text
Dream
-> Scenes
-> Observations
-> Derived Structures
```

This strongly implies that downstream Latent work should be able to reason over preserved structure rather than immediately flattening toward a final result.

#### Opportunity canon

The Reflective Opportunity Contract states that:

- a dream may contain multiple Reflective Opportunities,
- Latent should preserve meaningful ambiguity whenever possible,
- and Opportunities may emerge from relationships between observations, relationships between scenes, scene transitions, tensions, contradictions, unresolved structures, and notable absences.

That is already Discovery-shaped language.

#### Construction canon

The Latent Opportunity Construction Model explicitly describes:

```text
Current Dream
-> Dream Analysis
-> Dream-Originated Opportunity Candidates
-> Context Analysis
-> Context-Revealed Opportunity Candidates
-> Opportunity Construction
-> Opportunity-Thread Linking
-> Final Opportunity Set
```

This is the strongest canon evidence that Discovery is not merely allowed, but already conceptually present.

### Canon assessment

Discovery is not absent from canon.

Discovery is:

- implied strongly,
- partially named,
- but under-specified as a runtime primitive and implementation boundary.

The current implementation appears to compress:

```text
Dream Analysis
+ Dream-Originated Opportunity Candidates
+ Context Analysis
+ Context-Revealed Opportunity Candidates
+ Opportunity Construction
```

into a single constructor call.

## Current Problem Statement

The current Latent V2 runtime path appears to do:

```text
Observation bundle
-> Latent constructor packet
-> One LLM constructor call
-> Validated Opportunities
```

This creates three pressures at once:

1. discover possible reflective structures
2. decide which ones are distinct enough to keep
3. construct final Opportunities in the required output shape

The likely failure mode is early convergence:

- one dominant structure gets selected quickly,
- weaker but still distinct structures never stabilize,
- and the final Opportunity Set under-represents the dream's available reflective richness.

## Design Question

The design question is not:

> Should Latent become more complicated?

The design question is:

> What is the smallest architecture that restores the canon-implied boundary between discovering distinct reflective structures and constructing final Reflective Opportunities?

## Architecture Options

### Option A - Two Separate LLM Passes

```text
Observation
-> Discovery Pass
-> Candidate Structures
-> Construction Pass
-> Opportunities
```

#### Strengths

- clean discovery/construction split
- easy to explain conceptually
- easy to test each pass separately
- aligns well with candidate language in the construction canon
- reduces pressure on the constructor to do every task at once

#### Weaknesses

- if it starts from the current mostly flat packet, Discovery still begins from weakened structure
- two calls increase latency and token cost
- candidate quality may still be constrained by packet loss before Discovery even begins

#### Token Cost

High relative to the other options.

#### Explainability

Strong.

You can inspect:

- what Discovery noticed,
- what Construction accepted,
- and what was not promoted.

#### Testing Impact

Good.

You can test:

- candidate multiplicity,
- candidate distinctness,
- and construction acceptance/rejection behavior independently.

#### Canon Alignment

Strong, but incomplete if the upstream packet still weakens scene and category structure.

### Option B - Single LLM Call With Internal Discovery Output

```text
Observation
-> One constructor call
-> {
  candidateStructures: [...],
  selectedOpportunities: [...]
}
```

#### Strengths

- lowest runtime expansion
- easiest migration from the current constructor
- better than the current design because discovery traces become visible internally

#### Weaknesses

- discovery and selection still happen in one optimization context
- candidate output may become decorative rather than operational
- weakest boundary clarity
- easier for the model to backfill candidate traces after already converging on final opportunities

#### Token Cost

Medium.

#### Explainability

Moderate.

Better than today, but weaker than a true staged architecture.

#### Testing Impact

Moderate.

You can validate that candidate traces exist, but not that Discovery acted independently.

#### Canon Alignment

Moderate.

It acknowledges Discovery, but does not fully honor the canon's candidate-stage separation.

### Option C - Structured Packet + Discovery + Construction

```text
Observation
-> Structured Discovery Packet
-> Discovery Pass
-> Construction Pass
-> Opportunities
```

The structured packet should explicitly preserve:

- scenes,
- scene boundaries,
- observation categories,
- transition signals,
- evidence grouping,
- and dream-local structural neighborhoods.

#### Strengths

- strongest canon clarity
- strongest discovery fidelity
- best match to scene-first Observation canon
- best chance of preserving multiple distinct reflective structures before competition begins
- strongest long-term base for Anchor, Opening, and Thread work

#### Weaknesses

- highest upfront design complexity
- requires packet-boundary work, not just prompt work
- creates more seams that need tests

#### Complexity

Higher than A and B.

But this is primitive-setting complexity rather than accidental complexity.

#### Testing Impact

Strongest.

You can test:

- packet preservation,
- candidate discovery,
- construction selection,
- and end-to-end multiplicity on long dreams.

#### Canon Alignment

Strongest.

This is the cleanest implementation of the canon that already describes:

- scene-first Observation,
- candidate-oriented Latent construction,
- and multiplicity-preserving reflective possibility.

## Recommended Option

### Recommendation

Recommend **Option C**.

### Why

Option C wins under the stated priority order.

#### 1. Canon clarity

Option C best respects the canon's implicit and explicit structure:

- Observation preserves scene-grounded descriptive memory.
- Latent construction canon already distinguishes candidate stages from final Opportunity construction.
- Reflective Opportunity canon emphasizes multiplicity, ambiguity preservation, and evidence-grounded structure.

Option C turns these ideas into a clean runtime boundary.

#### 2. Discovery fidelity

Option C is the only option that directly addresses both diagnosed failure sources:

- Discovery and selection currently fused together
- input structure partially weakened before construction

Separating Discovery without improving packet structure would help, but would still start from compromised inputs.

#### 3. Implementation risk

Option C is not the cheapest.

But in foundation phase, primitive correctness matters more than local convenience.

This recommendation still avoids overbuilding by keeping Discovery output minimal and internal-only.

## Discovery Output Proposal

Discovery should produce the minimum runtime output needed for later Opportunity Construction.

It should not be persistence-ready and should not carry identity/lifecycle/salience decisions.

### Minimum useful Discovery output

```text
Discovery Result
|- candidateStructures[]
   |- candidateId
   |- origin
   |- sceneRefs[]
   |- evidenceGroups[]
   |- provisionalStructureType
   |- structureSketch
   |- distinctnessRationale
   `- uncertainty
```

### CandidateStructure

#### candidateId

Ephemeral runtime id for internal processing only.

#### origin

One of:

- `dream_originated`
- `context_revealed`

This preserves the construction-model distinction without deciding final Opportunity legitimacy.

#### sceneRefs[]

References to the scenes most relevant to the candidate structure.

Discovery must remain able to say:

- this is local to one scene
- this spans multiple scenes
- this appears at a late scene transition

#### evidenceGroups[]

Evidence should remain grouped, not just listed.

Minimum conceptual grouping:

- one group per contributing scene or dream-local cluster
- each group contains observation refs and optional local boundary references

This keeps Discovery closer to the Observation canon's scene-first memory.

#### provisionalStructureType

A lightweight structural classification such as:

- relationship
- transition
- tension
- contradiction
- gap
- unresolved_pattern
- salience_signal
- search_structure
- repair_sequence

This is provisional and internal.

It is not yet the final Opportunity category decision.

#### structureSketch

A minimal non-user-facing structural sketch.

Examples:

- nodes
- simple relations
- tension pairs
- gap statements

This exists to preserve what was noticed, not to finalize the Opportunity object.

#### distinctnessRationale

A short internal explanation of why this candidate is separate from nearby candidates.

This is important because the failure mode being addressed is over-convergence.

#### uncertainty

Internal notes about ambiguity, weak support, overlap, or incomplete structure.

Uncertainty belongs in Discovery because the system must preserve ambiguity before Construction decides what to promote.

### Discovery output must not include

- Opportunity identity reuse decisions
- lifecycle state
- credibility score
- reflective potential score
- salience band
- user-facing summaries
- opening phrasing
- thread linkage decisions

Those belong later.

## Construction Boundary Proposal

Yes, the boundary should exist explicitly.

### Discovery asks

```text
What potentially distinct reflective structures exist?
```

Discovery is responsible for:

- noticing candidate structures
- preserving multiplicity
- preserving local evidence grouping
- preserving uncertainty
- preserving distinctness boundaries

### Construction asks

```text
Which of these become Reflective Opportunities?
```

Construction is responsible for:

- deciding whether a candidate is sufficiently credible
- deciding whether a candidate has enough reflective potential
- deciding whether multiple candidates stay separate
- assigning final Opportunity structure
- assigning primary and secondary categories
- making identity reuse vs create-new decisions
- generating manifestation summaries
- shaping persistence-ready evidence blocks

### Why this boundary matters

Without this boundary:

- candidate multiplicity competes immediately with final-output pressure
- ambiguous late or weaker structures lose out early
- the system is biased toward one dominant structure

With this boundary:

- Discovery can remain generous and ambiguity-preserving
- Construction can remain conservative and evidence-governed

That is a healthier division of responsibility.

## Relationship To Future Layers

### Anchor compatibility

Anchor work will likely benefit from pre-construction structural neighborhoods.

Discovery candidates can later help answer:

- what local structure exists here?
- what evidence cluster belongs together?

without forcing Anchors to re-discover from fully flattened Opportunity outputs alone.

### Opening compatibility

Openings should continue to derive from constructed Opportunities, not raw Discovery candidates.

This keeps the user-facing invitation boundary clean.

### Thread compatibility

Threads should continue to attach to Opportunity identities and manifestations, not to Discovery candidates.

Discovery remains ephemeral.

Construction remains the gateway into durable reflective continuity.

## Real Dream Stress Test

Using the recently reviewed dense dream as a conceptual stress test:

Potential distinct structures included examples such as:

- workplace tension
- exclusion dynamics
- pollution -> cleansing
- healing attempts
- labyrinth exploration
- twin separation
- search structures
- helper emergence

The question is not whether these are valid interpretations.

The question is whether the architecture can preserve them as separate candidate structures before final Opportunity selection.

### Option A

Would improve discovery materially relative to the current path.

Why:

- it forces candidate generation before final Opportunity output

Why it may still fall short:

- if the packet remains partly flattened, category-blind, or weakly grouped, Discovery still begins from a compromised representation

### Option B

Would improve introspection more than discovery fidelity.

Why:

- candidates become visible internally

Why it may still fall short:

- the same call still optimizes toward a clean final set
- weak late-dream structures may still be omitted before internal candidate traces are fully meaningful

### Option C

Would most naturally improve this dream class.

Why:

- scene boundaries stay operational
- late-scene material can remain distinct rather than merely appended
- search structures can remain separate from exclusion structures
- healing and cleansing can remain separate from labyrinth or twin-search structures
- helper emergence can remain a late-scene candidate instead of being swallowed by an earlier dominant axis

Option C does not guarantee maximal multiplicity.

It does create the best conditions for honest multiplicity before Construction decides what survives.

## Risks

### Over-segmentation

Discovery may produce too many weak candidates.

Mitigation:

- keep Discovery permissive but bounded
- keep Construction conservative

### Hidden re-interpretation

Discovery could drift into proto-interpretation if structure sketches become too meaning-heavy.

Mitigation:

- keep Discovery language structural and non-user-facing
- forbid symbolic or psychological explanations in Discovery output

### Scope creep

Discovery could accidentally absorb identity, lifecycle, or salience decisions.

Mitigation:

- enforce boundary rules explicitly in design and later validation

### Premature persistence pressure

The team may be tempted to store Discovery output.

Mitigation:

- treat Discovery as runtime-internal only in v0

## Future Build Implications

If implemented later, this design implies:

- a Latent discovery packet composer distinct from or upstream of the final constructor packet
- a Discovery runtime contract
- separate tests for packet preservation, discovery multiplicity, and construction selection
- long multi-scene dream regressions
- downstream simplicity for Anchor/Openings because the upstream primitive is cleaner

It does not require:

- Discovery persistence
- Discovery UI surfacing
- lifecycle redesign
- Thread redesign
- Opening redesign

## Final Recommendation

Adopt the following conceptual Backend V2 Latent shape:

```text
Observation Bundle
-> Structured Discovery Packet
-> Latent Discovery
-> Candidate Structures
-> Opportunity Construction
-> Final Opportunity Set
```

With these hard rules:

- Discovery is internal-only
- Discovery is non-user-facing
- Discovery does not assign lifecycle
- Discovery does not assign identity reuse
- Discovery does not assign salience
- Construction remains the first layer that turns candidates into actual Reflective Opportunities

This is the strongest fit for Backend V2 canon, the best response to the multiplicity diagnosis, and the best foundation for future reflective layers.
