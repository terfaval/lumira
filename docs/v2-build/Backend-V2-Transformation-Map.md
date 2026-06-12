# Backend V2 Transformation Map

Date: 2026-06-09
Status: Active coordination document
Purpose: Primary roadmap for Lumira Backend V2 migration until replaced

## Executive Summary

Lumira now has a real Backend V2 foothold only in Observation.

The repository is no longer at pure theory stage:

- Backend V2 canon exists.
- Layer philosophy documents exist.
- Observation V2 scouting, gap analysis, reviews, design, plan, and fallout tracking all exist.
- Observation V2 Phase 1 foundation work exists in the current repo/worktree.

But the overall backend is still mixed:

- Observation has a real V2 internal runtime but still bridges back into V1-shaped route and persistence boundaries.
- Glossary, Latent, Openings, and the thread/response path are usable alpha-era systems, but they are not yet rebuilt around Backend V2 layer contracts.
- Reflections as a true backend memory layer do not yet materially exist.
- Dream Map does not yet exist as an active backend/runtime system.

The main coordination conclusion is:

1. Finish Observation as a real source layer.
2. Move next into Glossary.
3. Redesign Latent on top of stable Observation and Glossary inputs.
4. Recalibrate Openings and the thread path around V2 Latent.
5. Build Reflections as a distinct memory layer, not as a synonym for responses.
6. Do not start Dream Map build work until the upstream layers are stable enough to feed it honestly.

## Current State

### Observation

- Current repository reality:
  - Observation has the only real Backend V2 migration already underway.
  - The repo now contains an additive scene-first V2 runtime, scene-first extraction entrypoints, V2-to-V1 projection, and an active fallout ledger.
  - Live route and persistence contracts still remain V1-shaped for compatibility.
- Level of V2 alignment:
  - Medium to high internally.
  - Medium at the system boundary.
- Major architectural gaps:
  - Native V2 persistence does not exist yet.
  - Public/manual write ingress is still V1-shaped.
  - Downstream consumers still mostly consume fragment-era outputs.
  - V1 compatibility still exerts architectural pressure.

### Glossary

- Current repository reality:
  - Glossary terms, candidates, lifecycle states, repositories, and routes exist.
  - Candidate extraction currently depends on existing observation outputs and still reads fragment/category-era material.
  - The user-selection boundary exists in basic form through candidate and term separation.
- Level of V2 alignment:
  - Partial.
- Major architectural gaps:
  - Glossary is not yet rebuilt around scene-first Observation outputs.
  - Motif vs concept philosophy is not yet realized as a clear V2 contract.
  - Personal relationship and personal meaning are only lightly represented.
  - Recognition/normalization exists only as a practical scaffold, not as a canon-shaped layer design.

### Latent

- Current repository reality:
  - Latent snapshots, signals, suggestions, lifecycle state, and opening handoff logic all exist.
  - The repo has a real latent engine, but it is still a scaffold-era heuristic system.
  - Current latent reasoning is strongly tied to observation categories, weights, and transitional alpha behavior.
- Level of V2 alignment:
  - Low to partial.
- Major architectural gaps:
  - Latent is not yet organized around reflective possibilities as the primary unit.
  - Questions, gaps, tensions, curiosities, and opportunities are not yet first-class V2 outputs.
  - Reflections are not yet a real upstream evidence source, so latent cannot yet treat user understanding as higher-order grounding.
  - Current latent behavior is closer to scoring and suggestion scaffolding than to the V2 possibility model.

### Openings

- Current repository reality:
  - Openings are real: cadence, suppression, activation, dormant revisit, and response linking all exist.
  - Openings are already optional and non-authoritative in tone.
  - Openings are generated from current latent suggestions and surfaced in orientation/reflective-space flows.
- Level of V2 alignment:
  - Medium at the boundary.
  - Low to medium in upstream dependence.
- Major architectural gaps:
  - Openings still depend on the current latent scaffold rather than a V2 opportunity model.
  - The opening layer is ahead of the layers beneath it.
  - Current opening types are workable, but not yet clearly derived from a stabilized V2 latent contract.

### Reflections

- Current repository reality:
  - The repo has threads, reflective responses, opening-response associations, and revisitable dialogue traces.
  - This gives Lumira a real reflection path in product terms.
  - But there is no true Reflections backend layer that extracts, stabilizes, and preserves user-derived understanding as its own long-term memory structure.
- Level of V2 alignment:
  - Low.
- Major architectural gaps:
  - Responses are not Reflections.
  - Threads are not Reflections.
  - No Reflection candidate model exists.
  - No persistence-strength or integration-strength model exists.
  - No background reflection memory layer yet feeds back into Glossary, Latent, or Dream Map as canon expects.

### Dream Map

- Current repository reality:
  - Dream Map canon exists, but there is no active Dream Map backend/runtime implementation in the current repo.
  - Current codebase has no real Dream Map primitives, no projection layer, and no stable Dream Map build path.
  - Existing references are documentary or historical, not live system boundaries.
- Level of V2 alignment:
  - Very low.
- Major architectural gaps:
  - No backend primitive model.
  - No projection contract.
  - No scene-grounded spatial foundation.
  - No stable upstream data stack yet exists to feed it safely.

## Dependency Graph

### Intended foundational flow

```text
Dream
↓
Observation
↓
Glossary
↓
Latent
↓
Openings
↓
Threads / Reflective Work
↓
Reflections
↓
Dream Map
↓
Future Dreams
```

### Actual dependency structure with feedback loops

```text
Dream
↓
Observation
├─→ Glossary
├─→ Latent
└─→ Dream Map foundation later

Glossary
└─→ Latent

Latent
└─→ Openings

Openings
└─→ Threads / reflective work

Threads / reflective work
└─→ Reflections

Reflections
├─→ Glossary enrichment
├─→ Latent grounding
└─→ Dream Map grounding

Observation + Glossary + Reflections
└─→ Dream Map

Dream Map
└─→ future Threads / Openings later
```

### Foundational vs dependent layers

- Most foundational:
  - Observation
- Next foundation layer:
  - Glossary
- Dependent on both of the above:
  - Latent
- Dependent on Latent:
  - Openings
- Dependent on reflective work begun through Openings or direct user curiosity:
  - Reflections
- Most downstream and most synthesis-heavy:
  - Dream Map

## Transformation Phases

### Phase 1 - Observation Foundation

- Goal:
  - establish a real scene-first Observation V2 runtime without breaking the running app
- Why it matters:
  - every other V2 layer depends on Observation being the trustworthy source layer
- Dependencies:
  - canon, observation philosophy, repo scouting
- Estimated scope:
  - Large
- Status:
  - Mostly completed in additive form

### Phase 2 - Observation Cutover And Boundary Cleanup

- Goal:
  - make Observation V2 the real owning runtime across extraction, route ownership, persistence direction, and downstream handoff
- Why it matters:
  - until this is done, downstream work keeps inheriting V1 compatibility pressure
- Dependencies:
  - Phase 1
- Estimated scope:
  - Large

### Phase 3 - Glossary V2 Contract

- Goal:
  - rebuild Glossary as the continuity layer on top of V2 Observation, with clear candidate, selection, motif/concept, and personal-relationship boundaries
- Why it matters:
  - Glossary is the first long-term memory layer after Observation and the main continuity input to Latent
- Dependencies:
  - Observation cutover sufficiently stable
- Estimated scope:
  - Large

### Phase 4 - Latent V2 Possibility Model

- Goal:
  - replace scaffold-style latent scoring with a true reflective-possibility layer
- Why it matters:
  - Openings, future thread direction, and eventual Dream Map perspective all depend on Latent being possibility-oriented rather than pseudo-interpretive scoring
- Dependencies:
  - Observation stable enough for real reuse
  - Glossary contract clear enough to provide continuity input
- Estimated scope:
  - Very Large

### Phase 5 - Opening Recalibration

- Goal:
  - retune Openings so they derive from V2 Latent opportunities instead of the current scaffold suggestion model
- Why it matters:
  - the user-facing invitation layer should reflect V2 latent architecture, not freeze today’s transitional heuristics in place
- Dependencies:
  - Latent V2 first pass
- Estimated scope:
  - Medium

### Phase 6 - Reflection Layer Foundation

- Goal:
  - build a true Reflections backend layer that preserves user-derived understanding separately from threads and responses
- Why it matters:
  - Reflections are the canon memory of understanding, and they must eventually ground Latent, Glossary enrichment, and Dream Map
- Dependencies:
  - a usable thread/opening path
  - enough stable upstream structure from Observation, Glossary, and Latent
- Estimated scope:
  - Very Large

### Phase 7 - Dream Map Foundation

- Goal:
  - create the first real Dream Map primitive/projection foundation from scenes, continuity, and reflections
- Why it matters:
  - Dream Map is the long-term spatial synthesis layer and should only be built once upstream grounding is honest
- Dependencies:
  - Observation
  - Glossary
  - Reflections
  - enough settled Dream Map primitive assumptions
- Estimated scope:
  - Very Large

### Phase 8 - Cross-Layer Cutover And Legacy Removal

- Goal:
  - remove transitional V1 bridges, duplicated assumptions, and compatibility-only shaping once V2 ownership is real
- Why it matters:
  - until this happens, the repo remains mixed-architecture and easy to drift
- Dependencies:
  - earlier phases materially complete
- Estimated scope:
  - Large

## Observation Status

Observation is the only layer already inside active transformation.

### Completed

- Runtime:
  - additive scene-first Observation V2 runtime exists
- Extraction:
  - scene-first extraction entrypoints exist
- Projection:
  - V2-to-V1 compatibility projection exists
- Documentation:
  - design, implementation plan, reviews, and fallout ledger all exist
- Boundary direction:
  - Observation is now clearly treated as the source layer for Backend V2 work

### In Progress

- Runtime ownership:
  - V2 exists internally, but V1-shaped boundaries still remain active
- Extraction ownership:
  - scene-first extraction exists, but legacy-shaped paths still coexist
- Capture ownership:
  - capture now depends on validated Observation generation, but the end-to-end system still lands in compatibility-era shapes
- Persistence:
  - current persistence is still transitional and V1-shaped
- Downstream handoff:
  - Glossary, Latent, Openings, UI, and future layers still mostly consume compatibility output

### Remaining

- Route cutover:
  - V2-native route ownership is still missing
- Persistence redesign:
  - V2-native storage is still missing
- Downstream migration:
  - Glossary, Latent, Openings, Reflections, and Dream Map still need V2-aware intake boundaries
- Cleanup:
  - V1 compatibility surfaces remain and should not become permanent architecture
- Legacy pressure removal:
  - fragment-first and summary-first assumptions still need final removal where they distort the model

### Current placement in the overall transformation

Observation is past concept stage and past scout stage.

It is now in the middle of real migration:

- foundation established
- ownership not yet complete
- downstream consequences documented but not yet resolved

Observation is therefore the current anchor of Backend V2, not the completed layer.

## Layer Readiness

### Observation

- Classification:
  - Build Ready
- Why:
  - canon is clear
  - repo work is already active
  - current gaps are now concrete build gaps, not conceptual uncertainty

### Glossary

- Classification:
  - Planning Ready
- Why:
  - canon is clear enough to plan
  - repo has a real glossary scaffold to work from
  - the next need is not random building, but a V2 contract that fits post-Observation reality

### Latent

- Classification:
  - Planning Ready
- Why:
  - the philosophy is strong and the repo has substantial latent infrastructure
  - but the current implementation is too scaffold-shaped to build forward safely without a deliberate V2 redesign plan

### Reflections

- Classification:
  - Exploration Ready
- Why:
  - the canon is clear about the role of Reflections
  - but the repo does not yet contain the actual backend layer, only thread/response-adjacent material
  - the first task is boundary clarification, not build execution

### Dream Map

- Classification:
  - Not Ready
- Why:
  - upstream dependencies are not stable enough
  - there is no active backend primitive model in the repo
  - Dream Map work now would be architecture invention on unstable foundations

## Recommended Sequence

This should not be treated as perfectly linear. Some planning can overlap. Build ownership should not.

### Recommended order

1. Observation cutover and cleanup
2. Glossary V2 planning
3. Glossary V2 build
4. Latent V2 planning
5. Latent V2 build
6. Opening recalibration on V2 Latent
7. Reflections exploration and boundary definition
8. Reflections foundation build
9. Dream Map foundation planning
10. Dream Map foundation build
11. Cross-layer cutover and removal of transitional V1 structures

### Reasoning

- Observation must stay first because everything else trusts it.
- Glossary should come before Latent because Latent needs a real continuity layer, not just raw observation material.
- Latent should come before further Opening work because Openings are derived invitations, not a design-first surface.
- Reflections should not be skipped, but they also should not be faked early by renaming responses into reflections.
- Dream Map should be last among major layers because it is the most synthesis-heavy and the easiest place to accidentally visualize unstable assumptions as if they were truth.

## Scope Boundaries

### What should explicitly NOT be worked on yet

- Dream Map rendering, layout, projections, or visual experiments
- Dream Map primitive design as if upstream contracts were settled
- broad persistence rewrites across multiple layers at once
- reflection summarizers that pretend responses already equal reflections
- large UI redesigns to express Backend V2 concepts that the backend does not own yet
- new symbolic systems, archetype systems, or interpretation frameworks

### What is tempting but premature

- making Latent smarter before Glossary is rebuilt
- refining Openings while Latent still uses transitional scaffolding
- adding Dream Map-like surfaces to the UI
- expanding observation vocabulary instead of finishing observation ownership
- automatic glossary enrichment beyond user-owned continuity rules
- treating thread activity as proof that the Reflections layer exists

### What risks pulling the project off the V2 path

- allowing the V1 compatibility bridge to become the permanent architecture
- treating fragment-era observation shapes as the long-term source contract
- letting Latent act like truth instead of possibility
- letting Openings define backend semantics instead of derive from them
- conflating user-authored responses with stabilized Reflections
- using Dream Map as a latent or hypothesis visualization tool
- solving local convenience problems in one layer by hard-coding assumptions that should belong to another layer

## Backend V2 Transformation Map

### Strategic reading of repo reality

The repo is in a split state:

- canon is ahead of implementation in most layers
- Observation is the only layer with a real V2 migration path in motion
- the rest of the backend still reflects alpha scaffolding, even where the product surface already feels real

This is not a failure.

It means the transformation now needs coordination more than invention.

### Main architectural truth

Backend V2 is not one migration.

It is a dependency-ordered re-grounding of Lumira’s backend around six distinct layer responsibilities:

- Observation preserves what appeared
- Glossary preserves what returns
- Latent preserves what remains open
- Openings invite exploration
- Reflections preserve what becomes meaningful
- Dream Map makes grounded structure explorable

The current repository only truly satisfies the first of those in active V2 form, and even that is still transitional at the system boundary.

### What is already decided

- Observation is the foundation.
- Scenes are the primary organizational unit for Observation.
- Glossary is user-owned continuity, not automatic interpretation.
- Latent is possibility, not truth.
- Openings are invitations, not directives.
- Reflections are backend memory of user understanding, not UI copy.
- Dream Map is grounded structure, not latent visualization.

These decisions should now be treated as fixed unless canon itself changes.

### What future tickets should assume

- Observation remains the active migration front.
- Glossary is the next major layer to stabilize.
- Latent should not be redesigned in isolation from Glossary.
- Opening work should be considered downstream of Latent, not a substitute for it.
- Reflection work must distinguish:
  - thread
  - response
  - reflection
- Dream Map work is deferred until the upstream memory stack is real enough to feed it.

### Operational guidance for future Backend V2 tickets

- Tickets should state which layer they serve.
- Tickets should state whether they are:
  - foundation
  - cutover
  - compatibility bridge
  - cleanup
- Tickets should name upstream dependencies explicitly.
- Tickets should not claim V2 completion for a layer just because an additive internal model exists.
- Tickets should treat V1 compatibility structures as temporary unless this document is updated to say otherwise.

### Migration Philosophy

Backend V2 development is not primarily optimizing for long-term coexistence between V1 and V2 systems.

The primary objective is reaching a complete Backend V2 architecture.

Compatibility bridges, projections, cutovers, and transitional structures should be treated as temporary tools, not as roadmap goals.

When choosing between:

* preserving V1 compatibility,
* and accelerating convergence toward Backend V2,

prefer Backend V2 convergence unless the compatibility layer materially reduces implementation risk or preserves important development velocity.

The project currently has no requirement for prolonged V1/V2 coexistence.

Therefore:

* transitional layers should remain minimal,
* compatibility work should not become its own development track,
* and V1 structures should be removed once they no longer serve a clear migration purpose.

The roadmap should be interpreted as a V2 destination roadmap, not as a compatibility-preservation roadmap.

### Current priority statement

The next major Backend V2 priority is not Dream Map and not generalized cleanup.

It is:

1. finish Observation ownership
2. define Glossary in V2 terms
3. rebuild Latent on top of those stable layers

Everything else should be sequenced around that.

### Replacement rule

This document remains the primary Backend V2 coordination map until a newer document replaces it explicitly.
