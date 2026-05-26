# Work Persist Caller-Proof Audit v0

## Purpose

Validate whether `/api/work/persist` is currently dormant and safe to classify as legacy scaffolding, without changing runtime behavior.

## Scope and method

Scanned in-repo callers/references across:

- `app/`
- `src/`
- `docs/`
- `ROUTE_MAP.md`

Target patterns:

- `/api/work/persist`
- `work/persist`
- `persist`
- related flow endpoint usage (`/api/work-block/next`, `/api/work/answer`)
- overlap stores (`work_versions`, `work_latest`)

## Caller scan evidence

### Command

`rg -n "work/persist" app src docs`

### Result summary

- No matches in active runtime caller paths under `app/` or `src/` that invoke `/api/work/persist`.
- Matches found in documentation/audit artifacts only:
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/audits/runtime-current-flow-audit.md`
  - `docs/audits/lumira-runtime-route-and-legacy-direction-inventory-v0.md`
  - `docs/audits/answer-schema-contract-audit.md`
  - `docs/audits/alpha-reset-scope-plan.md`

---

### Command

`rg -n "api/work/persist" app src docs`

### Result summary

- Same pattern: documentation references only.
- No active route/page/service caller found in `app/` or `src/`.

---

### Command

`rg -n "fetchWithAuth\\(\"/api/work|fetch\\(\"/api/work|/api/work-block/next|/api/work/answer" app src`

### Result summary

- Active work runtime calls observed:
  - `app/session/[id]/(flow)/work/page.tsx` calls `/api/work-block/next`
  - `app/session/[id]/(flow)/work/page.tsx` calls `/api/work/answer`
- No call to `/api/work/persist` found.

---

### Command

`rg -n "work_versions|work_latest" app/api/work app/api/work-block app/api/work/answer app/api/session-summary "app/session/[id]/(flow)/work"`

### Result summary

- `/api/work/persist` reads/writes `work_versions` + `work_latest`.
- `/api/work-block/next` also writes to `work_versions` + `work_latest`.
- `/api/work/answer` reads `work_versions` for answer linkage.
- Work page reads `work_versions` + `work_latest` directly from Supabase.

## Required question answers

### 1) Does `/api/work/persist` have any active runtime callers?

No active runtime callers were found in `app/` or `src/` by endpoint-string scan.

### 2) Is it referenced only in docs/history?

Yes, current references are documentation/audit/ledger references. No active callsite reference was found in runtime code paths.

### 3) Does it overlap with `/api/work-block/next`?

Yes. Both touch the same persistence stores (`work_versions`, `work_latest`).  
`/api/work-block/next` is the active path used by current session work flow.

### 4) Would removing it later affect current session flow?

Based on current caller-proof evidence, removing it later should not affect the active core session flow, because current flow uses `/api/work-block/next` and `/api/work/answer`.  
However, removal should still be gated by a final pre-removal caller-proof scan and a guarded release window check.

### 5) What rollback/retirement plan would be needed if removed later?

Recommended retirement plan:

1. Re-run caller-proof scan immediately before removal (same command set).
2. Confirm no external/manual tooling depends on this endpoint.
3. Perform staged deprecation:
   - phase A: mark as deprecated in docs and add temporary warning logs
   - phase B: remove route in a dedicated cleanup ticket
4. Rollback path:
   - restore `app/api/work/persist/route.ts` from git if any hidden caller appears
   - keep `/api/work-block/next` unchanged as authoritative path

## Overlap and ownership note

- Current canonical active work generation/persistence owner is `/api/work-block/next`.
- `/api/work/persist` is a parallel legacy persistence endpoint with no observed active in-repo callers.
- It should remain classified as legacy scaffolding until explicit retirement cleanup is approved.

## Verdict

- **Active caller verdict:** no active in-repo runtime callers found.
- **Classification:** dormant legacy scaffolding.
- **Retirement readiness:** retirement candidate (not blocked by current in-repo caller evidence).
- **Policy status:** do not remove in this ticket; schedule separate guarded cleanup ticket.

## Recommended next action

Create a dedicated cleanup plan ticket:

`PLAN/VALIDATION - Guarded Retirement Plan for /api/work/persist`

with:

- pre-removal caller-proof rerun
- explicit rollback step
- owner sign-off gate before deletion

## Containment statement

- No runtime code changed.
- No route behavior changed.
- No schema/migration/Supabase changes.
