# BUILD/VALIDATION — Controlled Reflective-first Highlights Read Switch (Phase B-B1)

Date: 2026-05-17  
Surface: `/session/[id]/(flow)/highlights`  
Scope: route-local controlled reflective-first read switch (no ownership transfer)

## 1. Implementation Strategy

Implemented a guarded, route-local reflective read path for highlights:

- API surface: [route.ts](c:\mira\app\api\sessions\[sessionId]\highlights\route.ts)
  - Added `read_mode` resolution (`legacy`/`reflective`) using query + env default.
  - Added reflective projection assembly via `buildUnifiedReflectiveHighlightsProjection`.
  - Kept legacy fields intact (`highlights`, `rejected_keys`) and added `entry_highlights`, `reflective_highlights`, `read_mode`.
  - No write-path changes in GET/POST semantics.

- Flow page surface: [page.tsx](c:\mira\app\session\[id]\(flow)\highlights\page.tsx)
  - Added guarded switch: `highlights_read_mode=reflective` query or `NEXT_PUBLIC_REFLECTIVE_HIGHLIGHTS_READ_DEFAULT=1`.
  - Reflective branch reads from `/api/sessions/[sessionId]/highlights?read_mode=reflective&entry_id=...`.
  - Legacy branch preserved as fallback/default.
  - Reflective fetch failure triggers explicit legacy fallback read (entry highlights + rejected keys).

- Projection adapter utility:
  - [highlightReadSwitch.ts](c:\mira\src\domain\reflective\projections\highlightReadSwitch.ts)
  - Handles read-mode resolution and projection-to-flow-entry mapping with deterministic ordering and visibility constraints.

## 2. Switch Mechanism

Controlled switch behavior:

- Default (safe): `legacy`
- Reflective mode enabled by:
  - client query: `?highlights_read_mode=reflective`
  - or env default: `NEXT_PUBLIC_REFLECTIVE_HIGHLIGHTS_READ_DEFAULT=1`

API projection mode:
- `read_mode=reflective` query on highlights API route (or server env default).

This keeps the switch route-local and reversible without touching write ownership.

## 3. Required Parity Guarantees

Validated/implemented guarantees:

- pin/reject parity: preserved (projection carries pinned/rejected posture)
- deterministic ordering: preserved in projection + flow-entry adapter
- no semantic auto-merge: preserved (entry/session identities remain separate in projection)
- no salience inflation: preserved (no promotion logic added)
- no rejected highlight resurfacing: preserved (suppressed/historical excluded from flow-entry adapter)
- lineage preservation: preserved through projection `source_refs`
- calmness-compatible visibility: preserved through conservative filtering in flow-entry mapping

Acceptable divergence:
- normalized reflective payload shape with projection metadata

## 4. Rollback Rehearsal and Proof

Rollback path:

1. Remove/avoid `highlights_read_mode=reflective` query (or unset env default).  
2. Surface immediately returns to legacy read behavior.

Additional fallback proof:
- If reflective API read fails while reflective mode is enabled, page performs explicit legacy fallback fetch and restores legacy entry/rejected state.

Rollback properties:
- route-local
- no data mutation required
- no dependency on reflective persistence

## 5. Caller Isolation Evidence

Reflective read-switch symbols scan:

- `rg -n "buildUnifiedReflectiveHighlightsProjection|projectedHighlightsToFlowEntryRows|resolveReflectiveHighlightsReadMode" app src --glob "!**/*.md"`
  - Matches limited to:
    - highlights flow page
    - highlights API route
    - reflective projection modules/tests/validation harness

No reflective domain writes:

- `rg -n "supabase|\.from\(|insert\(|update\(|upsert\(|delete\(" src/domain/reflective --glob "**/*.ts"`
  - Result: `NO_MATCHES`

Guard surface scan:

- `rg -n "read_mode=reflective|highlights_read_mode|LUMIRA_REFLECTIVE_HIGHLIGHTS_READ_DEFAULT|NEXT_PUBLIC_REFLECTIVE_HIGHLIGHTS_READ_DEFAULT" app src --glob "!**/*.md"`
  - Matches limited to highlights page + highlights API route

Conclusion:
- no summary/re-entry coupling introduced
- no work-flow route coupling introduced
- no hidden reflective canonical store introduced

## 6. Validation Commands and Results

- `npm.cmd run typecheck` -> PASS
- `npm.cmd run test -- src/domain/reflective/projections/highlightProjection.test.ts src/domain/reflective/projections/highlightReadSwitch.test.ts src/domain/reflective/validation/routeDryRunReflectiveRead.test.ts` -> PASS (`3 files`, `13 tests`)

## 7. Mismatch Classification

- Blocker: none detected
- Warning:
  - lineage precision breadth warning (A2 carry-forward) remains non-blocking for this route-local switch
- Acceptable divergence:
  - reflective normalized payload structure vs legacy split shape
- Intentional simplification:
  - flow mapping only accepts valid entry-span projection rows for edit/pin compatibility

## 8. Final Verdict

PASS WITH NOTES

Notes:
- Controlled reflective-first highlights read switch is implemented and validated route-locally.
- Rollback path is immediate and tested by design (guard off + explicit legacy fallback).
- Safe to proceed with owner review for controlled runtime usage of highlights reflective read mode.
