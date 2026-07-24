# Lumira Reflective Thread State Machine v0

## 1. Reflective Thread Runtime Philosophy

Reflective threads are continuity trajectories, not tasks or workflow checkpoints.

They exist to externalize and pace reflective continuity that emerges from dream material, user salience actions, and internal probabilistic cognition. They provide a durable but soft structure so reflection can be revisited without coercion.

Thread runtime replaces rigid progression logic with:

- continuity over completion
- optional re-entry over forced next-step behavior
- ambient continuity over prompt pressure
- revisability over interpretive closure

Explicitly:

- thread != task
- thread != todo
- thread != chat session
- thread != symbolic interpretation bucket
- thread != mandatory progression path

Runtime pacing principles:

- foreground only a small number of active continuity centers
- keep most continuity ambient/background by default
- avoid urgency framing
- allow silence as valid system behavior

Resurfacing philosophy:

- resurfacing is a gentle invitation, not a requirement
- resurfacing must be evidence-linked and context-grounded
- resurfacing frequency is bounded by anti-saturation limits

Ambient continuity philosophy:

- unresolved or recurring material can remain valid in the background
- absence of interaction is not failure
- continuity can persist without active prompting

## 2. Thread Lifecycle Model

Canonical thread states for v0:

- `emerging`
- `open`
- `active`
- `answered`
- `dormant`
- `resurfaced`
- `deferred`
- `archived`
- `dismissed`

### State semantics

| State | Meaning | Visibility | Resurfacing eligibility | Continuity weighting | Ownership |
| --- | --- | --- | --- | --- | --- |
| `emerging` | candidate continuity center formed but not yet stabilized | mostly ambient | yes (light) | low-to-medium, volatile | system-initialized, user-validatable |
| `open` | recognized reflective line available for engagement | visible in orientation | yes | medium baseline | shared, user-priority |
| `active` | currently foreground reflective center | foreground | n/a while active | high | user-led with system support |
| `answered` | substantive response exists; line may continue later | visible, reduced prominence | yes | medium if recurrence appears | shared |
| `dormant` | continuity retained but not currently in focus | background | yes (bounded) | low | system-managed, user-overridable |
| `resurfaced` | previously non-foreground thread re-entered focus | visible highlight in orientation/deep reflection | yes, but cooldown applies | medium-high temporary | system-triggered, user-accepted/rejected |
| `deferred` | explicit "not now" by user | minimized visibility | yes only after defer window | low during defer window | user-owned |
| `archived` | historical retained record, not actively circulated | hidden from default focus | no by default | near-zero unless explicit reopen | user-owned/system-assisted |
| `dismissed` | explicit suppression from continuity circulation | hidden/suppressed | no (unless manual restore) | zero | user-owned |

### Allowed transitions

| From | To (allowed) |
| --- | --- |
| `emerging` | `open`, `dismissed`, `archived` |
| `open` | `active`, `answered`, `deferred`, `dormant`, `dismissed` |
| `active` | `answered`, `deferred`, `dormant`, `dismissed` |
| `answered` | `resurfaced`, `active`, `dormant`, `archived`, `dismissed` |
| `dormant` | `resurfaced`, `active`, `archived`, `dismissed` |
| `resurfaced` | `active`, `answered`, `deferred`, `dormant`, `dismissed` |
| `deferred` | `resurfaced`, `active`, `dormant`, `dismissed`, `archived` |
| `archived` | `resurfaced` (explicit reopen only), `dismissed` |
| `dismissed` | `resurfaced` (manual restore only), `archived` |

### Foreground vs background behavior

- foreground states: `active`, `resurfaced` (temporary), optionally `open`
- background states: `emerging`, `answered`, `dormant`, `deferred`
- suppressed/historical states: `dismissed`, `archived`

Dormant/reactivation logic:

- move toward `dormant` when activity and continuity signal strength decay
- reactivate to `resurfaced` when recurrence or user re-entry evidence crosses threshold
- never reactivate `dismissed` automatically

## 3. Opening Lifecycle Model

Constitutional opening postures for v0:

- `silence`
- `invitation_exists`

Terminal constitutional outcomes:

- `accepted`
- `dismissed`

Opening vs question:

- opening: reflective possibility object with context and attachment graph
- question: one possible phrasing of an opening in dialogue

### Opening posture semantics

| Posture / outcome | Meaning | Visibility | Typical transition |
| --- | --- | --- | --- |
| `silence` | no legitimate invitation is surfaced | none | `invitation_exists` when a valid Opening is surfaced |
| `invitation_exists` | optional bounded invitation is available | visible | `accepted` or `dismissed` |
| `accepted` | user selected the Opening | selection handoff | Thread becomes constitutionally real |
| `dismissed` | user suppression | hidden/suppressed | manual restore or continued silence |

Implementation note:
- richer statuses such as generated, candidate, revisited, expired, or archived may remain useful internally
- they are not additional constitutional institutions

### Opening attachment semantics

Openings can attach to:

- highlight anchors
- glossary motifs
- thread centers
- dream entry spans/scenes
- continuity signals
- latent evidence trace slices (internal trace, transformed for user safety)

### Anti-overprompting safeguards

- per-thread opening concurrency cap
- cooldown after dismiss/defer
- no opening surfacing during active uninterrupted writing flow
- no repetitive reformulations of recently dismissed openings
- weak-evidence candidates stay unsurfaced

## 4. Thread Origins and Identity

Potential thread origins:

- highlight
- glossary motif
- reflective opening
- saved response
- unresolved scene
- continuity signal
- latent tension line
- recurring relational pattern
- user-created thread
- accepted Opening selection

Identity rules:

- thread identity is continuity-based, not object-ID-based
- a new object attachment does not automatically create a new thread
- identity persists when reflective center shifts but evidence lineage remains coherent
- when an Opening is accepted, that selection constitutes thread identity at the invitation boundary

Participation boundary:

- the first user-authored response deepens or begins participation inside the already-real thread
- it does not constitute thread identity

Deepen existing vs create new:

- deepen existing thread when new signal reinforces current center-of-gravity
- create new thread when new signal has low continuity overlap and distinct unresolved line

Ambiguity handling:

- when overlap is uncertain, prefer temporary attachment to existing `emerging` or `open` thread
- split into new thread only after repeated divergence signals

Attachment vs identity distinction:

- attachment adds context references
- identity defines the continuity trajectory itself

## 5. Response and Reflection Effects

Runtime events affecting thread continuity:

- reflective responses
- reflective notes
- highlight create/confirm/pin/dismiss
- glossary candidate promote/suppress/pin
- explicit revisit actions

Effects model:

- meaningful response can move `open|active -> answered`
- new response on `answered|dormant` can reactivate via `resurfaced -> active`
- highlight confirmations increase continuity weight and resurfacing eligibility
- repeated linked highlights can branch adjacent continuity lines
- glossary pinning strengthens long-range recurrence memory

When a response resolves vs deepens:

- resolve tendency: response explicitly integrates tension and no reinforcing recurrence appears
- deepen tendency: response introduces additional unresolved material or links new evidence
- adjacent continuity: response references a different center, creating neighbor thread candidate

Reflective neighborhoods:

- threads with repeated shared attachments form neighborhood clusters
- neighborhoods support re-entry context without forcing merge

## 6. Resurfacing Model

Resurfacing signals:

- glossary recurrence
- repeated highlights
- latent continuity inference
- unresolved affect/agency/relational structures
- inactivity gap with later relevant material
- temporal proximity windows
- attention lens weighting
- explicit revisit behavior

Threshold model (conceptual):

- resurfacing requires multi-signal evidence, not single weak indicator
- stronger signals can shorten resurfacing delay
- defer/dismiss states apply hard gating before any resurfacing

Cadence philosophy:

- low-frequency, high-relevance resurfacing
- prioritize quality over quantity
- preserve reflective quietness

Anti-spam rules:

- per-thread resurfacing cooldown
- global resurfacing cap per session window
- demote threads repeatedly deferred or dismissed

Foreground vs ambient continuity:

- resurfacing raises a thread from ambient to temporary foreground candidate
- user engagement determines whether it becomes `active` or returns to background

Saturation handling:

- when many signals compete, surface only top bounded set
- keep remainder as ambient continuity signals

## 7. Reflective Re-entry Contract

Re-entry objective:

- restore continuity context without cognitive overload

Re-entry provides:

- current reflective center
- nearest continuity neighborhood (related threads/highlights/motifs)
- optional openings ranked by gentleness and relevance

Current reflective center determination:

- highest effective weight among non-suppressed threads
- recency, user actions, and lens influence included as soft factors

Active vs passive continuity:

- active: current foreground line (`active` or accepted `resurfaced`)
- passive: dormant/answered/deferred lines retained for context

Re-entry pacing:

- first re-anchor to dream substrate and one center
- then optionally expose neighborhood context
- avoid broad simultaneous continuity dumps

Target experience:

- calm restoration of "where I was reflecting"
- no interrogation, no urgency

## 8. Cross-session Continuity Rules

Alpha-safe v0 boundary:

- primary continuity is session-scoped
- cross-session continuity allowed only as lightweight recurrence cues
- no hard cross-session thread identity lock in alpha baseline

Session-local vs cross-session:

- session-local threads are canonical in v0
- cross-session linkage is advisory metadata for resurfacing candidates

Dormant reactivation across sessions:

- permitted only through evidence-backed recurrence or explicit user revisit
- suppressed/dismissed intent remains respected across sessions

Future requirement for deeper cross-session continuity:

- explicit identity resolution rules
- stronger lineage/audit trace
- user controls for continuity memory scope

## 9. Relationship Graph Model

Conceptual graph:

- `thread` <-> `highlight` (N:M)
- `thread` <-> `glossary_term` (N:M)
- `thread` <-> `opening` (1:N)
- `thread` <-> `response` (1:N)
- `thread` <-> `note` (1:N or N:M via attachments)
- `thread` <-> `continuity_signal` (1:N)
- `opening` <-> attachments (`highlight|term|entry|thread|scene`)
- `response` <-> attachments (`highlight|term|entry|opening|thread|note`)
- `attention_lens` -> soft weighting across threads/openings/signals

Ownership boundaries:

- user-owned: highlights, responses, notes, suppress/defer/dismiss actions
- system-generated: latent weighting, opening generation, continuity signals
- shared negotiated layer: thread state evolution and resurfacing outcomes

Activation flow:

- dream entry -> observation -> latent/internal scoring
- user salience signals + continuity memory -> thread/opening candidate updates
- orientation/re-entry surfaces bounded foreground set

Continuity propagation:

- local event updates thread weight
- neighborhood links propagate reduced secondary influence
- suppression intent blocks propagation into user-facing resurfacing

## 10. Attention Lens Interaction Model

Attention lenses influence:

- resurfacing priority
- opening generation style
- continuity weighting emphasis
- thread foreground ordering

Rules:

- lens effect is soft weighting only
- no hard-lock progression
- no deterministic exclusion of non-matching material

Ambient weighting philosophy:

- lenses bias what is easier to notice
- they do not define what is allowed to exist

Anti-mode-lock safeguards:

- lens decay/cooldown over time
- periodic rebalancing toward unlensed baseline
- explicit user ability to dismiss/disable lens

## 11. Non-authoritative Runtime Rules

Runtime safeguards:

- preserve ambiguity in surfaced openings
- maintain revisability of thread meaning over time
- keep user as final meaning authority
- prohibit diagnostic framing
- avoid symbolic certainty language

Internal vs external behavior:

- internal latent cognition can hold competing hypotheses with confidence metadata
- external thread/opening behavior must communicate possibilities, not verdicts

Safeguards against authority drift:

- require source traces for surfaced openings
- uncertainty-aware phrasing defaults
- dismissal/defer actions immediately influence future surfacing
- no forced continuity closure

## 12. Failure Modes / Anti-patterns

Prohibited runtime drift patterns:

- taskification (threads treated as todos)
- workflow coercion (mandatory next step behavior)
- over-prompting (high-frequency openings)
- forced resurfacing (ignoring suppression/defer intent)
- symbolic certainty (single-truth assertions)
- productivity mechanics (completion scoring loops)
- compulsive continuity pressure
- infinite unresolved loops with no quiet fallback
- interrogation-feeling interactions
- continuity spam
- pseudo-therapy authority stance

Detection guidance:

- track repeated dismiss/defer events per thread/opening
- monitor opening volume vs engagement ratio
- monitor resurfacing repeats without new evidence
- flag certainty-heavy language patterns

Implementation cautions:

- avoid coupling thread state machine to route state progression
- avoid hard dependency on one cognitive signal class
- avoid blending internal confidence into user-visible certainty

## 13. Alpha Boundary

Classification by alpha scope:

| Area | Classification | Alpha guidance |
| --- | --- | --- |
| core thread states (`open/active/answered/deferred/dormant/dismissed`) | KEEP | implement as canonical runtime states |
| `emerging` and `resurfaced` intermediate states | SIMPLIFY | keep but constrain to lightweight transitions |
| opening lifecycle core (`candidate/surfaced/engaged/deferred/dismissed`) | KEEP | required for invitation pacing |
| opening `expired/revisited/archived` nuance | SIMPLIFY | include minimal policy first |
| resurfacing sophistication (multi-signal scoring) | SIMPLIFY | start with bounded heuristics |
| cross-session thread identity resolution | DEFER | keep session-first continuity in alpha |
| continuity neighborhood graph depth | DEFER | shallow links only in alpha |
| latent weighting sophistication | DEFER | baseline weights + source trace only |
| notification-like resurfacing channels | POST-ALPHA | do not add in alpha |
| ambient continuity UI complexity | DEFER | keep low-density orientation presentation |
| long-range reflective memory persistence tuning | POST-ALPHA | after baseline telemetry and safety review |

## 14. Runtime / Backend Implications

Backend orchestration:

- thread lifecycle transitions should be event-driven and idempotent
- opening generation should be a bounded, policy-gated stage
- resurfacing should run under strict cooldown and evidence gates

Schema implications:

- aligns with first-class `reflective_threads`, `reflective_openings`, `reflective_responses`
- requires attachment tables for highlight/glossary/thread/opening/response links
- requires state fields and transition-safe timestamps

Runtime adapters:

- bridge from legacy `work_versions/work_latest` into thread lineage views
- bridge from `dream_answers` into response semantics until full cutover
- map `session_directions` into soft lens state/events

API contract implications:

- explicit thread state transition endpoints/contracts
- opening lifecycle actions (engage/defer/dismiss/revisit)
- re-entry payload contract returning center + bounded neighborhood

Payload contract implications:

- source trace minimum required for surfaced openings
- internal latent payload remains non-user-facing
- transformed continuity signals only in user-facing layers

Compatibility and rebuild sequencing:

- preserve dual-read compatibility windows where needed
- avoid uncontrolled dual-write
- retire bridges only after runtime parity validation gates

Thread/opening ownership implications:

- user actions own suppression and pacing outcomes
- system proposes, user governs surfaced continuity

## Explicit Non-goals

- no SQL schema definition
- no migrations
- no Supabase execution/reset
- no route rewrite
- no runtime code changes
- no React/UI implementation
- no symbolic interpretation engine
- no notification system implementation

## 15. Open Questions

- Should `active` be explicit or derived from `open + foreground_flag` in alpha runtime objects?
- What minimum evidence threshold is required before `generated -> candidate` for openings?
- What is the exact cooldown policy after repeated defer actions?
- Should `answered` ever auto-demote to `dormant`, or require explicit inactivity window checks?
- How should multi-thread overlap be represented when one highlight plausibly anchors two continuity lines?
- When cross-session continuity is deferred, what metadata is still persisted to avoid future rebuild gaps?
- What owner-approved saturation limits should cap concurrent resurfaced/openings per session?

## Recommended Next Documents/Tickets

- `docs/plans/lumira-reflective-opening-generation-policy-v0.md`
- `docs/plans/lumira-reflective-runtime-compat-contract-v0.md`
- `docs/plans/lumira-reflective-reentry-payload-contract-v0.md`
- `docs/plans/lumira-reflective-thread-transition-invariants-v0.md`
- `BUILD/PLAN - reflective thread runtime adapter slice v1`
- `BUILD/PLAN - reflective opening lifecycle API contract v1`
