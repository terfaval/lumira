# Observation V2 Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Make Observation V2 the operational owner of Observation so the live system writes toward the canonical Observation Bundle instead of treating V1 summary/fragment structures as the owning model.

**Architecture:** Treat `ObservationV2Bundle` as the primary Observation boundary for generation, write orchestration, and later read orchestration. Any V1 `CreateObservationInput`, `Observation`, `summary`, and `fragments[]` shapes may exist only as narrowly justified migration artifacts. They should not be preserved solely to keep downstream V1 consumers functioning.

**Tech Stack:** Next.js App Router, TypeScript, current Supabase repository layer, OpenAI Responses API extraction paths, existing Observation V1/V2 domain contracts.

---

## Planning Scope

- This document is planning only.
- It does not implement runtime changes.
- It does not create migrations.
- It does not define full native V2 persistence schema.

## Ticket Frame

### Goal

- identify the repo's current operational Observation owner
- define the target post-cutover Observation owner
- sequence the smallest meaningful cutover that moves the system toward Backend V2
- identify fallout, retirement candidates, and explicit non-goals

### Planned Boundaries

- `src/domain/observation/v2-runtime.ts`
- `src/cognition/observation/llm-scene-observation-extractor.ts`
- `src/cognition/observation/scene-discovery-projection.ts`
- `src/cognition/observation/llm-observation-extractor.ts`
- `src/domain/observation/contracts.ts`
- `src/domain/observation/types.ts`
- `src/domain/observation/http-contract.ts`
- `src/infrastructure/supabase/repositories/create-observation-repository.ts`
- `src/infrastructure/supabase/repositories/observation-supabase-repository.ts`
- `src/infrastructure/supabase/adapters/observation-row.ts`
- `app/capture/page.tsx`
- `app/api/reflective-objects/[id]/observations/route.ts`
- downstream consumers that currently read `Observation[]`, especially:
  - `src/reflective-space/composition/compose-reflective-space-viewport.ts`
  - `app/api/reflective-objects/[id]/glossary-candidates/route.ts`
  - `app/api/reflective-objects/[id]/latent-snapshots/route.ts`

### Definition Of Done For The Future Build

- live generated Observation writes are owned by a V2 bundle boundary
- V1 write shapes are no longer the primary internal contract for system-generated Observation
- the remaining V1 surfaces are explicitly marked compatibility-only
- the fallout ledger is updated to reflect new ownership reality and remaining blockers
- the next persistence-dependent cutover is unambiguous

### Validation Strategy For The Future Build

- unit tests for the new owning Observation boundary
- route or server-action tests proving capture writes through the V2 path
- repository adapter tests proving any remaining V1 projection exists only for a specific migration purpose
- fallout validation proving downstream losses or breakages caused by cutover are explicitly recorded rather than silently preserved through compatibility drift

### Rollback Shape

- keep the cutover behind a narrow internal ownership seam so the system can pause or narrow the cutover if a defect is discovered
- do not treat rollback as justification for restoring V1 ownership assumptions
- do not preserve compatibility projections unless they serve a concrete migration purpose

## Ownership Cutover Principle

Observation V2 ownership should not preserve V1 compatibility outputs solely for the benefit of downstream V1 consumers.

If downstream systems depend on V1 Observation structures and lose access after ownership cutover, that loss should be recorded in the Fallout Ledger and resolved through later V2 migration work.

Compatibility projections should exist only when they serve a clearly identified migration purpose.

Compatibility should not become its own development track.

## Current Ownership Map

## 1. Canonical authority vs operational ownership

Canonical authority is already V2:

- `docs/backend-v2-migration/Observation-Bundle-Contract-v1.md`
- `docs/backend-v2-migration/Observation-Authority-Cutover-Contract-v1.md`

Operational ownership is still V1-shaped:

- the live write contract is `CreateObservationInput`
- the live durable read contract is `Observation`
- persistence is `observations` plus `observation_fragments`
- downstream consumers mostly depend on `summary` plus `fragments[]`

In practice, the repo still treats the V1 contract as the system owner even though planning authority has moved to V2.

## 2. Current write owner

System-generated Observation writes are currently owned by the V1 projection path:

- `app/capture/page.tsx` calls `buildLlmObservationExtraction()`
- `src/cognition/observation/llm-observation-extractor.ts` returns `CreateObservationInput`
- `createObservationRepository().create()` persists that V1-shaped payload

The scene-first extractor exists, but it is not the live write owner:

- `src/cognition/observation/llm-scene-observation-extractor.ts`

## 3. Current manual/API owner

Manual/API ingress is also V1-owned:

- `app/api/reflective-objects/[id]/observations/route.ts`
- `src/domain/observation/http-contract.ts`

That route validates `summary` plus `fragments[]` and persists them directly through the V1 repository.

## 4. Current persistence owner

Persistence currently defines the durable operational Observation shape:

- `src/domain/observation/contracts.ts`
- `src/infrastructure/supabase/repositories/observation-supabase-repository.ts`
- `src/infrastructure/supabase/adapters/observation-row.ts`

This layer stores and reconstructs:

- one observation row
- many fragment rows
- no native scenes
- no native scene summaries
- no native boundary signals
- no native scene-local derived structures

## 5. Current read owner

Observation reads are still owned by the V1 repository contract:

- `ObservationRepository.listByReflectiveObject()`
- `ObservationRepository.getById()`

Read consumers include:

- reflective-space composition
- glossary candidate extraction inputs
- latent snapshot inputs
- homepage and object orientation payloads

These consumers read `Observation.summary` and `Observation.fragments`, not `ObservationV2Bundle`.

## 6. Current V2 runtime status

The V2 runtime exists, but mostly as additive internal structure:

- `src/domain/observation/v2-runtime.ts` defines the bundle
- `src/cognition/observation/scene-discovery.ts` constructs ordered V2 bundles
- `src/cognition/observation/scene-discovery-projection.ts` immediately compresses the bundle back into `CreateObservationInput`

Important consequence:

The current projection flattens scene semantics into fragment-era durability. That means the repo cannot later recover a true V2 bundle from current durable storage without adding new persistence support.

## Target Ownership Model

After cutover, Observation should be owned by a V2-native Observation boundary with this shape:

```text
capture / route / internal write caller
-> Observation V2 bundle ingress
-> Observation-owned write service or repository
-> persistence adapter
-> optional compatibility projections only where specifically justified
```

Target ownership rules:

- `ObservationV2Bundle` is the primary Observation write object
- Observation write orchestration accepts bundle semantics, not `summary + fragments[]`
- persistence serves the bundle boundary instead of defining it
- downstream consumer dependence on V1 shapes does not justify preserving V1 ownership
- if a compatibility projection remains, it must have a named migration purpose and a removal path
- any V1 shape must be named and treated as a compatibility artifact

In concrete repo terms, the future owning seam should sit above:

- extractor choice
- route parsing
- repository storage details

and below:

- capture flow
- manual Observation creation flow
- future downstream consumers

## Smallest Meaningful First Build

The smallest meaningful ownership cutover step is:

**Move the live generated Observation write path to a V2-owned boundary even if some downstream V1 consumers lose direct compatibility.**

That means:

1. Capture switches from the legacy extractor path to the scene-first extractor path.
2. The live generated write contract becomes `ObservationV2Bundle` or a V2-owned equivalent wrapper.
3. Any projection to `CreateObservationInput` happens only inside the persistence adapter layer.
4. The manual/API POST route remains compatibility-only for now.
5. Downstream consumers that lose access to V1-shaped Observation output are recorded in the Fallout Ledger and handled by later V2 migration work instead of controlling the ownership step.

Why this is the smallest meaningful cutover:

- it changes real live ownership, not just documentation
- it avoids pretending current V1 persistence is canonical
- it prevents downstream compatibility pressure from continuing to define Observation
- it creates a clean seam for later persistence and read-side cutovers

Why nothing smaller is enough:

- adding more V2 types without moving the live write owner leaves V1 in charge
- adding a new route without moving capture still leaves the main system path V1-owned
- changing only persistence names without changing the owning write object still leaves repo authority in V1 shapes

## Phased Implementation Sequence

### Phase 0: Pre-cutover audit hardening

Purpose:
- make the repo's owner split explicit before code changes

Actions:
- update the fallout ledger with the specific ownership chokepoints listed in this plan
- add the ownership-cutover principle that downstream V1 dependence does not control Observation cutover
- mark legacy write/read seams as compatibility-only only where they still serve a concrete migration purpose
- confirm which tests currently pin V1 behavior so implementation can distinguish real migration needs from compatibility preservation drift

V1 status after this phase:
- still operational
- explicitly non-authoritative in planning

### Phase 1: Live generated write ownership cutover

Purpose:
- make V2 the owner of the capture-generated Observation path

Actions:
- route capture through the scene-first extraction path
- introduce a V2-owned Observation write seam above persistence
- move `CreateObservationInput` projection behind that seam so callers no longer own it
- keep the existing repository and database tables only if they remain the narrowest available temporary storage adapter
- record any downstream consumer fallout created by this cutover instead of expanding V1 output preservation

Expected result:
- the running app's primary Observation creation path is V2-owned
- any remaining V1 shape survives only where it still serves an explicit migration purpose

V1 structures that become non-authoritative after this phase:
- `buildLlmObservationExtraction()` as the live generated owner
- direct caller ownership of `CreateObservationInput`
- `DescriptiveObservationEngine.describe(): Promise<CreateObservationInput>` as an owning pattern

Potential retirement candidates after this phase:
- legacy extractor entrypoints if no longer used outside explicit compatibility paths
- tests that assert system-generated writes originate from V1 extraction rather than V2 bundle generation
- V1-shaped downstream assumptions that were preserved only to avoid temporary fallout

### Phase 2: Compatibility ingress isolation

Purpose:
- stop treating the V1 HTTP contract as a general Observation definition

Actions:
- keep `app/api/reflective-objects/[id]/observations/route.ts` only as compatibility/manual ingress
- explicitly separate manual V1 ingress from V2-owned system generation
- define whether a V2-native route is needed next or whether the compatibility route should simply remain narrow until removable

Expected result:
- the repo no longer has one ambiguous mixed ingress pretending both shapes are equal owners
- V1 ingress stops exerting general architectural pressure on Observation ownership

V1 structures that become non-authoritative after this phase:
- `parseCreateObservationInput()` as a general Observation ingress definition
- POST route payload shape as the implied Observation contract

Potential retirement candidates after this phase:
- direct public/manual V1 POST creation if the product no longer needs it
- compatibility-only tests that no longer reflect supported product behavior

### Phase 3: Persistence decision gate for durable V2 ownership

Purpose:
- create the minimum durable storage direction required for true read-side V2 ownership

Why this phase is required:
- current V1 rows cannot faithfully rehydrate scenes, boundary signals, scene summaries, or scene-local derived structures
- without durable V2 semantics, V2 can own generation but not durable retrieval

Required outcome:
- choose and implement the minimum persistence support that preserves bundle semantics durably

This plan does not prescribe the full schema.
It does prescribe the sequencing rule:

- no claim of full Observation ownership cutover should be made before durable V2 rehydration is possible

V1 structures that become non-authoritative after this phase:
- `observations` plus `observation_fragments` as the defining Observation durability model
- row adapters as the place where Observation semantics originate

Potential retirement candidates after this phase:
- fragment-only durability assumptions
- summary-trace logic whose only purpose is to support flattened storage

### Phase 4: V2 read ownership cutover

Purpose:
- make durable reads return or assemble V2 bundles as the primary Observation read model

Actions:
- introduce a V2-owned read seam over the now-sufficient persistence layer
- make repository/service internals assemble bundle semantics first
- allow V1 `Observation` projection only where a specific migration need is still open and documented

Expected result:
- Observation reads are V2-native internally
- any remaining V1 `Observation` read shape is explicitly transitional and not preserved for its own sake

V1 structures that become non-authoritative after this phase:
- `ObservationRepository` returning `Observation` as the primary domain read contract
- `Observation.summary` plus `Observation.fragments` as the default internal read model

Potential retirement candidates after this phase:
- direct fragment-era read assembly in repositories
- helper logic that assumes flattening is the authoritative retrieval model

### Phase 5: Downstream consumer cutover

Purpose:
- remove V1 authority pressure from Observation consumers

Sequence:
1. Observation-focused internal read models
2. reflective-space Observation reads
3. glossary intake
4. latent intake
5. remaining orientation payloads and compatibility surfaces

Rules for this phase:

- consumers should migrate toward V2-aware intake boundaries rather than requiring Observation to remain V1-shaped
- temporary projections may be used only when a specific migration step requires them
- consumers may not redefine Observation around `summary` or `fragments[]`
- do not redesign Glossary, Latent, Openings, Reflections, or UI in this phase beyond the minimum intake adaptation needed

V1 structures that become non-authoritative after this phase:
- fragment-derived consumer logic as the default way to understand Observation
- any code that infers Observation truth from compatibility rows instead of bundle semantics

Potential retirement candidates after this phase:
- `projectObservationV2BundleToCreateObservationInput()` if no longer needed
- compatibility-only Observation view helpers
- fragment-first glossary cue derivation assumptions

### Phase 6: V1 Observation retirement cleanup

Purpose:
- remove transitional Observation V1 ownership artifacts once no meaningful migration purpose remains

Removal candidates:
- legacy V1 extractor path
- compatibility-only HTTP parser
- V1-first repository contracts
- fragment-first Observation domain types if fully replaced
- projection code whose only job was V2-to-V1 compatibility

Exit rule:
- remove V1 structures once they no longer serve a clear migration purpose, even if that requires downstream work to catch up separately

## V1 Retirement Candidates By Step

| Step | V1 structure | Status after step |
| --- | --- | --- |
| Phase 1 | `buildLlmObservationExtraction()` and direct `CreateObservationInput` ownership in live generation | non-authoritative |
| Phase 1 | `observation-engine.ts` returning V1 payloads as the owning pattern | non-authoritative |
| Phase 2 | `parseCreateObservationInput()` and POST route payload as general Observation contract | compatibility-only |
| Phase 3 | fragment-row durability as Observation truth | non-authoritative |
| Phase 4 | `Observation` / `ObservationFragment[]` as the primary internal read model | compatibility-only |
| Phase 5 | consumer logic built on fragment-first Observation truth | removable when each consumer finishes migration |
| Phase 6 | V2-to-V1 projection helpers and V1-first repository contracts | removable |

## Fallout Ledger Updates Needed

Add or refine the following fallout items before and during implementation:

1. **Live capture still uses the legacy extractor owner**
   - current repo fact: `app/capture/page.tsx` still calls `buildLlmObservationExtraction()`
   - implication: the main running write path is still V1-owned

2. **Repository contract is the actual V1 authority chokepoint**
   - current repo fact: `ObservationRepository` only accepts/returns V1 shapes
   - implication: V2 cannot own the system while this remains the only Observation seam

3. **Current persistence cannot durably rehydrate scene semantics**
   - current repo fact: `scene-discovery-projection.ts` flattens scenes before durability
   - implication: read-side V2 ownership requires a persistence change, not just a parser swap

4. **Manual/API ingress still defines Observation as `summary + fragments[]`**
   - current repo fact: POST route and HTTP contract validate V1 payloads directly
   - implication: this must be classified as compatibility-only, not neutral

5. **Downstream consumers still derive meaning from V1 read models**
   - current repo fact: reflective-space, glossary, and latent intake all consume `Observation[]`
   - implication: breakage or loss caused by ownership cutover should be recorded as fallout, not used to preserve V1 ownership

6. **Compatibility projection is currently doing semantic compression, not just transport adaptation**
   - implication: this is more than a harmless DTO bridge and should be treated as an architectural risk item

7. **Compatibility preservation drift is itself a migration risk**
   - current repo fact: multiple plan sections previously assumed downstream V1 consumers should continue receiving V1-shaped output after ownership cutover
   - implication: any new compatibility bridge must state its migration purpose explicitly or be challenged

## Validation Strategy

Implementation should be validated in layers:

### Ownership validation

- prove that the live capture path no longer builds or passes a V1 write payload before the Observation-owned seam
- prove that the owning seam accepts V2 bundle semantics

### Compatibility validation

- prove that any remaining compatibility output has a named migration purpose
- prove that manual/API compatibility ingress remains intentionally separate from the V2 path
- prove that downstream fallout created by cutover is documented instead of silently absorbed by new V1 preservation work

### Persistence validation

- when persistence work begins, prove durable rehydration of scene order, scene summaries, scene observations, boundary signals, and derived structures
- do not accept "V2 ownership complete" unless bundle semantics survive a write-read round trip

### Downstream regression validation

- identify which downstream consumers still function after each cutover step
- record any downstream breakage or loss of Observation access in the Fallout Ledger
- verify that any temporary downstream projection still has an explicit migration purpose

## Explicit Non-Goals

The ownership cutover plan should explicitly keep the following out of scope unless a later ticket proves they are required:

- full Glossary V2 redesign
- full Latent V2 redesign
- Openings redesign
- Reflections architecture work
- Dream Map work
- UI redesign or V2 visualization expansion
- long-term dual-track V1/V2 coexistence
- preserving V1 outputs solely to keep downstream V1 consumers functioning
- broad multi-layer persistence redesign done all at once
- turning compatibility projection into its own roadmap goal
- migrating historical observation data beyond what is necessary for the ownership cutover

## Final Sequencing Rule

The repo should treat Observation V2 ownership as complete only when all of the following are true:

- live generated writes are V2-owned
- V1 ingress is explicitly compatibility-only or removed
- durable storage preserves enough information to rehydrate bundle semantics
- primary internal reads are V2-owned
- remaining V1 shapes, if any, are projections with a documented migration purpose, not owners

Until then, Observation V2 is authoritative in doctrine, but only partially authoritative in operation.
