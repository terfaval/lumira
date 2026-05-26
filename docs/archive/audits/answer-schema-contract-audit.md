# Answer Schema Contract Audit

## Purpose

Establish an evidence-based view of the **current** `dream_answers` contract across DB schema and runtime usage, without changing code or schema.

## Owner Context

A dream is one session. Inside a session, user continuity depends on question-answer cards (`work_versions` rows used as work blocks). Answer attachment must remain stable between generation and later reads.

## Files and SQL Reviewed

- `app/session/[id]/(flow)/work/page.tsx`
- `app/api/work/answer/route.ts`
- `app/api/work-block/next/route.ts`
- `app/api/work/persist/route.ts`
- `app/session/[id]/page.tsx`
- `app/api/session-summary/route.ts`
- `app/session/[id]/summary/page.tsx`
- `src/lib/archive.ts`
- `app/api/session/submit/route.ts`
- `app/api/session/ensure/route.ts`
- `supabase/migrations/20260115_0002_target_v0_clean_schema.sql`
- `supabase/migrations/MVP/20260113090000_add_dream_observation_events_question_ledger.sql`
- migration search over `supabase/migrations/**` for `dream_answers`, `work_id`, `work_block_id`, `answer_text`, `content`

## Actual DB Schema

### dream_answers

Fields found:
- `id uuid primary key default gen_random_uuid()`
- `session_id uuid not null references public.dream_sessions(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `work_id uuid`
- `content text not null`
- `created_at timestamptz not null default now()`

Constraints:
- primary key: `id`
- not-null: `session_id`, `user_id`, `content`, `created_at`
- RLS enabled with own-row policies (`read_own_answers`, `write_own_answers`, `delete_own_answers`)

Indexes:
- `idx_dream_answers_session_created (session_id, created_at asc)`
- `idx_dream_answers_user_created (user_id, created_at desc)`

Foreign keys:
- `session_id -> public.dream_sessions(id)`
- `user_id -> auth.users(id)`

Triggers:
- No `dream_answers` trigger found in repo migrations.

Views or aliases:
- No `dream_answers` view/alias found in repo migrations.

Evidence:
- `supabase/migrations/20260115_0002_target_v0_clean_schema.sql` (table + indexes + RLS policies)
- repo-wide migration search for `dream_answers`/views/triggers

Confidence:
- High for repo-defined schema
- Unclear for live deployed DB drift (cannot introspect runtime DB from this ticket)

## Runtime Write Paths

For each write path:

- file
  - `app/api/work/answer/route.ts`
- route/API
  - `POST /api/work/answer`
- fields written
  - writes to `dream_answers`: `session_id`, `user_id`, `work_id`, `content`
- target table/view
  - `public.dream_answers` table
- evidence
  - insert block in `app/api/work/answer/route.ts`
- confidence
  - High

Additional notes:
- `app/api/work/persist/route.ts` does not write `dream_answers`; it writes `work_versions`/`work_latest` only.
- `app/api/session/submit/route.ts` and `app/api/session/ensure/route.ts` only read `dream_answers` ids for material hash composition.

## Runtime Read Paths

For each read path:

- file
  - `app/session/[id]/(flow)/work/page.tsx`
- route/API/component
  - Work UI page loader
- fields read
  - `work_id`, `content`, `created_at`
- source table/view
  - `dream_answers` table
- downstream use
  - map latest answer by work block id and inject into card `content.user.answer`
- evidence
  - `answersQuery = supabase.from("dream_answers").select("work_id, content, created_at")`
- confidence
  - High

- file
  - `app/session/[id]/page.tsx`
- route/API/component
  - Session overview page loader
- fields read
  - `work_id`, `content`, `created_at`
- source table/view
  - `dream_answers`
- downstream use
  - work summary answered-state
- evidence
  - select on `dream_answers` with `work_id, content, created_at`
- confidence
  - High

- file
  - `app/api/session-summary/route.ts`
- route/API/component
  - `GET /api/session-summary`
- fields read
  - `work_id`, `content`, `created_at`
- source table/view
  - `dream_answers`
- downstream use
  - returns `dream_answers` DTO for summary UI
- evidence
  - query + mapped response fields
- confidence
  - High

- file
  - `app/session/[id]/summary/page.tsx`
- route/API/component
  - summary client page consuming DTO
- fields read
  - expects `work_id`, `content`, `created_at` in DTO
- source table/view
  - via `/api/session-summary`
- downstream use
  - answer merge into direction card content
- evidence
  - `type WorkAnswerRow = { work_id: string | null; content: string; created_at: string }`
- confidence
  - High

- file
  - `src/lib/archive.ts`
- route/API/component
  - archive data loader
- fields read
  - `work_id`, `content`, `created_at`
- source table/view
  - `dream_answers`
- downstream use
  - answered-card counters and status
- evidence
  - `supabase.from("dream_answers").select("work_id, content, created_at")`
- confidence
  - High

- file
  - `app/api/work-block/next/route.ts`
- route/API/component
  - `POST /api/work-block/next` (question generation continuity)
- fields read
  - `answer_text`, `work_block_id`, `created_at`
- source table/view
  - query attempts on `dream_answers`
- downstream use
  - previous answer text and previous prompt linkage for next-question continuity
- evidence
  - `fetchLatestAnswerText()` and `fetchLatestWorkPromptFromLastAnswer()` selects
- confidence
  - Medium (field presence may fail and is silently treated as no-answer path)

## Concept Mapping

### work_id vs work_block_id

Finding:
- Runtime concept appears intended to be the same: the id of the relevant work block (`work_versions.id`).
- Current repo schema evidence only defines `dream_answers.work_id`; no migration defines `dream_answers.work_block_id`.
- One active API (`/api/work-block/next`) reads `work_block_id` from `dream_answers`, which does not match repo schema.

Evidence:
- write path: `app/api/work/answer/route.ts` receives `work_block_id` input then writes it into `work_id`
- read path mismatch: `app/api/work-block/next/route.ts` reads `work_block_id`
- schema: `supabase/migrations/20260115_0002_target_v0_clean_schema.sql` defines `work_id`, no `work_block_id` on `dream_answers`

Confidence:
- Medium

### content vs answer_text

Finding:
- Runtime concept appears intended to be the same: user answer text.
- Repo schema and most runtime readers/writers use `content`.
- `work-block/next` reads `answer_text`, which does not match repo schema evidence.

Evidence:
- write path: `app/api/work/answer/route.ts` writes `content`
- most readers: work/session/summary/archive use `content`
- mismatch reader: `app/api/work-block/next/route.ts` reads `answer_text`

Confidence:
- Medium

## Active User-Facing Flow

Active answer submission path from work page:
- `app/session/[id]/(flow)/work/page.tsx` calls `POST /api/work/answer` with `work_block_id` and `answer_text`.
- `app/api/work/answer/route.ts` validates work block in `work_versions`, then writes answer into `dream_answers(work_id, content)`.

Active answer read path for user-facing display:
- Work page itself reads `dream_answers(work_id, content, created_at)` directly.
- Session overview, summary API/page, and archive utilities also read `work_id/content`.

Continuity path used during next-question generation:
- `POST /api/work-block/next` attempts to read `dream_answers.answer_text` and `dream_answers.work_block_id`.

Evidence:
- `app/session/[id]/(flow)/work/page.tsx`
- `app/api/work/answer/route.ts`
- `app/api/work-block/next/route.ts`
- `app/session/[id]/page.tsx`
- `app/api/session-summary/route.ts`
- `src/lib/archive.ts`

Confidence:
- High for submit/display flow
- Medium for continuity flow due to schema-field mismatch

## Compatibility / Migration Signals

- No migration found that adds `answer_text` or `work_block_id` to `dream_answers`.
- No view/alias/trigger found that maps `dream_answers.content <-> answer_text` or `work_id <-> work_block_id`.
- Legacy MVP migrations include `work_blocks.content` JSON and ledger sync functions/triggers, indicating older answer storage via `work_blocks` JSON, not `dream_answers.answer_text` columns.
- `work_question_ledger` has a `work_block_id` column, but this is a different table and does not imply `dream_answers.work_block_id`.

Evidence:
- `supabase/migrations/20260115_0002_target_v0_clean_schema.sql`
- `supabase/migrations/MVP/20260113090000_add_dream_observation_events_question_ledger.sql`
- `supabase/migrations/20260129_0001_pin_function_search_path.sql`
- `supabase/migrations/20260129_0002_pin_dump_and_sync_functions.sql`
- `supabase/migrations/20260129_0003_codify_sync_ledger_trigger.sql`

## Risk Assessment

- data loss risk: Medium
  - Answer writes appear persisted (`work_id/content`), but continuity route may fail to reuse them if it reads non-existent columns.

- broken continuity risk: High
  - `work-block/next` continuity fetch uses `answer_text/work_block_id`; if unavailable, compose context may lose previous answer linkage.

- silent write/read mismatch risk: High
  - Write and most reads use one contract; next-question continuity reads a different contract.

- alpha cleanup risk: Medium
  - Real usage is low, which lowers migration blast radius, but mismatch can hide until tester sessions increase.

## Recommended Next Step

4. Full alpha answer schema simplification plan

Why:
- There is a cross-path contract mismatch in core continuity logic, not just one isolated endpoint typo.
- Multiple user-facing readers already align on `work_id/content`; one core generator path diverges.
- A narrow patch could fix immediate breakage, but alpha would benefit from one explicit, audited contract and one migration-safe alignment plan.

## Suggested Alpha Contract

Proposal only (not applied in this ticket):
- `dream_answers.session_id` (required)
- `dream_answers.work_version_id` (or canonical `work_block_id`) (required FK to `work_versions.id`)
- `dream_answers.answer_content` (required text)
- `dream_answers.created_at` (required)
- optional metadata: `direction_slug`, `ordinal`, `trace_ref` (nullable)

Proposal notes:
- Keep one canonical naming set across all write/read paths.
- Keep compatibility shim only temporarily and document explicit removal condition.

## Open Questions

- Is the live Vercel/Supabase DB schema identical to repo migrations for `dream_answers`? (Unclear in this ticket.)
- Was `app/api/work-block/next` intentionally moved to `answer_text/work_block_id` ahead of migrations, or is it stale drift?
- Should canonical naming follow existing broad usage (`work_id/content`) for fast alignment, or be renamed once for clarity (`work_block_id/answer_text` or `work_version_id/answer_content`)?
- Is `work_id` intended to reference `work_versions.id` formally (FK) in alpha cleanup?
