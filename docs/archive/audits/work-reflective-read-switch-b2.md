# BUILD/VALIDATION — Controlled Reflective-first Work Read Switch (Phase B-B2)

Date: 2026-05-17  
Surface: `/session/[id]/(flow)/work`  
Scope: route-local reflective-first read behavior with rollback-safe focus selection

## 1. Implementation Strategy

Implemented a conservative, route-local reflective read switch on the work surface by keeping legacy read assembly as baseline and layering reflective focus selection on top.

Changes:
- [page.tsx](c:\mira\app\session\[id]\(flow)\work\page.tsx)
  - Added guarded read-mode resolution (`work_read_mode`, env default).
  - Added projection-backed focus-selection effect (threads + openings) after legacy load.
  - Kept legacy work block loading, answer persistence flow, and next-block orchestration unchanged.
  - Added explicit rollback behavior: non-reflective mode resets pointer from `work_latest`; reflective failures keep legacy focus.
- [workReadSwitch.ts](c:\mira\src\domain\reflective\projections\workReadSwitch.ts) (new)
  - `resolveReflectiveWorkReadMode(...)`
  - `selectReflectiveWorkFocusWorkVersionId(...)` with calmness/suppression guards.
- [workReadSwitch.test.ts](c:\mira\src\domain\reflective\projections\workReadSwitch.test.ts) (new)
  - mode resolution and focus selection invariants.

## 2. Switch Mechanism

Route-local switch:
- Query: `work_read_mode=reflective|legacy`
- Env default: `NEXT_PUBLIC_REFLECTIVE_WORK_READ_DEFAULT=1`

Behavior:
- `legacy`: `latestWorkVersionId` restored from `work_latest`.
- `reflective`: projection-derived focus pointer selected from direction-scoped threads/openings with legacy fallback.

No write-owner transfer and no route expansion were introduced.

## 3. Continuity Behavior Changes (Conservative)

Reflective mode changes only the **focus pointer selection**, not canonical data writes.

Continuity selection inputs:
- `work_versions`
- `dream_answers`
- `session_directions`
- `work_latest` (fallback pointer)

Projection composition:
- `projectReflectiveThreadsFromLegacy(...)`
- `projectReflectiveOpeningsFromLegacy(...)`
- `selectReflectiveWorkFocusWorkVersionId(...)`

## 4. Calmness / Suppression Validation

Implemented calmness safeguards in `selectReflectiveWorkFocusWorkVersionId(...)`:
- Deferred/suppressed/cooldown-active openings are not eligible for foreground focus.
- `internal`/`suppressed` visibility is excluded from foreground focus.
- Dormant threads are not foreground-focused.
- Deterministic fallback to legacy pointer when reflective candidate is not safe.

Contract outcomes:
- no workflow-pressure escalation logic added
- no forced resurfacing loop added
- no unresolved-task escalation behavior added

## 5. Suppression / Defer Parity

Suppression parity is preserved by using existing opening projection postures:
- `suppression_posture`
- `cooldown_posture`
- `visibility_layer`

B2 tests explicitly assert:
- deferred/suppressed openings do not become focus-driving foreground candidates
- fallback pointer remains deterministic under suppression

## 6. Rollback Rehearsal

Rollback path:
1. Remove `work_read_mode=reflective` (or keep `work_read_mode=legacy`), or disable env default.
2. Work surface pointer resolves from legacy `work_latest`.

Additional safety:
- Reflective projection exception path keeps legacy behavior (no write mutation, no persistence dependency).

Rollback properties:
- route-local
- immediate
- non-destructive
- no schema/Supabase action required

## 7. Parity Evidence

Validated dimensions:
- thread posture parity (existing thread projection tests)
- opening posture parity (existing opening projection tests)
- suppression/defer parity in focus selection (new work read-switch tests)
- deterministic focus selection ordering (new tests)
- answer lineage unaffected (legacy answer mapping unchanged)

## 8. Caller Isolation Evidence

Symbol scan:
- `rg -n "resolveReflectiveWorkReadMode|selectReflectiveWorkFocusWorkVersionId|projectReflectiveThreadsFromLegacy|projectReflectiveOpeningsFromLegacy|work_read_mode|NEXT_PUBLIC_REFLECTIVE_WORK_READ_DEFAULT" app/api app/session --glob "!**/*.md"`
- Matches are limited to:
  - `app/session/[id]/(flow)/work/page.tsx`
  - no summary/re-entry route consumers
  - no highlights route coupling

Write-path scope:
- No modifications in `/api/work/answer`, `/api/work-block/next`, or DB write ownership.

## 9. Validation Commands and Results

- `npm.cmd run typecheck` -> PASS
- `npm.cmd run test -- src/domain/reflective/projections/workReadSwitch.test.ts src/domain/reflective/projections/threadProjection.test.ts src/domain/reflective/projections/openingProjection.test.ts src/domain/reflective/reentry/reentryPayloadAdapter.test.ts src/domain/reflective/validation/routeDryRunReflectiveRead.test.ts` -> PASS (`5 files`, `27 tests`)

## 10. Mismatch Classification

- Blocker: none
- Warning:
  - reflective mode currently controls focus selection only (not full work DTO shape projection swap), by design for conservative B2 rollout safety
- Acceptable divergence:
  - focus selection may prefer calmer non-suppressed continuity over strict legacy recency in reflective mode
- Intentional simplification:
  - omission of unsafe reflective candidates in favor of legacy fallback pointer

## 11. Verdict

PASS WITH NOTES

Notes:
- B2 controlled reflective-first work read switch is safe for bounded Phase B progression.
- Route isolation, rollbackability, calmness/suppression constraints, and no ownership transfer were preserved.
