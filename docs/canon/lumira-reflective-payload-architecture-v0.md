# Lumira Reflective Payload Architecture v0

## Purpose

This document defines the conceptual payload architecture of Lumira’s Reflective Space.

It describes:

* what reflective payloads exist,
* which are user-visible,
* which are orchestration/internal,
* how payloads relate to UX layers,
* and how reflective structures should surface inside Reflective Space.

This document is:

* conceptual,
* UX-aligned,
* orchestration-aware,
* implementation-agnostic.

It is NOT:

* a finalized DB schema,
* API contract,
* or storage implementation.

---

# 1. Architectural philosophy

Lumira distinguishes between:

* canonical dream material,
* reflective structures,
* orchestration structures,
* and ambient continuity signals.

Not every payload:

* becomes visible,
* becomes editable,
* or becomes reflective foreground.

The system must preserve:

# reflective quietness.

Meaning:

* only a small subset of payloads become active reflective surfaces at once.

---

# 2. Payload visibility layers

Every payload belongs to one or more visibility classes.

| Visibility class   | Meaning                                 |
| ------------------ | --------------------------------------- |
| User-visible       | Can appear directly in Reflective Space |
| User-editable      | User can modify/confirm/write into it   |
| Ambient signal     | Peripheral reflective cue               |
| Thread-attached    | Exists within reflective thread context |
| Highlight-attached | Linked to reflective anchor             |
| Glossary-attached  | Linked to motif continuity system       |
| Dream-space-level  | Belongs to entire dream-space           |
| AI-internal        | Orchestration reasoning only            |
| Orchestration-only | Never directly surfaced                 |

---

# 3. Canonical dream payloads

## Dream Entry

Represents:

# canonical raw dream material.

---

### Visibility

| Type              | Status     |
| ----------------- | ---------- |
| User-visible      | Yes        |
| User-editable     | Yes        |
| Thread-attached   | Indirectly |
| Dream-space-level | Yes        |

---

### Purpose

* primary dream substrate
* source material for all reflection
* canonical memory artifact

---

### UX role

Appears as:

# Dream Surface

---

# 4. Observation payloads

## Observation

Represents:

* extracted dream features,
* entities,
* scenes,
* emotions,
* transitions,
* structures,
* patterns.

Observations are:

# partially orchestration-facing.

---

### Visibility

| Type               | Status    |
| ------------------ | --------- |
| User-visible       | Sometimes |
| User-editable      | No        |
| AI-internal        | Yes       |
| Orchestration-only | Partial   |

---

### UX role

Observations may surface indirectly as:

* highlight suggestions
* continuity cues
* reflective openings
* motif candidates

The user should rarely encounter:

# raw observation structures directly.

---

# 5. Latent hypothesis payloads

## Latent Hypothesis

Represents:

* uncertain internal reflective possibilities,
* tentative relationships,
* unresolved patterns,
* possible continuity structures.

Examples:

* possible recurring motif
* emotional tension hypothesis
* symbolic clustering candidate
* unresolved relation possibility

---

### Visibility

| Type               | Status         |
| ------------------ | -------------- |
| User-visible       | No direct form |
| AI-internal        | Yes            |
| Orchestration-only | Yes            |

---

### UX role

Latents surface indirectly through:

* reflective openings
* orientation hints
* motif resonance cues
* collaborative reflective prompts

The user never sees:

# “latent hypotheses”.

---

# 6. Orientation payloads

## Frame / Orientation

Represents:

* condensed reflective orientation,
* contextual re-entry,
* lightweight dream reframing.

---

### Visibility

| Type              | Status |
| ----------------- | ------ |
| User-visible      | Yes    |
| User-editable     | No     |
| Dream-space-level | Yes    |

---

### UX role

Appears inside:

# Orientation Layer

Purpose:

* cognitive re-entry
* lightweight framing
* reflective orientation

Must remain:

* secondary
* collapsible
* non-authoritative

---

# 7. Highlight payloads

## Highlight

Represents:

# user-confirmed reflective salience.

Highlights are:

* reflective anchors,
* not passive annotations.

---

### Visibility

| Type               | Status   |
| ------------------ | -------- |
| User-visible       | Yes      |
| User-editable      | Yes      |
| Highlight-attached | Yes      |
| Thread-attached    | Possible |
| Glossary-attached  | Possible |

---

### UX role

Highlights may:

* start threads
* attach notes
* connect motifs
* trigger reflective openings
* surface continuity

---

# 8. Reflective note payloads

## Reflective Note

Represents:

* local reflective writing,
* contextual associations,
* emotional marking,
* lightweight continuity.

---

### Visibility

| Type               | Status   |
| ------------------ | -------- |
| User-visible       | Yes      |
| User-editable      | Yes      |
| Highlight-attached | Possible |
| Thread-attached    | Possible |

---

### UX role

Usually created through:

# Inline Composer

---

# 9. Glossary payloads

## Glossary Term

Represents:

# persistent personal motif memory.

---

### Visibility

| Type              | Status  |
| ----------------- | ------- |
| User-visible      | Yes     |
| User-editable     | Partial |
| Glossary-attached | Yes     |

---

### UX role

Contains:

* recurrence continuity
* user meaning
* dream associations
* motif memory

---

## Glossary Occurrence

Represents:

* a motif appearing in a specific dream context.

---

### Visibility

| Type              | Status |
| ----------------- | ------ |
| User-visible      | Yes    |
| Ambient signal    | Yes    |
| Glossary-attached | Yes    |

---

### UX role

Appears as:

* recurrence cues
* continuity markers
* motif linkage

---

# 10. Reflective opening payloads

## Reflective Opening

Represents:

# AI-surfaced reflective possibility.

Examples:

* unresolved tension
* possible motif relationship
* emotional ambiguity
* continuity suggestion
* reflective question

---

### Visibility

| Type              | Status   |
| ----------------- | -------- |
| User-visible      | Yes      |
| Thread-attached   | Often    |
| Dream-space-level | Possible |

---

### UX role

Reflective openings:

* invite engagement,
* but do not require response.

They are:

* ambient,
* contextual,
* low-pressure.

Never:

* turn-based dialogue prompts.

---

# 11. Reflective response payloads

## Reflective Response

Represents:

# sustained reflective writing.

Includes:

* reflective answers
* thread continuations
* deeper associations
* revisitations
* continuity-building thought

---

### Visibility

| Type            | Status |
| --------------- | ------ |
| User-visible    | Yes    |
| User-editable   | Yes    |
| Thread-attached | Yes    |

---

### UX role

Usually created through:

# Reflective Composer

---

# 12. Thread payloads

## Reflective Thread

Represents:

# continuity structure of reflective engagement.

A thread may connect:

* highlights
* responses
* openings
* motifs
* revisitations
* unresolved tensions

---

### Visibility

| Type              | Status |
| ----------------- | ------ |
| User-visible      | Yes    |
| Thread-attached   | Self   |
| Dream-space-level | Yes    |

---

### UX role

Threads:

* organize continuity,
* preserve reflective trajectories,
* enable revisitation.

Not:

* conversations,
* tasks,
* or workflows.

---

# 13. Direction / attention lens payloads

## Attention Lens

Represents:

* temporary reflective weighting,
* focus framing,
* or thematic orientation.

Examples:

* emotional focus
* relational focus
* embodiment focus
* continuity focus

---

### Visibility

| Type              | Status    |
| ----------------- | --------- |
| User-visible      | Sometimes |
| Dream-space-level | Yes       |
| AI-internal       | Partial   |

---

### UX role

Attention lenses:

* influence surfacing,
* not navigation locking.

They are:

# reflective emphasis systems,

not:

# workflow modes.

---

# 14. Continuity signal payloads

## Continuity Signal

Represents:

# emergent reflective continuity state.

Examples:

* recurring motif
* dormant-but-active thread
* revisited highlight cluster
* unresolved emotional structure

---

### Visibility

| Type           | Status          |
| -------------- | --------------- |
| Ambient signal | Yes             |
| User-visible   | Peripheral only |
| AI-internal    | Yes             |

---

### UX role

Signals appear as:

* subtle cues
* low-pressure indicators
* reflective atmosphere

Never:

* analytics dashboards
* hard alerts
* productivity notifications

---

# 15. Foreground vs background reflective structures

Reflective payloads may exist in:

* foreground
* background

states.

---

## Foreground reflective structures

Examples:

* active thread
* unresolved opening
* recently revisited motif
* emotionally dense cluster

Characteristics:

* visible
* interactive
* reflective-demanding

---

## Background reflective structures

Examples:

* historical motifs
* dormant threads
* older continuity structures
* lightly relevant associations

Characteristics:

* quiet
* peripheral
* resurfacing-capable

---

# 16. Collaborative reflective surfacing

Orientation Layer should behave as:

# collaborative reflective negotiation space.

The system may surface:

* uncertain motifs
* tentative continuity
* unresolved clusters
* reflective possibilities

The user may:

* confirm
* reject
* deepen
* annotate
* or ignore them.

This collaboration gradually shapes:

# reflective topology.

---

# 17. Final principle

Payload architecture should preserve:

# reflective depth without reflective overload.

The system must:

* surface selectively,
* remain continuity-aware,
* and avoid turning reflective cognition into workflow management.
