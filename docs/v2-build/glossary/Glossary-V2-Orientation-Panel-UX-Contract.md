# Glossary V2 — Orientation Panel UX Contract

## Status

Planning Canon

Reflective Space Orientation Layer

---

# Purpose

The Orientation Layer is not a glossary management screen.

The Orientation Layer provides lightweight continuity review.

The dreamer should never feel required to process every candidate.

---

# Candidate Ordering

Candidates appear in the following order:

```text
1. Match Candidates
2. Ambiguous Match Candidates
3. New Candidates
```

---

# Match Candidate UX

Panel presentation:

```text
Apa
Possible match
✓
×
```

### Confirm

Selecting ✓ opens a modal.

The modal may contain:

* optional appearance note
* optional relationship clarification

The note is not required.

---

### Reject

Selecting × means:

```text
Not this entry.
```

It does not automatically create a new entry.

---

# Ambiguous Match UX

Panel presentation:

```text
Ex-partner
Possible match
✓
×
```

Selecting ✓ opens a resolution modal.

Example:

```text
Which continuity entity is this?

- Dóri
- Réka
- New Person
- Unknown Ex-partner
```

The system never resolves ambiguity automatically.

---

# New Candidate UX

Panel presentation:

```text
Mammut
+
```

The plus action opens an entry creation modal.

No rejection button is required.

Ignoring the suggestion is a valid action.

---

# Glossary Modal

The creation / confirmation modal may contain:

* canonical label
* aliases
* type
* optional appearance note
* optional general note

All notes remain optional.

---

# Design Principle

The Glossary panel is not a task list.

The Glossary panel is a continuity assistant.

The dreamer should be able to leave the Orientation Layer without processing every candidate.
