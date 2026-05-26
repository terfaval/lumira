# VALIDATION — Re-entry Suppression/Defer Parity Assertion Pack

Date: 2026-05-17  
Scope: reflective re-entry suppression/defer parity in A2+A3 projection pipeline

## 1. Suppression Semantics Validation

Result: PASS (after minimal parity fix)

Validated behavior:
- `suppressed` openings are excluded from active openings.
- `suppressed` openings are excluded from ambient continuity.
- `deferred` openings remain non-foreground and non-active.
- cooldown-active openings cannot escalate into active openings.

Evidence:
- Opening projection maps deferred/cooldown-active to `visibility_layer: "suppressed"` in [openingProjection.ts](/c:/mira/src/domain/reflective/projections/openingProjection.ts:382).
- Re-entry active opening filter blocks non-`suppression_posture: "none"` in [reentryPayloadAdapter.ts](/c:/mira/src/domain/reflective/reentry/reentryPayloadAdapter.ts:432).

## 2. Ambient Leakage Investigation (Critical)

Finding: explicit parity mismatch was present pre-fix.

Pre-fix behavior:
- `ambientFromOpenings` excluded only `suppression_posture === "suppressed"`.
- `deferred` openings (`suppression_posture: "deferred"`, `visibility_layer: "suppressed"`) could still enter ambient continuity.

Classification:
- This was a suppression-parity violation (not acceptable ambient residue), because opening projection already marked deferred items as suppressed visibility.

Fix applied:
- ambient openings now require:
  - `visibility_layer !== "suppressed"`
  - `suppression_posture === "none"`
- neighborhood opening candidates now apply the same suppression guard.

Patched file:
- [reentryPayloadAdapter.ts](/c:/mira/src/domain/reflective/reentry/reentryPayloadAdapter.ts)

## 3. Foreground Escalation Validation

Result: PASS

- Deferred/suppressed openings cannot foreground themselves in re-entry.
- Low-confidence openings cannot become active openings directly.
- No hidden resurfacing/pressure loop was introduced by the fix.

Evidence:
- Active opening requires `suppression_posture === "none"`, visible layer `foreground|surfaced`, lifecycle `surfaced|engaged`, medium confidence.

## 4. Calmness/Density Validation

Result: PASS

- Ambient continuity remains bounded by caps.
- Deferred/suppressed openings no longer leak into ambient list.
- Omission preference and silence legitimacy are preserved.

Evidence:
- Caps unchanged and enforced in re-entry adapter.
- Fix only tightened inclusion filters; no new expansion behavior.

## 5. Cross-slice Consistency

Result: PASS (improved)

A2 -> A3 consistency now:
- A2 may mark deferred/cooldown cases as suppressed visibility.
- A3 now respects that suppressed visibility in ambient + neighborhood assembly.

This removes the prior mismatch between opening lifecycle/suppression semantics and re-entry surfacing behavior.

## 6. Contract Compliance Assessment

| Contract area | Status | Notes |
| --- | --- | --- |
| Re-entry payload contract | PASS | Suppressed/deferred leakage resolved for ambient/neighborhood visibility behavior. |
| Opening lifecycle contract | PASS | Deferred state remains low-visibility/suppressed behavior in re-entry assembly. |
| Thread transition invariants | PASS | No forced resurfacing/escalation; suppression intent preserved. |
| Phase B gate criteria | PASS WITH NOTES | A3 blocker resolved; A2 broad lineage note remains warning-level. |

## 7. Minimal Fix Evaluation

Classification: FIX REQUIRED -> applied in this ticket (minimal projection-only correction).

Why required:
- Explicit contract mismatch: opening projection declared suppressed visibility, re-entry still surfaced deferred items in ambient/neighborhood channels.

Fix scope:
- projection-only read assembly filter tightening.
- no API/route integration.
- no ownership transfer.
- no persistence/schema/Supabase impact.

Touched files:
- [reentryPayloadAdapter.ts](/c:/mira/src/domain/reflective/reentry/reentryPayloadAdapter.ts)
- [reentryPayloadAdapter.test.ts](/c:/mira/src/domain/reflective/reentry/reentryPayloadAdapter.test.ts)

Rollback posture:
- fully local rollback by reverting re-entry adapter filter lines.
- no external contract/data migration dependency.

## 8. Required Tests

Targeted tests:
- existing suppression escalation test still passes.
- added dedicated test:
  - `keeps deferred/suppressed openings out of ambient continuity and neighborhood`

File:
- [reentryPayloadAdapter.test.ts](/c:/mira/src/domain/reflective/reentry/reentryPayloadAdapter.test.ts)

## 9. Validation Commands and Results

- `npm.cmd run typecheck` -> PASS
- `npm.cmd run test -- src/domain/reflective/reentry/reentryPayloadAdapter.test.ts src/domain/reflective/projections/openingProjection.test.ts` -> PASS (`2 files`, `15 tests`)
- `rg -n "buildReflectiveReentryPayload|reentryPayloadAdapter|projectReflectiveOpeningsFromLegacy|openingProjection" app/api app/session src --glob "!**/*.md"` -> projection usage remains module/test-scoped
- `rg -n "supabase|\.from\(|insert\(|update\(|upsert\(|delete\(" src/domain/reflective --glob "**/*.ts"` -> no matches

## 10. Verdict

PASS WITH NOTES

Classification:
- Blocker: resolved (A3 deferred ambient leakage).
- Warning: A2 broad lineage attachment still warning-level.
- Cleanup: optional lineage precision tightening before default read-switch.

No reason to block Phase B read preparation after this parity correction.

## 11. Recommendation

Phase B dry-run planning may proceed.

Recommended immediate next order:
1. `PLAN — Phase B Read-switch Dry Run Plan`
2. `VALIDATION — Route-by-route Reflective Read Dry Run`
3. `PLAN/BUILD — Opening Lineage Precision Tightening` (warning cleanup before default summary/re-entry switch)

## Validation Scope Confirmation

- No route/API read-switch executed.
- No ownership transfer executed.
- No schema/migration/Supabase changes executed.
