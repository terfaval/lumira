# Runtime Current Flow Audit

## Purpose

Document the **current runtime behavior** of Lumira core flow and DB touchpoints based on code evidence, without proposing redesign or cleanup.

## Scope

- Runtime-focused mapping of `session -> observe -> frame -> direction -> work`
- Actual read/write paths in API routes, orchestration jobs, and repositories
- `*_latest` and `*_versions` usage patterns in current code
- Transitional/legacy dependency signals and unclear ownership areas
- No migration, no cleanup, no architecture change

## Core Runtime Flow

### Session
- routes
  - `/new`, `/sessions`, `/session/[id]` (from `ROUTE_MAP.md`)
- APIs
  - `app/api/session/submit/route.ts`
  - `app/api/session/bootstrap/route.ts`
  - `app/api/session/ensure/route.ts`
- repos/services
  - `src/db/repositories/materialRepo.ts`
  - `src/db/repositories/eventRepo.ts`
  - `src/lib/supabase/serverAuthed.ts`
- DB reads
  - `dream_entries`, `dream_answers`, `user_prefs` (material hash inputs)
  - `dream_sessions` ownership checks
  - `user_flags` guest mode check
- DB writes
  - `dream_sessions` insert
  - `dream_entries` insert
  - `material_snapshots` insert-if-missing
  - `domain_events` insert (`session.submitted`, `session.ensure_requested`)
- jobs
  - `jobExtractObservation`, `jobBuildSessionIndexFromObservationJob`, optional full ensure pipeline
- fallback paths
  - `session/bootstrap` delegates to `session/ensure` and returns raw downstream payload
  - `session/ensure` uses best-effort writes for snapshots/events (warnings on failure)
- observed runtime pattern
  - Session start persists minimal core entities first, then triggers enrichment pipeline via ensure/jobs.
- evidence
  - `app/api/session/submit/route.ts`
  - `app/api/session/bootstrap/route.ts`
  - `app/api/session/ensure/route.ts`
- confidence level
  - High

### Observe
- routes
  - Flow step under `/session/[id]` with observe data consumed indirectly by later steps
- APIs
  - `app/api/observe/route.ts`
  - indirectly via `app/api/session/ensure/route.ts` -> `jobExtractObservation`
- repos/services
  - `src/db/repositories/observationRepo.ts`
  - `src/db/repositories/latestRepo.ts`
  - `src/domain/observe/extractObservationFromEntries.ts`
- DB reads
  - `dream_entries` (raw/dictation/edit)
  - `user_prefs`
  - `observation_latest` + `observation_versions` for refresh/fallback
- DB writes
  - `observation_versions` insert-if-missing
  - `observation_latest` upsert (`latest_dream_id` for `dream_v1`, `latest_v0_id` for `v0`)
  - `domain_events` insert (`observation.extracted`)
  - glossary indexing side effects (best-effort)
- jobs
  - `jobExtractObservation` (v0 schema)
- fallback paths
  - `fetchObservationLatestV0WithPayloadAndId` falls back from `latest_v0_id` to `latest_dream_id` with adapter `adaptDreamObservationToV0`
  - micro observation fallback in direct `/api/observe`
- observed runtime pattern
  - Dual observation schema is active (`v0` and `dream_v1`), with runtime adapters bridging missing v0 pointer state.
- evidence
  - `app/api/observe/route.ts`
  - `src/db/repositories/observationRepo.ts`
  - `src/db/repositories/latestRepo.ts`
  - `src/orchestration/jobs/jobExtractObservation.ts`
- confidence level
  - High

### Frame
- routes
  - `/session/[id]/(flow)/frame`
- APIs
  - `app/api/frame/route.ts` (wrapper)
  - `app/api/frame/ensure/route.ts` (delegates)
  - `app/api/session/ensure/route.ts` (actual pipeline execution)
- repos/services
  - `src/db/repositories/frameRepo.ts`
  - `src/db/repositories/latestRepo.ts`
  - `src/orchestration/jobs/jobGenerateFrame.ts`
- DB reads
  - `frame_latest`, `frame_versions`
  - prerequisite latest reads: `observation_latest/versions`, `session_index_latest/versions`, `latent_latest/versions`
  - `dream_entries` latest raw/raw_entry for generation context
  - `domain_jobs` latest successful `generate_frame` for recommendation why fallback
- DB writes
  - `frame_versions` insert-if-missing
  - `frame_latest` upsert
  - `domain_jobs` begin/finish bookkeeping
- jobs
  - `jobGenerateFrame`
- fallback paths
  - if latent missing and fallback disabled: frame job returns `ok: false`
  - recommendation `why` text falls back to prior job output or catalog-derived one-liner
- observed runtime pattern
  - Frame is latest/version-based with strict dependency on observation+session_index and conditional dependency on latent.
- evidence
  - `app/api/frame/route.ts`
  - `app/api/frame/ensure/route.ts`
  - `app/api/session/ensure/route.ts`
  - `src/orchestration/jobs/jobGenerateFrame.ts`
  - `src/db/repositories/frameRepo.ts`
- confidence level
  - High

### Direction
- routes
  - `/session/[id]/(flow)/direction`
- APIs
  - `app/api/direction/select/route.ts`
- repos/services
  - direct Supabase access in route (no dedicated repo)
- DB reads
  - `dream_sessions` ownership check
  - `session_directions` dedupe check
- DB writes
  - `session_directions` insert (unique-constraint tolerant)
- jobs
  - none directly
- fallback paths
  - on unique violation (`23505`), route reports already selected
- observed runtime pattern
  - Direction selection is a separate persisted action, not only derived from frame suggestions.
- evidence
  - `app/api/direction/select/route.ts`
- confidence level
  - High

### Work
- routes
  - `/session/[id]/(flow)/work`
- APIs
  - `app/api/work-block/next/route.ts`
  - `app/api/work/persist/route.ts`
  - `app/api/work/answer/route.ts`
- repos/services
  - `src/db/repositories/latestRepo.ts`
  - `src/db/repositories/workQuestionLedgerRepo.ts`
  - `src/domain/work/*` (selector/composer/safety/stop)
- DB reads
  - `dream_sessions` ownership
  - latest context: observation(latest dream), latent latest, anchor latest, raw entry
  - `work_versions` recent blocks + idempotency checks + version increment
  - `dream_answers` recent answer and answer-to-work backreference
  - ledger history via `work_question_ledger`
- DB writes
  - `work_versions` insert
  - `work_latest` upsert
  - `dream_answers` insert (answer submission)
  - `work_question_ledger` insert (best-effort in answer route)
- jobs
  - no domain_jobs wrapper; synchronous route orchestration
- fallback paths
  - first question composer fallback if model compose fails
  - selector stop paths (`low_novelty`, `prefs_block_all`, `safety_limit`, `model_failure`)
  - idempotent replay via `input_hash`
- observed runtime pattern
  - Work generation uses mixed sources: latest pointers + direct history scans, then persists to work versions/latest.
- evidence
  - `app/api/work-block/next/route.ts`
  - `app/api/work/persist/route.ts`
  - `app/api/work/answer/route.ts`
- confidence level
  - Medium (see schema-field inconsistency risk below)

---

## Database Touchpoint Patterns

### latest/version patterns
- Strong active pattern in observation, session_index, latent, frame, work, dream_map, anchors:
  - pointer tables: `*_latest`
  - payload/version tables: `*_versions`
- Reads commonly follow pointer->version fetch (`latestRepo`, `dreamMapRepo`, work latest upsert flow).
- Writes commonly do insert-if-missing to versions + upsert latest pointer.
- confidence: High
- evidence:
  - `src/db/repositories/latestRepo.ts`
  - `src/db/repositories/observationRepo.ts`
  - `src/db/repositories/sessionIndexRepo.ts`
  - `src/db/repositories/latentRepo.ts`
  - `src/db/repositories/frameRepo.ts`
  - `src/db/repositories/dreamMapRepo.ts`

### direct payload reads
- Work flow frequently reads `work_versions.payload` directly for prompt/sequence/material trace reconstruction.
- Observe route can directly load entries and construct payload before version writes.
- confidence: High
- evidence:
  - `app/api/work-block/next/route.ts`
  - `app/api/work/persist/route.ts`
  - `app/api/observe/route.ts`

### legacy fallback reads
- Observation v0 access can fall back to dream-v1 payload adaptation when `latest_v0_id` missing.
- Frame recommendation why can fall back to prior `domain_jobs.output_ref` payload.
- Ensure route includes dream_map v0 build and latest fetch in core ensure response.
- confidence: Medium
- evidence:
  - `src/db/repositories/latestRepo.ts` (`fetchObservationLatestV0WithPayloadAndId`)
  - `src/orchestration/jobs/jobGenerateFrame.ts`
  - `app/api/session/ensure/route.ts`

### mixed ownership patterns
- Core flow ownership split across direct route logic and orchestration jobs.
- Same conceptual flow exists in both direct API endpoints (`/api/observe`) and job-based ensure flow (`jobExtractObservation`).
- `work` layer uses both latest pointers and direct table/history reconstruction.
- confidence: Medium
- evidence:
  - `app/api/observe/route.ts`
  - `src/orchestration/jobs/jobExtractObservation.ts`
  - `app/api/work-block/next/route.ts`

---

## Transitional Runtime Areas

- Observation dual-schema runtime (`v0` + `dream_v1`) with adapter fallback is likely transitional.
  - evidence: `src/db/repositories/observationRepo.ts`, `src/db/repositories/latestRepo.ts`
- Dream map v0 generation still wired into `session/ensure` pipeline, while docs classify dreammap as deferred in stabilization artifacts.
  - evidence: `app/api/session/ensure/route.ts`, `src/orchestration/jobs/jobBuildDreamMapV0.ts`, `docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md`
- Frame job contains explicit note that no-latent fallback idempotency handling is TODO when fallback becomes fully active.
  - evidence: `src/orchestration/jobs/jobGenerateFrame.ts`
- Work persistence and answer persistence appear to use different answer field naming conventions (see unclear/risky section).
  - evidence: `app/api/work-block/next/route.ts`, `app/api/work/answer/route.ts`

---

## Unclear / Risky Areas

- **Unclear: dream_answers schema contract in runtime code**
  - `work/answer` inserts/selects `work_id`, `content`
  - `work-block/next` reads `work_block_id`, `answer_text`
  - This may indicate transitional compatibility layer, stale fields, DB view mapping, or a mismatch.
  - confidence: Unclear
  - evidence: `app/api/work/answer/route.ts`, `app/api/work-block/next/route.ts`

- **Risk: mixed observe pathways may diverge behavior**
  - Direct `/api/observe` produces `dream_v1`; ensure job pathway writes `v0`.
  - Adapter fallback masks missing v0 pointer, potentially hiding drift.
  - confidence: Medium
  - evidence: `app/api/observe/route.ts`, `src/orchestration/jobs/jobExtractObservation.ts`, `src/db/repositories/latestRepo.ts`

- **Risk: core ensure path still includes deferred dreammap work**
  - `session/ensure` includes dream_map run/fallback fields.
  - Could add coupling and latency to core flow during alpha stabilization.
  - confidence: Medium
  - evidence: `app/api/session/ensure/route.ts`

- **Risk: ownership spread across wrappers and delegated endpoints**
  - `frame` and `session/bootstrap` wrappers delegate to ensure routes; behavior center is not obvious without code tracing.
  - confidence: Medium
  - evidence: `app/api/frame/route.ts`, `app/api/frame/ensure/route.ts`, `app/api/session/bootstrap/route.ts`

---

## Evidence Notes

Primary code evidence reviewed:
- Core routes/APIs:
  - `app/api/session/submit/route.ts`
  - `app/api/session/bootstrap/route.ts`
  - `app/api/session/ensure/route.ts`
  - `app/api/observe/route.ts`
  - `app/api/frame/route.ts`
  - `app/api/frame/ensure/route.ts`
  - `app/api/direction/select/route.ts`
  - `app/api/work-block/next/route.ts`
  - `app/api/work/persist/route.ts`
  - `app/api/work/answer/route.ts`
- Repositories and orchestration:
  - `src/db/repositories/latestRepo.ts`
  - `src/db/repositories/observationRepo.ts`
  - `src/db/repositories/frameRepo.ts`
  - `src/db/repositories/dreamMapRepo.ts`
  - `src/orchestration/jobs/jobExtractObservation.ts`
  - `src/orchestration/jobs/jobBuildSessionIndexFromObservation.ts`
  - `src/orchestration/jobs/jobUpdateLatent.ts`
  - `src/orchestration/jobs/jobGenerateFrame.ts`
  - `src/orchestration/ensureAnchorsRanked.ts`
- Context docs:
  - `docs/AGENT_START_HERE.md`
  - `docs/SPEC_INDEX.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md`

---

## Recommended Follow-up Audits

1. **Answer schema contract audit (high priority)**
- Verify whether `dream_answers` canonical runtime fields are `content/work_id` or `answer_text/work_block_id`, and where compatibility mapping exists.

2. **Observation pathway convergence audit**
- Map behavioral and schema differences between direct `/api/observe` and ensure-driven `jobExtractObservation` flow.

3. **Core-flow vs deferred coupling audit**
- Evaluate whether dream_map invocation in `session/ensure` should remain runtime-coupled for public alpha.

4. **Canonical read-path audit for work flow**
- Clarify where latest pointers are authoritative vs where direct historical scans are required.

5. **Route ownership audit**
- Document wrapper/delegate API layers (`bootstrap`, `frame`, `frame/ensure`, `session/ensure`) into one explicit runtime ownership map.
