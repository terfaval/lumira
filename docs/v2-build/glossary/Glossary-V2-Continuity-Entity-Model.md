# Glossary V2 — Continuity Entity Model

## Status

Planning Canon

Backend V2 Foundation Layer

---

# Purpose

The purpose of the Glossary is not to store words.

The purpose of the Glossary is to preserve continuity.

Observation identifies presence.

Glossary identifies persistence.

---

# Core Principle

A Glossary Entry represents a user-confirmed Continuity Entity.

A Continuity Entity is something that appears repeatedly across dreams and is considered worth preserving by the dreamer.

The Glossary does not automatically decide significance.

The dreamer decides what deserves preservation.

---

# Continuity Entity

Canonical structure:

```text
Continuity Entity
```

Examples:

```text
Apa
Kozmo
Gyapa
Végtelen épület
Ex-partner
```

The entity is not a word.

The entity is a continuity anchor.

---

# Entity Types

Glossary entries are typed.

Initial supported types:

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

# Aliases

A Continuity Entity may contain aliases.

Examples:

```text
Apa

Aliases:
- apu
- apám
- édesapám
```

Aliases are continuity references.

Aliases are not separate entries.

---

# General Notes

Entries may contain user-owned notes.

Example:

```text
Gyapa

General Note:

"Gyerekkorom egyik legfontosabb helyszíne."
```

General Notes describe the entity itself.

They are not tied to a specific dream.

---

# Appearance History

Every confirmed appearance becomes part of the entity history.

Example:

```text
Apa

41 appearances
```

The Glossary preserves continuity history.

The Observation layer preserves individual appearances.

---

# Relationships

Entities may later form relationships.

Examples:

```text
Apa
↔ Gyapa

Dóri
↔ Ex-partner
```

Relationship modeling is outside the scope of this document.

---

# Non-Goals

The Glossary is not:

* a dream dictionary
* a symbol encyclopedia
* an interpretation engine
* a truth system

The Glossary is a continuity memory layer.
