# Dream Map Removal Plan

## Purpose

Define a safe, staged plan to remove dream-map functionality from active runtime and product surfaces for alpha, with evidence-based scope boundaries and explicit validation gates.

## Owner Decision

Dream map should not remain as an alpha sidecar and should be removed from the active system as much as safely possible.

Rationale:
- not part of alpha core flow,
- adds runtime/domain/database coupling,
- currently low product value for alpha.

## Removal Principle

- Remove dream-map surfaces in runtime-first slices, not broad deletion.
- Decouple from core ensure before deleting APIs/UI/domain code.
- Separate runtime removal from DB cleanup; DB changes happen later.
- Protect broader systems unless proven dream-map-only:
  - highlights,
  - glossary,
  - archetype tables/services,
  - anchors/index/latent/frame/core flow.
- If evidence is insufficient, classify `UNCLEAR`.

## Inventory

### Routes / Pages

| Item | Classification | Evidence | Confidence |
|---|---|---|---|
| `/dreammap` page (`app/dreammap/page.tsx`) | REMOVE AFTER DECOUPLE | page imports `DreamMapLayout`/`DreamMapLayoutV2` (`app/dreammap/page.tsx:3-4`) | High |
| `/admin/dreammap/backfill` page (`app/admin/dreammap/backfill/page.tsx`) | REMOVE AFTER DECOUPLE | admin UI fetches `/api/admin/dreammap/backfill` (`app/admin/dreammap/backfill/page.tsx:137`) | High |
| Admin dashboard link to backfill | REMOVE AFTER DECOUPLE | `Link href="/admin/dreammap/backfill"` (`app/admin/page.tsx:97`) | High |
| Direct user navigation links to `/dreammap` outside route itself | UNCLEAR | no `href="/dreammap"` matches found in `app`/`components` search; route still directly reachable | Medium |

### API Endpoints

| Item | Classification | Evidence | Confidence |
|---|---|---|---|
| `GET /api/dreammap/aggregate` (`app/api/dreammap/aggregate/route.ts`) | REMOVE AFTER DECOUPLE | used by `DreamMapLayout` fetch (`components/dreammap/DreamMapLayout.tsx:87`); reads `dream_map_latest`/`dream_map_versions` (`app/api/dreammap/aggregate/route.ts:322`, `:352`) | High |
| `POST /api/dreammap/v2/build` (`app/api/dreammap/v2/build/route.ts`) | REMOVE AFTER DECOUPLE | used by `DreamMapLayoutV2` (`components/dreammap/DreamMapLayoutV2.tsx:54`); writes via `dreamMapV2Repo` (`app/api/dreammap/v2/build/route.ts:5`, `:111`, `:119`) | High |
| `GET /api/dreammap/v2/aggregate` (`app/api/dreammap/v2/aggregate/route.ts`) | REMOVE AFTER DECOUPLE | used by `DreamMapLayoutV2` (`components/dreammap/DreamMapLayoutV2.tsx:38`); reads via `fetchDreamMapV2Latest` (`app/api/dreammap/v2/aggregate/route.ts:4`, `:43`) | High |
| `POST /api/admin/dreammap/backfill` (`app/api/admin/dreammap/backfill/route.ts`) | REMOVE AFTER DECOUPLE | admin-only backfill route; invokes dream-map jobs (`app/api/admin/dreammap/backfill/route.ts:6-7`, `:196`) | High |
| Dream-map coupling in `/api/session/ensure` | REMOVE NOW (decouple slice) | imports + executes `jobBuildDreamMapV0` and `fetchDreamMapLatest` (`app/api/session/ensure/route.ts:11`, `:20`, `:307-321`) | High |

### Jobs / Orchestration

| Item | Classification | Evidence | Confidence |
|---|---|---|---|
| `jobBuildDreamMapV0` (`src/orchestration/jobs/jobBuildDreamMapV0.ts`) | REMOVE AFTER DECOUPLE | called by ensure and admin backfill (`app/api/session/ensure/route.ts:308`, `app/api/admin/dreammap/backfill/route.ts:196`) | High |
| Dream-map branch inside ensure run profile | REMOVE NOW (decouple slice) | `runDreamMap` default true for non-guest (`app/api/session/ensure/route.ts:95`) | High |
| `jobBackfillArchetypeMissing` dream-map dependency path (`src/orchestration/jobs/jobBackfillArchetype.ts`) | REMOVE AFTER DECOUPLE | pulls `listDreamMapLatestWithPayload` and reruns `jobBuildDreamMapV0` (`src/orchestration/jobs/jobBackfillArchetype.ts:4`, `:6`, `:110`) | High |
| `build_dream_map_v0` idempotency key type in `jobKey` | REMOVE AFTER DECOUPLE | key union includes `"build_dream_map_v0"` (`src/orchestration/idempotency/jobKey.ts:6`) | High |

### Repositories / Services

| Item | Classification | Evidence | Confidence |
|---|---|---|---|
| `src/db/repositories/dreamMapRepo.ts` | REMOVE AFTER DECOUPLE | imported by ensure + dream-map jobs/backfill (`app/api/session/ensure/route.ts:20`, `src/orchestration/jobs/jobBuildDreamMapV0.ts:14`, `src/orchestration/jobs/jobBackfillArchetype.ts:4`) | High |
| `src/db/repositories/dreamMapV2Repo.ts` | REMOVE AFTER DECOUPLE | imported by `/api/dreammap/v2/build` + `/api/dreammap/v2/aggregate` (`app/api/dreammap/v2/build/route.ts:5`, `app/api/dreammap/v2/aggregate/route.ts:4`) | High |
| `src/db/repositories/archetypeQueueRepo.ts` dream-map queue writes | UNCLEAR | `source` defaults `dream_map_canonicalizer`, includes `dream_map_version_id` (`src/db/repositories/archetypeQueueRepo.ts:52-53`), but table also used by non-dream-map admin archetype flows | Medium |
| `src/db/repositories/archetypeRepo.ts` dream-map type coupling | UNCLEAR | imports dream-map type (`src/db/repositories/archetypeRepo.ts:4`), but archetype domain is broader than dream-map | Medium |
| `src/domain/dreammap/*` (v0 + v2 + axis + types) | REMOVE AFTER DECOUPLE | called by dream-map APIs/jobs/layout types (`src/orchestration/jobs/jobBuildDreamMapV0.ts:15`, `app/api/dreammap/v2/build/route.ts:6`, `components/dreammap/*`) | High |
| `components/dreammap/*` | REMOVE AFTER DECOUPLE | used by `/dreammap` page and APIs (`app/dreammap/page.tsx:3-4`, `components/dreammap/DreamMapLayout*.tsx`) | High |

### DB Tables

| Table | Classification | Evidence | Confidence |
|---|---|---|---|
| `dream_map_versions` | DB CLEANUP LATER | read/write in `dreamMapRepo`, aggregate API, ensure sidecar via job (`src/db/repositories/dreamMapRepo.ts:9`, `:197`; `app/api/dreammap/aggregate/route.ts:352`) | High |
| `dream_map_latest` | DB CLEANUP LATER | pointer table in repo + aggregate + admin backfill join (`src/db/repositories/dreamMapRepo.ts:97`, `:171`; `app/api/admin/dreammap/backfill/route.ts:118`, `:125`) | High |
| `dream_map_v2_versions` | DB CLEANUP LATER | v2 repo writes/reads (`src/db/repositories/dreamMapV2Repo.ts:9`, `:85`) | High |
| `dream_map_v2_latest` | DB CLEANUP LATER | v2 repo pointer reads/writes (`src/db/repositories/dreamMapV2Repo.ts:59`, `:77`) | High |
| `archetype_term_queue` | UNCLEAR | written by dream-map canonicalizer queue path (`src/orchestration/jobs/jobBuildDreamMapV0.ts:294`, `src/db/repositories/archetypeQueueRepo.ts:58`), but also managed by admin archetype APIs | Medium |
| `archetype_terms` | UNCLEAR | read by dream-map v0/v2 logic (`src/orchestration/jobs/jobBuildDreamMapV0.ts:87`, `app/api/dreammap/v2/build/route.ts:4`), but used by broader archetype workflows | Medium |
| `dream_session_highlights` | UNCLEAR | read by `jobBuildDreamMapV0` (`src/orchestration/jobs/jobBuildDreamMapV0.ts:105`), but highlights are not dream-map-only | Medium |
| `dream_entry_highlights` | UNCLEAR | used by dream-map v0/v2 (`src/orchestration/jobs/jobBuildDreamMapV0.ts:161`, `app/api/dreammap/v2/build/route.ts:70`) and non-dream-map highlight flows | Medium |
| `glossary_terms`, `glossary_occurrences` | UNCLEAR | used by dream-map v0/v2 but also by glossary product/runtime (`app/api/dreammap/v2/build/route.ts:18`, `:66`) | Medium |
| `domain_jobs`, `domain_events` dream-map rows | DB CLEANUP LATER | dream-map jobs/events write these shared tables (`src/orchestration/jobs/jobBuildDreamMapV0.ts:417`; `app/api/admin/dreammap/backfill/route.ts:190`) | Medium |

### Migrations / SQL

| Migration | Classification | Evidence | Confidence |
|---|---|---|---|
| `supabase/migrations/20260130_0001_dream_map_v0.sql` | DB CLEANUP LATER | creates `dream_map_versions` and `dream_map_latest` | High |
| `supabase/migrations/20260209_0001_dream_map_v2.sql` | DB CLEANUP LATER | creates `dream_map_v2_versions` and `dream_map_v2_latest` | High |
| `supabase/migrations/20260202_0001_archetype_terms.sql` | UNCLEAR | creates `archetype_terms` and `archetype_term_queue`; shared archetype domain | Medium |
| `supabase/migrations/20260203_0001_archetype_queue_extend.sql` | UNCLEAR | extends `archetype_term_queue` with `dream_map_version_id` and queue semantics | Medium |
| `supabase/migrations/20260204_0001_admin_backfill_rls.sql` (dream-map/archetype policies) | DB CLEANUP LATER | admin policy surfaces for dream-map and queue tables | High |

### UI Navigation / Links

| Item | Classification | Evidence | Confidence |
|---|---|---|---|
| Admin dashboard button to dream-map backfill | REMOVE AFTER DECOUPLE | `Link href="/admin/dreammap/backfill"` (`app/admin/page.tsx:97`) | High |
| User-facing menu/nav link to `/dreammap` | UNCLEAR | no direct link found by repo search; route still exists as direct URL | Medium |
| `/dreammap` page client fetch dependencies | REMOVE AFTER DECOUPLE | calls `/api/dreammap/aggregate` and v2 APIs (`components/dreammap/DreamMapLayout.tsx:87`, `DreamMapLayoutV2.tsx:38`, `:54`) | High |

### Imports / Callers

| Symbol / Module | Classification | Evidence | Confidence |
|---|---|---|---|
| `jobBuildDreamMapV0` callers | REMOVE AFTER DECOUPLE | ensure (`app/api/session/ensure/route.ts:11`, `:308`), admin backfill route (`app/api/admin/dreammap/backfill/route.ts:6`, `:196`), archetype backfill job (`src/orchestration/jobs/jobBackfillArchetype.ts:6`, `:110`) | High |
| `dreamMapRepo` callers | REMOVE AFTER DECOUPLE | ensure (`app/api/session/ensure/route.ts:20`, `:315`), dream-map job (`src/orchestration/jobs/jobBuildDreamMapV0.ts:14`), backfill job (`src/orchestration/jobs/jobBackfillArchetype.ts:4`) | High |
| `dreamMapV2Repo` callers | REMOVE AFTER DECOUPLE | `/api/dreammap/v2/build` and `/api/dreammap/v2/aggregate` | High |
| `src/domain/dreammap/*` callers | REMOVE AFTER DECOUPLE | jobBuildDreamMapV0, v2 build route, dreammap components type imports | High |
| `archetypeRepo` dream-map type import | UNCLEAR | imports `DreamMapArchetypeDomain` (`src/db/repositories/archetypeRepo.ts:4`) | Medium |

### Tests

| Test Surface | Classification | Evidence | Confidence |
|---|---|---|---|
| `src/orchestration/jobs/jobBuildDreamMapV0.test.ts` | REMOVE AFTER DECOUPLE | dream-map v0 job determinism/queue tests | High |
| `src/domain/dreammap/buildDreamMapV0.test.ts` | REMOVE AFTER DECOUPLE | v0 map builder tests | High |
| `src/db/repositories/__tests__/archetypeQueueRepo.test.ts` | UNCLEAR | includes `dream_map_version_id`/`dream_map_canonicalizer`, but queue may survive for non-dream-map archetype workflow | Medium |

### Docs / Specs

| Doc | Classification | Evidence | Confidence |
|---|---|---|---|
| `docs/plans/ensure-decoupling-contract.md` | DOCS ONLY | currently defines dream-map as deferred sidecar and first decouple slice | High |
| `docs/audits/alpha-runtime-truth-matrix.md` | DOCS ONLY | explicitly marks dream-map as deferred but coupled from ensure | High |
| `docs/audits/alpha-reset-scope-plan.md` | DOCS ONLY | lists dreammap routes/tables as deferred | High |
| `docs/audits/runtime-current-flow-audit.md` | DOCS ONLY | records ensure dream-map coupling risk | High |
| legacy superpowers dreammap references (`docs/superpowers/*`) | DOCS ONLY | historical audits/plans/spec references include dreammap | Medium |

## Couplings To Watch

1. Core ensure coupling:
   - `jobBuildDreamMapV0` and `fetchDreamMapLatest` are executed/fallbacked in `session.ensure`.
2. Archetype coupling:
   - dream-map canonicalizer writes `archetype_term_queue`; admin archetype flows consume queue.
3. Highlight/glossary coupling:
   - dream-map jobs and v2 build read highlights/glossary data that are also used outside dream-map.
4. Guest/admin coupling:
   - dream-map routes check `user_flags`; admin backfill uses admin allowlist and shared domain events.
5. Shared observability/idempotency:
   - dream-map jobs populate shared `domain_jobs`/`domain_events`.

## Recommended Removal Sequence

### Phase 1 — Runtime decouple from core ensure

- Objective:
  - remove dream-map from active core ensure execution path without deleting files.
- Scope:
  - stop default dream-map job execution in `/api/session/ensure`,
  - preserve response shape compatibility short-term if needed.
- Classification target:
  - ensure dream-map coupling: `REMOVE NOW`.
- Validation after phase:
  - full core flow manual validation (`new -> ensure -> frame -> direction -> work -> answer -> revisit`),
  - verify no dependency on `dream_map_version_id` in core pages/APIs.

### Phase 2 — Remove user-facing surfaces

- Objective:
  - remove dream-map page and admin backfill UI entrypoints.
- Scope:
  - `/dreammap` page,
  - `/admin/dreammap/backfill` page,
  - admin index link to dream-map backfill.
- Classification target:
  - page/link surfaces: `REMOVE AFTER DECOUPLE`.
- Validation after phase:
  - navigation sanity check for admin/user shells,
  - confirm no broken links to removed dream-map routes.

### Phase 3 — Remove API/job/repo code

- Objective:
  - remove dream-map API layer and execution paths after UI and ensure decouple.
- Scope:
  - `/api/dreammap/aggregate`,
  - `/api/dreammap/v2/build`,
  - `/api/dreammap/v2/aggregate`,
  - `/api/admin/dreammap/backfill`,
  - `jobBuildDreamMapV0`, dream-map-only parts of `jobBackfillArchetype`,
  - `dreamMapRepo`, `dreamMapV2Repo`, `src/domain/dreammap/*`, `components/dreammap/*`, dream-map-only tests.
- Classification target:
  - `REMOVE AFTER DECOUPLE`.
- Validation after phase:
  - route smoke checks (404/removed endpoints as expected),
  - typecheck/lint/tests in environment where tooling runs,
  - grep check confirms no remaining runtime imports of removed modules.

### Phase 4 — DB/schema cleanup plan

- Objective:
  - design schema cleanup only after runtime code no longer references dream-map tables.
- Scope:
  - drop/archive `dream_map_versions`, `dream_map_latest`, `dream_map_v2_versions`, `dream_map_v2_latest`,
  - evaluate `archetype_term_queue`/`archetype_terms` with archetype owner decision.
- Classification target:
  - dream-map tables: `DB CLEANUP LATER`,
  - archetype queue/terms: `UNCLEAR`.
- Validation after phase:
  - DB truth audit update and migration plan review,
  - explicit owner approval before execution.

### Phase 5 — Documentation cleanup

- Objective:
  - update docs/specs/audits to remove active dream-map references and record removal.
- Scope:
  - stabilization docs, alpha audits/plans, route maps, any user-facing docs.
- Classification target:
  - `DOCS ONLY`.
- Validation after phase:
  - doc consistency pass (no outdated “active dream-map” claims).

## What Must Not Be Removed Yet

- Highlights system outside dream-map surfaces.
- Glossary system outside dream-map surfaces.
- Archetype tables/services unless proven dream-map-only.
- Anchors/session index/latent/frame systems.
- Core alpha flow routes and APIs.
- Summary page scope (unless separately approved by owner).
- Shared `domain_jobs`/`domain_events` infra used by non-dream-map jobs.

## Validation Plan

1. After each phase, run targeted route/API smoke checks for changed surfaces.
2. After Phase 1 and any runtime-affecting phase, run manual core flow validation end-to-end.
3. Before deleting modules, run caller/import grep to prove no active references remain.
4. Before DB cleanup planning execution, run a table-truth check against runtime code.
5. Keep rollback points per phase:
   - Phase 1 rollback: re-enable ensure dream-map path,
   - Phase 2 rollback: restore routes/links only,
   - Phase 3 rollback: restore deleted modules plus callers.

## Owner Decisions Needed

1. Keep `archetype_term_queue` as independent archetype workflow infrastructure, or remove with dream-map?
2. Keep `dream_map_v2*` surfaces at all during transition, or remove together with v0 surfaces?
3. Should ensure response continue to include `dream_map_version_id` as nullable compatibility field during transition?
4. Should admin archetype backfill flow be redesigned before removing dream-map backfill dependencies?

## Risks

- Hidden callers risk for dream-map v2 surfaces if direct URL/API usage exists outside tracked components.
- Removing dream-map canonicalizer path may affect archetype queue volume/quality.
- Over-aggressive DB cleanup could break non-dream-map archetype/highlight/glossary features.
- Removing admin backfill route before archetype backfill replacement can reduce operational tooling.

## Recommended First Cleanup Ticket

`BUILD (controlled) — Decouple Dream Map From /api/session/ensure Default Runtime`

Small/safe scope:
- remove dream-map default execution from ensure core path,
- keep all non-dream-map behavior unchanged,
- run full core-flow manual validation immediately after.
