# VALIDATION — Projection Parity Gate A5

Date: 2026-05-17  
Scope: A1 Thread Projection, A2 Opening Projection, A3 Re-entry Payload Adapter, A4 Unified Highlight Projection

## 1. Projection-only Validation

Verdict: PASS

Evidence:
- No Supabase/DB mutation patterns detected in projection/reentry modules:
  - `rg -n "supabase|\.from\(|insert\(|update\(|upsert\(|delete\(" src/domain/reflective --glob "**/*.ts"`
  - Result: no matches.
- No production route/API read-switch to projections:
  - `rg -n "buildReflectiveReentryPayload|projectReflectiveThreadsFromLegacy|projectReflectiveOpeningsFromLegacy|buildUnifiedReflectiveHighlightsProjection" app/api app/session --glob "!**/*.md"`
  - Result: no matches.
- No schema/migration/Supabase changes in this gate scope.

## 2. Thread Projection Parity

Verdict: PASS

Validated in [threadProjection.ts](/c:/mira/src/domain/reflective/projections/threadProjection.ts):
- Deterministic identity: `projected-thread:work:<workId>`.
- Lineage preserved: `source_refs`, `response_refs`.
- Conservative states only: `open|answered|dormant`.
- Deterministic ordering: timestamp + id tie-break sort.
- No inferred `dismissed/deferred/resurfaced` states.
- No merge/split escalation logic exists.

## 3. Opening Projection Parity (Critical)

Verdict: GO (PASS WITH NOTES)

Validated in [openingProjection.ts](/c:/mira/src/domain/reflective/projections/openingProjection.ts):
- Conservative lifecycle posture set: `candidate|surfaced|engaged|deferred|expired`.
- Suppression/cooldown mapping present and explicit:
  - deferred -> suppressed visibility
  - cooldown_active -> suppressed visibility (except engaged branch rules)
- Candidate/surfaced distinction is explicit and deterministic.
- No pressure/urgency escalation behavior found.
- Silence legitimacy preserved: openings can remain candidate/internal.

Note:
- Highlight lineage attachment is broad when direction match is true (`highlightRows: hasHighlightSignal ? highlights : []`), which can over-attach source refs. This is parity-safe for Phase A but should be narrowed before any default read-switch.

## 4. Re-entry Payload Parity (Critical)

Verdict: GO (PASS WITH NOTES)

Validated in [reentryPayloadAdapter.ts](/c:/mira/src/domain/reflective/reentry/reentryPayloadAdapter.ts):
- Reflective center is calmness-first and conservative.
- Foreground vs ambient separation is explicit.
- Density caps enforced (`active_threads`, `active_openings`, `neighborhood`, `ambient`).
- Fallback degradation is minimal and non-invasive.
- No low-confidence direct foreground escalation path found.

Note (explicitly investigated):
- Deferred opening ambient leakage risk remains:
  - ambient openings exclude only `suppression_posture === "suppressed"` at [reentryPayloadAdapter.ts:489](/c:/mira/src/domain/reflective/reentry/reentryPayloadAdapter.ts:489).
  - This is non-blocking for A5, but must be checked/fixed before Phase B read-switch execution.

## 5. Highlight Projection Parity

Verdict: PASS

Validated in [highlightProjection.ts](/c:/mira/src/domain/reflective/projections/highlightProjection.ts):
- Deterministic ids and ordering.
- Source lineage preserved.
- Pin/reject semantics preserved (`pin_posture`, `rejection_posture`).
- No semantic auto-merge behavior.
- No salience inflation logic detected.

Note:
- Safe for summary/re-entry projection assembly in Phase A with current isolation boundaries.

## 6. Cross-slice Projection Interaction

Verdict: PASS WITH NOTES

Consistency checks:
- Thread/opening/re-entry linkage is structurally consistent.
- Suppression metadata propagates from opening projection into re-entry payload.
- Lineage propagation exists across A1/A2/A4 into A3 composition.
- Calmness constraints are consistently bounded.
- Fallback remains legacy-authoritative and disable-by-non-use.

Risk to carry forward:
- A3 deferred ambient handling should be parity-gated with explicit assertion before any read-switch.

## 7. Route/API Isolation Validation

Verdict: PASS

Evidence:
- `rg -n "reflective/projections|reentryPayloadAdapter|buildReflectiveReentryPayload|projectReflectiveThreadsFromLegacy|projectReflectiveOpeningsFromLegacy|buildUnifiedReflectiveHighlightsProjection" app src --glob "!**/*.md"`
  - Matches are module-local and test-local in `src/domain/reflective/**`.
- No projection imports found in `app/api/**` or `app/session/**`.
- No ownership transfer/read-switch introduced.

## 8. Drift Safety Checklist

- [x] Projection-only preserved
- [x] No new canonical write owner
- [x] No route/API read switch
- [x] No schema/migration/Supabase drift
- [x] Source lineage preserved
- [x] Suppression/defer semantics preserved (with notes)
- [x] Density/calmness preserved
- [x] Fallback/rollback preserved
- [x] No hidden canonical store
- [x] No semantic reinterpretation
- [x] Typecheck/tests passed
- [x] Ledger updated

## 9. Validation Commands and Results

- `npm.cmd run typecheck` -> PASS
- `npm.cmd run test -- src/domain/reflective/projections/threadProjection.test.ts src/domain/reflective/projections/openingProjection.test.ts src/domain/reflective/reentry/reentryPayloadAdapter.test.ts src/domain/reflective/projections/highlightProjection.test.ts` -> PASS (`4 files`, `26 tests`)
- `rg -n "buildReflectiveReentryPayload|projectReflectiveThreadsFromLegacy|projectReflectiveOpeningsFromLegacy|buildUnifiedReflectiveHighlightsProjection" app/api app/session --glob "!**/*.md"` -> no matches
- `rg -n "supabase|\.from\(|insert\(|update\(|upsert\(|delete\(" src/domain/reflective --glob "**/*.ts"` -> no matches

## 10. Required Verdict

PASS WITH NOTES

Phase B preparation can proceed (read planning only), with no ownership transfer and no read-switch yet.

Required remediation before any Phase B read-switch execution:
1. Lock explicit defer/suppression parity behavior in re-entry ambient opening filtering.
2. Optionally tighten opening-highlight lineage attachment precision to reduce over-broad trace references.

## 11. Phase B Readiness Assessment

Readiness: READY FOR PHASE B PLANNING (NOT EXECUTION SWITCH)

Recommended next ticket sequence:
1. `PLAN — Phase B Reflective-first Read Switch Gate Criteria Pack`
2. `VALIDATION — Re-entry Suppression/Defer Parity Assertion Pack`
3. `PLAN/BUILD — Optional Opening Lineage Precision Tightening (projection-only)`
4. `VALIDATION — Phase B Read-Switch Dry Run (route-by-route, no default switch)`

## Summary

The A1-A4 projection set is parity-safe enough to move forward into Phase B planning.  
Current risk profile is controlled, rollback-safe, and still fully bridge-isolated.
