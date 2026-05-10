# Master Repo Stabilization Audit (2026-04-08)

## 1) Goal & Scope

- Produce a file-level inventory with `keep / improve / defer / remove` decisions.
- Define domain and pipeline boundaries (`block / async / deferred`).
- Build a 4-6 week wave plan based on the inventory.
- Define a concrete DB consolidation plan with explicit migrations.

## 2) Domain & Pipeline Map

### Core (`block`)
- session -> observe -> frame -> work

### Support (`async`)
- index -> latent -> anchors -> directions -> glossary -> image jobs

### Deferred (`deferred`)
- dreammap, backfill jobs, legacy adapters, legacy presets, tests, guidance files

Rules:
- Glossary is async support for latent enrichment, not a blocking dependency.
- Legacy v0 dreammap and other offline maintenance paths are deferred unless actively needed.

## 3) File-Level Inventory

| file | status | owner domain | pipeline layer | rationale | dependencies | risks |
|---|---|---|---|---|---|---|
| src/domain/anchors/buildAnchorsFromObservation.ts | keep | anchors | async | Core anchor extraction used by downstream indexing and ranking. | observation payloads; anchor ranking | Bad anchor quality cascades into index noise. |
| src/domain/archetypes/normalizeBaseKey.ts | keep | archetypes | deferred | Small normalization helper with low operational coupling. | archetype consumers | Key drift if normalization changes without migration. |
| src/domain/background/localBackgroundMap.ts | keep | background | deferred | Static lookup map; safe to retain as shared config. | resolveBackground | Stale mappings if background taxonomy expands. |
| src/domain/background/resolveBackground.ts | keep | background | deferred | Core resolver for background classification. | localBackgroundMap | Misclassification affects downstream presentation. |
| src/domain/catalog/catalogTypes.ts | keep | catalog | deferred | Shared type surface for catalog domain. | catalog consumers | Type churn can ripple through cross-domain callers. |
| src/domain/catalog/normalizeDirectionContent.ts | improve | catalog | deferred | Normalization is useful but likely needs tighter validation and test coverage. | direction content inputs | Silent normalization bugs can mask bad source data. |
| src/domain/directions/recommendDirectionsFromLatent.ts | keep | directions | async | Primary recommendation logic for latent-to-direction flow. | latent payloads | Weak ranking degrades recommendation relevance. |
| src/domain/dreammap/AGENTS.md | defer | dreammap | deferred | Repo-local guidance only; not runtime logic. | dreammap files | Low direct risk; may drift from code behavior. |
| src/domain/dreammap/axis/axis_lexicon_v1.ts | defer | dreammap | deferred | Legacy lexicon, likely superseded by v2. | dreammap axis consumers | Parallel lexicons increase ambiguity. |
| src/domain/dreammap/axis/axis_lexicon_v2.ts | keep | dreammap | deferred | Current lexicon baseline for axis computation. | computeTermAxisV2 | Lexicon mistakes affect all axis inference. |
| src/domain/dreammap/axis/computeSceneAxis.ts | improve | dreammap | deferred | Important but likely benefits from simplification and explicit edge-case handling. | scene observations | Axis instability can produce inconsistent maps. |
| src/domain/dreammap/axis/computeTermAxisV2.ts | keep | dreammap | deferred | Current term-axis implementation. | axis_lexicon_v2 | Errors propagate into dreammap derivations. |
| src/domain/dreammap/buildDreamMapV0.test.ts | defer | dreammap | deferred | Legacy test file tied to an older variant. | buildDreamMapV0 | May become misleading if v0 is retired. |
| src/domain/dreammap/buildDreamMapV0.ts | defer | dreammap | deferred | Legacy implementation; keep only if v0 is still operationally required. | dreammap v0 consumers | Maintains duplicated logic and support burden. |
| src/domain/dreammap/buildDreamMapV2.ts | keep | dreammap | deferred | Primary dreammap implementation. | axis computations; types_v2 | Core behavior regression if contract changes. |
| src/domain/dreammap/types.ts | defer | dreammap | deferred | Legacy type surface, likely on the path to replacement. | dreammap v0 callers | Split type definitions can fragment consumers. |
| src/domain/dreammap/types_v2.ts | keep | dreammap | deferred | Authoritative dreammap v2 types. | buildDreamMapV2 | Schema drift can break consumers. |
| src/domain/frame/generateFrameFromLatent.ts | keep | frame | block | Core frame generation is part of the first-response path. | latent payloads | Blocked or unstable frame generation impacts user-visible flow. |
| src/domain/glossary/backfillGlossaryCandidates.ts | defer | glossary | deferred | Operational backfill job, not on the critical path. | glossary repo; candidate extractor | Backfills can create noisy or duplicate candidates. |
| src/domain/glossary/backfillGlossaryOccurrences.ts | defer | glossary | deferred | Operational backfill job with offline semantics. | glossary repo; occurrence indexing | May amplify incorrect historical matches. |
| src/domain/glossary/glossaryCandidateExtractor.ts | keep | glossary | async | Primary candidate extraction logic. | observations/highlights | Extraction quality directly affects glossary relevance. |
| src/domain/glossary/glossaryCandidateRules.ts | keep | glossary | async | Ruleset for candidate filtering and scoring. | candidate extractor | Over-filtering can hide valuable terms. |
| src/domain/glossary/indexGlossaryFromHighlight.ts | keep | glossary | async | Indexing path for highlight-driven glossary enrichment. | highlight payloads | Duplicate indexing if dedupe is weak. |
| src/domain/glossary/indexGlossaryFromObservation.ts | keep | glossary | async | Observation-driven glossary indexing. | observation payloads | Noisy observations can pollute glossary terms. |
| src/domain/glossary/indexObservationIntoGlossary.ts | keep | glossary | async | Wrapper orchestration for observation-to-glossary flow. | candidate extractor; indexers | If orchestration is unclear, ownership can blur. |
| src/domain/glossary/normalizeTerm.ts | keep | glossary | async | Shared normalization helper for term identity. | glossary consumers | Normalization drift can create duplicate canonical forms. |
| src/domain/glossary/OccurrenceIndexer.ts | improve | glossary | async | Central indexer is important but likely needs clearer boundaries and tests. | occurrence storage | Indexing bugs can create hard-to-repair corpus drift. |
| src/domain/glossary/pinHighlightToLexikon.ts | defer | glossary | deferred | Specialized pinning workflow with lower urgency. | highlight and lexikon data | Low-frequency path may hide edge-case bugs. |
| src/domain/highlights/aggregateSessionSuggestions.ts | keep | highlights | async | Session-level aggregation supports secondary insights. | session suggestions | Incorrect aggregation can skew ranking. |
| src/domain/image/pipeline/GatePromptFragments.ts | keep | image | async | Prompt assembly support shared by image pipeline. | PromptAssembler | Prompt regressions can alter generation quality. |
| src/domain/image/pipeline/generateImage.ts | keep | image | async | Primary image generation path. | render adapter; seed manager | External API failures surface here. |
| src/domain/image/pipeline/hash.ts | keep | image | async | Deterministic helper for repeatable image inputs. | pipeline inputs | Hash changes break dedupe and reproducibility. |
| src/domain/image/pipeline/PromptAssembler.ts | keep | image | async | Core prompt assembly component. | GatePromptFragments | Prompt construction bugs affect generation output. |
| src/domain/image/pipeline/SeedManager.ts | keep | image | async | Seed management is essential for reproducibility. | generateImage | Seed drift undermines consistency. |
| src/domain/image/presets/lumira_core_space_v1.ts | keep | image | deferred | Stable preset definition. | image pipeline | Preset edits can unexpectedly change output style. |
| src/domain/image/presets/lumira_gate_v0.ts | defer | image | deferred | Legacy preset variant. | image pipeline | Extra preset variants increase maintenance. |
| src/domain/image/presets/lumiraStonePassage_v0.ts | defer | image | deferred | Legacy preset variant. | image pipeline | Legacy style definitions may be unused. |
| src/domain/image/presets/lumiraStonePassage_v1.ts | keep | image | deferred | Current preset variant. | image pipeline | Preset behavior can drift from intended art direction. |
| src/domain/image/presets/types.ts | keep | image | deferred | Shared preset types. | preset consumers | Type changes can break preset definitions. |
| src/domain/image/reference/loadReferenceImage.ts | keep | image | async | Reference image loading is part of pipeline execution. | file/object storage | I/O failures block image jobs. |
| src/domain/image/render/OpenAIImageAdapter.ts | keep | image | async | External rendering adapter. | OpenAI image API | Provider changes can require adapter updates. |
| src/domain/image/render/types.ts | keep | image | async | Shared adapter contract. | render adapter | Contract mismatch can break integration. |
| src/domain/index/buildSessionIndexFromObservation.ts | keep | index | async | Session indexing is a support pipeline primitive. | observation payloads | Index quality depends on observation fidelity. |
| src/domain/latent/extractSalientElements.ts | keep | latent | async | Core latent extraction primitive. | observations/materials | Poor extraction degrades all latent enrichment. |
| src/domain/latent/normalizeLatentPayload.ts | keep | latent | async | Payload normalization is a shared precondition. | latent consumers | Schema mismatches propagate quickly. |
| src/domain/latent/updateLatentFromMaterial.ts | keep | latent | async | Primary latent update flow. | material inputs | Update bugs can corrupt latent state. |
| src/domain/observe/adaptDreamObservationToV0.ts | defer | observe | deferred | Legacy adapter path for v0 compatibility. | dream observation payloads | Version-specific adapters increase branching. |
| src/domain/observe/extractObservationFromEntries.ts | keep | observe | block | Observation extraction is part of the first-response chain. | entry feed | Extraction failures directly block downstream work. |
| src/domain/observe/types.ts | keep | observe | block | Primary observation types. | observation pipeline | Type drift can break all first-response consumers. |
| src/domain/work/composer/CardComposer.ts | keep | work | block | User-visible card composition belongs on the blocking path. | materials, selector, trace | Composition bugs affect primary UX output. |
| src/domain/work/glossary/fetchGlossaryContext.test.ts | defer | work | deferred | Test artifact only; not runtime logic. | fetchGlossaryContext | Low operational risk. |
| src/domain/work/glossary/fetchGlossaryContext.ts | keep | work | async | Support lookup for glossary enrichment. | glossary repo | Stale context can mislead downstream scoring. |
| src/domain/work/materials/latentIntent.ts | keep | work | block | Blocking material interpretation feeds first-response composition. | latent extraction | Intent misreads can distort card output. |
| src/domain/work/safety/SafetyGate.ts | keep | work | block | Safety checks must remain on the blocking path. | work composition | Bypassing safety creates user-facing policy risk. |
| src/domain/work/selector/CardMaterialSelector.ts | keep | work | block | Primary selector for card material assembly. | materials; latent intent | Selection regressions alter the visible response. |
| src/domain/work/stop/StopEngine.ts | keep | work | block | Blocking control-flow primitive for work execution. | work orchestration | Stop logic bugs can create runaway execution. |
| src/domain/work/trace/TraceTypes.ts | keep | work | deferred | Shared tracing types with low runtime risk. | trace consumers | Tracing schema drift may affect observability. |
| src/orchestration/ensureAnchorsRanked.ts | keep | anchors | async | Orchestration helper for ranking anchors after extraction. | anchor repo/ranking | Ranking order changes can affect downstream retrieval. |
| src/orchestration/idempotency/jobKey.ts | keep | jobs | async | Shared idempotency key utility. | job runner | Key collisions can duplicate or suppress jobs. |
| src/orchestration/idempotency/materialHash.ts | keep | jobs | async | Hashing utility for job de-duplication. | job runner; material payloads | Hash instability breaks idempotency guarantees. |
| src/orchestration/jobs/jobBackfillArchetype.ts | defer | archetypes | deferred | Backfill job is offline maintenance, not a live path. | archetype repo; ids | Backfill mistakes can rewrite historical classifications. |
| src/orchestration/jobs/jobBuildDreamMapV0.test.ts | defer | dreammap | deferred | Test-only artifact for legacy job variant. | jobBuildDreamMapV0 | Minimal operational risk. |
| src/orchestration/jobs/jobBuildDreamMapV0.ts | defer | dreammap | deferred | Legacy orchestration path for v0 dreammap generation. | dreammap v0 build | Duplicated orchestration increases maintenance burden. |
| src/orchestration/jobs/jobBuildSessionIndexFromObservation.ts | keep | index | async | Operational job for session indexing support path. | observation data; session index repo | Job failures can delay support pipeline freshness. |
| src/orchestration/jobs/jobExtractAnchors.ts | keep | anchors | async | Primary anchor extraction job. | observation data | Extraction quality affects all ranked anchor consumers. |
| src/orchestration/jobs/jobExtractObservation.ts | keep | observe | block | First-response ingestion job feeding the core path. | entry payloads; observation extractor | If this fails, the primary pipeline stalls. |
| src/orchestration/jobs/jobGenerateFrame.ts | keep | frame | block | Frame generation job sits on the blocking response path. | latent and frame domains | External or compute failures surface directly to users. |
| src/orchestration/jobs/jobUpdateLatent.ts | keep | latent | async | Core latent update job for support enrichment. | material payloads; latent repo | Ordering issues can corrupt latent state. |
| src/db/repositories/__tests__/archetypeQueueRepo.test.ts | defer | archetypes | deferred | Test-only artifact. | archetype queue repo | Low risk. |
| src/db/repositories/__tests__/glossaryRepo.bumpTermCandidates.test.ts | defer | glossary | deferred | Test-only artifact. | glossary repo | Low risk. |
| src/db/repositories/anchorRepo.ts | keep | anchors | async | Persistence layer for anchor records. | anchor pipeline | Schema drift can break ranking and retrieval. |
| src/db/repositories/archetypeQueueRepo.ts | keep | archetypes | deferred | Queue-backed persistence for archetype work. | archetype jobs | Queue semantics need careful idempotency. |
| src/db/repositories/archetypeRepo.ts | keep | archetypes | deferred | Primary archetype persistence surface. | archetype domain | Schema changes can affect classification history. |
| src/db/repositories/catalogRepo.ts | keep | catalog | deferred | Catalog persistence boundary. | catalog domain | Catalog contract drift can break lookups. |
| src/db/repositories/dreamMapRepo.ts | defer | dreammap | deferred | Legacy dreammap persistence boundary. | dreammap v0 | Parallel repos increase maintenance and migration risk. |
| src/db/repositories/dreamMapV2Repo.ts | keep | dreammap | deferred | Current dreammap persistence boundary. | dreammap v2 | Schema coupling can break derived views. |
| src/db/repositories/eventRepo.ts | keep | events | async | Shared event persistence is a cross-cutting support dependency. | event store | Event schema drift affects multiple domains. |
| src/db/repositories/frameRepo.ts | keep | frame | block | Blocking path persistence for frame results. | frame pipeline | Write failures directly affect response completion. |
| src/db/repositories/glossaryRepo.ts | keep | glossary | async | Primary glossary storage boundary. | glossary jobs and indexers | Integrity issues can create duplicate or stale terms. |
| src/db/repositories/imageJobRepo.ts | keep | image | async | Persistence for asynchronous image jobs. | image pipeline | Job-state inconsistencies can orphan work. |
| src/db/repositories/imagePresetRepo.ts | keep | image | deferred | Preset storage for configuration-like data. | image presets | Unexpected preset edits change generated output. |
| src/db/repositories/jobRepo.ts | keep | jobs | async | Generic job persistence is a foundational support dependency. | orchestration jobs | Job-state bugs can duplicate or lose work. |
| src/db/repositories/latentRepo.ts | keep | latent | async | Primary latent persistence boundary. | latent pipeline | State corruption can affect many downstream flows. |
| src/db/repositories/latestRepo.ts | improve | shared | deferred | Convenience repository likely needs clearer ownership and usage boundaries. | various latest-value consumers | Ambiguous semantics can hide implicit coupling. |
| src/db/repositories/materialRepo.ts | keep | materials | block | Blocking path material persistence. | work/material flows | Bad writes affect first-response composition. |
| src/db/repositories/observationRepo.ts | keep | observe | block | Core observation storage for first-response ingestion. | observation pipeline | Storage issues block downstream processing. |
| src/db/repositories/sessionIndexRepo.ts | keep | index | async | Session index persistence supports non-blocking enrichment. | indexing jobs | Index lag can reduce freshness. |
| src/db/repositories/workQuestionLedgerRepo.ts | keep | work | block | Ledger supports the main work path and should remain stable. | work orchestration | Ledger inconsistency can break traceability. |

## 4) Pipeline Entry Points

- API routes: see route map and app router surfaces that feed `observe`, `frame`, `work`, and support jobs.
- UI entry pages: first-response surfaces should remain aligned with `block` modules.
- Orchestration jobs: keep `block` jobs minimal; move offline maintenance and legacy variants to `deferred`.

## 5) Wave Plan (4-6 Weeks)

### Wave 1 (Week 1-2): First-response stabilization
- Protect `observe`, `frame`, `work`, and their repositories.
- Tighten blocking-path boundaries and avoid new legacy coupling.

### Wave 2 (Week 3-4): Support pipeline cleanup
- Normalize `async` support domains: `index`, `latent`, `anchors`, `glossary`, `image`.
- Improve shared helpers and repository boundaries where ownership is ambiguous.

### Wave 3 (Week 5-6): Deferred separation and removals
- Isolate legacy `dreammap` v0, backfills, tests, and guidance-only files.
- Remove or quarantine dead variants after confirming no active callers remain.

## 6) DB Consolidation Plan

### Authoritative Tables
- `dream_sessions` ? canonical session header and ownership record for the core flow.
- `dream_entries` ? raw session narrative / intake payloads used by session and work entry points.
- `dream_answers` ? persisted work answers tied back to a session and work block.
- `observation_versions` ? source-of-truth observation payload history for the observe pipeline.
- `observation_latest` ? pointer table for current observation material, including typed latest references.
- `anchor_versions` ? canonical anchor payload history for ranked anchor extraction.
- `anchor_latest` ? pointer table for the current ranked anchor version.
- `latent_versions` ? canonical latent payload history for enrichment and downstream work.
- `latent_latest` ? pointer table for the current latent payload.
- `frame_versions` ? canonical frame payload history for blocking first-response output.
- `frame_latest` ? pointer table for the current frame payload.
- `work_versions` ? canonical work payload history for first-response composition.
- `work_latest` ? pointer table for the current work payload.
- `session_index_versions` ? canonical session index payload history for async session enrichment.
- `session_index_latest` ? pointer table for the current session index payload.
- `domain_events` ? append-only event log for cross-domain orchestration and auditing.
- `domain_jobs` ? job queue/state table for async orchestration and retry control.
- `material_snapshots` ? persisted material snapshots consumed by blocking work assembly.
- `glossary_terms` ? canonical glossary terms and their owned metadata.
- `glossary_occurrences` ? term-to-session occurrence ledger used by glossary enrichment.
- `glossary_notes` ? user-authored notes attached to glossary terms.
- `term_candidates` ? candidate term staging table for glossary scoring and approval.
- `glossary_occurrence_events` ? append-only glossary event stream for occurrence history.
- `archetype_terms` ? canonical archetype terms used by glossary-to-archetype linking.
- `archetype_term_queue` ? queue of pending archetype work items.
- `dream_entry_highlights` ? highlight rows extracted from entries for secondary analysis.
- `dream_session_highlights` ? session-level highlights used by the highlights UI and backfills.
- `dream_session_rejected_suggestions` ? rejected highlight suggestions retained for user preference tracking.
- `image_style_presets` ? image style configuration source table.
- `image_jobs` ? async image generation job state table.
- `work_question_ledger` ? user-facing work prompt ledger for traceability.
- `dream_map_v2_versions` ? current dream-map v2 payload history.
- `dream_map_v2_latest` ? pointer table for the current dream-map v2 version.

### Candidate Removals / Archives
- `dream_map_versions` and `dream_map_latest` ? legacy v0 dream-map tables; the only direct callers are `dreamMapRepo` and admin backfill surfaces, which are already deferred.
- `dream_observation` ? legacy singular observation table from the earliest MVP schema; no keep/improve file depends on it.
- `user_behavior_stats` ? legacy analytics/support table with no active keep/improve references in the current inventory.
- `user_prefs` ? candidate for archival only if the session/work path is moved to a dedicated profile table; current code still reads it, so keep it live until that migration exists.

### Explicit Migrations
1. `supabase/migrations/20260408_0001_archive_legacy_dream_map_v0.sql`
- Operations: freeze writes to `dream_map_versions` / `dream_map_latest`, copy current rows into an archive schema or backup table, then drop the live tables once callers are removed.
- Rollback guidance: restore the archived rows into the original tables and re-create dependent policies/indexes before re-enabling callers.

2. `supabase/migrations/20260408_0002_drop_legacy_dream_observation.sql`
- Operations: verify no application code references `dream_observation`, export a final backup, then drop the table.
- Rollback guidance: recreate the table from the prior migration definition and reload the backup if a rollback is needed.

3. `supabase/migrations/20260408_0003_retire_user_behavior_stats.sql`
- Operations: archive historical rows, remove the table, and replace any surviving analytics reads with the newer source tables.
- Rollback guidance: restore from archive and re-point analytics queries to the restored table.

4. `supabase/migrations/20260408_0004_consolidate_material_snapshots.sql`
- Operations: migrate any remaining snapshot-only fields into `work_versions` or a dedicated archive table, then remove duplicate snapshot storage if confirmed unused.
- Rollback guidance: keep the archive copy intact until all downstream reads are verified; restore the original table only if consumers still need the old shape.

### Rollout Notes
- Treat the legacy v0 dream-map pair as the first archive target because the current inventory already classifies its code paths as deferred.
- Do not drop `user_prefs`, `dream_anchor_*`, or any of the `*_latest` pointer tables until the replacement read paths are proven stable.
- Migration sequencing should be: archive, switch callers, verify, then drop.
