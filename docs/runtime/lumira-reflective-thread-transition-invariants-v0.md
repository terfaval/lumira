# Lumira Reflective Thread Transition Invariants v0

## 1. Purpose

This document defines non-negotiable runtime truths for reflective thread transitions.

Why this is needed:

- state-machine legality alone is insufficient
- a technically valid transition can still violate reflective continuity, pacing, or user agency
- implementation needs explicit safety guardrails beyond transition tables

Key distinction:

- valid transition: allowed by lifecycle graph
- safe reflective transition: preserves continuity semantics, non-coercion, calmness, and user ownership

## 2. Invariant Philosophy

In Lumira runtime, an invariant is a behavioral truth that must hold regardless of implementation strategy, schema shape, or adapter layer.

Invariants preserve reflective identity by preventing drift into:

- workflow/task logic
- authority escalation
- continuity pressure mechanics

Runtime integrity priority:

- safety and coherence are higher priority than optimization or throughput

Required preserved qualities:

- non-authoritative interaction
- calmness
- continuity restraint
- ambiguity
- user agency
- anti-taskification behavior

## 3. Transition Integrity Principles

Core integrity principles:

- transitions must preserve reflective continuity semantics
- transitions cannot introduce coercion
- transitions cannot escalate urgency
- transitions cannot silently reinterpret meaning
- transitions should remain reversible where philosophically appropriate
- transitions cannot increase density without evidence
- transitions cannot override user-owned salience

Explanation:

- continuity preservation: state changes must keep lineage and center context coherent
- anti-coercion: transitions cannot manufacture mandatory next-step pressure
- anti-urgency: no state change may imply alarm-like importance
- anti-reinterpretation: state changes cannot convert advisory signals into truths
- reversibility: defer/dormant/revisited paths must remain restorable when user intent changes
- evidence-gated density: broader surfacing requires stronger multi-signal support
- salience ownership: user confirmation signals outrank inference-only weighting

## 4. Thread Identity Invariants

Identity invariants:

- weak thematic overlap is insufficient for thread merge
- resurfacing alone cannot create a new canonical identity
- adjacent continuity does not imply identity equivalence
- glossary recurrence alone cannot unify threads
- latent similarity is advisory, never canonical identity proof
- explicit user separation actions must be respected

Merge invariants:

- merge only with strong continuity lineage and attachment coherence
- merge must not erase user-visible historical structure
- merge must preserve both source lineages for auditability

Split invariants:

- split when one thread carries diverging reflective centers over time
- split when user action explicitly separates continuity lines
- split cannot delete source continuity history

Adjacency invariants:

- adjacency may influence neighborhood surfacing
- adjacency cannot mutate thread identity without explicit identity evidence

Continuity relation vs identity equivalence:

- relation: two threads may co-occur, resonate, or cross-reference
- equivalence: two histories represent the same continuity trajectory
- relation is common; equivalence requires stricter proof

## 5. Resurfacing Invariants

Resurfacing safety invariants:

- dismissed continuity never auto-resurfaces without explicit restore
- defer cooldown windows must be respected
- resurfacing requires fresh evidence or contextual reactivation
- low-confidence recurrence cannot repeatedly foreground itself
- repetition alone cannot escalate resurfacing priority
- resurfacing remains optional and user-governed

Resurfacing legitimacy rules:

- must be evidence-backed
- must pass pacing and saturation gates
- must preserve non-urgency tone

Decay/fading invariants:

- unresolved but inactive lines decay toward ambient states
- repeated non-engagement reduces resurfacing priority
- stale resurfacing candidates must expire or demote

Saturation protection invariants:

- per-thread resurfacing attempts are bounded
- global resurfacing competition is capped
- resurfacing volume cannot scale linearly with latent signal count

## 6. Foreground / Ambient Invariants

Foreground/ambient invariants:

- not all continuity can become foreground simultaneously
- ambient continuity cannot silently become active center
- foreground density increases require evidence thresholds
- dismissed elements remain suppressed by default
- low-confidence continuity defaults to ambient/internal

Foreground safety rules:

- exactly one primary reflective center at a time
- foreground additions must be context-linked to center

Ambient restraint rules:

- ambient continuity remains low-pressure and peripheral
- ambient cues cannot carry mandatory progression semantics

Density invariants:

- center clarity outranks breadth
- lower-confidence elements are demoted before center-linked anchors

## 7. Opening-related Thread Invariants

Opening-thread invariants:

- openings cannot force thread activation
- unanswered openings do not imply unresolved failure
- opening dismissal does not delete thread identity
- weak openings cannot establish canonical continuity
- opening recurrence requires contextual legitimacy

Activation safety rules:

- thread activation requires continuity evidence or explicit user engagement
- opening presence alone is insufficient

Anti-pressure safeguards:

- opening volume cannot imply obligation
- deferred/dismissed opening history must reduce re-surfacing aggressiveness

## 8. Response-related Invariants

Response invariants:

- a response does not equal completion
- response submission cannot force thread closure
- reflective depth cannot be inferred from response length
- silence/non-response remains valid
- user notes cannot auto-canonicalize latent interpretations

Response lineage rules:

- responses must preserve source thread/opening context when available
- lineage updates must be additive, not destructive

Closure invariants:

- closure is not inferred from one response artifact
- answered state remains re-openable via valid continuity reactivation

Continuity strengthening constraints:

- continuity strengthening requires coherence + recurrence evidence
- no automatic "depth score" escalation from verbosity alone

## 9. User Agency Invariants

User agency invariants:

- user-owned salience is primary
- user pacing authority is preserved
- explicit dismiss/defer actions are binding inputs
- optionality is preserved
- ambiguity rights are preserved
- unresolved continuity may remain unresolved

Explicit prohibitions:

- forced reflective progression
- urgency escalation
- completion pressure
- emotional coercion

## 10. Non-authoritative Runtime Invariants

Non-authoritative invariants:

- latent cognition never auto-converts into canonical truth
- confidence never surfaces as certainty claim
- recurrence never becomes diagnosis
- continuity weighting never becomes meaning ownership
- runtime must not imply privileged psychological authority

Surfaced/internal separation invariants:

- internal probabilistic signals remain internal by default
- surfaced objects are transformed invitations, not verdicts

Uncertainty-preservation rules:

- ambiguity markers are required when evidence is partial
- competing interpretations can coexist without forced closure

## 11. Adapter / Compatibility Invariants

Bridge-runtime invariants:

- adapters cannot mutate meaning semantics
- compatibility projections cannot create hidden canonical stores
- bridge projections remain secondary to canonical owners
- fallback behavior prefers restraint over synthetic expansion
- compatibility layers cannot become permanent mutation owners

Alignment with compat contract:

- single-write-owner principle remains mandatory
- temporary compatibility reads are allowed
- parallel canonical ownership is prohibited

## 12. Transition Density and Saturation Invariants

Saturation and density invariants:

- repeated resurfacing lowers future resurfacing priority
- saturation reduces surfacing aggressiveness
- density cannot scale linearly with continuity count
- continuity competition remains bounded
- unresolved accumulation cannot create pressure loops

Calmness-preservation rules:

- when uncertain, reduce foreground breadth
- when saturated, prefer ambient or silence states

Overload-prevention invariants:

- center coherence is preserved over multi-thread simultaneity
- low-value candidates demote before user-confirmed anchors

## 13. Forbidden Transition Behaviors

Forbidden behaviors:

- taskification
- workflow resurrection
- forced continuity loops
- pseudo-therapy escalation
- hidden urgency
- resurfacing spam
- automatic emotional escalation
- thread inflation
- graph explosion
- continuity score obsession
- silent thread merging
- hidden semantic mutation
- engagement-optimization logic

Warning indicators:

- rapid growth in open/active states without user salience support
- frequent resurfacing with declining engagement
- merge/split events without explicit lineage evidence
- certainty language increase in surfaced outputs

Implementation cautions:

- do not bind transition logic to route-step completion semantics
- do not treat ranking metrics as identity truths

## 14. Alpha Boundary

| Area | Classification | Alpha guidance |
| --- | --- | --- |
| thread merging sophistication | SIMPLIFY | conservative merge policy, prefer adjacency over merge |
| continuity graph complexity | DEFER | shallow neighborhood links only |
| resurfacing sophistication | SIMPLIFY | strict evidence + cooldown rules |
| adaptive saturation behavior | BRIDGE | baseline saturation gating only |
| cross-session identity persistence | DEFER | session-first identity in alpha |
| probabilistic continuity weighting | BRIDGE | internal baseline weighting, restrained surfacing |
| automatic neighborhood generation | SIMPLIFY | bounded neighborhood assembly |

Alpha-safe simplicity rule:

- default to conservative transitions when evidence or ownership is unclear.

## 15. Runtime / Backend Implications

Guardrail implications for implementation planning:

- orchestration stages must enforce invariant checks before state escalation
- persistence models must preserve lineage and suppression/defer intent
- adapters must remain projection-only and ownership-safe
- re-entry payload builders must respect foreground/ambient bounds
- opening lifecycle APIs must preserve optionality and cooldown semantics
- thread persistence contracts must avoid implicit identity mutation
- cutover planning must include invariant parity gates

This section constrains implementation behavior but does not prescribe exact API or schema design.

## 16. Recommended Follow-up Tickets

- `docs/plans/lumira-reflective-opening-lifecycle-api-contract-v0.md`
- `PLAN - reflective runtime adapter slice planning`
- `docs/plans/lumira-reflective-reentry-api-contract-v0.md`
- `PLAN - reflective payload normalization strategy v0`
- `PLAN - thread persistence planning`
- `PLAN - reflective orchestration slice planning`

## Explicit Non-goals

- no runtime code changes
- no API implementation
- no SQL/migrations/schema execution
- no orchestration rewrite
- no Supabase operations
