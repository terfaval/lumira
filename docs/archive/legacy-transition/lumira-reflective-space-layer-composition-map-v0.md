# Lumira Reflective Space Layer Composition Map v0

## 1. Purpose

This map closes the implementation bridge between:

- reflective experience intent (`lumira-reflective-interaction-grammar-v0.md`)
- projection safety contracts (`lumira-reflective-projection-contract-pack-v0.md`)
- and current runtime behavior (`/session/[id]`, `/session/[id]/summary`, `/api/session-summary`, highlights/work flows).

Interaction grammar defines how Reflective Space should feel. Projection contracts define safe read-model boundaries. This document defines what appears in each layer, what data feeds it, and whether each part is legacy, projected, or future canonical.

Terminology guardrail:
- "Reflective Center", "center card", and "active thread card" are attentional anchors/focus fields.
- They are not authoritative meaning objects and not canonical interpretation containers.

## 2. Reflective Space Layer Model

| Layer | Purpose | User-facing role | Density level | Allowed elements | Prohibited elements |
| --- | --- | --- | --- | --- | --- |
| Orientational Layer | Provide broad continuity orientation without pressure | "Where am I in this session?" | Medium (rich but bounded) | salience anchors, ambient continuity, direction context, neighborhood items | workflow urgency, forced next step, interpretive certainty |
| Deep Reflection Layer | Support focused reflective engagement | "If I go deeper, where do I gently focus?" | Low | one center, bounded active openings, response lineage near center | multi-thread flooding, unresolved-task stacking |
| Foreground Continuity | Show immediate reflective relevance | Primary visible focus | Low | center thread, at most a few surfaced/engaged openings | suppressed/deferred openings, weak latent-only items |
| Midground Continuity | Keep adjacent continuity available | Revisitable nearby context | Low-Medium | adjacent threads, attached/candidate openings, salience anchors | aggressive resurfacing, pressure loops |
| Background Continuity | Preserve context without pressure | Quiet memory backdrop | Low | dormant threads, historical/suppressed highlights, dormant motifs | silent promotion to foreground |
| Reflective Center | Choose one gravitational focus anchor | Anchor for return/deepening attention | Single item | one projected thread with posture/confidence | multi-center competition, forced centering from weak cues, treating center as truth object |
| Active Openings | Invitation surface near center | Optional invitations | Low | surfaced/engaged openings linked to center and non-suppressed | deferred/suppressed foregrounding |
| Salience Anchors | Stable "what mattered" references | User-owned signal anchors | Low | pinned/user highlights, selected suggested anchors | salience inflation, auto-promotion of weak suggestions |
| Continuity Memory | Light motif recurrence memory | Optional reflective memory hints | Low | glossary recurrence labels/counts | canonical interpretation claims |
| Orientation Slice | Compact orientation metadata | "State of the space now" | Minimal | selected directions, center ref, calmness mode, counts | hidden authority scoring |
| Neighborhood | Bounded adjacent context set | Optional exploration around center | Low | adjacent thread/opening/highlight relations with caps | graph explosion/dashboardification |

## 3. Layer Element Inventory

| Element | Layer | Source data | Projection/payload source | Visibility rules | Interaction behavior | Fallback behavior |
| --- | --- | --- | --- | --- | --- | --- |
| Raw dream text | Orientational Layer | `dream_entries` (`kind=raw/raw_entry`) | legacy summary/session read | always available if present | read-only grounding | omit if missing |
| Reflective focus anchor (center card) | Deep Reflection Layer + Foreground | `work_versions` + `dream_answers` + `session_directions` | `projectReflectiveThreadsFromLegacy` + `buildReflectiveReentryPayload.reflective_center` | exactly one; lower-pressure tie-break under ambiguity | attentional anchor for deep reflection (not meaning authority) | center = `null` fallback |
| Active thread focus field (active thread card) | Foreground/Midground | same as above | `active_threads[]` in re-entry payload | bounded by `active_threads_max` | optional revisit path, never interpretive verdict | fallback to legacy latest work |
| Opening invitation | Foreground/Midground | `work_versions`, optional frame recommendations, answers, suppression signals | `projectReflectiveOpeningsFromLegacy` -> `active_openings[]` | only non-suppressed, non-cooldown-active, medium-confidence surfaced/engaged | invitation, not instruction | omit rather than escalate |
| Highlight anchor | Orientational/Midground | `dream_entry_highlights`, `dream_session_highlights`, `dream_session_rejected_suggestions` | `buildUnifiedReflectiveHighlightsProjection` + re-entry `salience_anchors` | pinned/user-owned preferred; rejected suppressed | optional salience revisit | keep legacy split highlights |
| Glossary/motif chip | Continuity Memory/Background | `glossary_terms` (+ occurrences where available) | currently via legacy readers into `continuity_memory` inputs | ambient unless strong recurrence evidence | optional memory cue | omit if unavailable |
| Response lineage item | Deep Reflection Layer | `dream_answers` | `ProjectedThread.response_refs` | attached to center/active thread only | provenance and revisit support | no item if no answer |
| Direction/lens context | Orientation Slice | `session_directions`, catalog context | `direction_or_lens_context` on thread + `orientation_slice.selected_direction_slugs` | ambient metadata | orientation support only | legacy selected directions |
| Ambient continuity hint | Midground/Background | non-active projected threads/openings | `ambient_continuity[]` | capped and sorted calmness-first | optional glance-only continuity | empty list |
| Neighborhood item | Midground | projected threads/openings + salience anchors | `neighborhood[]` | bounded by `neighborhood_max` | optional adjacency exploration | empty neighborhood |
| "Nothing surfaced" state | Foreground | no center/openings or explicit omission | fallback payload branch in `buildReflectiveReentryPayload` | valid and explicit silence | no forced continuation | legacy session summary remains available |
| Deep reflection composer entry point | Deep Reflection Layer | currently work flow route state | currently route-level (`/session/[id]/(flow)/work`) | shown only when user enters flow | explicit user action | stay in orientation surfaces |

## 4. Data Source Mapping

| Source | Current owner | Current use | Reflective use | Projection adapter | Future canonical target | Migration status |
| --- | --- | --- | --- | --- | --- | --- |
| `dream_entries` | `/new` + session entry writes | raw entry display in `/session/[id]`, `/summary`, API summary | grounding text/orientation hint | none required | stays canonical substrate | KEEP |
| `dream_sessions` | session lifecycle routes | session metadata and status | session root for Reflective Space | none required | stays canonical session root | KEEP |
| `frame_versions` | ensure/frame generation | framing text + recommended directions | opening seeds (`frame` source), orientation hint | opening projection frame seed parser | `orientation_versions` + opening lifecycle | BRIDGE |
| `latent_versions` | ensure/latent generation | latent salient elements in summary | ambient continuity/salience hints | currently legacy read; can feed future orientation/continuity memory | continuity signals/orientation layer | BRIDGE |
| `work_versions` | `/api/work-block/next` | work flow cards + summary continuity | projected thread identity/center + work-seeded openings | `projectReflectiveThreadsFromLegacy`, `projectReflectiveOpeningsFromLegacy` | `reflective_threads` + `reflective_openings` | BRIDGE |
| `work_latest` | `/api/work-block/next` pointer write | focus pointer in work flow | projection source ref + center recency signal | thread/opening projection args | reflective focus pointer | BRIDGE |
| `dream_answers` | `/api/work/answer` | answered state + summary/work lineage | projected response refs + opening engagement posture | thread/opening projection + re-entry payload | `reflective_responses` | BRIDGE |
| `session_directions` | `/api/direction/select` | selected direction context in summary/work | direction/lens context in threads and orientation slice | thread/opening projections | `attention_lenses` + lens events | BRIDGE |
| `dream_entry_highlights` | highlights mutations + user actions | entry-span highlights in flow/summary | unified salience anchors and lineage refs | highlight projection + highlight read switch | unified `highlights` | BRIDGE |
| `dream_session_highlights` | highlights API | session-level suggestions/user salience | unified salience anchors + continuity visibility | highlight projection | unified `highlights` | BRIDGE |
| `glossary_terms` | glossary domain | motif memory UI and pin state | continuity memory seed | currently legacy readers, no dedicated projection yet | continuity memory domain | KEEP+PARTIAL |
| rejected suggestion keys (`dream_session_rejected_suggestions`) | highlights API reject flow | suppression memory for suggested highlights | suppress rejected session highlights in projection | highlight projection `rejected_suggestion_keys` | unified highlight suppression model | BRIDGE |
| Projection outputs | reflective projection modules | B1/B2 controlled read paths + dry-run artifacts | Reflective Space layer composition | thread/opening/highlight/re-entry adapters | future canonical reflective payload composer | PROJECTED |

## 5. Payload Composition Map

| Payload | Producer | Consumer | Fields used for Reflective Space | Layer mapping | Status |
| --- | --- | --- | --- | --- | --- |
| Legacy session summary DTO (`/api/session-summary`) | `app/api/session-summary/route.ts` | `/session/[id]/summary` | `session`, `raw_entry`, `frame`, `latent`, `work_versions`, `dream_answers`, `selected_directions`, `catalog` | orientational baseline + legacy deep-reflection proxies | CURRENT LEGACY OWNER |
| Legacy session overview reads (`/session/[id]`) | `app/session/[id]/page.tsx` direct reads | session entry page | raw entry, frame text, work summaries | lightweight orientation/re-entry baseline | CURRENT LEGACY OWNER |
| Thread projection payload | `projectReflectiveThreadsFromLegacy` | work reflective focus switch, re-entry adapter, validation harness | `id`, `state_posture`, `center`, `source_refs`, `response_refs`, `direction_or_lens_context`, `last_activity_at` | reflective center candidate, active/ambient threads | PROJECTED |
| Opening projection payload | `projectReflectiveOpeningsFromLegacy` | work reflective focus switch, re-entry adapter, validation harness | `thread_projection_ref`, `lifecycle_posture`, `visibility_layer`, `suppression_posture`, `cooldown_posture`, `prompt_excerpt`, `source_refs` | active openings, ambient continuity, neighborhood openings | PROJECTED |
| Unified highlight projection payload | `buildUnifiedReflectiveHighlightsProjection` | highlights API reflective mode, highlights flow mapper, validation | `source_refs`, `salience_posture`, `continuity_visibility`, `pin/rejection posture` | salience anchors and background suppression memory | PROJECTED (B1 route-local read active) |
| Reflective re-entry payload | `buildReflectiveReentryPayload` | validation/dry-run flows (not default route owner yet) | `reflective_center`, `active_threads`, `active_openings`, `ambient_continuity`, `orientation_slice`, `neighborhood`, `salience_anchors`, `continuity_memory` | full Reflective Space scaffold | PROJECTED (non-default) |
| Future canonical reflective payload | planned composer | unified Reflective Space route/API | normalized cross-layer contract | all layers | FUTURE CANONICAL |

## 6. Thread Composition Map (Critical)

A reflective thread currently consists of:

- identity: `projected-thread:work:<work_version_id>`
- lineage:
  - mandatory `work_version` source ref
  - optional `work_latest` source ref
  - optional `dream_answer` refs
  - optional `session_direction` refs
- posture:
  - `open`, `answered`, `dormant` (conservative mapping only)
- origin: `work_version` + direction slug + creation time
- center block:
  - prompt/context/material/sequence/mode from `DirectionCardContent`
- linked responses:
  - mapped from `dream_answers` for that `work_id`
- direction/lens context:
  - `primary_direction_slug`, selected direction slugs, matching direction ids
- last activity:
  - max(work created_at, latest response created_at)
- confidence posture:
  - `medium` if answered or has primary direction; otherwise `low`

Current source truth:

- from `work_versions`: base identity, prompt/context, state seed, chronology
- from `dream_answers`: response lineage + answered posture evidence
- from `session_directions`: direction context attachment

Must not be inferred now:

- no merge/split across work ids
- no latent-only or glossary-only thread identity equivalence
- no inferred dismissed/resurfaced lifecycle
- no canonical thread ownership or persistence

Projected vs future canonical thread:

- projected thread: read-only secondary model over legacy `work_*` + `dream_answers`.
- future canonical thread: persisted `reflective_threads` owner with explicit lifecycle writes, still requiring migration gates.

## 7. Opening Composition Map

An opening currently consists of:

- identity: `projected-opening:<source_kind>:<source_ref_id>`
- source seed:
  - work seed from `work_versions` payload
  - optional frame seed from `frame_versions` recommendations
- lifecycle posture:
  - `candidate`, `surfaced`, `engaged`, `deferred`, `expired`
- visibility layer:
  - `internal`, `ambient`, `surfaced`, `foreground`, `suppressed`
- opening type:
  - `reflective_question`, `continuity_noticing`, `motif_resonance`, `scene_return`, `gentle_recall`
- suppression/cooldown:
  - preserved from explicit suppression signals where provided
- thread link:
  - work-seeded openings link to `projected-thread:work:<id>`
- confidence posture:
  - `medium` only with stronger prompt+direction/highlight signal
- `created_from`:
  - `work_payload` or `frame_payload`

Generated vs candidate vs surfaced:

- generated: seed exists from work/frame source.
- candidate: weak/older/ambiguous seed, not foreground.
- surfaced: recent/latest + prompt evidence, still optional.
- engaged: explicit answer evidence.

Current projection-only behavior:

- no persistence writes to `reflective_openings`.
- no inferred dismissed/archived/resurfaced state without explicit signal.

Future persisted lifecycle behavior:

- target `reflective_openings` owner should persist lifecycle transitions and suppression history explicitly, not via inference.

## 8. Reflective Center Selection Map

What can become center now:

- only projected threads (center type `thread` in adapter).

Center influence signals:

- thread posture/confidence
- recency (`last_activity_at`)
- linked opening visibility/suppression
- salience anchor directional overlap
- calmness tie-breakers (answered before open on ambiguity, fewer linked openings)
- adjacency/recurrence signals are suggestive weighting only, not semantic proof

Fallback behavior:

- no eligible threads/openings => fallback payload:
  - `reflective_center: null`
  - empty active/ambient/neighborhood
  - orientation slice with minimal mode and summary hint only.

Ambiguity handling:

- prefer calmer option (`answered` > `open` > `dormant` in tie resolution path)
- prefer lower-density adjacency
- deterministic id/date tie-breaks.

Context posture differences:

- first entry: likely legacy-only orientation until reflective payload becomes default.
- re-entry: center selected from projected threads with calmness tie-breakers.
- orientational overview: allow richer ambient/neighborhood within caps.
- deep reflection: center + bounded active openings only.

## 9. Foreground / Midground / Background Rules

Foreground entry rules:

- center thread always foreground if present.
- active opening must be:
  - linked to center
  - non-suppressed
  - not cooldown-active
  - medium confidence
  - lifecycle `surfaced` or `engaged`
  - visibility `foreground` or `surfaced`.

Midground rules:

- neighbor openings and adjacent threads within `neighborhood_max`.
- salience anchors can appear as midground anchors.
- no automatic foreground promotion from low-confidence/internal items.

Background rules:

- suppressed/deferred/opening-cooldown material stays suppressed/background.
- historical/rejected highlights stay suppressed/historical.
- dormant continuity can remain ambient/background only.

Movement rules:

- no silent promotion from suppressed/internal to foreground.
- demotion before expansion: preserve caps and calmness mode.
- suppression/defer always outranks recency.
- deterministic ordering required for all lists.
- omission is preferred over synthetic coherence when layering conflicts.

## 10. Current vs Target Runtime Gap

| Domain | Current status | Notes |
| --- | --- | --- |
| Threads | PROJECTED | Stable projection model exists; no canonical persistence owner yet |
| Openings | PROJECTED | Lifecycle/visibility projection exists; no canonical lifecycle store |
| Reflective responses | PARTIAL | response lineage projected inside threads; no standalone reflective response projection owner |
| Attention lenses | MISSING/PARTIAL | direction context projected from `session_directions`; no `attention_lenses` runtime owner |
| Highlights | PROJECTED | unified projection exists and B1 reflective-first read is route-local active |
| Glossary/continuity memory | PARTIAL | legacy glossary available; reflective continuity memory not fully standardized |
| Re-entry payload | PROJECTED | adapter implemented and validated in dry-run/validation context |
| Summary/orientation payload | PARTIAL | legacy `/api/session-summary` remains owner; reflective summary is dry-run validation path |
| Deep reflection entry point | EXISTS + PARTIAL | work route exists with B2 reflective focus switch; still legacy write owner |
| Reflective Space unified route contract | MISSING | route/API convergence plan exists, canonical unified payload owner not implemented |
| Future canonical reflective domains (`reflective_threads/openings/responses`) | FUTURE CANONICAL | planned, not transferred |

## 11. Implementation Implications

What should be built next:

1. Reflective Space payload composer foundation that maps layer elements from projection outputs into one route-safe contract.
2. Canonical reflective thread/opening data model plans before any write-owner transfer.
3. Route/API convergence contract update to bind `/session/[id]`, `/summary`, `/api/session-summary` to one unified Reflective Space read contract.

What should remain projection-only for now:

- thread/opening/re-entry summary composition behavior.
- suppression/cooldown behavior derivation.
- highlight unification compatibility reads where split writes remain canonical.

What needs canonical persistence later:

- `reflective_threads`
- `reflective_openings`
- `reflective_responses`
- attention lens events/state.

What needs API contracts:

- unified Reflective Space read DTO
- explicit orientational vs deep-reflection payload partition
- suppression/defer propagation contract across layers.

What needs route convergence:

- current duplication between `/session/[id]`, `/session/[id]/summary`, and `/api/session-summary`.
- ensure B1/B2 route-local switches remain bounded while unified entry/read shape is introduced.

What should not be built yet:

- summary/re-entry production default reflective switch without guarded convergence contract.
- write-owner transfer to reflective tables before parity and rollback gates.

## 12. Recommended Next Tickets

1. `PLAN — Reflective Canonical Runtime Architecture v0`
2. `PLAN — Reflective Thread Canonical Data Model v0`
3. `PLAN — Reflective Opening Canonical Data Model v0`
4. `BUILD — Reflective Space Payload Composer Foundation`
5. `PLAN — Unified Reflective Space Read DTO and Route/API Convergence Contract v0`
6. `VALIDATION — Reflective Space Presentation-layer Validation`

## 13. Implementation-time Review Invariants

Use these invariants during implementation review:
- adjacency must not silently become meaning
- recurrence must not silently become interpretation
- density must not collapse ambiguity/mystery
- projections must remain suggestive/open
- pacing must outrank insight extraction behavior
- omission is preferable to false coherence
- focus anchors (center/thread fields) must remain attentional, not authoritative

## Validation

- Docs/planning-only ticket.
- No runtime code changes.
- No route/API switch.
- No schema/Supabase changes.
