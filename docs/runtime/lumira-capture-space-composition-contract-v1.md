# lumira-capture-space-composition-contract-v1.md

## Status

Proposed

## Purpose

This document defines the intended UX composition and interaction contract for Capture Space.

Capture Space is the first destination reached from the Homepage Orientation Hub.

Its purpose is not reflection.

Its purpose is not interpretation.

Its purpose is not orientation.

Its purpose is the safe preservation of dream material before it fades.

---

# Core Principle

Capture Space exists to help the user move dream material into safety.

A successful Capture session may consist of a single sentence.

Capture alone is a successful Lumira session.

The user should never feel pressured to write more, explain more, or reflect more.

The system should reduce friction rather than encourage depth.

---

# Capture Philosophy

Capture Space is:

* calm
* quiet
* low-friction
* text-first
* non-judgmental
* interruption-free

Capture Space is not:

* a form
* a workflow
* a questionnaire
* an onboarding flow
* a reflective exercise
* an interpretation surface

The emotional feeling should be:

> This dream is safe now.

not:

> Reflection begins now.

---

# User Intent

When a user enters Capture Space, the assumed intent is:

> I want to preserve this before I forget it.

The interface should optimize for this single goal.

---

# Layout Model

Capture Space is a fixed-height viewport composition.

Desktop behavior:

* no vertical scrolling
* full composition visible immediately

Mobile behavior:

* optimized for rapid text entry
* scrolling permitted only when required by device constraints

The composition should feel spacious rather than dense.

---

# Composition Structure

## Header

Single title:

```txt
Új álom rögzítése
```

No subtitle.

No explanatory paragraph.

No onboarding copy.

No orientation copy.

No motivational copy.

No reflective prompt.

The title exists only to establish place.

---

## Main Surface

The primary element is a single large textarea.

The textarea should occupy the majority of available space.

No separate title field.

No category selector.

No dream-type selector.

No tags.

No metadata requirements.

No structured inputs.

No interpretation scaffolding.

No observation scaffolding.

No guided reflection.

Placeholder text may be minimal.

Example:

```txt
Írd le az álmot úgy, ahogy és amennyire emlékszel rá.
```

The placeholder should remain descriptive and non-directive.

---

# Capture Content Model

Users write raw dream material.

The system should accept:

* short fragments
* incomplete recollections
* isolated images
* emotional impressions
* full narratives

Completeness is not required.

Quality is not evaluated.

Structure is not required.

---

# Footer Bar

A lightweight footer bar appears below the textarea.

## Left Side

Passive writing metrics.

Example:

```txt
184 szó · 1 126 karakter
```

Metrics are informational only.

They must not imply progress, completion, or quality.

---

## Right Side

Primary action:

```txt
Rögzítés
```

Single action only.

No secondary workflow actions.

No "continue reflection" wording.

No "next step" wording.

No progression language.

---

# Save Behavior

After capture:

1. Dream entry is persisted.
2. Observation generation begins.
3. Supporting runtime processing begins.
4. AI title generation may occur.
5. Reflective object is assembled.

All processing occurs automatically.

The user is not asked to configure it.

The user is not asked to classify it.

The user is not asked to review observations first.

---

# Post-Save Navigation

After successful save:

```txt
Capture
↓
Processing
↓
Reflective Space
```

The system transitions directly into the newly created Reflective Space.

Capture does not remain open.

The user is not returned to Homepage.

The user is not asked whether reflection should begin.

The object simply becomes available.

---

# Dream Title Policy

Capture does not request a title.

Dream titles are generated later by the system.

Generated titles should:

* be descriptive
* be recognizable
* preserve recall

Titles should not:

* interpret
* symbolize
* explain

Users may edit titles later from Reflective Space.

---

# Reflection Boundary

Capture Space must not perform reflection.

Capture Space must not surface:

* observations
* glossary suggestions
* latent signals
* continuity hints
* openings
* interpretations

These belong to Reflective Space.

Capture Space is a preservation surface.

Not a reflective surface.

---

# Emotional Tone

Capture Space should feel:

* safe
* open
* permissive
* unhurried

It should not feel:

* analytical
* productive
* therapeutic
* mystical
* instructional

The user should feel:

> The dream is no longer at risk of being lost.

---

# Anti-Patterns

Avoid:

* multi-step forms
* mandatory titles
* dream categories
* onboarding checklists
* interpretation prompts
* reflection prompts
* observation previews
* AI commentary
* workflow language
* progress indicators
* completion pressure

Capture should remain smaller than reflection.

Its value comes from simplicity.

---

# Success Criteria

A first-time user can:

1. Open Capture.
2. Write a dream.
3. Press Rögzítés.
4. Arrive inside Reflective Space.

without making any additional decisions.

The experience should feel effortless, safe, and immediate.
