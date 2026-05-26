# Wrapper Collapse Sequence

## Status

Completed on 2026-05-13.

Removed wrapper endpoints:
- `/api/frame`
- `/api/session/bootstrap`
- `/api/frame/ensure`

Current canonical orchestration endpoint:
- `/api/session/ensure`

This document is retained as planning history plus current-state summary.

## Purpose

Define a safe, evidence-based sequence to collapse wrapper/delegation API routes so alpha runtime ownership is explicit and centered on canonical endpoints.

## Current Wrapper Inventory

| Endpoint | Current role | Delegates to | Active callers | Response contract | Remove/keep assessment | Confidence |
|---|---|---|---|---|---|---|
| `/api/frame` | Removed wrapper (historical) | Previously delegated to `/api/frame/ensure` | None | N/A | Removed | High |
| `/api/frame/ensure` | Removed adapter (historical) | Previously delegated to `/api/session/ensure` | None | N/A | Removed | High |
| `/api/session/bootstrap` | Removed wrapper (historical) | Previously delegated to `/api/session/ensure` | None | N/A | Removed | High |
| `/api/session/ensure` | Canonical orchestration endpoint for core flow | N/A (owns orchestration) | Active callers: `/new`, frame page, direction soft ensure, work pre-index (`app/new/NewClient.tsx:110-113`, `app/session/[id]/(flow)/frame/page.tsx:146-156`, `app/session/[id]/(flow)/direction/page.tsx:208-213`, `app/session/[id]/(flow)/work/page.tsx:345-350`) | Canonical JSON contract includes status/version IDs/recommended directions (`app/api/session/ensure/route.ts:351-364`) | Keep canonical | High |
| `/api/synthesize` (audit note) | Not wrapper-only; owns synthesis logic, includes best-effort internal observe call | Calls `/api/observe` internally as sub-step (`app/api/synthesize/route.ts:252-261`) | Not part of wrapper-collapse target set | Not pass-through; mixed behavior route | Out of scope for this collapse ticket | Medium |

## Canonical Endpoint Recommendation

1. Keep `/api/session/ensure` as canonical orchestration endpoint for alpha core flow.
2. Treat all removed wrapper endpoints as historical only.

## Caller Evidence

- `/api/session/ensure` active caller evidence:
  - `app/new/NewClient.tsx:110-113`
  - `app/session/[id]/(flow)/frame/page.tsx:146-156`
  - `app/session/[id]/(flow)/direction/page.tsx:208-213`
  - `app/session/[id]/(flow)/work/page.tsx:345-350`
- No active in-repo runtime callers remain for:
  - `/api/frame`
  - `/api/frame/ensure`
  - `/api/session/bootstrap`

## Collapse Candidates

### Remove First

- Completed:
  - `/api/frame` removed
  - `/api/session/bootstrap` removed

### Keep Temporarily

- Completed migration:
  - frame page moved from `/api/frame/ensure` to `/api/session/ensure`
- Current keep:
  - `/api/session/ensure` as canonical endpoint

### Unclear

- External/non-repo historical consumers of removed wrappers (not provable from repository search).

## Proposed Collapse Sequence

### Slice 1

- Remove legacy wrapper route `/api/frame`. (Completed)

### Slice 2

- Remove legacy wrapper route `/api/session/bootstrap`. (Completed)

### Slice 3

- Collapse `/api/frame/ensure` into direct `/api/session/ensure` caller usage from frame page. (Completed)

## Validation Plan

Per slice validation:

1. Static caller audit:
   - `rg` for route strings (`/api/frame`, `/api/frame/ensure`, `/api/session/bootstrap`, `/api/session/ensure`) in `app/components/src/docs`.
2. Type safety:
   - `npm.cmd run typecheck`
3. Runtime smoke checks (manual):
   - `/new` ensure path works.
   - `/session/[id]/frame` loads frame.
   - `/session/[id]/direction` soft ensure works.
   - `/session/[id]/work` pre-index ensure works.

## Rollback Plan

- Revert the specific wrapper-collapse slice commit if any regression appears.
- Because slices were route-local and non-schema, rollback is low-risk and immediate.

## Risks

- Hidden external caller risk for removed wrapper endpoints remains a historical caveat.
- Ambiguous docs can still reference deprecated wrappers unless explicitly marked historical.

## Recommended First BUILD Ticket

Historical recommendation already executed:
- `BUILD - Remove /api/frame wrapper endpoint (no callers, wrapper-only)`

Next practical follow-up:
- `DOCS - Refresh Runtime Docs After Wrapper Collapse`
