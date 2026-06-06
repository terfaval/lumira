# Observation Category Role Map v1

## 1. Executive Summary

Observation is best understood as Lumira's descriptive phenomenological substrate.

It exists to preserve what appears in the dream, how it is organized, how it changes, how it is experienced, and which parts may later matter for continuity work.

The current Observation category vocabulary therefore spans four role types:

- structural primitives
- relations / events
- phenomenological annotations
- continuity cues

This mixed vocabulary is acceptable because Observation is not a single-layer object taxonomy. It is a descriptive representation designed to support downstream systems without performing their work.

Observation may contain multiple representational layers.

Observation may not contain:

- latent interpretation
- thread prioritization
- DreamMap graph construction
- symbolic claims
- psychological explanation

The purpose of this document is classification and interpretation only. It does not change the ontology, runtime behavior, schema, or extraction contract.

## 2. Category Classification Table

| Category | Role Classification | Short Definition | Why It Belongs In That Role |
| --- | --- | --- | --- |
| `scene` | Structural Primitive | A distinct dream scene or situational frame. | It identifies a basic structural unit of dream composition. |
| `actor` | Structural Primitive | A person, being, group, or participating entity in the dream. | It denotes an entity that exists within dream structure. |
| `object` | Structural Primitive | A notable thing or item present in the dream. | It names a structural element rather than an action or experiential mode. |
| `location` | Structural Primitive | A place, setting, or spatial setting within the dream. | It represents where dream structure is situated. |
| `interaction` | Relation / Event | A behavioral exchange, action, or encounter between entities. | It describes what happens between structural elements. |
| `transition` | Relation / Event | A movement or shift from one scene, state, or location to another. | It captures change or passage rather than a standalone entity. |
| `affect_transition` | Relation / Event | A change from one affective condition to another. | It is defined by transformation over time, not by a stable object or trait. |
| `emotion` | Phenomenological Annotation | A directly supported emotional state present in the dream. | It annotates how experience feels rather than what structurally exists. |
| `body_state` | Phenomenological Annotation | A bodily condition, sensation, or embodied state within the dream. | It describes lived embodiment attached to dream structure. |
| `dream_quality` | Phenomenological Annotation | A broad unusual or dreamlike quality affecting experience. | It marks experiential texture rather than an entity or event. |
| `agency_state` | Phenomenological Annotation | A condition of being able, unable, compelled, resisting, or choosing. | It describes the experienced mode of action and constraint. |
| `metacognitive_moment` | Phenomenological Annotation | A moment of noticing, realizing, remembering, or dream awareness. | It annotates awareness-state within experience. |
| `emotional_contradiction` | Phenomenological Annotation | A directly described coexistence or clash of emotional states. | It marks a qualitative structure of feeling rather than an external event. |
| `affective_atmosphere` | Phenomenological Annotation | A mood field or emotional tone suffusing a scene or sequence. | It captures ambient felt quality attached to experience. |
| `spatial_instability` | Phenomenological Annotation | A distortion, instability, or impossible behavior in dream space. | It describes how space is experienced rather than merely where something is. |
| `dream_state_quality` | Phenomenological Annotation | An explicit dream-state anomaly or altered behavior of reality. | It annotates mode-of-reality as experienced inside the dream. |
| `altered_realism` | Phenomenological Annotation | A local breakdown or alteration in how reality appears to behave. | It marks phenomenological unreality, not a downstream interpretive claim. |
| `recurrence_candidate` | Continuity Cue | A possibly recurring element, motif, situation, or pattern. | It exists to preserve candidate continuity material for later evaluation. |
| `continuity_fragment` | Continuity Cue | A fragment that may connect across entries, sequences, or continuity systems later. | It is intentionally continuity-oriented raw material rather than a structural or experiential primitive. |

## 3. Category Definitions

### Structural Primitives

`scene`

A scene is a basic unit of dream structure: a setting, segment, or bounded situational frame in which other material appears.

It belongs to the structural layer because it helps describe the architecture of the dream rather than the quality of experience.

`actor`

An actor is a participant: the dreamer, another person, an animal, a group, or another entity that takes part in dream events.

It belongs to the structural layer because it identifies who or what is present inside dream structure.

`object`

An object is a notable thing that appears within the dream world, such as a mirror, key, phone, vehicle, or book.

It belongs to the structural layer because it is part of scene composition rather than a relation or phenomenological mode.

`location`

A location is a place or setting within the dream, such as a school, hallway, station, forest, or unknown building.

It belongs to the structural layer because it situates dream content spatially.

### Relations / Events

`interaction`

An interaction records what happens between actors or between an actor and another part of the dream world.

It belongs to the relation/event layer because it is defined by connection, behavior, or action.

`transition`

A transition records movement, passage, or shift between scenes, places, or states.

It belongs to the relation/event layer because it describes change across structure rather than a stable component within structure.

`affect_transition`

An affect transition captures movement from one emotional condition to another.

It belongs to the relation/event layer because its core meaning is temporal change.

### Phenomenological Annotations

`emotion`

An emotion marks a directly evidenced feeling state such as fear, curiosity, confusion, or relief.

It belongs to the phenomenological layer because it describes how the dream is experienced.

`body_state`

A body state marks embodied conditions such as paralysis, exhaustion, running, pain, transformation, or contact.

It belongs to the phenomenological layer because it describes lived bodily experience rather than standalone structure.

`dream_quality`

A dream quality records a broad unusual or dreamlike experiential tone.

It belongs to the phenomenological layer because it annotates the felt mode of the dream rather than defining its objects or continuity role.

`agency_state`

An agency state records how action is experienced: blocked, compelled, active, passive, resisting, choosing, following, or unable.

It belongs to the phenomenological layer because it describes the dreamer's or another actor's lived action-capacity within the scene.

`metacognitive_moment`

A metacognitive moment records awareness events such as noticing inconsistency, realizing something, remembering, or becoming lucid.

It belongs to the phenomenological layer because it describes awareness inside experience.

`emotional_contradiction`

Emotional contradiction records directly supported simultaneous or colliding emotional states.

It belongs to the phenomenological layer because it structures feeling rather than external action.

`affective_atmosphere`

Affective atmosphere records the ambient mood or emotional field surrounding a scene or sequence.

It belongs to the phenomenological layer because it is a quality of experiential tone.

`spatial_instability`

Spatial instability records impossible architecture, unstable geography, looping paths, endless corridors, or shifting rooms.

It belongs to the phenomenological layer because it describes how space behaves in experience, not just where something is located.

`dream_state_quality`

Dream-state quality records explicit anomalies in how reality behaves, such as time distortion, impossible events, or unusual dream-state conditions.

It belongs to the phenomenological layer because it annotates the mode of perceived reality.

`altered_realism`

Altered realism records a local disturbance in perceived realism, such as a mirror anomaly, missing reflection, distorted self-image, or another impossible perceived condition.

It belongs to the phenomenological layer because it describes a quality of perceived reality rather than a meaning claim.

### Continuity Cues

`recurrence_candidate`

A recurrence candidate records something that may be recurring across dreams, such as a place, actor, motif, emotional pattern, or situation.

It belongs to the continuity layer because its purpose is downstream continuity evaluation, not primary structural description.

`continuity_fragment`

A continuity fragment records a piece of material that may later connect across entries or continuity systems.

It belongs to the continuity layer because it is intentionally preserved as possible continuity seam material.

## 4. Architectural Interpretation

### Why mixed representational levels coexist inside Observation

Observation is not only a scene parser and not only an ontology of dream objects.

Observation must preserve enough descriptive structure for downstream systems to work with:

- what is there
- what happens
- how it is experienced
- what may matter again later

That requirement naturally produces mixed representational levels inside a single descriptive substrate.

This is acceptable because all four role classes still satisfy the same higher-order rule:

They remain evidence-linked, descriptive, non-interpretive forms of dream material.

The categories do not need to belong to one ontological tier in order to coexist.

They only need to remain inside the Observation boundary:

- descriptive rather than explanatory
- local rather than theory-heavy
- evidence-supported rather than speculative
- substrate-like rather than downstream-decisive

### What the limits are

Observation may include multiple representational layers, but those layers must remain subordinate to descriptive fidelity.

The boundary stops when a category begins to encode:

- hidden meaning
- latent hypothesis
- salience ranking
- thread identity
- reflective recommendation
- graph-level DreamMap semantics
- user-facing interpretive framing

Observation may preserve candidate seams.

Observation may not resolve them into downstream structures.

### When category overload begins

Category overload begins when the Observation vocabulary starts carrying responsibilities that belong to later systems.

Practical overload signals include:

- categories that require interpretive judgment rather than descriptive evidence
- categories that collapse multiple downstream functions into one label
- categories that encode prioritization or importance rather than observation
- categories that depend on cross-entry continuity decisions instead of candidate preservation
- categories that act like latent hypotheses, thread names, or graph nodes/edges by themselves

A secondary overload signal appears when too many categories overlap so heavily that they stop improving descriptive precision and instead create runtime drift.

The current mixed role map is still coherent because the categories remain bounded by Observation's descriptive phenomenological function.

### How Observation should conceptually be read

Observation should be read as a layered descriptive representation:

```text
Observation
├─ structure
│  ├─ scenes
│  ├─ actors
│  ├─ objects
│  └─ locations
├─ relations
│  ├─ interactions
│  ├─ transitions
│  └─ affective changes
├─ phenomenology
│  ├─ emotions
│  ├─ embodiment
│  ├─ agency
│  ├─ metacognition
│  ├─ dream-state anomalies
│  └─ experiential atmosphere
└─ continuity seams
   ├─ recurrence candidates
   └─ continuity fragments
```

Observation is therefore not merely a flat list of labels.

It is a descriptive phenomenological representation that combines:

- dream structure
- dream dynamics
- dream experience
- candidate continuity material

The flat runtime category list is an implementation-facing vocabulary.

This role map provides the conceptual reading layer that explains how those categories relate.

## 5. DreamMap Compatibility Note

Observation remains independent from DreamMap.

It should not be read as a graph, and it should not be forced to adopt DreamMap semantics in order to remain useful.

That said, the current role map is compatible with future DreamMap-oriented projection:

- structural primitives are likely future mapping candidates
- relations / events are likely future mapping edges
- phenomenological annotations are likely future graph annotations or overlays
- continuity cues are likely future continuity projections

The important boundary is this:

Observation preserves descriptive source material.

DreamMap, if built later, would be a downstream projection of some of that material.

Observation does not become DreamMap merely by containing graph-compatible categories.

## 6. Recommended Reading

- `docs/runtime/lumira-observation-extraction-contract-v1.md`
- `docs/runtime/lumira-observation-generation-strategy-v1.md`
- `docs/runtime/lumira-reflective-cognition-runtime-contract-v0.md`
- `src/domain/observation/README.md`
