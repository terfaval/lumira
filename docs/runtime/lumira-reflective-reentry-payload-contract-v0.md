# Lumira Reflective Re-entry Payload Contract v0

## 1. Purpose

Reflective re-entry exists to restore continuity context when a user returns to Lumira, without forcing workflow continuation.

It is first-class because Lumira is continuity-oriented: value depends on how prior reflection is re-surfaced and paced, not only on new generation.

Re-entry is distinct from:

- task resumption: "continue unfinished work steps"
- conversational continuation: "resume the chat thread"
- reflective re-entry: "restore reflective center + bounded continuity context"

## 2. Reflective Re-entry Philosophy

Target re-entry experience:

- calm
- spacious
- orienting without overload
- continuity-aware without pressure
- optional and user-led

Runtime principle:

- help the user re-enter reflective continuity,
- not resume unfinished workflow.

Re-entry should preserve ambient continuity while foregrounding only what is currently most meaningful.

## 3. Re-entry Runtime Layers

| Layer | Purpose | Visibility | Cognitive priority | Persistence behavior | Density constraints | Interaction expectations |
| --- | --- | --- | --- | --- | --- | --- |
| Reflective Center | primary line of current reflection | foreground | highest | durable | exactly 1 center | can be entered/deepened |
| Active Thread Surface | state of center thread | foreground | high | durable | 1 active thread surface | engage/revisit/defer/dismiss |
| Active Openings | optional invitations linked to center | foreground | medium-high | durable lifecycle | max 1-2 surfaced | optional engagement only |
| Ambient Continuity | non-foreground continuity context | peripheral | low | durable | bounded list only | passive awareness |
| Orientation Slice | lightweight map of "where you are now" | visible secondary | medium | versioned | concise summary only | orient + collapse |
| Reflective Neighborhood | nearest related items | expandable secondary | medium-low | derived + linked | max small neighborhood | optional lateral movement |
| Salience Anchors | user-owned highlight anchors | visible | high if user-marked | durable | prioritized subset | confirm/deepen/note |
| Continuity Memory | glossary motif recurrence context | peripheral contextual | low-medium | durable | low-volume hints | optional resonance check |
| Background Signals | latent/continuity cue layer | mostly ambient | lowest | derived/internal-first | minimal surfacing | no direct demand |

## 4. Reflective Center Selection

Center selection is calmness-first, not engagement-maximization.

Selection signal hierarchy:

1. explicit user revisit action
2. recent meaningful engagement (response/highlight action)
3. unresolved continuity with strong evidence
4. active opening attached to high-salience thread
5. strong user-owned highlights
6. glossary recurrence support
7. re-entry recency + thread activity + reflective weight

Tie-resolution philosophy:

- prefer user-explicit signals over system-inferred signals
- prefer unresolved-but-stable lines over volatile novelty
- prefer continuity clarity over density
- when ties remain, choose calmer option (fewer dependencies/openings)

Explicit exclusions:

- no urgency ranking
- no notification-style "unfinished business" logic
- no task completion pressure

## 5. Reflective Neighborhood Model

Reflective neighborhood is the bounded context around the selected center.

Neighborhood may include:

- related highlights
- adjacent threads
- glossary motifs
- linked responses/notes
- resurfacing candidates
- unresolved continuity signals

Neighborhood rules:

- bounded size; only nearest relevance
- no full graph expansion on default re-entry
- adjacency must be evidence-backed
- suppressed/dismissed items excluded by default

Neighborhood is contextual support, not a graph exploration interface.

## 6. Foreground vs Ambient Continuity

Foreground continuity:

- current center thread
- small set of center-linked anchors
- bounded openings

Ambient continuity:

- dormant/answered/deferred lines
- low-priority motifs/signals
- non-center neighborhoods

Transition rules:

- ambient -> foreground only through evidence + pacing gates
- foreground -> ambient via inactivity/deferral/saturation control
- dismissed continuity stays suppressed unless explicit restore

Core constraint:

- not all continuity deserves simultaneous foreground surfacing.

## 7. Active Opening Payload Rules

Re-entry openings are optional invitations, not required next steps.

Surfacing rules:

- show only openings attached to center or near-neighborhood relevance
- hide candidate/weak-evidence openings in ambient/internal layers
- respect defer/dismiss cooldown windows
- suppress openings during active uninterrupted writing

Density bounds:

- max surfaced openings at re-entry: 1 primary + 1 optional secondary
- prefer zero openings to weak openings

Silence rule:

- silence is valid and preferred over noisy low-confidence opening surfacing.

## 8. Salience and Highlight Ordering

Re-entry ordering is salience-first, not engagement-first.

Priority order:

1. user-confirmed/pinned highlights linked to center
2. recent high-salience user highlights
3. repeated salience clusters with continuity support
4. AI-suggested but unconfirmed highlights (low priority)

Aging/fading:

- older highlights degrade in foreground priority unless recurrence/reactivation exists
- repeated user salience restores priority

Safeguard:

- highlight importance is user-owned; no symbolic certainty promotion from recurrence alone.

## 9. Glossary and Continuity Memory Integration

Glossary contributes contextual continuity memory during re-entry.

Allowed surfacing:

- relevant motif recurrence hints linked to center/neighborhood
- user notes on pinned motifs when contextually grounded

Boundaries:

- recurrence is advisory
- suppressed/do-not-surface terms remain hidden
- glossary cannot override current dream evidence

Glossary informs continuity, not deterministic interpretation.

## 10. Cognitive Load and Calmness Constraints

Default re-entry constraints (alpha-safe contract):

- reflective centers: exactly 1 foreground center
- active thread surfaces: max 1
- surfaced openings: max 2 (1 preferred)
- visible neighborhood breadth: max 3 adjacent elements by default
- ambient continuity hints: max 3 low-pressure items
- glossary recurrence hints in foreground: max 1-2

Overload prevention:

- if thresholds are exceeded, demote lowest-confidence items to ambient/internal
- prioritize user-owned anchors and center coherence
- never surface "everything important at once"

Explicitly rejected:

- dashboard overload
- graph explosion
- dense multi-panel pressure at entry

## 11. Re-entry Timing and Cadence

Cadence varies by return interval:

- immediate revisit: restore last center with minimal changes
- same-day revisit: restore center + one continuity update
- long-gap revisit: restore center + cautious orientation slice + optional memory cue
- dormant-thread return: surface as gentle reactivation candidate, not urgent prompt

Temporal rule:

- time influences pacing and threshold strictness, not emotional certainty.

## 12. Mobile / Half-awake Re-entry Considerations

Mobile/low-attention re-entry requires minimal payload mode.

Minimal mode behavior:

- single center summary
- max 1 opening
- reduced neighborhood (0-1 adjacent item)
- no dense continuity clusters by default
- quick anchor to dream text + one continuity cue

Design intent:

- calm-first orientation
- reduced cognitive bandwidth support
- interruption minimization

## 13. Non-authoritative Re-entry Safeguards

Re-entry safeguards must prevent:

- forced continuity
- pseudo-therapy framing
- emotional coercion
- overconfident resurfacing
- symbolic certainty
- "you should revisit this" pressure tone

Required behavior:

- ambiguity-preserving phrasing
- uncertainty-aware surfacing
- optional engagement pathways
- user authority over meaning and pacing

## 14. Transitional Runtime Compatibility

During bridge runtime, re-entry payload is adapter-composed from current canonical runtime plus reflective projections.

Adapter-composed re-entry sources:

- center/thread projection: `work_versions`, `work_latest`, `dream_answers`, `session_directions`
- salience projection: `dream_entry_highlights`, `dream_session_highlights`, rejection memory
- continuity memory: `glossary_terms`, `glossary_occurrences`, `glossary_notes`, `term_candidates`
- orientation projection: frame/index latest payloads
- internal cues: observation/latent substrates (transformed only)

Bridge constraints aligned with compatibility contract:

- single-write-owner remains current alpha runtime owners
- re-entry payload may use compatibility reads/projections
- no hidden parallel canonical stores
- fallback behavior must favor calm minimal payload over noisy synthesis

## 15. Alpha Boundary

| Area | Classification | Alpha guidance |
| --- | --- | --- |
| neighborhood sophistication | SIMPLIFY | bounded local neighborhood only |
| cross-session continuity | DEFER | session-first + lightweight recurrence cues |
| resurfacing complexity | SIMPLIFY | strict thresholds + cooldowns |
| dynamic re-entry adaptation | BRIDGE | basic cadence tiers only |
| continuity weighting sophistication | DEFER | baseline weighting, no deep personalization |
| ambient continuity rendering | KEEP | low-density ambient cues required |
| re-entry personalization | DEFER | avoid heavy profile-driven adaptation |
| multi-thread orchestration | BRIDGE | one center + narrow neighborhood model |

## 16. Failure Modes / Anti-patterns

Prohibited re-entry drift:

- dashboardification
- continuity overload
- graph obsession
- productivity-style resurfacing
- unfinished-business pressure
- interrogation-feeling re-entry
- emotional pressure loops
- notification logic leakage
- symbolic certainty
- continuity spam
- over-dense reflective surfaces

Warning indicators:

- frequent entry without engagement but increasing payload density
- repeated defer/dismiss with unchanged surfacing volume
- high opening count at re-entry despite low evidence quality

Restraint principles:

- when uncertain, reduce density
- when saturated, prefer silence
- when conflicting signals, prioritize user-owned salience and center coherence

Implementation cautions:

- do not couple re-entry payload shape to route-step workflow semantics
- do not leak internal confidence as user-facing authority

## 17. Recommended Follow-up Tickets

- `docs/plans/lumira-reflective-reentry-api-contract-v0.md`
- `docs/plans/lumira-reflective-thread-transition-invariants-v0.md`
- `docs/plans/lumira-reflective-opening-lifecycle-api-contract-v0.md`
- `PLAN - reflective runtime adapter slice planning`
- `PLAN - reflective payload normalization strategy v0`
- `PLAN - reflective re-entry orchestration slices v0`

## Explicit Non-goals

- no runtime code changes
- no API implementation
- no React/UI implementation
- no SQL/schema/migration work
- no Supabase operations
