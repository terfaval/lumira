# Lumira Reflective Runtime Compatibility Contract v0

## 1. Purpose

This contract defines how the current alpha runtime and the reflective-first target architecture coexist safely during transition.

It exists because direct replacement is unsafe during alpha: current runtime must remain stable while reflective runtime surfaces are introduced in phases.

This document is the canonical bridge for:

- alpha runtime stability
- reflective rebuild direction
- explicit compatibility windows
- phased cutover sequencing
- migration-safe runtime invariants

Core statement:

- during alpha stabilization, continuity and safety have priority over architectural elegance.

## 2. Current Runtime Baseline

Canonical current alpha runtime flow:

- `session -> observe -> frame -> direction -> work -> answer -> revisit`

Current authoritative runtime characteristics:

- orchestration hub: `POST /api/session/ensure`
- version/pointer substrate: `*_versions` + `*_latest` pattern
- work runtime persistence: `work_versions`, `work_latest`
- response persistence: `dream_answers`
- direction persistence: `session_directions`
- highlight split model:
  - `dream_entry_highlights`
  - `dream_session_highlights`
  - `dream_session_rejected_suggestions`
- glossary continuity model:
  - `glossary_terms`
  - `glossary_occurrences`
  - `glossary_notes`
  - `term_candidates`

Boundary statement:

- this baseline is current runtime truth.
- it remains authoritative during alpha stabilization.

## 3. Reflective Target Runtime Direction

Target reflective-first runtime direction includes:

- first-class reflective threads
- first-class reflective openings
- reflective responses and notes
- attention lenses (soft weighting)
- reflective re-entry context
- continuity-aware orchestration
- orientation layer + deep reflection layer behavior

Target runtime intent:

- thread/opening-centered continuity
- invitation-based interaction
- non-authoritative cognition surfacing
- soft pacing and ambient continuity

Boundary statement:

- this section defines target direction, not current runtime truth.

## 4. Compatibility Philosophy

Coexistence strategy principles:

- gradual replacement
- bridge-first migration
- no hard-cut runtime rewrites during alpha
- preserve user continuity
- preserve canonical dream substrate
- avoid dual-write chaos
- prefer adapters over premature route/API rewrites
- preserve non-authoritative interaction model

Single-write-owner principle:

- at any time, each domain has one canonical mutation owner.
- other surfaces may read, project, or adapt, but do not become parallel canonical writers.

## 5. Transitional Runtime Ownership Matrix

| Domain | Current runtime representation | Current owner | Target reflective representation | Target owner | Bridge strategy | Migration status | Replacement conditions | Alpha constraints |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dream Entry | `dream_entries` | `/new` + authenticated user flows | `dream_entries` (unchanged canonical substrate) | same | retain canonical path | KEEP | none; remains canonical | no overwrite by derived systems |
| Observation | `observation_versions/latest` | `session.ensure` observation job | same substrate feeding reflective surfaces | reflective orchestrator stage | retain and reuse | KEEP | none | raw payload remains internal |
| Latent | `latent_versions/latest` | `session.ensure` latent job | same internal substrate for openings/continuity weighting | reflective orchestrator stage | retain and reuse | KEEP | none | never direct user-facing truth |
| Highlights | entry/session split tables | summary/highlights UI + session highlight APIs | unified `highlights` contract | reflective highlight domain | adapter-backed dual read, phased write transfer | BRIDGE | parity for span/suggestion/reject flows | preserve rejection memory and user ownership |
| Reflective Responses | `dream_answers` | `/api/work/answer` | `reflective_responses` | reflective response domain | adapter projection from answers | BRIDGE | response parity + link contract stability | keep answer flow stable during alpha |
| Work Runtime | `work_versions/work_latest` | `/api/work-block/next` | thread activation snapshots + focus pointer | reflective thread runtime | interpret work artifacts as thread/opening lineage | BRIDGE | thread/opening parity and safe fallback | no work-path removal in alpha |
| Directions | `session_directions` | `/api/direction/select` | `attention_lenses` + events | reflective orientation/attention domain | map direction selection to soft lens state | BRIDGE | lens parity and fallback validation | no hard mode-lock behavior |
| Glossary | terms/occurrences/notes/candidates | glossary pages + indexing helpers | motif memory with explicit state semantics | reflective glossary domain | extend current tables with adapter semantics | KEEP+BRIDGE | candidate/pinned/suppression parity | non-authoritative role preserved |
| Orientation | `frame_versions/latest` + `session_index_*` | `session.ensure` frame/index jobs | `orientation_versions/latest` | reflective orientation stage | compatibility projection layer | BRIDGE | orientation parity across routes | remains secondary and collapsible |
| Reflective Openings | embedded in frame/work payloads | frame/work generation stages | `reflective_openings` lifecycle objects | reflective dialogue/opening domain | staged extraction + lifecycle adapter | BRIDGE | opening lifecycle parity + silence safeguards | openings remain optional |
| Reflective Threads | implicit via work/answer/direction state | work runtime + revisit surfaces | `reflective_threads` | reflective continuity runtime | derive thread identities from legacy activity | BRIDGE | stable thread identity + state transitions | session-scoped first in alpha |
| Re-entry Context | summary/session/archive reads | summary + revisit pages | reflective re-entry payload (center + neighborhood) | reflective re-entry runtime | adapter-composed read model | BRIDGE | re-entry coherence validation | no interruption-heavy behavior |

## 6. Compatibility Layer Categories

| Category | Meaning |
| --- | --- |
| Canonical Alpha Runtime | current authoritative runtime behavior required for alpha stability |
| Transitional Compatibility Layer | bridge semantics translating canonical runtime into reflective model-compatible shapes |
| Reflective Target Runtime | intended reflective-first runtime ownership and semantics |
| Deprecated Legacy Surface | runtime surface no longer canonical, pending retirement |
| Temporary Adapter | bounded compatibility component used during ownership transfer window |
| Historical Compatibility Artifact | legacy behavior retained only for provenance/audit, not active owner |

Surface movement rule:

- `Canonical Alpha Runtime` -> `Transitional Compatibility Layer` -> `Reflective Target Runtime` -> `Deprecated Legacy Surface` -> `Historical Compatibility Artifact` (optional).

No surface may jump directly from canonical to removed without:

- parity validation
- rollback path
- owner approval gate

## 7. Transitional Entity Mapping

| Current runtime | Reflective target | Transitional behavior | Persists as canonical during alpha | Adapter-backed | Obsolete/removable later | Alpha removal blocked by |
| --- | --- | --- | --- | --- | --- | --- |
| `work_versions` | thread activation snapshots | project work payload into thread/opening events | yes | yes | yes | thread/opening parity |
| `work_latest` | reflective focus pointer | map latest work pointer to reflective focus read model | yes | yes | yes | focus/re-entry parity |
| `dream_answers` | reflective responses | project answer rows into response semantics | yes | yes | yes | response write/read parity |
| `session_directions` | attention lenses | map direction choice to lens state/events | yes | yes | yes | lens fallback validation |
| frame payloads | orientation payloads | derive orientation-compatible read model | yes | yes | possibly | orientation route parity |
| `dream_entry_highlights` | canonical highlight anchors | retain canonical span anchors | yes | optional | no immediate | highlight span integrity |
| `dream_session_highlights` | continuity/salience layer | bridge suggestion/provenance state | yes | yes | yes | suggestion/reject parity |
| `glossary_terms` | motif memory nodes | extend with reflective state semantics | yes | optional | no immediate | glossary UX continuity |
| latent payloads | internal reflective cognition | keep internal substrate unchanged | yes | no | no | internal cognition safety |
| observation payloads | evidence substrate | keep internal substrate unchanged | yes | no | no | evidence pipeline stability |

Classification summary:

- persists during alpha: dream substrate, ensure-driven observation/latent, work/answer/direction tables, split highlights, glossary core tables.
- adapter-backed during bridge: thread/opening/re-entry projections, orientation unification, lens mapping.
- obsolete later (post-parity): work-card-centric pointers, duplicated highlight state paths, legacy direction-centric semantics.

## 8. Runtime Invariants

These invariants are non-negotiable during transition:

- dream text remains canonical substrate
- AI orientation remains secondary
- reflective openings remain optional
- no forced progression path
- no authoritative interpretation claims
- user-owned salience remains primary
- dismissal/defer semantics remain preserved
- continuity signals remain advisory
- no hidden semantic promotion
- no runtime path may overwrite canonical dream substrate

Invariant vs implementation detail:

- invariant = behavioral/safety contract that must hold regardless of schema/API shape.
- implementation detail = how jobs/routes/tables realize the invariant at a given phase.

## 9. Single-Write-Owner Rules

Rules:

- each domain has one canonical mutation path at a time
- compatibility reads from non-owner stores are allowed
- mirrored payloads are allowed only with explicit write-owner declaration
- parallel canonical mutation ownership is forbidden

Ownership transfer sequencing:

1. define target owner
2. add adapter-backed compatibility reads
3. validate parity and fallback behavior
4. transfer write ownership
5. retire previous owner after gate approval

Adapter-backed compatibility:

- temporary projection/translation layer preserving current runtime contract while consuming target-oriented representations.

Parallel runtime ownership:

- simultaneous competing canonical mutation paths for the same semantic domain.
- prohibited.

## 10. Adapter Philosophy

Allowed adapter behavior:

- payload translation
- compatibility reads
- runtime bridging
- state projection
- temporary compatibility shaping

Forbidden adapter behavior:

- semantic reinterpretation
- silent meaning mutation
- hidden authoritative inference
- permanent dual-runtime ownership
- hidden fallback logic that changes reflective semantics

Adapter lifespan rule:

- adapters must include explicit retirement conditions and cannot become permanent architecture by default.

## 11. Cutover Philosophy

Cutover must be phased and validation-gated.

Required cutover posture:

- phased migration slices
- compatibility windows
- explicit validation gates
- rollbackability
- bridge retirement gates
- runtime audit confirmation

Hard rule:

- no destructive replacement before parity validation.
- alpha runtime stability has priority over elegance.

## 12. Alpha Boundary

| Runtime area | Classification | Alpha contract |
| --- | --- | --- |
| work runtime | KEEP + BRIDGE | keep canonical while thread projections are introduced |
| thread runtime | BRIDGE | reflective thread model introduced via compatibility layer first |
| openings | BRIDGE | lifecycle introduced additively; optionality invariant enforced |
| direction system | KEEP + BRIDGE | keep `session_directions`, map toward lenses |
| glossary recurrence | KEEP | maintain current recurrence model with non-authoritative limits |
| highlight persistence | KEEP + BRIDGE | keep split model, bridge to unified target semantics |
| reflective re-entry | BRIDGE | introduce adapter-composed read model from existing surfaces |
| cross-session continuity | DEFER | keep session-first continuity in alpha |
| orchestration redesign | DEFER | no broad ensure rewrite during alpha stabilization |
| workflow route collapse | DEFER / REMOVE-LATER | no major route semantics replacement in this contract phase |

Classification key:

- KEEP: authoritative in alpha
- BRIDGE: transitional compatibility ownership
- DEFER: postpone deeper redesign
- POST-ALPHA: intentionally out of alpha scope
- REMOVE-LATER: retire only after validated cutover

## 13. Anti-patterns

Explicitly prohibited:

- dual-write chaos
- hidden canonical stores
- silent reinterpretation
- forced reflective progression
- chatification
- workflow resurrection
- premature rebuild replacement
- adapter permanence
- runtime ownership ambiguity
- schema-first redesign without runtime compatibility contract

## 14. Recommended Follow-up Tickets

- `docs/plans/lumira-reflective-reentry-payload-contract-v0.md`
- `docs/plans/lumira-reflective-thread-transition-invariants-v0.md`
- `docs/plans/lumira-reflective-opening-lifecycle-api-contract-v0.md`
- `PLAN - reflective runtime adapter slice planning`
- `PLAN - reflective schema migration sequencing`
- `PLAN - thread/opening persistence planning`

Execution note:

- follow-up items must preserve this contract's ownership matrix and single-write-owner rules.
