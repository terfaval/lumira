# lumira-reflective-space-orientation-composition-contract-v1.md

## Status

Proposed

## Purpose

This document defines the composition contract for the first Reflective Space layer.

This layer is referred to as:

```txt
Orientation Layer
```

Orientation Layer is the default destination after Capture.

Its purpose is:

* orienting toward a dream
* exposing reflective possibilities
* surfacing continuity signals
* supporting reflective movement

Its purpose is not:

* deep reflective writing
* thread work
* interpretation
* analysis

Orientation should help the user understand:

> What is present here?

before asking:

> Where should I go next?

---

# Core Principle

The Orientation Layer is a reflective overview.

It should feel:

* calm
* inhabitable
* glanceable
* spacious

The user should be able to understand the current dream landscape from a single screen.

Desktop orientation should prefer:

```txt
single viewport
no scrolling
simultaneous awareness
```

over:

```txt
stacked reading
long documents
multi-page exploration
```

---

# Attention Hierarchy

The Orientation Layer is organized into three levels of attention.

## Primary

Dream Surface

The dream itself remains the center of gravity.

## Secondary

Orientation Surfaces

These help the user perceive the dream.

Examples:

* Glossary
* Emotion Field
* Dream Signals

## Tertiary

Reflective Pathways

These suggest possible future movement.

Examples:

* Opening Stack
* Thread Overview
* Notes

---

# Layout Philosophy

Orientation should resemble a reflective landscape rather than a document.

Avoid:

* dashboard layouts
* feed layouts
* productivity workspaces
* stacked reading flows

The user should perceive the whole dream environment at once.

---

# Canonical Surfaces

## 1. Dream Surface

### Purpose

Primary dream container.

### Contents

* AI-generated title
* edit title action
* dream text

### Editing

Dream text editing is not performed directly inside Orientation.

Selecting edit transitions the user into Deep Reflection mode.

Reason:

Long-form writing belongs to Deep Reflection.

Not Orientation.

### Priority

Highest.

This is the central surface of the screen.

---

## 2. Glossary Surface

### Purpose

Expose dream elements recognized within the current dream.

### Representation

Elements appear as interactive glossary entries.

Example:

```txt
● Forest
● Door
● Water
● House
```

### Interaction

Selecting an element opens a glossary modal.

The user may:

* review the glossary entry
* edit the glossary entry
* add dream-specific notes
* view related context

### Visual Language

Glossary entries use Glossary Lights.

Each element displays:

* color
* intensity

The color system is shared with Emotion Field.

The color does not represent meaning.

The color represents the emotional or experiential relationship currently associated with the element within this dream.

---

## 3. Emotion Field

### Purpose

Provide a lightweight emotional orientation map.

### Visualization

Bubble-based coordinate field.

Each bubble represents an identified emotional presence.

### Axes

#### X Axis

```txt
Safety
← →
Uncertainty
```

#### Y Axis

```txt
Positive Mood
↑
↓
Negative Mood
```

### Bubble Properties

Position:

* emotional character

Size:

* intensity
* prominence

Color:

* Reflective Color System

### Behavior

The field may evolve as reflection deepens.

The emotional picture is not fixed.

---

## 4. Dream Signal Surface

### Status

Exploratory

### Purpose

Reserved area for future dream-derived visualizations.

Potential future sources:

* dream structure
* continuity patterns
* dream topology
* Dream Map primitives

No canonical visualization is defined in v1.

---

## 5. Opening Stack

### Purpose

Present available reflective directions.

Openings are invitations.

Not tasks.

Not recommendations.

Not requirements.

### Relationship to Threads

Openings are entry points.

Threads begin when an Opening is entered.

```txt
Opening
↓
Thread
```

### Views

#### New

Openings not yet entered.

#### Active

Threads already entered and still active.

#### All

Combined view.

### Default View

```txt
New
```

Reason:

Orientation should prioritize possibility rather than history.

---

## 6. Thread Overview

### Purpose

Provide a high-level overview of reflective activity associated with the dream.

### Visualization

Simple state visualization.

States:

```txt
New
Active
Dormant
```

The visualization should communicate relative distribution rather than exact progress.

Example:

Three colored regions with proportional size.

### Interaction

Selecting a state filters the Opening Stack.

Examples:

```txt
New
↓
show new openings

Active
↓
show active threads

Dormant
↓
show completed threads
```

### Important

This is not a progress tracker.

This is not a completion system.

This is orientation.

---

## 7. Notes Surface

### Purpose

Dream-specific freeform notes.

Notes are independent.

They are not:

* glossary notes
* thread responses
* opening responses

### Characteristics

The user may record:

* reminders
* observations
* personal thoughts
* fragments
* future ideas

### Scope

Notes belong to the dream.

Not to individual threads.

### v1 Constraint

Notes do not invoke AI companions.

Notes do not automatically create threads.

Notes remain lightweight.

### Future Possibility

A future version may integrate Notes more deeply into reflective workflows.

No such behavior is defined in v1.

---

# Reflective Color System v1

The Orientation Layer uses a shared visual language.

These colors represent experiential qualities.

They do not represent objective meaning.

| Color  | Quality                        |
| ------ | ------------------------------ |
| Blue   | calm, observation, distance    |
| Green  | safety, stability, familiarity |
| Yellow | curiosity, exploration         |
| Orange | transition, movement, change   |
| Purple | dreamlike quality, abstraction |
| Red    | intensity, tension, urgency    |

The same system is used by:

* Emotion Field
* Glossary Lights

Future systems should reuse this language where appropriate.

---

# Deep Reflection Boundary

Orientation Layer is not Deep Reflection.

Deep Reflection begins when the user:

* edits the dream text
* enters an Opening
* enters a Thread

Orientation supports movement.

Deep Reflection supports work.

---

# Deferred Elements

The following are intentionally deferred.

They are not part of canonical v1 behavior.

### Deferred

* Dream Structure Visualization
* Continuity Visualization
* Dream Map-derived Visualization Layers
* AI-assisted Notes
* Additional orientation metrics

These remain exploratory.

---

# Success Criteria

A user can:

1. Understand the dream at a glance.
2. Recognize important dream elements.
3. Perceive emotional atmosphere.
4. See available reflective directions.
5. Understand thread status.
6. Record personal notes.
7. Enter Deep Reflection when desired.

without feeling:

* pressured
* guided
* evaluated
* interpreted

The Orientation Layer should feel like standing inside the dream's reflective landscape before choosing where to walk next.
