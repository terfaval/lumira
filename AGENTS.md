# AGENTS.md - Agent Operating Guide (Repository Root)

This repository is developed with an AI coding agent collaborating with a human owner.

## 0) Scope and precedence
- Default rule set for the entire repo.
- More specific `AGENTS.md` files can override this within their scope.

## 1) Required first step
Before starting any ticket, read:
1. `docs/AGENT_START_HERE.md`
2. the ticket itself
3. any files explicitly referenced by the ticket

Do not read every document by default. Use `docs/AGENT_START_HERE.md` and `docs/SPEC_INDEX.md` to decide what is relevant.

## 2) Working mode
- Prefer small, reviewable changes per ticket.
- If scope is large, produce an AUDIT plan first, then BUILD.
- Keep diffs minimal and localized.
- Do not change unrelated code.

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

## 5) Must not do
- No unrelated refactors or style-only changes.
- No new dependencies without explicit approval.
- No public API renames without migration/compat plan.
- Do not remove debug/logging/meta fields unless requested.

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
