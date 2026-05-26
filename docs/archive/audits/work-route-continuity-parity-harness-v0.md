# Work-Route Continuity Parity Harness v0

## Purpose

Measure whether **reflective projection read models** (threads + openings) can preserve the continuity spine that the legacy work-loop currently provides.

This directly targets **Gate 4 (Work-route continuity parity)** from:

- `docs/audits/lumira-direction-to-lens-readiness-gate-evidence-pack-v0.md`

This ticket is **validation-only**:

- No changes to `/api/work-block/next`
- No changes to `/api/work/answer`
- No changes to `/api/direction/select`
- No persistence/schema changes
- No UX changes
- No ownership transfer

## Continuity Spine Being Measured (Legacy Substrate)

The current system’s continuity spine is materially encoded in:

- `/api/work-block/next` writes `work_versions` and updates `work_latest`
- `/api/work/answer` writes `dream_answers` (linked by `dream_answers.work_id = work_versions.id`)
- `/api/direction/select` writes `session_directions`
- novelty/pacing guardrails also depend on `work_question_ledger` (selection-time, not reconstructable from projections)

Reference decomposition:

- `docs/audits/work-route-runtime-responsibility-decomposition-v0.md`

## Harness Location

Validation harness:

- `src/domain/reflective/validation/workRouteContinuityParity.test.ts`

This harness:

1. Builds deterministic legacy fixtures (`work_versions`, `work_latest_work_version_id`, `dream_answers`, `session_directions`)
2. Runs existing projections:
   - `projectReflectiveThreadsFromLegacy(...)`
   - `projectReflectiveOpeningsFromLegacy(...)`
3. Checks explicit parity invariants:
   - one-to-one mapping for each legacy work card -> projected thread/opening
   - answered/open/paused mapping
   - focus preservation (`work_latest` -> foreground opening when safe)
   - source lineage preservation (work_version, dream_answer, session_direction, work_latest refs)
   - deterministic ordering / stable projection output
4. Classifies each scenario:
   - `PASS`
   - `PASS_WITH_NOTES`
   - `WARN`
   - `BLOCKED`

Blocker categories:

- `lineage_gap`
- `state_mapping_gap`
- `suppression_defer_mismatch`
- `projection_insufficiency`
- (others exist for future extension)

## Scenarios Covered (Deterministic)

| # | Scenario | Classification | Notes / blockers |
| --- | --- | --- | --- |
| 1 | Open first work card, no answer | `PASS` | `work_latest` maps to foreground opening when prompt exists |
| 2 | Answered card followed by next open card | `PASS` | answered -> `thread.answered` and `opening.engaged` |
| 3 | Multiple work cards in one direction | `PASS_WITH_NOTES` | low-signal short answer present; projections still map “answered” deterministically |
| 4 | Multiple selected directions | `PASS` | direction appears as context (`selected_direction_slugs`), not identity lock |
| 5 | Brief/low-information answer | `PASS_WITH_NOTES` | short answers are noted as low-signal; projections mark answered |
| 6 | Repeated/low-novelty material id | `WARN` | novelty/ledger intent is selection-time; projections only mirror persisted substrate |
| 7 | Deferred/suppressed opening signal | `PASS` | suppression prevents latest opening from becoming foreground |
| 8 | Missing/partial lineage (orphan answer) | `BLOCKED` | `lineage_gap`: `dream_answers` row exists with no matching `work_versions` card |
| 9 | Direction context fallback when card direction slug is missing/blank | `PASS` | thread context can fall back to `session_directions` |

## Parity Findings (What Looks Good)

- **State mapping is stable** given the legacy substrate:
  - answer present -> `thread.state_posture = answered`, `opening.lifecycle_posture = engaged`
  - paused work card -> `thread.state_posture = dormant`, `opening.lifecycle_posture = deferred`, `opening.visibility_layer = suppressed`
- **Focus preservation exists**:
  - `work_latest_work_version_id` projects to a **foreground** opening when safe and prompt exists.
- **Lineage is preserved** for the core substrate when inputs are consistent:
  - work_version, dream_answer, session_direction refs attach where expected.
- **Deterministic output**:
  - the same inputs produce identical thread/opening projections.

## Parity Gaps / Blockers (Why Gate 4 Remains Hard)

### 1) Orphan answers are a hard lineage gap

If `dream_answers.work_id` references a missing/unknown `work_versions.id`, projections cannot invent identity.

This is a **true substrate discontinuity** and is `BLOCKED` for Gate 4 progression.

### 2) Novelty / ledger behavior is not modeled in projections

The work-loop uses `work_question_ledger` to avoid repetition and regulate pressure during selection.

Projections do not consume the ledger, so they cannot explain or prevent repeated `material_id` sequences.

This is a `WARN` because it impacts “continuity pressure” and pacing parity, even if projections remain calm read-only.

## Gate 4 Status (Work-route continuity parity)

Verdict: `BLOCKED` (with partial progress)

Reason:

- Continuity projection parity is strong **when the legacy substrate is consistent**.
- But Gate 4 requires continuity stability under real substrate risk and selection-time policy coupling (ledger/novelty),
  and must treat lineage discontinuities as hard blockers.

## Validation Evidence

Commands attempted / run:

- `npm.cmd run typecheck` fails in this environment (`EPERM lstat C:\\Users\\matef`).
- Equivalent TypeScript validation passed:
  - `node .\\node_modules\\typescript\\bin\\tsc -p tsconfig.json --noEmit`
- Harness test:
  - `src/domain/reflective/validation/workRouteContinuityParity.test.ts`

