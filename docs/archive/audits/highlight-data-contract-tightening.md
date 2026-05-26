# Highlight Data Contract Tightening

## Purpose

Provide an evidence-based runtime contract audit for highlights before any cleanup/refactor, so alpha stabilization can reduce drift without changing behavior or schema.

## Runtime ownership map

### `dream_entry_highlights` (current runtime ownership)

Current responsibility at runtime:
- User-owned, raw-entry span highlights (`entry_id`, offsets, text, category, note).
- Concrete source-text salience storage used in summary/highlights UI flows.

Who writes/edits/reads:
- Read/write from summary page (client-side Supabase writes).
  - Evidence: `app/session/[id]/summary/page.tsx:471`, `:1158`, `:1205`, `:1229`
- Read/write from highlights flow page (client-side Supabase writes).
  - Evidence: `app/session/[id]/(flow)/highlights/page.tsx:136`, `:347`, `:404`, `:428`
- Read from glossary pinning helper to link glossary term IDs.
  - Evidence: `src/domain/glossary/pinHighlightToLexikon.ts:105`

AI-generated flow touch:
- No autonomous/background writer found.
- AI-derived suggestions (from frame/latent) are user-mediated; insert occurs only on user action.
  - Evidence: suggestions computed from frame/latent (`app/session/[id]/summary/page.tsx:572`, `:578`, `:592`; `app/session/[id]/(flow)/highlights/page.tsx:236`, `:242`, `:251`) then inserted on user add (`summary:1158`, `highlights:347`)

Confidence: High

### `dream_session_highlights` (current runtime ownership)

Current responsibility at runtime:
- Session-level normalized highlight/suggestion state (`label_norm`, `kind`, `source`, `source_ref`, `status`).
- API-owned lifecycle record (active state, upsert semantics, suggestion-source metadata).

Who writes/edits/reads:
- Read/write through `GET|POST /api/sessions/[sessionId]/highlights`.
  - Evidence: `app/api/sessions/[sessionId]/highlights/route.ts:58`, `:142`, `:161`
- Read by both summary/highlights pages through API fetch.
  - Evidence: `app/session/[id]/summary/page.tsx:543`; `app/session/[id]/(flow)/highlights/page.tsx:164`

Semantic overlap risk:
- Overlaps with `dream_entry_highlights` for “what counts as a highlight,” but stores session-normalized state rather than span-local offsets.
- Acts as suggestion lifecycle layer plus session highlight memory.

Confidence: High

### `dream_session_rejected_suggestions` (current runtime ownership)

Current responsibility at runtime:
- Rejection memory keyed by `suggestion_key` per `session_id`/`user_id`.

Who writes/edits/reads:
- Read in session highlights API `GET` and returned as `rejected_keys`.
  - Evidence: `app/api/sessions/[sessionId]/highlights/route.ts:66`, `:92`
- Upsert in reject API.
  - Evidence: `app/api/sessions/[sessionId]/highlights/reject/route.ts:41`, `:42`
- Delete when suggestion accepted (page-side direct delete) and when session-highlight API upsert receives matching `source_ref.suggestion_key`.
  - Evidence: `app/session/[id]/summary/page.tsx:1167`; `app/session/[id]/(flow)/highlights/page.tsx:366`; `app/api/sessions/[sessionId]/highlights/route.ts:187`, `:190`

Lifecycle summary:
- Insert/upsert on reject.
- Delete on accept.
- Read for filtering visible suggestions.

Confidence: High

## Mutation-path map

### Insert paths

- `dream_entry_highlights`
  - Summary page `onAdd` and `onCreateCustom` insert directly.
    - Evidence: `app/session/[id]/summary/page.tsx:1159`, `:1230`
  - Highlights flow `onAdd` and `onCreateCustom` insert directly.
    - Evidence: `app/session/[id]/(flow)/highlights/page.tsx:348`, `:429`

- `dream_session_highlights`
  - Session highlights API upsert/update.
    - Evidence: `app/api/sessions/[sessionId]/highlights/route.ts:160`, `:162`, `:143`

- `dream_session_rejected_suggestions`
  - Reject API upsert.
    - Evidence: `app/api/sessions/[sessionId]/highlights/reject/route.ts:41`, `:42`

### Update paths

- `dream_entry_highlights`
  - Summary `onEdit` update.
    - Evidence: `app/session/[id]/summary/page.tsx:1206`
  - Highlights flow `onEdit` update.
    - Evidence: `app/session/[id]/(flow)/highlights/page.tsx:405`

- `dream_session_highlights`
  - Session highlights API update by ID path.
    - Evidence: `app/api/sessions/[sessionId]/highlights/route.ts:143`

### Delete/reject paths

- `dream_session_rejected_suggestions`
  - Deleted page-side on acceptance in both pages.
    - Evidence: `app/session/[id]/summary/page.tsx:1168`; `app/session/[id]/(flow)/highlights/page.tsx:367`
  - Deleted API-side in `/api/sessions/[sessionId]/highlights` when accepted suggested source is saved.
    - Evidence: `app/api/sessions/[sessionId]/highlights/route.ts:190`, `:191`

### Promote/pin paths

- Pinning glossary linkage happens through domain helper `pinHighlightToLexikon`.
  - Called directly from summary/highlights pages.
    - Evidence: `app/session/[id]/summary/page.tsx:742`; `app/session/[id]/(flow)/highlights/page.tsx:294`
  - Also available via `/api/highlights/pin` (authenticated route), with no active runtime caller found in `app/src/components` search.
    - Evidence: route exists `app/api/highlights/pin/route.ts:3`, `:31`, `:39`; caller search `rg -n "/api/highlights/pin|highlights/pin" app src components` returned no hits

### Mutation-layer classification

- Page-side mutation logic:
  - Direct inserts/updates for `dream_entry_highlights`.
  - Direct deletion of rejection keys on accept.
  - Duplicate between summary and highlights pages.
- API-side mutation logic:
  - `dream_session_highlights` normalization and upsert/update.
  - Reject upsert route.
- Repository-side:
  - No dedicated highlight repositories found for the three highlight tables.
  - Table access is split between pages and API routes.
  - Evidence: table-name search in `src/db/repositories` found no highlight table ownership (`rg -n "dream_entry_highlights|dream_session_highlights|dream_session_rejected_suggestions" src/db/repositories src/domain` => only `src/domain/glossary/pinHighlightToLexikon.ts:105`)

Confidence: High

## Coupling map

### Glossary coupling — SUPPORTING

- Highlights -> glossary pin:
  - `pinHighlightToLexikon` used in summary/highlights pages and API route.
  - Evidence: `app/session/[id]/summary/page.tsx:742`; `app/session/[id]/(flow)/highlights/page.tsx:294`; `app/api/highlights/pin/route.ts:39`
- Highlights -> candidate/occurrence indexing:
  - `indexGlossaryFromHighlight` called after add/create flows with `allowCreate: false`.
  - Evidence: `summary:1174`, `:1246`, `:1182`; `highlights:373`, `:446`, `:381`, `:453`

### Summary page coupling — CORE

- Summary embeds highlight mutations and suggestion handling as part of revisit workspace.
  - Evidence: `app/session/[id]/summary/page.tsx:1158`, `:1187`, `:1205`, `:1229`

### Work generation coupling — TRANSITIONAL (indirect)

- No direct highlight table reads in work generation.
- Indirect path: highlight indexing can influence glossary terms/occurrences; work uses glossary context conditionally.
  - Evidence: highlight indexing `src/domain/glossary/indexGlossaryFromHighlight.ts:36`, `:55`; work glossary context `app/api/work-block/next/route.ts:743`, `:745`; `src/domain/work/glossary/fetchGlossaryContext.ts:175`, `:186`, `:195`

### Session revisit coupling — CORE

- Revisit behavior uses summary page highlight interactions and session-level suggestion filtering.
  - Evidence: summary fetches session highlight API `app/session/[id]/summary/page.tsx:543`

### Frame generation coupling — SUPPORTING

- Highlight suggestions derive from frame recommended directions.
  - Evidence: summary reads `frame_versions` `app/session/[id]/summary/page.tsx:572`; aggregate uses frame payloads `src/domain/highlights/aggregateSessionSuggestions.ts:58`, `:78`, `:82`

### Latent/index/anchor coupling

- Latent coupling — SUPPORTING:
  - Highlight suggestions derive from latent salient elements.
  - Evidence: summary latent fetch `app/session/[id]/summary/page.tsx:578`; aggregate latent path `src/domain/highlights/aggregateSessionSuggestions.ts:59`, `:108`
- Index/anchor coupling — UNCLEAR / minimal direct evidence:
  - No direct reads/writes of session index or anchor tables in highlight paths found by table-name search.

### Candidate generation coupling — SUPPORTING

- Highlight acceptance/creation bumps `term_candidates` and may upsert `glossary_occurrences`.
  - Evidence: `src/domain/glossary/indexGlossaryFromHighlight.ts:36`, `:55`, `:78`

### Suggestion-system coupling — CORE (for highlights UX)

- Suggestions computed from frame+latent then filtered by accepted/rejected state.
  - Evidence: `src/domain/highlights/aggregateSessionSuggestions.ts:57`, `:69`, `:108`; page filtering by rejected keys `components/HighlightsPanel.tsx:108`, `:109`

## Drift/duplication findings

1. Duplicate entry-highlight mutation logic in two pages.
- Same category mapping, text-match, insert/update/reject-delete, and glossary-indexing flow exists in:
  - `app/session/[id]/summary/page.tsx`
  - `app/session/[id]/(flow)/highlights/page.tsx`
- Evidence: paired operations at `summary:1158/1205/1229` and `highlights:347/404/428`.

2. Dual rejection-delete behavior split across page-side and API-side paths.
- Both pages delete rejection rows directly on accept.
- API session-highlights upsert path also deletes rejection key when `source_ref.suggestion_key` present.
- Evidence: `summary:1167`, `highlights:366`, API `route.ts:187-194`.

3. Mixed ownership model (page-side direct DB for entry highlights vs API-owned session highlights).
- `dream_entry_highlights` written directly by client pages.
- `dream_session_highlights` normalized and managed in API route.
- Increases risk of divergence in validation/ownership/normalization behavior.

4. Legacy/alternate pin path appears transitional.
- `/api/highlights/pin` exists, but no active caller found in runtime tree search.
- Pages use domain helper directly.

## Alpha contract recommendation

### Recommended alpha canonical roles

- `dream_entry_highlights`
  - Canonical alpha role: user-owned raw dream span highlighting (entry-local offsets/text/category/note).
- `dream_session_highlights`
  - Canonical alpha role: session-level salience/suggestion lifecycle state (normalized label/kind/source/status).
- `dream_session_rejected_suggestions`
  - Canonical alpha role: rejection memory only.

### Dual-table policy for alpha

- Keep dual-table model for alpha (no merge now).
- Treat overlap as intentional transitional boundary, not cleanup target in this phase.
- Keep glossary coupling and summary coupling in place for alpha value continuity.

### Drift boundaries to document/enforce later

- Entry-highlight mutation semantics should be behavior-identical between summary and highlights flow.
- Session-highlight normalization should remain API-owned (`normalizeLabel/Kind/Source`).
- Rejection lifecycle should have one documented accept/reject contract even if implementation is temporarily duplicated.

### Must not touch before alpha

- No schema merge/migration between entry/session highlight tables.
- No removal of glossary coupling paths.
- No summary UX redesign.

## Smallest-safe BUILD recommendation

`BUILD — Shared client mutation helper for entry-highlight add/edit/create + rejection-clear`

Scope:
- Extract current duplicated page-side mutation logic (currently in summary + highlights pages) into one shared client helper/module.
- Include:
  - `findFirstMatch`
  - `categoryFromKind(normalizeKind(...))` mapping
  - insert/update payload mapping for `dream_entry_highlights`
  - rejection-clear-on-accept delete behavior
  - existing best-effort `indexGlossaryFromHighlight(... allowCreate:false)` call pattern
- Keep semantics identical; no table/API changes.

Why this first:
- Highest duplication hotspot with lowest migration risk.
- Reduces drift probability without changing contracts, UX, or DB.

## Risks

- Client-side direct writes to `dream_entry_highlights` remain split from API-owned session highlight logic until further stabilization.
- Rejection state can drift if page/API accept paths diverge further.
- Indirect work coupling via glossary context can amplify highlight inconsistency if mutation behavior diverges.

## Follow-up tickets

1. `BUILD (small) — Shared Entry-Highlight Client Mutation Helper`
2. `AUDIT/PLAN — Session Highlight API Contract Hardening` (document exact accepted payload semantics for `source_ref` and rejection-clearing)
3. `VALIDATION — Highlights Runtime Walkthrough` (summary + highlights page parity checks)

## Search/validation summary (audit evidence collection)

Search intent:
- Find all table-level usages of highlight tables.
- Find all mutation paths (insert/update/delete/reject/pin/index).
- Find coupling points with glossary/summary/work/frame/latent.

Commands run:
- `rg -n "dream_entry_highlights|dream_session_highlights|dream_session_rejected_suggestions" app src --glob "!**/.next/**"`
- `rg -n "indexGlossaryFromHighlight|pinHighlightToLexikon|aggregateSessionSuggestions|/api/sessions/.*/highlights|/api/highlights/pin" app src --glob "!**/.next/**"`
- `rg -n "dream_entry_highlights|dream_session_rejected_suggestions|\\.insert\\(|\\.update\\(|\\.delete\\(|findFirstMatch|categoryFromKind|normalizeKind\\(|allowCreate" app/session/[id]/summary/page.tsx app/session/[id]/(flow)/highlights/page.tsx`
- `rg -n "dream_session_highlights|dream_session_rejected_suggestions|unauthorized|upsert|delete|normalizeLabel|normalizeKind|normalizeSource" app/api/sessions/[sessionId]/highlights/route.ts app/api/sessions/[sessionId]/highlights/reject/route.ts`
- `rg -n "/api/highlights/pin|highlights/pin" app src components`

Findings:
- Highlight-table runtime ownership is split across page-side `dream_entry_highlights` mutations and API-side `dream_session_*` lifecycle routes.
- Summary and highlights pages duplicate core mutation logic.
- Glossary coupling is active and deliberate (pin/index), work coupling is indirect via glossary context.
