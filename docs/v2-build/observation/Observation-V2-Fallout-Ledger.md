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
- Mode: V2-owned generated write path with native V2 persistence and native V2 rehydration
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
- V2 impact: this is no longer the live generated durability owner, but it still remains the compatibility durability path for manual/API ingress and historical V1-shaped reads.
- Future work: isolate V1 persistence more explicitly as compatibility-only and remove it when no ingress or read path still depends on it.
- Cleanup/removal potential: fragment-first storage assumptions may become removable once compatibility ingress and historical read dependencies are retired.

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

### 5. Native V2 storage now owns live generated durability, but V1 durability still exists beside it

- Boundaries:
  - `src/infrastructure/persistence/observation-v2-write-store.ts`
  - `src/infrastructure/supabase/repositories/observation-v2-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/observation-supabase-repository.ts`
- Current state: capture generation now writes bundles through the native V2 repository, while V1 row/fragment durability remains available for compatibility-only callers.
- V2 impact: live generated writes preserve scene order, scene summaries, boundary signals, evidence, and derived structures without flattening them into fragment-era storage.
- Future work: prevent compatibility callers from silently being treated as equivalent to native V2 bundles and retire the V1 durability path when no longer needed.
- Cleanup/removal potential: fragment-position summary tracing and flat fragment projection are now removable from the live generated path and become full retirement candidates once compatibility callers are cut over or removed.

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
  - `src/infrastructure/supabase/repositories/observation-v2-supabase-repository.ts`
- Current state: a V2-native repository now exists for bundle durability and rehydration, but the older V1 repository still exists and still defines the manual/API compatibility path.
- V2 impact: durable Observation ownership is real for the live generated path, but repository ownership is still split by ingress and historical storage model.
- Future work: cut read-side consumers and compatibility ingress away from the V1 repository before claiming full Observation ownership.
- Cleanup/removal potential: V1-first repository contracts can now be narrowed to explicit compatibility-only status and later retired.

### 8. Native V2 and historical V1 observations are not semantically equivalent

- Boundaries:
  - `supabase/migrations/20260611_0019_observation_v2_native_persistence.sql`
  - `supabase/migrations/20260524_0003_observations.sql`
- Current state: native V2 bundles preserve canonical scene-first semantics, while historical V1 rows preserve summary/fragment-era semantics only.
- V2 impact: mixed-history systems must not silently pretend both durability models are interchangeable Observation truth.
- Future work: define read-selection and migration posture for mixed historical records.
- Cleanup/removal potential: historical V1-only reconstruction logic may become removable after an explicit migration or archive strategy exists.

## Notes

- Add new fallout items as implementation reveals them.
- Record breakage risk and likely cleanup points, but do not fix them automatically in Phase 1.
