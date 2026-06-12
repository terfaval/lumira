# Glossary V2 — Orientation Panel UX Contract v1.1

## Purpose

The Orientation Layer Glossary Panel is not a glossary management interface.

Its purpose is:

```text
Show continuity-relevant elements discovered in the current dream.
Allow lightweight continuity decisions.
Avoid administrative overhead.
```

The panel should feel like a reflective review surface, not a data-entry workflow.

---

# Panel Composition

Each row represents one glossary-related item.

The panel may contain:

```text
Match Candidates
Ambiguous Match Candidates
New Candidates
Saved Continuity Entities
```

Items are displayed in a single unified list.

Do not separate them into sections.

Visual indicators communicate status.

---

# Row Layout

Structure:

```text
[Type Indicator]  Label  [Action] [Dismiss]  [Status Border]
```

Example:

```text
●  Apa                     ✓  ✕
```

```text
●  Exem                    ◇  ✕
```

```text
●  Mammut                  +  ✕
```

```text
●  Dóri                    > 
```

Rows should remain compact.

Avoid explanatory text in the row itself.

Additional explanations belong in tooltips and modals.

---

# Type Indicator

The left indicator communicates Continuity Entity type.

Use a small circular indicator.

### Design Tokens

```css
--glossary-type-person:  #6EA8FE;
--glossary-type-place:   #7EE787;
--glossary-type-object:  #F2CC60;
--glossary-type-role:    #D2A8FF;
--glossary-type-concept: #FF9BCE;
```

### Meaning

```text
Blue      = Person
Green     = Place
Gold      = Object
Purple    = Role
Pink      = Concept
```

---

# Candidate Status Border

A thin right-side border communicates candidate status.

### Design Tokens

```css
--glossary-status-match:     #3FB950;
--glossary-status-ambiguous: #D29922;
--glossary-status-new:       #58A6FF;
--glossary-status-saved:     #8B949E;
```

### Meaning

```text
Green  = Match Candidate
Amber  = Ambiguous Match Candidate
Blue   = New Candidate
Grey   = Saved Entity
```

The border should be subtle.

It is a classification cue, not a primary action.

---

# Actions

Use Lucide icons only.

---

## Match Candidate

```text
Check
X
```

Lucide:

```text
Check
X
```

Behavior:

```text
Check
→ Open Resolution Modal
→ Confirm Existing Entity
```

```text
X
→ Dismiss Candidate
```

---

## Ambiguous Match Candidate

```text
GitBranch
X
```

Lucide:

```text
GitBranch
X
```

Behavior:

```text
GitBranch
→ Open Resolution Modal
→ User chooses existing entity
or creates a new entity
```

```text
X
→ Dismiss Candidate
```

---

## New Candidate

```text
Plus
X
```

Lucide:

```text
Plus
X
```

Behavior:

```text
Plus
→ Open Resolution Modal
→ Create New Entity
```

```text
X
→ Dismiss Candidate
```

---

## Saved Entity

```text
ChevronRight
```

Lucide:

```text
ChevronRight
```

Behavior:

```text
Open Entity Detail View
```

Saved entities do not display candidate actions.

---

# Ordering

Display order:

```text
Match Candidates
Ambiguous Match Candidates
New Candidates
Saved Entities
```

Render as one continuous list.

No section headers.

---

# Filtering

A filter control appears at the bottom of the panel.

Available filters:

```text
All
Pending
Matches
Ambiguous
New
Saved
```

Default:

```text
All
```

Filtering affects visibility only.

It does not modify candidate state.

---

# Resolution Modal

All candidate actions open a single modal.

Resolution should happen in one step.

Avoid multi-step confirmation flows.

---

## Modal Header

Display:

```text
Candidate Label
Candidate Type
```

Example:

```text
Apa
Person
```

---

## Existing Entity Information

When applicable:

```text
Canonical Label
Type
Appearance Count
General Note (if available)
```

---

## Appearance Note

Display a textarea.

Purpose:

```text
Dream-specific note
for this appearance
```

This note becomes the Appearance Record note.

Not the Entity General Note.

---

## Primary Action

Single primary action button.

Examples:

```text
Confirm
Choose
Create
```

depending on candidate type.

---

## Modal Close

Top-right corner:

```text
X
```

Lucide:

```text
X
```

Closing the modal performs no action.

No continuity updates are created.

No appearance records are created.

---

# Dismissal Semantics

Dismissal is not deletion.

Dismissal means:

```text
Not acting on this candidate right now.
```

Future suppression policies may evolve later.

Current UX should not imply permanent rejection.

---

# Ownership Boundary

Important:

```text
Candidate Generation
≠
Continuity Creation
```

```text
Candidate Generation
≠
Appearance Creation
```

Only modal resolution actions may:

```text
Create Continuity Entities
Create Appearance Records
Update Continuity History
```
