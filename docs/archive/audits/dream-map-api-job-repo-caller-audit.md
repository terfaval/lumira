# Dream Map API / Job / Repo Caller Audit

## Purpose

Provide an evidence-based dependency audit of remaining dream-map runtime layers so future cleanup can remove dream-map code safely without breaking shared archetype/glossary/highlight/core systems.

## Current Remaining Dream Map Runtime Layers

### APIs

- `app/api/dreammap/aggregate/route.ts`
  - Authenticated aggregate read over `dream_map_latest` + `dream_map_versions` (`app/api/dreammap/aggregate/route.ts:321-355`).
- `app/api/dreammap/v2/aggregate/route.ts`
  - Authenticated latest-v2 read via `fetchDreamMapV2Latest` (`app/api/dreammap/v2/aggregate/route.ts:4`, `:43-44`).
- `app/api/dreammap/v2/build/route.ts`
  - Authenticated v2 build/write using glossary/highlight/archetype inputs and `dreamMapV2Repo` (`app/api/dreammap/v2/build/route.ts:64-76`, `:111-122`).
- `app/api/admin/dreammap/backfill/route.ts`
  - Admin route with two targets:
  - `missing_dreammap` path runs `jobBuildDreamMapV0` (`app/api/admin/dreammap/backfill/route.ts:62`, `:196-201`).
  - `missing_archetype` path runs `jobBackfillArchetypeMissing` (`app/api/admin/dreammap/backfill/route.ts:62`, `:71-99`).

### Jobs

- `src/orchestration/jobs/jobBuildDreamMapV0.ts`
  - Builds dream-map v0 payload and writes `dream_map_versions` + `dream_map_latest` (`src/orchestration/jobs/jobBuildDreamMapV0.ts:435-468`).
  - Uses shared job infra (`beginJobRun`/`finishJobRun`) with `job_type: "build_dream_map_v0"` (`src/orchestration/jobs/jobBuildDreamMapV0.ts:3`, `:413-420`).
  - Enqueues archetype proposals via shared queue repo (`src/orchestration/jobs/jobBuildDreamMapV0.ts:8`, `:470-475`).
- `src/orchestration/jobs/jobBackfillArchetype.ts`
  - Reads latest dream-map payloads then re-runs `jobBuildDreamMapV0` for missing-archetype remediation (`src/orchestration/jobs/jobBackfillArchetype.ts:73-77`, `:110-115`).

### Repositories / Services

- `src/db/repositories/dreamMapRepo.ts`
  - v0 persistence/read helpers over `dream_map_versions` and `dream_map_latest` (`src/db/repositories/dreamMapRepo.ts:9-13`, `:97-103`, `:171-173`, `:197-199`).
- `src/db/repositories/dreamMapV2Repo.ts`
  - v2 persistence/read helpers over `dream_map_v2_versions` and `dream_map_v2_latest` (`src/db/repositories/dreamMapV2Repo.ts:9-10`, `:59`, `:77`, `:85`).
- Shared but coupled:
  - `src/db/repositories/archetypeRepo.ts` imports dream-map domain type (`src/db/repositories/archetypeRepo.ts:4`).
  - `src/db/repositories/archetypeQueueRepo.ts` stores `dream_map_version_id` and defaults source to `dream_map_canonicalizer` (`src/db/repositories/archetypeQueueRepo.ts:18`, `:52-53`).

### Domain Helpers

- `src/domain/dreammap/buildDreamMapV0.ts`
- `src/domain/dreammap/buildDreamMapV2.ts`
- `src/domain/dreammap/types.ts`
- `src/domain/dreammap/types_v2.ts`
- `src/domain/dreammap/axis/*`

These are still used by runtime APIs/jobs:
- v0 builder called by orchestration job (`src/orchestration/jobs/jobBuildDreamMapV0.ts:15`, `:435`).
- v2 builder called by API route (`app/api/dreammap/v2/build/route.ts:6`, `:85`).
- types imported by route/components/repo (`app/api/dreammap/aggregate/route.ts:3-8`, `src/db/repositories/archetypeRepo.ts:4`, `components/dreammap/*`).

### Tests

- `src/orchestration/jobs/jobBuildDreamMapV0.test.ts`
- `src/domain/dreammap/buildDreamMapV0.test.ts`
- Indirect shared-coupling test: `src/db/repositories/__tests__/archetypeQueueRepo.test.ts` includes `dream_map_canonicalizer` source usage (`src/db/repositories/__tests__/archetypeQueueRepo.test.ts:58`).

## Import / Caller Graph

### `app/api/dreammap/aggregate/route.ts`
- Imported by:
  - No code import (Next route entrypoint).
  - Runtime caller from component fetch: `components/dreammap/DreamMapLayout.tsx:87`.
- Imports:
  - `supabaseServerAuthed`, dream-map v0 types.
- Runtime role:
  - Aggregates per-session v0 maps into cross-session graph.
- Confidence: High.

### `app/api/dreammap/v2/aggregate/route.ts`
- Imported by:
  - No code import (Next route entrypoint).
  - Runtime caller from component fetch: `components/dreammap/DreamMapLayoutV2.tsx:38`.
- Imports:
  - `fetchDreamMapV2Latest`, `DreamMapV2Payload`.
- Runtime role:
  - Returns latest v2 map for current user.
- Confidence: High.

### `app/api/dreammap/v2/build/route.ts`
- Imported by:
  - No code import (Next route entrypoint).
  - Runtime caller from component fetch: `components/dreammap/DreamMapLayoutV2.tsx:54`.
- Imports:
  - `fetchArchetypeTerms`, `dreamMapV2Repo`, `buildDreamMapV2`.
- Runtime role:
  - Builds and persists v2 map from glossary/highlight/archetype sources.
- Confidence: High.

### `app/api/admin/dreammap/backfill/route.ts`
- Imported by:
  - No code import (Next route entrypoint).
  - No active UI caller after surface disable; route remains directly callable.
- Imports:
  - `createDomainEvent`, `jobBuildDreamMapV0`, `jobBackfillArchetypeMissing`.
- Runtime role:
  - Admin maintenance endpoint for both dream-map and archetype backfill modes.
- Confidence: High.

### `src/orchestration/jobs/jobBuildDreamMapV0.ts`
- Imported by:
  - `app/api/admin/dreammap/backfill/route.ts:6`
  - `src/orchestration/jobs/jobBackfillArchetype.ts:6`
  - `src/orchestration/jobs/jobBuildDreamMapV0.test.ts:11`
- Imports:
  - Shared job/idempotency infra, glossary/archetype queue repos, latest repos, `dreamMapRepo`, `buildDreamMapV0`.
- Runtime role:
  - Dream-map v0 orchestration writer + optional archetype queue proposal producer.
- Confidence: High.

### `src/orchestration/jobs/jobBackfillArchetype.ts`
- Imported by:
  - `app/api/admin/dreammap/backfill/route.ts:7`
- Imports:
  - `listDreamMapLatestWithPayload`, `createDomainEvent`, `jobBuildDreamMapV0`.
- Runtime role:
  - Archetype remediation job currently dependent on existing dream-map artifacts.
- Confidence: High.

### `src/db/repositories/dreamMapRepo.ts`
- Imported by:
  - `src/orchestration/jobs/jobBuildDreamMapV0.ts:14`
  - `src/orchestration/jobs/jobBackfillArchetype.ts:4`
- Imports:
  - Supabase client only.
- Runtime role:
  - v0 map persistence + latest pointer + latest payload listing for backfills.
- Confidence: High.

### `src/db/repositories/dreamMapV2Repo.ts`
- Imported by:
  - `app/api/dreammap/v2/build/route.ts:5`
  - `app/api/dreammap/v2/aggregate/route.ts:4`
- Imports:
  - Supabase client only.
- Runtime role:
  - v2 map persistence + latest pointer fetch.
- Confidence: High.

### `src/domain/dreammap/buildDreamMapV0.ts`
- Imported by:
  - `src/orchestration/jobs/jobBuildDreamMapV0.ts:15`
  - `src/domain/dreammap/buildDreamMapV0.test.ts:4`
- Imports:
  - axis lexicon/helpers, dream-map types, shared hashing utilities.
- Runtime role:
  - Pure construction logic for v0 payload.
- Confidence: High.

### `src/domain/dreammap/buildDreamMapV2.ts`
- Imported by:
  - `app/api/dreammap/v2/build/route.ts:6`
- Imports:
  - axis helper + types_v2 + hashing utility.
- Runtime role:
  - Pure construction logic for v2 payload.
- Confidence: High.

### `src/domain/dreammap/types.ts`
- Imported by:
  - `app/api/dreammap/aggregate/route.ts:3-8`
  - `src/orchestration/jobs/jobBuildDreamMapV0.ts:16-24`
  - `src/db/repositories/archetypeRepo.ts:4`
  - `components/dreammap/*` v0 files.
- Imports:
  - none.
- Runtime role:
  - Shared type contract across dream-map v0 layers and archetype repo typing.
- Confidence: High.

### `src/domain/dreammap/types_v2.ts`
- Imported by:
  - `app/api/dreammap/v2/aggregate/route.ts:5`
  - `src/domain/dreammap/buildDreamMapV2.ts:4`
  - `components/dreammap/*` v2 files.
- Imports:
  - axis type.
- Runtime role:
  - Shared type contract across v2 route/domain/component layers.
- Confidence: High.

## Shared Dependency Analysis

### Glossary Coupling

- `jobBuildDreamMapV0` reads glossary recurrence via `fetchGlossaryRecurrence` (`src/orchestration/jobs/jobBuildDreamMapV0.ts:6`, `:71-79`, `:375`).
- v2 build route reads `glossary_terms` and `glossary_occurrences` directly (`app/api/dreammap/v2/build/route.ts:18-27`, `:66-67`).
- Coupling type: read-only dependency on shared glossary memory.
- Risk: Removing glossary infrastructure is unsafe; dream-map layers should be removed independently of glossary tables/repos.
- Confidence: High.

### Highlight Coupling

- v0 job reads `dream_session_highlights` and `dream_entry_highlights` (`src/orchestration/jobs/jobBuildDreamMapV0.ts:105`, `:161`).
- v2 build route reads `dream_entry_highlights` (`app/api/dreammap/v2/build/route.ts:70-73`).
- Coupling type: read-only dependency on shared highlight data.
- Risk: highlights are shared beyond dream-map and should not be deleted in dream-map cleanup.
- Confidence: High.

### Archetype Coupling

- `jobBuildDreamMapV0` reads archetype terms and writes queue proposals (`src/orchestration/jobs/jobBuildDreamMapV0.ts:7-8`, `:82-97`, `:470-475`).
- Queue rows include dream-map metadata/source (`src/db/repositories/archetypeQueueRepo.ts:18`, `:52-53`).
- `jobBackfillArchetypeMissing` depends on dream-map latest payloads and reruns dream-map job (`src/orchestration/jobs/jobBackfillArchetype.ts:73-77`, `:110-115`).
- `archetypeRepo` type dependency currently points to dream-map type file (`src/db/repositories/archetypeRepo.ts:4`).
- Coupling type: bidirectional in current admin/backfill path.
- Risk: deleting dream-map files before separating archetype backfill/type dependencies can break archetype admin maintenance.
- Confidence: High.

### Domain Events / Jobs Coupling

- Dream-map job uses shared `domain_jobs` lifecycle via `beginJobRun`/`finishJobRun` (`src/orchestration/jobs/jobBuildDreamMapV0.ts:3`, `:413-420`, `:477-500`).
- Admin backfill routes write `domain_events` (`app/api/admin/dreammap/backfill/route.ts:5`, `:187-191`; `src/orchestration/jobs/jobBackfillArchetype.ts:3`, `:101-106`).
- Coupling type: shared observability/idempotency infra.
- Risk: do not classify `jobRepo`/`eventRepo` or `domain_jobs`/`domain_events` as dream-map-only.
- Confidence: High.

### Shared Utility Coupling

- Dream-map job uses shared idempotency/hash utilities (`src/orchestration/jobs/jobBuildDreamMapV0.ts:4-5`).
- `JobType` union currently includes `build_dream_map_v0` (`src/orchestration/idempotency/jobKey.ts:2-7`).
- Coupling type: shared library with dream-map-specific branch.
- Risk: dream-map removal requires small utility cleanup patch, not utility deletion.
- Confidence: High.

## Safe Removal Classification

### REMOVE NOW

1. `components/dreammap/*`
- Evidence:
  - No active route imports after `/dreammap` page was replaced with `notFound()`.
  - Remaining references are internal component-to-component and API fetch strings (`components/dreammap/DreamMapLayout.tsx:87`, `DreamMapLayoutV2.tsx:38`, `:54`).
- Why now:
  - UI surfaces already disabled; these components no longer serve active product paths.
- Confidence: Medium (external dynamic imports not evidenced).

2. Dream-map-specific tests:
- `src/orchestration/jobs/jobBuildDreamMapV0.test.ts`
- `src/domain/dreammap/buildDreamMapV0.test.ts`
- Evidence: test-only imports and no production callers.
- Confidence: High.

### REMOVE AFTER SMALL PATCH

1. `app/api/dreammap/aggregate/route.ts`
2. `app/api/dreammap/v2/aggregate/route.ts`
3. `app/api/dreammap/v2/build/route.ts`
4. `src/db/repositories/dreamMapV2Repo.ts`
5. `src/domain/dreammap/buildDreamMapV2.ts`
6. `src/domain/dreammap/types_v2.ts`
- Patch needed first:
  - confirm no operational callers outside repo (monitoring/automation/manual API usage).
- Evidence: current in-repo callers are disabled dream-map components (`components/dreammap/DreamMapLayout*.tsx`).
- Confidence: Medium.

7. `app/api/admin/dreammap/backfill/route.ts` dream-map branch (`missing_dreammap`) and then full route
8. `src/orchestration/jobs/jobBuildDreamMapV0.ts`
9. `src/db/repositories/dreamMapRepo.ts`
10. `src/domain/dreammap/buildDreamMapV0.ts`
11. `src/domain/dreammap/axis/*`
12. `src/domain/dreammap/types.ts`
- Patch needed first:
  - split `missing_archetype` flow off the dream-map admin route because it is currently multiplexed (`app/api/admin/dreammap/backfill/route.ts:62`, `:71-99`).
  - decouple `archetypeRepo` from dream-map type import (`src/db/repositories/archetypeRepo.ts:4`).
- Confidence: High.

13. `src/orchestration/idempotency/jobKey.ts` (`build_dream_map_v0` union entry)
- Patch needed first:
  - remove only after `jobBuildDreamMapV0` callers are removed.
- Confidence: High.

### KEEP TEMPORARILY

1. `src/orchestration/jobs/jobBackfillArchetype.ts`
- Reason:
  - currently supports `missing_archetype` admin behavior and is still invoked by admin route (`app/api/admin/dreammap/backfill/route.ts:88-97`).
- Confidence: High.

2. `src/db/repositories/archetypeQueueRepo.ts`
3. `src/db/repositories/archetypeRepo.ts`
4. shared `eventRepo`, `jobRepo`, `glossaryRepo`, `latestRepo`, shared hash utilities
- Reason:
  - shared infrastructure and/or non-dream-map domains.
- Confidence: High.

5. `src/db/repositories/__tests__/archetypeQueueRepo.test.ts`
- Reason:
  - validates shared archetype queue behavior; not dream-map-only despite source default evidence.
- Confidence: Medium.

### UNCLEAR

1. External direct callers to `/api/dreammap/*` or `/api/admin/dreammap/backfill`
- In-repo UI entrypoints are disabled, but external/manual tooling usage is not provable from code search.
- Confidence: Low.

2. Long-term fate of `jobBackfillArchetypeMissing` once dream-map artifacts are removed
- It currently reads dream-map latest payloads (`src/orchestration/jobs/jobBackfillArchetype.ts:73-77`).
- Requires owner decision/redesign direction for archetype remediation source.
- Confidence: Medium.

## Dangerous Removal Risks

1. Deleting `app/api/admin/dreammap/backfill/route.ts` immediately can drop current `missing_archetype` maintenance path (`app/api/admin/dreammap/backfill/route.ts:71-99`).
2. Deleting `src/domain/dreammap/types.ts` before patching `archetypeRepo` breaks archetype repo typing (`src/db/repositories/archetypeRepo.ts:4`).
3. Deleting `archetypeQueueRepo` or queue table usage as part of dream-map cleanup risks breaking admin archetype queue workflows (`src/db/repositories/archetypeQueueRepo.ts:58-118`; `app/api/admin/archetypes/queue/*`).
4. Treating glossary/highlight tables as dream-map-only would create cross-feature regressions.
5. Mixing runtime deletion with schema deletion risks migration/runtime drift.

## Recommended Cleanup Sequence

### Slice 1

- `CLEANUP (small) — Remove orphan dream-map UI component tree and dream-map-only tests`
- Scope:
  - delete `components/dreammap/*`
  - delete `src/orchestration/jobs/jobBuildDreamMapV0.test.ts`
  - delete `src/domain/dreammap/buildDreamMapV0.test.ts`
- Why first:
  - no active route/UI callers; lowest shared-infra risk.

### Slice 2

- `CLEANUP/BUILD (small) — Split archetype backfill out of dream-map admin route`
- Scope:
  - create/move `missing_archetype` flow to archetype-owned admin route.
  - keep behavior same, remove coupling to dream-map route namespace.
- Why second:
  - unlocks safe removal of `app/api/admin/dreammap/backfill/route.ts` and v0 dream-map job path.

### Slice 3

- `CLEANUP (controlled) — Remove dream-map runtime APIs/jobs/repos/domain`
- Scope:
  - remove `/api/dreammap/*`
  - remove dream-map branch/route under `/api/admin/dreammap/backfill`
  - remove `jobBuildDreamMapV0`, `dreamMapRepo`, v0/v2 domain builders/types/axis
  - patch `archetypeRepo` type dependency away from dream-map types
  - remove `build_dream_map_v0` from `jobKey.ts`
- Why third:
  - after shared-coupling split, this becomes isolated runtime deletion.

## DB Cleanup Boundary

Runtime cleanup (this audit + upcoming cleanup slices):
- remove unreachable routes/APIs/jobs/repos/domain/tests and callers.

Schema cleanup (later, explicit owner-approved plan):
- `dream_map_versions`, `dream_map_latest`, `dream_map_v2_versions`, `dream_map_v2_latest`
- evaluate dream-map-specific columns/values in shared tables (e.g., queue source/version references)
- no migration execution during runtime cleanup tickets.

## Validation Requirements

1. After each slice: `npm run typecheck` and `npm run lint` (or escalated equivalents if sandbox blocks).
2. Route checks after API removals:
   - removed dream-map endpoints return expected 404/absence.
3. Core alpha flow smoke:
   - `/new`, `/session/[id]`, `/archive`, frame/direction/work unaffected.
4. Admin smoke:
   - archetype admin queue workflows remain functional.
5. Grep checks:
   - no residual imports of removed dream-map modules.

## Recommended Next BUILD/CLEANUP Ticket

`CLEANUP (small) — Remove orphan dream-map UI component tree and dream-map-only tests`

Rationale:
- smallest safe deletion set,
- no core/shared runtime dependencies,
- directly reduces dead dream-map surface before API/job/repo removal.
