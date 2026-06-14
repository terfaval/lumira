# Latent Opportunity Construction Model v1

## Status

Planning Canon

Backend V2 Foundation Layer

Depends on:

* Reflective Opportunity Contract v1

---

# Purpose

This document defines how the Latent layer constructs Reflective Opportunities.

The purpose of this document is to establish:

* how Opportunities are discovered
* how Opportunities are constructed
* what information may contribute to Opportunity formation
* how dream evidence is preserved
* how Opportunities relate to Threads

This document does not define:

* Opening generation
* Thread implementation
* Reflection persistence
* Opportunity lifecycle
* scoring systems
* implementation details

---

# Core Principle

The Latent layer does not invent Opportunities.

The Latent layer does not merely discover Opportunities.

The Latent layer constructs Reflective Opportunities from evidence found within the dream and its reflective context.

Opportunities are evidence-grounded reflective possibilities.

They are not interpretations.

They are not conclusions.

They are not statements of meaning.

---

# Dream-First Construction

Opportunity construction always begins with the current dream.

The current dream is the primary source of reflective evidence.

The Latent layer must remain capable of constructing meaningful Opportunities from a user's very first dream.

All other reflective sources are secondary.

Additional context may enrich an Opportunity.

Additional context may not replace the current dream as its foundation.

---

# Construction Pipeline

Opportunity construction follows a Dream-First model.

```text
Current Dream
↓
Dream Analysis
↓
Dream-Originated Opportunity Candidates
↓
Context Analysis
↓
Context-Revealed Opportunity Candidates
↓
Opportunity Construction
↓
Opportunity–Thread Linking
↓
Final Opportunity Set
```

The purpose of the pipeline is not to produce interpretations.

The purpose of the pipeline is to identify credible reflective possibilities.

---

# Opportunity Sources

Reflective Opportunities may emerge from multiple sources.

---

## Dream-Originated Sources

Dream-Originated Opportunities emerge directly from the current dream.

Examples include:

* relationships between observations
* relationships between scenes
* scene transitions
* tensions
* contradictions
* recurring structures within a dream
* unresolved structures
* notable absences
* emerging dynamics

Dream-Originated Opportunities require no continuity history.

---

## Context-Revealed Sources

Context-Revealed Opportunities emerge when current dream material interacts with reflective context.

Reflective context may include:

* Glossary entities
* appearance history
* prior dreams
* prior reflections
* existing Opportunities
* existing Threads

Examples include:

* continuity
* contrast
* contradiction
* resonance
* reversal
* unresolved recurrence

Context-Revealed Opportunities must remain anchored to the current dream.

No Opportunity may be created solely from historical material.

---

# Opportunity Construction Principle

An Opportunity is not a reflective statement.

An Opportunity is a structured reflective possibility.

The Latent layer should preserve structure rather than prematurely generate interpretation.

The purpose of Opportunity construction is to identify:

* what appears reflectively interesting
* what appears reflectively uncertain
* what appears reflectively unresolved
* what appears reflectively promising

without deciding what it means.

---

# Opportunity Structure

Reflective Opportunities should be represented as structured objects.

The primary purpose of the structure is to preserve evidence and relationships.

The structure should favor reflective neutrality.

Opportunity structures should avoid embedding interpretations whenever possible.

---

# Opportunity Types

An Opportunity may take many forms.

Examples include:

* Relationship
* Dynamic
* Transition
* Tension
* Contradiction
* Recurrence
* Absence
* Continuity Signal
* Unresolved Pattern

The Opportunity Type describes the reflective structure being observed.

It does not describe meaning.

---

# Opportunity Structures

Opportunities often emerge from relationships rather than isolated elements.

The Latent layer should preserve these structures.

Examples include:

```text
A → B
```

```text
A → B → C
```

```text
A ↔ B
```

```text
A ≠ B
```

```text
Recurring A
```

```text
Missing A
```

The exact structure is less important than preserving the observed relationship.

The Latent layer should preserve relational information whenever possible.

---

# Dream Evidence Preservation Principle

Dream evidence must remain attached to the dream from which it originated.

The Latent layer should not collapse evidence from multiple dreams into a single undifferentiated structure.

Reflective continuity is valuable.

Dream identity must remain visible.

The system should preserve:

* dream boundaries
* dream context
* dream chronology
* dream-local structures

whenever Opportunity construction spans multiple dreams.

---

# Dream Evidence Blocks

When an Opportunity references multiple dreams, evidence should remain organized by dream.

Conceptually:

```text
Opportunity
    ↓
Dream Evidence Blocks
    ↓
Observations
```

A Dream Evidence Block preserves:

* Dream Identity
* Dream Context
* Dream Structure
* Dream Timeline
* Supporting Observations

The purpose is to preserve continuity without losing historical detail.

---

# Priority Dream Principle

Every Opportunity should have a Priority Dream.

The Priority Dream is normally the current dream that triggered Opportunity construction.

The Priority Dream serves as the primary reflective anchor for:

* Opening generation
* Thread connection
* reflective exploration

Historical dreams may contribute evidence.

The Priority Dream remains primary.

---

# Opportunity–Thread Relationship

Opportunities and Threads are distinct.

An Opportunity represents reflective possibility.

A Thread represents reflective process.

An Opportunity may:

* create a new Thread
* connect to an existing Thread
* connect to multiple Threads

A Thread may:

* strengthen an Opportunity
* weaken an Opportunity
* refine an Opportunity
* reveal new Opportunities

Opportunity–Thread relationships should support reflective continuity without forcing continuation.

---

# Reflective Neutrality Principle

The Latent layer should prefer reflective structures over reflective conclusions.

Examples:

Preferred:

```text
Transition:
Exploration → Danger → Separation
```

Not Preferred:

```text
The dream suggests fear of exploration.
```

Preferred:

```text
Contradiction:
Gyapa ↔ Budapest
```

Not Preferred:

```text
The dream reflects disorientation.
```

The role of the Latent layer is to preserve possibility.

Meaning emerges later through reflection.

---

# Non-Goals

The Latent layer is not responsible for:

* dream interpretation
* symbolic decoding
* diagnosis
* meaning assignment
* user guidance
* thread continuation pressure

The Latent layer identifies reflective possibilities.

It does not determine their meaning.

---

# Final Principle

The purpose of Opportunity Construction is not to understand the dream for the user.

The purpose of Opportunity Construction is to identify potentially fruitful directions for reflective exploration.

A well-constructed Opportunity preserves evidence, structure, and possibility while remaining open to future understanding.
