# Lumira Observation Generation Strategy v1

## Status

Draft — Strategic Runtime Direction

This document defines:

* how Observation should be generated,
* why Observation generation is evolving,
* the relationship between Observation and Latent cognition,
* and the principles governing future Observation runtime design.

This document is:

* architectural,
* canonical,
* strategy-oriented.

This document is not:

* an implementation specification,
* a prompt definition,
* a schema contract,
* or a model selection document.

---

# 1. Purpose

The purpose of Observation is to create a descriptive representation of dream material that can support:

* reflective orientation,
* latent cognition,
* continuity detection,
* glossary memory,
* thread emergence,
* and reflective dialogue.

Observation exists to answer:

# “What appears here?”

not:

# “What does this mean?”

Observation is therefore the primary descriptive substrate of Lumira.

---

# 2. Core Shift

Earlier Lumira iterations treated Observation primarily as a lightweight extraction layer.

The emerging runtime direction requires something richer.

Observation is no longer understood as:

* sentence tagging,
* keyword extraction,
* or simple dream summarization.

Observation is now understood as:

# phenomenological structure extraction.

The purpose of Observation is to preserve the shape of experience.

---

# 3. Observation May Understand

A critical clarification:

# Observation may understand.

Observation must often understand:

* who is acting,
* who is being acted upon,
* what transitions occur,
* where agency increases or decreases,
* how affect changes,
* when continuity breaks,
* when dream-state anomalies appear,
* and how scenes relate to one another.

Without this level of understanding:

* continuity becomes weak,
* latent cognition becomes blind,
* and reflective openings lose grounding.

Understanding is therefore allowed.

---

# 4. Observation May Not Interpret

Understanding does not imply interpretation.

Observation must never cross into:

* symbolic claims,
* psychological conclusions,
* diagnostic language,
* personality claims,
* explanatory narratives,
* or asserted meaning.

Allowed:

> A threatening interaction occurs.

Not allowed:

> The dream reflects fear of authority.

Allowed:

> The dreamer attempts to leave and is unable to do so.

Not allowed:

> The dreamer struggles with autonomy.

Allowed:

> A mirror shows an unexpected image.

Not allowed:

> The mirror symbolizes identity instability.

Observation may describe.

Observation may not explain.

---

# 5. Observation and Latent

Observation and Latent have different responsibilities.

## Observation

Observation extracts:

* scenes,
* actors,
* locations,
* interactions,
* affective shifts,
* agency states,
* dream-state qualities,
* phenomenological structures,
* continuity candidates.

Observation remains evidence-linked.

Observation remains descriptive.

---

## Latent

Latent performs:

* continuity modeling,
* recurrence analysis,
* salience estimation,
* tension modeling,
* agency analysis,
* relational hypothesis generation,
* reflective center detection,
* opening generation support.

Latent is allowed to form:

# probabilistic hypotheses.

Observation is not.

---

# 6. Why LLM-Based Observation

The Observation layer is fundamentally a language-understanding problem.

Dream reports may contain:

* fragmented narration,
* unusual grammar,
* multilingual text,
* implicit actors,
* emotional ambiguity,
* and highly variable structure.

A purely deterministic extraction system eventually becomes:

* language-specific,
* maintenance-heavy,
* brittle,
* and difficult to scale.

Lumira therefore adopts the principle:

# Observation should be language-aware rather than language-specific.

LLM-based extraction provides:

* multilingual support,
* contextual understanding,
* flexible structure recognition,
* and richer phenomenological extraction.

without requiring language-by-language rule systems.

---

# 7. LLM-First Observation Runtime

Future Observation generation should follow:

```text
Dream Entry
    ↓
LLM Observation Extractor
    ↓
Observation Validation
    ↓
Semantic Policy
    ↓
Persisted Observation
    ↓
Latent Cognition
```

The LLM is responsible for extraction.

The runtime is responsible for validation.

---

# 8. Structured Extraction Requirement

The Observation extractor should never generate freeform interpretation.

Instead it should generate structured observation payloads.

Example categories may include:

* scenes
* actors
* locations
* objects
* interactions
* agency states
* affect transitions
* bodily states
* metacognitive moments
* dream-state qualities
* continuity hints
* recurrence candidates

All outputs must remain:

* evidence-linked,
* source-traceable,
* uncertainty-aware.

---

# 9. Evidence Discipline

Observation elements should remain connected to source material.

Each extracted element should ideally include:

* supporting fragment(s),
* source references,
* confidence estimates,
* uncertainty indicators when necessary.

Unsupported extraction should be:

* downgraded,
* marked uncertain,
* or removed.

Evidence remains more important than coverage.

---

# 10. Validation Layer

LLM output is not trusted automatically.

All generated observations should pass through validation systems.

Validation responsibilities include:

* schema validation,
* category validation,
* evidence validation,
* semantic-policy validation,
* anti-interpretation checks,
* provenance generation.

Validation exists to preserve runtime integrity.

---

# 11. Ambiguity Preservation

Observation should preserve ambiguity whenever possible.

When multiple descriptive readings exist:

* uncertainty should be retained,
* alternatives may coexist,
* premature certainty should be avoided.

The goal is not maximum extraction.

The goal is faithful extraction.

---

# 12. Relationship to Glossary

Observation may generate:

* recurrence candidates,
* motif candidates,
* continuity hints.

Observation does not create Glossary meaning.

Glossary remains:

# continuity memory.

Observation merely supplies descriptive material that may later become relevant.

---

# 13. Relationship to Threads

Observation does not create threads.

Observation may contribute:

* thread candidates,
* continuity signals,
* reflective centers,
* unresolved structures.

Thread identity emerges later through:

* latent cognition,
* user interaction,
* continuity history,
* highlights,
* responses,
* and recurrence.

---

# 14. Relationship to Reflective Dialogue

Observation never creates questions.

Observation never creates interpretations.

Observation never creates advice.

Observation only provides descriptive substrate.

Dialogue operates on transformed latent outputs.

---

# 15. Runtime Philosophy

The purpose of Observation is not intelligence.

The purpose of Observation is:

# fidelity.

A good Observation layer does not tell the user what their dream means.

A good Observation layer allows the rest of the runtime to perceive the dream clearly.

---

# 16. Long-Term Principle

Observation should become:

* richer,
* more phenomenological,
* more multilingual,
* more evidence-aware,
* and more structurally precise.

While remaining:

* descriptive,
* non-authoritative,
* ambiguity-preserving,
* and subordinate to user-owned meaning.

The Observation layer should understand dream material deeply enough to describe it faithfully.

It should never understand it deeply enough to claim ownership of its meaning.
