# Lumira Engine v0 ? Readiness Audit Report

Date: 2026-01-18
Repo: c:\\mira

## 1) Implement?lt route-ok (app/api/**/route.ts)

- `app/api/index-session/route.ts` ? Dream index + embedding.
  - DB: READ `dream_sessions.raw_dream_text`; READ/WRITE `dream_session_summaries` (`anchor_summary`, `embedding`).
- `app/api/work-block/next/route.ts` ? Next work step generation + logging.
  - DB: READ `dream_observation`, `dream_observation_events`, `work_blocks` (recent), `dream_session_summaries` (latent/log), `work_question_ledger`.
  - DB: WRITE `work_question_ledger`; RPC `append_latent_log_event` (updates `dream_session_summaries.latent_analysis_log`).
- `app/api/frame/route.ts` ? Frame generation + summary persistence.
  - DB: READ `dream_sessions` (`raw_dream_text`), `dream_session_summaries`, `dream_observation`.
  - DB: WRITE `dream_sessions` (`ai_framing_text`, `ai_framing_audit`, `status`), UPSERT `dream_session_summaries`.
- `app/api/frame/ensure/route.ts` ? Ensure latent + frame from material snapshot.
  - DB: READ `dream_sessions`, `dream_entries`, `dream_answers`, `user_prefs`.
  - DB: WRITE `material_snapshots`, `domain_events`.
  - Jobs: `jobUpdateLatent` (writes `latent_versions` + `latent_latest`), `jobGenerateFrame` (writes `frame_versions` + `frame_latest`).
- `app/api/synthesize/route.ts` ? Latent synthesis.
  - DB: READ `dream_observation`, `dream_sessions.raw_dream_text`.
  - DB: UPSERT `dream_session_summaries` (`latent_analysis`), INSERT `dream_observation_events`.
- `app/api/anchors/rank/route.ts` ? Anchor ranking.
  - DB: READ `dream_session_summaries.latent_analysis`; READ `dream_glossary_items` via `rankAnchors`.
- `app/api/session/bootstrap/route.ts` ? Bootstrap pipeline.
  - DB: READ `dream_sessions.raw_dream_text`.
  - Calls `/api/observe`, `/api/synthesize`, `/api/frame`, `/api/index-session`.
- `app/api/session/submit/route.ts` ? Create session + entry + observe/index.
  - DB: WRITE `dream_sessions`, `dream_entries`.
  - DB: READ `dream_entries`, `dream_answers`, `user_prefs`.
  - DB: WRITE `material_snapshots`, `domain_events`.
  - Jobs: `jobExtractObservation` (writes `observation_versions` + `observation_latest`), `jobBuildSessionIndexFromObservation` (writes `session_index_versions` + `session_index_latest`).
- `app/api/observe/route.ts` ? Observation extract + write.
  - DB: READ `dream_sessions.raw_dream_text`; READ/UPSERT `dream_observation`; INSERT `dream_observation_events`.
- `app/api/session/ensure/route.ts` ? Ensure observe/index/latent/frame.
  - DB: READ `dream_sessions`, `dream_entries`, `dream_answers`, `user_prefs`.
  - DB: WRITE `material_snapshots`, `domain_events`.
  - Jobs: `jobExtractObservation`, `jobBuildSessionIndexFromObservation`, `jobUpdateLatent`, `jobGenerateFrame`.
  - Fallback READ `*_latest`.

## 2) V0 domain modulok ?llapota

Legend: Domain module = src/lib/** or src/domain/**; Job = src/orchestration/jobs/**; UI store read = UI reads *_latest or *_versions.

- Session
  - Domain module: none (no dedicated session module).
  - Orchestration job: via `/api/session/submit`, `/api/session/ensure`.
  - UI store read: `dream_sessions` is read in multiple pages; no dedicated v0 store accessor.
- Observe
  - Domain module: `src/lib/dream/observation.ts`, `src/lib/dream/observationServer.ts`.
  - Job: `src/orchestration/jobs/jobExtractObservation.ts` (writes `observation_versions` + `observation_latest`).
  - UI store read: no UI read from `observation_latest` (current reads `dream_observation` in API routes).
- Latent
  - Domain module: `src/domain/latent/updateLatentFromMaterial.ts`, `src/domain/latent/normalizeLatentPayload.ts`.
  - Job: `src/orchestration/jobs/jobUpdateLatent.ts` (writes `latent_versions` + `latent_latest`).
  - UI store read: yes (`app/session/[id]/(flow)/frame/page.tsx`, `.../direction/page.tsx` read `latent_latest`).
- Anchors
  - Domain module: `src/lib/dream/anchorRanking.ts`, `src/lib/dream/anchorKey.ts`, `src/lib/dream/anchorsFromObservation.ts`.
  - Job: none for `anchor_versions`/`anchor_latest`.
  - UI store read: no `anchor_latest` usage.
- Safety
  - Domain module: embedded in `src/lib/dream/observation.ts` + `app/api/work-block/next/route.ts` rules.
  - Job: none.
  - UI store read: none.
- Directions
  - Domain module: `src/domain/directions/recommendDirectionsFromLatent.ts`.
  - Job: `jobGenerateFrame` uses it.
  - UI store read: `direction_catalog` (legacy-kept) via `CatalogService`; selection uses `session_directions`.
- Work
  - Domain module: no dedicated v0 module; logic in `app/api/work-block/next/route.ts` + UI.
  - Job: none for `work_versions`.
  - UI store read: `app/session/[id]/(flow)/work/page.tsx` reads `work_versions` + `work_latest` + `dream_answers`.
- Memory
  - Domain module: `src/lib/dream/anchorRanking.ts` (currently reads `dream_glossary_items`).
  - Job: none for glossary_terms/occurrences/notes.
  - UI store read: glossary UI reads `dream_glossary_items` (legacy).

## 3) Legacy bindings (non?v0 tables)

Canonical v0 tables: `dream_sessions`, `dream_entries`, `dream_answers`, `*_versions`, `*_latest`, `domain_events`, `domain_jobs`, `material_snapshots`, `glossary_*`, `term_candidates`, `user_prefs`, `user_behavior_stats`, `session_directions`, `session_index_*`.

All Supabase queries below hit non?v0 tables.

### dream_session_summaries (legacy)
Suggested v0 targets: `frame_latest` (title/framing/recs), `latent_latest` (latent_analysis), `session_index_versions` (anchor_summary/embedding).
- `components/SidebarDrawer.tsx:96`
- `app/session/[id]/summary/page.tsx:140`, `app/session/[id]/summary/page.tsx:210`
- `app/session/[id]/(flow)/frame/page.tsx:144`
- `app/session/[id]/(flow)/FlowShellClient.tsx:152`, `app/session/[id]/(flow)/FlowShellClient.tsx:175`
- `app/session/[id]/(flow)/FlowLeftPanel.tsx:51`, `app/session/[id]/(flow)/FlowLeftPanel.tsx:74`
- `app/session/[id]/(flow)/direction/page.tsx:187`
- `src/lib/archive.ts:115` (nested `dream_session_summaries`)
- `app/api/frame/route.ts:574`, `:626`, `:689`, `:755`, `:891`
- `app/api/index-session/route.ts:91`, `:120`, `:197`
- `app/api/work-block/next/route.ts:647`
- `app/api/synthesize/route.ts:415`, `:465`
- `app/api/anchors/rank/route.ts:57`

### work_blocks (legacy)
Suggested v0 targets: `work_versions` + `work_latest` + `dream_answers`.
- `app/session/[id]/summary/page.tsx:151`
- `app/session/[id]/page.tsx:45`
- `src/lib/archive.ts:135`
- `app/api/work-block/next/route.ts:575`

### dream_observation (legacy)
Suggested v0 targets: `observation_latest` -> `observation_versions`.
- `src/lib/dream/observationServer.ts:10`
- `app/api/work-block/next/route.ts:525`
- `app/api/frame/route.ts:589`
- `app/api/synthesize/route.ts:359`
- `app/api/observe/route.ts:224`, `:261`, `:348`

### dream_observation_events (legacy)
Suggested v0 targets: `domain_events` or a v0 observation-events table.
- `app/api/work-block/next/route.ts:546`
- `app/api/synthesize/route.ts:434`
- `app/api/observe/route.ts:133`

### dream_glossary_items (legacy)
Suggested v0 targets: `glossary_terms`, `glossary_occurrences`, `glossary_notes`, `term_candidates`.
- `components/SidebarDrawer.tsx:45`
- `app/glossary/suggestions/page.tsx:55`, `:125`, `:147`
- `app/glossary/page.tsx:133`, `:150`, `:194`, `:242`, `:265`
- `src/lib/dream/anchorRanking.ts:210`

### direction_catalog (legacy?kept)
Suggested v0 target: none (allowed legacy).
- `src/db/repositories/catalogRepo.ts:28`, `:50`
- `src/lib/archive.ts:166`

### evening_card_catalog / evening_card_usage_log (legacy?kept)
Suggested v0 target: none (allowed legacy).
- `app/evening/run/[slug]/page.tsx:33`, `:67`
- `app/evening/page.tsx:213`, `:388`

## 4) RLS?risk lista (user_id filter / authed client)

Potential risk = missing `user_id` filter or client?side Supabase relies purely on RLS.

- Client queries without user filter:
  - `components/DreamRawPanel.tsx:26` ? `dream_sessions` by `id` only.
  - `app/session/[id]/page.tsx:30` ? `dream_sessions` by `id` only; `work_blocks` by `session_id` only.
  - `app/session/[id]/summary/page.tsx:126`, `:138`, `:147` ? `dream_sessions`, `dream_session_summaries`, `work_blocks` by `session_id` only.
  - `app/session/[id]/(flow)/frame/page.tsx:106` ? `dream_sessions` by `id` only.
  - `app/session/[id]/(flow)/work/page.tsx:150` ? `dream_sessions` by `id` only.
- Server routes relying on session_id without user_id filters:
  - `app/api/session/submit/route.ts:55` ? `dream_entries`/`dream_answers` by `session_id` only.
  - `app/api/session/ensure/route.ts:57` ? `dream_entries`/`dream_answers` by `session_id` only.
  - `app/api/frame/ensure/route.ts:45` ? `dream_entries`/`dream_answers` by `session_id` only.
  - `app/api/work-block/next/route.ts:575` ? `work_blocks` by `session_id` only.

## 5) Top 10 blocking gap (v0 readiness)

1. `/api/work-block/next` uses legacy `dream_observation`, `dream_session_summaries`, and `work_blocks` as primary inputs; breaks when legacy tables are empty.
2. `/api/observe` writes to legacy `dream_observation` and `dream_observation_events` (no v0 observation store write).
3. `/api/synthesize` persists to `dream_session_summaries` (latent_analysis) instead of `latent_versions` + `latent_latest`.
4. `/api/frame` reads and writes `dream_session_summaries` (title/framing/recs) rather than `frame_latest` only.
5. `/api/index-session` writes `dream_session_summaries` (anchor_summary/embedding) rather than `session_index_versions`/`session_index_latest`.
6. UI still reads legacy summaries for titles and framing (FlowShell, FlowLeftPanel, frame page fallback).
7. Archive/session_hook flows still read legacy `work_blocks` and `dream_session_summaries` for progress/labels.
8. Glossary UI and anchor ranking use legacy `dream_glossary_items` instead of v0 glossary tables.
9. Work flow still depends on `dream_sessions.raw_dream_text` for prompts; v0 canonical raw text is in `dream_entries`.
10. No anchor pipeline for `anchor_versions`/`anchor_latest`; anchors remain derived from legacy observation/synth outputs.

---

Report prepared as read?only audit (no code changes).
