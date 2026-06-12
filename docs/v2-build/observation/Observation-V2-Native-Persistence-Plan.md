# Observation V2 Native Persistence Plan

Date: 2026-06-11
Status: Draft for review
Scope: Observation V2 persistence planning only

## Executive Summary

Observation V2 is now the authoritative Observation model, and the live generated write path is already V2-owned above persistence.

Durable Observation ownership is still blocked by one remaining V1 chokepoint:

- the only durable repository contract accepts `CreateObservationInput`
- the only durable read contract returns `Observation`
- the only durable schema is `observations` plus `observation_fragments`

That storage model cannot faithfully preserve or later rehydrate the canonical Observation Bundle defined in:

- `docs/backend-v2-migration/Observation-Bundle-Contract-v1.md`
- `docs/backend-v2-migration/Observation-Authority-Cutover-Contract-v1.md`

The smallest meaningful persistence build is therefore not a broad repository rewrite.

It is:

- add a native Observation V2 persistence boundary that durably stores one bundle per reflective object
- preserve ordered scenes, scene summaries, boundary signals, scene uncertainty, scene-contained observations, observation evidence, observation uncertainty, scene-local derived structures, and provenance metadata without flattening them into fragment-era semantics
- add durable rehydration back into `ObservationV2Bundle`
- keep V1 row/fragment persistence only as an explicitly transitional compatibility surface if a temporary projection is still required

Recommended storage shape:

- `observation_v2_bundles`
- `observation_v2_scenes`
- `observation_v2_scene_observations`

with JSON payload columns for secondary structured collections:

- boundary signals
- uncertainty notes
- evidence arrays
- derived structures
- provenance / source metadata

This hybrid model is the narrowest design that stays scene-first, preserves full meaningful bundle output, and avoids an unnecessary explosion into many tiny persistence tables.

## Current Persistence Map

## Current state summary

Observation V2 generation exists, but durability is still V1-defined.

Directly inspected Observation boundaries:

- `src/domain/observation/v2-runtime.ts`
- `src/infrastructure/persistence/observation-v2-write-store.ts`
- `src/domain/observation/contracts.ts`
- `src/domain/observation/http-contract.ts`
- `src/infrastructure/supabase/repositories/observation-supabase-repository.ts`
- `src/infrastructure/supabase/adapters/observation-row.ts`
- `supabase/migrations/20260524_0003_observations.sql`

Direct non-Observation inspections and why they were necessary:

- `app/capture/page.tsx`
  - needed because it is the live generated Observation write ingress
- `app/api/reflective-objects/[id]/observations/route.ts`
  - needed because it is the manual/API Observation ingress

## What currently blocks durable Observation V2 persistence

1. The runtime bundle is narrower than the canonical bundle contract.
   - `ObservationV2Bundle` currently carries `reflectiveObjectId`, `userId`, `source`, and `scenes`
   - it does not yet carry stable bundle identity or broader bundle-level provenance/uncertainty metadata as first-class bundle fields

2. The only durable write seam still projects V2 into V1 before persistence.
   - `src/infrastructure/persistence/observation-v2-write-store.ts` calls `projectObservationV2BundleToCreateObservationInput(...)`
   - durable storage therefore loses native scene semantics before write

3. The repository contract is V1-only.
   - `ObservationRepository.create(input: CreateObservationInput): Promise<Observation>`
   - `ObservationRepository.listByReflectiveObject(...): Promise<Observation[]>`
   - `ObservationRepository.getById(...): Promise<Observation | null>`

4. The durable schema is fragment-first.
   - one `observations` row stores bundle-level material
   - many `observation_fragments` rows store flattened fragment content
   - there is no native durable representation for scenes, scene order, scene summaries, boundary signals, scene-local derived structures, or observation-level evidence arrays

5. The V2-to-V1 projection is semantic compression, not harmless transport mapping.
   - `scene-discovery-projection.ts` maps every scene-contained observation to `category: "scene"`
   - it synthesizes a summary from flattened observation text
   - it reconstructs `summaryTrace` for V1 persistence
   - it discards scene grouping, scene-local boundary reasoning, and derived structure boundaries

## Which persistence boundaries remain V1-owned

- `src/domain/observation/contracts.ts`
- `src/domain/observation/types.ts`
- `src/domain/observation/http-contract.ts`
- `src/infrastructure/supabase/repositories/create-observation-repository.ts`
- `src/infrastructure/supabase/repositories/observation-supabase-repository.ts`
- `src/infrastructure/supabase/adapters/observation-row.ts`
- `supabase/migrations/20260524_0003_observations.sql`
- `app/api/reflective-objects/[id]/observations/route.ts`

## Which persistence assumptions still come from V1

- one durable Observation record equals one top-level `summary`
- observation content is flattened into `fragments[]`
- ordering is fragment position, not scene order plus observation order
- durability is defined by repository row shape rather than bundle contract
- evidence is singular per fragment row, not plural per observation
- scene summaries are optional to the runtime but absent from storage
- boundary signals are absent from storage
- derived structures are absent from storage
- `summaryTrace` is treated as durable orientation structure even though it is a V1 bridge artifact
- read models reconstruct `Observation`, not `ObservationV2Bundle`

## Target Persistence Model

## Persistence principles

- Persist the canonical Observation Bundle, not a minimal substrate.
- Preserve generated meaningful work when it already exists.
- Keep scenes as the primary organizational unit.
- Treat observations as the primary content inside scenes.
- Keep derived structures secondary, but durably preserve them when generated.
- Do not optimize around long-term V1 coexistence.

## What must be stored to fully rehydrate an `ObservationV2Bundle`

Required durable bundle material:

- bundle identity
- reflective object identity
- user identity
- source / provenance origin
- bundle-level boundary version or extraction version
- ordered scenes
- per-scene identity
- per-scene order
- per-scene summary
- per-scene boundary signals
- per-scene uncertainty notes when present
- per-scene evidence context if retained
- ordered scene-contained observations
- per-observation identity
- per-observation order within scene
- per-observation text
- per-observation evidence array
- per-observation uncertainty note when present
- per-scene derived structures

Recommended bundle metadata additions before or during persistence build:

- `bundleId`
- bundle-level provenance metadata
- optional bundle-level uncertainty notes
- extraction/runtime version metadata separate from V1 `boundaryVersion`

## Which bundle elements are first-class persisted entities

First-class entities should be the minimum units that have durable identity and ordering responsibilities:

1. Bundle
   - one row per Observation Bundle / reflective object write
2. Scene
   - one row per scene inside the bundle
3. Scene Observation
   - one row per observation inside a scene

These are first-class because they define the canonical memory structure:

```text
Bundle
-> Scenes
-> Observations
```

## Which bundle elements are persisted derived outputs

Persist as derived-but-durable material:

- scene summaries
- boundary signals
- scene uncertainty notes
- scene evidence context
- observation evidence arrays
- observation uncertainty notes
- scene-local derived structures:
  - actors
  - locations
  - objects
  - interactions
  - affect
  - agency
  - phenomenology
  - metacognition

These remain secondary Observation material, but they should generally be stored if already generated because recomputing them would discard meaningful prior work or risk drift.

## Which bundle elements can remain recomputable if desired

These can remain recomputable or cached read models rather than mandatory primary persistence columns:

- bundle-level orientation summary if introduced later
- salience
- V1 `summary`
- V1 `summaryTrace`
- V1 fragment categories / fragment rows

Open question with a defensible optional posture:

- scene-level evidence context may be persisted directly or rebuilt from observation evidence at read time
- the recommended first build stores it directly because it is already present in the runtime and makes rehydration lossless

## Recommended physical persistence shape

### `observation_v2_bundles`

Purpose:
- stable durable anchor for one canonical Observation Bundle

Suggested columns:

- `id`
- `user_id`
- `reflective_object_id`
- `source`
- `provenance_metadata` jsonb
- `bundle_uncertainty_notes` jsonb
- `runtime_version`
- `status`
- `created_at`
- `updated_at`
- `archived_at`

### `observation_v2_scenes`

Purpose:
- ordered scene memory inside one bundle

Suggested columns:

- `id`
- `bundle_id`
- `user_id`
- `reflective_object_id`
- `scene_id`
- `position`
- `summary`
- `boundary_signals` jsonb
- `uncertainty_notes` jsonb
- `evidence_context` jsonb
- `derived_structures` jsonb
- `created_at`
- `updated_at`

### `observation_v2_scene_observations`

Purpose:
- ordered observation memory inside one scene

Suggested columns:

- `id`
- `bundle_id`
- `scene_row_id`
- `user_id`
- `reflective_object_id`
- `observation_id`
- `position`
- `text`
- `evidence` jsonb
- `uncertainty_note`
- `created_at`
- `updated_at`

## Why this hybrid model is recommended

- It preserves scene-first structure natively.
- It keeps bundle, scene, and observation order explicit.
- It avoids a single opaque blob becoming the only durable form.
- It avoids over-normalizing every evidence span or derived item into its own table before the product actually needs that queryability.
- It keeps future V2 reads simple: load bundle row, ordered scene rows, ordered observation rows, then rehydrate JSON-backed secondary structures.

## Bundle Rehydration Requirements

Durable rehydration is complete only when the system can read native V2 storage and reconstruct a canonical `ObservationV2Bundle` without using V1 rows as source truth.

Rehydration must guarantee:

- ordered scene restoration
- ordered observation restoration inside each scene
- preservation of scene summaries
- preservation of boundary signals
- preservation of uncertainty notes where present
- preservation of observation evidence arrays
- preservation of derived structures without recomputation
- preservation of provenance/source metadata

Rehydration must not depend on:

- `observations.summary`
- `observation_fragments`
- rebuilt V1 `summaryTrace`
- flattening scenes into fragment order and then inferring scenes back later

Definition of sufficient round-trip:

```text
ObservationV2Bundle
-> native V2 persistence write
-> native V2 persistence read
-> ObservationV2Bundle
```

with no loss of:

- scene count
- scene order
- scene summaries
- boundary signals
- observation count per scene
- observation order per scene
- observation evidence
- derived structures

## Persistence Phases

## Phase 1: Canonical V2 bundle boundary hardening

Goal:
- make the runtime bundle persistence-ready before schema work

Work:

- add explicit `bundleId`
- add bundle-level provenance metadata
- add optional bundle-level uncertainty notes
- define the exact durable V2 repository input/output contracts

Reason:
- persistence should not invent missing bundle metadata at adapter time

## Phase 2: Native V2 write persistence

Goal:
- durably store native bundles without flattening into V1

Work:

- add `observation_v2_bundles`
- add `observation_v2_scenes`
- add `observation_v2_scene_observations`
- add a V2-native write repository/store
- write the live V2 capture path into native storage

Result:
- generated Observation writes become durably V2-owned

## Phase 3: Native V2 rehydration

Goal:
- read native storage back as `ObservationV2Bundle`

Work:

- add native V2 read repository methods
- implement bundle rehydration assembly
- add round-trip tests

Result:
- durable Observation ownership becomes real, not write-only

## Phase 4: V1 compatibility isolation

Goal:
- narrow the V1 repository and route to explicit compatibility use only

Work:

- keep V1 projection only if a live caller still requires it
- document the exact migration purpose of each remaining V1 persistence/read surface

Result:
- V1 durability stops pretending to be neutral infrastructure

## Phase 5: Observation-side retirement cleanup

Goal:
- mark fragment-first Observation persistence as removable once no migration purpose remains

Work:

- retire V2 write-store projection helper if unused
- retire V1-first Observation repository contracts if native reads are active
- retire V1 persistence adapters when downstream cutovers no longer depend on them

Result:
- Observation durability converges on one native owner

## Smallest Meaningful First Build

The smallest meaningful first build is:

- add native V2 bundle persistence for the live generated path
- support immediate native rehydration by bundle id or reflective object id
- keep V1 persistence untouched except where a temporary dual-write or temporary projection is required during the cutover window

Why this is the smallest meaningful build:

- it establishes durable V2 ownership
- it proves V2 round-trip rehydration
- it does not require downstream cutover
- it does not require broad repository redesign

What is not enough:

- adding only new types
- adding only a blob cache with no native read contract
- renaming current V1 rows without preserving scenes
- continuing to flatten scenes into fragments and promising later rehydration

## Expected Boundaries / Files

Primary Observation files likely involved in the future BUILD:

- `src/domain/observation/v2-runtime.ts`
- `src/domain/observation/contracts.ts`
- `src/infrastructure/persistence/observation-v2-write-store.ts`
- `src/infrastructure/persistence/observation-store.ts`
- `src/infrastructure/supabase/repositories/create-observation-v2-repository.ts`
- `src/infrastructure/supabase/repositories/observation-v2-supabase-repository.ts`
- `src/infrastructure/supabase/repositories/create-observation-repository.ts`
- `src/infrastructure/supabase/repositories/observation-supabase-repository.ts`
- `src/infrastructure/supabase/adapters/observation-v2-row.ts`
- `src/infrastructure/supabase/adapters/observation-row.ts`
- `src/infrastructure/supabase/repositories/__tests__/observation-v2-supabase-repository.test.ts`
- `src/domain/observation/http-contract.ts`
- `src/infrastructure/supabase/repositories/__tests__/observation-supabase-repository.test.ts`
- `src/infrastructure/supabase/adapters/__tests__/observation-row.test.ts`
- `src/infrastructure/supabase/adapters/__tests__/observation-v2-row.test.ts`
- `src/infrastructure/persistence/__tests__/observation-v2-write-store.test.ts`
- `supabase/migrations/20260611_0019_observation_v2_native_persistence.sql`

Direct ingress seams that may require narrow updates because they are Observation persistence callers:

- `app/capture/page.tsx`
- `app/api/reflective-objects/[id]/observations/route.ts`

No downstream Observation consumers were inspected for this plan because they are outside the allowed scope and not required to define native Observation persistence.

## V1 Retirement Candidates

Transitional immediately after native V2 persistence exists:

- `src/infrastructure/persistence/observation-v2-write-store.ts` as a temporary V1 projection adapter
- `projectObservationV2BundleToCreateObservationInput(...)` for durable storage purposes
- `summaryTrace` as required durable Observation memory

Future retirement candidates after native V2 reads exist:

- `ObservationRepository.create(input: CreateObservationInput)`
- `ObservationRepository.listByReflectiveObject(...): Promise<Observation[]>`
- `ObservationRepository.getById(...): Promise<Observation | null>`
- `src/infrastructure/supabase/adapters/observation-row.ts`
- `observations` as the authoritative Observation durability table
- `observation_fragments` as the authoritative Observation durability table

Retirement candidates should be removed only when no live migration purpose remains.

They should not be preserved solely to keep V1 consumers comfortable.

## Fallout Ledger Updates

Add or refine the following items in `docs/backend-v2-migration/Observation-V2-Fallout-Ledger.md` during the persistence cutover:

1. Native V2 persistence now diverges from legacy row/fragment durability.
   - impact: there are two durability paths during transition unless V1 storage is retired immediately

2. V1 durability can no longer be treated as the recoverable Observation source of truth.
   - impact: historical and compatibility reads may not preserve canonical V2 semantics

3. Bundle metadata is currently under-specified in the runtime.
   - impact: persistence cutover requires bundle-level metadata hardening before adapter logic calcifies assumptions

4. Scene-local derived structures become durably preserved.
   - impact: downstream systems may begin relying on stored derived outputs rather than recomputation, so drift rules need to stay explicit

5. Manual/API ingress remains V1-shaped unless separately cut over.
   - impact: write ownership becomes split by ingress until that route is isolated or replaced

6. Historical V1 observations may be only partially rehydratable into V2.
   - impact: mixed-history read behavior must be documented instead of silently pretending old rows are equivalent to native bundles

7. Native V2 persistence increases schema/version drift risk.
   - impact: extraction/runtime versioning must be durable so future readers know how to interpret stored bundles

## New Risks After Persistence Cutover

- Mixed-history risk:
  - old V1 rows and new V2 bundles will not be semantically equivalent

- Dual-write drift risk:
  - if V1 persistence is temporarily retained, native V2 and projected V1 storage can diverge

- Contract drift risk:
  - if `ObservationV2Bundle` changes without matching persistence migration, rehydration will rot quickly

- Derived-output staleness risk:
  - stored scene-local derived structures may become inconsistent with future extraction logic unless versioned

- Read-selection risk:
  - callers may accidentally keep using V1 reads because they are easier, slowing actual cutover

- Historical backfill pressure:
  - downstream teams may ask Observation persistence to solve legacy consumer problems that belong to later cutover work

## Validation Strategy

Planning success criteria:

- the future BUILD stores enough information to rehydrate a canonical `ObservationV2Bundle`
- bundle write-read round-trip is proven in tests
- V1 compatibility is explicitly transitional, not implied to be equal

Future implementation validation should cover:

1. Domain contract tests
   - bundle metadata completeness
   - scene ordering preservation
   - observation ordering preservation

2. Repository tests
   - native V2 bundle write
   - native V2 bundle read
   - round-trip equality of bundle structure

3. Migration tests
   - schema constraints
   - row ownership / foreign key integrity
   - JSON field preservation

4. Compatibility tests
   - any remaining V1 projection has a named migration purpose
   - manual/API V1 ingress stays explicitly compatibility-only if retained

5. Required repo verification
   - `npm test`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build`

## Non-Goals

- redesign Glossary persistence
- redesign Latent persistence
- redesign Openings, Reflections, or Dream Map persistence
- build downstream V2 consumer cutovers
- create a broad multi-layer repository rewrite
- preserve V1 persistence solely to keep downstream V1 consumers functioning
- define Dream Map-ready query models
- design long-term dual V1/V2 coexistence

## Open Questions

1. Should scene-level evidence context be durably stored as its own field or reconstructed from observation evidence at read time?
   - recommendation: store it in the first build to keep rehydration lossless

2. Should bundle-level uncertainty notes exist explicitly in the runtime before persistence work starts?
   - recommendation: yes

3. Should native V2 persistence dual-write to legacy V1 rows during cutover or stop writing V1 durability immediately for the live generated path?
   - recommendation: only dual-write if there is a concrete live migration dependency identified at implementation time

4. How should historical V1-only observations be handled on V2-native reads?
   - recommendation: classify them as transitional historical records rather than pretending they are full native bundles

5. Should manual/API Observation creation gain a V2-native POST contract in the same build?
   - recommendation: no; keep that out of the smallest meaningful persistence build unless it blocks cutover

# Recommended First BUILD Ticket

Title:

`Observation V2 Native Persistence Phase 1: Add native bundle storage and rehydration for the live generated path`

Goal:

- add the first native durable Observation V2 persistence path
- make the live generated V2 write path persist without flattening into fragment-era storage
- make the same path rehydrate back into `ObservationV2Bundle`
- keep scope inside Observation only

Touched files:

- `src/domain/observation/v2-runtime.ts`
- `src/domain/observation/contracts.ts`
- `src/infrastructure/persistence/observation-v2-write-store.ts`
- `src/infrastructure/supabase/repositories/create-observation-v2-repository.ts`
- `src/infrastructure/supabase/repositories/observation-v2-supabase-repository.ts`
- `src/infrastructure/supabase/repositories/create-observation-repository.ts`
- `src/infrastructure/supabase/repositories/observation-supabase-repository.ts`
- `src/infrastructure/supabase/adapters/observation-v2-row.ts`
- `src/infrastructure/supabase/adapters/observation-row.ts`
- `src/infrastructure/persistence/__tests__/observation-v2-write-store.test.ts`
- `src/infrastructure/supabase/repositories/__tests__/observation-v2-supabase-repository.test.ts`
- `src/infrastructure/supabase/repositories/__tests__/observation-supabase-repository.test.ts`
- `src/infrastructure/supabase/adapters/__tests__/observation-v2-row.test.ts`
- `supabase/migrations/20260611_0019_observation_v2_native_persistence.sql`
- `docs/backend-v2-migration/Observation-V2-Fallout-Ledger.md`

Implementation steps:

1. Extend `ObservationV2Bundle` with the minimum bundle metadata needed for durable identity and provenance.
2. Add native V2 persistence tables for bundles, scenes, and scene observations using JSONB for secondary structures.
3. Add a V2-native repository/store seam that writes and reads `ObservationV2Bundle`.
4. Move `observation-v2-write-store` to use the native V2 repository instead of projecting to `CreateObservationInput`.
5. Add rehydration tests proving bundle write-read round-trip.
6. Update the Fallout Ledger with the new durability split and remaining V1 compatibility seams.

Acceptance criteria:

- live generated Observation writes persist natively as V2
- native durable reads can rehydrate a canonical `ObservationV2Bundle`
- scene order, scene summaries, boundary signals, observation evidence, uncertainty, and derived structures survive round-trip
- V1 row/fragment persistence is no longer required for the live generated path unless a concrete temporary migration reason is documented
- no downstream layer work is pulled into the ticket

Testing / validation plan:

- targeted repository and write-store tests for native V2 round-trip
- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Rollback plan:

- keep the old V1 repository path callable behind the existing compatibility seam until the V2 native path is verified
- do not treat rollback as a reason to restore V1 as the architectural owner
