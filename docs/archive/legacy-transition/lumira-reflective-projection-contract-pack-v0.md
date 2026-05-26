# Lumira Reflective Projection Contract Pack v0

## 1. Purpose

Reflective projections exist to introduce reflective-first runtime reads in Phase A without changing canonical write ownership.

Why this layer exists now:

- reflective projections reduce cutover risk compared to early canonical rewrites
- projections keep rollback simple (`disable projection read path, keep legacy owners`)
- projections preserve alpha runtime continuity while contracts are validated

This contract preserves:

- projection-only semantics
- single-write-owner principle
- parity-first migration
- rollbackability before ownership transfer

## 2. Projection Philosophy

Core principles:

- projections are secondary read models
- projections are never canonical persistence owners
- projections must not mutate source persistence
- projections must preserve calmness/density/suppression constraints from reflective contracts
- projections must remain removable after transfer
- projections must preserve defer/dismiss/reject semantics
- projections must not increase continuity pressure by default

Boundary terms:

- projection: derived compatibility read model
- canonical runtime owner: domain that owns writes and lifecycle mutation
- compatibility adapter: route/page-side translation layer that serves projected read payloads

## 3. Canonical Phase A Projections

| Projection | Purpose | Source inputs | Output surfaces | Projection ownership | Mutation restrictions | Fallback behavior | Parity expectations | Retirement expectations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Reflective Thread Projection | project continuity trajectories from work-centric runtime | `work_versions`, `work_latest`, `dream_answers`, `session_directions`, highlight/glossary links when available | `/session/[id]/summary`, `/session/[id]`, future re-entry adapter | projection layer only | no thread canonical write, no identity merge writeback | legacy work continuity read path | thread center/state/ordering parity vs current summary/work continuity | retire after `reflective_threads` write ownership transfer + caller-proof |
| Reflective Opening Projection | project opening candidates/surfaced invitations from existing outputs | frame payloads, work payloads, latent cues, continuity signals, highlight salience | work page read surfaces, summary/re-entry surfaces | projection layer only | no persisted lifecycle mutation in source tables | existing frame/work prompt surfaces | opening optionality/suppression/cooldown parity | retire after `reflective_openings` lifecycle owner transfer |
| Reflective Response Projection | map answers to reflective response read objects | `dream_answers`, related `work_versions` metadata | work history, summary, re-entry payload | projection layer only | no reinterpretation or closure auto-write | direct `dream_answers` reads | answer lineage and revisit parity | retire after `reflective_responses` becomes canonical writer |
| Attention Lens Projection | map direction selections to soft lens reads | `session_directions`, direction catalog context | direction/work/summary/re-entry weighting views | projection layer only | no hard-mode state mutation, no deterministic filtering | `session_directions` reads | direction selection continuity parity | retire after `attention_lenses` owner transfer |
| Unified Highlight Projection | unify split highlight stores for reflective reads | `dream_entry_highlights`, `dream_session_highlights`, `dream_session_rejected_suggestions` | summary highlights panel, highlight APIs/readers, re-entry payload | projection layer only | no split-owner mutation bypass | split-table direct reads | pin/reject/state parity across summary and highlights flow | retire after unified `highlights` ownership transfer |
| Reflective Re-entry Payload Projection | compose calm, bounded return payload | projected threads/openings/responses/lenses + summary inputs + highlights/glossary + latent cues | `/session/[id]`, `/session/[id]/summary` | adapter-composed projection | no canonical persistence writes from payload builder | legacy session/summary assembler | center, neighborhood, opening density, suppression parity | retire after native re-entry builder over reflective owners |
| Orientation Projection | project frame/index into orientation-shaped read model | `frame_versions/latest`, `session_index_versions/latest`, latent context | frame/direction/summary/re-entry orientation slices | projection layer only | no orientation authority overwrite | current frame/index reads | frame-summary orientation parity | retire after `orientation_versions/latest` read ownership |

## 4. Reflective Thread Projection Contract

Assembly scope:

- construct thread-like continuity read objects from existing work runtime artifacts
- expose identity candidates, state posture, and adjacency links for reflective reads
- remain session-scoped in alpha

Primary inputs:

- `work_versions.payload` (`direction_slug`, `state`, `sequence`, trace selection material)
- `work_latest.work_version_id`
- `dream_answers` (response lineage and recency)
- highlight and glossary references (when linked in current payload/context)
- `session_directions` as soft continuity context

Projection boundaries:

- project thread state posture only; do not create canonical thread rows
- do not merge identities based on weak similarity
- treat latent/glossary similarity as adjacency hints, not identity equality
- do not escalate ambient continuity to active thread without evidence gates

Identity safety:

- no silent merge
- no silent split
- explicit user-separated material must remain separated
- resurfacing signal alone cannot create new canonical thread identity

Resurfacing limitations:

- projected resurfacing is advisory
- respect suppress/defer history from source cues
- low-confidence recurrence defaults to ambient

Confidence posture:

- surface as tentative/advisory
- never as canonical truth state

## 5. Reflective Opening Projection Contract

Assembly scope:

- extract opening-like objects from frame/work outputs and continuity cues
- classify into generated/candidate/surfaced projection posture

Primary inputs:

- frame latest payload recommendations/framing cues
- work block prompt/trace payload
- latent continuity cues (internal only)
- highlight salience and glossary recurrence hints

Generation/surfacing boundaries:

- `generated`: internal derived candidate
- `candidate`: policy-eligible but not yet surfaced
- `surfaced`: visible optional invitation

Phase A limits:

- projected lifecycle is compatibility-only
- no canonical lifecycle ownership transfer
- no forced opening surfacing if gates fail

Suppression parity:

- preserve defer/dismiss/reject semantics
- preserve silence legitimacy
- preserve cooldown behavior when projecting resurfacing eligibility

Anti-pressure rules:

- no engagement-pressure escalation
- no mandatory question cadence
- no surfacing during active writing flow if gate indicates interruption risk

## 6. Reflective Response Projection Contract

Source:

- `dream_answers` remains canonical writer during Phase A

Projection rules:

- map each answer to reflective-response read object (`response_id`, `work lineage`, `content`, `created_at`)
- derive optional thread/opening linkage from associated work block trace only when explicit
- keep answer ordering deterministic by timestamp

Hard constraints:

- no semantic reinterpretation of answer meaning
- no automatic closure semantics (`answer != thread closure`)
- no mutation of source answer content/state

Parity expectations:

- summary and work history must show equivalent response content/ordering
- revisit continuity must remain stable between legacy and projected readers

## 7. Attention Lens Projection Contract

Source:

- `session_directions` remains canonical selection owner in Phase A

Projection behavior:

- map direction selections to soft attention lens read objects
- represent lens as weighting context, not hard filter state
- allow multiple selected directions to coexist as soft influence

Constraints:

- no deterministic mode-lock behavior
- no hidden ranking authority claims
- no truth-claim escalation from lens state

Parity expectations:

- same selected-direction continuity as current direction/work/summary reads
- no regression in existing direction selection semantics

## 8. Unified Highlight Projection Contract

Source-of-truth inputs:

- `dream_entry_highlights` (text span anchors)
- `dream_session_highlights` (session-level salience/suggestions)
- `dream_session_rejected_suggestions` (dismiss/reject memory)

Projection responsibilities:

- provide unified highlight read shape for reflective consumers
- preserve provenance (`user` vs `suggested`)
- preserve reject memory and de-dup behavior

State mapping posture:

- map split states into reflective-safe highlight posture (`suggested`, `active`, `pinned`, `dismissed`)
- preserve existing CRUD and reject semantics

Duplicate resolution:

- prefer explicit entry highlight span identity for anchor uniqueness
- de-duplicate session suggestions by normalized label/kind + suggestion key
- preserve user-created highlight precedence

Salience precedence:

- user-owned signals outrank inferred/system salience
- rejected suggestions cannot reappear as active without explicit restore path

## 9. Reflective Re-entry Payload Projection Contract

Phase A assembly:

- compose re-entry payload from legacy runtime + projections
- keep one reflective center with bounded neighborhood/openings

Input domains:

- summary baseline payloads
- projected threads/openings/responses/lenses
- unified highlight projection
- glossary motifs/recurrence context
- latent continuity cues (internal weighting only)

Required payload behavior:

- explicit reflective center projection
- foreground/ambient separation
- bounded neighborhood breadth
- bounded opening density
- suppression/defer preservation

Calmness constraints (alpha-safe):

- exactly 1 center
- max 1 primary + 1 secondary surfaced opening
- max 3 neighborhood items
- max 3 ambient continuity cues

Fallback behavior:

- if projection confidence/parity fails, degrade to calmer minimal legacy summary payload
- never expand to dashboard-style dense payload as fallback

## 10. Orientation Projection Contract

Source:

- `frame_versions/latest` and `session_index_versions/latest`

Projection role:

- normalize orientation slice for reflective reads without changing canonical source ownership
- preserve latest-pointer semantics in read assembly

Constraints:

- no hidden authority shift from frame/index to projected orientation
- no mutation of frame/session_index persistence

Parity expectations:

- frame route and summary orientation cues remain behaviorally equivalent
- projected orientation must not alter recommended direction semantics

## 11. Projection Visibility Layers

Visibility categories:

- internal/runtime-only
- ambient
- surfaced
- foreground
- suppressed
- historical

Rules:

- low-confidence continuity defaults to internal/ambient
- surfaced and foreground inclusion must pass calmness gates
- suppressed states must block foreground inclusion
- historical states are readable for lineage but excluded from active surfacing

Inclusion limits:

- foreground capacity is bounded
- ambient list is bounded
- suppressed items are excluded unless explicitly restored

## 12. Projection Invariants

Non-negotiable projection invariants:

- projections cannot create canonical truth
- projections cannot mutate source persistence
- projections cannot silently merge identities
- projections cannot bypass suppress/defer/dismiss/reject semantics
- projections cannot introduce hidden urgency
- projections cannot inflate continuity density
- projections cannot remain hidden fallback owners after parity failure

Safety guarantees:

- projection disablement must immediately restore legacy-authoritative read behavior
- projection output must be traceable to source runtime artifacts

## 13. Projection Parity Requirements

Parity dimensions:

- content parity (what appears)
- state parity (open/answered/deferred/suppressed equivalents)
- ordering parity (deterministic ordering)
- suppression parity (defer/dismiss/reject/cooldown behavior)
- calmness parity (density caps, no overprompting)
- continuity parity (revisit and lineage coherence)

No-go conditions:

- suppression mismatch
- opening density exceeds policy caps
- thread identity drift (unexpected merges/splits)
- highlight reject/pin mismatch
- re-entry center instability across equivalent inputs

Acceptable divergence:

- presentation-level wording/layout variation where semantics are equivalent
- internal confidence metadata differences that remain non-user-authoritative

## 14. Projection Fallback Rules

Fallback posture:

- legacy runtime remains authoritative until ownership transfer
- projection failures must degrade gracefully to legacy reads
- fallback must preserve calmness and suppression semantics

Required fallback behavior:

- disable projection reader per domain/route toggle
- return legacy payload shape without hidden synthesis
- avoid noisy multi-signal synthesis under uncertainty

Isolation rule:

- projection errors in one domain must not force unrelated projection shutdown unless shared safety invariant fails

## 15. Projection Lifecycle / Retirement Rules

Projection lifecycle stages:

1. introduced as read-only compatibility model
2. consumed by gated reflective-first readers
3. validated via parity + caller audits
4. superseded by canonical reflective owners
5. retired and removed

Retirement gates:

- parity proof archived
- caller-proof complete (no active dependency)
- ownership transfer complete for domain
- rollback path validated
- owner approval granted

Hard rule:

- projections are temporary compatibility structures, not permanent runtime owners

## 16. Dangerous Projection Drift Zones

| Drift zone | Risk | Mitigation | Required audits | Rollback trigger |
| --- | --- | --- | --- | --- |
| Hidden projection ownership | projection becomes de facto canonical | explicit owner matrix + mutation prohibition | route/API ownership audit | any write path hitting projection store |
| Thread inflation | too many weak thread objects in foreground | strict center/neighborhood caps + confidence demotion | re-entry/thread parity audit | foreground count or center instability breach |
| Continuity spam | repetitive resurfacing/openings | cooldown + saturation gates + silence policy | opening density audit | repeated low-engagement surfacing spikes |
| Opening resurfacing drift | dismissed/deferred items resurface improperly | suppression-first filter | defer/dismiss parity audit | suppressed opening resurfaced without restore |
| Summary/re-entry density drift | payload overload compared to legacy calmness | bounded layer caps | summary/read payload diff audit | caps exceeded in parity runs |
| Highlight duplication drift | split tables produce duplicate/conflicting unified rows | deterministic de-dup rules | highlight parity audit | duplicate active highlight conflicts |
| Adapter permanence | temporary adapters never retired | retirement gates + roadmap checkpoints | phase gate audit | owner transfer complete but adapter still required |
| Silent semantic reinterpretation | projection changes meaning ownership | evidence trace + invariant checks | invariant compliance audit | inferred certainty appears in surfaced output |

## 17. Alpha Boundary

| Area | Classification | Alpha rule |
| --- | --- | --- |
| core Phase A projections | KEEP | required for adapter-first migration |
| projection-only read ownership | BRIDGE | no canonical write transfer in Phase A |
| advanced adaptive continuity weighting | DEFER | keep basic weighting only |
| probabilistic resurfacing sophistication | SIMPLIFY | strict evidence + cooldown baseline |
| dynamic neighborhood expansion | SIMPLIFY | bounded neighborhood only |
| multi-thread orchestration optimization | DEFER | single-center-first behavior |
| projection caching/persistence complexity | DEFER | avoid extra persistence layers in alpha |
| temporary compatibility adapters | BRIDGE | allowed but must remain removable |
| projection persistence as long-term store | REMOVE-LATER | prohibit as target architecture |

Alpha-safe boundary:

- prioritize simple, auditable projection behavior over sophistication.

## 18. Recommended Immediate BUILD Slices

### BUILD - Thread Projection Slice A1

- Scope: add read-only thread projection from work/answer/direction signals for summary/work/re-entry consumers.
- Dependencies: route/API ownership contract, this projection contract.
- Risk level: high.
- Rollback sensitivity: high (continuity reading path).
- Validation: thread identity/state parity + suppression parity + deterministic ordering checks.

### BUILD - Opening Projection Slice A2

- Scope: add read-only opening projection with generated/candidate/surfaced separation and suppression/cooldown gates.
- Dependencies: A1, opening lifecycle contract, opening generation policy.
- Risk level: high.
- Rollback sensitivity: high (prompting pressure drift).
- Validation: opening density parity, silence legitimacy checks, defer/dismiss parity.

### BUILD - Re-entry Payload Adapter Slice A3

- Scope: adapter-composed reflective re-entry payload over legacy + projected domains.
- Dependencies: A1-A2, re-entry payload contract.
- Risk level: high.
- Rollback sensitivity: high (highest-risk user read surface).
- Validation: center selection parity, foreground/ambient caps, summary/session payload parity.

### BUILD - Unified Highlight Projection Slice A4

- Scope: unified read projection across split highlight tables and reject memory.
- Dependencies: ownership contract, highlight invariants from runtime contracts.
- Risk level: medium-high.
- Rollback sensitivity: medium-high.
- Validation: CRUD/reject/pin parity across summary/highlights APIs and pages.

### VALIDATION - Projection Parity Gate A5

- Scope: cross-domain parity gate before Phase B reflective-first read switches.
- Dependencies: A1-A4 complete.
- Risk level: critical gate.
- Rollback sensitivity: critical.
- Validation: go/no-go report for content/state/suppression/density parity and rollback readiness.

## Validation

- Planning/docs-only contract.
- No runtime code changes.
- No SQL/migration/schema execution.
- No Supabase operations.
