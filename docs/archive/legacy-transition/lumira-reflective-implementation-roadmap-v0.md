# Lumira Reflective Implementation Roadmap / Build Sequencing v0

## Purpose

Translate completed reflective architecture contracts into an execution-safe implementation sequence.

Scope:

- build sequencing and dependency order
- parity gates and rollback posture
- ownership transfer prerequisites

Out of scope:

- runtime code changes
- SQL/migration execution
- Supabase operations

## 1. Current Implementation Baseline

Current canonical runtime remains:

- `session -> observe -> frame -> direction -> work -> answer -> revisit`

Canonical orchestration/API baseline:

- `POST /api/session/ensure` (orchestration hub)
- `POST /api/direction/select`
- `POST /api/work-block/next`
- `POST /api/work/answer`
- `GET /api/session-summary` (active, simplify candidate)

Active route baseline (core):

- `/new`
- `/session/[id]/(flow)/frame`
- `/session/[id]/(flow)/direction`
- `/session/[id]/(flow)/work`
- `/session/[id]`
- `/session/[id]/summary`
- `/archive`

Current canonical tables for alpha flow (minimum):

- `dream_sessions`, `dream_entries`
- `dream_answers`
- `session_directions`
- `work_versions`, `work_latest`
- `observation_versions/latest`
- `latent_versions/latest`
- `session_index_versions/latest`
- `frame_versions/latest`
- `dream_anchor_versions/latest`
- `direction_catalog`
- `domain_jobs`

Baseline truth rule:

- current runtime stays authoritative until explicit parity gates are passed.

## 2. Build Principles

- small slices only
- adapter-first before ownership transfer
- single-write-owner at every phase
- no big-bang rewrites
- no legacy bridge table recreation by default in fresh baseline
- legacy bridge recreation only with explicit route/API caller proof
- validation after every risky slice
- rollback path required before read-switch or write-transfer

## 3. Phase A Roadmap — Reflective Projections (No Ownership Transfer)

Goal:

- keep legacy write owners canonical
- add reflective projections and compatibility read models

### A1. Thread projection over work runtime

- Deliverable: projection contract/model from `work_versions/work_latest + dream_answers + session_directions` to reflective thread read object.
- Likely files touched (future build): `src/domain/work/**`, `src/domain/reflective/**`, `app/api/work-block/next/route.ts`, projection utility layer.
- Validation: projection parity sample vs current work card continuity in `session/[id]/work` and `session/[id]/summary`.
- Rollback: projection feature-flag off; fallback to current work read path only.

### A2. Opening projection from frame/work payloads

- Deliverable: opening projection from frame/work payloads into lifecycle-compatible opening read objects.
- Likely files: `app/api/session/ensure/route.ts`, `app/api/work-block/next/route.ts`, reflective opening projection module.
- Validation: opening count/attachment/source trace parity against current UI-visible prompts.
- Rollback: disable opening projection reads, keep existing prompt sources.

### A3. Re-entry payload adapter

- Deliverable: adapter-composed re-entry payload using center + bounded neighborhood + opening caps.
- Likely files: `app/session/[id]/page.tsx`, `app/session/[id]/summary/page.tsx`, shared re-entry payload builder module.
- Validation: re-entry payload caps (center=1, opening<=2, neighborhood bounded) and suppression/defer respect.
- Rollback: revert to current summary/session read assembler.

### A4. Highlight unified read model projection

- Deliverable: read projection unifying `dream_entry_highlights` + `dream_session_highlights` + reject memory.
- Likely files: `app/api/sessions/[sessionId]/highlights/route.ts`, summary/highlights shared helpers, `components/HighlightsPanel.tsx` consumers.
- Validation: highlight CRUD + reject + pin parity on summary and highlights routes.
- Rollback: dual-table direct reads unchanged; disable unified projection consumer.

### A5. Direction -> attention lens and answers -> reflective response projections

- Deliverable: projection layer for `session_directions` to lens read object and `dream_answers` to reflective response read object.
- Likely files: `app/api/direction/select/route.ts`, `app/api/work/answer/route.ts`, summary/work read assemblers.
- Validation: direction selection parity, answer display/revisit parity.
- Rollback: disable lens/response projection consumers.

## 4. Phase B Roadmap — Reflective-first Reads (Legacy Writes Still Canonical)

Read-switch order (recommended):

1. summary/re-entry read surfaces
2. highlights surface read models
3. opening read surfaces
4. thread-oriented read surfaces
5. direction/lens read surfaces

Parity requirements before each read switch:

- route/API caller audit complete
- projection parity report (content/state/ordering)
- suppression/defer/dismiss behavior verified
- fallback path tested

UI/API read migration order:

- `/session/[id]/summary` + `/session/[id]` (re-entry first)
- `/session/[id]/(flow)/highlights`
- `/session/[id]/(flow)/work` opening/thread-aware reads
- optional secondary: `GET /api/session-summary` consumers

## 5. Phase C Roadmap — Ownership Transfer

Transfer order (domain-by-domain):

1. `dream_answers` -> `reflective_responses`
2. `work_versions/work_latest` -> `reflective_threads` + `reflective_openings`
3. `session_directions` -> `attention_lenses`
4. split highlight writes -> unified `highlights`
5. `frame/session_index` read ownership -> `orientation_versions/latest`

Required gate for each transfer:

- read parity proven in production-like validation
- single-write-owner target defined
- rollback route/API + data path documented
- owner approval checkpoint passed

Primary risks:

- dual-write drift
- hidden legacy caller still mutating old owner
- suppression/cooldown semantics regressions

## 6. Phase D Roadmap — Bridge Retirement

Bridge retirement candidates:

- `work_latest`, then `work_versions` compatibility paths
- `dream_answers` compatibility reads
- `session_directions` compatibility reads
- split highlight bridge paths
- `frame/session_index` bridge reads after orientation ownership

Removal gates:

- explicit route/API caller proof (no active consumers)
- read/write parity evidence archived
- rollback plan accepted
- owner approval gate passed

Caller-proof checklist:

- in-repo caller search (`rg`) for route and repo functions
- runtime truth doc update completed
- smoke test confirms no silent dependency

## 7. Supabase Sequencing Integration

When baseline SQL should happen:

- after Phase A contract/projection readiness and route/API ownership contracts
- before Phase C ownership transfer execution

Fresh provisioning fit:

- use clean rebuild execution contract gates (A/B/C approvals)
- provision fresh project with reflective baseline groups A-F
- include bridge group only with caller proof

Must wait for adapters:

- any legacy-domain removal
- any write ownership transfer that still has legacy readers

Must not be recreated by default:

- legacy bridge tables without proven active caller requirement

## 8. Route/API Ownership Contracts Needed Before Build

Priority order:

1. `/api/session/ensure` orchestration ownership contract
2. `/api/work-block/next` work->thread/opening projection contract
3. `/api/work/answer` answer->response ownership contract
4. `/api/direction/select` direction->lens ownership contract
5. `/api/sessions/[sessionId]/highlights*` unified highlight read/write boundary contract
6. `/api/session-summary` and summary page read ownership contract
7. re-entry payload assembly contract for `/session/[id]` and `/session/[id]/summary`

## 9. Recommended First 5 Build/Plan Tickets

### 1. PLAN — Route/API Ownership Contract Pack v0

- Type: `PLAN`
- Depends on: this roadmap + implementation governance
- Acceptance criteria:
  - ownership table for core reflective domains and APIs
  - single-write-owner boundaries for each route
  - caller-proof requirements per transfer path

### 2. PLAN — Reflective Projection Contract Pack (Threads/Openings/Responses/Lenses) v0

- Type: `PLAN`
- Depends on: Ticket 1
- Acceptance criteria:
  - explicit projection input/output contracts
  - projection parity criteria per domain
  - fallback semantics documented

### 3. BUILD — Reflective Projection Slice A1 (Thread + Opening Read Projections)

- Type: `BUILD`
- Depends on: Tickets 1-2
- Acceptance criteria:
  - thread/opening read projections available behind controlled flag
  - no write ownership transfer
  - core flow unchanged
  - typecheck + targeted smoke validations pass

### 4. BUILD — Reflective Re-entry Payload Adapter Slice A2

- Type: `BUILD`
- Depends on: Ticket 3
- Acceptance criteria:
  - adapter-composed re-entry payload for summary/session surfaces
  - bounded foreground/ambient constraints enforced
  - suppression/defer parity verified

### 5. VALIDATION — Reflective Projection Parity Gate v0

- Type: `VALIDATION`
- Depends on: Tickets 3-4
- Acceptance criteria:
  - documented parity report across work, openings, responses, highlights, re-entry
  - rollback decision recorded
  - go/no-go decision for Phase B read switches

## 10. Validation Strategy

Required checks per risky slice:

- `npm run typecheck`
- targeted caller audit (`rg` route/repo/function callers)
- route smoke tests for:
  - `/new`
  - `/session/[id]/(flow)/frame`
  - `/session/[id]/(flow)/direction`
  - `/session/[id]/(flow)/work`
  - `/session/[id]`
  - `/session/[id]/summary`
- core-flow end-to-end manual validation
- re-entry payload parity validation
- explicit rollback decision point after each parity gate

## 11. Owner Approval Gates

Owner approval required at:

- before Phase B read switches
- before each Phase C ownership transfer
- before any Supabase destructive reset/provisioning cutover gate
- before Phase D bridge retirement/deletion actions

Mandatory owner evidence inputs:

- caller-proof report
- parity report
- rollback plan

## 12. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Bridge permanence | retirement criteria defined at creation time; enforce Phase D gates |
| Dual-write drift | single-write-owner rule + no parallel canonical writers |
| Route/API ambiguity | ownership contract pack before build slices |
| Supabase cutover failure | fresh-project strategy + approval gates + rollback posture |
| UI reads projections before parity | strict Phase B parity gates |
| Reflective behavior drift | enforce opening/thread/re-entry/invariants contracts in every slice |

## Immediate Next Ticket Selection

Recommended immediate next ticket:

- `PLAN — Route/API Ownership Contract Pack v0`

Reason:

- it is the highest dependency before any safe Phase A build slice.
