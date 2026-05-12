# Ensure De-coupling Contract

## Purpose

Define the public-alpha contract for `/api/session/ensure` so future cleanup/build tickets can decouple non-core work without breaking `session -> observe -> frame -> direction -> work`.

This is an audit/plan artifact only. It does not change runtime behavior.

## Current Ensure Responsibilities

`/api/session/ensure` currently acts as:
- auth + ownership gate,
- material/idempotency context builder,
- orchestrator for observe/index/latent/anchors/dream_map/frame,
- best-effort event/snapshot logger,
- guest-mode branch controller,
- fallback reader and contract warning emitter.

Current default run profile:
- non-guest default: `observe=true`, `anchors=true`, `session_index=true`, `latent=true`, `frame=true`, `dream_map=true` (`app/api/session/ensure/route.ts:90-95`).
- guest default: all above except `frame` are effectively off (`!isGuest` guards), `frame` stays on (`app/api/session/ensure/route.ts:90-95`, `:334-339`).

Direct answers to required analysis questions:
- What does `session.ensure` currently run by default?
  - Non-guest: observation, session index, latent, anchors, dream map, frame.
  - Guest: frame only (plus latest fallbacks and best-effort logging).
- Which parts are required for frame/direction/work to function?
  - Observation latest (v0), session index latest, latent latest (or frame fallback mode), anchor latest, and frame latest generation/fetch path.
- Which parts only support deferred domains?
  - Dream map build and archetype queue/glossary recurrence ingestion.
- Which parts are best-effort and non-blocking?
  - Material snapshot insert, domain event insert, glossary indexing side effect, warning logs.
- Which side effects should be explicitly documented as sidecars?
  - material snapshots, domain events, glossary indexing, contract warning logs.
- Does guest mode alter core guarantees?
  - Yes. It disables most generation jobs and can leave frame null if prerequisite latest records do not exist.
- What should be the first safe BUILD step after this plan?
  - Gate dream-map execution off-by-default for alpha while preserving all core jobs and response shape.

## Alpha Core Guarantees

For alpha, `/api/session/ensure` must guarantee:

1. Auth + ownership validation before orchestration (`app/api/session/ensure/route.ts:44-49`, `:101-108`).
2. Deterministic material-hash computation from entries/answers/prefs inputs (`app/api/session/ensure/route.ts:115-160`).
3. Core orchestration attempts for non-guest flow:
   - observation (`:203-227`)
   - session index (`:230-254`)
   - latent (`:257-281`)
   - anchors (`:284-304`)
   - frame (`:334-382`)
4. Fallback reads of latest pointers when jobs are skipped/disabled/fail (`:211-218`, `:238-245`, `:265-272`, `:288-295`, `:344-372`).
5. Stable response contract with IDs + `recommended_directions` even when some IDs are null (`:386-395`).

Alpha non-guarantees (current behavior):
- Ensure does not hard-fail when core version IDs are missing after retries; it logs warnings and returns `status: "ok"` (`warnCoreFlowContract`, `:37`, `:219-224`, `:246-251`, `:273-278`, `:296-301`, `:376-381`).

## Current Jobs / Side Effects Inventory

### 1) Session ownership validation
- name: session ownership check
- current trigger condition: always (after auth/session_id validation)
- DB reads: `dream_sessions`
- DB writes: none
- required for alpha core?: yes
- status: CORE
- evidence: `app/api/session/ensure/route.ts:101-108`
- confidence: High

### 2) Material input scan + hash
- name: material hash input collection
- current trigger condition: always
- DB reads: `dream_entries`, `dream_answers`, `user_prefs`
- DB writes: none
- required for alpha core?: yes
- status: CORE
- evidence: `app/api/session/ensure/route.ts:115-160`
- confidence: High

### 3) Material snapshot write
- name: `insertMaterialSnapshotIfMissing`
- current trigger condition: always, best-effort `try/catch`
- DB reads: `material_snapshots` (conflict fetch path)
- DB writes: `material_snapshots`
- required for alpha core?: no
- status: SIDECAR
- evidence: `app/api/session/ensure/route.ts:163-170`; `src/db/repositories/materialRepo.ts:24-49`
- confidence: High

### 4) Domain event write
- name: `createDomainEvent` (`session.ensure_requested`)
- current trigger condition: always, best-effort `try/catch`
- DB reads: none
- DB writes: `domain_events`
- required for alpha core?: no
- status: SIDECAR
- evidence: `app/api/session/ensure/route.ts:178-185`; `src/db/repositories/eventRepo.ts:18`
- confidence: High

### 5) Observation job
- name: `jobExtractObservation`
- current trigger condition: `runObserve` true (non-guest default)
- DB reads: `dream_entries`, `user_prefs`, `domain_jobs` (idempotency lookup)
- DB writes: `observation_versions`, `observation_latest`, `domain_jobs`
- required for alpha core?: yes
- status: CORE
- evidence: `app/api/session/ensure/route.ts:203-207`; `src/orchestration/jobs/jobExtractObservation.ts:20-21`, `:37-47`, `:53-66`, `:83-97`; `src/db/repositories/observationRepo.ts:41-155`
- confidence: High

### 6) Observation glossary indexing side effect
- name: `indexGlossaryFromObservation` (inside observation job)
- current trigger condition: when observation extraction succeeds
- DB reads: `glossary_terms`
- DB writes: `term_candidates`, `glossary_occurrences`
- required for alpha core?: unclear
- status: UNCLEAR
- evidence: `src/orchestration/jobs/jobExtractObservation.ts:68-79`; `src/domain/glossary/indexGlossaryFromObservation.ts:31-33`, `:54-66`
- confidence: Medium

### 7) Session index job
- name: `jobBuildSessionIndexFromObservationJob`
- current trigger condition: `runSessionIndex` true (non-guest default) and observation latest exists
- DB reads: `observation_latest`, `observation_versions`, `domain_jobs` (idempotency lookup)
- DB writes: `session_index_versions`, `session_index_latest`, `domain_jobs`
- required for alpha core?: yes
- status: CORE
- evidence: `app/api/session/ensure/route.ts:230-234`; `src/orchestration/jobs/jobBuildSessionIndexFromObservation.ts:19-21`, `:27-38`, `:46-67`; `src/db/repositories/sessionIndexRepo.ts:21-87`
- confidence: High

### 8) Latent job
- name: `jobUpdateLatent`
- current trigger condition: `runLatent` true (non-guest default) and observation+session_index latest exist
- DB reads: `observation_latest`, `observation_versions`, `session_index_latest`, `session_index_versions`, `direction_catalog`, `user_prefs`, `dream_entries`, `domain_jobs`
- DB writes: `latent_versions`, `latent_latest`, `domain_jobs`
- required for alpha core?: yes
- status: CORE
- evidence: `app/api/session/ensure/route.ts:257-261`; `src/orchestration/jobs/jobUpdateLatent.ts:23-24`, `:51-71`, `:82-107`; `src/db/repositories/latentRepo.ts:17-78`
- confidence: High

### 9) Anchor ranking
- name: `ensureAnchorsRanked`
- current trigger condition: `runAnchors` true (non-guest default)
- DB reads: `dream_entries` (latest raw), `observation_latest/versions`, `latent_latest/versions`, `work_question_ledger`
- DB writes: `dream_anchor_versions`, `dream_anchor_latest`
- required for alpha core?: yes (for current work-card selection quality path)
- status: CORE
- evidence: `app/api/session/ensure/route.ts:284-286`; `src/orchestration/ensureAnchorsRanked.ts:17-23`, `:59-61`, `:97-109`; `src/db/repositories/workQuestionLedgerRepo.ts:45-63`
- confidence: Medium

### 10) Dream map job
- name: `jobBuildDreamMapV0`
- current trigger condition: `runDreamMap` true (non-guest default)
- DB reads: `observation_latest/versions`, `dream_anchor_latest/versions`, `session_index_latest/versions`, `dream_session_highlights`, `dream_entries`, `dream_entry_highlights`, `glossary_*`, `archetype_terms`, plus idempotency reads in `domain_jobs`
- DB writes: `dream_map_versions`, `dream_map_latest`, `archetype_term_queue`, `domain_jobs`
- required for alpha core?: no
- status: DEFER
- evidence: `app/api/session/ensure/route.ts:307-312`; `src/orchestration/jobs/jobBuildDreamMapV0.ts:105`, `:132`, `:161`, `:447-474`; `src/db/repositories/dreamMapRepo.ts:51-142`
- confidence: High

### 11) Frame job
- name: `jobGenerateFrame`
- current trigger condition: `runFrame` true (default true for guest and non-guest)
- DB reads: `observation_latest/versions`, `session_index_latest/versions`, `latent_latest/versions`, `direction_catalog`, `dream_entries`, `domain_jobs` (prior success why-map), idempotency reads in `domain_jobs`
- DB writes: `frame_versions`, `frame_latest`, `domain_jobs`
- required for alpha core?: yes
- status: CORE
- evidence: `app/api/session/ensure/route.ts:334-340`; `src/orchestration/jobs/jobGenerateFrame.ts:52-60`, `:62-66`, `:89-121`, `:185-207`, `:260-274`; `src/db/repositories/frameRepo.ts:17-78`
- confidence: High

### 12) Latest-pointer fallback reads
- name: fallback fetches for missing IDs
- current trigger condition: run flag false and/or job returned null and/or post-run verification
- DB reads: `observation_latest/versions`, `session_index_latest/versions`, `latent_latest/versions`, `dream_anchor_latest/versions`, `dream_map_latest/versions`, `frame_latest/versions`
- DB writes: none
- required for alpha core?: yes (current resiliency path)
- status: CORE
- evidence: `app/api/session/ensure/route.ts:211-216`, `:238-243`, `:265-270`, `:288-293`, `:315-320`, `:344-372`; `src/db/repositories/latestRepo.ts:62-232`; `src/db/repositories/dreamMapRepo.ts:107-142`
- confidence: High

### 13) Contract warning logs
- name: `warnCoreFlowContract`
- current trigger condition: latest/version IDs still missing after retries
- DB reads: none
- DB writes: none
- required for alpha core?: no
- status: SIDECAR
- evidence: `app/api/session/ensure/route.ts:37`, `:219-224`, `:246-251`, `:273-278`, `:296-301`, `:376-381`
- confidence: High

### 14) Guest mode flag branch
- name: `user_flags.is_guest` branch
- current trigger condition: always evaluated per request
- DB reads: `user_flags`
- DB writes: none
- required for alpha core?: unclear
- status: UNCLEAR
- evidence: `app/api/session/ensure/route.ts:75-84`; run toggles at `:90-95`
- confidence: Medium

## Proposed Alpha Ensure Profile

### Core-required jobs

- `jobExtractObservation`
- `jobBuildSessionIndexFromObservationJob`
- `jobUpdateLatent`
- `ensureAnchorsRanked`
- `jobGenerateFrame`
- Latest-pointer fallback reads for each core stage.

These remain aligned with D5 (ensure-based, v0-centric observation runtime truth).

### Optional sidecars

- `createDomainEvent` (`domain_events`)
- `insertMaterialSnapshotIfMissing` (`material_snapshots`)
- `warnCoreFlowContract` logging

These should never block core flow success.

### Deferred/off-by-default jobs

- `jobBuildDreamMapV0` (and associated archetype queue/glossary recurrence ingestion)

Rationale: deferred-domain coupling with non-core tables while alpha core flow can function without it.

### Best-effort logging/snapshots

- Keep as best-effort in alpha.
- Preserve fail-open semantics (`try/catch` swallow) to avoid blocking core journey.

## Guest Mode Impact

Current guest behavior materially changes guarantees:
- `observe`, `session_index`, `latent`, `anchors`, `dream_map` are default-disabled by `!isGuest` guards (`app/api/session/ensure/route.ts:90-95`).
- `frame` still attempts to run with `allowFallbackWithoutLatent: true` (`:334-340`).
- `jobGenerateFrame` still requires observation + session index latest; if those are absent, frame returns null (`src/orchestration/jobs/jobGenerateFrame.ts:52-60`).

Implication:
- Guest flow currently depends on pre-existing latest data or alternate provisioning path, otherwise ensure can return `ok` with missing frame/core IDs.
- Guest mode is a decision gate, not a blind defer/remove candidate.

## Failure / Fallback Contract

Hard-fail conditions (request returns error):
- unauthorized (`401`)
- invalid JSON / missing `session_id` (`400`)
- ownership not found (`404`)
- `dream_entries` or `dream_answers` material-input read failures (`500`)

Fail-open conditions (request still returns `status: "ok"`):
- material snapshot insertion failure
- domain event insertion failure
- any core job returning null/error after retries
- missing latest pointers after retries (warning logged)

Core fallback strategy:
- If job skipped/disabled/fails, fetch latest pointer payload/id.
- If still missing, emit `warnCoreFlowContract` and continue response.

## Future BUILD Recommendation

Smallest safe first BUILD slice:

`BUILD (controlled) -- Alpha Ensure Run-Flag Gate (dream_map only)`

Scope:
- Keep existing response contract unchanged.
- Keep core job order unchanged.
- Change only default dream-map execution policy for non-guest alpha profile (off-by-default unless explicitly requested).
- Keep dream-map read/fallback behavior non-blocking.

Why first:
- Highest decoupling gain with minimal blast radius.
- Aligns with "dream map parked/deferred" strategy.
- Does not alter D5 observation truth or frame/direction/work critical chain.

## Owner Decisions Needed

1. Should dream map be off-by-default in alpha ensure profile (recommended), or remain default-on?
2. Should glossary indexing inside observation remain active by default, become explicit sidecar, or be gated for alpha?
3. Should guest mode remain in alpha with current degraded guarantees, or require explicit guest bootstrap guarantees first?
4. Should missing core IDs in ensure response remain fail-open (`status: ok`) or be promoted to hard-fail for specific stages?
5. Should `work_question_ledger` influence in anchor ranking remain required for alpha quality, or be treated as optional quality sidecar?

## Risks

- Dream map coupling risk: default-on deferred-domain job increases fragility/latency.
- Guest mode risk: disabled prerequisite jobs can leave frame/core IDs null without hard failure.
- Drift risk: `user_flags` migration/runtime uncertainty can affect branch behavior.
- Observability risk: fail-open core-stage misses may be under-detected if warning logs are noisy.
- Quality risk: over-decoupling anchor/latent/ledger interactions can degrade work-card relevance.

## Validation Requirements For Future BUILD

After any ensure decoupling build step:

1. Manual e2e alpha flow:
   - `new -> ensure -> frame -> direction -> work -> answer -> revisit/archive` (and summary if retained).
2. Ensure response contract checks:
   - IDs present/nullable behavior remains explicit and unchanged in shape.
3. Core-stage fallback checks:
   - Confirm latest-pointer fallback still works for disabled/skipped stages.
4. Guest-path checks:
   - Validate guest behavior and document any null-ID outcomes explicitly.
5. Sidecar non-blocking checks:
   - Force material/event failure scenarios and confirm ensure still returns.

## Non-Goals

- No runtime code changes.
- No DB/schema/migration changes.
- No wrapper collapse.
- No feature removal.
- No post-alpha reflective redesign implementation.
