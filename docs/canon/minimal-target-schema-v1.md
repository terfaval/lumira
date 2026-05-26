````md id="lumira-minimal-schema-target-v1"
# Minimal Schema Target v1 (Draft)

## Status

Draft — Canonical Persistence Ontology  
Clean-room rebuild foundation document.

This document defines:

- the minimal canonical persistence model,
- primary reflective entities,
- ownership boundaries,
- durable vs ephemeral runtime structures,
- and persistence philosophy for the clean-room rebuild.

This is not:
- SQL schema,
- migration plan,
- ORM model dump,
- or implementation-specific database design.

The goal is:
# defining what fundamentally exists in Lumira.

---

# 1. Core Persistence Philosophy

The schema should model:

# reflective continuity

not:
- workflows,
- sessions,
- routes,
- or page structures.

Persistence must support:
- revisitation,
- continuity,
- contextual association,
- symbolic memory,
- and reflective movement.

Not rigid processing flows.

---

# 2. Primary Ontology

The primary persisted content unit is:

# Reflective Object

Dreams are:
# a privileged reflective object type.

But dreams are not the only legitimate reflective material.

---

# 3. Reflective Space Ontology

The runtime’s primary environment is:

# Reflective Space

Reflective Space contains:
- reflective objects,
- threads,
- glossary memory,
- observation structures,
- latent cognition outputs,
- and reflective relationships.

Sessions are secondary runtime containers.

Not primary ontology.

---

# 4. Canonical First-Class Entities

The minimal rebuild should treat the following as first-class persisted entities:

1. Reflective Object
2. Observation
3. Reflective Thread
4. Glossary Term
5. Reflective Response
6. Latent Snapshot (internal-facing)

Everything else is:
- derived,
- contextual,
- ephemeral,
- or future-stage.

---

# 5. Reflective Object

## Purpose

Reflective Object is the primary reflective material unit.

A reflective object represents:
- an experience,
- reflection,
- memory,
- symbolic material,
- or reflective artifact
inside Reflective Space.

---

## Reflective Object Types

Possible object types include:

- dream
- dream_fragment
- journal_entry
- reflective_note
- memory
- relationship_note
- emotional_state
- symbolic_fragment
- association_session
- fortune_session
- external_life_event
- reflective_realization

The system should remain extensible.

New reflective object types should not require rebuilding the ontology.

---

## Reflective Object Rules

Reflective objects:
- may connect to multiple threads
- may connect to glossary terms
- may generate observations
- may generate latent cognition
- may relate to other reflective objects

Reflective objects are:
# continuity-capable.

Not isolated containers.

---

# 6. Reflective Object Structure (Conceptual)

Conceptual structure only:

```txt
ReflectiveObject
    id
    user_id
    object_type
    title
    primary_content
    source_context
    created_at
    updated_at
    state
    metadata
````

Type-specific detail structures may exist separately.

Example:

```txt
DreamDetails
JournalDetails
FortuneSessionDetails
```

This prevents:

* giant polymorphic chaos,
* while preserving shared reflective identity.

---

# 7. Observation Entity

## Purpose

Observation stores:

# descriptive reflective orientation.

Observation describes:

* what appears,
* what happens,
* how experience unfolds.

Not:

* what experience definitively means.

---

## Observation Scope

Observations are typically:

# object-scoped.

However:

* observations may later contribute to cross-object continuity systems.

---

## Observation Rules

Observation must remain:

* descriptive
* evidence-linked
* revisable
* uncertainty-aware

Observation should not:

* collapse ambiguity
* generate symbolic certainty
* or become hidden interpretation authority

---

# 8. Latent Snapshot

## Purpose

Latent snapshots store:

# internal reflective cognition state.

Latent systems may model:

* recurrence
* continuity
* emotional weighting
* salience
* symbolic association
* unresolved tensions
* relational dynamics

---

## Important Rule

Latent persistence is:

# internal runtime infrastructure.

Not:

# user-facing truth.

Latent outputs must remain:

* probabilistic
* revisable
* bounded
* and subordinate to user meaning.

---

## Latent Durability

Not all latent cognition should be durable.

The runtime should distinguish:

### Durable latent structures

Useful continuity-supporting cognition.

versus:

### Ephemeral latent processing

Temporary runtime inference.

The rebuild should prefer:

# minimal durable latent persistence.

---

# 9. Reflective Thread

## Purpose

Reflective threads represent:

# continuity trajectories.

Threads are:

* not workflows,
* not tasks,
* not completion paths.

---

## Thread Relationships

Threads may connect:

* multiple reflective objects
* glossary terms
* reflective responses
* openings
* emotional continuities
* symbolic recurrences

Threads may:

* deepen
* branch
* fade
* reconnect
* remain unresolved

---

## Thread Structure (Conceptual)

```txt
ReflectiveThread
    id
    user_id
    thread_state
    continuity_summary
    created_at
    updated_at
    visibility_state
```

Thread state must support:

* dormancy
* resurfacing
* contextual activation
* unresolved continuity

---

# 10. Glossary Term

## Purpose

Glossary terms preserve:

# autobiographical symbolic continuity memory.

Glossary terms may represent:

* recurring people
* places
* objects
* emotions
* situations
* symbolic motifs
* experiential states

---

## Glossary Rules

Glossary terms:

* contextualize
* orient
* preserve recurrence

Glossary terms must never:

* override present experience
* force interpretation
* impose symbolic certainty

Meaning remains:

# user-owned and evolving.

---

# 11. Reflective Response

## Purpose

Reflective responses preserve:

# user-generated reflective movement.

Responses may include:

* written reflections
* associations
* emotional clarifications
* thread engagement
* symbolic exploration
* contextual realizations

Reflective responses are:

# high-value continuity artifacts.

---

# 12. Openings

Openings exist in the runtime.

However:

* openings are secondary entities,
* and may initially remain lightweight.

Many openings may be:

# ephemeral runtime structures.

Not durable canonical truth.

Durable persistence should exist only when:

* continuity relevance is meaningful,
* user interaction occurs,
* or reflective lineage matters.

---

# 13. Highlights

Highlights are:

# user-owned salience markers.

Highlights may initially remain:

* lightweight,
* object-linked,
* and partially derived.

The system should preserve:

# user salience precedence.

---

# 14. Durable vs Ephemeral Model

## Durable

Recommended durable entities:

* reflective objects
* observations
* glossary terms
* reflective threads
* reflective responses
* selected latent continuity structures

---

## Ephemeral

Recommended ephemeral structures:

* temporary openings
* runtime ranking states
* temporary salience estimates
* transient latent inference
* temporary reflective assembly states

The rebuild should avoid:

# over-persisting cognition.

---

# 15. User-Owned vs System-Owned

## User-Owned

* reflective object content
* highlights
* reflective responses
* glossary associations
* explicit thread interactions

---

## System-Owned

* latent inference
* salience estimation
* runtime assembly
* continuity ranking
* opening generation

---

## Shared Reflective Territory

Some structures are mixed:

* threads
* glossary evolution
* continuity relationships

These should remain:

* transparent,
* revisable,
* and non-authoritative.

---

# 16. Relationship Philosophy

The schema should prioritize:

# flexible continuity relationships.

Not:

# rigid hierarchy trees.

Relationships should support:

* revisitation
* cross-object continuity
* symbolic association
* contextual movement
* evolving reflective meaning

Avoid:

* hard workflow chains
* forced progression graphs
* over-normalized meaning systems

---

# 17. Session Downgrade

Sessions are:

# temporary reflective containers.

Not:

# primary persistence roots.

The rebuild must avoid:

* session-owned continuity
* session-locked reflective meaning
* isolated dream processing containers

Continuity should remain:

# space-level.

---

# 18. Future Extensibility

The ontology should support future reflective object types without requiring:

* ontology replacement,
* schema collapse,
* or cognition rewrites.

The reflective object model exists partly to support:

* future reflective modalities,
* non-dream reflective practices,
* and evolving symbolic interaction systems.

Example future directions:

* fortune journaling
* association practices
* memory work
* relational reflection
* symbolic exploration systems

---

# 19. Schema Restraint Principle

The rebuild should prefer:

* fewer canonical entities,
* clearer ownership,
* and cleaner persistence boundaries.

Avoid:

* over-modeling,
* premature graph complexity,
* and universal meta-object abstractions.

The ontology should remain:

# understandable by humans.

---

# 20. Final Persistence Principle

The schema should preserve the feeling that:

# reflective continuity is alive and navigable,

without collapsing it into:

* workflow machinery,
* rigid interpretation systems,
* or synthetic psychological models.

Persistence should support:

* orientation,
* memory,
* revisitation,
* and reflective movement.

Not closure.

```
