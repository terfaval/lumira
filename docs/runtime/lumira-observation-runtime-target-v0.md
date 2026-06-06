# Lumira Observation Runtime Target v0

## Status

Draft

Architecture Direction Document

This document defines the intended runtime shape of Observation after the Observation Preservation redesign.

It does not define implementation details.

It does not define migrations.

It does not define prompt behavior.

Its purpose is to define the target runtime model that Observation extraction should converge toward.

---

# Background

The Observation Extraction Principle defines Observation as a process of noticing and preserving descriptive observations.

The Observation Preservation Audit identified a structural mismatch between this principle and the current runtime implementation.

The current runtime primarily persists:

* one observation bundle
* one summary
* many category-tagged fragments

This architecture successfully preserves some descriptive material, but it naturally encourages:

* bundling
* summarization
* category selection
* observation compression

The result is a system that behaves closer to categorized summarization than observation preservation.

This document defines the intended target state.

---

# Core Runtime Principle

The durable runtime container remains:

# one Observation Bundle per dream.

The durable runtime unit inside that bundle becomes:

# the descriptive observation.

The bundle is not removed.

The bundle changes its internal organizing principle.

---

# Observation Bundle

An Observation Bundle represents the descriptive observation field associated with a dream.

Its purpose is:

* to contain observations
* to preserve observation relationships
* to support later reflective systems

The bundle is not itself an observation.

The bundle is a container of observations.

---

# Observation As First-Class Runtime Unit

The primary unit inside the bundle is:

# Descriptive Observation

A descriptive observation represents a single bounded noticing supported by dream evidence.

Examples:

* a location appears
* a person appears
* movement occurs
* fear is experienced
* agency becomes restricted
* a dream anomaly occurs
* a continuity candidate emerges

A descriptive observation is not:

* a summary
* a scene
* an interpretation
* a latent
* a thread

---

# Preservation Before Classification

Observation extraction should proceed in the following order:

Dream Material

↓

Observations

↓

Organization

↓

Persistence

Classification exists to organize observations.

Classification does not determine what observations may exist.

Observation generation precedes categorization.

---

# Multiple Observations From Shared Evidence

A single dream fragment may support multiple observations.

Example:

> I walked through an endless hallway searching for an exit.

Possible observations:

* location present
* movement present
* search behavior present
* agency constraint present
* spatial instability present

All observations may be valid simultaneously.

The runtime should not assume:

one evidence span → one observation

The runtime should support:

one evidence span → many observations

---

# Categories As Descriptive Dimensions

Categories remain important.

However, categories are not the primary object.

Categories function as:

* organizational dimensions
* retrieval dimensions
* indexing dimensions
* descriptive lenses

Categories do not define observation existence.

An observation exists because it is observed.

Not because it fits a category.

---

# Summary Is Secondary

Summaries remain useful.

However:

# Summary is a derived artifact.

The summary exists to help humans and downstream systems quickly orient to the observation field.

The summary is not the primary representation.

The summary should emerge from observations.

Observations should not be forced to emerge from a summary.

---

# Observation Density

The runtime should prefer preservation over compression.

The objective is not to maximize observation count.

The objective is not to minimize observation count.

The objective is:

# maximize descriptive fidelity.

The runtime should preserve meaningful observations whenever sufficient evidence exists.

Reduction and prioritization belong to downstream systems.

---

# Relationship To Phenomenology

The runtime should treat phenomenological observations as first-class observations.

This includes:

* emotions
* atmospheres
* agency states
* metacognitive moments
* dream-state qualities
* altered realism
* spatial instability

Phenomenology should not be structurally subordinate to actors, locations, objects, or interactions.

Structural and phenomenological observations are equally valid forms of observation.

---

# Relationship To Continuity

Observation may preserve continuity-relevant material.

Observation does not determine continuity importance.

Observation may preserve:

* recurrence candidates
* continuity fragments
* recurring motifs
* recurring figures

Later systems determine whether continuity actually exists.

Observation preserves candidates.

It does not establish continuity.

---

# Relationship To Reflection

Observation remains strictly descriptive.

Observation does not:

* interpret
* explain
* diagnose
* prioritize
* generate meaning

Observation answers:

> What can be observed?

Reflection answers:

> What becomes meaningful?

The boundary remains strict.

---

# Runtime Target

Current Runtime

Observation Bundle

├─ Summary

└─ Category Fragments

Target Runtime

Observation Bundle

├─ Descriptive Observations

├─ Summary (derived)

└─ Supporting Metadata

The key shift is not the removal of the bundle.

The key shift is that observations become the primary durable unit and summary becomes secondary.

---

# Success Criteria

A successful Observation runtime:

* preserves observations before reducing them
* supports multiple observations from shared evidence
* treats phenomenology as first-class material
* preserves continuity candidates without interpreting them
* uses categories as organization rather than selection
* derives summaries from observations
* remains descriptive rather than interpretive

The Observation Bundle remains.

The observation becomes the center of gravity.
