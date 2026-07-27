# LUMIRA BACKEND V2 — CONCEPTUAL ARCHITECTURE v0

## Status

Canonical conceptual architecture document.

This document defines:

* the purpose of the backend,
* the role of each major cognition layer,
* information flow between layers,
* ownership boundaries,
* validation philosophy,
* and the long-term architectural direction.

This document is:

* conceptual,
* philosophical,
* cognition-oriented.

This document is NOT:

* a schema specification,
* an implementation plan,
* an API contract,
* a migration guide,
* or a rollout plan.

---

# 1. Foundational Premise

Lumira was founded on a simple idea:

> Dreams are a privileged path toward understanding the unconscious.
>
> Lumira is a companion that accompanies the user along that path.

The purpose of the backend is therefore not to classify dreams.

It is not to explain dreams.

It is not to generate interpretations.

Its purpose is:

* to preserve dream material,
* organize dream material,
* support reflective exploration,
* maintain continuity over time,
* and help users gradually understand themselves through ongoing interaction with their dreams.

The system exists to support reflective understanding.

Not interpretive authority.

---

# 2. Core Architecture Philosophy

Lumira should be understood as a reflective cognition system.

Not a processing pipeline.

The layers are not independent features.

They are different roles within a shared reflective organism.

Each layer answers a different question.

---

# 3. Core Backend Layers

## Dream Entry

Question:

> What did the user experience?

Dream Entry is the canonical source material.

Everything else derives from it.

The original dream remains the highest-fidelity representation of the experience.

No downstream layer may replace or override the dream itself.

---

## Observation

Question:

> What appears in the dream?

Observation is the descriptive foundation layer.

Observation does not ask:

> What does this mean?

Observation identifies and structures material that is present within the dream.

Observation may include:

* actors
* locations
* objects
* interactions
* social dynamics
* agency states
* emotional transitions
* bodily experiences
* dream-state qualities
* metacognitive moments
* phenomenological characteristics
* recurrence candidates
* continuity-relevant structures

Observation remains:

* evidence-linked
* descriptive
* non-authoritative
* uncertainty-aware

Observation may be informed by dream research traditions.

Observation does not produce meaning.

Observation does not produce conclusions.

Observation does not produce reflective advice.

Observation exists to create a structured representation of dream material that later layers can reason about.

---

## Salience

Question:

> What stands out within this dream?

Salience identifies prominence.

It does not identify meaning.

Salience may be influenced by:

* emotional intensity
* repetition
* unusualness
* conflict
* agency disruption
* metacognitive significance
* dream-state shifts
* user attention
* user highlights

Salience determines:

* what deserves attention,
* not what deserves interpretation.

---

## Latent Cognition

Question:

> What hypotheses may help explain this material?

Latent Cognition is the internal reflective reasoning layer.

This layer is allowed to be interpretive internally.

It may generate:

* hypotheses
* tensions
* continuity models
* recurrence models
* agency models
* relational models
* emotional models
* alternative readings

Latent is not a truth engine.

Latent is a hypothesis engine.

All latent outputs remain:

* probabilistic
* revisable
* competing
* uncertainty-aware

Multiple hypotheses may coexist.

Contradictory hypotheses may coexist.

No latent output becomes truth automatically.

---

# 4. Hypothesis Validation Principle

A critical Lumira principle:

Latent hypotheses are not validated by the system.

They are only tested through reflective interaction with the user.

Validation occurs through:

* user responses
* reflective writing
* user corrections
* user disagreement
* user resonance
* user-created meaning

The user remains the final authority.

Latent may propose.

The user may confirm, reject, modify, or ignore.

---

## Opening

Question:

> What reflective invitation may be worth surfacing?

Openings are user-facing projections of latent cognition.

An Opening is:

* small
* optional
* uncertainty-aware
* emotionally safe

An Opening does not expose raw latent reasoning.

An Opening translates reflective possibility into reflective invitation.

Openings are not:

* tasks
* conclusions
* diagnoses
* recommendations

Their purpose is to initiate reflective movement.

---

## Thread

Question:

> What reflective path is unfolding?

Threads are reflective process structures that can participate in continuity across time.

A thread begins when an Opening, dream element, motif, highlight, memory, or user question gains reflective gravity.

A thread is:

* revisitable
* evolving
* non-linear
* user-shaped

Threads are not workflows.

Threads are not questionnaires.

Threads are not completion systems.

Threads exist to support reflective exploration over time.

---

## User Reflection

Question:

> What does the user discover?

User reflection is the primary source of meaning within Lumira.

Not AI outputs.

Not latent models.

Not system-generated narratives.

The user remains the owner of:

* meaning
* interpretation
* significance
* pacing

This layer is the primary validation mechanism of the system.

---

## Glossary

Question:

> What deserves long-term continuity memory?

Glossary is personal dream memory.

Not symbolic authority.

Not interpretation storage.

Not universal dream symbolism.

Glossary stores:

* recurring people
* recurring places
* recurring objects
* recurring events
* recurring experiential states
* recurring relational structures
* user notes
* user associations

Glossary is a continuity system.

Not a meaning system.

The user may strengthen, annotate, or ignore glossary elements.

User ownership remains primary.

---

# 5. Information Flow

Conceptually:

Dream Entry

↓

Observation

↓

Salience

↓

Latent Hypotheses

↓

Opening

↓

Thread

↓

User Reflection

↓

Glossary / Continuity Memory

↓

Future Dreams

The flow is not strictly linear.

Future dreams may influence:

* latent reasoning
* glossary relevance
* thread persistence and re-entry coherence
* salience weighting

The architecture is recursive rather than sequential.

---

# 6. Critical Distinctions

## Observation ≠ Meaning

Observation describes.

Observation does not explain.

---

## Salience ≠ Importance

Something may stand out.

That does not mean it is meaningful.

---

## Hypothesis ≠ Truth

Latent may suggest.

Latent may not conclude.

---

## Opening ≠ Recommendation

Openings invite attention.

They do not direct behavior.

---

## Thread ≠ Workflow

Threads explore.

They do not manage.

---

## Glossary ≠ Symbol Dictionary

Glossary preserves continuity.

It does not define meaning.

---

# 7. Long-Term Strategic Direction

Observation:

* richer descriptive structure

Salience:

* better attention modeling

Latent:

* stronger hypothesis generation

Openings:

* safer reflective invitations

Threads:

* deeper reflective continuity through durable reflective work

Glossary:

* richer personal memory

The long-term goal is not:

> better dream interpretation.

The long-term goal is:

> better reflective companionship.

---

# 8. Final Principle

Lumira should become progressively better at helping users explore the relationship between dreams, memory, emotion, identity, and lived experience.

However:

The system must never cross the boundary from:

> helping understand

to:

> claiming understanding.

The user remains the owner of meaning.

Always.
