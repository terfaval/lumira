# agents.md — Agent Operating Guide (Lumira / Álomtér)

This repository is developed with an AI coding agent (e.g., Codex) collaborating with a human owner.
This file defines how the agent should work: scope, conventions, safety, and delivery format.

## 0) Working mode

- Prefer **small, reviewable changes** per ticket.
- If the task is large, first output an **AUDIT plan** (what you will inspect, risks, expected changes), then proceed with BUILD.
- When creating **new files**, provide the **full file content** in one shot.
- When modifying existing files, prefer **minimal diffs** and keep changes localized.

## 1) Project priorities

- Deterministic, debuggable pipelines:
  - Prefer X1 (deterministic, explicit mapping) over X0 (null / missing logic).
  - Prefer trace-first: every derived artifact should be explainable via stored inputs and evidence pointers.
- “Store-first”:
  - Prefer storing build artifacts / debug meta in DB payloads over computing in UI.
- Avoid interpretive/therapeutic claims in the product logic:
  - Canonicalization is labeling/aliasing, not “meaning”.

## 2) Ticket protocol

For each ticket:
1. **Restate goal** in 2–4 bullets.
2. **List touched files** (existing + new).
3. **Implementation steps** (ordered).
4. **Acceptance criteria (DoD)**.
5. **Testing / validation plan**.
6. **Rollback plan / feature flag** (if applicable).

If something is ambiguous and blocks progress, ask **one** clear question with concrete options.

## 3) Repository conventions (general)

- TypeScript / Next.js conventions apply.
- Keep functions **pure** where possible; isolate DB I/O in repos.
- Keep deterministic ordering:
  - When generating arrays from maps/sets, **sort keys** explicitly.
  - No random seeds without explicit deterministic seed.

## 4) Database and Supabase

- Migrations:
  - Use idempotent DDL where possible.
  - Avoid destructive changes unless explicitly requested.
- Prefer storing debug details under:
  - `dream_map.payload.meta.debug` (bounded size; keep samples small).
- Avoid adding tables unless necessary; prefer BUILD artifacts in payload first.

## 5) Dream Map specifics (current direction)

- Co-occurrence should not be “complete clique” by default.
- Prefer span/offset evidence:
  - `dream_entry_highlights` offsets can be used as primary trace sources.
- Edge weights should be deterministic and bounded:
  - Include pruning (top M edges, or thresholds).
- Always include a deterministic hash of key inputs when building artifacts.

## 6) Output format (how to deliver work)

When proposing code changes:
- Provide a **patch-style diff** where practical.
- For new files: provide the **entire file**.
- Include a short **verification checklist** the human can run.

## 7) Things the agent must NOT do

- Do not change unrelated code style or reformat files “just because”.
- Do not introduce new dependencies unless explicitly necessary.
- Do not remove logging/debug fields unless requested.
- Do not rename public APIs without providing a migration/compat plan.

## 8) Commands / checks (guidance)

Use the repo’s standard scripts if available. If unknown, suggest:
- `npm test` / `pnpm test`
- `npm run lint`
- `npm run typecheck`
Only run commands you are confident exist, otherwise ask or inspect `package.json`.

## 9) Definition of Done (default)

A ticket is “done” when:
- Acceptance criteria are met.
- Minimal tests/checks are green (or clearly stated what couldn’t be run).
- Changes are localized and reviewable.
- Rollback path is clear (flag/config) if risk exists.

---
Owner timezone: Europe/Budapest.
