# AGENTS.md — Agent Operating Guide (Repository Root)

This repository is developed with an AI coding agent collaborating with a human owner.
This file defines the global rules, conventions, and delivery format.

## 0) Scope & precedence
- This is the default rule set for the entire repo.
- Domain/local `AGENTS.md` files may add or override rules for their scope.
- In case of conflict, the more specific (local) rule wins.

## 1) Working mode
- Prefer small, reviewable changes per ticket.
- If the task is large, first provide an AUDIT plan, then proceed with BUILD.
- New files: provide full file contents.
- Existing files: keep diffs minimal and localized.

## 2) Ticket protocol
For each ticket:
1. Restate goal in 2–4 bullets.
2. List touched files (existing + new).
3. Implementation steps (ordered).
4. Acceptance criteria (DoD).
5. Testing / validation plan.
6. Rollback plan / feature flag (if applicable).

If blocked by ambiguity, ask one clear question with concrete options.

## 3) Repository conventions (general)
- Follow the project’s TypeScript / Next.js conventions.
- Keep logic pure where possible; isolate I/O in repos/services.
- Prefer deterministic ordering; explicitly sort keys when needed.

## 4) Data & DB guidelines
- Use idempotent migrations where possible.
- Avoid destructive changes unless explicitly requested.
- Store debug/meta payloads in designated fields where applicable.

## 5) Output format (delivery)
- Provide patch-style diffs where practical.
- For new files, provide the entire file.
- Include a short verification checklist.

## 6) Must NOT do
- No unrelated refactors or style-only changes.
- No new dependencies without explicit approval.
- No public API renames without migration/compat plan.
- Do not remove debug/logging fields unless requested.

## 7) Commands / checks
Use repo scripts if available. If unknown, suggest:
- `npm test` / `pnpm test`
- `npm run lint`
- `npm run typecheck`

---
Owner timezone: Europe/Budapest.
