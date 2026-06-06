# Lumira Observation Processing Model v0

## Status

Draft

Runtime Cognition Model

This document defines the conceptual processing flow between:

* Observation
* Observation Salience
* Latent
* Reflection

Its purpose is to clarify cognitive boundaries and reduce responsibility overlap between runtime layers.

This document does not define implementation.

It does not define persistence.

It does not define API contracts.

It defines the intended flow of cognitive processing.

---

# Background

Recent Observation redesign work identified a recurring problem:

Observation, Latent, and Reflection often appear conceptually adjacent, but their responsibilities are not identical.

As a result, systems can drift toward:

* premature interpretation
* premature prioritization
* observation loss
* latent inflation

This document defines a processing sequence that preserves descriptive material before meaning-making begins.

---

# Core Principle

The Lumira cognitive pipeline should proceed from:

# noticing

to

# prominence

to

# pattern

to

# meaning

Each stage has a different responsibility.

No stage should perform the work of a later stage.

---

# Processing Flow

```text
Dream Material

↓

Observation Discovery

↓

Observation Salience

↓

Latent Formation

↓

Reflection
```

---

# Stage 1 — Observation Discovery

## Question

> What can be observed?

## Goal

Maximum descriptive preservation.

## Output

```text
DescriptiveObservation[]
```

Examples:

* Egy hosszú folyosó jelenik meg.
* Az álmodó fut.
* Az álmodó kijáratot keres.
* A tér végtelennek tűnik.

## Characteristics

Observation Discovery:

* preserves
* separates observations
* remains descriptive
* remains evidence-linked

Observation Discovery does not:

* interpret
* rank
* prioritize
* infer meaning

## Success Condition

A rich observation field exists.

Nothing important has been discarded yet.

---

# Stage 2 — Observation Salience

## Question

> Which observations stand out?

## Goal

Ranking without deletion.

## Output

```text
SalientObservation[]
```

Examples:

Observation:

> Az álmodó fut.

Salience:

> Low

Observation:

> Az álmodó kijáratot keres.

Salience:

> Medium

Observation:

> A tér végtelennek tűnik.

Salience:

> High

## Characteristics

Observation Salience:

* evaluates prominence
* evaluates distinctiveness
* evaluates experiential weight
* evaluates dream-local significance

Observation Salience does not:

* assign meaning
* generate latent structures
* generate interpretations

## Important Principle

An observation remains valid even if its salience is low.

Low salience is not deletion.

High salience is not interpretation.

## Success Condition

The system understands what stands out without deciding why it matters.

---

# Stage 3 — Latent Formation

## Question

> What patterns become visible?

## Goal

Identify organizing structures.

## Input

```text
Descriptive Observations

+

Observation Salience
```

## Output

```text
Latent Candidates
```

Examples:

* searching
* containment
* pursuit
* transition
* instability
* guidance
* separation

## Characteristics

Latent Formation:

* groups observations
* identifies recurring structures
* identifies organizing tendencies
* identifies candidate centers of gravity

Latent Formation does not:

* generate reflective conclusions
* determine personal meaning
* produce interpretation

## Success Condition

The system can identify emerging organization without claiming significance.

---

# Stage 4 — Reflection

## Question

> What may become meaningful?

## Goal

Generate reflective opportunity.

## Input

```text
Observations

+

Salience

+

Latent Candidates
```

## Output

```text
Reflective Opportunities
```

Examples:

* questions
* tensions
* curiosities
* invitations
* openings

## Characteristics

Reflection:

* explores
* invites
* wonders
* contextualizes

Reflection may engage with meaning.

Reflection does not claim truth.

## Success Condition

The user is invited into reflection without being given interpretation.

---

# Observation Versus Salience

Observation and Salience are related but distinct.

Observation asks:

> What is present?

Salience asks:

> What stands out?

These questions should never be collapsed into a single operation.

A valid observation can have:

* high salience
* medium salience
* low salience

Its existence does not depend on its prominence.

---

# Salience Versus Latent

Salience and Latent are related but distinct.

Salience asks:

> Which observations attract attention?

Latent asks:

> What structures connect observations?

Example:

Observations:

* Az álmodó keres valamit.
* Az álmodó nem talál kijáratot.
* Az álmodó eltéved.

Salience may identify all three as prominent.

Latent may identify:

> keresés

as an organizing pattern.

The latent is not itself an observation.

The latent emerges from relationships among observations.

---

# Latent Versus Reflection

Latent asks:

> What pattern exists?

Reflection asks:

> What might this invite us to explore?

Example:

Latent:

> containment

Reflection:

> Milyen helyzetekben érzed úgy, hogy nehéz kiutat találni?

The latent identifies structure.

Reflection creates possibility.

---

# Preservation Principle

Information should move through the pipeline without premature loss.

Preferred order:

```text
Preserve

↓

Weight

↓

Organize

↓

Reflect
```

Not:

```text
Interpret

↓

Reduce

↓

Store
```

---

# Architectural Consequences

Observation should not decide meaning.

Salience should not decide meaning.

Latent should not decide meaning.

Reflection should not decide truth.

Each layer performs a distinct cognitive role.

The quality of the system depends on maintaining these boundaries.

---

# Final Principle

A healthy Lumira pipeline moves from:

what is noticed

to

what stands out

to

what organizes

to

what becomes meaningful.

The system should preserve this progression.

No layer should skip ahead and perform the work of the next.
