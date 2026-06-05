# Lumira Observation Extraction Contract v1

## Status

Draft — Runtime Contract

This document defines the target output of Observation extraction.

It specifies:

* what Observation should extract,
* what Observation should not extract,
* how extracted material should be structured,
* and what evidence requirements apply.

This document is intentionally independent from implementation.

It applies equally to:

* deterministic extraction,
* LLM extraction,
* hybrid extraction,
* and future extraction approaches.

---

# 1. Purpose

Observation exists to transform dream material into structured phenomenological evidence.

Observation does not attempt to determine meaning.

Observation does not attempt to explain.

Observation does not attempt to diagnose.

Observation does not attempt to infer hidden causes.

Observation answers:

# What appears here?

---

# 2. Extraction Principle

Observation should maximize:

* fidelity,
* specificity,
* traceability,
* and descriptive richness.

Observation should minimize:

* interpretation,
* abstraction,
* explanation,
* symbolic claims,
* and unsupported inference.

---

# 3. Observation Unit

The fundamental Observation unit is:

# An evidence-supported descriptive observation.

Each observation must satisfy:

```text
Observed
+
Describable
+
Evidence-linked
```

If evidence cannot be identified:

* uncertainty should increase,
* extraction confidence should decrease,
* or the observation should be omitted.

---

# 4. Canonical Observation Domains

Observation extraction should attempt to identify material from the following domains.

Not every dream requires every domain.

---

## 4.1 Scenes

Questions:

* What environments appear?
* What settings appear?
* What locations appear?
* What scene transitions occur?

Examples:

* school courtyard
* classroom
* staircase
* unknown building
* forest
* train station

---

## 4.2 Actors

Questions:

* Who appears?
* Which entities participate?
* Are they named, known, unknown, collective, human, non-human?

Examples:

* friend
* stranger
* teacher
* group of students
* animal
* dreamer

Observation does not infer identity significance.

---

## 4.3 Objects

Questions:

* What notable objects appear?

Examples:

* mirror
* key
* phone
* vehicle
* weapon
* book

Objects remain descriptive.

---

## 4.4 Interactions

Questions:

* What happens between actors?

Examples:

* conversation
* pursuit
* invitation
* attack
* assistance
* avoidance
* coercion
* observation

Interaction descriptions should remain behavioral.

---

## 4.5 Agency States

Questions:

* What can or cannot be done?

Examples:

* attempting escape
* unable to move
* hiding
* resisting
* following
* being controlled
* choosing
* refusing

Agency is one of the most important latent inputs.

---

## 4.6 Affect States

Questions:

* What emotional qualities are explicitly present?

Examples:

* fear
* curiosity
* embarrassment
* anger
* relief
* confusion

Only directly supported affect should be extracted.

---

## 4.7 Affect Transitions

Questions:

* Does emotional state change?

Examples:

```text
curiosity
→ anxiety
```

```text
fear
→ relief
```

```text
confidence
→ uncertainty
```

---

## 4.8 Bodily States

Questions:

* What bodily experiences appear?

Examples:

* running
* paralysis
* pain
* exhaustion
* bodily transformation
* physical contact

---

## 4.9 Spatial Phenomenology

Questions:

* Are there unusual spatial characteristics?

Examples:

* endless corridor
* shifting rooms
* impossible architecture
* unstable geography
* looping path

---

## 4.10 Dream-State Phenomenology

Questions:

* Does reality behave unusually?

Examples:

* mirror anomaly
* altered identity
* impossible event
* missing reflection
* time distortion
* dream awareness

---

## 4.11 Metacognitive Moments

Questions:

* Does awareness change?

Examples:

* realization
* recognition
* remembering
* noticing inconsistency
* lucid awareness

---

## 4.12 Continuity Candidates

Questions:

* What may become relevant for future continuity?

Examples:

* recurring place
* recurring actor
* recurring interaction
* recurring emotional pattern

Observation does not decide continuity.

Observation only records candidates.

---

## 4.13 Recurrence Candidates

Questions:

* What appears potentially recurring?

Examples:

* repeated location
* repeated actor
* repeated motif
* repeated situation

Observation records.

Later systems evaluate.

---

# 5. Evidence Requirement

Every extracted observation should contain evidence.

Preferred:

```json
{
  "evidence": [
    "nekem megint futni kell le a lépcsőn"
  ]
}
```

Less preferred:

```json
{
  "evidence": [
    "entire paragraph"
  ]
}
```

Evidence should be:

* local,
* specific,
* traceable,
* minimally sufficient.

---

# 6. Confidence

Observation confidence measures extraction confidence.

It does not measure truth.

High confidence:

```text
Explicitly stated.
```

Lower confidence:

```text
Requires mild descriptive inference.
```

Confidence must never be presented as certainty.

---

# 7. Uncertainty

Observation should preserve ambiguity.

Examples:

```text
Unknown male actor.
```

preferred over:

```text
Threatening authority figure.
```

when evidence is insufficient.

Uncertainty is a feature, not a failure.

---

# 8. Forbidden Outputs

Observation must never produce:

## Symbol Interpretation

Not allowed:

```text
Mirror symbolizes identity issues.
```

---

## Psychological Explanation

Not allowed:

```text
This reflects social anxiety.
```

---

## Diagnostic Claims

Not allowed:

```text
The dream indicates trauma.
```

---

## Personality Conclusions

Not allowed:

```text
The dreamer avoids confrontation.
```

---

## Archetypal Claims

Not allowed:

```text
This is a shadow figure.
```

---

## Spiritual Claims

Not allowed:

```text
This is a karmic message.
```

---

# 9. Observation Quality Test

A simple validation question:

> Could this observation be shown to the dream author without telling them what their dream means?

If yes:

Observation is probably valid.

If no:

Observation is probably interpretive.

---

# 10. Relationship to Latent

Observation supplies evidence.

Latent generates hypotheses.

Observation may say:

```text
A threatening interaction occurs.
```

Latent may later explore:

```text
This interaction may relate to an unresolved pattern.
```

Observation cannot perform Latent's role.

---

# 11. Relationship to Glossary

Observation may identify:

* recurring entities,
* recurring places,
* recurring situations,
* recurring descriptors.

Observation does not decide glossary membership.

Observation only supplies candidates.

---

# 12. Relationship to Threads

Observation may identify:

* unresolved situations,
* recurring structures,
* persistent tensions,
* continuity candidates.

Observation does not create threads.

Observation only provides raw material from which threads may emerge.

---

# 13. Definition of Success

A successful Observation extraction should allow a reader to reconstruct:

* what appeared,
* who participated,
* what happened,
* what changed,
* what felt unusual,
* and what may matter later,

without ever claiming to know what the dream means.
