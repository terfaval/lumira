# Observation V2 Fallout Ledger

Date opened: 2026-06-08
Status: Active
Scope: Observation V2 foundation fallout tracking

## Purpose

Track fallout created by the additive Backend V2 Observation foundation work.

This ledger records:

- affected routes
- affected UI surfaces
- affected downstream layers
- known incompatibilities
- future migration and cutover points
- likely cleanup and removal candidates

This file is documentary only.

It does not authorize automatic migration or cleanup.

## Current Phase

- Phase: Observation V2 Foundation (Phase 1)
- Mode: additive runtime only
- V1 status: transitional compatibility layer

## Active Fallout Items

### 1. V1 Observation route remains bundle/fragment-shaped

- Boundary: `app/api/reflective-objects/[id]/observations/route.ts`
- Current state: route accepts and returns V1-shaped Observation payloads.
- V2 impact: scene-first runtime will require projection to V1 rather than native route support.
- Future work: define V2-native route and cutover strategy later.
- Cleanup/removal potential: direct V1 manual ingress may become removable after V2-native write path exists.

### 2. V1 persistence remains observation row plus fragment rows

- Boundary: observation repository and adapters
- Current state: storage is centered on `observations` plus `observation_fragments`.
- V2 impact: scene-first runtime cannot persist natively in Phase 1.
- Future work: evaluate V2-native persistence boundary after runtime stabilizes.
- Cleanup/removal potential: fragment-first storage assumptions may become removable later.

### 3. Downstream consumers remain V1-shaped

- Boundaries:
  - Glossary extraction
  - Latent inputs
  - Opening generation inputs
  - Reflection inputs
  - Dream Map inputs
  - UI observation read models
- Current state: downstream systems consume V1 Observation outputs or fragment-derived material.
- V2 impact: V2 must project to V1-compatible outputs for now.
- Future work: audit each downstream layer for V2 cutover strategy.
- Cleanup/removal potential: fragment-centric downstream parsing may become removable later.

### 4. Observation engine is now scene-first internally but still returns V1 persistence payloads

- Boundary: `src/cognition/observation/observation-engine.ts`
- Current state: the engine now builds a scene-first V2 bundle internally, then projects it into `CreateObservationInput`.
- V2 impact: the canonical runtime shape advances without cutting over callers or persistence.
- Future work: switch engine consumers to native V2 bundle usage before removing the compatibility projection.
- Cleanup/removal potential: direct engine ownership of V1 payload shaping may become removable later.

### 5. Compatibility projection still flattens scene semantics into fragment-shaped outputs

- Boundary: `src/cognition/observation/scene-discovery-projection.ts`
- Current state: scene-first observations are compressed into a flat fragment array for temporary V1 persistence compatibility.
- V2 impact: some scene-local structure is preserved only in the V2 bundle, not in the projected V1 write shape.
- Future work: replace projection-only durability with V2-native storage and route contracts.
- Cleanup/removal potential: fragment-position summary tracing and flat fragment projection may become removable later.

### 6. Scene-first LLM extraction exists but is not yet the live route owner

- Boundary: `src/cognition/observation/llm-scene-observation-extractor.ts`
- Current state: a scene-first provider-backed extraction path exists, but existing routes and downstream consumers are not cut over to it in Phase 1.
- V2 impact: the new canonical extraction foundation is available without forcing immediate repo-wide migration.
- Future work: choose and execute cutover points for capture, persistence, and downstream read models.
- Cleanup/removal potential: legacy fragment-first extraction entrypoints may become removable later once route ownership shifts.

## Notes

- Add new fallout items as implementation reveals them.
- Record breakage risk and likely cleanup points, but do not fix them automatically in Phase 1.
