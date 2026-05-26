# Lumira Reflective Summary/Re-entry Expansion Strategy v0

## 1. Why Summary/Re-entry Is Different

Summary/re-entry is the highest-risk reflective read layer because it is an aggregation surface, not a single-domain surface.

Why this differs from highlights/work/thread projections:
- highlights is a salience subdomain; summary/re-entry combines salience + continuity + orientation + response history
- work continuity focuses one active flow; summary/re-entry sets the emotional and cognitive entry posture for return
- thread/opening projections are components; summary/re-entry composes components into a meaning-shaped experience

Primary danger classes:
- aggregation risk: too many valid signals surfaced at once
- emotional pacing risk: return experience can become dense or urgent
- continuity illusion risk: system implies coherence where evidence is partial
- interpretive drift risk: summary language can slide into authority
- unresolved-pressure risk: "unfinished business" feeling
- narrative overreach risk: synthetic storyline replaces user-owned ambiguity

Current runtime observation:
- `/api/session-summary` aggregates `dream_sessions`, `dream_entries`, `frame`, `latent`, `work_versions`, `dream_answers`, `session_directions`, and catalog in one payload
- `/session/[id]/summary` adds additional direct reads (entry highlights, glossary terms, frame/latent suggestions, rejected keys), increasing coupling and density pressure
- `/session/[id]` remains simpler, but still acts as re-entry and can drift if continuity expansion is unbounded

## 2. Reflective Return Philosophy

Returning should feel like re-orientation into a living dream-space, not resumption of a pending task flow.

Optimization priorities:
- companionship over authority
- orientation over interpretation
- calmness over density
- invitation over insistence
- silence legitimacy over constant surfacing
- incomplete continuity tolerance over forced closure

Non-negotiable posture:
- user remains meaning owner
- system offers bounded reflective context
- uncertainty stays visible where evidence is incomplete

## 3. Summary Philosophy

Reflective summary is a bounded orientation artifact that helps the user locate where reflection currently sits.

Reflective summary is:
- contextual
- provisional
- evidence-linked
- calm and sparse

Reflective summary is not:
- dream interpretation verdict
- therapeutic conclusion
- forced thematic synthesis
- productivity checkpoint

Hard language/behavior boundaries:
- no "this dream means..."
- no hidden clinical authority
- no forced single narrative unification
- no pressure framing around unresolved material

## 4. Re-entry Philosophy

Re-entry should restore one reflective center plus small adjacent context, then allow user-led deepening.

Re-entry principles:
- orientation-first pacing
- bounded continuity
- optional openings
- low cognitive load by default
- emotional spaciousness

Enough continuity at entry:
- exactly one center
- at most one to two active invitations
- small ambient context
- explicit tolerance for "not now"

Re-entry is not reopening a workflow stage.

## 5. Drift Risk Map

| Risk | Severity | Why it matters | Early indicators |
| --- | --- | --- | --- |
| Continuity flooding | Critical | overload at return breaks reflective calmness | high foreground count, dense payload diffs |
| False narrative coherence | Critical | synthetic storyline displaces ambiguity | deterministic "story arc" summaries |
| Emotional over-guidance | Critical | pressure/coercion drift | directive tone, urgency cues |
| Resurfacing pressure | High | defer/suppress parity erosion | repeated reappearance of deferred material |
| Synthetic significance | High | weak signals promoted as core | low-evidence motifs repeatedly foregrounded |
| Latent overreach | High | internal inference leaks as certainty | latent-only surfaced claims |
| Attention hijacking | High | engagement optimization drift | novelty-heavy ranking over salience |
| Unresolved-task feeling | High | workflow resurrection | "continue/complete" framing in re-entry |
| Pseudo-therapy drift | Critical | authority and safety boundary breach | diagnostic framing or prescriptions |
| "AI knows you better" drift | Critical | user agency erosion | privileged-knowledge implication language |

## 6. Reflective Calmness Guardrails

Contract-level guardrails for summary/re-entry expansion:
- reflective center: exactly 1
- active openings surfaced at entry: max 2 (target default 1)
- foreground continuity objects (excluding center): max 3
- ambient continuity hints: max 3
- neighborhood breadth: max 3
- recurrence-based resurfacing in one entry payload: bounded and demoted under ambiguity

Cadence and escalation rules:
- no linear scaling with number of available continuity signals
- no urgency ranking
- if confidence is mixed, omit rather than surface
- if saturation rises, demote to ambient/internal first

## 7. Suppression / Silence Philosophy

Silence is a valid and often preferable summary/re-entry outcome.

Do not surface when:
- defer/suppress/cooldown is active
- evidence is weak or single-signal only
- user recently declined similar openings
- active writing/low-bandwidth context suggests interruption risk
- adding context would exceed calmness caps

Dormant continuity should remain dormant unless:
- fresh evidence appears, or
- explicit user revisit action reactivates it

## 8. Summary/Re-entry Sequencing Strategy

Recommended sequence:
1. internal reflective payload generation (non-user-facing)
2. side-by-side dry-run comparison against legacy payloads
3. hidden/internal parity review with suppression/density focus
4. owner review of evidence packet
5. route-local guarded switch (non-default)
6. bounded rollout with explicit rollback rehearsals
7. broader evaluation before any expansion

Rationale:
- summary/re-entry is aggregation-heavy and must not be first-switched by intuition
- parity must be demonstrated with real payload diffs
- rollback posture must be stronger than B1/B2 due to higher emotional/meaning impact

## 9. Recommended Runtime Boundaries

Initial summary/re-entry reflective runtime must not:
- behave as autonomous interpretation engine
- expose emotional certainty scoring
- perform psychological diagnosis
- aggressively resurface continuity
- surface latent-only continuity without user-visible evidence links
- chain continuity pressure across multiple unresolved lines

Alpha/beta boundary posture:
- alpha: conservative, sparse, high-restraint composition
- beta (future): selectively broader context only after repeated parity/safety evidence

## 10. UX/Interaction Considerations

Implementation-facing interaction guidance:
- pacing: orient first, invite second, deepen only on user action
- density: keep visible reflective objects low at entry
- tone: observational and optional, never prescriptive
- presentation: center-led with bounded adjacent context
- spacing: preserve visual/interaction quietness and avoid panel crowding

Practical UI direction (non-final):
- avoid dashboard-style multi-column aggregation at re-entry
- keep continuity cues collapsible and low-pressure
- keep "continue" affordances optional and non-urgent

## 11. Rollback / Safety Philosophy

Rollback requirements for summary/re-entry must exceed B1/B2 strictness because these surfaces shape return experience and perceived meaning authority.

Required rollback posture:
- route-local disablement must be immediate
- legacy summary/re-entry assembly remains intact and callable
- no persistence dependency on reflective read outputs
- fallback behavior must be deterministic and calmer, not denser
- owner-approved rollback rehearsal required before broader rollout

Principle:
- reversibility and trust preservation are more important than reflective coverage breadth at this stage

## 12. Recommended Next Tickets

1. `VALIDATION — Summary/Re-entry Drift Risk Map`
2. `VALIDATION — Reflective Summary Payload Dry Run`
3. `VALIDATION — Reflective Re-entry Payload Dry Run`
4. `PLAN — Summary/Re-entry Owner Approval Criteria`
5. `PLAN/BUILD — Opening Lineage Precision Tightening` (recommended pre-expansion hardening)

## Validation

Planning/docs-only output.

- No runtime changes
- No route/API switches
- No schema/Supabase changes
- No ownership transfer
