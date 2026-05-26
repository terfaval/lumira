# Reflective Composer Shadow Diff Triage v0

## Purpose

Define explicit, enforceable go/no-go triage thresholds for composer shadow diffs before any guarded route-local ownership experiment.

This artifact converts shadow comparison output into rollout decisions.

## Scope and containment

- Validation-only.
- No production default switch.
- No ownership transfer.
- No persistence/schema/Supabase changes.
- No UI changes.

## Inputs used

- `docs/STABILIZATION_LEDGER.md`
- `docs/audits/lumira-reflective-runtime-documentation-authority-review-v0.md`
- `docs/plans/lumira-reflective-reentry-payload-contract-v0.md`
- `docs/plans/lumira-summary-reentry-owner-approval-criteria-v0.md`
- `docs/plans/lumira-reflective-summary-reentry-expansion-strategy-v0.md`
- `docs/plans/lumira-unified-reflective-space-rollout-plan-v0.md`
- `docs/plans/lumira-reflective-space-layer-composition-map-v0.md`
- `docs/design/lumira-reflective-interaction-grammar-v0.md`
- `src/domain/reflective/shadow/composerShadowReadExperiment.ts`
- `src/domain/reflective/composer/reflectiveSpaceComposer.ts`
- existing re-entry/projection validation harnesses

## 1) Diff severity matrix

Baseline severities:

| Diff code | Baseline severity | Meaning |
| --- | --- | --- |
| `CENTER_MISMATCH` | `OWNER_REVIEW` | Center changed vs adapter; may alter re-entry posture |
| `OPENING_SUPPRESSION_MISMATCH` | `NO_GO` | Suppression/defer semantics drifted |
| `DENSITY_OVERFLOW` | `NO_GO` | Calmness cap breach or denser-than-adapter overflow |
| `MISSING_SOURCE_REF` | `OWNER_REVIEW` | Traceability gap |
| `VISIBILITY_LEAK` | `NO_GO` | Suppressed/deferred content leaked into surfaced payload |
| `AMBIENT_DRIFT` | `WARN` | Ambient composition differs without hard safety breach |
| `FALLBACK_BEHAVIOR_DIFF` | `WARN` | Sparse/fallback behavior differs |

Implemented in:
- `src/domain/reflective/shadow/composerShadowDiffTriage.ts`

## 2) Explicit go/no-go thresholds

Hard no-go rules:

1. Any suppression/defer/dismiss leak (`OPENING_SUPPRESSION_MISMATCH` or `VISIBILITY_LEAK`) -> `NO_GO`.
2. Any density cap breach or denser-than-adapter overflow (`DENSITY_OVERFLOW`) -> `NO_GO`.
3. Missing source refs on active foreground structures (`MISSING_SOURCE_REF` + active thread/opening present) -> `NO_GO`.
4. Fallback drift that is denser than adapter (`FALLBACK_BEHAVIOR_DIFF` with `composer_load > adapter_load`) -> `NO_GO`.

Conditional owner/warn rules:

1. `CENTER_MISMATCH`:
   - `WARN` when composer is calmer/equal density.
   - `OWNER_REVIEW` when composer is denser.
2. `AMBIENT_DRIFT`:
   - `WARN` when composer is calmer/equal density.
   - `OWNER_REVIEW` when composer is denser.
3. `MISSING_SOURCE_REF` without active foreground impact -> `OWNER_REVIEW`.
4. Calmer fallback drift -> `WARN`.

Rollout posture mapping:

- Any `NO_GO` -> `BLOCKED`
- No `NO_GO`, but any `OWNER_REVIEW` -> `ALLOWED_SHADOW_ONLY`
- Only `WARN`/none -> `ALLOWED_FUTURE_GUARDED_ROUTE_LOCAL_READ_EXPERIMENT`
- `READY_FOR_DEFAULT_ROUTE_SWITCH` is not granted in this phase and remains blocked by policy.

## 3) Multi-scenario fixture validation

Validated via deterministic triage fixtures:
- `src/domain/reflective/shadow/composerShadowDiffTriage.test.ts`

Scenarios executed:

| Scenario | Key diff posture | Result |
| --- | --- | --- |
| Calm session | no diffs, calmer/equal shape | `ALLOWED_FUTURE_GUARDED_ROUTE_LOCAL_READ_EXPERIMENT` |
| Dense symbolic session | density overflow | `BLOCKED` |
| Emotionally loaded session | denser fallback drift | `BLOCKED` |
| Sparse/minimal session | calmer fallback drift | `ALLOWED_FUTURE_GUARDED_ROUTE_LOCAL_READ_EXPERIMENT` |
| Dormant continuity session | center mismatch with calmer composition | `ALLOWED_FUTURE_GUARDED_ROUTE_LOCAL_READ_EXPERIMENT` (`WARN`) |
| Defer/suppression-risk session | suppression mismatch + visibility leak | `BLOCKED` |
| Missing/partial source refs session | missing source refs with active foreground | `BLOCKED` |

## 4) Owner-facing decision packet (plain language)

What stayed safe:
- Calm/sparse/dormant scenarios can remain within acceptable reflective posture when composer is not denser.
- Warning-only drift classes are identifiable and contained.

What diverged:
- Center selection can diverge from adapter.
- Ambient composition can diverge.
- Fallback behavior can diverge.

What requires hard no-go:
- Any suppression/defer/dismiss leak.
- Any density overflow beyond contract bounds.
- Missing lineage on active foreground content.
- Denser fallback drift.

What requires owner review:
- Center mismatch when denser or behaviorally ambiguous.
- Ambient drift when denser.
- Non-foreground lineage gaps.

Rollout status:
- User-facing rollout remains blocked.
- Default route switch remains blocked.
- Composer is acceptable for continued shadow mode and for a later guarded route-local read experiment only when no-go thresholds remain clean.

## 5) Final posture for this phase

- `BLOCKED` for default route switch.
- `ALLOWED_SHADOW_ONLY` as baseline runtime posture.
- `ALLOWED_FUTURE_GUARDED_ROUTE_LOCAL_READ_EXPERIMENT` only when triage outputs contain no `NO_GO`.

## Validation evidence

- `npm.cmd run typecheck` passed.
- `npm.cmd run test -- src/domain/reflective/shadow/composerShadowDiffTriage.test.ts` passed.
- `npm.cmd run test -- src/domain/reflective/shadow/composerShadowReadExperiment.test.ts` passed.

