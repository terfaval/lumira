# Observation Bundle Contract v1

Date: 2026-06-09
Status: Active contract
Purpose: Define the canonical Observation Bundle for Backend V2 until superseded

## 1. Scope

This document defines what an Observation Bundle contains.

It is:

- a canonical bundle-content contract
- a boundary reference for future Observation ownership work
- a boundary reference for future Observation persistence work

It is not:

- an implementation ticket
- a scouting document
- a persistence schema design
- a migration execution plan

This contract is grounded in:

- `docs/canon/backend-v2/LUMIRA_BACKEND_V2_CANON.md`
- `docs/canon/backend-v2/by-layer/LUMIRA OBSERVATION DATA PHILOSOPHY v0.docx`
- `docs/backend-v2-migration/Backend-V2-Transformation-Map.md`
- existing Observation V2 design, review, and fallout documents
- existing owner decisions captured in this ticket

## 2. Core Contract

The canonical Observation Bundle is:

- one bundle per dream / reflective object
- scene-first
- observation-centered inside each scene
- descriptive rather than interpretive
- evidence-linked
- uncertainty-aware
- able to support downstream derived structures without making them primary memory

Canonical conceptual flow:

```text
Dream
-> Scenes
-> Observations
-> Derived Structures
```

The bundle is a container of scene-grounded descriptive memory.

It is not:

- a summary-first container
- a fragment-first container
- a latent container
- an interpretation container

## 3. Canonical Bundle Definition

```text
Observation Bundle
|- Bundle Metadata
`- Scenes[]
   |- Scene Identity + Order
   |- Scene Summary
   |- Boundary Signals[]
   |- Scene Uncertainty[]
   |- Observations[]
   |  |- Observation Identity + Order
   |  |- Observation Text
   |  |- Evidence[]
   |  `- Observation Uncertainty
   `- Derived Structures
```

### 3.1 Bundle Metadata

The bundle must carry the minimum metadata needed to identify and govern the bundle as one Observation unit for one dream or observation run.

Canonical metadata:

- bundle identity
- reflective object / dream identity
- user identity
- source / provenance origin

This metadata is part of the contract because future ownership and persistence work need a stable bundle boundary.

### 3.2 Scenes

Scenes are the primary organizational unit of the Observation Bundle.

Each Scene represents a coherent dream situation.

Each Scene must preserve:

- scene identity
- scene order / position
- short scene summary
- scene-contained observations

Each Scene may also preserve:

- boundary signals
- scene-level uncertainty notes
- optional scene-level grounding excerpt when useful for orientation

Scene boundaries remain situational rather than merely spatial.

### 3.3 Scene Summary

Each Scene includes a short summary.

This is required in v1.

Rationale:

- the owner explicitly wants a short scene summary included
- scene summaries improve future navigation
- scene summaries support future Dream Map orientation
- a short scene summary does not replace scene observations

The scene summary is orientation-only.
It must remain descriptive and non-interpretive.

### 3.4 Boundary Signals

Boundary signals preserve the type of transition into a new scene when that transition is available.

Canonical signal kinds:

- `actor_change`
- `goal_change`
- `world_rule_change`
- `temporal_change`
- `spatial_change`
- `narrative_change`
- `perspective_change`

Boundary signals are minimal.

They preserve transition type.
They do not require a complex reasoning model.

The first scene may have no incoming boundary signal.
Some later scenes may also have no explicit signal if the transition cannot be stated confidently.

### 3.5 Observations

Observations are the primary content of each Scene.

Each Observation must preserve:

- observation identity
- observation order / position within the scene
- descriptive observation text
- supporting evidence
- optional uncertainty note

Observations remain:

- descriptive
- evidence-linked
- close to dream material
- non-interpretive

Observations must not contain:

- symbolic meaning
- explanation
- diagnosis
- latent reasoning
- reflective conclusion

### 3.6 Evidence

Evidence is required.

Evidence remains a short supporting excerpt from the original dream material.

Evidence is not the Observation itself.

Canonical rule:

- each Observation must remain traceable to dream evidence

Evidence may be stored as one excerpt or a small set of supporting excerpts.

Scene-level evidence context is optional.
If present, it exists only to ground scene orientation or scene segmentation.
It does not replace observation-level evidence.

### 3.7 Uncertainty

Uncertainty is a canonical Observation concern, but it is not mandatory on every bundle element.

Uncertainty should be preserved when:

- evidence is weaker than usual
- scene boundaries are fuzzy
- wording must remain tentative to stay descriptive

Uncertainty may exist:

- at scene level
- at observation level
- at bundle level if extraction-wide uncertainty needs preserving

Uncertainty protects descriptive honesty.
It should preserve ambiguity rather than erase potentially useful observation material.

### 3.8 Derived Structures

Derived structures are secondary products of scene-contained observations.

They are not primary Observation memory.

The canonical minimum derived-structure set in v1 is:

- actors
- locations
- objects
- interactions
- affect
- agency
- phenomenology
- metacognition

These structures should remain scene-local in the bundle.

They may reference observation identities when useful.
They must remain downstream of observations, not the organizing basis of the bundle.

## 4. Classification

| Component | Classification | Explanation |
| --- | --- | --- |
| Bundle metadata | Required | The bundle needs stable identity and provenance boundaries so future ownership and persistence work know what one Observation Bundle is. |
| Scene | Required | The canon defines Scene as the primary organizational unit of Observation. No canonical Observation Bundle exists without scenes. |
| Scene summary | Required | The owner explicitly decided to include a short scene summary for navigation and Dream Map support. It is part of the scene contract in v1. |
| Boundary signals | Optional | They should be preserved when available, but not every scene transition yields a clear signal, and the first scene has none. |
| Observations | Required | Observations are the primary content inside scenes and the primary descriptive memory of the bundle. |
| Evidence | Required | Observation must remain traceable to dream evidence. Evidence is part of the core evidential hierarchy and cannot be dropped from the bundle contract. |
| Uncertainty | Optional | Observation must be uncertainty-aware, but uncertainty only needs to appear where confidence is limited or wording must stay tentative. |
| Derived structures | Derived | Structured extraction is explicitly secondary to observations in the canon. These structures may be regenerated from preserved observations. |
| Salience | Derived | Owner decision: salience is not primary Observation memory. It may be stored or cached, but it remains derived. |
| V1 compatibility projection fields | Transitional | Summary-first or fragment-first compatibility fields may still exist during migration, but they are bridge artifacts, not part of the canonical Observation Bundle. |

## 5. Explicit Decisions Incorporated

### 5.1 Scene Summary

Decision:

- include a short scene summary

Contract effect:

- every canonical Scene in the Observation Bundle includes a short descriptive scene summary

### 5.2 Boundary Signals

Decision:

- preserve scene transition type when available

Contract effect:

- boundary signals are part of the canonical Scene contract
- they remain lightweight signal types rather than a heavy reasoning layer

### 5.3 Evidence

Decision:

- evidence remains a short supporting excerpt from original dream material
- evidence is not the Observation

Contract effect:

- evidence is required and remains separate from observation text
- the bundle contract stays evidence-linked rather than summary-first

### 5.4 Salience

Decision:

- salience is derived

Contract effect:

- salience is not part of primary Observation memory
- salience may be attached, cached, or stored if useful
- future persistence work must not treat salience as the defining Observation substrate

## 6. Transitional And Non-Canonical Items

The following are not part of the canonical Observation Bundle definition, even if they remain useful during migration:

- V1 flat fragment arrays
- top-level `summary + fragments` ownership assumptions
- compatibility projections into `CreateObservationInput`
- bundle shapes whose primary center of gravity is the summary rather than scenes and observations

These may continue to exist as migration tools.
They should not be mistaken for the Backend V2 Observation contract.

## 7. Practical Canonical Shape

The practical v1 bundle should be read as:

```text
one dream
-> one Observation Bundle
-> ordered Scenes
-> per-scene summary + optional boundary signals + scene-contained Observations
-> required observation evidence
-> optional uncertainty where needed
-> scene-local derived structures as secondary products
```

The memory center of gravity is:

- Scene
- Observation
- Evidence

Not:

- summary-first projection
- fragment flattening
- salience
- downstream interpretation

## 8. Remaining Open Questions

Only the following questions remain genuinely unresolved by current canon, owner decisions, and completed Observation V2 work:

### 8.1 Scene-Level Evidence Context

Should native V2 persistence store a distinct scene-level grounding excerpt, or should scene grounding be reconstructed from observation-level evidence at read time?

Why this remains open:

- current Phase 1 design and code preserve the idea of scene-level grounding
- canon requires evidence-linked Observation, but does not require a separate durable scene-evidence field
- this affects persistence design, not the core scene-first contract

### 8.2 Bundle-Level Orientation Summary

Should a future bundle-level orientation summary exist as a derived read-model field in addition to per-scene summaries, or should bundle orientation remain assembled from the ordered scene summaries only?

Why this remains open:

- earlier Observation runtime documents preserved a bundle-level derived summary
- the current scene-first runtime centers scene summaries instead
- the canon resolves that summary is secondary, but not whether a separate bundle-level orientation summary should remain in the long-term read contract

## 9. Final Rule

Until superseded, the canonical Observation Bundle for Backend V2 is:

- scene-first
- observation-centered inside scenes
- evidence-linked
- uncertainty-aware
- non-interpretive
- able to carry derived structures without making them primary memory

Future Observation ownership and persistence work should treat this contract as the reference definition of what the bundle contains.
