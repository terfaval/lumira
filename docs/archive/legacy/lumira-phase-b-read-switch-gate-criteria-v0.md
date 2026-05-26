# Lumira Phase B Reflective-first Read Switch Gate Criteria v0

## 1. Purpose

This document defines mandatory gates before any Phase B reflective-first read switch.

Why this gate pack exists:
- Phase B introduces reflective-first reads only after explicit parity proof.
- Read-switch risk is highest on summary/re-entry surfaces that aggregate multiple domains.
- A5 delivered `PASS WITH NOTES`; those notes must be converted into enforceable switch gates.

Critical distinctions:
- Phase B = read-surface migration planning and gated validation.
- Phase B != canonical write ownership transfer.
- Phase B != schema/Supabase cutover.
- Phase B != bridge retirement.

## 2. Phase B Boundary

Allowed in Phase B:
- plan route-by-route read switches
- run reflective-vs-legacy dry-run comparisons
- run projection-based read experiments behind non-default safety boundaries
- produce per-surface parity reports and go/no-go outcomes

Forbidden in Phase B:
- canonical write owner changes
- schema/Supabase changes
- default production switch without gate pass + owner approval
- deletion of legacy read paths
- bridge retirement

## 3. Candidate Read-switch Surfaces

| Surface | Current read owner | Candidate reflective read owner | Risk level | Required parity checks | Rollback path | Owner approval required |
| --- | --- | --- | --- | --- | --- | --- |
| `/session/[id]` | legacy session page assemblers | reflective re-entry payload projection adapter | High | center selection, foreground/ambient split, suppression/defer, density caps, lineage presence | immediate fallback to current page read assembly | Yes |
| `/session/[id]/summary` | summary API + direct highlight/session reads | reflective re-entry + unified projection assembly | Critical | calmness density, suppression/defer, highlight parity, opening visibility, fallback minimality | revert to legacy summary assembly and direct reads | Yes (strict) |
| `/session/[id]/(flow)/work` | work payload + answers continuity reads | thread/opening/response projections | High | work continuity parity, answer lineage parity, suppression parity, no pressure escalation | disable reflective read mode and restore work-centric reads | Yes |
| `/session/[id]/(flow)/highlights` | split highlight reads (`entry` + `session`) | unified highlight projection read model | Medium-High | pin/reject parity, deterministic ordering, lineage precision, no salience inflation | restore split-table reads | Yes |
| `/session/[id]/(flow)/direction` | direction/frame-derived reads | attention lens projection reads | Medium | selected-direction parity, no deterministic mode lock, calmness neutrality | revert to `session_directions` read path | Yes |
| `/session/[id]/(flow)/frame` | frame latest/index-derived reads | orientation/opening projection reads | Medium | frame orientation parity, opening candidate/surfaced parity, no interruptive escalation | restore current frame read path | Yes |
| `/api/session-summary` | legacy summary read assembler | reflective projection-composed summary read | Critical | full parity on content/state/order + suppression + density + fallback behavior | route-level revert to legacy assembler | Yes (strict) |

## 4. Global Gate Criteria

Global prerequisites for any Phase B switch attempt:
- A5 parity gate status remains valid (`PASS` or `PASS WITH NOTES` with note handling defined).
- caller audit completed for target surface and dependencies.
- projection isolation proof (no projection write ownership, no hidden canonical store).
- suppression/defer parity assertion passes.
- density/calmness parity assertion passes.
- fallback/rollback behavior is implemented and tested.
- targeted tests and typecheck pass for affected projection/adapter paths.
- explicit owner approval before any production default switch.

## 5. Surface-specific Gate Criteria

### `/session/[id]/summary` (highest-risk)

Required:
- parity report proving equivalent reflective center, opening visibility, highlight state, and bounded density.
- explicit suppression/defer parity for projected openings and ambient continuity.
- fallback proof showing one-step reversion to legacy summary assembler.
- no hidden projection ownership in summary composition chain.

No-go if:
- deferred/suppressed semantics diverge from contract.
- density exceeds contract caps.
- lineage missing for foreground items.
- fallback path incomplete.

### `/session/[id]` (highest-risk)

Required:
- center selection conservatism parity.
- neighborhood boundedness parity.
- ambient/foreground separation parity.
- calmness mode consistency under repeated re-entry.

No-go if:
- candidate/low-confidence content escalates to foreground unexpectedly.
- deferred opening leakage is unresolved or unapproved.
- fallback route behavior is not deterministic.

### `/session/[id]/(flow)/work`

Required:
- thread/opening/response projection parity with current work continuity behavior.
- no workflow-pressure escalation.
- stable ordering/lineage for answer-derived continuity.

No-go if:
- unresolved opening-pressure drift.
- response lineage mismatch.

### `/session/[id]/(flow)/highlights`

Required:
- pin/reject parity and deterministic unified ordering.
- no semantic auto-merge.
- source lineage preserved for each unified row.

No-go if:
- reject state resurfaces as active.
- salience inflation appears in projected reads.

### `/session/[id]/(flow)/direction`

Required:
- direction selection parity against legacy reads.
- lens influence remains soft and non-deterministic.

No-go if:
- projected lens behavior introduces hard filtering/mode-lock.

### `/session/[id]/(flow)/frame`

Required:
- orientation parity and opening surfacing restraint.
- no forced surfacing during active flow.

No-go if:
- frame surface gains pressure behavior or loses fallback parity.

### `/api/session-summary`

Required:
- end-to-end API payload parity with explicit tolerance rules.
- suppression/defer/density invariants enforced.
- rollback plan validated at API boundary.

No-go if:
- payload contract divergence in critical safety fields.
- legacy fallback cannot be restored immediately.

## 6. Known Blockers / Notes from A5

Carried forward from A5:

1. A3 deferred opening ambient leakage
- Classification: Blocker for default summary/re-entry read switch.
- Requirement: resolve in projection behavior or explicitly parity-approve with owner sign-off.

2. A2 broad highlight lineage attachment
- Classification: Warning (not a planning blocker).
- Requirement: tighten before default read-switch if trace quality/parity report flags material risk.

Classification summary:
- Blocker: A3 deferred ambient leakage for re-entry/summary default switch.
- Warning: A2 broad lineage attachment.
- Optional cleanup: additional lineage precision hardening where parity-safe.

## 7. Read-switch Dry Run Requirements

Dry-run must include:
- side-by-side legacy vs reflective output comparison per surface.
- non-default, non-user-facing execution path.
- no write behavior changes.
- documented diff report with severity classification.
- explicit surface-level go/no-go decision.

Dry-run deliverables:
- parity diff artifact
- safety checklist result
- rollback rehearsal result
- owner review summary

## 8. Rollback Requirements

Mandatory rollback proof before any default switch:
- legacy read path remains intact and callable.
- reflective read can be disabled without data mutation.
- fallback behavior tested on target surface.
- no persistent runtime dependency on projection output.
- no hidden canonical projection store.

Rollback must be:
- route-local (disable only affected surface first)
- deterministic
- auditable in logs/change notes

## 9. Owner Approval Gates

Owner approval is mandatory:
- before first default read-switch on any surface.
- before any `/session/[id]` or `/session/[id]/summary` default switch.
- before any production user-facing reflective-first read.
- before Phase C write ownership transfer begins.

Approval packet must include:
- parity report
- no-go/known-risk list
- rollback proof
- caller audit proof

## 10. Phase B Recommended Sequence

1. resolve/validate A3 defer-suppression parity note  
2. optionally tighten A2 opening lineage precision  
3. define/read-switch dry-run plan and tooling boundary  
4. execute route-by-route dry-run parity validation  
5. approve and execute first low-risk default read-switch  
6. execute summary/re-entry default switch only under stricter approval

Recommended first low-risk candidates:
- `/session/[id]/(flow)/direction`
- `/session/[id]/(flow)/frame`

Deferred until strict approval:
- `/session/[id]`
- `/session/[id]/summary`
- `/api/session-summary`

## 11. No-go Conditions

Read-switch is blocked if any of the following are true:
- suppression/defer semantics diverge from contracts
- projection output exceeds density/calmness caps
- legacy fallback path is not proven
- caller audit is incomplete
- projection path acts as hidden canonical owner
- source lineage is missing for surfaced/foreground elements
- targeted tests or typecheck fail
- owner approval is missing

## 12. Recommended Next Tickets

1. `VALIDATION — Re-entry Suppression/Defer Parity Assertion Pack`  
2. `PLAN/BUILD — Opening Lineage Precision Tightening`  
3. `PLAN — Phase B Read-switch Dry Run Plan`  
4. `VALIDATION — Route-by-route Reflective Read Dry Run`

## Validation

Planning/docs-only output.

- No runtime code changes
- No route/API read-switch implementation
- No migration/schema changes
- No Supabase operations
