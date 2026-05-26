# Lumira Documentation Map

## Purpose

This documentation set supports a clean-room rebuild anchored in Reflective Space ontology.

## Authority Hierarchy

1. `docs/canon/`
2. `docs/runtime/`
3. implementation docs created for active tickets
4. `docs/archive/legacy-transition/` (historical reference only)

Legacy transition docs are never canonical truth.

## Folder Responsibilities

- `docs/canon/`: constitutional and canonical design authority
- `docs/runtime/`: runtime contracts, state/lifecycle boundaries
- `docs/archive/legacy-transition/`: historical material and compatibility context

Current runtime guardrail references:
- `docs/runtime/reflective-space-viewport-guardrails-v1.md`

## Auth Boundary Notes

- Reflective payloads are user-private and require authenticated ownership context.
- Identity resolution is server-trusted; client/UI never owns security truth.
- Development header fallback (`x-lumira-user-id`) is non-production only.
- Admin bootstrap is operational-only and does not alter reflective cognition semantics.

## Forbidden Documentation Drift

Do not reintroduce or normalize:

- workflow-first architecture
- route-owned cognition
- session-owned reflective truth
- completion/progress mechanics as system gravity
- legacy orchestration assumptions as canonical runtime design

## Build Documentation Philosophy

Keep docs restrained, explicit, and layer-aware.
Prefer clarity over comprehensiveness and avoid speculative architecture narratives.

## Build Logging

- Build runs must go through `npm run build` (wrapper script), not direct `next build`.
- Summary log: `docs/BUILD_LOG.md`
- Full per-run logs: `docs/build-logs/`
- Milestone/backfill history: `docs/STABILIZATION_LEDGER.md`
