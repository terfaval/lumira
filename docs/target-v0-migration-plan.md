## (1) Executive Summary (max ~15 lines) 

**Current architecture (concise)** 
- Next.js App Router UI pages (frame, direction, work, session overview) fetch and persist session artifacts directly through Supabase client calls. 
- API routes orchestrate LLM calls for observation extraction, latent synthesis, framing, work-block generation, anchor ranking, session indexing, and bootstrap workflows. 
- Supabase tables store raw sessions, summaries (title/framing/latent/recommendations), work blocks, direction selections, and catalogs for directions/cards. 
- Observation state is stored in `dream_observation` plus event logging in `dream_observation_events`, with a question ledger in `work_question_ledger`. 
- Latent analysis is stored as a single snapshot in `dream_session_summaries`; a log RPC exists but is not the primary update path. 
- Glossary is a standalone user table used for anchor ranking but lacks occurrence indexing/backfill. 

**Closest to Target v0 today** 
- Observation extraction + storage (`/api/observe`, `dream_observation`, `dream_observation_events`) are closest to a dedicated Observation component. 
- Work block persistence (`work_blocks`) and the direction catalog are close to “Work Blocks Store” and “Card Material” primitives, even if composition lives in routes. 
- Anchor ranking is a partial step toward a glossary-aware selector. 

**Top 5 blockers / risks** 
1) Target v0 spec document is not discoverable in-repo (risk of misalignment). 
2) Latent analysis is overwritten as a snapshot; versioning/log append is not first-class. 
3) Direction recommendations are generated ad-hoc inside framing/synthesis routes rather than a dedicated recommender + store. 
4) Glossary lacks occurrence indexing and backfill on pinning, limiting traceability and reuse. 
5) Work-block generation mixes selection, composition, and safety with weak trace grounding (“random context”). 

**Recommended overall strategy (iterative, additive)** 
- Introduce new domain modules + DB tables in parallel (Observation Trace, Direction Recommender, CardMaterialSelector/CardComposer) while keeping current routes intact. 
- Backfill and dual-write new stores first; then gradually switch read paths in UI/routes behind feature flags. 
- Preserve current DB columns and API responses until new pathways are stable, then cut over incrementally. 

--- 

## (2) System Map — LARGE TABLE (MANDATORY) 

| A) Existing asset type | B) Existing asset path or name | C) Current responsibility | D) Closest Target v0 component | E) Fit score (0–3) | F) Problems / smells | G) Recommendation | H) Proposed Target placement | I) Dependencies | J) Notes | 
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | 
| route | R01: app/api/session/bootstrap/route.ts | Orchestrates observe → synthesize → frame → index for a session; passes auth headers. | Orchestration / Session Bootstrap | 2 | Monolithic orchestration; no pipeline state or idempotent job tracking. | Refactor | `/api/session/:id/bootstrap` with job tracking + idempotent steps | Depends on observe/synthesize/frame/index routes; used by UI post-save. | Good candidate for “pipeline coordinator” layer. | 
| route | R02: app/api/observe/route.ts | Extracts observation JSON from dream text + history; persists to `dream_observation` + events. | Observation | 3 | Coupled to LLM prompt and storage; lacks explicit trace IDs for evidence. | Refactor | `src/domain/observation/ObserveService.ts` + `/api/observation/extract` | Depends on `dream_sessions`, `dream_observation`, `dream_observation_events`. | Strong foundation for Target v0 Observation. | 
| route | R03: app/api/synthesize/route.ts | Generates latent analysis, anchors, candidate directions; stores snapshot in summaries and logs a synth event. | Latent Analysis | 2 | Overwrites snapshot; no versioning or append-first storage. | Refactor | `src/domain/latent/LatentSynthesizer.ts` + `/api/session/:id/latent` | Depends on `dream_observation`, `dream_session_summaries`, `direction_catalog`. | Needs append-only log integration. | 
| route | R04: app/api/frame/route.ts | Generates title + framing + recommendations; persists to summaries. | Frame + Title / Direction Recommender | 2 | Mixes framing + recommendations; recommendations are ad-hoc. | Refactor | Split into `FrameComposer` + `DirectionRecommender` routes | Depends on `dream_session_summaries`, `direction_catalog`, observation. | Good place to insert dedicated recommender. | 
| route | R05: app/api/work-block/next/route.ts | Builds next work-block via LLM using observation, latent, history; writes ledger; logs latent events. | Work Engine / CardComposer | 1 | Monolithic: selection + composition + safety + storage; low traceability for lead_in context. | Refactor | `CardMaterialSelector` + `CardComposer` + `/api/session/:id/work/next` | Depends on `work_blocks`, `dream_observation`, `work_question_ledger`, `dream_session_summaries`. | “Random context” symptoms originate here. | 
| route | R06: app/api/anchors/rank/route.ts | Ranks anchors from latent/synth + glossary + history. | Glossary Indexing / Anchor Selector | 2 | Tied to route; no durable index for occurrences. | Refactor | `src/domain/glossary/AnchorRanker.ts` | Depends on `dream_session_summaries`, `dream_glossary_items`. | Useful for Target v0 selector. | 
| route | R07: app/api/index-session/route.ts | Creates anchor summary + embedding in `dream_session_summaries`. | Observation / Retrieval Index | 2 | Summary logic tied to route; embedding not reused elsewhere. | Refactor | `src/domain/observation/SessionIndexer.ts` | Depends on `dream_sessions`, `dream_session_summaries`. | Potential retrieval layer. | 
| module | R08: src/lib/dream/observation.ts | Types + parsing/normalization for observations. | Observation | 3 | Logic is infra-level; not domain-scoped. | Keep | `src/domain/observation/schema.ts` | Used by observe/synthesize/work-block. | Good schema foundation. | 
| module | R09: src/lib/dream/observationServer.ts | Helper to check if observation exists. | Observation | 2 | Server helper only; no status lifecycle. | Refactor | `ObservationRepo.has()` | Used by frame route. | Add lifecycle/state support. | 
| module | R10: src/lib/dream/anchorsFromObservation.ts | Maps observation to anchor structure for synthesis. | Observation → Anchor Extraction | 2 | Lives outside domain; lacks trace references. | Refactor | `ObservationAnchors.ts` | Used in synth route. | Add evidence IDs for trace. | 
| module | R11: src/lib/dream/anchorRanking.ts | Collects + ranks anchors with glossary enrichment. | Glossary Indexing / Anchor Selector | 2 | No occurrence index; ranking tightly coupled to route. | Refactor | `GlossaryAnchorRanker.ts` | Depends on `dream_glossary_items`. | Good base for selector. | 
| module | R12: src/lib/dream/anchorKey.ts | Normalizes anchor keys for dedupe. | Glossary Indexing | 2 | Utility-only; not connected to glossary occurrences. | Keep | `src/domain/glossary/anchorKey.ts` | Used in observe/synthesize. | Reuse for indexing. | 
| module | R13: src/lib/dream/pickNextAnchorKey.ts | Picks unused anchor key from extracted event keys. | Work Engine (Anchor Selection) | 2 | Small helper; doesn’t consider scoring/occurrence. | Refactor | Integrate in CardMaterialSelector | Used by work-block route. | Keep as helper inside selector. | 
| module | R14: src/lib/dream/workLedger.ts | DB accessors for `work_question_ledger`. | Work Engine / Work Ledger | 2 | No domain boundary; ledger not fully used for trace. | Refactor | `WorkLedgerRepo.ts` | Used in work-block route. | Important for de-dup. | 
| module | R15: src/lib/dream/text.ts | Shared text utilities (fuzzy match, title rules, etc.). | Frame + Title | 2 | Mixed responsibilities; scattered usage. | Refactor | Split into `FrameTextUtils` / `AnchorTextUtils` | Used by frame route + others. | Keep utilities but move domain. | 
| module | R16: src/lib/startDirection.ts | Inserts `morning_direction_choices` entry. | Direction Recommendations Store | 1 | Not tied to recommendation logic; just selection logging. | Refactor | `DirectionChoiceRepo.ts` | Used by frame/direction pages. | Keep as data layer. | 
| module | R17: src/lib/types.ts | App-level domain types for sessions, directions, work blocks. | Shared Domain Types | 2 | Types mingle API + storage shapes. | Refactor | Split `domain/types` + `api/types`. | Used across UI and routes. | Good baseline. | 
| UI page | R18: app/session/[id]/(flow)/frame/page.tsx | Displays framing text + recommended directions; triggers `/api/frame`. | Frame + Title UI | 2 | Reads multiple sources (latent + summaries) with fallback logic. | Refactor | Read from dedicated “Frame + Direction Recs” store. | Depends on `dream_session_summaries`, direction catalog, `/api/frame`. | Candidate for new data contract. | 
| UI page | R19: app/session/[id]/(flow)/direction/page.tsx | Catalog + recommended directions view; stores choices. | Direction Recommendations UI | 2 | Recommendations read from summaries without provenance. | Refactor | Read from dedicated recommender store. | Depends on `direction_catalog`, `dream_session_summaries`, `morning_direction_choices`. | Needs new data source. | 
| UI page | R20: app/session/[id]/(flow)/work/page.tsx | Loads work blocks and writes answers; calls `/api/work-block/next`. | Work Engine UI | 2 | Renders `ai.context` directly; no traceability. | Refactor | Consume `WorkEngine` outputs with trace IDs. | Depends on `work_blocks`, `/api/work-block/next`. | Surface for “random context” issue. | 
| UI page | R21: app/session/[id]/page.tsx | Session overview (dream text, framing text, block list). | Session Summary UI | 1 | Reads legacy framing from `dream_sessions`. | Refactor | Use `dream_session_summaries` view. | Depends on `dream_sessions`, `work_blocks`. | Should migrate to summaries view. | 
| DB table | R22: dream_sessions | Stores raw dream text + framing audit/status. | Session Store | 2 | Framing stored in two places (`dream_sessions` + summaries). | Keep | Retain, but phase out `ai_framing_text` reads. | Core table for sessions. | Preserve raw source of truth. | 
| DB table | R23: dream_session_summaries | Stores title, framing, recommendations, latent analysis, logs. | Frame + Latent Store / Direction Rec Store | 2 | Multi-purpose; no schema/versioning for latent changes. | Refactor | Split into `frame_summary`, `latent_state`, `direction_recommendations`. | Used by frame/direction UI, routes. | Candidate for additive migration. | 
| DB view | R24: dream_session_summaries_ui | View for UI-friendly summary fields. | Frame Summary Store | 2 | Not used by UI; lacks recommended directions history. | Keep | Adopt in UI queries. | Depends on `dream_session_summaries`. | Useful abstraction. | 
| DB table | R25: morning_direction_choices | Stores chosen direction slugs per session. | Direction Choices Store | 2 | No link to recommender provenance. | Keep | `direction_choices` table with trace fields. | Used by UI + startDirection. | Add provenance columns later. | 
| DB table | R26: work_blocks | Stores work cards with AI context + answers. | Work Blocks Store | 3 | Context blob is untraceable; no material IDs. | Refactor | Add `material_id`, `trace_ids`. | Used by work UI + routes. | Core store for work. | 
| DB table | R27: direction_catalog | Stores direction definitions. | CardMaterialSelector (Direction Catalog) | 3 | None major; good data foundation. | Keep | No change; add versions if needed. | Used by frame/direction/work routes. | Good foundation. | 
| DB table | R28: evening_card_catalog | Stores evening cards. | CardMaterial Store (Evening) | 2 | Not part of Target v0 flow; side domain. | Keep | Leave untouched. | Used by evening UI. | Outside Target v0 scope. | 
| DB table | R29: evening_card_usage_log | Logs evening card usage. | Work Logging | 1 | Not in Target v0 core. | Keep | Leave as-is. | Used by evening UI. | Side domain. | 
| DB table | R30: dream_glossary_items | User glossary items. | Glossary | 2 | No occurrence indexing; no backfill on pin. | Refactor | Add `dream_glossary_occurrences` table. | Used by anchor ranking. | Needs indexing layer. | 
| DB table | R31: dream_observation | Stores latest observation snapshot. | Observation Store | 3 | Snapshot only; no version chain. | Keep | Add version history table. | Used by observe/synthesize/work routes. | Core v0 element. | 
| DB table | R32: dream_observation_events | Logs observation/synth events + anchor keys. | Observation Event Store | 2 | No formal trace IDs; no linkage to work blocks. | Refactor | Add event types + trace IDs. | Used by observe/synthesize. | Key for traceability. | 
| DB table | R33: work_question_ledger | Logs asked questions and anchors. | Work Ledger | 2 | Not fully integrated with card material selection. | Keep | Integrate into CardMaterialSelector. | Used by work-block route. | Good anti-repetition base. | 
| RPC | R34: append_latent_analysis | Appends latent analysis to log + snapshot. | Latent Analysis Log | 1 | Not used by routes. | Refactor | Use in latent update pipeline. | Depends on `dream_session_summaries`. | Enables versioned latent. | 
| RPC | R35: append_latent_log_event | Appends latent log events without updating snapshot. | Latent Analysis Log | 2 | Only used by work-block route. | Keep | Standardize log event schema. | Used by work-block route. | Needs consistent schema. | 

--- 

## (3) Gap Analysis — Target v0 Checklist (MANDATORY) 

- [PARTIAL] **Observation** — Exists via `dream_observation` + `/api/observe`, but lacks versioned history and trace IDs; introduce `observation_versions` table + domain service. 
- [PARTIAL] **Observation Event Log** — `dream_observation_events` exists but schema is thin; add event-type schema + trace IDs, connect to card context generation. 
- [PARTIAL] **Frame + Title** — `/api/frame` + summaries exist, but framing + recommendations are mixed; split into Frame composer + recommender modules. 
- [PARTIAL] **Latent Analysis** — `/api/synthesize` writes snapshots only; use `append_latent_analysis` to maintain versioned log and snapshot updates. 
- [MISSING] **Latent Analysis Versioning** — No per-answer append-only history; add `latent_versions` or use log RPC consistently. 
- [PARTIAL] **Glossary** — `dream_glossary_items` exists, but has no occurrence indexing or backfill on pin; add occurrences table + backfill job. 
- [MISSING] **Glossary Indexing** — No term ↔ session occurrences; add `dream_glossary_occurrences` keyed by session + observation anchors. 
- [PARTIAL] **Direction Recommender** — Generated inside `/api/frame`; extract to `DirectionRecommender` module with deterministic inputs. 
- [PARTIAL] **Direction Recommendations Store** — Stored in `dream_session_summaries.recommended_directions`, but without provenance/history; add new table. 
- [PARTIAL] **Work Engine** — `/api/work-block/next` performs selection + composition + safety; split into selector + composer. 
- [OK] **Work Blocks Store** — `work_blocks` table already stores work cards; add trace/material IDs. 
- [PARTIAL] **SafetyGate (pre + post)** — Safety checks exist in synth/work-block routes, but no centralized module or logging; add SafetyGate service + events table. 
- [MISSING] **CardMaterialSelector** — No dedicated selector that uses observation trace + glossary + ledger; create module to choose “material.” 
- [MISSING] **CardComposer** — No dedicated composer with trace-based input/output schema; extract from work-block route. 
- [MISSING] **Traceable Card Context** — `ai.context` is a raw string; introduce context trace IDs linked to observation evidence. 

--- 

## (4) Iterative Development Plan (MANDATORY) 

**Phase 1 — Target v0 scaffolding + read-only adapters** 
- **Goal:** Introduce domain modules that wrap current storage without changing behavior. 
- **Existing assets affected:** R02–R07, R08–R17, R23, R31–R33. 
- **New/refactored modules/routes:** `src/domain/observation/*`, `src/domain/latent/*`, `src/domain/frame/*`, `src/domain/work/*` (adapters calling existing helpers). 
- **DB changes:** None. 
- **Acceptance criteria:** New modules compile and are used in routes with identical outputs (diff-free). 
- **Risks/rollback:** Low; rollback by switching imports back to existing helpers. 

**Phase 2 — Observation trace + glossary occurrence indexing (additive)** 
- **Goal:** Add trace IDs/evidence pointers and index glossary occurrences by session. 
- **Existing assets affected:** R02, R10–R12, R30–R32. 
- **New/refactored modules/routes:** `src/domain/glossary/OccurrenceIndexer.ts`, `src/domain/observation/TraceId.ts`. 
- **DB changes:** New tables `dream_glossary_occurrences`, `dream_observation_versions` (append-only), add `trace_id` columns on events. 
- **Acceptance criteria:** New tables populated on new observations; backfill job fills existing sessions. 
- **Risks/rollback:** Index job errors; rollback by disabling indexer (read paths unchanged). 

**Phase 3 — Direction recommender + store (parallel write)** 
- **Goal:** Extract recommendation logic into a module and persist into a dedicated store. 
- **Existing assets affected:** R04, R18, R19, R23, R27. 
- **New/refactored modules/routes:** `src/domain/direction/DirectionRecommender.ts`, `/api/session/:id/directions/recommend`. 
- **DB changes:** New table `direction_recommendations` with provenance fields (inputs, model, trace_ids). 
- **Acceptance criteria:** Frame and direction UIs can read new store behind flag; legacy summary remains populated. 
- **Risks/rollback:** Recommendation divergence; keep summary fallback and allow feature flag rollback. 

**Phase 4 — Work Engine split (CardMaterialSelector + CardComposer)** 
- **Goal:** Separate selection from composition; enforce trace-based inputs. 
- **Existing assets affected:** R05, R13–R14, R20, R26, R33. 
- **New/refactored modules/routes:** `src/domain/work/CardMaterialSelector.ts`, `src/domain/work/CardComposer.ts`, `/api/session/:id/work/next`. 
- **DB changes:** Add `material_id`, `trace_ids`, `selector_meta` columns to `work_blocks`; new `work_materials` table. 
- **Acceptance criteria:** New route can create blocks with material + trace IDs; old route remains available. 
- **Risks/rollback:** Quality regression; rollback by keeping old route in use. 

**Phase 5 — Latent analysis versioning + append-only log** 
- **Goal:** Version latent analysis updates per answer and maintain snapshots. 
- **Existing assets affected:** R03, R05, R23, R34–R35. 
- **New/refactored modules/routes:** `src/domain/latent/LatentAppender.ts` using `append_latent_analysis`. 
- **DB changes:** Add `latent_version` metadata and unify log schema; optional `latent_versions` table. 
- **Acceptance criteria:** Each synth/update appends to log and updates snapshot atomically. 
- **Risks/rollback:** RPC errors; fallback to current snapshot upsert. 

**Phase 6 — SafetyGate service + events** 
- **Goal:** Centralize safety checks with pre/post hooks and persistent safety events. 
- **Existing assets affected:** R02, R03, R05. 
- **New/refactored modules/routes:** `src/domain/safety/SafetyGate.ts`, `safety_events` table. 
- **DB changes:** Add `safety_events` table (session_id, stage, flag, evidence, trace_ids). 
- **Acceptance criteria:** All AI outputs pass through SafetyGate and record events. 
- **Risks/rollback:** Over-blocking; tune rules and allow per-route bypass in emergencies. 

**Phase 7 — UI cutover to Target stores** 
- **Goal:** Switch UI reads to new store contracts (frame, directions, work blocks with trace). 
- **Existing assets affected:** R18–R21, R23–R26. 
- **New/refactored modules/routes:** Client adapters in `src/lib/api/` to read new endpoints. 
- **DB changes:** None (read-path only). 
- **Acceptance criteria:** Frame/direction/work UIs render from new stores with old fallback disabled in staging. 
- **Risks/rollback:** UI regressions; fallback to legacy read path. 

--- 

## (5) Assistant Backlog — Tasks for Specialized ChatGPT Assistants (MANDATORY) 

1) **Add observation trace IDs and version table** 
- **Scope:** Add `dream_observation_versions` table and `trace_id` fields for observation events. Exclude UI changes. 
- **Files to touch:** `supabase/migrations/*`, `src/domain/observation/TraceId.ts`, `app/api/observe/route.ts`. 
- **Input/Output contracts:** Observation event payload includes `trace_id`, `evidence_ids`. 
- **Definition of done:** New migration + observe route writes trace IDs on new events. 
- **Order/deps:** First; foundation for other tasks. 

2) **Implement glossary occurrence indexing** 
- **Scope:** Build `dream_glossary_occurrences` and index occurrences from observation anchors. Exclude UI changes. 
- **Files to touch:** `supabase/migrations/*`, `src/domain/glossary/OccurrenceIndexer.ts`, `app/api/observe/route.ts`. 
- **I/O contracts:** Input observation anchors + session_id; output occurrence rows keyed by glossary item + session. 
- **DoD:** Occurrence rows created for new observations; backfill script provided. 
- **Dependencies:** Task 1. 

3) **Extract DirectionRecommender module** 
- **Scope:** Move recommendation logic out of `/api/frame`. Exclude UI changes. 
- **Files to touch:** `src/domain/direction/DirectionRecommender.ts`, `app/api/frame/route.ts`. 
- **I/O contracts:** Input = observation summary + latent + catalog; Output = [{slug, reason}]. 
- **DoD:** Frame route calls module; outputs unchanged. 
- **Dependencies:** None. 

4) **Create Direction Recommendations Store** 
- **Scope:** Add new table + write from recommender. Exclude read-path UI changes. 
- **Files to touch:** `supabase/migrations/*`, `src/domain/direction/DirectionRecommendationRepo.ts`, `app/api/frame/route.ts`. 
- **I/O contracts:** Persist recommendations with provenance (inputs + trace_ids). 
- **DoD:** Dual-write: new table + existing summaries. 
- **Dependencies:** Task 3. 

5) **Build CardMaterialSelector** 
- **Scope:** Select next material using observation traces + ledger + glossary. Exclude composition. 
- **Files to touch:** `src/domain/work/CardMaterialSelector.ts`, `src/lib/dream/workLedger.ts`, `src/lib/dream/anchorRanking.ts`. 
- **I/O contracts:** Input = session_id + direction_slug + trace_ids + ledger; Output = material object + trace_ids. 
- **DoD:** Unit-tested selector returns deterministic choice for sample input. 
- **Dependencies:** Tasks 1–2. 

6) **Build CardComposer** 
- **Scope:** Compose lead_in/question from material + direction spec. Exclude selection. 
- **Files to touch:** `src/domain/work/CardComposer.ts`, `app/api/work-block/next/route.ts`. 
- **I/O contracts:** Input = material + direction profile + safety flags; Output = {lead_in, question, cta} with trace IDs. 
- **DoD:** Work-block route can toggle to composer with same schema. 
- **Dependencies:** Task 5. 

7) **Introduce latent append-only updates** 
- **Scope:** Switch synth route to `append_latent_analysis` and log per update. Exclude UI changes. 
- **Files to touch:** `app/api/synthesize/route.ts`, `src/domain/latent/LatentAppender.ts`. 
- **I/O contracts:** Input = latent payload + meta; Output = updated snapshot + log entry id. 
- **DoD:** Each synth call appends log entry and updates snapshot. 
- **Dependencies:** None. 

8) **SafetyGate service + events** 
- **Scope:** Centralize safety checks and log events. Exclude UI changes. 
- **Files to touch:** `src/domain/safety/SafetyGate.ts`, `supabase/migrations/*`, `app/api/observe/route.ts`, `app/api/work-block/next/route.ts`. 
- **I/O contracts:** Input = stage + text + obs flag; Output = {flag, evidence, allow}. 
- **DoD:** Safety events recorded for observe/synth/work. 
- **Dependencies:** None. 

9) **Update frame UI to read recommender store** 
- **Scope:** Read new recommendations table with fallback. Exclude visual redesign. 
- **Files to touch:** `app/session/[id]/(flow)/frame/page.tsx`, `src/lib/api/` helpers. 
- **I/O contracts:** Input = session_id; Output = list of recommended slugs with reason. 
- **DoD:** Feature flag toggles between new + legacy path. 
- **Dependencies:** Task 4. 

10) **Update work UI to use trace IDs** 
- **Scope:** Display trace-aware context and link to evidence. Exclude LLM changes. 
- **Files to touch:** `app/session/[id]/(flow)/work/page.tsx`, `src/lib/types.ts`. 
- **I/O contracts:** Input = work_block with `trace_ids`; Output = rendered context with optional evidence. 
- **DoD:** UI renders with trace fields without errors. 
- **Dependencies:** Tasks 1, 4, 6. 

--- 

## (6) Required Deep-Dive Focus Areas (MANDATORY) 

**“Random context blabla”** 
- **Origin:** The work-block route generates `lead_in` (used as `ai.context` in `work_blocks`) via LLM prompts using observation/latent/history; when anchors are missing or fallback paths are hit, the lead-in becomes generic and untraceable. 
- **Why it fails:** The UI renders `ai.context` directly with no linkage to observation evidence, so the user sees a context line with no concrete anchor trace. 
- **Trace-based fix:** Introduce a `CardMaterialSelector` that selects specific observation evidence and returns `trace_ids`; pass these to `CardComposer` so `lead_in` and question cite the chosen evidence. Store `trace_ids` on `work_blocks` for UI display and auditing. 

**Latent analysis updates** 
- **Current update point:** `/api/synthesize` upserts `dream_session_summaries.latent_analysis` as a snapshot; it is not updated on every answer (only when synth runs). 
- **Versioning:** The `append_latent_analysis` RPC exists but is not used; `append_latent_log_event` is used by work-block route only for event logging. 
- **Target fix:** Route all latent updates through `append_latent_analysis` (or new `latent_versions` table) with per-update metadata (source, answer id). 

**Direction recommendations** 
- **Current generation:** Recommendations are computed in `/api/frame` (LLM + fallback) and stored in `dream_session_summaries`. 
- **Extraction approach:** Create `DirectionRecommender` module and write outputs to a dedicated `direction_recommendations` table; frame/direction UI reads from that store with fallback to summaries. 

**Glossary** 
- **Current behavior:** `dream_glossary_items` stores user-defined terms; anchor ranking consults it but no occurrence index exists. 
- **Missing pieces:** (1) term ↔ session occurrence indexing, (2) backfill when a term is pinned, (3) safe integration into latent analysis (inject only via traceable occurrences). 
- **Proposed fix:** Add `dream_glossary_occurrences` table keyed by session + observation traces; backfill by scanning observation events. 

**Frame page data source** 
- **Current source:** Frame UI loads `dream_session_summaries` and falls back to `latent_analysis.candidate_directions` for recs. 
- **Target source:** Frame should read from dedicated frame summary + recommendation stores (e.g., `frame_summary`, `direction_recommendations`) with explicit provenance. 


