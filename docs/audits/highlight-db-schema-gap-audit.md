# Highlight DB Schema Gap Audit

## Purpose

Identify the exact DB/schema gaps blocking reliable highlight persistence validation by comparing runtime table/column usage with migration evidence for highlight and glossary tables.

## Runtime Usage Summary

- `dream_entry_highlights` is actively read/written by summary/highlights pages and by glossary pin flow:
  - reads: `app/session/[id]/summary/page.tsx:447-451`, `app/session/[id]/(flow)/highlights/page.tsx:112-116`
  - inserts/updates: `src/domain/highlights/entryHighlightClientMutations.ts:115-119`, `src/domain/highlights/entryHighlightClientMutations.ts:142-147`
  - glossary link update: `src/domain/glossary/pinHighlightToLexikon.ts:104-111`
- `dream_session_highlights` and `dream_session_rejected_suggestions` are API-owned at:
  - `app/api/sessions/[sessionId]/highlights/route.ts:124-137`, `app/api/sessions/[sessionId]/highlights/route.ts:197-228`
  - reject upsert path: `app/api/sessions/[sessionId]/highlights/reject/route.ts:40-47`
- Highlight glossary flows touch:
  - `glossary_terms`, `glossary_notes`, `term_candidates`, `glossary_occurrences` in `src/domain/glossary/pinHighlightToLexikon.ts:50-55`, `:95-99`, `:121-127`
  - `src/domain/glossary/indexGlossaryFromHighlight.ts:85-89`, `:113-117`, plus repository-backed occurrence/candidate upserts.

## Migration / Schema Evidence

- Highlight tables are created in dedicated migrations:
  - `dream_entry_highlights`: `supabase/migrations/20260125_0001_dream_entry_highlights.sql:3-17`
  - `dream_session_highlights` + `dream_session_rejected_suggestions`: `supabase/migrations/20260201_0001_dream_session_highlights.sql:3-58`
- Highlight table follow-up columns:
  - `dream_session_highlights.note`: `supabase/migrations/20260201_0002_dream_session_highlights_note.sql:3-4`
  - `dream_entry_highlights.glossary_term_id`: `supabase/migrations/20260205_0001_dream_entry_highlights_glossary_link.sql:3-4`
- Glossary table creation exists in later migration:
  - `supabase/migrations/20260122_0001_user_glossary_items_delete.sql:6-60` (`glossary_terms`, `glossary_occurrences`, `glossary_notes`, `term_candidates`)
- But `target_v0_clean_schema` references glossary tables before creating them:
  - only `alter`/RLS/policies seen at `supabase/migrations/20260115_0002_target_v0_clean_schema.sql:380-383`, `:472-487`, `:490-491`
  - no `create table ... glossary_*` in that file.

## Table-by-Table Findings

### dream_entry_highlights

1. Runtime used: Yes.
2. Read/write:
  - reads: `app/session/[id]/summary/page.tsx:447-451`, `app/session/[id]/(flow)/highlights/page.tsx:112-116`
  - writes: `src/domain/highlights/entryHighlightClientMutations.ts:115-119`, `:142-147`
  - glossary link update: `src/domain/glossary/pinHighlightToLexikon.ts:104-111`
3. Migration create: Yes (`20260125_0001...`: `:3-17`).
4. Runtime-used columns present:
  - base columns present (`id,user_id,session_id,entry_id,start_offset,end_offset,text,category,note,created_at`) in `:3-17`
  - `glossary_term_id` added in `20260205_0001...:3-4`
5. Indexes/constraints/RLS:
  - indexes: `20260125_0001...:19-26`, glossary link index `20260205_0001...:6-7`
  - RLS + CRUD policies: `20260125_0001...:28-44`
6. Required for alpha: Yes (highlights flow + summary editing/pinning).
7. Safe to defer: No, if highlights are alpha-active.

### dream_session_highlights

1. Runtime used: Yes (`/api/sessions/[sessionId]/highlights` GET/POST).
2. Read/write:
  - select: `app/api/sessions/[sessionId]/highlights/route.ts:124-130`
  - update: `:199-205`
  - upsert: `:218-228`
3. Migration create: Yes (`20260201_0001...:3-17`).
4. Runtime-used columns present:
  - required columns (`label,label_norm,kind,source,source_ref,status,created_at,updated_at`) in `:8-16`
  - `note` added in `20260201_0002...:3-4`
5. Indexes/constraints/RLS:
  - dedup unique: `20260201_0001...:19-20`
  - RLS + read/write/update/delete policies: `:28-44`
6. Required for alpha: Yes (session-level highlight suggestion state).
7. Safe to defer: No, if summary/highlights surfaces are retained.

### dream_session_rejected_suggestions

1. Runtime used: Yes.
2. Read/write:
  - select in GET: `app/api/sessions/[sessionId]/highlights/route.ts:132-137`
  - delete on accept: `app/api/sessions/[sessionId]/highlights/route.ts:97-102`
  - reject route upsert: `app/api/sessions/[sessionId]/highlights/reject/route.ts:40-45`
3. Migration create: Yes (`20260201_0001...:51-58`).
4. Runtime-used columns present: Yes (`user_id,session_id,suggestion_key,created_at`).
5. Indexes/constraints/RLS:
  - unique: `20260201_0001...:60-61`
  - RLS policies present for select/insert/delete: `:71-80`
  - update policy missing (see gap below).
6. Required for alpha: Yes (reject lifecycle memory).
7. Safe to defer: No, if highlights lifecycle is part of alpha.

### glossary_terms

1. Runtime used: Yes (lookup/insert/listing across glossary + highlight pin/index).
2. Read/write:
  - read in summary/highlights pages with legacy fallback fields: `app/session/[id]/summary/page.tsx:477-480`, `app/session/[id]/(flow)/highlights/page.tsx:167-170`
  - insert in suggestions/pin/index: `app/glossary/suggestions/page.tsx:137-141`, `src/domain/glossary/pinHighlightToLexikon.ts:66-69`, `src/domain/glossary/indexGlossaryFromHighlight.ts:85-89`
3. Migration create: Yes (`20260122_0001...:6-14`), but not in `20260115_0002_target_v0_clean_schema.sql`.
4. Runtime-used columns present:
  - present: `id,user_id,canonical,created_at` (`20260122_0001...:6-14`), `canonical_key` (`:146-147`), `category` (`:76-77`)
  - missing from migrations but selected by UI: `canonical_name,name,term` (`app/session/[id]/summary/page.tsx:478`, `app/session/[id]/(flow)/highlights/page.tsx:168`)
5. Indexes/constraints/RLS:
  - canonical uniqueness/index: `20260122_0001...:13`, `:152-158`
  - RLS/read-write-update policies: `:70-73`, `:164-174`
6. Required for alpha: Yes (glossary + highlight pin flow + work context).
7. Safe to defer: Not if glossary/highlights stay in alpha.

### glossary_notes

1. Runtime used: Yes.
2. Read/write:
  - read glossary page/context: `app/glossary/page.tsx:109-113`, `src/domain/work/glossary/fetchGlossaryContext.ts:194-206`
  - upsert in suggestions/pin: `app/glossary/suggestions/page.tsx:146-149`, `src/domain/glossary/pinHighlightToLexikon.ts:96-99`
3. Migration create: Yes (`20260122_0001...:36-43`).
4. Runtime-used columns present:
  - present: `term_id,user_id,content,created_at` (`20260122_0001...:36-43`)
  - `updated_at` added by `20260207_0002...:18-19`
  - `do_not_surface` is referenced by runtime fallback query (`src/domain/work/glossary/fetchGlossaryContext.ts:196-206`) but no migration creates it.
5. Indexes/constraints/RLS:
  - index on term/time: `20260122_0001...:45-46`
  - unique for upsert key `(user_id, term_id)`: `20260207_0002...:26-27`
  - RLS/read-write-update policies: `20260122_0001...:70-73`, `:164-174`
6. Required for alpha: Supporting (notes are part of glossary memory UX).
7. Safe to defer: `do_not_surface` can be deferred because runtime has fallback query, but contract remains split.

### term_candidates

1. Runtime used: Yes.
2. Read/write:
  - reads in glossary pages: `app/glossary/page.tsx:139-141`, `app/glossary/suggestions/page.tsx:74-76`
  - write/upsert/delete in index/pin/suggestions: `src/domain/glossary/indexGlossaryFromHighlight.ts:113-117`, `src/domain/glossary/pinHighlightToLexikon.ts:127`, `app/glossary/suggestions/page.tsx:154`
  - repository upsert: `src/db/repositories/glossaryRepo.ts:267-294`
3. Migration create: Yes (`20260122_0001...:48-60`).
4. Runtime-used columns present:
  - present: `id,user_id,term,count,last_seen_at,created_at,updated_at` (`:48-60`)
  - `display_label` added in `20260123_0001...:3-4`
5. Indexes/constraints/RLS:
  - unique `(user_id,term)`: `20260122_0001...:59`
  - count index + updated_at trigger: `:62-68`
  - RLS/read-write-update policies: `:70-73`, `:164-174`
6. Required for alpha: Supporting (candidate memory pipeline).
7. Safe to defer: Not if glossary candidate UX remains active.

### glossary_occurrences

1. Runtime used: Yes.
2. Read/write:
  - upserted by glossary indexing/repo: `src/db/repositories/glossaryRepo.ts:234-243`
  - read in work glossary context: `src/domain/work/glossary/fetchGlossaryContext.ts:185-190`
3. Migration create: Yes (`20260122_0001...:19-28`).
4. Runtime-used columns present:
  - base columns present: `term_id,session_id,user_id,source,created_at` (`:19-28`)
  - `count` added in `20260207_0001...:3-4` and runtime has fallback when missing (`src/db/repositories/glossaryRepo.ts:97-114`, `:238-243`)
5. Indexes/constraints/RLS:
  - PK altered to `(user_id,term_id,session_id)` in `20260122_0001...:177-181` matching upsert conflict key in repo (`src/db/repositories/glossaryRepo.ts:236`)
  - RLS/read-write-update policies: `20260122_0001...:70-73`, `:164-174`
6. Required for alpha: Supporting (recurrence/work context).
7. Safe to defer: Not if glossary/work recurrence features are retained.

## Missing Tables / Columns / Policies

1. Migration-chain gap for glossary base tables in "target v0 clean schema":
   - `supabase/migrations/20260115_0002_target_v0_clean_schema.sql` applies RLS/policies/alter statements to glossary tables (`:380-383`, `:472-491`) but does not create those tables.
   - Actual table creation is in `20260122_0001_user_glossary_items_delete.sql:6-60`.
   - If an environment applied only the 20260115/20260121/202602xx subset, glossary tables may be missing.

2. Runtime-selected but unmigrated glossary_terms legacy columns:
   - `canonical_name`, `name`, `term` are selected by summary/highlights pages (`app/session/[id]/summary/page.tsx:478`, `app/session/[id]/(flow)/highlights/page.tsx:168`).
   - No migration in `supabase/migrations/*.sql` adds these columns.

3. Policy gap risk on `dream_session_rejected_suggestions`:
   - Runtime uses `upsert` (`app/api/sessions/[sessionId]/highlights/reject/route.ts:42-45`).
   - Table has select/insert/delete policies but no update policy (`20260201_0001...:71-80`).
   - Conflict path of upsert may require update permission depending on execution path.

4. Optional but unmigrated `glossary_notes.do_not_surface`:
   - Queried by work glossary context with fallback (`src/domain/work/glossary/fetchGlossaryContext.ts:194-206`).
   - No migration adds `do_not_surface`.

## Alpha Impact

- Highlights persistence itself (`dream_entry_highlights`, `dream_session_highlights`, `dream_session_rejected_suggestions`) is mostly covered by migrations.
- Confidence-breaking gaps are around glossary coupling used by highlight pin/index and selection UIs:
  - Missing glossary base tables in certain migration chains will break pin/index and suggestions entirely.
  - Missing `glossary_terms` legacy columns can silently degrade glossary term options in summary/highlights pages (query error path -> empty list).
  - Rejection upsert policy gap can cause intermittent reject persistence failures on conflict.
- If highlights + glossary are part of alpha, these are not safe to ignore.

## Recommended Options

### Option A — Add minimal missing highlight migrations now

- Add bounded migrations to close concrete contract gaps:
  - ensure glossary table create order is guaranteed for active migration path,
  - either add legacy `glossary_terms` columns used by current selects or remove those selects in code (not in this ticket),
  - add update policy for `dream_session_rejected_suggestions` if upsert conflict requires it,
  - optionally add `glossary_notes.do_not_surface` for explicit contract.
- Best for keeping active alpha runtime surfaces reliable.

### Option B — Defer to full alpha DB rebuild

- Acceptable only if:
  - alpha DB will be rebuilt from a verified, complete migration chain before public usage,
  - and no production-like environment depends on current partial chain.
- Higher operational risk until rebuild is complete.

### Option C — Temporary feature gate highlights until schema exists

- Disable highlight+glossary dependent actions until schema is verified.
- Lowest data-risk, highest product-impact.

## Recommended Next Step

Choose **Option A** as the smallest reliable path for active alpha features:

1. Produce a build ticket for **minimal schema contract patch** (migrations only, no runtime behavior change).
2. Include preflight SQL checks in that ticket for:
   - glossary table existence,
   - `glossary_terms` selected columns,
   - rejected-suggestion policy sufficiency for upsert conflict path.

## Risks

- Schema drift across environments due to migration-chain assumptions.
- Hidden feature degradation where runtime catches query errors and falls back to empty UI state.
- Intermittent reject lifecycle failures if upsert conflict path hits missing update policy.

## Non-Goals

- No runtime code/API changes.
- No migration authoring in this ticket.
- No highlight/glossary product redesign.
