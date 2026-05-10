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
- the assigned ticket

### Product / README / copy task
- `README.md`
- `docs/DECISIONS.md`
- relevant product/spec docs listed in `docs/SPEC_INDEX.md`

### Core flow task
- `docs/STABILIZATION_LEDGER.md`
- `docs/SPEC_INDEX.md`
- route/component files named in the ticket

### Database / architecture task
- `docs/SPEC_INDEX.md`
- latest relevant migration files
- affected repo files

### Cleanup / removal task
- `docs/STABILIZATION_LEDGER.md`
- `docs/DECISIONS.md`
- run audit before deleting anything unclear

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
