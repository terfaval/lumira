# Lumira Core Model Reframe

## Purpose

Define the canonical conceptual model for Lumira so future cleanup, redesign, and rebuild work can converge on one coherent product architecture.

This document is a specification-level reference, not an implementation ticket. It clarifies what each layer is for, how layers relate, and which principles constrain future design choices.

## Why This Reframe Exists

Alpha stabilization audits surfaced a structural gap: runtime complexity is not only technical debt, but also conceptual drift between systems built at different product-understanding stages.

Current friction includes:
- observation structure that is too shallow for reflective continuity,
- work generation that can become direction-locked and inflexible,
- overlap between anchors/index/glossary responsibilities,
- an overly narrow interpretation of "non-interpretive" behavior,
- and legacy systems built before the reflective model fully crystallized.

The reframe resolves this by defining a stable conceptual contract before deeper architecture simplification and post-alpha redesign.

## Alpha Stabilization vs Long-Term Direction

Alpha stabilization and long-term reflective intelligence are separate tracks:

- Alpha stabilization protects current core-flow reliability (`session -> observe -> frame -> direction -> work -> answer -> revisit`) and reduces runtime fragility.
- Long-term direction redesigns observation quality, latent cognition, glossary continuity, and adaptive reflective dialogue.

The key rule is sequencing: stabilize first, redesign second. This document defines the target conceptual model for redesign without requiring runtime disruption during alpha hardening.

---

# Core System Layers

## 1. Dream Entry Layer

### Purpose

Capture user-provided material as the primary ground truth for any downstream processing, while preserving user voice, ambiguity, and context.

### Types of user material

- raw dream description
- dream interpretation/reflection
- emotions/associations
- waking-life connections
- mixed entries

### Why this distinction matters

Different entry types carry different evidential and reflective roles. Raw dream description supports descriptive observation fidelity; reflective commentary contributes metacognitive context; emotional and waking-life links shape reflective direction but do not retroactively rewrite dream events. Treating these as distinct channels improves traceability and reduces hidden inference errors.

---

## 2. Observation Layer

### Core question
"What happened in the dream?"

### Observation goals

- Produce a high-fidelity descriptive map of dream content.
- Preserve chronology, scene transitions, and interaction structure.
- Represent affect, embodiment, and agency signals without causal claims.
- Keep evidence traceable to user-provided material.

### Future redesign direction

Observation should evolve from a flat extraction artifact into a richer descriptive state model that supports:
- stable event sequencing,
- actor-role tracking,
- context-preserving scene transitions,
- and explicit uncertainty markers where details are ambiguous.

The redesign target is stronger descriptive resolution, not interpretive certainty.

### Structural dimensions

Include:
- events
- actors
- locations
- objects
- interactions
- affect
- embodiment
- agency
- phenomenology
- metacognition/lucidity
- dream-state structure

### Scientific foundations

Include:
- Hall-Van de Castle
- dream phenomenology
- lucid/metacognitive research

These traditions support systematic descriptive coding, subjective experience representation, and lucid-awareness distinctions without requiring deterministic interpretation.

### Important constraint

Observation is descriptive, not authoritative interpretation.

---

## 3. Latent Interpretive Layer

### Core question
"What may be psychologically or reflectively interesting here?"

### Role

Generate internal reflective hypotheses that can guide framing, direction selection, and question generation while preserving uncertainty and user autonomy.

### Interpretive principles

Must include:
- probabilistic
- multi-hypothesis
- traceable
- revisable
- non-final
- evidence-linked

Interpretive outputs are working hypotheses, not conclusions. They must preserve links to observation evidence and remain retractable when user feedback or later sessions contradict earlier assumptions.

### Example hypothesis structure

- `hypothesis`: A possible reflective pattern (for example, boundary pressure in social scenes).
- `evidence`: Observation-linked events, affect, and agency signals.
- `confidence_band`: Low/medium/high plausibility, never certainty.
- `alternatives`: Competing explanations held in parallel.
- `disconfirmers`: What user material would weaken this hypothesis.
- `dialogue_use`: How this hypothesis may shape optional reflective prompts.

### Important constraint

Latent analysis is internal reflective cognition, not externally asserted truth.

### Scientific foundations

Include:
- Continuity Hypothesis
- affect regulation research
- threat simulation
- predictive processing
- narrative identity / self-model theories
- attachment / relational dynamics

These foundations justify hypothesis generation as structured reflective support, not diagnosis and not symbolic determinism.

---

## 4. Reflective Dialogue Layer

### Core question
"How do we speak to the user about this?"

### Communication principles

Must include:
- non-authoritative
- autonomy-preserving
- invitational
- reflective
- non-colonizing
- non-diagnostic

Dialogue should convert internal model uncertainty into clear user-facing openness: options over declarations, questions over conclusions, and reflective pacing over interpretive closure.

### Good vs bad examples

Good:
- "One possible thread is how your sense of control changed across scenes. Would you like to explore that, or stay with the emotional atmosphere first?"
- "I can suggest a few ways to reflect on this dream, and you can choose what feels relevant."

Bad:
- "This dream means you fear abandonment."
- "Your unconscious is telling you to make a specific life decision."
- "This symbol always indicates unresolved trauma."

---

## 5. Glossary Layer

### Purpose

Provide a user-centered continuity memory across sessions that tracks recurring motifs and experiential patterns in the user's own context.

Define glossary as:
- personal recurring motif index,
- cross-session memory,
- user-guided symbolic continuity layer.

### Important distinction

Glossary is NOT:
- a universal symbol dictionary,
- a fixed interpretation engine.

Its meaning model is personal and revisable. Terms become useful through recurrence plus user framing, not by importing external symbolic authority.

### Entry categories

Include:
- people
- places
- objects
- beings
- recurring dream phenomena
- recurring experiential states
- relational patterns

### Candidate vs pinned

- `candidate`: system-suggested recurring item with provisional status and low authority.
- `pinned`: user-confirmed continuity item with higher reuse priority in reflective context.

Promotion from candidate to pinned should be user-driven, not automatic certainty inference.

### User notes

User notes are first-class meaning context. They can refine, narrow, contradict, or retire prior system assumptions and should be preserved as part of interpretive traceability.

### Surface control / do_not_surface

Glossary entries require explicit surfacing controls, including `do_not_surface`, so users can keep continuity memory without forced appearance in reflective dialogue.

### How glossary participates in:
- frame
- directions
- work cards

Glossary should act as contextual memory and optional weighting signal:
- `frame`: may inform continuity-sensitive phrasing.
- `directions`: may affect ranking of reflective pathways.
- `work cards`: may support recurrence-aware questioning.

### Important rule

Glossary may contextualize the current dream but must never override it.

---

## 6. Work Layer Reframe

### Current problem

Current behavior risks:
- overly rigid direction-locking,
- premature exhaustion,
- low flexibility.

Linear progression can constrain reflective depth when user responses indicate a better exploratory path than the initially selected direction.

### Future direction

Work should evolve toward:
- freer reflective exploration,
- hybrid direction weighting,
- adaptive questioning,
- recurrence-aware questioning,
- emotional/agency exploration,
- cross-session continuity,
- reflective rather than linear progression.

The system should treat direction as a dynamic influence, not a hard corridor.

### Important constraint

The system should support exploration without forcing interpretation closure.

---

## 7. Highlights Layer

### Purpose

Capture explicit user-marked salience signals that identify what felt meaningful, intense, unresolved, or worth revisiting.

### Why highlights are important

Include:
- user validation signal
- attention weighting
- cross-session learning
- reflective significance markers

Highlights improve model alignment by privileging user-indicated significance over purely system-derived relevance estimates.

### Important principle

User emphasis has higher interpretive value than system guesswork.

---

## 8. Anchors / Index / Glossary Relationship

### Current state

Anchors, indexing artifacts, and glossary memory all represent recurrence and structure, but at different abstraction levels and with partially overlapping responsibilities.

### Why overlap exists

Overlap emerged from staged evolution:
- early runtime components prioritized immediate orchestration utility,
- later components added user-facing continuity and richer reflective memory,
- and intermediate systems were not fully consolidated under one conceptual model.

### Likely future direction

A likely direction is:
- anchor/index systems remain internal support structures for extraction, ranking, and retrieval,
- glossary becomes the primary user-facing continuity layer.

Do not prescribe implementation yet.

---

## 9. Dream Typology Direction

Future direction may include optional descriptive typology layers such as:
- dream family classification,
- recurring dream types,
- experiential/state categories,
- threat/social/agency typologies,
- lucid/metacognitive classifications.

Any typology must remain:
- descriptive,
- non-authoritative,
- optional,
- non-diagnostic.

Typology is a reflective navigation aid, not a claim of objective dream truth.

---

## 10. Research Foundations Map

Lumira draws from multiple research traditions as conceptual influences, not as clinical or diagnostic authority.

| Layer | Foundations |
|---|---|
| Observation | Hall-Van de Castle, dream phenomenology |
| Cross-session | Continuity Hypothesis |
| Agency/reaction | Threat simulation, lucid/metacognitive research |
| Emotional layer | Affect regulation research |
| Latent analysis | Narrative identity, predictive processing, attachment/relational research |

---

## 11. Alpha vs Post-Alpha

### Alpha focus

- runtime stabilization
- cleanup
- core-flow reliability
- reducing architectural chaos

### Post-alpha direction

- observation redesign
- latent cognition redesign
- glossary evolution
- work-engine redesign
- reflective intelligence systems

This boundary prevents conceptual ambition from destabilizing alpha reliability.

---

## 12. Open Questions

- How should uncertainty be represented in observation artifacts so downstream layers can use it without overconfidence?
- What is the minimum user interaction model for candidate-to-pinned glossary promotion that preserves autonomy without adding friction?
- How should highlights and glossary interact when user emphasis conflicts with recurrence frequency?
- What guardrails should govern when latent hypotheses are withheld versus surfaced as optional reflective prompts?
- How should adaptive work sequencing balance novelty, continuity, and emotional pacing?

---

## 13. Non-Goals

Lumira is:
- not therapy
- not diagnosis
- not symbolic truth engine
- not universal dream dictionary
- not authority over dream meaning

The product supports reflective inquiry; it does not deliver clinical judgment, definitive symbolic interpretations, or prescriptive life conclusions.

---

## 14. One-Sentence Product Definition

Lumira is a reflective dream-dialogue system that uses traceable, revisable internal hypotheses to support user-led meaning making without claiming authoritative interpretation.
