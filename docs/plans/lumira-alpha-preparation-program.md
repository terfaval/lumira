# Lumira Alpha Preparation Program

## Purpose

Define one phased, execution-safe program for preparing Lumira for public alpha using small, reviewable tickets with explicit dependencies, owner decisions, and validation gates.

## Current Strategic Position

Lumira has a strong evidence base across runtime audits, contract audits, and conceptual specs. The main challenge is now sequencing: keeping alpha stabilization reliable while avoiding premature redesign.

Current known state:
- Core flow is active and evidence-mapped (`session -> observe -> frame -> direction -> work -> answer -> revisit`).
- Observation runtime truth for alpha remains ensure-based and v0-centric (D5).
- Key contract and coupling risks are identified (answer contract drift, ensure over-coupling, wrapper duplication, table/runtime drift).
- Conceptual post-alpha direction is documented (`docs/specs/lumira-core-model-reframe.md`) but must not destabilize alpha cleanup.

All required planning inputs were available at planning time; no required source file was missing.

## Program Principles

1. Stabilize alpha runtime before conceptual redesign work.
2. Keep tickets small, local, and reviewable; avoid broad rewrites.
3. Require evidence-first AUDIT/PLAN tickets before risky BUILD/CLEANUP tickets.
4. Treat glossary, highlights, guest mode, summary, and work ledger as decision-boundary items, not auto-defer items.
5. Maintain D5: ensure-based v0 observation remains alpha runtime truth.
6. Park dream map/archetype expansion domains unless explicitly required for alpha safety.
7. Do not execute DB changes without explicit owner approval after a schema truth/manifest phase.
8. Run manual runtime validation after each meaningful code-changing stabilization step.

## Alpha Target Scope

### Must stay in alpha

- Auth/access pathways, including guest-path decision handling.
- Core runtime chain:
  - `login/guest -> new dream -> ensure -> frame -> direction -> work -> answer -> revisit/summary/archive`
- Core orchestration/data for current runtime behavior:
  - ensure pipeline, frame/direction/work APIs, answer persistence, revisit/archive.
- Summary/highlights/glossary/work-ledger treatment as explicit scope decisions, not implicit removals.

### Deferred / parked

- Dream map product surfaces and archetype expansion surfaces (parked unless proven alpha-critical).
- Evening/image/background/admin backfill non-core domains.
- Post-alpha reflective intelligence redesign implementation.

### Transitional / needs cleanup

- Wrapper/delegate API duplication (`/api/frame`, `/api/frame/ensure`, `/api/session/bootstrap`).
- Ensure-side coupling to deferred domains (dream map/glossary side-effects).
- Runtime-vs-migration drift risk (`user_flags` and other potential gaps).
- Answer naming transition (`work_id/content` vs canonical target naming).
- Mixed runtime surfaces where summary/highlights participation needs explicit alpha boundary decision.

## Workstreams

### Workstream A — Runtime Boundary Freeze

Freeze one authoritative alpha runtime boundary (routes/APIs/tables/dependencies) to prevent accidental removal and cleanup drift.

### Workstream B — Ensure Decoupling

Define and implement a controlled ensure run-profile that keeps core-flow jobs while isolating deferred sidecars behind owner-approved gates.

### Workstream C — DB / Schema Truth

Establish table truth vs migrations, produce an alpha schema manifest, and gate any DB changes behind explicit owner approval.

### Workstream D — Wrapper and Route Simplification

Safely collapse wrapper layers and simplify route ownership only after caller proof and boundary freeze.

### Workstream E — Manual Runtime Validation

Run deterministic manual validations after each risky step to prove core-flow reliability remains intact.

### Workstream F — Post-alpha Reflective Model Backlog

Capture post-alpha redesign backlog (observation convergence, glossary/work redesign) without leaking into alpha stabilization execution.

## Ordered Ticket Roadmap

### 1. AUDIT/PLAN — Ensure De-coupling Contract
Type: AUDIT / PLAN
Goal:
Define explicit `session.ensure` alpha run profile: core-required jobs vs deferred sidecars.
Why now:
Ensure is the highest-coupling runtime hub; all later cleanup depends on a clear contract.
Inputs:
- `docs/audits/alpha-runtime-truth-matrix.md`
- `docs/audits/alpha-reset-scope-plan.md`
- `docs/audits/runtime-current-flow-audit.md`
Files likely touched:
- `docs/audits/*` (new audit note)
- `docs/specs/*` or `docs/plans/*` (contract plan doc)
- `docs/STABILIZATION_LEDGER.md`
Acceptance criteria:
- Core vs sidecar ensure jobs are explicitly listed.
- Guest-mode impact and fallback behavior are documented.
- No runtime/schema changes.
Owner decision needed:
Yes (which sidecars remain enabled in alpha default path).
Depends on:
- Current truth matrix and reset scope plan.
Next if successful:
- Ticket 2 (DB drift/table truth audit).
Next if blocked:
- Create a short owner decision note with option A/B run profiles.

### 2. AUDIT — DB Drift / Table Truth vs Migrations
Type: AUDIT
Goal:
Resolve runtime table usage vs migration-defined schema truth (including `user_flags` uncertainty).
Why now:
DB cleanup planning is unsafe without confirmed runtime-vs-DDL truth.
Inputs:
- `docs/audits/alpha-runtime-truth-matrix.md`
- `docs/audits/runtime-current-flow-audit.md`
- `docs/audits/answer-schema-contract-audit.md`
Files likely touched:
- `docs/audits/*` (new drift audit)
- `docs/STABILIZATION_LEDGER.md`
Acceptance criteria:
- Table-by-table runtime usage map with migration evidence.
- Explicit uncertain tables and confidence labels.
- No schema or migration changes.
Owner decision needed:
Yes (how to handle runtime tables missing in repo DDL evidence).
Depends on:
- Ticket 1.
Next if successful:
- Ticket 3 (alpha schema manifest plan).
Next if blocked:
- Pause all DB simplification tickets; request environment/schema verification.

### 3. PLAN — Alpha Schema Manifest (No Execution)
Type: PLAN
Goal:
Produce canonical alpha schema manifest: required, transitional, deferred, and blocked-by-decision tables/fields.
Why now:
Manifest is required before any controlled DB changes.
Inputs:
- Ticket 2 audit output
- `docs/specs/alpha-answer-contract.md`
- `docs/DECISIONS.md`
Files likely touched:
- `docs/plans/*` (manifest plan)
- `docs/specs/*` (if a canonical manifest spec is preferred)
- `docs/STABILIZATION_LEDGER.md`
Acceptance criteria:
- One manifest with table/field ownership and status.
- Explicit "no-execution" DB-change gate section.
- Owner sign-off checklist included.
Owner decision needed:
Yes (approve manifest as DB cleanup baseline).
Depends on:
- Ticket 2.
Next if successful:
- Ticket 4 and Ticket 5 can proceed in parallel planning.
Next if blocked:
- Re-open Ticket 2 with narrowed unresolved table set.

### 4. AUDIT — Guest Mode Alpha Boundary Decision Package
Type: AUDIT
Goal:
Determine whether guest mode stays in alpha scope and document exact runtime consequences either way.
Why now:
Guest mode influences ensure flags, auth routing, and potential schema/runtime coupling.
Inputs:
- `docs/audits/alpha-runtime-truth-matrix.md`
- `docs/audits/alpha-reset-scope-plan.md`
- Ticket 1 output
Files likely touched:
- `docs/audits/*` (guest boundary audit)
- `docs/STABILIZATION_LEDGER.md`
Acceptance criteria:
- A/B decision matrix: keep guest vs park guest.
- Impact list for routes, APIs, and validation coverage.
- No runtime/schema changes.
Owner decision needed:
Yes (keep or park guest for alpha).
Depends on:
- Ticket 1.
Next if successful:
- Ticket 8 implementation/capability cleanup can safely scope guest behavior.
Next if blocked:
- Freeze guest-related cleanup; proceed with non-guest-safe tickets only.

### 5. AUDIT — Summary + Highlights + Glossary Alpha Boundary
Type: AUDIT
Goal:
Set explicit alpha scope for summary page and highlight/glossary participation without blind deferral.
Why now:
These are important systems and currently coupled to core revisit surfaces.
Inputs:
- `docs/audits/alpha-runtime-truth-matrix.md`
- `docs/specs/lumira-core-model-reframe.md`
- `docs/audits/runtime-current-flow-audit.md`
Files likely touched:
- `docs/audits/*` (boundary decision audit)
- `docs/STABILIZATION_LEDGER.md`
Acceptance criteria:
- Clear keep/simplify/defer matrix for summary/highlights/glossary in alpha.
- User-facing risk notes and fallback behavior notes.
- No runtime/schema changes.
Owner decision needed:
Yes (summary in-alpha scope level and highlight behavior level).
Depends on:
- Ticket 1.
Next if successful:
- Ticket 8 and Ticket 10 can scope changes safely.
Next if blocked:
- Mark summary/highlights as decision-locked; skip related cleanup tickets.

### 6. PLAN — Wrapper Collapse Sequence
Type: PLAN
Goal:
Define exact safe sequence to consolidate wrapper endpoints to canonical entrypoints.
Why now:
Wrapper simplification is high-value but risky without caller-proof sequencing.
Inputs:
- `docs/audits/alpha-runtime-truth-matrix.md`
- Ticket 1 output
- Ticket 4/5 scope decisions
Files likely touched:
- `docs/plans/*` (wrapper collapse plan)
- `docs/STABILIZATION_LEDGER.md`
Acceptance criteria:
- Stepwise collapse order with rollback points.
- Caller-proof checklist for each endpoint.
- Required post-step validation commands/scenarios listed.
Owner decision needed:
Yes (approve collapse order).
Depends on:
- Tickets 1, 4, 5.
Next if successful:
- Ticket 8 (small controlled BUILD/CLEANUP steps).
Next if blocked:
- Keep wrappers; proceed with non-wrapper decoupling work.

### 7. AUDIT/PLAN — Deferred Domain Isolation Contract
Type: AUDIT / PLAN
Goal:
Define how deferred domains (dream map/archetype and other parked areas) are isolated from alpha-critical runtime paths.
Why now:
Current ensure and related paths still transitively touch deferred domains.
Inputs:
- `docs/audits/alpha-runtime-truth-matrix.md`
- `docs/audits/alpha-reset-scope-plan.md`
- Ticket 1 output
Files likely touched:
- `docs/plans/*` or `docs/audits/*`
- `docs/STABILIZATION_LEDGER.md`
Acceptance criteria:
- Isolation contract with explicit keep-enabled vs gated/off pathways.
- No feature removal execution in this ticket.
Owner decision needed:
Yes (approve isolation boundary for deferred domains).
Depends on:
- Tickets 1 and 5.
Next if successful:
- Ticket 8 (controlled ensure/run-flag changes).
Next if blocked:
- Defer isolation BUILD; prioritize validation and warning audits.

### 8. BUILD (controlled) — Ensure Run-Flag Gate + Wrapper Simplification Slice 1
Type: BUILD / CLEANUP
Goal:
Apply one small approved slice: ensure decoupling flags and/or first wrapper consolidation step.
Why now:
First code-changing stabilization step after decision-quality planning.
Inputs:
- Tickets 1, 6, 7 approved outputs
- Tickets 4/5 owner decisions
Files likely touched:
- `app/api/session/ensure/route.ts`
- `app/api/frame/ensure/route.ts`
- `app/api/frame/route.ts` or `app/api/session/bootstrap/route.ts` (single-slice scope only)
- related docs (`docs/STABILIZATION_LEDGER.md`)
Acceptance criteria:
- Change is limited to one approved slice.
- Core flow still functions in manual validation.
- No DB schema change.
Owner decision needed:
Yes (explicit go/no-go before code change).
Depends on:
- Tickets 1, 4, 5, 6, 7.
Next if successful:
- Ticket 9 (manual runtime validation gate).
Next if blocked:
- Revert slice, capture failure mode, return to Ticket 6/7 planning.

### 9. VALIDATION — Manual Core-Flow Runtime Validation
Type: VALIDATION
Goal:
Validate end-to-end core flow after Ticket 8:
`login/guest -> new -> ensure -> frame -> direction -> work -> answer -> revisit/summary/archive`.
Why now:
Every meaningful stabilization BUILD must be followed by runtime validation.
Inputs:
- Ticket 8 diff
- validation checklist from prior audits/plans
Files likely touched:
- `docs/audits/*` (validation report)
- `docs/STABILIZATION_LEDGER.md`
Acceptance criteria:
- Pass/fail report per stage with evidence.
- Any regressions linked to concrete route/API/table behavior.
Owner decision needed:
Yes (accept/reject the slice based on validation outcome).
Depends on:
- Ticket 8.
Next if successful:
- Ticket 10 and/or additional small cleanup slices.
Next if blocked:
- Open targeted bugfix ticket before further cleanup.

### 10. AUDIT — Warning/Log Noise and Fail-Soft Signal Quality
Type: AUDIT
Goal:
Review warning volume and fail-soft logs to distinguish healthy fallback telemetry from actionable regressions.
Why now:
As cleanup progresses, log noise can hide real defects and confuse validation.
Inputs:
- `docs/STABILIZATION_LEDGER.md`
- runtime contract check changes and validation reports
Files likely touched:
- `docs/audits/*`
- `docs/STABILIZATION_LEDGER.md`
Acceptance criteria:
- Categorized warning inventory (expected/transitional/problematic).
- Recommendation list for future tiny follow-up tickets.
- No runtime/schema changes.
Owner decision needed:
Yes (approve which warning classes to reduce or keep).
Depends on:
- Ticket 9.
Next if successful:
- Ticket 11 (work-candidate exhaustion decision).
Next if blocked:
- Keep current logging; continue with minimal-risk tickets only.

### 11. AUDIT — Work Candidate Exhaustion (or Explicit Deferral) Decision
Type: AUDIT
Goal:
Determine whether work candidate exhaustion behavior needs alpha intervention or can be explicitly deferred.
Why now:
Work quality and continuity are core alpha experience risks and tied to ledger/summary/highlight choices.
Inputs:
- `docs/audits/alpha-runtime-truth-matrix.md`
- `docs/audits/runtime-current-flow-audit.md`
- Ticket 9 validation results
Files likely touched:
- `docs/audits/*`
- `docs/STABILIZATION_LEDGER.md`
Acceptance criteria:
- Clear recommendation: intervene now vs defer with rationale.
- If intervention recommended, include narrow follow-up ticket template.
Owner decision needed:
Yes (intervene now or defer).
Depends on:
- Tickets 5, 9, 10.
Next if successful:
- Optional small BUILD ticket if intervention approved.
Next if blocked:
- Record explicit deferral and proceed to post-alpha backlog capture.

### 12. DOCS/PLAN — Post-alpha Reflective Model Backlog Pack
Type: DOCS / PLAN
Goal:
Create two post-alpha backlog tracks without implementation:
1) observation redesign convergence backlog,
2) glossary/work reflective redesign backlog.
Why now:
Prevents alpha tickets from absorbing conceptual redesign scope while preserving momentum toward long-term model.
Inputs:
- `docs/specs/lumira-core-model-reframe.md`
- `docs/audits/observation-pathway-convergence-audit.md`
- Ticket 11 decision context
Files likely touched:
- `docs/plans/*` or `docs/specs/*` backlog docs
- `docs/STABILIZATION_LEDGER.md`
Acceptance criteria:
- Separate post-alpha backlog streams with prerequisites and risk notes.
- Explicit statement: no alpha runtime/schema changes in this ticket.
Owner decision needed:
Yes (prioritize post-alpha backlog ordering).
Depends on:
- Tickets 9 and 11.
Next if successful:
- End of alpha-preparation program; transition to selected post-alpha plan.
Next if blocked:
- Keep backlog as draft and close alpha preparation with stabilization-only scope.

## Owner Decision Gates

1. Ensure sidecar policy gate:
Decide alpha defaults for dream map/glossary sidecar behavior in ensure.
2. Guest mode gate:
Keep guest mode in alpha or park it with explicit behavior constraints.
3. Summary/highlights/glossary gate:
Set alpha inclusion depth for summary and related reflective surfaces.
4. Wrapper collapse gate:
Approve exact collapse order and rollback posture.
5. DB manifest gate:
Approve schema manifest and block DB execution until explicit sign-off.
6. Work-candidate gate:
Intervene during alpha or defer with documented risk acceptance.

## Validation Gates

1. Post-BUILD core-flow gate:
Manual validation required after each code-changing stabilization step.
2. Contract consistency gate:
Answer continuity + display + revisit behavior must remain aligned.
3. Ownership gate:
Route/API ownership checks required before removing wrappers.
4. Drift gate:
No DB simplification execution until runtime-vs-migration truth is confirmed.
5. Signal gate:
Warning/fail-soft telemetry must be reviewed after each major cleanup slice.

## Risks

- Over-coupled ensure pipeline can cause regressions during seemingly small changes.
- Runtime-vs-DDL drift (especially `user_flags`) can invalidate cleanup assumptions.
- Premature deferral of glossary/highlights/summary/work-ledger can remove user-value-critical behavior.
- Wrapper collapse without caller-proof can break latent dependencies.
- Mixing post-alpha redesign work into alpha stabilization can create schedule and reliability instability.

## Stop Conditions

- Stop if any ticket would require broad multi-domain refactor instead of small reviewable changes.
- Stop if runtime validation fails on core flow and regression root cause is unresolved.
- Stop DB-changing execution if manifest/drift truth is unapproved or uncertain.
- Stop cleanup execution when owner decision gates are unresolved for affected domains.

## Recommended Immediate Next Ticket

`1. AUDIT/PLAN — Ensure De-coupling Contract`

Reason:
It is the highest-leverage dependency for all downstream cleanup, boundary, and validation work while preserving the alpha-first stabilization strategy.
