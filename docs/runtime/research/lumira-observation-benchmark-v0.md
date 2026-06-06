lumira-observation-benchmark-v0.md
Status

Draft

Purpose: Observation Extraction Benchmark

This document does not define runtime behavior.

Its purpose is to provide a stable benchmark set for evaluating Observation extraction quality.

The benchmark evaluates:

observation density
observation diversity
preservation fidelity
category coverage
phenomenological sensitivity

The benchmark does not evaluate:

latent generation
reflection quality
continuity ranking
interpretation quality
Benchmark Case A
Dream

Gyapai túra az ismeretlenbe. Dombos vidéken haladunk. Egy havas lépcsőn feljutunk egy zárt épületbe. A lépcsők egyre furcsábbak lesznek. Egy ajtónál apám megnyom egy gombot és moslék ömlik ki. A moslék lesodor. Később egy nagy szobában idegen emberek fenyegetően kérdezgetnek. Egy ablakból látom, hogy valójában Budapesten vagyunk. Elmenekülünk és egy hosszú vízicsúszdán csúszunk.

Source:
2025.02.06

Expected Observation Coverage
Structure
actor: dreamer
actor: father
actor: unknown group
location: hilly landscape
location: staircase
location: enclosed building
location: interrogation room
object: door
object: button
object: window
Relations
transition: outdoor → indoor
interaction: father activates mechanism
interaction: group questions dreamer
interaction: escape
transition: interrogation space → waterslide sequence
Phenomenology
body_state: being swept away
agency_state: loss of control
agency_state: escape attempt
emotion: tension
emotion: threat
affective_atmosphere: hostile
spatial_instability: Gyapa → Budapest discontinuity
dream_quality: impossible environmental transformation
Continuity
recurrence_candidate: Gyapa
recurrence_candidate: father
recurrence_candidate: unknown institution/interrogation motif
Common Failure Modes

Bad extractor behavior:

only extracting the building
ignoring Budapest discontinuity
ignoring bodily loss of control
ignoring atmosphere
collapsing entire dream into "escape dream"
Benchmark Case B
Dream

Hatalmas iskola. Több alkalommal fenyegetnek. Egy hosszú csigalépcsőn követek egy fiút. A tetején egy tükörben szakadék látszik. Nem látom saját magamat a tükörben. A fiú szexuálisan közeledik. Menekülni kezdek. Futás közben rájövök, hogy álmodom. A felismerést repülésre használom.

Source:
2025.02.11

Expected Observation Coverage
Structure
location: school
location: courtyard
location: spiral staircase
object: mirror
actor: athlete
actor: staircase boy
Relations
interaction: pursuit
interaction: unwanted sexual approach
transition: school → staircase → mirror space
transition: running → flying
Phenomenology
emotion: fear
emotion: discomfort
agency_state: threat avoidance
agency_state: escape
metacognitive_moment: realization of dreaming
dream_state_quality: lucid transition
altered_realism: mirror anomaly
altered_realism: missing reflection
spatial_instability: abyss visible in mirror
Continuity
recurrence_candidate: school
recurrence_candidate: pursuit
recurrence_candidate: staircase motif
Common Failure Modes

Bad extractor behavior:

extracting only lucid dreaming
ignoring mirror anomaly
ignoring agency changes
treating the mirror as a normal object
Benchmark Case C
Dream

Lucid dream. The dreamer questions whether reality is a dream. Changes a building number from 15 to 16. Flies above the Danube. Relocates to Venice. Enters a building through a window. Exercises increasing control over dream reality.

Source:
2025.02.26

Expected Observation Coverage
Structure
location: city street
location: Danube
location: Venice
actor: dreamer
actor: female figure
Relations
interaction: reality testing
transition: Budapest → Venice
interaction: intentional dream control
Phenomenology
metacognitive_moment: questioning reality
metacognitive_moment: recognition of dream state
dream_state_quality: voluntary reality modification
agency_state: active control
agency_state: experimentation
altered_realism: changing house number
dream_quality: stable lucid control
body_state: flying
Continuity
recurrence_candidate: lucid awareness
recurrence_candidate: flight
recurrence_candidate: dream control
Common Failure Modes

Bad extractor behavior:

reducing dream to sexual content
missing reality-testing sequence
missing agency progression
missing transition between dream environments
Benchmark Evaluation Heuristic

A strong Observation extraction should:

preserve observations rather than summarize
produce observations across multiple layers
capture phenomenology as well as structure
preserve dream anomalies
preserve agency shifts
preserve metacognitive events

A weak Observation extraction typically:

over-summarizes
extracts only entities
ignores atmosphere
ignores agency
ignores dream-state anomalies
ignores continuity candidates
Success Criteria

The benchmark should be used comparatively.

Questions:

How many valid observations were preserved?
How many observation categories were represented?
Were dream anomalies preserved?
Were agency changes preserved?
Were metacognitive events preserved?
Was atmosphere preserved?
Was continuity material preserved?

The goal is not maximum observation count.

The goal is maximum descriptive fidelity with minimal interpretive drift.