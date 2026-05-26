# Lumira Direction-to-Lens Transition Contract v0

## Purpose

Define a safe transition contract for demoting legacy direction-step logic into soft attention-lens context inside Reflective Space, without changing runtime behavior.

This document is planning/validation only.

## Scope and Non-change Guard

- No route changes
- No write-owner transfer
- No persistence/schema changes
- No composer default switch
- No UI behavior changes

Current canonical owners remain unchanged:

- `/api/direction/select` -> `session_directions`
- `/api/work-block/next` -> `work_versions`, `work_latest`
- `/api/work/answer` -> `dream_answers`
- `/api/session-summary` remains legacy-authoritative with guarded additive shadow only

## 1) Direction Artifact Classification

| Artifact | Current role | Classification | Contract rule |
| --- | --- | --- | --- |
| `direction_slug` | selected direction identity on cards/routes | convert to lens metadata | keep as lineage/context field; no hard mode-lock semantics |
| `selected_directions` (summary DTO) | read-model list for session orientation | keep transitional | continue exposing for compatibility; interpret as orientation-only |
| `session_directions` | canonical selection persistence source | keep transitional | stays canonical write source during bridge |
| direction catalog (`direction_catalog`) | source of direction definitions/content | keep transitional | retain data source; progressively reinterpret as lens/style library |
| `direction_card` (`work_versions.payload.kind`) | primary work artifact in current loop | retire later | bridge to opening/thread prompt lineage; do not remove pre-parity |
| `group_tags` | routing/filter hints | convert to lens metadata | treat as soft weighting features and user-preference filters |
| `method_spec` (e.g. `question_style`) | generation style/archetype hints | convert to interaction grammar | move from path-driving logic to style guidance policies |
| `ai_contract` | tone/stance/pacing constraints | convert to runtime policy | preserve as safety/tone policy input, direction-independent over time |
| direction safety flags (`safety`, blocked groups, etc.) | gating and fallback control | convert to runtime policy | remain hard safety constraints; never loosened by lensing |
| pacing/stop rules (`low_novelty`, gentle, stop signals) | escalation control | convert to runtime policy | absorb into calmness/pacing policy |
| `recommended_directions` | next-focus suggestions | convert to lens metadata | optional orientation hints only; no implied required next step |
| direction route UX (`/session/[id]/(flow)/direction`) | explicit selection step | owner decision later | keep during bridge; later may demote/disappear as explicit step |

## 2) Lens Target Semantics

### A future attention lens is

- optional
- soft weighting
- reversible
- non-exclusive
- non-authoritative
- compatible with silence/no-action
- subordinate to reflective center selection and user-owned salience

### A future attention lens is not

- workflow branch
- locked mode
- mandatory step
- forced processing path
- completion objective

## 3) Direction Demotion Rules

Direction demotion progression:

1. Explicit route-step selector (current)
2. Orientation context signal (bridge)
3. Soft lens/posture weighting (target bridge-late)
4. Optional influence on phrasing/surfacing only (target)

Demotion invariants:

- preserve lineage references from direction-era artifacts
- keep safety constraints active throughout
- keep rollback trivial (reader switchback to existing direction semantics)
- maintain write-owner stability until explicit ownership-transfer gate

## 4) Runtime Absorption Map

| Current direction responsibility | Future owner |
| --- | --- |
| tone/safety gating | reflective runtime policy + interaction grammar policy |
| question style shaping | opening generation policy + interaction grammar |
| `group_tags` filtering | attention lens weighting + user preference constraints |
| selected direction signal | transitional lens context in orientation slice |
| direction card behavior | reflective openings + thread-linked prompt lineage |
| pacing/stop pressure control | calmness/pacing policy runtime |
| recommended directions | optional orientation/lens hints in low-pressure layer |

## 5) Transitional Compatibility Rules (Bridge Phase)

Non-negotiable bridge rules:

- `session_directions` remains canonical write source for now.
- `/api/direction/select` remains active for now.
- `/api/work-block/next` remains untouched for this phase.
- composer/re-entry adapters may consume direction-derived context only as soft metadata.
- direction-derived context cannot override suppression/defer/dismiss.
- direction-derived context cannot force foreground surfacing.
- lens signals cannot create thread/opening identity by themselves.
- no hidden dual-write path to future `attention_lenses` while `session_directions` is owner.

## 6) UX Implications (Owner-readable)

Future posture implied by current reflective direction:

- explicit direction step can become optional or disappear later
- different processing approaches can remain available as gentle choices
- user should not feel locked into a prescribed path
- reflective space should feel calmer and less questionnaire-like
- approach variation should feel like attentional posture, not bottled branch logic

## 7) Readiness Gates Before Direction-Step Demotion

Direction-step UX should not be demoted until all gates are met:

1. Reflective read-owner behavior is stable on summary/re-entry guarded paths.
2. Composer shadow triage on owner-reviewed samples has no unresolved `NO_GO`.
3. No suppression/visibility leak, density overflow, or active-lineage no-go classes.
4. Work-route continuity parity is proven under guarded reflective reads.
5. Rollback path is verified (reader switchback and contract compatibility).
6. Owner approves Lumira-feel outcomes (calmness, optionality, non-authoritative posture).

## Owner Decisions Deferred (Not Required for This Ticket)

- When to demote/remove explicit direction-step UX surface.
- Whether to keep a visible “processing modes” chooser and where it lives in Reflective Space.
- Final UX language for lens/posture options.

## Validation Notes

This contract aligns with:

- post-direction alignment synthesis
- runtime route/direction inventory
- reflective runtime architecture/compat/ownership contracts
- reflective interaction grammar and interaction model

No runtime mutation is introduced by this document.
