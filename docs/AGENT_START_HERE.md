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

## Required Reading by Task Type

### Any task
- `AGENTS.md`
- this file
- `docs/DOCS_INDEX.md`
- `docs/CURRENT_STATE.md`
- the assigned ticket

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
- latest relevant migration files
- affected repo files

### Cleanup / removal task
- `docs/DECISIONS.md`
- recent relevant entries in `docs/STABILIZATION_LEDGER.md`
- run audit before deleting anything unclear

## Navigation Rules

- `docs/DOCS_INDEX.md` is the primary documentation map.
- `docs/CURRENT_STATE.md` is the operational re-entry snapshot.
- `docs/SPEC_INDEX.md` is for task-context lookup, not general onboarding.
- `docs/STABILIZATION_LEDGER.md` is historical/process context, not default first reading.

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
