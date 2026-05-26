# VALIDATION — Route-by-route Reflective Read Dry Run

Date: 2026-05-17  
Scope: `/session/[id]/(flow)/highlights`, `/session/[id]/(flow)/work`  
Mode: dry-run only, no route switch

## Execution Model

Dry-run was executed via an isolated validation harness:
- [routeDryRunReflectiveRead.test.ts](/c:/mira/src/domain/reflective/validation/routeDryRunReflectiveRead.test.ts)

Properties:
- test-only, non-production integration
- no API/route read owner change
- no write-path changes
- legacy runtime remains authoritative

## Surface 1 — `/session/[id]/(flow)/highlights`

### Input snapshot/sample

Sample set used in harness:
- entry highlights:
  - `eh-1`: text `kapu`, pinned via `glossary_term_id`
  - `eh-2`: text `folyosó`, non-pinned
- session highlights:
  - `sh-1`: suggested `kapu` with `suggestion_key: salient:gate`
  - `sh-2`: user `visszatérés`
- rejected keys:
  - `salient:gate`

### Legacy payload excerpt (semantic)

Legacy surface semantics in highlights flow:
- separate entry-level + session-level highlight models
- explicit rejected suggestion memory
- user/suggested source distinction

### Reflective payload excerpt (projection)

From [highlightProjection.ts](/c:/mira/src/domain/reflective/projections/highlightProjection.ts):
- `projected-highlight:entry:eh-1` -> `pin_posture: pinned`, `continuity_visibility: foreground`
- `projected-highlight:session:sh-1` -> `rejection_posture: rejected`, `continuity_visibility: suppressed`
- `projected-highlight:session:sh-2` -> `salience_posture: user_owned`

### Parity dimension results

- Deterministic ordering: PASS
- Pin/reject parity: PASS
- Source lineage: PASS
- Salience posture: PASS
- Continuity visibility: PASS
- Duplicate handling: PASS
- Omission behavior: PASS

### Mismatch classification

- Blocker: none
- Warning: none in this dry-run slice
- Acceptable divergence: normalized unified read shape vs split legacy shape
- Intentional reflective simplification: none required in this sample

### Explicit safeguards checked

- No semantic auto-merge: PASS (`entry` + `session` same text remain distinct identities)
- No salience inflation: PASS
- No rejected highlight resurfacing: PASS

### Route verdict

GO (for continued dry-run preparation; not a switch authorization)

## Surface 2 — `/session/[id]/(flow)/work`

### Input snapshot/sample

Sample set used in harness:
- work versions:
  - `w1` (`memory_bridge`, answered state, prompt `Mi maradt meg?`)
  - `w2` (`memory_bridge`, open state, prompt `Mi tér vissza?`)
- answers:
  - `a1` for `w1`
- direction context:
  - `d1` for `memory_bridge`
- suppression signal:
  - `w2` deferred + cooldown active

### Legacy payload excerpt (semantic)

Legacy work continuity model:
- continuity list derived from work versions + answers
- answer linkage by `work_id`
- ordering by creation sequence

### Reflective payload excerpt (projection)

From [threadProjection.ts](/c:/mira/src/domain/reflective/projections/threadProjection.ts) and [openingProjection.ts](/c:/mira/src/domain/reflective/projections/openingProjection.ts):
- `projected-thread:work:w1` -> `state_posture: answered`, response lineage includes `work_id: w1`
- `projected-thread:work:w2` -> `state_posture: open`
- `projected-opening:work:w2` -> `suppression_posture: deferred`, `visibility_layer: suppressed`, `lifecycle_posture: deferred`

### Parity dimension results

- Continuity ordering stability: PASS (deterministic across reruns)
- Answer lineage parity: PASS
- Thread posture mapping: PASS
- Opening posture mapping: PASS
- Suppression parity: PASS
- Omission behavior: PASS
- Pressure/calmness behavior: PASS

### Mismatch classification

- Blocker: none
- Warning: carries global A2 lineage-breadth warning (not surfaced as route blocker here)
- Acceptable divergence: reflective ordering prioritizes activity posture over pure legacy sequence in projected domain
- Intentional reflective simplification: conservative omission/escalation restraint

### Explicit safeguards checked

- No workflow-pressure escalation: PASS
- No hidden resurfacing behavior in dry-run sample: PASS
- No foreground inflation from deferred opening: PASS
- Deterministic ordering stability: PASS

### Route verdict

GO (for continued dry-run preparation; not a switch authorization)

## Dry-run Harness Compliance

- Harness is isolated in `src/domain/reflective/validation/**`
- No production route usage
- No default route behavior change
- No write ownership mutation introduced

## Required Drift Checklist

- [x] Projection-only preserved
- [x] No route/API switch
- [x] No hidden canonical owner
- [x] No write-path changes
- [x] No schema/Supabase changes
- [x] Source lineage preserved
- [x] Suppression parity preserved
- [x] Density/calmness preserved
- [x] Deterministic ordering preserved
- [x] Rollback remains immediate
- [x] Typecheck/tests pass
- [x] Ledger updated

## Validation Commands and Results

- `npm.cmd run typecheck` -> PASS
- `npm.cmd run test -- src/domain/reflective/validation/routeDryRunReflectiveRead.test.ts src/domain/reflective/projections/highlightProjection.test.ts src/domain/reflective/projections/threadProjection.test.ts src/domain/reflective/projections/openingProjection.test.ts src/domain/reflective/reentry/reentryPayloadAdapter.test.ts` -> PASS (`5 files`, `29 tests`)
- `rg -n "buildUnifiedReflectiveHighlightsProjection|projectReflectiveThreadsFromLegacy|projectReflectiveOpeningsFromLegacy|buildReflectiveReentryPayload|routeDryRunReflectiveRead" app src --glob "!**/*.md"` -> projection/harness usage scoped to `src/domain/reflective/**` + tests
- `rg -n "buildUnifiedReflectiveHighlightsProjection|projectReflectiveThreadsFromLegacy|projectReflectiveOpeningsFromLegacy|buildReflectiveReentryPayload|routeDryRunReflectiveRead" app/api app/session --glob "!**/*.md"` -> no matches
- `rg -n "supabase|\.from\(|insert\(|update\(|upsert\(|delete\(" src/domain/reflective --glob "**/*.ts"` -> no matches

## Verdict

Per-route:
- `/session/[id]/(flow)/highlights`: GO
- `/session/[id]/(flow)/work`: GO

Overall:
- PASS WITH NOTES

Notes:
- no blocker found in the two low-risk dry-run target surfaces
- global warning remains: A2 broad lineage attachment should be tightened before broader summary/re-entry default switch work

## Recommendation

- First reflective-first read candidate selection may begin (planning stage).
- Additional parity hardening is not required for these two low-risk surfaces.
- Keep `Opening Lineage Precision Tightening` before broader/high-risk summary-reentry dry-run expansion.
