# Agent Start Here

## Current Goal

Prepare Lumira for public alpha by stabilizing the core flow:

`session -> observe -> frame -> direction -> work`

## Product Boundary

Lumira is a guided dream journaling and reflection app.

It is not:
- a dream interpreter
- therapy
- a diagnostic tool
- an authoritative symbolic system

The AI should support user-led reflection through questions, pacing, and non-dogmatic framing.

## Coordination Context

Lumira uses a coordinator-driven workflow.

- Repository reality is implementation evidence, not automatic product authority.
- Surface meaningful product, architecture, cleanup, and UX decisions instead of silently choosing.
- `docs/chatgpt coordinating/LUMIRA_COORDINATION_PLAYBOOK.md` exists for coordinator and handoff context; do not treat it as mandatory reading for every implementation ticket.

## Required Reading by Task Type

### Any task
- `AGENTS.md`
- this file
- `docs/DOCS_INDEX.md`
- the assigned ticket

Read `docs/CURRENT_STATE.md` only when re-entering after time away, during coordinator transitions, or when current implementation state is directly relevant.

### Product / README / copy task
- `README.md`
- `docs/DECISIONS.md`
- `docs/SPEC_INDEX.md`

### UI implementation task
- `docs/canon/lumira-visual-system-philosophy-v1.md`
- `docs/canon/lumira-shared-primitive-redesign-v1.md`
- route-specific contract(s)
- the implementation ticket

Do not begin UI implementation before completing this read path.
Interpret route-level UI work through the visual philosophy and shared primitive philosophy first.

### Core flow task
- `docs/SPEC_INDEX.md`
- recent relevant entries in `docs/STABILIZATION_LEDGER.md` when historical build context is needed
- route/component files named in the ticket

### Database / architecture task
- `docs/SPEC_INDEX.md`
- `docs/canon/backend-v2/BACKEND_V2_CONSTRUCTION_SITE.md` when Backend V2 or clean-room severance is involved
- latest relevant migration files
- affected repo files

Backend V2 is a clean-room implementation, not a default migration project.
Quarantined legacy backend structures are not architectural authority.

### Cleanup / removal task
- `docs/DECISIONS.md`
- recent relevant entries in `docs/STABILIZATION_LEDGER.md`
- run audit before deleting anything unclear

Cleanup follows replacement: replacement, validation, and dependency review come before removal.

## Navigation Rules

- `docs/DOCS_INDEX.md` is the primary documentation map.
- `docs/CURRENT_STATE.md` is the operational re-entry snapshot, not default first reading for every ticket.
- `docs/SPEC_INDEX.md` is for task-context lookup, not general onboarding.
- `docs/STABILIZATION_LEDGER.md` is historical/process context, not default first reading.
- Do not read the documentation corpus by default; use the indexes and the ticket to narrow the next documents.
- Avoid unnecessary documentation archaeology.

## Working Rules

- Implement directly on main.
- Do not create isolated worktrees.
- Do not create `.worktrees` directories.
- Validate on actual repository main unless the ticket explicitly overrides this.
- Preserve unrelated pre-existing changes; make only the smallest required edits in dirty files and do not revert unrelated work.

## Current Priority

1. Stabilize public-alpha core flow.
2. Reduce legacy complexity.
3. Clarify canonical data sources.
4. Preserve safety and non-interpretive AI behavior.
5. Keep all diffs small and reviewable.

## Do Not

- Do not introduce new product promises.
- Do not make the AI sound diagnostic or authoritative.
- Do not remove legacy code without audit or explicit instruction.
- Do not create broad refactors inside small tickets.
- Do not treat `docs/backend-v2-migration/` as active Backend V2 authority.
- Do not casually remove or damage user-facing pages, routes, or established UI flows during backend cleanup or architecture work without explicit instruction.
