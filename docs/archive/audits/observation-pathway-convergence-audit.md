# Observation Pathway Convergence Audit

## Purpose

Map the actual current observation runtime behavior and identify pathway convergence risks before public alpha, without proposing or applying runtime changes.

## Scope

This audit covers current runtime entrypoints, orchestration behavior, async jobs, DB touchpoints, and fallback/adapter behavior for observation handling.

It is CURRENT-ONLY and does not treat target docs or migration intent as runtime truth.

## Current Observation Runtime Model

Observation currently runs through multiple active pathways:
- Direct observe API (`/api/observe`) that produces `dream_v1` observation payloads.
- Ensure/orchestration path (`/api/session/ensure`) that primarily drives core flow progression and often delegates extraction to a job.
- Job extraction path (`jobExtractObservation`) that persists `v0` observation payloads and updates latest pointers.
- Fallback/adapter reads that may convert `dream_v1` payloads into `v0` shape when `v0` latest pointers are missing.

Observed runtime pattern: mixed `dream_v1` write path + `v0` orchestration/job dependencies + adapter fallback bridging.

Confidence: High

## Observation Entrypoints

For each:
- route/API/job
- purpose
- downstream flow
- DB touchpoints
- evidence
- confidence

### Entrypoint: `app/api/observe/route.ts`

- route/API/job: `POST /api/observe`
- purpose: extract and persist observation directly from entry text(s)
- downstream flow: optionally used as a best-effort ensure step by synthesis flow; can return existing/refreshed observation
- DB touchpoints:
  - reads existing latest dream observation via `fetchObservationLatestDreamWithPayloadAndId`
  - writes new version via `insertObservationVersionIfMissing`
  - updates latest via `upsertObservationLatest(... schema_version: "dream_v1")`
- evidence:
  - `app/api/observe/route.ts`
  - imports from `@/src/db/repositories/latestRepo` and `@/src/db/repositories/observationRepo`
- confidence: High

### Entrypoint: `app/api/session/ensure/route.ts`

- route/API/job: `POST /api/session/ensure`
- purpose: orchestration hub for core flow readiness (`observe`, `frame`, `direction`, `work`)
- downstream flow: called from session/bootstrap and user flow pages; can invoke observation extraction job
- DB touchpoints:
  - reads v0 latest via `fetchObservationLatestV0WithPayloadAndId`
  - conditionally triggers `jobExtractObservation` (which writes observation data)
- evidence:
  - `app/api/session/ensure/route.ts`
  - `app/api/session/bootstrap/route.ts` (delegates to ensure)
  - `app/new/NewClient.tsx` and flow page callers (search evidence)
- confidence: High

### Entrypoint: `src/orchestration/jobs/jobExtractObservation.ts`

- route/API/job: async/domain job `jobExtractObservation`
- purpose: extract observation from entries with idempotent job-run semantics
- downstream flow: called by ensure pipeline when observe step should run
- DB touchpoints:
  - writes `observation_versions` rows via `insertObservationVersionIfMissing`
  - updates `observation_latest` via `upsertObservationLatest(... schema_version: "v0")`
  - records job run state via `beginJobRun` / `finishJobRun`
- evidence:
  - `src/orchestration/jobs/jobExtractObservation.ts`
- confidence: High

### Entrypoint: `app/api/synthesize/route.ts`

- route/API/job: `POST /api/synthesize`
- purpose: synthesis path that best-effort ensures observation if missing
- downstream flow: directly invokes `observePOST` from `/api/observe`
- DB touchpoints:
  - reads observation via `fetchObservationLatestV0WithPayloadAndId`
  - may trigger direct observe writes indirectly through `observePOST`
- evidence:
  - `app/api/synthesize/route.ts`
- confidence: Medium

---

## session/ensure Observation Behavior

`/api/session/ensure` behaves as a mixed orchestration layer:
- When `run.observe` is true and user is not guest, it executes `jobExtractObservation`.
- It then reads `v0` latest observation (`fetchObservationLatestV0WithPayloadAndId`) for downstream frame/direction/work orchestration state.
- It contains fallback handling where observation id/payload may be refetched from v0 latest if initial path leaves them missing.

Observed runtime pattern: ensure path is a primary user-flow orchestrator, but observation read model is v0-centric even while direct observe path writes dream_v1.

Evidence:
- `app/api/session/ensure/route.ts`
- `src/orchestration/jobs/jobExtractObservation.ts`
- `src/db/repositories/latestRepo.ts`

Confidence: High

---

## Async Observation Jobs

Primary observation job:
- `src/orchestration/jobs/jobExtractObservation.ts`
  - computes deterministic idempotency inputs
  - extracts observation from entries
  - persists as `schema_version: "v0"`
  - updates latest pointers and job status

Related downstream jobs depending on observation payloads exist (e.g., latent/frame/index jobs) and frequently read v0 latest observation, increasing sensitivity to v0 availability and adapter behavior.

Evidence:
- `src/orchestration/jobs/jobExtractObservation.ts`
- `src/orchestration/jobs/jobBuildSessionIndexFromObservation.ts`
- search references to `fetchObservationLatestV0WithPayloadAndId`

Confidence: Medium

---

## Observation DB Touchpoints

### v0 observation structures

- `observation_versions` rows with `schema_version: "v0"` are actively written by `jobExtractObservation`.
- ensure and multiple orchestration consumers read observation through v0 latest fetch helpers.

Evidence:
- `src/orchestration/jobs/jobExtractObservation.ts`
- `app/api/session/ensure/route.ts`
- `src/db/repositories/latestRepo.ts`

Confidence: High

### dream_v1 structures

- Direct observe API writes `observation_versions` with `schema_version: "dream_v1"`.
- Direct observe refresh path reads dream latest pointers.

Evidence:
- `app/api/observe/route.ts`
- `src/db/repositories/observationRepo.ts`
- `src/db/repositories/latestRepo.ts`

Confidence: High

### latest/version usage

- `upsertObservationLatest` writes to different pointer fields by schema:
  - dream_v1 -> `latest_dream_id`
  - v0 -> `latest_v0_id` and legacy `observation_version_id`
- Read helpers are split by schema expectations (`fetchObservationLatestDream...` vs `fetchObservationLatestV0...`).

Evidence:
- `src/db/repositories/observationRepo.ts`
- `src/db/repositories/latestRepo.ts`

Confidence: High

### adapters/fallbacks

- v0 read helper can adapt dream_v1 payload into v0 shape when v0 latest is absent but dream latest exists.
- warning log indicates this fallback path is expected enough to be instrumented.

Evidence:
- `src/db/repositories/latestRepo.ts` (`adaptDreamObservationToV0`, warning message)

Confidence: High

---

## Runtime Flow Comparison

### Direct observe flow

- Entry: `/api/observe`
- Write model: dream_v1 version + dream latest pointer
- Output: direct observation payload for immediate use
- Pattern: direct extraction path, schema-specific (dream_v1)

Evidence:
- `app/api/observe/route.ts`

Confidence: High

### Ensure-based observe flow

- Entry: `/api/session/ensure`
- Write model: usually via `jobExtractObservation` (v0)
- Read model: v0 latest helper for orchestration
- Pattern: core-flow orchestration anchor with v0-centric read expectations

Evidence:
- `app/api/session/ensure/route.ts`
- `src/orchestration/jobs/jobExtractObservation.ts`

Confidence: High

### Job-based observe flow

- Entry: `jobExtractObservation`
- Write model: v0
- Consumer model: downstream jobs/routes reading v0 latest
- Pattern: idempotent async path driving stable orchestration inputs

Evidence:
- `src/orchestration/jobs/jobExtractObservation.ts`
- v0 latest readers across orchestration/job files

Confidence: Medium

---

## Transitional / Mixed Runtime Areas

- Mixed schema-version behavior (`dream_v1` and `v0`) is concurrently active.
- Ensure/core orchestration relies on v0 reads while direct observe can write dream_v1.
- Adapter fallback (`dream_v1` -> `v0`) bridges gaps, signaling transitional coexistence.
- Legacy MVP table artifacts (e.g., historical `dream_observation` migration) suggest prior pathways may still influence mental models, even if not primary runtime path.

Evidence:
- `app/api/observe/route.ts`
- `app/api/session/ensure/route.ts`
- `src/db/repositories/latestRepo.ts`
- `supabase/migrations/MVP/20260112090000_add_dream_observation.sql`

Confidence: Medium

---

## User-Facing Observation Path

Most user-facing flow routes invoke `/api/session/ensure`, making ensure-based orchestration the main observed user-facing observation path.

Observed callers include:
- `app/new/NewClient.tsx`
- `app/session/[id]/(flow)/direction/page.tsx`
- `app/session/[id]/(flow)/work/page.tsx`
- indirect via `app/api/session/bootstrap/route.ts` and `app/api/frame/ensure/route.ts`

Direct `/api/observe` appears runtime-active, but primarily as an internal/API pathway and via synthesis best-effort call, not as the main explicit UI entry in reviewed files.

Evidence:
- file-level search for `/api/session/ensure`
- `app/api/synthesize/route.ts`

Confidence: Medium

---

## Risks

### Silent divergence risk

Different active pathways may produce/store observations under different schema versions, while consumers expect specific versions.

Evidence:
- dream_v1 writes in `app/api/observe/route.ts`
- v0 reads in ensure/orchestration via `fetchObservationLatestV0WithPayloadAndId`

Confidence: High

### Duplicate observation risk

Multiple extraction entrypoints (direct + job-driven) may create overlapping versions for the same session timeline under different schema versions.

Evidence:
- `app/api/observe/route.ts`
- `src/orchestration/jobs/jobExtractObservation.ts`

Confidence: Medium

### Partial migration risk

Adapter fallback from dream_v1 to v0 indicates incomplete convergence between write/read contracts.

Evidence:
- `src/db/repositories/latestRepo.ts` adaptation path and warning

Confidence: High

### Alpha stability risk

Core flow predictability may degrade when ensure pipeline, direct observe route, and downstream jobs rely on mixed observation contracts and fallback behavior.

Evidence:
- ensure orchestration (`app/api/session/ensure/route.ts`)
- mixed latest pointers (`src/db/repositories/observationRepo.ts`)

Confidence: Medium

---

## Likely Convergence Targets

(Descriptive only, not implementation)

- Align user-facing orchestration and direct observe flows on one explicit read contract for downstream steps.
- Reduce dependency on schema adaptation fallback in runtime-critical paths.
- Make pointer ownership and schema-version ownership explicit per stage (observe/frame/direction/work).

Confidence: Medium

---

## Recommended Next Steps

1. Run a focused audit on observation latest-pointer ownership and precedence rules (`latest_v0_id`, `latest_dream_id`, `observation_version_id`) across all consumers.
2. Run a route-ownership audit to determine which observation entrypoint is intended for each user-facing transition.
3. Produce a build ticket that first aligns read contracts in core orchestration paths before any schema cleanup.
4. Defer removals/merges until runtime evidence proves no active dependency on adapter/fallback paths.

Confidence: Medium

---

## Evidence Notes

Primary files reviewed:
- `app/api/observe/route.ts`
- `app/api/session/ensure/route.ts`
- `app/api/synthesize/route.ts`
- `src/orchestration/jobs/jobExtractObservation.ts`
- `src/db/repositories/observationRepo.ts`
- `src/db/repositories/latestRepo.ts`
- `app/new/NewClient.tsx`
- `app/session/[id]/(flow)/direction/page.tsx`
- `app/session/[id]/(flow)/work/page.tsx`
- `app/api/session/bootstrap/route.ts`
- `app/api/frame/ensure/route.ts`
- `supabase/migrations/MVP/20260112090000_add_dream_observation.sql`
- `docs/audits/runtime-current-flow-audit.md`

Validation: Audit-only documentation ticket.
