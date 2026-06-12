# Glossary V2 — Persistence and Lifecycle Contract

## Status

Planning Canon

Backend V2 Foundation Layer

---

# Purpose

This document defines:

* the canonical persistence model of Glossary V2
* the lifecycle of Continuity Entities
* the lifecycle of candidates and matches
* the authority boundaries of the Glossary layer

This document is intentionally technology-independent.

It defines domain behavior, not database implementation.

---

# Core Principle

Observation identifies presence.

Glossary identifies persistence.

The purpose of Glossary is not to store words.

The purpose of Glossary is to preserve user-confirmed continuity across dreams.

---

# Authority

The authority of Glossary is:

```text
User-confirmed Continuity Entity
```

Not:

* Observation
* Candidate generation
* AI interpretation
* Latent reasoning

Candidates may suggest continuity.

Only the dreamer may confirm continuity.

---

# Continuity Entity

A Continuity Entity is the primary persistence unit of Glossary.

Minimum canonical structure:

```text
Continuity Entity

id
type
canonical_label
aliases[]
general_note
appearance_count
created_at
updated_at
```

---

## Field Definitions

### id

Stable identity of the continuity entity.

Never reused.

---

### type

Initial supported values:

```text
person
place
animal_or_creature
object
setting_or_space
role
concept
```

Additional types may be introduced later.

---

### canonical_label

Primary human-readable label.

Examples:

```text
Apa
Kozmo
Gyapa
Réka
Ex-partner
```

---

### aliases

Alternative references that may point to the same continuity entity.

Example:

```text
Apa

Aliases:
- apu
- apám
- édesapám
```

Aliases are not separate entities.

---

### general_note

User-owned continuity note.

Examples:

```text
"Gyerekkorom egyik legfontosabb helyszíne."
```

```text
"Az álmaimban általában támogató szerepben jelenik meg."
```

General notes are entity-level observations.

They are not tied to a specific dream appearance.

---

### appearance_count

Number of confirmed appearances.

The count reflects confirmed continuity history.

Suggested appearances do not affect this value.

---

# Appearance Record

Every confirmed appearance creates an Appearance Record.

Minimum structure:

```text
Appearance Record

id
entity_id
dream_id
appearance_note
confirmed_at
```

---

## Appearance Note

Optional dream-specific note.

Examples:

```text
"Most nagyon támogató volt."
```

```text
"Most nem a valódi Dórinak tűnt."
```

Appearance Notes belong to a specific dream occurrence.

They are not entity-level notes.

---

# Candidate Lifecycle

Glossary does not create entities automatically.

The lifecycle begins with Observation.

---

## Candidate Surface

Observation may generate:

```text
New Candidate
Match Candidate
Ambiguous Match Candidate
```

---

## New Candidate

Represents a possible new continuity entity.

Example:

```text
Mammut
```

The system proposes preservation.

The dreamer decides whether the entity should exist.

---

## Match Candidate

Represents a possible appearance of an existing continuity entity.

Example:

```text
Observed:
apám

Existing Entity:
Apa
```

The system proposes a continuity match.

The dreamer confirms or rejects the proposal.

---

## Ambiguous Match Candidate

Represents a possible appearance that could belong to multiple entities.

Example:

```text
Observed:
az exem

Possible Matches:
- Dóri
- Réka
```

The system never resolves ambiguity automatically.

The dreamer resolves ambiguity.

---

# User Actions

Candidates may result in:

```text
create Continuity Entity
confirm Appearance Record
resolve Ambiguous Match
ignore / defer
suppress future suggestion
```

---

## Create Continuity Entity

Creates a new Glossary entry.

A new entity may optionally include:

* aliases
* type
* appearance note
* general note

All optional.

---

## Confirm Appearance Record

Creates a new appearance linked to an existing entity.

Increments:

```text
appearance_count
```

---

## Resolve Ambiguous Match

Associates the appearance with one chosen continuity entity.

The user may also choose:

```text
new entity
unknown role-level continuity
```

when appropriate.

---

# Ignore vs Reject

These are different actions.

---

## Ignore / Defer

Meaning:

```text
Not now.
```

No continuity decision is made.

The system may surface the candidate again later.

---

## Reject

Meaning:

```text
Not this continuity entity.
```

A rejected match does not automatically become a new entity.

A rejected match simply invalidates the proposed association.

---

# Suppression

Suppression affects recommendation behavior only.

Suppression does not delete data.

Suppression does not create continuity conclusions.

Example:

```text
Mammut
```

appears frequently but is repeatedly ignored.

The system may gradually reduce recommendation frequency.

---

# Role-Level Continuity

Some appearances may express a role without a known identity.

Example:

```text
ex-partner
mentor
teacher
```

The dreamer may preserve the role continuity even when the specific identity remains unknown.

Identity resolution is optional.

---

# Non-Goals

Glossary is not:

* a dream dictionary
* a symbol encyclopedia
* an interpretation engine
* a truth system
* an automated identity resolver

Glossary is a continuity memory layer.

The dreamer remains the final authority.
