# Highlight Contract + Glossary Access Gate

## Purpose

Define an implementation-ready alpha boundary for glossary access and highlight data ownership without changing runtime behavior, schema, or routes in this ticket.

## Owner Decisions

1. Glossary should be available to all authenticated alpha users, not admin-only.
2. Highlight storage remains dual/transitional for alpha:
   - `dream_entry_highlights`: concrete user-marked text spans on raw entries.
   - `dream_session_highlights`: session-level salience/suggestion/pin/reject workflow state.
3. No DB cleanup in this ticket.
4. No highlight-table merge in this ticket.

## Glossary Alpha Access Decision

- Alpha decision: glossary surfaces should be `authenticated-only` (not `admin-only`).
- Current runtime state:
  - `/glossary`: `admin-only` gate in page runtime (`isGlossaryAdmin` + `router.replace("/404")`).  
    Evidence: `app/glossary/page.tsx:15`, `app/glossary/page.tsx:82`, `app/glossary/page.tsx:86`  
    Confidence: High
  - `/glossary/suggestions`: `admin-only` gate in page runtime (`isGlossaryAdmin` + `router.replace("/404")`).  
    Evidence: `app/glossary/suggestions/page.tsx:15`, `app/glossary/suggestions/page.tsx:55`, `app/glossary/suggestions/page.tsx:58`  
    Confidence: High
  - Both pages already require auth (`useRequireAuth`) before gate resolution.  
    Evidence: `app/glossary/page.tsx:13`, `app/glossary/page.tsx:41`; `app/glossary/suggestions/page.tsx:14`, `app/glossary/suggestions/page.tsx:28`  
    Confidence: High

## Highlight Alpha Data Contract

### `dream_entry_highlights`

- Role in alpha:
  - Canonical per-entry highlight spans anchored to raw dream text (`entry_id`, offsets, text, category, note).
  - Primary user-editable highlight payload used by summary/highlights flow UI.
- Current runtime evidence:
  - Summary reads and mutates `dream_entry_highlights`.  
    Evidence: `app/session/[id]/summary/page.tsx:471`, `app/session/[id]/summary/page.tsx:1158`, `app/session/[id]/summary/page.tsx:1205`, `app/session/[id]/summary/page.tsx:1229`  
    Confidence: High
  - Highlights flow reads and mutates `dream_entry_highlights`.  
    Evidence: `app/session/[id]/(flow)/highlights/page.tsx:136`, `app/session/[id]/(flow)/highlights/page.tsx:347`, `app/session/[id]/(flow)/highlights/page.tsx:404`, `app/session/[id]/(flow)/highlights/page.tsx:428`  
    Confidence: High

### `dream_session_highlights`

- Role in alpha:
  - Session-level highlight state for normalized labels/kinds, source metadata, and active suggestion lifecycle.
  - API-owned highlight session memory for add/update/retrieve behavior.
- Current runtime evidence:
  - Session highlight API reads/writes `dream_session_highlights`.  
    Evidence: `app/api/sessions/[sessionId]/highlights/route.ts:58`, `app/api/sessions/[sessionId]/highlights/route.ts:142`, `app/api/sessions/[sessionId]/highlights/route.ts:161`  
    Confidence: High

### Transitional Policy

- Keep both tables during alpha, with explicit separation:
  - `dream_entry_highlights`: raw-entry concrete spans and edits.
  - `dream_session_highlights`: session salience/suggestion state and normalized highlight API payloads.
- Keep `dream_session_rejected_suggestions` as supporting workflow state for suggestion rejection.
  - Evidence: `app/api/sessions/[sessionId]/highlights/route.ts:66`, `app/api/sessions/[sessionId]/highlights/route.ts:190`; `app/api/sessions/[sessionId]/highlights/reject/route.ts:41`  
  - Confidence: High
- No table merge, backfill, or schema rewrite in alpha-gate ticket.

## Current Runtime Inventory

### Glossary Routes / Access Checks

- `/glossary`
  - Access check: `admin-only` + `authenticated-only`.
  - Mechanism: `useRequireAuth`, then explicit `isGlossaryAdmin` check, else redirect `404`.
  - Evidence: `app/glossary/page.tsx:13`, `app/glossary/page.tsx:15`, `app/glossary/page.tsx:82`, `app/glossary/page.tsx:86`  
  - Confidence: High
- `/glossary/suggestions`
  - Access check: `admin-only` + `authenticated-only`.
  - Mechanism: `useRequireAuth`, then explicit `isGlossaryAdmin` check, else redirect `404`.
  - Evidence: `app/glossary/suggestions/page.tsx:14`, `app/glossary/suggestions/page.tsx:15`, `app/glossary/suggestions/page.tsx:55`, `app/glossary/suggestions/page.tsx:58`  
  - Confidence: High
- Additional functional gate:
  - Candidate-threshold gate via `allowGlossaryAccess`/`GLOSSARY_GATE_THRESHOLD` in `/glossary`.
  - This is product gating, not auth gating.
  - Evidence: `src/lib/glossary/gate.ts:1`, `src/lib/glossary/gate.ts:3`, `app/glossary/page.tsx:16`, `app/glossary/page.tsx:368`, `app/glossary/page.tsx:439`  
  - Confidence: High

### Glossary APIs / Access Checks

- `/api/glossary/backfill-candidates` (`POST`)
  - Access check: `admin-only` (authenticated first, then `isGlossaryAdmin`).
  - Classification: `admin-only`.
  - Evidence: `app/api/glossary/backfill-candidates/route.ts:32`, `app/api/glossary/backfill-candidates/route.ts:37`  
  - Confidence: High
- `/api/glossary/backfill-occurrences` (`POST`)
  - Access check: authenticated user + term ownership (`glossary_terms.user_id = auth user`).
  - Classification: `authenticated-only` (owner scoped), not admin-only.
  - Evidence: `app/api/glossary/backfill-occurrences/route.ts:41`, `app/api/glossary/backfill-occurrences/route.ts:50`  
  - Confidence: High
- Current `/api/glossary/*` inventory in repo:
  - `app/api/glossary/backfill-candidates/route.ts`
  - `app/api/glossary/backfill-occurrences/route.ts`
  - Evidence: repository path listing (`rg --files app/api/glossary`)  
  - Confidence: High

### Highlight Routes / APIs

- `/session/[id]/(flow)/highlights`
  - Access check: authenticated-only via `requireUserId` on data actions.
  - Uses `dream_entry_highlights` + session highlight APIs.
  - Evidence: `app/session/[id]/(flow)/highlights/page.tsx:6`, `app/session/[id]/(flow)/highlights/page.tsx:136`, `app/session/[id]/(flow)/highlights/page.tsx:164`  
  - Confidence: High
- `/api/sessions/[sessionId]/highlights` (`GET|POST`)
  - Access check: authenticated-only (`supabase.auth.getUser`).
  - Classification: `authenticated-only`.
  - Evidence: `app/api/sessions/[sessionId]/highlights/route.ts:50`, `app/api/sessions/[sessionId]/highlights/route.ts:118`  
  - Confidence: High
- `/api/sessions/[sessionId]/highlights/reject` (`POST`)
  - Access check: authenticated-only (`supabase.auth.getUser`).
  - Classification: `authenticated-only`.
  - Evidence: `app/api/sessions/[sessionId]/highlights/reject/route.ts:33`  
  - Confidence: High
- `/api/highlights/pin` (`POST`)
  - Access check: authenticated-only (`supabase.auth.getUser`).
  - Classification: `authenticated-only`.
  - Evidence: `app/api/highlights/pin/route.ts:31`  
  - Confidence: High

### DB Tables

- Highlight contract tables:
  - `dream_entry_highlights` (entry span highlights)
  - `dream_session_highlights` (session highlight state)
  - `dream_session_rejected_suggestions` (rejection state)
- Glossary contract tables:
  - `glossary_terms`, `glossary_notes`, `term_candidates`, `glossary_occurrences`
- Evidence:
  - Highlights reads/writes: `app/session/[id]/summary/page.tsx:471`, `app/session/[id]/(flow)/highlights/page.tsx:136`, `app/api/sessions/[sessionId]/highlights/route.ts:58`, `app/api/sessions/[sessionId]/highlights/reject/route.ts:41`
  - Glossary reads/writes: `app/glossary/page.tsx:105`, `app/glossary/page.tsx:122`, `app/glossary/page.tsx:152`, `app/api/glossary/backfill-occurrences/route.ts:47`
  - Observation-derived candidate side effects: `src/orchestration/jobs/jobExtractObservation.ts:68`, `src/orchestration/jobs/jobExtractObservation.ts:71`
- Confidence: High

## Required Future BUILD Slice

`BUILD — Open Glossary Pages To Authenticated Users`

- Scope:
  - Remove `isGlossaryAdmin` page gating from:
    - `/glossary`
    - `/glossary/suggestions`
  - Keep authenticated access (`useRequireAuth`/auth checks).
  - Keep existing glossary candidate threshold gate behavior unchanged.
  - Do not change `/api/glossary/*` behavior in this slice.
  - Do not change highlight logic or table roles.
- Why this is smallest safe slice:
  - It implements owner decision #1 directly.
  - It avoids DB work and avoids highlight contract rewrites.
  - It isolates risk to UI gate behavior only.

## Acceptance Criteria For Future BUILD

1. `/glossary` accessible to any authenticated user.
2. `/glossary/suggestions` accessible to any authenticated user.
3. Unauthenticated users remain blocked/redirected.
4. `allowGlossaryAccess` threshold behavior remains unchanged.
5. No DB/schema/migration changes.
6. No highlight table merge or data migration.
7. `/api/glossary/backfill-candidates` remains admin-only unless separately approved.

## Risks

- Access widening may expose glossary UX quality issues for non-admin users (content readiness, empty states).
- If page gate is removed but API assumptions remain admin-scoped in later steps, behavior can become inconsistent.
- Dual highlight-table policy can drift without explicit follow-up contract enforcement in implementation tickets.

## Non-Goals

- No runtime code changes in this ticket.
- No DB cleanup or schema changes.
- No merge of `dream_entry_highlights` and `dream_session_highlights`.
- No redesign of highlight suggestion ranking or glossary candidate extraction logic.
