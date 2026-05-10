# Alpha Answer Contract

## Purpose

Define one clear public-alpha answer contract so answer persistence, answer display, and next-question continuity all use the same semantics.

## Background

The answer schema audit found contract drift between:
- persisted/read paths using `work_id` + `content`
- continuity generation path reading `work_block_id` + `answer_text`

No migration/view/trigger alias was found in repo history that reconciles these names automatically.

## Owner Context

A dream is one session. Inside a session, users answer generated work cards (work blocks). The answer must attach to the exact card and remain reusable for:
- work UI display
- session summary
- archive status
- next-card continuity
- later reflection history

## Current Runtime Problem

Current runtime behavior is split:
- `app/api/work/answer/route.ts` writes `dream_answers.work_id` and `dream_answers.content`
- work/session/summary/archive readers consume `work_id/content`
- `app/api/work-block/next/route.ts` continuity reads `answer_text/work_block_id`

Resulting risk: user answers can appear saved in UI while continuity context can miss them.

## Design Decision

### Canonical Entity

Canonical alpha answer entity is `dream_answers`.

### Canonical Relationship

One answer row references one generated work card row:
- `dream_answers.work_block_id -> work_versions.id`

The relation is card-centric, not generic “work” centric.

### Canonical Fields

Preferred alpha contract:
- `id`
- `session_id`
- `user_id`
- `work_block_id`
- `answer_content`
- `created_at`

Optional future metadata (non-required):
- direction slug snapshot
- ordinal
- trace reference

### Naming Decision

Decisions:
- `work_block_id` should be alpha canonical field name: **Yes**
- `answer_content` should be alpha canonical field name: **Yes**
- Existing `work_id/content` should be transitional naming: **Yes**

Rationale:
- Domain language in product flow is card/work block.
- `answer_content` is explicit and avoids overload with generic `content` columns across tables.

## Transitional Mapping

### Current repo schema

From `supabase/migrations/20260115_0002_target_v0_clean_schema.sql`, `dream_answers` currently defines:
- `work_id`
- `content`

### Current user-facing route contract

Current write/read majority:
- write: `app/api/work/answer/route.ts` writes `work_id/content`
- read: `app/session/[id]/(flow)/work/page.tsx` reads `work_id/content`
- read: session/summary/archive flows read `work_id/content`

### Current continuity route mismatch

`app/api/work-block/next/route.ts` reads:
- `answer_text`
- `work_block_id`

No evidence of DB alias layer mapping this mismatch in repo migrations.

### Proposed alpha contract

Target contract for all runtime paths:
- use `work_block_id` as card FK semantic
- use `answer_content` as answer text semantic
- UI and generator consume the same logical fields

Implementation can use transitional mapping during rollout, but endpoint behavior must converge to one contract.

## Compatibility Policy

Default policy for alpha:
- avoid long-lived compatibility shims
- use short-lived compatibility only if live DB reality requires it during rollout
- remove transitional mapping once runtime and schema are aligned

Because real usage is currently negligible, controlled simplification/reset is acceptable if needed.

## Migration / Implementation Strategy

### Phase 1 — Runtime alignment

First BUILD ticket should align runtime reads/writes so UI and generator use one answer source immediately.

Decision:
- Should `/api/work-block/next` be updated first to read currently persisted fields? **Yes** (first practical safety step)

Goal:
- continuity path must read what write path actually persists
- eliminate silent continuity miss before naming cleanup

### Phase 2 — Schema cleanup

After runtime alignment, perform explicit schema/naming alignment to canonical alpha names:
- move from transitional `work_id/content` naming toward `work_block_id/answer_content`
- keep rollout controlled and auditable

Decision:
- Should DB schema cleanup happen before or after runtime alignment? **After** runtime alignment

### Phase 3 — Legacy removal

Remove transitional naming/compat only after:
- runtime paths are fully migrated
- verification confirms continuity + summary + archive behavior
- owner accepts cleanup checkpoint

## Required Read Paths

Future BUILD must ensure these consumers read the same answer contract:
- work flow page (`app/session/[id]/(flow)/work/page.tsx`)
- next-question continuity (`app/api/work-block/next/route.ts`)
- session overview/summary/archive consumers

## Required Write Paths

Future BUILD must ensure answer writes are contract-consistent in:
- `app/api/work/answer/route.ts`
- any future direct answer writer endpoint

Write and read contracts must match by definition.

## Acceptance Criteria For Future BUILD Ticket

- One runtime answer contract is used by write + read + continuity paths.
- Work-page answer save is visible in UI and consumed by next-question continuity.
- Session summary/archive answered-state remains correct.
- Transitional naming is explicitly documented during rollout.
- Cleanup/removal only happens after runtime verification.

## Risks

- Runtime mismatch risk if continuity path remains on divergent fields.
- Partial migration risk if UI and generator are updated in different releases.
- Naming migration risk if compatibility period is undefined.
- Low but non-zero data migration risk depending on live DB drift from repo schema.

## Open Questions

- Is live deployed schema currently exactly equal to repo migration state for `dream_answers`?
- Should alpha schema alignment be done via additive rename strategy or controlled reset-style migration given negligible usage?
- Is `work_versions.id` guaranteed as long-term card identity across all flows?
- Should optional metadata be introduced in alpha or postponed to post-alpha hardening?

References:
- `docs/audits/answer-schema-contract-audit.md`
- `app/api/work/answer/route.ts`
- `app/api/work-block/next/route.ts`
- `app/session/[id]/(flow)/work/page.tsx`
- `supabase/migrations/20260115_0002_target_v0_clean_schema.sql`
