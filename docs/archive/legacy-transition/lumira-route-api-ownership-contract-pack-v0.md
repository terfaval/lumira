# Lumira Route/API Ownership Contract Pack v0

## 1. Purpose

Define explicit write/read/projection ownership for critical runtime routes and APIs before reflective implementation begins.

Why needed:

- route/API ambiguity creates dual-write drift
- projection layers can silently become de facto owners
- bridge paths can become permanent without deprecation gates

This contract preserves:

- single-write-owner principle
- adapter-first migration
- rollbackability
- parity-first read switching

## 2. Ownership Philosophy

Core principles:

- canonical ownership must always be explicit
- projection reads are not ownership
- read migration is not write migration
- compatibility projections remain secondary
- no hidden fallback canonicalization
- no silent dual-write
- route ownership must stay inspectable via caller audits

Ownership terms:

- write owner: canonical mutation authority
- read owner: canonical read-model authority for a surface
- projection source: canonical inputs used to build projected reads
- adapter layer: compatibility shaping/translation layer
- compatibility reader: temporary consumer of projected/bridge reads

## 3. Runtime Domains

| Domain | Conceptual purpose | Current canonical owner | Target canonical owner | Current read surfaces | Future reflective read surfaces |
| --- | --- | --- | --- | --- | --- |
| Dream Entry | canonical raw substrate | `/new` + `dream_entries` writes | unchanged (`dream_entries`) | `/new`, `/session/[id]`, `/session/[id]/summary` | same + reflective re-entry assembly |
| Observation | descriptive internal substrate | `/api/session/ensure` observe stage | reflective orchestrator (same substrate) | work/frame/summary via derived reads | reflective projection/re-entry builders |
| Latent | probabilistic internal substrate | `/api/session/ensure` latent stage | reflective orchestrator (same substrate) | work/summary derived reads | opening/re-entry projection builders |
| Highlights | user salience anchors | split: entry highlights + session highlights APIs | unified `highlights` domain | summary + highlights flow | unified highlight projection read model |
| Reflective Responses | durable reflection responses | `/api/work/answer` -> `dream_answers` | `reflective_responses` domain | work, summary, revisit | response projection and later native response reads |
| Reflective Threads | continuity structure | implicit via work runtime | `reflective_threads` domain | summary/work continuity artifacts | thread projection + later native thread reads |
| Reflective Openings | invitation lifecycle objects | embedded frame/work outputs | `reflective_openings` domain | frame/work/summary prompt surfaces | opening projection + lifecycle-native reads |
| Attention Lenses | soft orientation weighting | `/api/direction/select` -> `session_directions` | `attention_lenses` domain | direction, summary, work context | lens projection + later native lens reads |
| Re-entry Payload | return-time continuity payload | summary/session page assemblers | reflective re-entry payload builder | `/session/[id]`, `/session/[id]/summary` | canonical re-entry adapter then native builder |
| Orientation | orienting reflective slice | ensure frame/index latest | `orientation_versions/latest` | frame, direction, summary | unified orientation reads |
| Continuity Memory | motif recurrence memory | glossary terms/occurrences/candidates | glossary extended state model | glossary pages + optional work context | motif-linked reflective projections |
| Neighborhood Assembly | bounded adjacent continuity context | summary/session assemblers | reflective neighborhood builder | `/session/[id]`, `/summary` | re-entry + thread neighborhood reads |

## 4. Route/API Ownership Matrix

| Route/API | Current write owner(s) | Current read owner(s) | Projection involvement | Phase A behavior | Phase B behavior | Phase C ownership target | Rollback path | Parity gate requirement | Removal/deprecation conditions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/session/ensure` | ensure jobs write observation/index/latent/frame/anchor/domain jobs | ensure returns latest IDs and status | high (thread/opening/orientation/re-entry projection inputs) | keep canonical writes, add projection outputs only | projection-aware reads for downstream surfaces | keep orchestration owner; shift downstream owners only | disable projection flags, retain legacy ensure outputs | core-flow parity + projection parity | none; remains orchestration hub until explicit replacement plan |
| `/api/direction/select` | writes `session_directions` | direction pages and summary consumers | lens projection source | keep writes; emit lens projection | reflective-first read consumers may use projected lens | transfer write ownership to `attention_lenses` | revert readers to `session_directions` | direction select/read parity | deprecate only after no callers + owner approval |
| `/api/work-block/next` | writes `work_versions`,`work_latest` | work route reads generated block payload | thread/opening projection source | keep writes; produce thread/opening projection | work/summary may read projections | transfer to `reflective_threads/openings` writes | disable projection consumers; keep work contract | work UX parity + thread/opening parity | retire legacy writes after caller-proof + rollback validation |
| `/api/work/answer` | writes `dream_answers` (+ ledger) | work/summary/revisit readers | response projection source | keep writes; emit response projection | reflective reads consume projected responses | transfer to `reflective_responses` writes | restore `dream_answers` read path | answer display/revisit parity | deprecate `dream_answers` writes after parity + approval |
| `/api/session-summary` | no writes | reads sessions/entries/frame/latent/work/answers/directions | primary re-entry/summary projection consumer | keep legacy read assembly + optional projected blocks | switch to reflective-first read blocks behind gate | summary reads from reflective owners | revert to legacy summary assembler | summary parity incl. suppress/defer/density | simplify/remove only if superseded by new canonical summary surface |
| `/api/sessions/[sessionId]/highlights*` | writes `dream_session_highlights` + rejects | reads session highlight state | unified highlight projection source | keep split writes; add unified projection read | summary/highlights read projected unified model | transfer writes to unified `highlights` | revert UI reads to split tables | highlight CRUD/reject/pin parity | split table retirement only after caller-proof + back-compat window |
| `/session/[id]` | none | direct reads from sessions/entries/frame/work/answers | re-entry payload adapter target | add adapter-composed re-entry payload (read-only) | reflective-first re-entry reads | reads from reflective owners post-transfer | fallback to current page query assembly | re-entry parity (center/openings/bounds) | legacy direct reads removable only after parity + rollback test |
| `/session/[id]/summary` | highlight interactions + read assembly | summary API + direct highlight reads | highest-risk projection consumer | keep behavior; integrate projected read blocks guarded | reflective-first summary reads | reflective owners after domain transfers | restore legacy summary read and highlight flows | parity for calmness density + suppress/defer + highlight state | legacy summary read paths removable only after caller-proof |
| `/session/[id]/(flow)/frame` | none direct; ensures frame generation via ensure | frame latest + catalog reads | opening/orientation projection consumer | keep existing reads, expose projected openings optionally | read projected orientation/openings | orientation/opening target reads | fall back to existing frame latest payload | frame content parity + opening optionality parity | remove legacy frame read dependencies only after parity |
| `/session/[id]/(flow)/direction` | invokes `/api/direction/select` writes | reads frame recommendations + selected direction | lens projection consumer | keep current behavior; optional projected lens read | switch read to lens projection | attention lens owner after transfer | switch reader back to `session_directions` | direction continuity + selection parity | legacy direction semantics removable post-transfer |
| `/session/[id]/(flow)/work` | invokes `/api/work-block/next` and `/api/work/answer` | reads work block payload + answers continuity | thread/opening/response projection consumer | keep canonical writes; expose projections | reflective-first read mode for thread/opening/response | thread/opening/response target owners | disable reflective read mode | work flow parity + response parity + suppression parity | legacy work-centric reads removable after transfer + approval |
| `/new` | writes `dream_sessions`,`dream_entries` then ensure call | none | indirect projection bootstrap | unchanged | unchanged | unchanged | current behavior is baseline rollback | new->ensure core-flow parity | none; remains canonical entry substrate initializer |

Dangerous ambiguity zones in matrix:

- `/api/work-block/next` + `/api/work/answer` overlapping continuity semantics
- `/api/session-summary` + `/session/[id]/summary` mixed assembly responsibilities
- split highlight APIs vs page-side highlight edits
- direction select writer vs future lens reader surfaces

## 5. Projection Ownership Contracts

### Thread projections

- Source inputs: `work_versions`, `work_latest`, `dream_answers`, `session_directions`, highlights/glossary links where available.
- Status: projection-only.
- Mutation restriction: no canonical thread writes.
- Parity expectation: thread center/state equivalence with legacy continuity view.
- Fallback: legacy work continuity read path.
- Retirement: after reflective thread write ownership transfer and parity.

### Opening projections

- Source inputs: frame/work generated payloads + continuity signals.
- Status: projection-only.
- Mutation restriction: no canonical lifecycle mutation outside designated owner.
- Parity expectation: surfaced invitation equivalence with current UX prompts.
- Fallback: existing frame/work prompt reads.
- Retirement: after opening lifecycle owner transfer.

### Response projections

- Source inputs: `dream_answers`.
- Status: projection-only.
- Mutation restriction: no write-back mutation into projected target.
- Parity expectation: response listing/re-entry continuity parity.
- Fallback: direct `dream_answers` reads.
- Retirement: after `reflective_responses` write transfer.

### Attention lens projections

- Source inputs: `session_directions`.
- Status: projection-only.
- Mutation restriction: no hidden canonical lens writes.
- Parity expectation: selected direction continuity parity.
- Fallback: direct `session_directions` reads.
- Retirement: after `attention_lenses` ownership transfer.

### Unified highlight projections

- Source inputs: `dream_entry_highlights`, `dream_session_highlights`, reject suggestions.
- Status: projection-only.
- Mutation restriction: preserve split write owners until transfer.
- Parity expectation: add/edit/reject/pin behavior parity across summary/highlights.
- Fallback: split-table reads.
- Retirement: after unified highlight ownership transfer.

### Re-entry payload projections

- Source inputs: summary/session/work/answer/highlight/glossary + frame/latent cues.
- Status: projection-only.
- Mutation restriction: no canonical persistence from re-entry builder.
- Parity expectation: reflective center/opening bounds/suppression parity.
- Fallback: existing summary/session assemblers.
- Retirement: after reflective re-entry canonical read owner stabilizes.

Projection invariant:

- projections are never canonical owners.

## 6. Read-switch Contracts

Preconditions before enabling reflective-first reads:

- caller audit complete for affected route/API
- parity verification passed for content + state + ordering
- fallback path validated
- suppression/defer parity validated
- density/calmness parity validated
- rollback command path documented

Critical distinction:

- reading reflective projection = compatibility consumption
- reflective ownership transfer = canonical write owner change

Read-switch go/no-go:

- `GO` only when parity and rollback checks are green
- `NO-GO` if suppression/cooldown or continuity density deviates

## 7. Ownership Transfer Contracts

### Responses (`dream_answers` -> `reflective_responses`)

- Preconditions: projection parity on work, summary, revisit.
- Rollback: immediate reader reversion to `dream_answers`.
- Caller-proof: no active write callers requiring old contract.
- Approval: owner gate before writer flip.

### Threads/Openings (`work_*` -> `reflective_threads/openings`)

- Preconditions: thread/opening projection parity and lifecycle invariants pass.
- Rollback: restore work-centric continuity reads.
- Caller-proof: no route requires legacy-only write semantics.
- Approval: owner gate + validation report.

### Lenses (`session_directions` -> `attention_lenses`)

- Preconditions: direction parity and read compatibility.
- Rollback: read/write path back to `session_directions`.
- Caller-proof: no hidden consumers of old direction-only semantics.
- Approval: owner gate.

### Highlights (split -> unified)

- Preconditions: summary/highlights CRUD/reject/pin parity and salience invariants.
- Rollback: split-table reads and writes retained.
- Caller-proof: no remaining split-specific write consumers.
- Approval: owner gate.

### Orientation (`frame/session_index` -> `orientation_*`)

- Preconditions: frame/direction/summary orientation parity.
- Rollback: revert to `frame_latest/session_index_latest` reads.
- Caller-proof: no unresolved direct latest-pointer callers.
- Approval: owner gate.

No transfer rule:

- no ownership transfer without safe fallback proof.

## 8. Adapter Layer Contracts

Adapters may:

- do compatibility reads
- assemble projections
- translate state representations
- preserve suppression/cooldown semantics
- provide calmness-preserving minimal fallback

Adapters may never:

- mutate canonical ownership silently
- reinterpret semantics without explicit contract
- escalate lifecycle state silently
- create hidden canonical persistence layers

Adapter boundary rule:

- adapter output is secondary until explicit ownership transfer.

## 9. Summary / Re-entry Ownership Rules

Scope:

- `/session/[id]`
- `/session/[id]/summary`
- re-entry payload assembly
- center selection
- neighborhood assembly
- active opening surfacing

Ownership model:

- current owner: legacy summary/session assemblers + current APIs
- projection owner: re-entry payload adapter (read-only)
- future owner: reflective re-entry payload builder over reflective domain owners

Parity rules:

- center selection parity with calmness-first hierarchy
- bounded openings parity (caps and silence legitimacy)
- neighborhood density parity
- suppression/defer/dismiss parity

Fallback rules:

- revert to legacy summary/session assembly path
- demote projected secondary blocks before removing core legacy blocks

Highest-risk note:

- summary/re-entry is the highest drift risk because it mixes multiple domains into one read surface.

## 10. Highlight Ownership Rules

Split coexistence:

- keep split tables as canonical write owners during bridge phase
- unified projection is read-only compatibility surface

Future transfer:

- transfer to unified `highlights` only after parity for:
  - add/edit
  - reject
  - pin
  - summary vs highlights page consistency

Persistence expectations:

- reject/pin history must remain durable across transfer
- user-owned salience precedence must be preserved

## 11. Suppression / Defer / Dismiss Ownership Rules

Ownership:

- canonical suppression state remains with current owning domain until transfer
- projections must consume, not redefine suppression semantics

Mutation boundaries:

- only designated routes may mutate suppression state
- no duplicate suppression stores with competing truth

Must prevent:

- resurfacing drift
- cooldown inconsistency
- hidden resurrection of dismissed items

## 12. Validation Contracts

Required before read switch, transfer, or bridge retirement:

- caller audit
- route smoke validation
- parity validation
- suppression/defer parity validation
- re-entry payload parity validation
- rollback validation

Go/No-go criteria:

- `GO`: parity passed + rollback tested + caller-proof complete
- `NO-GO`: any suppression/calmness/regression mismatch or unresolved callers

## 13. Dangerous Ambiguity Zones

| Ambiguity zone | Risk | Mitigation | Required audit behavior |
| --- | --- | --- | --- |
| Work runtime vs thread/opening projection overlap | hidden dual semantics | explicit projection contract + no write transfer in Phase A | caller + parity audit per work route |
| Summary/re-entry mixed assembly | drift in center/opening density semantics | dedicated re-entry adapter contract with caps | summary/session payload parity audit |
| Split highlights + unified projection | state inconsistency | keep split writes canonical until transfer gate | summary/highlights CRUD parity audit |
| Direction vs lens projection overlap | implicit ownership drift | keep `session_directions` write owner explicit | direction read/write parity audit |
| Frame/session_index vs orientation target | unclear orientation authority | staged read switch only | frame/direction/summary orientation audit |
| Thread/opening overlap | forced activation or identity drift | enforce transition invariants + opening lifecycle rules | lifecycle trigger/suppression audit |

## 14. Alpha Boundary

| Area | Classification | Alpha sequencing rule |
| --- | --- | --- |
| reflective projections | BRIDGE | add projections without ownership transfer first |
| route coexistence | KEEP + BRIDGE | keep core routes active while reflective reads phase in |
| read-switch behavior | SIMPLIFY | gate each switch with parity + rollback |
| bridge adapters | BRIDGE | temporary and projection-only |
| summary surfaces | KEEP + BRIDGE | maintain stable user surface while re-entry adapts |
| thread/opening ownership | BRIDGE | transfer only after proven parity |
| highlight unification | BRIDGE | split canonical writes remain until transfer gate |
| orientation ownership | DEFER/BRIDGE | unify after route-level parity proof |

Alpha-safe sequencing:

- no big-bang route/API replacement.

## 15. Recommended Immediate Build Slices

### 1. PLAN — Reflective Projection Contract Pack v0

- Dependency order: first
- Risk: medium
- Rollback sensitivity: low

### 2. BUILD — Thread/Opening Projection Slice A1

- Dependency order: after #1
- Risk: high
- Rollback sensitivity: high

### 3. BUILD — Re-entry Payload Adapter Slice A2

- Dependency order: after #2
- Risk: high
- Rollback sensitivity: high

### 4. BUILD — Unified Highlight Projection Slice A3

- Dependency order: after #2 (can run parallel with #3 if isolated)
- Risk: medium-high
- Rollback sensitivity: medium-high

### 5. VALIDATION — Reflective Projection Parity Gate v0

- Dependency order: after #2-#4
- Risk: critical gate
- Rollback sensitivity: critical

Execution rule:

- do not start ownership transfer tickets until #5 passes.
