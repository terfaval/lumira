# Visual Philosophy Hardening + Mandatory UI Read Path Design

Date: 2026-06-05
Scope: canon hardening and onboarding enforcement only

## Goal

Reduce future UI drift between routes by making Lumira's visual philosophy enforceable at the route-composition level and by requiring UI contributors to read the relevant visual canon before implementation.

This ticket does not change runtime behavior, route behavior, component code, or the current UI.

## Problem Statement

Lumira's current visual philosophy already defines:

- text-first reflection
- calmness
- reflective surfaces
- reduced stimulation

Those principles are necessary, but not yet sufficient to prevent route-level drift.

A route can remain philosophically aligned in a broad sense while still producing a materially different experience from neighboring routes. The practical failure mode is:

- one route feels like a reflective landscape
- another feels like a document reader
- another feels like a lightweight dashboard

even though all three may claim alignment with the same visual philosophy.

The missing layer is explicit route-composition guidance and stronger onboarding enforcement.

## Required Documents

Primary canon document:

- `docs/canon/lumira-visual-system-philosophy-v1.md`

Supporting canon document:

- `docs/canon/lumira-shared-primitive-redesign-v1.md`

Onboarding entry points:

- `AGENTS.md`
- `docs/AGENT_START_HERE.md`

## Canon Update Strategy

Strengthen the existing visual philosophy document rather than creating a new philosophy document.

Rationale:

- keeps authority centralized
- avoids canon drift across multiple visual docs
- makes route-composition guidance part of product authority rather than optional implementation advice

## New Section: Route Composition Consistency

Add a new normative section to `docs/canon/lumira-visual-system-philosophy-v1.md` named:

# Route Composition Consistency

This section should be written in strong rule language and should explicitly guide future route composition decisions.

### Orientation-Class Routes

Examples:

- Homepage
- Capture
- Orientation Layer

Required characteristics:

- orientation-first
- overview-oriented
- multi-surface composition
- desktop single-viewport preferred where practical
- page-level scrolling avoided where practical
- multiple contextual surfaces visible simultaneously
- possibility space visible at a glance
- not optimized for document-style reading

Required experiential statement:

> these routes should feel like reflective landscapes, not documents

### Reflection-Class Routes

Examples:

- Deep Reflection
- Thread Reflection
- long-form writing environments

Required characteristics:

- intentional attentional narrowing
- fewer simultaneously visible surfaces
- deeper reading and writing support
- document-like reading acceptable
- scrolling natural and expected

Required experiential statement:

> these routes should feel like places to stay with a thought, not orientation dashboards

### Shared Interaction Language

This subsection should state that route composition may vary, but core interaction language must remain stable across routes.

Required invariants:

- recognizable typography hierarchy
- consistent spacing rhythm
- consistent surface behavior
- consistent hover language
- consistent focus-state language
- consistent density budgeting principles

### Shared Visual Identity

Add a dedicated subsection that names the actual drift problem directly.

Core statement:

> Different routes may have different compositions, but they should never feel like different products.

This section should explicitly state that a user moving between:

- Homepage
- Capture
- Orientation
- Journal
- Glossary
- Deep Reflection

must still perceive:

- a shared visual language
- a shared material vocabulary
- a shared typography hierarchy
- a shared interaction energy

This is the route-level identity guardrail that connects philosophy to lived product continuity.

## Onboarding Enforcement

Update onboarding so UI implementation work has a mandatory read path before implementation begins.

Required read order:

1. `docs/canon/lumira-visual-system-philosophy-v1.md`
2. `docs/canon/lumira-shared-primitive-redesign-v1.md`
3. route-specific contract(s)
4. implementation ticket

This should be added wherever the active repo onboarding rules live for contributors/agents doing UI work.

Required meaning of the wording:

- visual philosophy is required context
- primitive philosophy is required context
- route contracts must be interpreted through those documents
- UI work must not begin before this reading path is completed

## File-Level Change Plan

### `docs/canon/lumira-visual-system-philosophy-v1.md`

Add:

- a new `Route Composition Consistency` section
- `Orientation-Class Routes`
- `Reflection-Class Routes`
- `Shared Interaction Language`
- `Shared Visual Identity`

Constraint:

- do not duplicate large existing sections
- extend the current philosophy with route-composition enforcement language

### `AGENTS.md`

Add or strengthen a UI-task-specific read path so UI implementation tickets explicitly require:

- visual philosophy
- shared primitive redesign
- route-specific contract(s)
- ticket

### `docs/AGENT_START_HERE.md`

Add or strengthen the same rule in the onboarding path if this file currently participates in task-entry guidance for UI work.

## Constraints

Do not:

- redesign existing routes
- modify UI implementation files
- create additional philosophy documents
- introduce a new visual system
- duplicate large canon sections

Do:

- strengthen existing canon
- make route-composition guidance enforceable
- improve onboarding consistency
- reduce future route drift

## Validation Plan

Review must confirm:

- `lumira-visual-system-philosophy-v1.md` now contains route-composition-level guidance, not only aesthetic philosophy
- orientation-class and reflection-class routes are explicitly differentiated
- shared interaction language invariants are explicit
- shared visual identity drift is explicitly named
- onboarding now mandates the visual-reads-before-UI-work path
- no runtime or UI implementation files were modified

## Deliverable

Final implementation response should provide:

1. the exact sections added to `lumira-visual-system-philosophy-v1.md`
2. the exact onboarding changes
3. a short explanation of how the additions reduce future UI drift
4. explicit confirmation that no runtime or UI implementation files were modified

## Implementation Recommendation

Keep the change small, canonical, and enforceable:

- one canon extension in the existing visual philosophy doc
- one onboarding enforcement update in repo entry docs
- no additional documentation branches unless a missing onboarding slot requires one sentence of duplication
