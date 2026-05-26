# Lumira Homepage Mobile and Responsive Composition Contract v1

## Status

Canonical responsive composition contract for Homepage Orientation Hub across mobile and desktop viewport ranges.

This document defines:
- mobile-first homepage threshold behavior
- responsive panel composition rules
- preview suppression behavior for constrained viewports
- density, overflow, and pacing constraints
- implementation blockers/readiness gates for responsive rollout

This document is:
- planning-level
- runtime-UX contract
- implementation-guiding

This document is NOT:
- CSS/component implementation
- runtime/schema mutation
- route implementation
- visual token file

---

## Ticket Protocol

### 1) Goal restatement
- Define canonical mobile and responsive homepage composition without feed/dashboard drift.
- Preserve capture gravity and calm threshold behavior on small screens.
- Distinguish desktop preview-oriented orientation from mobile entry-oriented orientation.
- Provide explicit anti-pattern guardrails and readiness checks before implementation.

### 2) Touched files
- New: `docs/runtime/lumira-homepage-mobile-and-responsive-composition-contract-v1.md`

### 3) Planning steps
1. Anchor mobile composition to homepage orientation, payload, and route/focus contracts.
2. Define canonical mobile structure and per-panel behavior.
3. Define preview suppression and bounded-density rules.
4. Define responsive transition philosophy and implementation blockers.

### 4) Acceptance criteria (DoD)
- Mobile philosophy is explicit and non-feed.
- Canonical mobile structure is defined.
- Preview suppression rules are explicit.
- Overflow/no-scroll guidance is explicit.
- Anti-patterns, blockers, and validation checklist are present.

### 5) Testing / validation plan
- Contract-level review against Section 13 checklist.
- No implementation changes in this ticket.

### 6) Rollback
- Documentation-only rollback by reverting this file.

---

## 1) Purpose and Scope

This contract defines how Homepage Orientation should behave on constrained viewports while preserving reflective calmness and clear entry hierarchy.

Primary objective:

# preserve attentional calmness and capture clarity on small screens without app-shell drift

---

## 2) Relationship to Desktop Composition Contract

Desktop and mobile share the same homepage identity (`Orientation Mode`) but differ in composition strategy.

Architectural clarification:
- Desktop homepage: bounded reflective preview surface.
- Mobile homepage: compact reflective entry surface.

Common invariants:
- calm threshold posture
- non-feed semantics
- non-dashboard semantics
- non-productivity framing

---

## 3) Mobile Philosophy

Mobile homepage remains:

# a fixed reflective threshold surface

It is NOT:
- infinite scroll homepage
- dashboard stack
- feed
- app launcher
- utility menu
- productivity shell

Mobile priority order:
1. immediate capture entry
2. clear orientation destinations
3. bounded low-density surface

---

## 4) Mobile Layout Structure

Canonical mobile layout:

```txt
+----------------------+
|       CAPTURE        |
|   full width / large |
+----------+-----------+
| JOURNAL  |  RECENTS  |
+----------+-----------+
| GLOSSARY |  GUIDE    |
+----------+-----------+
```

Composition rules:
- Capture tile occupies top full-width slot.
- Secondary destinations are compact 2x2 orientation tiles.
- No nested scrolling content inside tiles.

---

## 5) Panel Behavior by Mobile Breakpoint

### 5.1 Capture (mobile)
- visually dominant and first visible
- full-width and highest interaction gravity
- text-first, low-friction, low-light friendly
- no continuity pressure by default

### 5.2 Journal tile (mobile)
- archive entry posture
- optional single soft recency hint allowed
- no scrolling dream rows on homepage

### 5.3 Recent Objects tile (mobile)
- quiet utility entry posture
- optional soft activity hint allowed
- no inbox/task/queue behavior

### 5.4 Glossary tile (mobile)
- entry-first posture
- no visible term list required in v1
- optional single ambient motif hint allowed
- no symbolic density pressure

### 5.5 Guide tile (mobile)
- calm companion-library entry
- static guidance acceptable in v1
- no urgent help-center framing

---

## 6) Preview Suppression Rules

Mobile homepage must NOT attempt desktop preview density.

Suppressed on mobile homepage:
- 5-item glossary preview list
- 3-item dream journal row list
- multi-row excerpts
- dense metadata stacks

Allowed tile micro-content:
- title
- optional icon
- optional one-line quiet descriptor
- optional subtle state hint

Disallowed inside homepage tiles:
- scrolling sublists
- stacked archive rows
- feed-like cards
- multi-section expandable content

---

## 7) Density and Pacing Constraints

Density rules:
- reduce information density as viewport narrows
- preserve one-glance legibility
- preserve clear primary action hierarchy

Pacing rules:
- no urgency markers
- no continuation pressure
- no hidden workflow progression cues

Language constraints:
- avoid "continue your journey" style pressure copy
- avoid setup-completion framing

---

## 8) Overflow and No-Scroll Guidance

Preferred behavior:
- homepage fits one stable screen height whenever reasonably possible

If overflow is unavoidable on smaller devices:
- minimal controlled overflow is acceptable
- overflow must remain short and bounded
- perceived experience must still feel like one surface

Disallowed overflow behavior:
- long vertical content river
- endless card stacking
- multiple nested scroll regions

---

## 9) Responsive Breakpoint Philosophy

Responsive transition principles:
- preserve capture dominance at every breakpoint
- preserve attentional hierarchy during layout shift
- reduce, not increase, homepage density as viewport shrinks

Suggested breakpoint intent model (implementation may choose exact px values):
- `desktop`: preview-oriented two-row composition
- `tablet/medium`: reduced preview emphasis, stronger tile behavior
- `mobile/narrow`: entry-first tile composition with preview suppression

V1 navigation shell decision:
- no hamburger dependency required for homepage core destinations
- core destinations stay directly visible

Rationale:
- prevents app-shell/tool-menu feeling
- preserves threshold immediacy

---

## 10) Anti-Patterns

Prohibited:
- mobile homepage feed stacking
- dashboard-card collapse
- long vertical reflective content river
- dense preview rows
- stacked archive lists on homepage
- nested scroll regions
- hamburger-first app-shell posture
- productivity app navigation framing
- mobile inbox/task feeling
- active-thread queue behavior
- "continue your journey" pressure phrasing

---

## 11) Open Implementation Questions

1. What exact viewport-height acceptance threshold defines "reasonably possible" one-screen fit on common devices?
2. Should tablet breakpoint keep any limited desktop previews, or fully adopt tile behavior?
3. Should mobile tile hints be purely static text or lightly data-driven from aggregate payload state flags?
4. Should guide tile include a "coming soon"-style placeholder state when route is placeholder, or always hard-link once route exists?
5. Should safe-area insets change tile spacing rules on notched devices?
6. What is the canonical fallback when device text scaling forces overflow despite one-screen intent?

---

## 12) Implementation Readiness and Blockers

Required before safe implementation:
1. Responsive breakpoint intent map approved (desktop/tablet/mobile behavior boundaries).
2. Mobile tile-content schema approved (which optional hint fields are allowed).
3. Preview suppression rules integrated into homepage payload consumption rules.
4. Overflow policy approved for small-height devices.
5. Confirmation that no hamburger dependency is required for v1 homepage destinations.
6. Route availability/status alignment with route-map contract (`implemented/placeholder/missing/not_required_v1`).
7. Copy tone guardrails for mobile empty/hint text approved.

Readiness gate:
- do not implement responsive homepage until composition, payload, and route-map contracts are aligned for mobile behavior.

---

## 13) Validation Checklist

Review must verify:
- Capture remains dominant on mobile.
- Mobile homepage remains bounded and calm.
- Secondary panels are compact entry tiles.
- Mobile does not attempt desktop preview density.
- Glossary does not become symbolic feed.
- Journal does not become scrolling archive preview.
- No hamburger dependency exists in v1 homepage composition.
- Homepage avoids long feed-like scroll behavior.
- Responsive behavior preserves attentional hierarchy.
- Mobile still feels like reflective threshold, not app shell.

---

## 14) Canonical References

- `docs/runtime/lumira-homepage-orientation-composition-contract-v1.md`
- `docs/runtime/lumira-homepage-orientation-aggregate-payload-contract-v1.md`
- `docs/runtime/lumira-homepage-route-map-and-focus-state-mapping-contract-v1.md`
- `docs/runtime/lumira-reflective-focus-state-contract-v1.md`
- `docs/runtime/lumira-reflective-center-selection-contract-v1.md`
- `docs/canon/lumira-reflective-space-ia-v0.md`
- `docs/canon/Lumira_Interaction_Principles_v0.md`
- `docs/canon/lumira-visual-system-philosophy-v1.md`
- `docs/canon/LUMIRA-CONSTITUTION-v1.md`

---

## 15) Final Principle

Responsive homepage composition succeeds when Lumira remains a calm reflective threshold across device sizes without collapsing into mobile dashboard, feed, or app-shell behavior.
