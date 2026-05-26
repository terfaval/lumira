# Work Substrate Integrity Audit and Guardrails v0

## Purpose

Audit the integrity of the legacy work substrate and define the **minimal guardrails** needed before reflective runtime can safely rely on work-derived continuity projections.

This ticket targets the Gate 4 blocker documented in:

- `docs/audits/work-route-continuity-parity-harness-v0.md`

This is **validation-only**:

- No changes to `/api/work-block/next`
- No changes to `/api/work/answer`
- No schema/migration changes
- No data repair
- No ownership transfer

## Scope (What We Consider “Work Substrate”)

The substrate that currently encodes continuity:

- `work_versions` (work cards; canonical work-loop artifact)
- `work_latest` (pointer to the current work card)
- `dream_answers` (answers linked by `dream_answers.work_id = work_versions.id`)
- `session_directions` (explicit direction selection persistence)
- `work_question_ledger` (novelty / repetition gating for selection-time pacing)

Reference decomposition:

- `docs/audits/work-route-runtime-responsibility-decomposition-v0.md`

---

## Summary of Risks (Owner-Readable)

The reflective projections are only as stable as the legacy substrate. The substrate is mostly guarded by current route code, but **some integrity gaps remain possible** because:

- `dream_answers.work_id` is not a guaranteed foreign key to `work_versions.id` (no schema constraint enforced in this ticket).
- `work_latest.work_version_id` is a pointer that can become stale if the substrate is manually edited or if legacy writes bypass normal flow.
- `work_question_ledger` is selection-time state that projections do not model, meaning projections cannot reproduce novelty/pacing intent on their own.

---

## 1) Orphan Answer Risk

### What is the risk?

An “orphan answer” is when:

- `dream_answers.work_id` references a missing `work_versions.id`, or
- the answer rows exist but cannot be safely attached to the correct work card identity.

Impact:

- Summary/re-entry assembly that expects card-linked answers may silently lose continuity or misrepresent it.
- Reflective projections **must not invent identity**, so they cannot “repair” orphan answers. This blocks relying on projections for continuity.

### Evidence from current runtime code

**`/api/work/answer` validates the work card exists before writing the answer.**

- It loads `work_versions` by `id = work_block_id` and requires `session_id` + `user_id` match.
- Only after that does it insert into `dream_answers` with `work_id = work_block_id`.
- It also dedupes repeated answers to prevent duplication.

Therefore: new orphan answers are **unlikely via the canonical API path**.

### Known substrate weak points

**`/api/work-block/next` contains warnings for `dream_answers` rows that are missing `work_id` or have empty content.**

That implies the substrate may contain historical or out-of-band rows where:

- `dream_answers.work_id` is null/empty
- or `dream_answers.content` is empty

### Test evidence in this repo

- The continuity parity harness explicitly treats “orphan answer” as a hard `BLOCKED` scenario.
  - `src/domain/reflective/validation/workRouteContinuityParity.test.ts` (Scenario 8)
- Additional integrity guardrail tests:
  - `src/domain/reflective/validation/workSubstrateIntegrity.test.ts`

### Orphan Answer Verdict

Risk classification: `MEDIUM`

Why:

- Mostly guarded by `/api/work/answer`.
- Still possible through historical data, manual writes, or any non-standard writer path (no FK constraint).
- When present, it is a **Gate 4 blocker** because projections cannot safely attach or repair it.

Recommended action: `add test only` + `add guarded validation log later` + `require schema constraint later`.

---

## 2) Work Latest Consistency

### What is the risk?

`work_latest.work_version_id` can become stale or point to a missing work card:

- after manual data edits
- if legacy dormant routes write in a way that diverges
- if deletion/cleanup occurs (not in current scope)

### Evidence from current runtime code

- `/api/work-block/next` updates `work_latest` immediately after inserting/reusing a `work_versions` row (idempotency-supported).
- `/api/work/persist` (dormant) also upserts `work_latest` after insert/reuse.
- The work page reads `work_latest` as the focus pointer.

### Projection behavior (safety)

The projections treat `work_latest_work_version_id` as a soft pointer:

- If it points to a missing work id, projections do not crash and do not fabricate “foreground focus.”
- In that case, “foreground” does not get assigned via the latest-pointer rule.

Test evidence:

- `src/domain/reflective/validation/workSubstrateIntegrity.test.ts` includes “stale latest pointer” validation.

### Work Latest Verdict

Risk classification: `LOW`

Why:

- Canonical writers set it deterministically.
- Projection fallback is calm (no foreground invention) when stale.

Recommended action: `add guarded validation log later` + `require schema constraint later` (optional).

---

## 3) Session Boundary Integrity

### What is the risk?

Continuity can be corrupted if:

- answers are not session-scoped on read
- latest pointers can point across session boundaries
- selected directions are not session-scoped

### Evidence from current runtime code

Runtime route reads/writes are session-scoped and user-scoped:

- `/api/work/answer`: requires `dream_sessions` ownership and validates `work_versions` in the same session.
- `/api/work-block/next`: reads `dream_answers` filtered by `session_id` + `user_id`, and reads `work_versions` filtered by session/user.
- Work page: reads `dream_answers` by `session_id` and usually by `user_id`.
- `/api/session-summary`: reads `work_versions`, `dream_answers`, `session_directions` filtered by session/user.

### Projection API sharp edge (important)

`projectReflectiveThreadsFromLegacy` / `projectReflectiveOpeningsFromLegacy` accept `dream_answers` rows **without** a `session_id` field in the input type.

That means projections cannot enforce session scoping internally; they rely on callers (routes/adapters/tests) to pass session-scoped answers.

### Session Boundary Verdict

Risk classification: `LOW` for canonical routes, `MEDIUM` for “any caller can pass unscoped arrays into projections.”

Recommended action: `add test only` + `add guarded validation log later` (caller-side) + consider future projection signature hardening (deferred).

---

## 4) Ledger / Novelty Dependency

### What is the dependency?

Selection-time pacing and repetition control depends on:

- `work_question_ledger` writes in `/api/work/answer`
- ledger reads in `/api/work-block/next`:
  - recent anchor keys
  - recent question hashes

This prevents repeated anchors and repeated prompts, and is part of the “continuity pressure” control.

### What do projections lose today?

Reflective projections do not consume the ledger, therefore they cannot:

- explain why a material was avoided (selection ruled-out reasons)
- detect “we are repeating ourselves” as a pacing signal
- reproduce stop/closure semantics driven by novelty rules

### Ledger / Novelty Verdict

Risk classification: `HIGH` for Gate 4 parity if the goal is to replace the work loop’s pacing/novelty posture using projections alone.

Recommended action: `block direction demotion until resolved` + later add minimal read-model metadata for “recent prompts/material” (deferred).

---

## 5) Minimal Guardrail Recommendations (Rollback-Safe)

These are recommendations only. This ticket does not change production behavior.

### A) Tests (safe now)

- Keep parity harness treating orphan answers as `BLOCKED`.
- Add integrity tests for:
  - stale/missing `work_latest` pointer -> no foreground invention
  - nullable `dream_answers.work_id` rows -> ignored by projections

Status: implemented as validation-only tests.

### B) Guarded validation logs (future, additive)

Add fail-soft warnings (not user-facing) when substrate inconsistencies are detected:

- orphan answer found in a session
- latest pointer not found among session work cards
- `dream_answers` latest row missing `work_id` or content

### C) Runtime assertions (future, cautious)

Consider later tightening `/api/work/answer` (it already checks work card existence) by:

- returning a specific error for stale/missing work card linkage (already effectively does via 404)
- optionally verifying the work card payload is `direction_card` (currently it only checks work_versions row exists)

### D) Schema constraints (future, after owner approval)

Later (not now), consider:

- foreign key: `dream_answers.work_id -> work_versions.id`
- not-null: `dream_answers.work_id` for work answers
- uniqueness or guarded dedupe indices if needed

### E) No silent identity invention (must remain)

Projections/composer must **never** create new work/thread/opening identity to “fix” substrate inconsistencies.
If lineage is missing, the correct behavior is:

- omission + explicit blocker classification
- audit visibility for owner/dev review

---

## Gate 4 Impact (Explicit)

Gate 4 remains `BLOCKED`.

Even with strong projection parity under clean fixtures, the substrate integrity constraints mean:

- any orphan answer risk is a hard blocker for relying on projections as continuity truth,
- and the ledger/novelty dependency cannot be recovered from projections without additional read-model support.

---

## Risk Table (Required Classification)

| Area | Risk | Action recommendation |
| --- | --- | --- |
| Orphan answers (`dream_answers.work_id` missing/mismatched) | `MEDIUM` (becomes `BLOCKER` if present in real sessions) | add test only; add guarded validation logs later; require schema constraint later |
| `work_latest` pointer stale/missing | `LOW` | add guarded validation log later; optional schema constraint later |
| Session boundary integrity (canonical routes) | `LOW` | no action |
| Session boundary integrity (projection callers) | `MEDIUM` | add test only; add caller-side scoping guardrails |
| Ledger/novelty dependency gap | `HIGH` | block direction demotion until resolved; plan minimal read-model support later |

---

## Validation Evidence

- TypeScript validation (equivalent):
  - `node .\\node_modules\\typescript\\bin\\tsc -p tsconfig.json --noEmit`
- Tests (run via node in this environment):
  - `src/domain/reflective/validation/workRouteContinuityParity.test.ts`
  - `src/domain/reflective/validation/workSubstrateIntegrity.test.ts`

