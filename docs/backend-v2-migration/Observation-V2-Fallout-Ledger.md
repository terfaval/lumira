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

- Phase: Observation V2 Ownership Cutover (Phase 1)
- Mode: V2-owned generated write path with temporary V1 storage adapter
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

### 4. Observation engine now returns a V2 bundle, but durable reads remain V1-owned

- Boundary: `src/cognition/observation/observation-engine.ts`
- Current state: the engine now returns a scene-first `ObservationV2Bundle` directly instead of projecting `CreateObservationInput`.
- V2 impact: internal generation callers no longer need to own the V1 write shape.
- Future work: move durable read seams and downstream consumers onto V2-aware intake before claiming full operational ownership.
- Cleanup/removal potential: any remaining engine-side V1 write assumptions are now removable.

### 5. Temporary storage adapter still flattens scene semantics into fragment-shaped outputs

- Boundaries:
  - `src/infrastructure/persistence/observation-v2-write-store.ts`
  - `src/cognition/observation/scene-discovery-projection.ts`
- Current state: capture generation now writes through a V2-owned seam, but that seam still projects the bundle into `CreateObservationInput` for temporary row/fragment persistence.
- V2 impact: callers no longer own the projection, but durable storage still loses native scene semantics.
- Future work: replace the temporary storage adapter with V2-native persistence and durable rehydration.
- Cleanup/removal potential: fragment-position summary tracing and flat fragment projection may become removable once persistence is scene-first.

### 6. Scene-first LLM extraction is now the live capture owner, but manual/API ingress remains V1-owned

- Boundaries:
  - `app/capture/page.tsx`
  - `src/cognition/observation/llm-scene-observation-extractor.ts`
  - `app/api/reflective-objects/[id]/observations/route.ts`
- Current state: capture-generated Observation now originates from the scene-first extractor and writes through the V2 seam, while manual/API POST still validates `summary + fragments[]`.
- V2 impact: the main live generated path is cut over, but the public/manual ingress still advertises the V1 shape.
- Future work: isolate or replace manual/API ingress with a V2-native route when persistence/read-side work is ready.
- Cleanup/removal potential: legacy `buildLlmObservationExtraction()` ownership on the live generated path is now removable once no explicit compatibility caller remains.

### 7. Repository contract remains the durable V1 chokepoint

- Boundaries:
  - `src/domain/observation/contracts.ts`
  - `src/infrastructure/supabase/repositories/observation-supabase-repository.ts`
- Current state: the only durable Observation repository still accepts and returns V1 `CreateObservationInput` / `Observation`.
- V2 impact: write ownership is now above the repository, but full durable Observation ownership is still blocked by V1-only repository contracts.
- Future work: add a V2-native persistence/read seam that can durably rehydrate scenes, summaries, boundary signals, and scene-local derived structures.
- Cleanup/removal potential: V1-first repository contracts can become compatibility-only once V2 durable reads exist.

## Notes

- Add new fallout items as implementation reveals them.
- Record breakage risk and likely cleanup points, but do not fix them automatically in Phase 1.
