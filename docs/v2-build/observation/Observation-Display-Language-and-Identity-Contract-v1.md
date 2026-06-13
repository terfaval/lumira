# Observation Display Language & Identity Contract v1

## Status

Draft v1

Planning / Canon Layer

Not an implementation document.

---

# Purpose

Observation-derived labels currently appear in English even when the dream is written in Hungarian.

This document defines the intended ownership model for:

* dream language
* observation identity
* observation display labels
* downstream Glossary candidate labels

---

# Core Principle

Observation should preserve stable internal meaning.

The user should see language-appropriate display text.

These are not the same responsibility.

---

# Current Problem

Today the Observation extractor may produce labels such as:

```text
Father
Helper
Closed building
Door-like structure
```

These labels then flow unchanged into:

```text
Observation
↓
Glossary Candidate
↓
Orientation Panel UI
```

This makes Hungarian-first UX feel foreign and breaks the feeling of personal continuity.

---

# Target Model

Observation labels should separate:

```text
stable identity
```

from:

```text
display label
```

Preferred conceptual shape:

```text
Observation Label

identityKey
displayLabel
sourceLanguage
```

Example for a Hungarian dream:

```text
identityKey: father
displayLabel: Apa
sourceLanguage: hu
```

Example for an English dream:

```text
identityKey: father
displayLabel: Father
sourceLanguage: en
```

---

# Dream Language

The dream should carry a language signal.

Minimum concept:

```text
dreamLanguage
```

Examples:

```text
hu
en
unknown
```

The language may be explicitly provided later or inferred during capture.

For v1, a safe fallback is acceptable.

---

# Ownership

## Observation Owns

Observation owns:

* stable internal observation identity
* source-language-aware display labels
* observation-level label provenance

## Glossary Owns

Glossary owns:

* user-confirmed continuity entity naming
* canonicalLabel
* aliases
* user edits
* continuity identity after admission

## UI Owns

UI owns:

* rendering
* layout
* tooltips
* interaction behavior

UI should not own translation or semantic relabeling.

---

# Glossary Candidate Propagation

Glossary candidate generation should prefer source-language display labels when creating user-facing candidates.

Example:

```text
Observation displayLabel: Apa
↓
Glossary candidate displayLabel: Apa
```

The candidate may still retain normalized recognition keys internally.

---

# User Renaming

Once a candidate becomes a Glossary Continuity Entity, the dreamer may rename it.

Example:

```text
Candidate label: Apa
User canonical label: Apu
```

This rename belongs to Glossary, not Observation.

Observation remains a record of what was extracted.

Glossary becomes the user-owned continuity memory.

---

# Non-Goals

This contract does not implement:

* full translation system
* multilingual UI framework
* morphology
* LLM fallback matching
* glossary modal rename UI
* historical migration of all old labels

---

# Design Rule

Do not solve display language in the UI by translating strings ad hoc.

Do not solve display language in Glossary by rewriting Observation meaning.

The correct boundary is:

```text
Observation provides stable identity + display label.
Glossary preserves user-owned continuity naming.
UI renders the provided label.
```

---

# Open Implementation Questions

Before implementation, determine:

1. Whether dream language should be inferred or user-provided in v1.
2. Whether Observation V2 runtime already has a safe place for `sourceLanguage`.
3. Whether `identityKey` can be introduced without destabilizing existing derived structures.
4. Whether older English labels should remain unchanged or be treated as legacy.
5. How candidate generation should handle missing display labels.

---

# Canonical Summary

Observation should not force English labels into a Hungarian-first product experience.

Observation should preserve stable identity and provide source-language display labels.

Glossary should allow the dreamer to rename continuity entities after confirmation.

UI should render language-aware labels but should not own translation.
