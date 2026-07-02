# AGENTS.md - Agent Operating Guide (Repository Root)

This repository is developed with an AI coding agent collaborating with a human owner.

## 0) Scope and precedence
- Default rule set for the entire repo.
- More specific `AGENTS.md` files can override this within their scope.

## Coordination framing
- Lumira uses a coordinator-driven workflow.
- Repository reality is implementation evidence, not automatic product authority.
- If a meaningful product, architecture, cleanup, or UX decision appears, surface it instead of silently choosing.

## 1) Required first step
Before starting any ticket, read:
1. `docs/AGENT_START_HERE.md`
2. the ticket itself
3. any files explicitly referenced by the ticket

Do not read every document by default. Use `docs/AGENT_START_HERE.md` and `docs/DOCS_INDEX.md` to identify the right documentation layer, then use `docs/SPEC_INDEX.md` for task-specific lookup.

`docs/CURRENT_STATE.md` is a re-entry document. Read it after longer breaks, during coordinator transitions, or when current implementation state is directly relevant.

## UI implementation read path
Before starting any UI implementation ticket, read in this order:
1. `docs/canon/lumira-visual-system-philosophy-v1.md`
2. `docs/canon/lumira-shared-primitive-redesign-v1.md`
3. the route-specific contract(s)
4. the implementation ticket

UI work must not begin before this reading path is completed.

Route contracts must be interpreted through the visual philosophy and shared primitive philosophy, not as isolated layout instructions.

## 2) Working mode
- Prefer small, reviewable changes per ticket.
- If scope is large, produce an AUDIT plan first, then BUILD.
- Use Repo Scout -> Audit -> Build when repository grounding or decisions are still uncertain.
- Keep diffs minimal and localized.
- Do not change unrelated code.

## Working rules
- Implement directly on main.
- Do not create isolated worktrees.
- Do not create `.worktrees` directories.
- Validate on actual repository main unless a ticket explicitly overrides this.

## Dirty working tree
- The repository may contain unrelated pre-existing changes; preserve them.
- If the ticket requires editing a file that already has unrelated edits, make the smallest targeted change and avoid reformatting or cleanup.
- Do not revert unrelated work.

## 3) Ticket protocol
For each ticket:
1. Restate goal in 2-4 bullets.
2. List touched files (existing + new).
3. Implementation steps (ordered).
4. Acceptance criteria (DoD).
5. Testing / validation plan.
6. Rollback plan / feature flag (if applicable).

If blocked by ambiguity, ask one clear question with concrete options.

## 4) Engineering rules
- Follow TypeScript / Next.js project conventions.
- Keep logic pure where possible; isolate I/O in repos/services.
- Prefer deterministic ordering; explicitly sort keys when needed.
- Use idempotent migrations where possible.
- Avoid destructive DB changes unless explicitly requested.
- Treat Backend V2 as a clean-room implementation, not a default migration project.
- Do not treat quarantined legacy backend structures as Backend V2 architectural authority.

## 5) Must not do
- No unrelated refactors or style-only changes.
- No new dependencies without explicit approval.
- No public API renames without migration/compat plan.
- Do not remove debug/logging/meta fields unless requested.
- Do not remove legacy code merely because it appears unused; cleanup follows replacement, validation, and dependency review.
- Do not casually remove or damage user-facing pages, routes, established UI flows, or other protected surfaces without explicit instruction.

## 6) Validation commands
Use repo scripts when available:
- `npm test`
- `npm run lint`
- `npm run typecheck`

## 7) Build logging (mandatory)
- Always run builds via `npm run build` (never `next build` directly).
- `npm run build` is wired to `scripts/run-build-with-log.mjs` and appends to:
  - `docs/BUILD_LOG.md` (summary)
  - `docs/build-logs/<timestamp>.log` (full output)
- For every completed build ticket, add/update an entry in `docs/STABILIZATION_LEDGER.md` with:
  - date (UTC)
  - ticket/phase
  - touched boundaries
  - verification result references (build/test/typecheck as applicable)

Owner timezone: Europe/Budapest.
