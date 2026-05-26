# Lumira Homepage Orientation Composition Contract v1

## Status

Canonical composition contract for the first Reflective Space homepage Orientation Hub.

This document defines:
- homepage role and compositional hierarchy
- two-row, no-scroll desktop layout behavior
- panel roles and fixed preview rules
- navigation expectations
- anti-pattern boundaries and validation checks

This document is:
- planning-level
- UX-composition contract
- implementation-guiding

This document is NOT:
- component code
- token file
- route implementation ticket
- API implementation spec

---

## Ticket Protocol

### 1) Goal restatement
- Define the Lumira homepage as an Orientation Hub / Reflective Lobby, not a dashboard.
- Establish a calm, one-screen desktop composition with explicit panel hierarchy.
- Preserve fast capture entry while supporting revisitation (dreams, glossary, recent objects, guide).
- Keep continuity visible without productivity/task pressure.

### 2) Touched files
- New: `docs/runtime/lumira-homepage-orientation-composition-contract-v1.md`
- New: `docs/runtime/lumira-homepage-orientation-technical-gaps-v1.md`

### 3) Planning steps
1. Align homepage role with constitution + interaction + IA principles.
2. Define two-row composition with explicit gravity and ratio contracts.
3. Define panel purposes, preview limits, and interaction boundaries.
4. Define anti-patterns, route dependencies, and validation checklist.

### 4) Acceptance criteria (DoD)
- Orientation Hub role is explicit and non-dashboard.
- Required two-row desktop layout is explicitly defined.
- Five panel roles are defined with behavior and constraints.
- Fixed preview counts are defined (Glossary 5, Dream Journal 3).
- Navigation and dependency expectations are documented.
- Anti-patterns and validation checklist are present.

### 5) Testing / validation plan
- Contract-level validation through design/dev review checklist in Section 11.
- No runtime, schema, or UI mutation in this ticket.

### 6) Rollback
- Documentation-only rollback by reverting this file.

---

## 1) Purpose and Scope

This contract defines the first homepage Orientation composition for Lumira.

The homepage must feel like:

# a calm threshold into reflective space

The homepage must not drift into:
- dashboard behavior
- productivity framing
- analytics/metric surface
- feed or task-inbox behavior

---

## 2) Homepage Role: Orientation Hub / Reflective Lobby

Homepage role is:

# where gentle entry is possible from multiple reflective vectors

Primary entry vectors:
1. Start capture quickly
2. Re-enter recent dream material
3. Revisit personal glossary memory
4. Open full Dream Journal archive
5. Reach sleep / dream-technique guidance

The homepage should answer:

# where can I gently enter now?

not:

# what must I complete next?

---

## 3) Layout Model (Desktop v1)

Desktop target:
- two rows
- no-scroll when reasonably possible on common desktop viewport heights
- visual hierarchy communicated through area, not equal grid cells

### Row 1: Primary Entry Row
- Two panels, weighted `Capture : Glossary = 2 : 1`
- Capture is dominant interactive gravity

```txt
+------------------------------------+------------------+
|                                    |                  |
|              CAPTURE               |    GLOSSARY      |
|                                    |                  |
+------------------------------------+------------------+
```

### Row 2: Secondary Orientation Row
- Three panels, weighted `Recent Objects : Dream Journal : Guide = 1 : 2 : 1`
- Dream Journal is strongest row-2 panel

```txt
+--------------+--------------------------------+--------------+
|              |                                |              |
| RECENT       |         DREAM JOURNAL          |    GUIDE     |
| OBJECTS      |                                |              |
|              |                                |              |
+--------------+--------------------------------+--------------+
```

---

## 4) Panel Role Definitions

### 4.1 Capture Panel (Primary)

Purpose:
- start new reflective object capture
- dream-first now
- extensible later to memory / journal entry / note

Behavior:
- large clickable panel
- navigates to Capture Mode entry
- no analysis pressure, no continuity flood, no mandatory prompts

Constraint:
- this is the clearest and fastest entry into Lumira

### 4.2 Glossary Panel (Secondary high-emphasis)

Purpose:
- preview personal motif memory
- invite entry to full glossary

Content rule:
- show exactly `5` latest glossary entries
- each row may include: term label, short descriptor (if present), subtle marker/icon

Behavior:
- panel click and/or footer action opens full Glossary
- entry click may later open term detail if supported

Constraint:
- must feel like personal memory, not universal symbol dictionary

### 4.3 Recent Objects Panel (Quiet utility)

Purpose:
- show recently active reflective objects
- keep naming extensible beyond dreams

Content rule:
- small fixed preview list
- default target: `3` latest active objects (unless canonical data contract revises)
- each row: title, object type, timestamp (if available)

Behavior:
- item click opens object orientation/summary surface
- optional footer to all objects only if such route exists

Constraint:
- must not feel like inbox/task stack

### 4.4 Dream Journal Panel (Row-2 center)

Purpose:
- preview recent dreams
- support revisitation
- provide central archive entry

Content rule:
- show exactly `3` latest dream entries
- each row: title, date/time, short AI summary if available, otherwise excerpt fallback

Behavior:
- panel click and/or footer opens full Dream Journal
- item click opens that dream's orientation/summary surface

Constraint:
- avoid table-like or productivity-list presentation

### 4.5 Sleep / Dream Technique Guide Panel (Quiet knowledge)

Purpose:
- provide entry to practical sleep and dream-technique guidance

Content rule:
- small preview of guidance categories/topics
- route may be placeholder in v1 if content route is not yet live

Behavior:
- click opens guide route or placeholder route

Constraint:
- tone is calm companion library, not help-center urgency

---

## 5) Fixed Preview Count Rules

Required fixed counts for v1 desktop:
- Glossary preview: exactly `5` latest entries
- Dream Journal preview: exactly `3` latest dream entries

Additional bounded previews:
- Recent Objects preview: default `3` latest active reflective objects
- Guide preview: small curated list (implementation-defined count, non-scroll by default)

Count invariants:
- counts are layout contracts, not adaptive feed windows
- no infinite lists on homepage

---

## 6) Navigation Behavior Contract

Primary panel navigation:
- Capture panel -> Capture Mode entry route
- Glossary panel -> Glossary route
- Dream Journal panel -> Dream Journal route
- Guide panel -> Sleep / Dream Technique Guide route (or explicit placeholder)

Item-level navigation:
- Dream Journal item -> dream orientation/summary surface
- Recent Object item -> reflective object orientation/summary surface

Return behavior:
- follow one-level-back attentional return semantics where implemented
- return should restore prior orientation context, not reset into workflow progression

Note:
- missing route dependencies are tracked in `lumira-homepage-orientation-technical-gaps-v1.md`

---

## 7) Visual Hierarchy and Density Rules

Hierarchy rules:
- Capture has strongest visual and interaction gravity
- Glossary is prominent but secondary
- Dream Journal is row-2 dominant panel
- Recent Objects and Guide remain quieter

Density and pacing rules:
- avoid equal-weight grid feeling
- avoid feed-like stacking
- preserve readable text-first rhythm
- prefer calm demotion over additive density

Imagery rules:
- images are optional and secondary
- no requirement for scenic cards or generated illustrations
- imagery must never overpower text legibility or reflective pacing

Disallowed homepage elements:
- metric widgets
- charts
- streaks
- progress bars
- task counters
- standalone Active Threads panel

Thread visibility in v1 may appear only through:
- dream item metadata
- recent object context
- orientation/summary surfaces

---

## 8) Anti-Patterns

Prohibited drift:
- dashboardification (equal-weight panel grid with utility overload)
- productivity framing (next tasks, completion pressure, urgency cues)
- analytics framing (metrics-first hierarchy)
- feed framing (scrolling content river)
- thread-inbox framing (active-thread queue as homepage center)

Prohibited tone:
- interpretive authority language
- completion pressure language
- compulsive continuation cues

---

## 9) Open Implementation Questions

1. Should Capture click open a dedicated route (`/capture`) or a focused mode on existing route shell?
2. Should dream orientation and reflective-object orientation share one route pattern with typed rendering?
3. What is the canonical fallback priority for Dream Journal row text: AI summary -> observation summary -> excerpt?
4. Should glossary descriptor use `notes` directly or a derived short form?
5. Should Recent Objects include archived objects when active list is empty?
6. Which desktop viewport baseline defines no-scroll acceptance (for example 1366x768 vs 1440x900)?

---

## 10) Dependencies / Missing Routes (Contract-Level)

Expected route dependencies:
- capture entry route
- glossary page route
- dream journal page route
- sleep/dream-technique guide route
- dream orientation/summary route
- reflective-object orientation/summary route

These dependencies are currently planning-tracked and require implementation tickets.

---

## 11) Validation Checklist

Review must verify:
- Capture is visually primary.
- Glossary is secondary but prominent.
- Dream Journal is the main revisitation surface.
- Recent Objects and Guide remain quieter.
- Page avoids dashboard/task/list overload.
- Fixed preview counts are enforced (Glossary 5, Dream Journal 3).
- Desktop can fit one viewport without scroll where reasonably possible.
- Images are optional and non-dominant.
- No standalone Active Threads panel appears.
- Navigation targets and missing dependencies are explicitly documented.

---

## 12) Canonical References

- `docs/runtime/lumira-reflective-focus-state-contract-v1.md`
- `docs/runtime/lumira-reflective-center-selection-contract-v1.md`
- `docs/canon/lumira-reflective-space-ia-v0.md`
- `docs/canon/Lumira_Interaction_Principles_v0.md`
- `docs/canon/lumira-shared-primitive-redesign-v1.md`
- `docs/canon/lumira-visual-system-philosophy-v1.md`
- `docs/canon/LUMIRA-CONSTITUTION-v1.md`

---

## 13) Final Principle

Homepage composition succeeds when Lumira feels like a calm reflective threshold with clear entry gravity, gentle revisitation, and no productivity pressure.
