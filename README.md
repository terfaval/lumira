# Lumira Clean-room Rebuild

Lumira is being rebuilt from first principles as a reflective-space-first system.

This repository is not a migration or legacy continuation.
It is a new foundation around reflective continuity, bounded cognition, and thin routes.

## Canonical Authority

Use this order when making build decisions:

1. `docs/canon/LUMIRA-CONSTITUTION-v1.md`
2. `docs/canon/LUMIRA-MINIMAL-REFLECTIVE-RUNTIME-v1.md`
3. `docs/canon/clean-room-technical-constitution.md`
4. `docs/runtime/*`
5. implementation files

If lower layers conflict with higher layers, higher layers win.

## Repository Shape

- `app/`: route delivery only, thin entrypoints
- `src/domain/`: canonical domain entities and contracts
- `src/runtime/`: orchestration boundaries and reflective movement scaffolding
- `src/cognition/`: internal observation/latent/continuity/salience systems
- `src/reflective-space/`: user-facing reflective composition assembly
- `src/infrastructure/`: replaceable persistence and external boundaries
- `src/ui/`: presentation-only surfaces
- `src/shared/`: domain-neutral shared utilities

## Auth + Ownership Boundary

- Reflective Space requires authenticated identity (`/auth` for sign in/sign up).
- API ownership is resolved server-side from Supabase session cookies.
- `x-lumira-user-id` fallback is local/non-production only and never authoritative in production.
- Admin bootstrap is minimal and operational (`user_admin_roles`), isolated from cognition/runtime meaning.

## Forbidden Patterns

- route-owned cognition
- session-centric ontology
- workflow/completion pressure systems
- latent-to-UI direct truth surfacing
- global "smart" orchestration managers
- interpretation authority claims

## Build Principle

Build from ontology outward.
Prefer calm, constrained, inspectable systems over complex behavior.

Viewport entry is bounded by explicit section caps and read-only window contracts to prevent feed/dashboard drift.
