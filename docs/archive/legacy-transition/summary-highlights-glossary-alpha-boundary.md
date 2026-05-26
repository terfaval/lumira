# Summary + Highlights + Glossary Alpha Boundary

## Purpose

Define a clear alpha boundary for summary, highlights, glossary, and candidate-term behavior so these systems stay product-useful during public alpha without uncontrolled scope growth.

## Owner Decisions Captured

- Summary remains alpha-relevant as a reflective dream workspace/dashboard.
- Highlights remain alpha-relevant as user-owned salience and validation signals.
- Glossary remains alpha-relevant as personal recurring memory, not a universal symbol engine.
- Candidate terms should primarily come from observation-derived material.
- Work can use glossary context gently, but glossary must not dominate or override current-dream context.
- Dream-map/graph-heavy/symbol-authoritative directions remain deferred or post-alpha.

## Alpha Product Role

### Summary

Summary is the per-dream workspace for reviewing raw dream text, highlights, framing, salient elements, direction options, and saved work cards, plus a re-entry point into work flow.

### Highlights

Highlights are explicit user meaning markers and salience signals. They support reflective review and selective promotion into glossary continuity memory.

### Glossary

Glossary is a personal continuity layer for recurring motifs across sessions, with optional notes and recurrence tracking, not an interpretation authority.

## Current Runtime Inventory

### Routes / Pages

- `/session/[id]/summary` renders the reflective workspace and orchestrates highlights/suggestion actions.  
  Evidence: `app/session/[id]/summary/page.tsx:369`, `:1127`, `:1307`, `:1363`  
  Confidence: High
- `/session/[id]/(flow)/highlights` renders dedicated highlight workflow with suggestions and glossary pinning.  
  Evidence: `app/session/[id]/(flow)/highlights/page.tsx:9`, `:136`, `:251`, `:347`  
  Confidence: High
- `/glossary` manages approved terms, notes, candidate promotion, and recurrence backfill calls.  
  Evidence: `app/glossary/page.tsx:105`, `:122`, `:152`, `:201`, `:368`  
  Confidence: High
- `/glossary/suggestions` manages candidate review/accept/reject workflow.  
  Evidence: `app/glossary/suggestions/page.tsx:86`, `:126`, `:150`, `:166`  
  Confidence: High

### API Endpoints

- `GET /api/session-summary` aggregates session/frame/latent/work/answers/directions/catalog.  
  Evidence: `app/api/session-summary/route.ts:57`, `:64`, `:73`, `:77`, `:84`, `:90`, `:95`  
  Confidence: High
- `GET|POST /api/sessions/[sessionId]/highlights` reads/writes `dream_session_highlights` and rejected keys.  
  Evidence: `app/api/sessions/[sessionId]/highlights/route.ts:58`, `:66`, `:142`, `:161`, `:174`, `:190`  
  Confidence: High
- `POST /api/sessions/[sessionId]/highlights/reject` records rejected suggestions.  
  Evidence: `app/api/sessions/[sessionId]/highlights/reject/route.ts:41`, `:44`  
  Confidence: High
- `POST /api/highlights/pin` pins highlight-to-glossary via glossary domain helper.  
  Evidence: `app/api/highlights/pin/route.ts:3`, `:39`  
  Confidence: High
- `POST /api/glossary/backfill-candidates` and `POST /api/glossary/backfill-occurrences` support candidate/occurrence backfills (admin-gated candidate backfill).  
  Evidence: `app/api/glossary/backfill-candidates/route.ts:7`, `:38`, `:48`; `app/api/glossary/backfill-occurrences/route.ts:47`, `:82`  
  Confidence: High

### DB Tables

- Summary runtime reads: `dream_sessions`, `dream_entries`, `work_versions`, `dream_answers`, `session_directions` (+ latest repos for frame/latent).  
  Evidence: `app/api/session-summary/route.ts:57`, `:64`, `:77`, `:84`, `:90`  
  Confidence: High
- Highlights runtime tables: `dream_entry_highlights`, `dream_session_highlights`, `dream_session_rejected_suggestions`.  
  Evidence: `app/session/[id]/summary/page.tsx:471`; `app/api/sessions/[sessionId]/highlights/route.ts:58`, `:66`; `app/api/sessions/[sessionId]/highlights/reject/route.ts:41`  
  Confidence: High
- Glossary runtime tables: `glossary_terms`, `glossary_notes`, `term_candidates`, `glossary_occurrences`.  
  Evidence: `app/glossary/page.tsx:105`, `:122`, `:152`; `src/domain/work/glossary/fetchGlossaryContext.ts:175`, `:186`, `:195`; `src/domain/glossary/indexGlossaryFromObservation.ts:54`, `:68`  
  Confidence: High

### Jobs / Side Effects

- Observation job performs best-effort glossary indexing (candidate + occurrence side effects) and swallows errors.  
  Evidence: `src/orchestration/jobs/jobExtractObservation.ts:68`, `:71`  
  Confidence: High
- `indexGlossaryFromObservation` extracts observation candidates, bumps `term_candidates`, and upserts `glossary_occurrences` only for existing glossary terms.  
  Evidence: `src/domain/glossary/indexGlossaryFromObservation.ts:18`, `:23`, `:41`, `:54`, `:68`  
  Confidence: High
- `indexGlossaryFromHighlight` also bumps candidates and optionally occurrences/create paths (depending on arguments).  
  Evidence: `src/domain/glossary/indexGlossaryFromHighlight.ts:34`, `:45`, `:72`, `:86`, `:114`  
  Confidence: High
- Work route only fetches glossary context on anchor-selected material; glossary is optional in compose input.  
  Evidence: `app/api/work-block/next/route.ts:743`, `:745`, `:753`, `:758`  
  Confidence: High

### UI Components

- `HighlightsPanel` is the shared interaction surface for highlight suggestion/add/edit/reject/pin flows.  
  Evidence: `components/HighlightsPanel.tsx`, `app/session/[id]/summary/page.tsx:1127`, `app/session/[id]/(flow)/highlights/page.tsx:297`  
  Confidence: High
- Summary page composes `DirectionTile` and `WorkCard` into dashboard behavior.  
  Evidence: `app/session/[id]/summary/page.tsx:10`, `:11`, `:1007`, `:1339`  
  Confidence: High

## Alpha Classification

Use:
- KEEP
- SIMPLIFY
- DEFER
- POST-ALPHA
- UNCLEAR

### Keep for Alpha

- Summary workspace route/API (`/session/[id]/summary`, `/api/session-summary`) as revisit and re-entry surface.  
  Evidence: `app/session/[id]/summary/page.tsx:369`, `app/api/session-summary/route.ts:57`  
  Confidence: High
- Highlights capture/edit/reject flows and highlight suggestion aggregation from frame/latent.  
  Evidence: `app/session/[id]/(flow)/highlights/page.tsx:251`, `app/api/sessions/[sessionId]/highlights/route.ts:58`  
  Confidence: High
- Glossary term memory (terms + notes + recurrence context) and suggestion review UX.  
  Evidence: `app/glossary/page.tsx:105`, `:122`, `:152`; `app/glossary/suggestions/page.tsx:86`  
  Confidence: High
- Observation-derived candidate indexing path.  
  Evidence: `src/orchestration/jobs/jobExtractObservation.ts:71`, `src/domain/glossary/glossaryCandidateExtractor.ts:87`  
  Confidence: High
- Gentle glossary context in work (anchor-only conditional fetch).  
  Evidence: `app/api/work-block/next/route.ts:743`  
  Confidence: High

### Simplify for Alpha

- Duplicate highlight logic between summary page and highlights flow page should be bounded (same actions implemented in both).  
  Evidence: `app/session/[id]/summary/page.tsx:1158`, `:1174`; `app/session/[id]/(flow)/highlights/page.tsx:347`, `:373`  
  Confidence: High
- Mixed highlight storage model (`dream_entry_highlights` and `dream_session_highlights`) needs a clearer alpha contract to reduce drift.  
  Evidence: `app/session/[id]/summary/page.tsx:471`, `app/api/sessions/[sessionId]/highlights/route.ts:58`  
  Confidence: Medium
- Glossary/admin gating and candidate backfill controls should be explicitly scoped for alpha rollout (currently admin-gated in multiple places).  
  Evidence: `app/glossary/page.tsx:16`, `:83`; `app/glossary/suggestions/page.tsx:16`, `:55`; `app/api/glossary/backfill-candidates/route.ts:38`  
  Confidence: High
- Candidate flow currently has both observation and highlight-origin increments; weighting/priority needs explicit alpha rule.  
  Evidence: `src/domain/glossary/indexGlossaryFromObservation.ts:23`; `src/domain/glossary/indexGlossaryFromHighlight.ts:34`  
  Confidence: High

### Defer for Alpha

- Heavy automated candidate backfill operations as normal user workflow (keep as maintenance tooling, not primary UX path).  
  Evidence: `app/api/glossary/backfill-candidates/route.ts:38`, `:48`; `app/api/glossary/backfill-occurrences/route.ts:77`  
  Confidence: Medium
- Additional interpretive automation beyond existing light candidate/occurrence indexing.  
  Evidence: current behavior is best-effort and constrained in glossary indexers (`indexGlossaryFromObservation.ts`, `indexGlossaryFromHighlight.ts`)  
  Confidence: Medium

### Post-alpha Backlog

- Richer recurrence weighting and cross-session reflective intelligence tied to highlights + glossary + latent.
- Cleaner unified highlight domain contract and de-duplication of page-side mutation logic.
- Expanded summary intelligence features beyond current dashboard baseline.
- Advanced social/relationship graphing, symbolic engines, and prediction-heavy scoring systems.

### Unclear / Needs Decision

- Should glossary pages remain admin-gated at alpha launch or open to all authenticated users?  
  Evidence: `app/glossary/page.tsx:16`, `:83`; `app/glossary/suggestions/page.tsx:16`, `:55`  
  Confidence: High
- Whether `dream_session_highlights` should remain active alongside `dream_entry_highlights` or be narrowed to one canonical write model for alpha.  
  Evidence: `app/api/sessions/[sessionId]/highlights/route.ts:58`; `app/session/[id]/summary/page.tsx:471`  
  Confidence: Medium
- Whether `allowCreate` paths in highlight indexing should stay disabled in alpha UI flows by policy only or by stricter runtime boundaries.  
  Evidence: `app/session/[id]/summary/page.tsx:1182`, `:1253`; `src/domain/glossary/indexGlossaryFromHighlight.ts:72`  
  Confidence: Medium

## Glossary Candidate Policy

### Source of candidates

- Primary source: observation-derived extraction from `entities` and `scenes` structures.  
  Evidence: `src/domain/glossary/glossaryCandidateExtractor.ts:87-106`  
  Confidence: High
- Secondary source: user highlight indexing can increment candidate counts but should remain subordinate to observation-driven recurrence.  
  Evidence: `src/domain/glossary/indexGlossaryFromHighlight.ts:34`  
  Confidence: High

### Candidate threshold / recurrence

- Candidate extraction already applies hard filters (max 2 words, max 40 chars, punctuation limits, generic-token guards).  
  Evidence: `src/domain/glossary/glossaryCandidateExtractor.ts:14`, `:15`, `:32-37`; `src/domain/glossary/glossaryCandidateRules.ts:22-41`  
  Confidence: High
- Alpha policy: use recurrence (`term_candidates.count`, `glossary_occurrences`) as a surfacing signal, not as auto-promotion.

### User confirmation

- Candidate-to-term promotion requires explicit user action (approve/add in glossary UI), with optional note entry.  
  Evidence: `app/glossary/page.tsx:272`, `:286`, `:292`; `app/glossary/suggestions/page.tsx:150`, `:159`, `:166`  
  Confidence: High

### Where candidates may surface

- Glossary main page (top candidates), glossary suggestions page, and highlight suggestion contexts.  
  Evidence: `app/glossary/page.tsx:152`, `:494`; `app/glossary/suggestions/page.tsx:86`; `app/session/[id]/summary/page.tsx:1127`  
  Confidence: High

### What candidates must not do

- Must not auto-create authoritative meanings.
- Must not override current dream evidence.
- Must not force work direction selection.

## Highlights Policy

### User meaning marker

- Highlights represent user-marked relevance in dream text (`dream_entry_highlights`) and suggestion state (`dream_session_highlights` / rejected suggestions).  
  Evidence: `app/session/[id]/summary/page.tsx:471`; `app/api/sessions/[sessionId]/highlights/route.ts:58`, `:66`  
  Confidence: High

### Validation signal

- Highlights function as explicit confirmation signals that can feed recurrence/candidate updates through glossary indexing helpers.  
  Evidence: `app/session/[id]/summary/page.tsx:1174`, `:1246`; `src/domain/glossary/indexGlossaryFromHighlight.ts:34`  
  Confidence: High

### Interaction with glossary

- Pinning to glossary is explicit (`/api/highlights/pin` + `pinHighlightToLexikon`) and may update glossary linkage.  
  Evidence: `app/api/highlights/pin/route.ts:39`; `app/session/[id]/(flow)/highlights/page.tsx:267`  
  Confidence: High

### Interaction with summary

- Summary embeds `HighlightsPanel` and exposes add/edit/reject/pin behaviors directly inside the workspace.  
  Evidence: `app/session/[id]/summary/page.tsx:1127`, `:1187`, `:1339`  
  Confidence: High

## Summary Page Policy

### Required alpha role

- Keep summary as reflective dashboard: raw entry, framing, salient elements, highlights, cards, and direction re-entry.
- Keep summary as stable revisit point and bridge back to `/work`.

### Optional alpha enhancements

- Minor UX improvements for clarity and consistency.
- Better dedupe of repeated highlight mutation code between summary and highlights flow.
- Better surfacing hierarchy for candidates vs pinned terms.

### What not to build now

- Heavy graph UI.
- Symbolic-authoritative interpretation layers.
- Prediction-led scoring features that outrun current evidence quality.

## Work Integration Policy

### Allowed alpha usage

- Glossary context fetch is allowed only as optional context when anchor-selected material provides relevant keys.
- Glossary note/context may shape wording gently.

### Not allowed alpha usage

- Glossary may not override selected material, frame context, or user answers.
- Glossary may not hard-force direction or card progression.

### Strong-signal exception

- If recurrence is strong and user salience confirms it (highlights + repeated occurrences), glossary may be elevated as a prompting hint, still non-authoritative and optional.

## Risks

- Boundary drift from dual highlight data paths and duplicated page-side mutation logic.
- Candidate overproduction if highlight-derived increments are not kept secondary to observation-derived extraction.
- Admin gating inconsistency versus public-alpha product positioning for glossary/suggestions pages.
- Work prompt quality drift if glossary context is over-weighted outside anchor-driven pathways.

## Recommended Next Tickets

1. `AUDIT/PLAN — Glossary Access Gate Decision`: decide and document alpha access model (admin-only vs authenticated users) for `/glossary` and `/glossary/suggestions`.
2. `AUDIT/PLAN — Highlight Data Contract`: define alpha-canonical responsibilities for `dream_entry_highlights` vs `dream_session_highlights`.
3. `BUILD (small) — Shared Highlights Mutation Helper`: de-duplicate summary/highlights page mutation paths without changing product behavior.
4. `BUILD (small) — Candidate Source Weight Guard`: codify observation-primary vs highlight-secondary candidate policy in one explicit boundary (no redesign).
5. `VALIDATION — Summary/Highlights/Glossary Runtime Walkthrough`: manual runbook for end-to-end alpha checks (`summary`, `highlight add/edit/reject/pin`, `candidate approve/reject`, `work context influence`).

## Non-Goals

- No runtime implementation redesign in this ticket.
- No DB/schema/migration cleanup in this ticket.
- No dream-map, archetype expansion, graph UI, or symbolic authority work.
- No work-engine redesign beyond boundary policy definition.
