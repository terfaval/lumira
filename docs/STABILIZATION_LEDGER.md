# Stabilization Ledger

## Current Stabilization Goal

Prepare Lumira for public alpha by stabilizing:

`session -> observe -> frame -> direction -> work`

## Current Priorities

1. Core flow stability
2. Canonical data sources
3. Legacy path isolation
4. Safety / non-interpretive behavior
5. Agent-readable documentation

## Completed Tickets

### Remove remaining dream-map runtime APIs/jobs/repos/domain layers (cleanup/build)
Date: 2026-05-12
Commit: N/A (working tree update)
Summary:
Removed dream-map runtime surfaces (APIs, orchestration job, repos, and domain modules) after prior ensure decoupling and UI disablement, while preserving core flow boundaries and avoiding DB/schema changes.
Files touched:
- Removed APIs:
  - `app/api/dreammap/aggregate/route.ts`
  - `app/api/dreammap/v2/aggregate/route.ts`
  - `app/api/dreammap/v2/build/route.ts`
  - `app/api/admin/dreammap/backfill/route.ts`
- Removed job:
  - `src/orchestration/jobs/jobBuildDreamMapV0.ts`
- Removed repos:
  - `src/db/repositories/dreamMapRepo.ts`
  - `src/db/repositories/dreamMapV2Repo.ts`
- Removed domain tree:
  - `src/domain/dreammap/*` (including `axis/*`, builders, and types)
- Patched shared/runtime callers:
  - `src/orchestration/jobs/jobBackfillArchetype.ts`
  - `src/db/repositories/archetypeRepo.ts`
  - `src/orchestration/idempotency/jobKey.ts`
  - `docs/STABILIZATION_LEDGER.md`
Validation:
- Pre-delete caller audit run:
  - `rg -n "dreamMap|DreamMap|jobBuildDreamMapV0|dream_map" app src --glob "!**/*.md"`
  - `rg -n "/api/dreammap|admin/dreammap/backfill|jobBuildDreamMapV0|dreamMapRepo|dreamMapV2Repo|domain/dreammap" app src --glob "!**/*.md"`
- Post-delete caller check:
  - `rg -n "jobBuildDreamMapV0|dreamMapRepo|dreamMapV2Repo|@/src/domain/dreammap|app/api/dreammap|admin/dreammap/backfill|build_dream_map_v0" app src --glob "!**/*.md"`
  - Result: no active runtime imports remained for removed dream-map APIs/jobs/repos/domain modules.
- `npm.cmd run typecheck` failed in sandbox with `EPERM lstat C:\\Users\\matef`; reran with escalation.
- First escalated typecheck failed due stale generated `.next/*/types/validator.ts` references to removed routes; removed only those generated validator files and reran.
- `npm.cmd run typecheck` (escalated rerun) passed.
- `npm.cmd run lint` failed in sandbox with `EPERM lstat C:\\Users\\matef`; reran with escalation.
- `npm.cmd run lint` (escalated) failed due existing repo-wide lint backlog (`2848 problems: 2646 errors, 202 warnings`, heavily including `.worktrees` paths).
Follow-up:
- Dream-map DB tables remain intentionally untouched in this slice.
- Next phase can plan explicit DB/schema cleanup separately with owner approval.

### Split archetype backfill out of dream-map admin route (cleanup/build)
Date: 2026-05-12
Commit: N/A (working tree update)
Summary:
Split archetype maintenance out of `/api/admin/dreammap/backfill` into a dedicated archetype-owned route, while preserving admin protections and archetype backfill request/response behavior.
Files touched:
- `app/api/admin/dreammap/backfill/route.ts`
- `app/api/admin/archetypes/backfill/route.ts` (new)
- `docs/STABILIZATION_LEDGER.md`
Validation:
- Ownership/search check run:
  - `rg "missing_archetype|jobBackfillArchetype" app src`
  - Result:
    - `jobBackfillArchetypeMissing` invocation moved to `app/api/admin/archetypes/backfill/route.ts`.
    - `app/api/admin/dreammap/backfill/route.ts` now only references `missing_archetype` for explicit rejection/move guidance.
- `npm run typecheck` failed in sandbox due to PowerShell execution policy (`npm.ps1` blocked); reran with escalation.
- `npm.cmd run typecheck` failed in sandbox with `EPERM lstat C:\\Users\\matef`; passed with escalation.
- `npm run lint` failed in sandbox due to PowerShell execution policy (`npm.ps1` blocked); reran with escalation.
- `npm.cmd run lint` failed in sandbox with `EPERM lstat C:\\Users\\matef`; with escalation it failed due existing repo-wide lint backlog (`2892 problems: 2688 errors, 204 warnings`, including `.worktrees` files).
Follow-up:
- Next cleanup can remove dream-map admin route + dream-map runtime APIs/jobs/repos after bounded verification.

### Remove orphan dream-map UI components and dream-map-only tests (cleanup)
Date: 2026-05-12
Commit: N/A (working tree update)
Summary:
Removed orphan `components/dreammap/*` UI files and dream-map-only tests after prior route/navigation disablement, with import search confirmation that no active code callers remained.
Files touched:
- `components/dreammap/*` (removed)
- `src/orchestration/jobs/jobBuildDreamMapV0.test.ts` (removed)
- `src/domain/dreammap/buildDreamMapV0.test.ts` (removed)
- `docs/STABILIZATION_LEDGER.md`
Validation:
- Pre-delete search run:
  - `rg \"components/dreammap|DreamMapLayout|DreamMapLayoutV2|jobBuildDreamMapV0.test|buildDreamMapV0.test\" app components src docs`
  - Result: no active imports from non-disabled routes; matches were in docs plus dream-map component/test files.
- Post-delete search run:
  - `rg \"components/dreammap|DreamMapLayout|DreamMapLayoutV2|jobBuildDreamMapV0.test|buildDreamMapV0.test\" app components src docs`
  - Result: matches remained only in docs references; no active code imports.
- `npm run typecheck` failed in sandbox due to PowerShell execution policy (`npm.ps1` blocked); reran with escalation.
- `npm.cmd run typecheck` failed in sandbox with `EPERM lstat C:\\Users\\matef`; passed with escalation.
- `npm run lint` failed in sandbox due to PowerShell execution policy (`npm.ps1` blocked); reran with escalation.
- `npm.cmd run lint` failed in sandbox with `EPERM lstat C:\\Users\\matef`; with escalation it failed due existing repo-wide lint backlog (`2687 errors`, `203 warnings`, including `.worktrees` files).
Follow-up:
- Next slice should split archetype backfill out of dream-map admin route before dream-map API/job/repo deletion.

### Dream map API/job/repo caller audit (audit)
Date: 2026-05-11
Commit: N/A (working tree update)
Summary:
Produced a bounded dependency audit of remaining dream-map runtime layers (APIs/jobs/repos/domain/tests), with explicit caller graph, shared-coupling analysis, safe-removal classification, and staged cleanup sequencing.
Files touched:
- `docs/audits/dream-map-api-job-repo-caller-audit.md`
- `docs/STABILIZATION_LEDGER.md`
Validation:
- Audit-only dream-map dependency audit.
- No runtime code, DB schema, or migration changes were made.
Follow-up:
- Recommended next cleanup ticket:
  - `CLEANUP (small) — Remove orphan dream-map UI component tree and dream-map-only tests`

### Remove dream map user/admin surfaces (cleanup)
Date: 2026-05-11
Commit: N/A (working tree update)
Summary:
Disabled dream-map user/admin route pages and removed primary UI entry links so dream-map is no longer reachable from main app/admin navigation.
Files touched:
- `app/dreammap/page.tsx`
- `app/admin/dreammap/backfill/page.tsx`
- `app/admin/page.tsx`
- `components/SidebarDrawer.tsx`
- `ROUTE_MAP.md`
- `docs/STABILIZATION_LEDGER.md`
Validation:
- `npm run typecheck` failed in sandbox due to PowerShell execution policy (`npm.ps1` blocked); reran with escalation.
- `npm.cmd run typecheck` passed with escalation.
- `npm run lint` failed in sandbox due to PowerShell execution policy (`npm.ps1` blocked); reran with escalation.
- `npm.cmd run lint` failed with existing repository-wide lint backlog (`2699 errors`, `208 warnings`), including `.worktrees` files.
- Manual runtime verification not completed in this environment.
Follow-up:
- Keep dream-map APIs/jobs/repos/tables intact for now.
- Next cleanup slice should remove dream-map API and orchestration surfaces after import/caller audit.

### Decouple dream map from `session.ensure` default runtime (build/cleanup)
Date: 2026-05-11
Commit: N/A (working tree update)
Summary:
Removed dream-map execution from the default `/api/session/ensure` runtime path while preserving response compatibility for existing callers.
Files touched:
- `app/api/session/ensure/route.ts`
- `docs/STABILIZATION_LEDGER.md`
Validation:
- `npm run typecheck` failed in sandbox due to PowerShell execution policy (`npm.ps1` blocked); reran with escalation.
- `npm.cmd run typecheck` passed with escalation.
- `npm run lint` failed in sandbox due to PowerShell execution policy (`npm.ps1` blocked); reran with escalation.
- `npm.cmd run lint` failed with existing repository-wide lint backlog (`2701 errors`, `208 warnings`), including files under `.worktrees`.
- Manual runtime validation not executed in this environment.
Follow-up:
- Next cleanup slice:
  - remove user-facing `/dreammap` and related admin backfill surfaces after this decoupling step.
- DB/schema cleanup remains a later, separately approved phase.

### Dream map removal plan (audit/plan)
Date: 2026-05-11
Commit: N/A (working tree update)
Summary:
Created an evidence-based staged dream-map removal plan covering runtime entrypoints, routes/APIs, jobs, repos, DB tables/migrations, UI links, tests, docs, and safe removal sequencing with validation gates.
Files touched:
- `docs/plans/dream-map-removal-plan.md`
- `docs/STABILIZATION_LEDGER.md`
Validation:
- Planning-only dream map removal ticket.
- No runtime code, DB schema, or migration changes were made.
Follow-up:
- Recommended first cleanup ticket:
  - `BUILD (controlled) — Decouple Dream Map From /api/session/ensure Default Runtime`

### Ensure de-coupling contract (audit/plan)
Date: 2026-05-11
Commit: N/A (working tree update)
Summary:
Created the alpha ensure contract plan that classifies `session.ensure` responsibilities into CORE/SIDECAR/DEFER/UNCLEAR, documents guest-mode impact and fallback semantics, and recommends the smallest safe first decoupling BUILD slice.
Files touched:
- `docs/plans/ensure-decoupling-contract.md`
- `docs/STABILIZATION_LEDGER.md`
Validation:
- Planning-only ensure contract ticket.
- No runtime code, DB schema, or migration changes were made.
Follow-up:
- Recommended first BUILD slice:
  - `BUILD (controlled) -- Alpha Ensure Run-Flag Gate (dream_map only)`

### Alpha preparation program plan
Date: 2026-05-11
Commit: N/A (working tree update)
Summary:
Created a phased alpha-preparation program plan that sequences evidence-first AUDIT/PLAN tickets before risky BUILD/CLEANUP work, defines owner decision gates and validation gates, and preserves alpha-first stabilization boundaries.
Files touched:
- `docs/plans/lumira-alpha-preparation-program.md`
- `docs/STABILIZATION_LEDGER.md`
Validation:
- Planning-only ticket.
- No runtime code, DB schema, or migration changes were made.
Follow-up:
- Execute immediate next ticket from the new program plan:
  - `AUDIT/PLAN — Ensure De-coupling Contract`

### Core flow runtime contract checks
Date: 2026-05-10
Commit: N/A (working tree update)
Summary:
Added targeted runtime contract checks and structured fail-soft warnings across core flow API paths, without changing architecture decisions.
Files touched:
- `app/api/session/ensure/route.ts`
- `app/api/frame/ensure/route.ts`
- `app/api/frame/route.ts`
- `app/api/work-block/next/route.ts`
- `docs/STABILIZATION_LEDGER.md`
Validation:
- `npm run typecheck` failed: PowerShell policy blocked `npm.ps1` (`PSSecurityException`).
- `npm run lint` failed: PowerShell policy blocked `npm.ps1` (`PSSecurityException`).
- `npm.cmd run typecheck` failed: `EPERM lstat C:\\Users\\matef`.
- `npm.cmd run lint` failed: `EPERM lstat C:\\Users\\matef`.
- Manual runtime verification not completed in this environment.
Follow-up:
- Verify core flow behavior manually in a local environment where Node/npm can execute normally.
- If warning volume is too high in production-like traffic, gate selected warnings behind a debug flag.
- Keep ensure-based v0 observation runtime as alpha truth (D5) while monitoring fallback frequency.

### Record observation stabilization strategy
Date: 2026-05-09
Commit: N/A (working tree update)
Summary:
Recorded the owner-approved observation strategy: public-alpha stabilization keeps the ensure-based v0 observation path as the active runtime truth, while long-term direction remains full convergence toward a unified dream_v1 observation system.
Files touched:
- `docs/DECISIONS.md`
- `docs/STABILIZATION_LEDGER.md`
Validation:
- Docs-only change; no application code touched.
Follow-up:
- Future observation work must respect this decision.
- Do not migrate core observation runtime to dream_v1 before an approved post-alpha observation convergence plan.
- A later audit may still map latest-pointer ownership and adapter/fallback removal conditions.

### Runtime align answer continuity read path
Date: 2026-05-09
Commit: N/A (working tree update)
Summary:
Aligned `/api/work-block/next` continuity reads with the currently persisted `dream_answers` runtime contract.
Files touched:
- `app/api/work-block/next/route.ts`
Validation:
- `npm run typecheck` and `npm run lint` attempted.
- Both blocked by local environment issues:
  - PowerShell policy blocked `npm`
  - `npm.cmd` failed with `EPERM lstat C:\\Users\\matef`
- Manual runtime verification not completed in this environment.
Follow-up:
- Keep `work_id/content` as transitional runtime fields until alpha answer schema cleanup.
- Future schema cleanup should follow `docs/specs/alpha-answer-contract.md`.
- Consider observation pathway convergence audit before broader DB cleanup.

### Documentation system setup
Date: 2026-05-09
Commit: N/A (working tree update)
Summary:
Created the documentation structure for agent-first stabilization: README for public overview, AGENTS for rules, AGENT_START_HERE for orientation, DECISIONS for accepted choices, SPEC_INDEX for navigable context.
Files touched:
- `README.md`
- `AGENTS.md`
- `docs/AGENT_START_HERE.md`
- `docs/STABILIZATION_LEDGER.md`
- `docs/DECISIONS.md`
- `docs/SPEC_INDEX.md`
Validation:
- Docs-only change; no application code touched.
Follow-up:
- Keep this ledger updated after each stabilization ticket.

## Open Risks

### Branch-only stabilization fixes remain unmerged
Severity: Medium
Description:
Some first-response stabilization work exists on branch-only history and may be mixed with unrelated cleanup.
Suggested next action:
Run a focused audit ticket to classify merge-ready fixes vs. non-essential cleanup.

### Canonical architecture references are spread across multiple docs
Severity: Medium
Description:
Core architectural intent exists, but context is distributed across older audit/spec docs.
Suggested next action:
Maintain `docs/SPEC_INDEX.md` and keep it current when new canonical docs are accepted.

## Next Recommended Tickets

### First-response branch triage
Type: AUDIT
Goal:
Classify first-response branch-only commits into merge-ready, defer, or discard buckets.
Scope:
Branch history, affected core-flow files, and stabilization docs.
Acceptance criteria:
Clear commit-level classification and explicit recommendation per change group.
Dependencies:
- `docs/STABILIZATION_LEDGER.md`
- `docs/DECISIONS.md`
- `docs/superpowers/audits/2026-04-16-stabilization-control-audit.md`
Owner decision needed:
Yes, before merge/cherry-pick.

### Core flow contract checks
Type: BUILD
Goal:
Strengthen validation for session/observe/frame/direction/work path behavior.
Scope:
Tests and small targeted fixes only in core flow paths.
Acceptance criteria:
Core flow checks run reliably and failures localize to clear contracts.
Dependencies:
- Ticket-defined route/component files
- Existing test tooling
Owner decision needed:
No.

### Deferred path inventory refresh
Type: CLEANUP
Goal:
Confirm which deferred legacy paths are still needed.
Scope:
Docs and references only unless explicitly approved for code removal.
Acceptance criteria:
Updated keep/defer/remove recommendations with evidence links.
Dependencies:
- `docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md`
- `docs/superpowers/audits/2026-04-16-stabilization-control-audit.md`
Owner decision needed:
Yes, before removals.
