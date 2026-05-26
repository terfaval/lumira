# Lumira Reflective Focus State Contract v1

## Status

Canonical runtime-interaction contract for Reflective Space attentional modes.

This document defines:
- canonical focus states for Reflective Space
- state-specific foreground/background behavior
- transition and return semantics
- pacing and density constraints
- anti-drift guardrails

This document is:
- contract-level
- runtime-aware
- UX-orchestration-oriented

This document is NOT:
- route map
- component spec
- visual token file
- implementation ticket

---

## Ticket Protocol

### 1) Goal restatement
- Define a first canonical focus-state contract for Reflective Space as attentional modes, not routes.
- Establish how users move between Orientation, Local Interaction, Deep Reflection, and Capture modes.
- Specify foreground/background layering and calm pacing rules per mode.
- Provide unresolved follow-up questions that become next runtime/UX contracts.

### 2) Touched files
- New: `docs/runtime/lumira-reflective-focus-state-contract-v1.md`
- New: `docs/runtime/lumira-reflective-focus-state-technical-gaps-v1.md`

### 3) Planning steps
1. Anchored mode behavior to canon IA/grammar/interaction/visual documents.
2. Mapped focus modes to runtime constraints from opening/thread/re-entry contracts.
3. Defined transition gates and return semantics to avoid workflow-like state jumps.
4. Added implementation-boundary questions and review checks.

### 4) Acceptance criteria (DoD)
- Four canonical focus states defined with purpose, allowed behavior, and anti-pattern boundaries.
- Transition model and return model defined.
- Foreground behavior by mode defined.
- Follow-up contract questions captured explicitly.
- Companion technical gaps document delivered.

### 5) Validation
- Documentation contract only.
- No runtime/schema/UI mutations.

### 6) Rollback
- Documentation-only rollback by reverting this file.

---

## 1) Canonical Position

Focus states are:

# attentional modes

They are NOT:
- routes
- pages
- isolated applications

One mode may appear in multiple runtime contexts.  
Example posture:
- Orientation mode may appear in entry, re-entry, and summary contexts.
- Deep Reflection may appear in thread deepening and sustained response writing.
- Capture mode may appear as first entry or interrupt-safe return path.

Primary experiential objective:

# movement through reflective attention

not movement through software containers.

---

## 2) Focus-State Set (v1)

Canonical modes:
1. Orientation Mode
2. Local Interaction Mode
3. Deep Reflection Mode
4. Capture Mode

Global invariants:
- One reflective center remains legible in every non-capture mode.
- Optionality is always visible.
- Silence remains legitimate.
- User-owned salience outranks inference-only weighting.
- Demotion precedes expansion when density rises.

---

## 3) Orientation Mode

### 3.1 Purpose

Broad reflective orientation and continuity awareness before deepening.

### 3.2 Typical contexts

- reflective-space home entry
- dream summary orientation
- re-entry surfaces
- topology overview around active material

### 3.3 Allowed characteristics

Orientation may be richer and more layered than deep reflection, including:
- observation-derived structure
- thread continuity
- glossary continuity cues
- bounded reflective openings
- recurrence and topology indicators
- ambient continuity markers

All surfaced structure must be runtime-grounded continuity, never decorative density filler.

### 3.4 Constraints

Orientation must not become:
- analytics dashboard
- productivity control center
- insight feed
- workflow manager
- card-grid overload

Richness is allowed. Pressure is prohibited.

### 3.5 Attention behavior

- Multiple structures may remain visible.
- One soft center remains strongest.
- Midground remains revisitable, not demanding.
- Background remains quiet and non-escalating.
- New density cannot appear before competing density demotes.

---

## 4) Local Interaction Mode

### 4.1 Purpose

Small-scale contextual interaction without full attentional narrowing.

### 4.2 Typical interactions

- highlight click/expand
- short note attach
- category confirmation
- glossary promotion/suppression action
- lightweight local annotation

### 4.3 Typical UI posture

- contextual sheet/popover/overlay/local expansion
- temporary and reversible invocation

### 4.4 Core constraint

Local interaction does NOT:
- suppress broad continuity
- trigger immersive deep focus automatically
- become pseudo-editor mode

It should feel lightweight, local, and easy to leave.

---

## 5) Deep Reflection Mode

### 5.1 Purpose

Focused deepening around one reflective center.

### 5.2 Typical contexts

- thread deepening
- opening response
- reflective dialogue continuation
- sustained long-form writing
- emotionally sustained reflection

### 5.3 Activation conditions

Deep Reflection may activate when:
- user intentionally opens or deepens an opening/thread
- sustained writing behavior emerges
- explicit focus/deepen action is taken
- reflective center commitment is clear

Short/local interactions must not auto-escalate into this mode.

### 5.4 Core behavior

Deep Reflection must:
- narrow attention around one center
- reduce visible competition
- suppress peripheral continuity pressure
- preserve nearby context softly
- increase writing/response dominance

Required felt experience:

# stay with this

### 5.5 Clarification boundaries

Deep Reflection is not:
- empty fullscreen editor
- chatbot loop
- isolated textarea
- productivity writing tool

Nearby context remains lightly accessible:
- relevant dream excerpts
- linked highlights
- thread continuity slice
- connected motifs/openings

---

## 6) Capture Mode

### 6.1 Purpose

Immediate low-friction dream preservation.

### 6.2 Primary goals

- speed
- low cognitive overhead
- half-awake usability
- emotional safety
- interruption resistance

### 6.3 Behavioral contract

Capture remains:
- text-first
- visually quiet
- low-glare
- prompt-minimal
- continuity-surface minimal

Avoid in capture:
- reflective prompting
- continuity flooding
- analysis pressure
- topology exposure density

Critical outcome contract:

# capture alone is complete success

No continuation obligation implied.

---

## 7) Foreground Behavior by Mode

| Mode | Foreground behavior | Midground behavior | Background behavior |
| --- | --- | --- | --- |
| Orientation | multiple visible structures with one soft center | contextual, revisitable continuity | dormant continuity remains quiet |
| Local Interaction | temporary local focus element | surrounding mode remains mostly stable | unchanged unless explicit user action |
| Deep Reflection | one dominant reflective center | only center-linked nearby context | broad continuity demoted/suppressed |
| Capture | writing-only dominance | minimal contextual support only | continuity largely withheld |

---

## 8) Transition Contract

### 8.1 Transition philosophy

Transitions must feel:
- gradual
- contextual
- calm
- continuity-preserving

Transitions must not feel:
- abrupt modal switching
- workflow progression
- tool/application switching

### 8.2 Canonical transition paths

- Orientation -> Local Interaction
- Local Interaction -> Orientation
- Orientation -> Deep Reflection
- Deep Reflection -> Local Interaction (context attach)
- Deep Reflection -> Orientation (attentional widen)
- Any mode -> Capture only by explicit capture intent or capture-first entry flow
- Capture -> Orientation only by explicit user pull

### 8.3 Transition gating rules

- Deep Reflection requires explicit focus commitment signal.
- Local Interaction must not escalate by duration alone without user pull.
- Capture mode suppresses unsolicited openings by default.
- If density conflict exists, demote before adding new foreground elements.
- Suppressed/dismissed continuity cannot auto-promote during transition.

---

## 9) Return / Back Contract

Canonical rule:

# return one attentional level backward

Return must restore:
- prior reflective context
- nearby continuity neighborhood
- previous center posture

Return must avoid:
- topology teleportation
- disorienting context resets
- losing local continuity memory

Conceptual return stack:
- Deep Reflection back -> prior Orientation (with same center neighborhood, demoted)
- Local Interaction back -> previous parent mode snapshot
- Capture back -> immediate pre-capture context only if capture interruption path exists; otherwise quiet Orientation entry

---

## 10) Runtime-Interaction Invariants

- Focus states are runtime-attentional concerns, not route ownership concerns.
- One center clarity outranks breadth in every non-capture mode.
- Opening surfacing remains optional in all modes.
- Silence is valid in all modes.
- User defer/dismiss/suppress actions remain binding across transitions.
- Recurrence/adjacency signals cannot force foreground escalation.
- Return behavior must preserve continuity orientation, not workflow progression.

---

## 11) Anti-pattern Guardrails

Prohibited drift:
- dashboardification of Orientation
- escalation of Local Interaction into forced deep mode
- Deep Reflection collapse into chat/editor workflow
- continuity pressure inside Capture
- abrupt mode jumps with state loss
- pressure phrasing during return

Warning indicators:
- simultaneous multi-center foreground competition
- recurring openings despite defer/dismiss
- increased UI density during deepening
- capture screen showing continuity prompts by default

---

## 12) Required Follow-up Questions (Future Contracts)

1. How is reflective center selection computed in Orientation and re-entry?
2. What exact weighting/promotion model governs foreground-midground-background?
3. What explicit overload thresholds trigger demotion or silence?
4. What are canonical resurfacing gates per mode and per user pacing signal?
5. How does mobile narrowing differ from desktop in each mode?
6. Which local interactions may escalate into Deep Reflection, and by what evidence?
7. How are suppressed/deferred structures represented across mode transitions?
8. What persistence semantics are required for focus-state restoration?
9. What telemetry/validation signals prove calmness is preserved?
10. What parity strategy maps current reduced thread/opening states to canonical mode behavior safely?

---

## 13) Review Focus Checklist

Review must verify:
- Orientation remains calm while rich.
- Deep Reflection truly narrows to one center.
- Capture remains interruption-free and non-pressuring.
- Local Interaction stays reversible and non-escalatory.
- Transitions preserve continuity and attentional legibility.
- Return remains cognitively simple and non-disorienting.

---

## 14) Canonical References

- `docs/canon/lumira-reflective-space-ia-v0.md`
- `docs/canon/lumira-reflective-interaction-grammar-v0.md`
- `docs/canon/lumira-shared-primitive-redesign-v1.md`
- `docs/canon/lumira-visual-system-philosophy-v1.md`
- `docs/canon/Lumira_Interaction_Principles_v0.md`
- `docs/canon/opening-interaction-principles-v1.md`
- `docs/canon/LUMIRA-CONSTITUTION-v1.md`
- `docs/superpowers/audits/2026-05-26-reflective-space-experiential-convergence-audit-v1.md`

---

## 15) Final Principle

Focus-state behavior succeeds when Lumira feels like a living attentional environment where depth is entered by user pull, continuity remains layered and calm, and interaction no longer feels like switching panels, routes, or tools.
