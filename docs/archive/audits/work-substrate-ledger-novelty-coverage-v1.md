# Work Substrate Ledger/Novelty Coverage Incidence Deepening v1

## Purpose

Quantify real/local incidence of work substrate integrity issues (read-only, non-destructive).

This audit reports **counts and safe IDs only** (no dream content).

## Audit Method

- Run timestamp: `2026-05-20T06:52:44.601Z`
- Source: Supabase (read-only selects)
- Runtime timeout: `120000ms`
- Per-request timeout: `8000ms`
- Max rows per table: `2000`
- Max sessions scanned: `400`
- Scan scope: tables `dream_answers`, `work_versions`, `work_latest`, `session_directions`, `work_question_ledger`
- Note: bounded scan completed without row truncation

## Findings Summary

- Orphan answers: `0` rows affecting `0` sessions
- Stale work_latest pointers: `0` rows affecting `0` sessions
- Cross-session answer mismatch (answer.session_id != work.session_id): `0` rows affecting `0` sessions
- Missing/empty latest answer content (per session): `0` sessions
- Ledger availability gaps: `1` sessions (progress but no ledger)

## Interpretation (v1 Deepening)

- Hard lineage blockers remain absent in this deeper bounded run:
  - orphan answers: `0`
  - stale latest pointers: `0`
  - cross-session mismatches: `0`
- Ledger/novelty coverage gap still appears in exactly one session (`progress_no_ledger_sessions: 1`).
- Within this bounded sample (`max_rows=2000`, `max_sessions=400`), this presents as an **isolated signal**, not broad systemic incidence.

## 1) Orphan Answers

Definition:
- `dream_answers.work_id` is null/empty OR does not match an existing `work_versions.id`

Count: `0`
Affected sessions: `0`
Sample answer IDs:
Sample session IDs:

Risk classification: `MEDIUM` (becomes `BLOCKER` if incidence is non-trivial in real cohorts)

## 2) Stale `work_latest` Pointers

Definition:
- `work_latest.work_version_id` is null/empty OR not found in `work_versions.id` OR points to a work card in another session

Count: `0`
Affected sessions: `0`
Sample work_latest IDs:
Sample session IDs:

Risk classification: `LOW` to `MEDIUM` depending on incidence (projections fail soft, but it signals substrate drift).

## 3) Cross-Session Answer Mismatch

Definition:
- `dream_answers.session_id` differs from linked `work_versions.session_id` for the referenced `work_id`

Count: `0`
Affected sessions: `0`
Sample answer IDs:
Sample work IDs:

Risk classification: `HIGH` if present (violates session-boundary integrity).

## 4) Latest Answer Content Integrity (No Content Exposed)

Definition:
- For each session, find the latest `dream_answers` row by `created_at`. Count sessions where `content` is null/empty.

Sessions with empty latest content: `0`
Sample session IDs:

Risk classification: `MEDIUM` (selection continuity in `/api/work-block/next` uses latest answer text).

## 5) Ledger Availability

Checks:
- Sessions with work progression (>=2 work cards OR >=1 answer) but no `work_question_ledger` rows
- Ledger rows with missing/empty `question_hash`
- Ledger rows with empty `anchor_keys`

Sessions with progress but no ledger: `1`
Sample session IDs:
- `52268e3b-5c3e-4d26-94ef-7a00a609695c`

Ledger rows with empty question_hash: `0`
Ledger rows with empty anchor_keys: `0`

Risk classification: `HIGH` for Gate 4 parity if ledger gaps are common (novelty/pacing intent is selection-time).

## 6) Projection Dry-Run (Optional, Read-Only)

If enabled, this audit can sample a small set of sessions and run projections to classify:
- clean projection
- blocked due to orphan answer
- warning due to ledger gap

Projection dry-run sampled sessions: `20`
Clean: `19`
Blocked: `0`
Warn: `1`

Sample classifications:
- `07ba271d-84bb-42e3-85f0-5b02d60bb49f`: clean
- `167a4e32-3ffb-4a19-bf9d-248b49e54c8d`: clean
- `2418b083-819b-4641-aa0b-64a24a6485bd`: clean
- `26b005e9-785f-469e-addf-a44261b736b9`: clean
- `28f71c46-66d8-42b2-b5c3-569f0b9dafd8`: clean
- `39a1859c-ae00-47f5-a8da-e9de38dad595`: clean
- `3d2b6370-17ed-48da-9014-960adbbab32b`: clean
- `52268e3b-5c3e-4d26-94ef-7a00a609695c`: warn (missing_ledger)
- `52aa0226-a29b-4076-abc7-bbee28b5aaeb`: clean
- `5db104af-14ca-41b5-8551-8420b0311797`: clean
- `6f3d1f69-1132-4eec-a10d-1f7d2c4b15b5`: clean
- `8a8bf020-263d-45fe-96c1-6cb4cfe81aab`: clean
- `91546477-a289-4821-95f3-81f35452ebcd`: clean
- `979655ad-afc4-466f-9fd0-4e74d5ab04f3`: clean
- `a4f857bc-a68a-45a5-887e-44ef9ec7c7cd`: clean
- `afc65136-0826-4e9a-933b-3ea31498bb04`: clean
- `b0336fea-59a2-418d-abf7-38fe25768b59`: clean
- `b6aec316-0f83-4e11-8928-3a6f4b53be96`: clean
- `c455ccd8-d8f6-4f6a-9834-56f57af3619e`: clean
- `cd37900d-c22b-4807-ac91-5fdca097c287`: clean

## Gate 4 Impact

- No hard lineage blocker incidence is observed in this bounded deepening run.
- Gate 4 remains `PARTIAL`: blocked by the ledger/novelty modeling gap, currently evidenced as a rare/isolated case in sampled data.
- Immediate direction-to-lens migration should continue to treat ledger/novelty parity as an explicit guardrail, but this run does not indicate a widespread lineage-integrity regression.
