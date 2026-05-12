# Alpha Runtime Truth Matrix

## Purpose

Provide one evidence-based runtime map for the alpha core flow (`session -> observe -> frame -> direction -> work -> answer -> revisit`) before cleanup and DB simplification work.

## Scope

Included: auth/basic access, `/new`, `/session` + `/sessions` alias, `/session/[id]`, `/session/[id]/(flow)/frame`, `/session/[id]/(flow)/direction`, `/session/[id]/(flow)/work`, `/archive`, `/api/session/ensure`, `/api/frame/ensure`, `/api/frame`, `/api/session/bootstrap`, `/api/direction/select`, `/api/work-block/next`, `/api/work/answer`, `/api/session-summary` (currently active via summary page), and transitively touched DB/runtime layers.

Excluded unless coupled: dreammap product surfaces, glossary/highlights product surfaces, evening, image/background generation, admin backfills, non-core synth routes.

## Matrix Legend

- KEEP: Required for alpha core flow to work.
- SIMPLIFY: Currently active but likely reducible/mergeable after safe sequence.
- DEFER: Not required for alpha and should not block alpha.
- UNCLEAR: Evidence is insufficient for safe classification.
- DEFERRED BUT COUPLED: Not in alpha product scope, but currently touched by alpha runtime path.

## Core Flow Matrix

| Stage | User route/page | API endpoint | Job/service/repo | DB reads | DB writes | Status | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|
| Auth/basic access gate | `/new`, `/archive`, `/sessions`, `/session/:path*`, `/api/:path*` | N/A (middleware/session) | Next proxy + Supabase auth | auth cookie/session via `supabase.auth.getUser()` | session refresh cookie side effects | KEEP | `proxy.ts:26-34`, `proxy.ts:9-24`; API routes enforce auth (`app/api/session/ensure/route.ts:44-49`, `app/api/work/answer/route.ts:41-44`) | High |
| Create session + raw dream | `/new` | `POST /api/session/ensure` | page-side insert + ensure orchestrator | `dream_sessions` (ownership check), `dream_entries`, `dream_answers`, `user_prefs` | `dream_sessions`, `dream_entries`, then downstream ensure writes | KEEP | `app/new/NewClient.tsx:90`, `app/new/NewClient.tsx:99`, `app/new/NewClient.tsx:110`; ensure reads in `app/api/session/ensure/route.ts:101-128` | High |
| Observe/index/latent/frame orchestration | indirectly from `/new`, `/frame`, `/direction`, `/work` | `POST /api/session/ensure` | `jobExtractObservation`, `jobBuildSessionIndexFromObservationJob`, `jobUpdateLatent`, `ensureAnchorsRanked`, `jobGenerateFrame` | `dream_entries`, `dream_answers`, `user_prefs`, latest pointers and versions | `material_snapshots`, `domain_events`, `domain_jobs`, `observation_*`, `session_index_*`, `latent_*`, `dream_anchor_*`, `frame_*` | KEEP | Orchestration and run flags in `app/api/session/ensure/route.ts:7-12`, `:93-99`, `:204-336`; repo table usage in `src/db/repositories/*Repo.ts` (observation/sessionIndex/latent/frame/anchor/material/event/job) | High |
| Frame step UI | `/session/[id]/(flow)/frame` | `POST /api/frame/ensure` (delegates to ensure) | `fetchFrameLatestWithPayloadAndId`, `CatalogService`, `startDirection` | `frame_latest`, `frame_versions`, `direction_catalog` | none directly on page; direction selection writes later | KEEP | `app/session/[id]/(flow)/frame/page.tsx:17`, `:103-107`, `:146`; wrapper delegation `app/api/frame/ensure/route.ts:49-58` | High |
| Direction step UI + selection | `/session/[id]/(flow)/direction` | `POST /api/direction/select` (+ soft `POST /api/session/ensure` run.frame) | `CatalogService`, `fetchFrameLatestWithPayloadAndId`, `startDirection` | `session_directions`, `frame_latest/frame_versions`, `direction_catalog`, `dream_sessions` | `session_directions` insert | KEEP | Page reads/soft ensure `app/session/[id]/(flow)/direction/page.tsx:187-188`, `:208-212`; selector write path `app/api/direction/select/route.ts:34-52` | High |
| Work card generation | `/session/[id]/(flow)/work` | `POST /api/work-block/next` | selector/composer/safety/stop, `ensureAnchorsRanked`, latest/catalog/ledger repos | `dream_sessions`, `dream_entries`, `observation_*`, `latent_*`, `dream_anchor_*`, `direction_catalog`, `work_versions`, `work_latest`, `dream_answers`, `work_question_ledger` | `work_versions`, `work_latest` | KEEP | UI call `app/session/[id]/(flow)/work/page.tsx:226`; API table ops `app/api/work-block/next/route.ts:553`, `:298-309`, `:337-383`, `:827-930`; repo deps imported at `:4-28` | High |
| Save answer | `/session/[id]/(flow)/work` | `POST /api/work/answer` | answer handler + `insertLedgerEntry` | `dream_sessions`, `work_versions`, `dream_answers` | `dream_answers`, `work_question_ledger` | KEEP | UI call `app/session/[id]/(flow)/work/page.tsx:377`; API ops `app/api/work/answer/route.ts:63-104`, ledger `src/db/repositories/workQuestionLedgerRepo.ts:23-36` | High |
| Revisit session detail | `/session/[id]` | none (page reads directly) | page-side Supabase queries | `dream_sessions`, `dream_entries`, `frame_latest`, `frame_versions`, `work_versions`, `dream_answers` | none | KEEP | `app/session/[id]/page.tsx:46-97` | High |
| Minimal archive/session list | `/archive` and `/sessions` redirect | none (page reads directly) | `ArchiveClient` + `src/lib/archive.ts` | `dream_sessions`, `dream_entries`, `frame_latest`, `frame_versions`, `work_versions`, `dream_answers`, `direction_catalog` | none | KEEP | redirect `app/sessions/page.tsx:3-4`; archive reads `src/lib/archive.ts:107-188` | High |
| Summary API (currently used, not core happy-path) | `/session/[id]/summary` | `GET /api/session-summary` | summary aggregator + `CatalogService` + latest repos | `dream_sessions`, `dream_entries`, `frame_*`, `latent_*`, `work_versions`, `dream_answers`, `session_directions`, `direction_catalog` | none | SIMPLIFY | caller `app/session/[id]/summary/page.tsx:369`; API reads `app/api/session-summary/route.ts:57-90` | Medium |
| Legacy wrapper endpoint | no active UI caller found | `POST /api/frame` | wrapper to `/api/frame/ensure` | none itself | none itself | SIMPLIFY | Wrapper comment + delegate `app/api/frame/route.ts:3`, `:35`; no caller found except route file (`rg /api/frame`) | High |
| Legacy bootstrap endpoint | no active UI caller found | `POST /api/session/bootstrap` | wrapper to `/api/session/ensure` | none itself | none itself | SIMPLIFY | Delegate `app/api/session/bootstrap/route.ts:52`; no UI caller found (`rg /api/session/bootstrap`) | High |
| Dream map job inside core ensure | indirectly touched from core flow | transitively via `POST /api/session/ensure` | `jobBuildDreamMapV0` | `dream_entries`, `dream_entry_highlights`, `dream_session_highlights`, glossary/archetype sources, latest pointers | `dream_map_versions`, `dream_map_latest`, `archetype_term_queue` (best-effort enqueue) | DEFERRED BUT COUPLED | ensure invokes job `app/api/session/ensure/route.ts:308`; job DB usage `src/orchestration/jobs/jobBuildDreamMapV0.ts:105`, `:132`, `:161`, `:447-474` | High |
| Glossary/highlight indexing inside observation path | indirectly touched from core flow | transitively via `POST /api/session/ensure` | `indexGlossaryFromObservation` from observation job | `glossary_terms` | `term_candidates`, `glossary_occurrences` (best-effort) | DEFERRED BUT COUPLED | call in `src/orchestration/jobs/jobExtractObservation.ts:8`, `:68-81`; table ops in `src/domain/glossary/indexGlossaryFromObservation.ts:31-33`, `:54-66` | High |
| Guest flag branch in ensure | not user-visible in core flow UI, but active in orchestrator | `POST /api/session/ensure` | `user_flags` check controls run flags | `user_flags` | none in this route | UNCLEAR | `app/api/session/ensure/route.ts:78-81`, run toggles `:87-99`; migrations show policy for `user_flags` but no create-table in scanned set (`supabase/migrations/20260204_0001_admin_backfill_rls.sql:142-144`) | Medium |

## Required Alpha Runtime Chain

1. Authenticated user reaches guarded routes (`/new`, `/session/*`, `/archive`, `/api/*`).
2. `/new` inserts `dream_sessions` + `dream_entries` (raw dream), then calls `/api/session/ensure`.
3. `/api/session/ensure` must produce/refresh at least: observation, session index, latent, anchor ranking, frame (directly or via existing latest pointers).
4. `/session/[id]/(flow)/frame` reads frame latest payload and exposes recommended directions.
5. `/session/[id]/(flow)/direction` reads recommendations/catalog and persists selection via `/api/direction/select` into `session_directions`.
6. `/session/[id]/(flow)/work` requests next card via `/api/work-block/next`, which writes `work_versions` + `work_latest`.
7. `/api/work/answer` saves answer into `dream_answers` and records dedupe memory in `work_question_ledger`.
8. Revisit flows (`/session/[id]`, `/archive`) read existing session/frame/work/answer state.

## Wrapper / Duplicate Layers

- `/api/frame` delegates to `/api/frame/ensure`; active caller not found in current UI; safe simplification candidate later because it is wrapper-only (`app/api/frame/route.ts:3`, `:35`).
- `/api/frame/ensure` delegates to `/api/session/ensure` with run flags; active caller exists from frame page; likely keep for alpha then simplify when clients call ensure directly (`app/session/[id]/(flow)/frame/page.tsx:146`, `app/api/frame/ensure/route.ts:49-58`).
- `/api/session/bootstrap` delegates to `/api/session/ensure`; active caller not found; safe simplification candidate later (`app/api/session/bootstrap/route.ts:52`).

## Deferred But Coupled Areas

- Dream map build is executed by default in `/api/session/ensure` (`runDreamMap` default true for non-guest), so alpha core still touches dream-map tables/jobs (`app/api/session/ensure/route.ts:98`, `:308`).
- Observation job triggers glossary indexing best-effort, coupling alpha observe path to glossary tables (`src/orchestration/jobs/jobExtractObservation.ts:68-81`, `src/domain/glossary/indexGlossaryFromObservation.ts:31-66`).
- Work generation path can pull glossary context (`fetchGlossaryContext` import in `app/api/work-block/next/route.ts:24`), coupling work runtime to glossary domain logic even if UI feature is not core-alpha.
- Summary page/API couples highlight/glossary flows (`app/session/[id]/summary/page.tsx:471-543`, `:1158+`), so summary should be treated as non-core surface unless explicitly retained.

## Tables Required For Alpha

- `dream_sessions`
- `dream_entries`
- `dream_answers`
- `direction_catalog`
- `session_directions`
- `work_versions`
- `work_latest`
- `observation_versions`
- `observation_latest`
- `session_index_versions`
- `session_index_latest`
- `latent_versions`
- `latent_latest`
- `dream_anchor_versions`
- `dream_anchor_latest`
- `frame_versions`
- `frame_latest`
- `domain_jobs` (job idempotency/state; used by all core orchestration jobs)

## Tables Transitional For Alpha

- `material_snapshots` (best-effort logging in ensure; does not gate response success)
- `domain_events` (best-effort logging in ensure; does not gate response success)
- `work_question_ledger` (used for novelty/duplication behavior; useful but could be simplified later)
- `user_prefs` (read for material hash and model behavior; can fallback when missing)
- `/api/frame` and `/api/session/bootstrap` wrappers indicate API-layer transitional duplication

## Tables Deferred For Alpha

- `dream_map_versions`, `dream_map_latest`
- `dream_entry_highlights`, `dream_session_highlights`, `dream_session_rejected_suggestions`
- `glossary_terms`, `glossary_occurrences`, `glossary_notes`, `term_candidates`, `glossary_occurrence_events`
- `archetype_terms`, `archetype_term_queue`
- `dream_map_v2_versions`, `dream_map_v2_latest`
- image and evening related tables/routes (`image_jobs`, `image_style_presets`, evening catalog tables)
- legacy MVP tables not used by core runtime path (`dream_observation`, `dream_observation_events`, `work_blocks`, `morning_direction_choices`, `dream_session_summaries`, `dream_glossary_items`)

## Tables Unclear For Alpha

- `user_flags` (actively read by ensure and guest/auth routes, but creation migration is not evident in scanned migration set; only RLS/admin policy migration is evident)
- `domain_events` strict necessity (currently best-effort; safe removal impact depends on monitoring/debug expectations)
- `material_snapshots` strict necessity (currently best-effort; same monitoring/debug tradeoff)

## Risks

- Core ensure currently over-couples to deferred domains (dream map + glossary indexing), increasing alpha fragility even if those features are not user-critical.
- Wrapper endpoint duplication (`/api/frame`, `/api/frame/ensure`, `/api/session/bootstrap`) can hide true runtime entrypoints and raise cleanup risk.
- Direct page-level Supabase reads plus API-based orchestration means truth is split across multiple layers; cleanup can accidentally remove a table still read directly by UI.
- `user_flags` schema certainty gap is a migration/runtime consistency risk.

## Owner Decisions Needed

- Should alpha keep `dream_map` execution inside `/api/session/ensure`, or disable it for alpha and decouple now?
- Should glossary indexing from observation remain enabled during alpha, or be feature-flagged/deferred to reduce runtime coupling?
- Should `/session/[id]/summary` + `/api/session-summary` be in alpha scope, or explicitly deferred as non-core?
- Should `work_question_ledger` be considered required alpha behavior (anti-repeat quality) or optional complexity for post-alpha?
- Should `user_flags` be treated as required core schema item (and audited/fixed first) or removed from ensure guest branching for alpha?

## Recommended Next Tickets

1. `AUDIT/PLAN — Ensure De-coupling Contract`: define exact `session.ensure` run profile for alpha (core-required jobs only) and explicit deferred jobs.
2. `AUDIT — Table Truth vs Migrations`: resolve `user_flags` and other runtime-vs-DDL mismatches with a table-by-table manifest (no schema change yet).
3. `AUDIT/PLAN — Wrapper Collapse Sequence`: plan safe consolidation of `/api/frame`, `/api/frame/ensure`, `/api/session/bootstrap` onto one canonical entrypoint.
4. `BUILD (controlled) — Alpha Ensure Run-Flag Gate`: implement owner-approved decoupling flags for dream-map/glossary sidecars without touching core flow contracts.
5. `BUILD (controlled) — Alpha Manual Runtime Validation`: execute end-to-end manual checks for `session -> observe -> frame -> direction -> work -> answer -> revisit` after decoupling.
