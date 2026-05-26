# AUDIT — Phase A1–A4 Mini Architecture Drift Review

Date: 2026-05-17  
Scope: A1 Thread Projection, A2 Opening Projection, A3 Re-entry Payload Adapter, A4 Unified Highlight Projection

## Executive Verdict
PASS WITH NOTES

A5 parity-gate work can start. No blocking ownership drift, route/API switch, write-path leakage, or schema/Supabase drift was found.  
One non-blocking drift risk was identified in A3 (deferred openings may still appear in ambient continuity), and should be explicitly validated/fixed before any production read-switch.

## Findings by Slice

### A1 — Thread Projection
Status: PASS

- Projection-only behavior is preserved in [threadProjection.ts](/c:/mira/src/domain/reflective/projections/threadProjection.ts).
- Deterministic projection ids and lineage refs are present (`projected-thread:work:<id>`, `source_refs`, `response_refs`).
- Conservative state posture mapping is preserved (`open|answered|dormant` only).
- No route/API integration dependency detected beyond test/module-local usage.

### A2 — Opening Projection
Status: PASS WITH NOTES

- Projection-only lifecycle posture mapping is conservative (`candidate|surfaced|engaged|deferred|expired`) in [openingProjection.ts](/c:/mira/src/domain/reflective/projections/openingProjection.ts:476).
- Visibility/suppression gating is present (`deferred` and cooldown-active map to suppressed visibility) in [openingProjection.ts](/c:/mira/src/domain/reflective/projections/openingProjection.ts:382).
- No write-path integration or route switch detected.
- Note: highlight lineage linking currently attaches all session highlights once a direction match is detected (`highlightRows: hasHighlightSignal ? highlights : []`), which is conservative but broad and can over-attach lineage context in [openingProjection.ts](/c:/mira/src/domain/reflective/projections/openingProjection.ts:547).

### A3 — Re-entry Payload Adapter
Status: PASS WITH NOTES

- Projection-only assembly with deterministic, capped foreground/ambient behavior is present in [reentryPayloadAdapter.ts](/c:/mira/src/domain/reflective/reentry/reentryPayloadAdapter.ts:389).
- Calmness caps and fallback behavior are implemented.
- No route/API switch detected; module remains isolated + test-scoped.
- Drift risk: `ambientFromOpenings` excludes only `suppression_posture === "suppressed"` and can still carry deferred items into ambient payload (while opening visibility may already be suppressed), in [reentryPayloadAdapter.ts](/c:/mira/src/domain/reflective/reentry/reentryPayloadAdapter.ts:489).  
  This is not a blocker for A5, but must be parity-checked against defer/suppression contract expectations before read-switch.

### A4 — Unified Highlight Projection
Status: PASS

- Projection-only normalization across split highlight sources is preserved in [highlightProjection.ts](/c:/mira/src/domain/reflective/projections/highlightProjection.ts).
- Source lineage, pin/reject posture, deterministic ordering, and no semantic auto-merge are present.
- No ownership transfer and no route/API integration switch detected.

## Cross-slice Risks

### Projection creep
Low
- No canonical persistence owner introduced.
- No projection caching/persistence layer introduced.

### Hidden ownership
Low
- No new write owners found.
- All slices remain read-model builders.

### Route/API drift
Low
- `rg` caller checks show projection functions referenced only in projection modules/tests; no production route default switched.

### Adapter permanence
Medium (structural, not immediate)
- Current isolation is good, but permanence risk remains if parity-gate criteria are not enforced in A5+.

### Semantic drift
Low-to-Medium
- No deterministic interpretation or urgency logic found.
- One concrete nuance in A3 deferred/suppression ambient handling should be explicitly parity-tested.

## Drift Checklist Result

| Check | Result | Notes |
|---|---|---|
| Projection-only? | PASS | No write-path behavior found in A1–A4 modules. |
| No new write owner? | PASS | No canonical owner transfer introduced. |
| No route/API read switch? | PASS | No production route imports detected for projection builders. |
| No schema/Supabase change? | PASS | No SQL/migration/Supabase changes in slice modules. |
| Source lineage preserved? | PASS | Lineage refs present across A1/A2/A4 and carried into A3 payload. |
| Suppression semantics preserved? | PASS WITH NOTES | A3 ambient handling of deferred items needs parity confirmation. |
| Density/calmness preserved? | PASS | Caps + calm ordering implemented in A3. |
| Fallback/rollback preserved? | PASS | Projection disable-by-non-use and fallback payload behavior preserved. |
| No hidden canonical store? | PASS | No persistence/cache layer added. |
| No semantic reinterpretation? | PASS WITH NOTES | No authority drift found; A2 lineage broadness is a minor precision risk. |
| Typecheck/tests? | PASS | Typecheck passed; A1–A4 targeted tests passed (26 tests). |
| Ledger updated? | PASS | Updated in this ticket. |

## Validation Evidence

- `npm.cmd run typecheck` -> passed.
- `npm.cmd run test -- src/domain/reflective/projections/threadProjection.test.ts src/domain/reflective/projections/openingProjection.test.ts src/domain/reflective/reentry/reentryPayloadAdapter.test.ts src/domain/reflective/projections/highlightProjection.test.ts` -> passed (`4 files, 26 tests`).
- Caller drift scan:
  - `rg -n "reflective/projections|reentryPayloadAdapter|buildReflectiveReentryPayload|projectReflectiveThreadsFromLegacy|projectReflectiveOpeningsFromLegacy|buildUnifiedReflectiveHighlightsProjection" app src --glob "!**/*.md"`
  - Result: matches are module-local + tests only.
- Projection-only scan:
  - `rg -n "supabase|\.from\(|insert\(|update\(|upsert\(|delete\(" src/domain/reflective --glob "**/*.ts"`
  - Result: no matches.

## Recommendation

Proceed to A5 parity gate.

Required A5 focus items:
1. Explicit defer/suppression parity assertion for A3 ambient-continuity composition.
2. Explicit lineage-precision check for A2 highlight-linked source refs.
3. Keep route/API ownership unchanged until parity gate passes and owner approves read-switch.
