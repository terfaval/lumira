````md id="lumira-clean-room-repo-blueprint-v1"
# Clean-room Repo Blueprint v1 (Draft)

## Status

Draft — Repository Architecture Blueprint  
Clean-room rebuild foundation document.

This document defines:

- the proposed clean-room repository structure,
- domain ownership boundaries,
- runtime layering,
- cognition separation,
- UI responsibilities,
- and architectural gravity rules.

This is not:
- a final implementation plan,
- a database schema,
- or a deployment topology.

The purpose is:
# preventing architectural drift during rebuild.

---

# 1. Core Architectural Philosophy

The clean-room rebuild must be:

# domain-first

not:
- route-first,
- component-first,
- API-first,
- or framework-first.

The repository should reflect Lumira’s reflective ontology.

Not legacy webapp ergonomics.

---

# 2. Primary Runtime Gravity

The rebuild’s central runtime gravity should be:

# Reflective Space Runtime

Not:
- sessions,
- routes,
- pages,
- threads,
- or UI flows.

Everything should organize around:
- reflective continuity,
- reflective movement,
- cognition boundaries,
- and orientational assembly.

---

# 3. Top-Level Repository Philosophy

Recommended high-level structure:

```txt
app/
src/
docs/
````

---

# 4. app/ Philosophy

```txt
app/
```

Purpose:

# route delivery only

Responsibilities:

* route entrypoints
* navigation
* page composition
* loading boundaries
* server/client bridging

Routes must remain:

* thin,
* orchestration-light,
* and non-authoritative.

Routes must not own:

* cognition,
* continuity truth,
* latent reasoning,
* glossary interpretation,
* or reflective state logic.

The app layer should behave like:

# a viewport into Reflective Space.

Not:

# the runtime itself.

---

# 5. src/ Philosophy

```txt
src/
```

Purpose:

# canonical runtime implementation

All reflective logic should live here.

Not inside:

* routes,
* UI components,
* or API handlers.

---

# 6. Recommended src/ Structure

```txt
src/
    domain/
    runtime/
    cognition/
    reflective-space/
    infrastructure/
    ui/
    shared/
```

Exact naming may evolve.

Separation principles should remain stable.

---

# 7. src/domain/

Purpose:

# canonical reflective entities and rules

Contains:

* domain models
* invariants
* entity definitions
* reflective contracts
* state vocabulary
* ownership rules

Potential domains:

```txt
src/domain/
    dreams/
    observation/
    latent/
    threads/
    glossary/
    openings/
    continuity/
    highlights/
```

Rules:

* domains should remain conceptually clean
* no UI ownership
* no route coupling
* no framework dependency leakage

---

# 8. src/runtime/

Purpose:

# reflective runtime orchestration

This layer manages:

* reflective movement
* continuity assembly
* opening generation coordination
* resurfacing logic
* reflective pacing
* runtime state transitions

The runtime layer is:

# orchestration infrastructure

Not:

# business meaning authority.

The runtime should remain:

* inspectable,
* explicit,
* and bounded.

Avoid:

* hidden orchestration,
* emergent coupling,
* and implicit cognition mutation.

---

# 9. src/cognition/

Purpose:

# internal reflective cognition systems

Contains:

* observation generation
* latent modeling
* recurrence analysis
* salience estimation
* continuity inference
* symbolic association systems

Important:

* cognition is internal infrastructure
* not direct user-facing truth

The cognition layer may:

* infer
* estimate
* model
* connect

But may not:

* claim certainty
* own meaning
* bypass reflective safeguards

Suggested structure:

```txt
src/cognition/
    observation/
    latent/
    continuity/
    salience/
    recurrence/
```

---

# 10. src/reflective-space/

Purpose:

# Reflective Space assembly

This layer assembles:

* reflective centers
* ambient context
* openings
* thread visibility
* glossary contextualization
* continuity orientation

This is:

# the user-facing reflective composition layer.

It translates:

* internal cognition
  into:
* bounded reflective orientation.

This layer is critical because:

* it prevents latent cognition from surfacing directly,
* and preserves emotional pacing.

---

# 11. src/infrastructure/

Purpose:

# external systems and persistence boundaries

Contains:

* Supabase integration
* storage adapters
* auth
* file persistence
* caching
* background jobs
* API integrations

Infrastructure must not own:

* reflective meaning,
* cognition logic,
* or continuity truth.

Infrastructure should remain:

# replaceable plumbing.

---

# 12. src/ui/

Purpose:

# presentation only

Contains:

* components
* typography
* layout systems
* visual primitives
* animations
* interaction affordances

UI must not:

* infer meaning
* own continuity
* generate cognition
* or perform reflective orchestration

UI should display:

# already bounded reflective structures.

Not create them.

---

# 13. src/shared/

Purpose:

# low-level shared utilities

Contains:

* shared types
* safe helpers
* generic utilities
* formatting helpers
* validation primitives

This folder should remain:

* lightweight,
* stable,
* and domain-neutral.

Avoid:

* dumping reflective logic into shared.

---

# 14. Canonical Domain Ownership

Recommended ownership model:

| Domain           | Owns                            |
| ---------------- | ------------------------------- |
| dreams           | experiential records            |
| observation      | descriptive orientation         |
| latent           | internal reflective cognition   |
| glossary         | symbolic continuity memory      |
| threads          | continuity trajectories         |
| openings         | reflective invitations          |
| runtime          | orchestration and pacing        |
| reflective-space | user-facing reflective assembly |

No single domain should own:

# all reflective truth.

---

# 15. Important Architectural Separations

The rebuild must preserve:

## Internal cognition

vs

## surfaced reflective orientation

## descriptive observation

vs

## interpretive inference

## continuity memory

vs

## current reflective focus

## reflective invitation

vs

## task obligation

## runtime orchestration

vs

## UI rendering

---

# 16. Forbidden Couplings

The rebuild should explicitly avoid:

* route-owned cognition
* UI-owned meaning
* glossary-owned interpretation
* latent-to-UI direct surfacing
* session-locked continuity
* page-level reflective truth
* component-level orchestration
* hidden progression engines
* workflow resurrection
* global “AI insight” stores
* giant reflective god-services
* monolithic continuity managers

---

# 17. API Philosophy

APIs should remain:

# transport layers.

APIs must not:

* invent meaning,
* mutate reflective truth silently,
* or contain hidden cognition orchestration.

Reflective assembly should happen in:

* runtime,
* cognition,
* and reflective-space layers.

Not inside random API handlers.

---

# 18. Session Philosophy

Sessions are:

# temporary reflective containers.

Not:

# primary ontology.

The repo must avoid:

* session-centric domain architecture,
* session-owned continuity,
* and dream-isolated cognition.

Continuity should remain:

# space-level.

---

# 19. Build Strategy Philosophy

The rebuild should proceed:

## from ontology outward

Meaning:

1. canonical domain definitions
2. runtime boundaries
3. cognition separation
4. persistence contracts
5. reflective assembly
6. UI rendering
7. route delivery

Not:

# UI-first prototyping.

---

# 20. Suggested Initial Build Order

Recommended first implementation sequence:

1. domain primitives
2. reflective runtime skeleton
3. dream persistence
4. observation layer
5. glossary memory
6. latent cognition scaffolding
7. reflective thread runtime
8. reflective-space assembly
9. openings
10. UI surfaces

This sequence prioritizes:

* reflective integrity,
* ontology stability,
* and continuity correctness.

---

# 21. Final Architectural Principle

The repository should feel like:

# a reflective continuity organism

not:

* a collection of pages,
* a workflow engine,
* or a chatbot app.

The architecture must preserve:

* reflective spaciousness,
* continuity sensitivity,
* and restraint

at every layer of implementation.

```
