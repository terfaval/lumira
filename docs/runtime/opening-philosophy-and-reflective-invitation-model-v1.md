# Opening Philosophy & Reflective Invitation Model v1

Date: 2026-06-01  
Type: PLAN / AUDIT / REFLECTION ARCHITECTURE  
Status: Draft (architecture/philosophy only; no runtime/schema changes)

## Purpose

Define the role of Openings in Lumira's thread-first reflection architecture:

- what an Opening is and is not,
- what purpose it serves,
- how it relates to reflective threads,
- how it differs from questions,
- and how it remains non-interpretive.

## Scope and Non-Goals

In scope:
- opening definition and purpose model
- opening taxonomy
- opening-thread relationship model
- opening safety and non-opening boundaries
- orientation-vs-opening responsibility split
- readiness assessment against current architecture

Out of scope:
- runtime redesign
- implementation details
- migrations
- code modifications
- symbolic or diagnostic interpretation systems

## Source Basis

Runtime:
- `docs/runtime/lumira-reflection-principle-v0.md`
- `docs/runtime/reflective-direction-model-v1.md`
- `docs/runtime/reflective-thread-model-v1.md`
- `docs/runtime/latent-opening-dialogue-boundary-contract-v1.md`
- `docs/runtime/lumira-reflective-opening-generation-policy-v0.md`
- `docs/runtime/lumira-reflective-opening-lifecycle-api-contract-v0.md`
- `docs/runtime/lumira-reflective-opening-canonical-data-model-v0.md`
- `docs/runtime/latent-governance-primitives-v1.md`
- `docs/runtime/lumira-reflective-cognition-runtime-architecture-v0.md`
- `docs/runtime/reflective-space-viewport-guardrails-v1.md`

Canon:
- `docs/canon/LUMIRA-CONSTITUTION-v1.md`
- `docs/canon/LUMIRA-MINIMAL-REFLECTIVE-RUNTIME-v1.md`
- `docs/canon/opening-interaction-principles-v1.md`
- `docs/canon/lumira-reflective-space-ia-v0.md`

---

## Part A - What Is an Opening?

## Opening Definition

An Opening is a bounded, optional reflective invitation that translates internal continuity signals into user-facing, non-authoritative language.

An Opening:
- invites attention,
- can activate or deepen reflective movement,
- is lifecycle-tracked,
- preserves user pacing and refusal,
- remains uncertainty-aware.

An Opening is not:
- a task,
- a required next step,
- a recommendation command,
- a diagnosis,
- or an interpretation verdict.

### Boundary distinctions

| Object | What it is | How it differs from Opening |
|---|---|---|
| Direction | attentional entry lens | direction selects angle of entry; opening is the invitation moment |
| Thread | continuity trajectory | thread is the journey; opening is one possible activation/deepening event |
| Dialogue | bounded read-model trace | dialogue records interaction lineage; opening is a lifecycle object within it |
| Response | user-authored reflective artifact | response is authored meaning work; opening is pre-response invitation |

### Opening = invitation, Opening != question

Opening = invitation: yes.  
Opening = question: sometimes, but not necessarily.

Question is one expression form.  
Opening can also be:
- noticing
- juxtaposition
- gentle recall
- continuity cue
- reflective pause/silence invitation

---

## Part B - Purpose of an Opening

## Opening Purpose Model

### Purpose ranking (highest to lowest architectural priority)

1. Orient attention  
2. Activate a thread  
3. Deepen a thread  
4. Reconnect a dormant thread  
5. Surface relevant material in bounded form  
6. Gather clarifying information (secondary, optional)  
7. Get an answer (lowest priority; not required)

Reasoning:
- Thread-first architecture prioritizes continuity movement over response extraction.
- Openings are designed for invitation quality, not answer throughput.

### What counts as Opening success

Primary success:
- user feels invited, not pressured,
- user can enter or re-enter a reflective thread safely.

Secondary success:
- user notices new continuity,
- user deepens an existing thread,
- user defers or ignores without pressure cost.

Failure is not non-response.  
Failure is pressure, authority drift, or coercive framing.

---

## Part C - Opening Types

## Opening Type Taxonomy v1

### 1) Noticing Opening

Function:
- marks a bounded pattern or texture.

Example:
- "This motif appears here again."

### 2) Curiosity Opening

Function:
- invites exploratory stance without closure.

Example:
- "It may be worth noticing what feels similar here."

### 3) Connection Opening

Function:
- suggests nearby linked material (dream, motif, response, thread context).

Example:
- "Related material may be nearby."

### 4) Return Opening

Function:
- offers gentle re-entry into a previously active line.

Example:
- "This thread has appeared before."

### 5) Change Opening

Function:
- marks possible shift across appearances over time.

Example:
- "Something may have shifted since earlier entries."

### 6) User-Salience Opening

Function:
- reflects user-owned attention history (highlights/returns/notes).

Example:
- "You've returned to this material several times."

### 7) Reflective-Pause Opening

Function:
- explicitly preserves non-pressure space when invitation exists but questioning is unnecessary.

Example:
- "If useful, you could stay with this quietly for a moment."

Taxonomy notes:
- candidate set is accepted with one addition: Reflective-Pause Opening.
- this addition preserves the "opening != question" rule and silence legitimacy.

---

## Part D - Opening and Thread Relationship

## Opening <-> Thread Model

### How an Opening starts a thread

When continuity evidence is present but no active thread is foregrounded, an opening can become the first user-facing activation event for a new thread candidate.

### How an Opening deepens a thread

An opening deepens a thread when it invites the user to stay with the current center, nearby evidence, or unresolved tension line.

### How an Opening reconnects a dormant thread

An opening reconnects a dormant thread only when:
- local continuity overlap is strong enough,
- suppression/cooldown constraints are satisfied,
- and resurfacing remains low-pressure.

### Multiplicity rules

- Multiple openings may belong to one thread: yes.
- One opening may touch multiple thread candidates: yes, but should foreground one primary thread and keep others ambient.

Model rule:
- opening identity is invitation-layer;
- thread identity is continuity-layer.

---

## Part E - Opening Boundaries

## Opening Safety Boundary

Openings must never do:
- interpretation claims
- diagnosis claims
- identity claims
- symbolic conclusions
- authority substitution

Openings must preserve:
- Pattern != Meaning
- Continuity != Truth
- Attention != Interpretation

Allowed opening posture:
- possibility
- uncertainty
- optionality
- evidence-linked invitation

Forbidden opening posture:
- certainty
- verdict
- coercion
- hidden authority

---

## Part F - Silence and Non-Opening

## Non-Opening Philosophy

`No Opening` is a first-class legitimate outcome.

Lumira should not generate/surface an opening when:
- evidence is insufficient
- continuity is weak
- ambiguity is high
- cooldown is active
- suppression/dismissal constraints apply
- recent dismissal/defer history indicates pressure risk
- reflective value is low
- user is already in uninterrupted deep reflection flow

Design principle:
- no opening is better than weak opening,
- and silence is often safer than forced invitation.

---

## Part G - Orientation vs Opening

## Orientation <-> Opening Boundary

### Orientation responsibilities

Orientation may:
- surface opportunities
- surface directions
- surface thread candidates
- show active vs ambient continuity topology

Orientation answers:
- "What may be relevant now?"

### Opening responsibilities

Opening may:
- invite engagement
- activate movement into thread focus
- deepen active reflection
- reconnect legitimate dormant continuity

Opening answers:
- "Would you like to enter or stay with this line now?"

Boundary rule:
- orientation maps reflective terrain;
- opening initiates optional movement within it.

---

## Part H - Readiness Assessment

## Opening Readiness Assessment

### Already exists

1. Opening as optional invitation posture (contractually explicit)
2. Lifecycle framing (generated/candidate/surfaced/engaged/deferred/dismissed/etc.)
3. Suppression/cooldown and anti-overprompting boundaries
4. Non-authoritative transformation boundary from latent -> opening
5. Silence legitimacy and no-opening allowance

### Partially implemented / constrained

1. Full opening type diversity beyond question-like phrasing
2. Rich thread-identity-aware opening attachment behavior
3. Multi-thread candidate handling with primary vs ambient separation
4. Orientation-opening choreography in user experience
5. Lifecycle parity between canonical richness and simplified active states

### Missing (as mature architecture capability)

1. Fully explicit, stable opening-to-thread identity resolution policy
2. Complete focus-state contract linking orientation and deep reflection movement
3. Mature continuity topology orchestration for opening competition/arbitration
4. Longitudinal invitation quality governance beyond bounded heuristics

### Does current opening architecture resemble invitations more than questions?

Assessment: yes.

Why:
- contracts already define opening as optional invitation object,
- non-question forms are explicitly supported,
- and success criteria emphasize reflective movement and safety over answer extraction.

Current risk:
- UI or phrasing drift can still collapse openings back into "question prompts" if taxonomy and surfacing boundaries are not enforced.

---

## Final Question - Architecture Conclusion

If a user clicks a reflective opportunity tomorrow, Lumira should invite the user into a thread, not default to asking a question.

Why:
- question is only one invitation form,
- thread continuity is the primary reflective unit,
- and thread-entry invitations preserve agency, ambiguity, and non-interpretive safety better than question-first pressure patterns.

The best immediate outcome is:
- an optional, calm thread-activation invitation with clear local context and an equally valid no-response path.

