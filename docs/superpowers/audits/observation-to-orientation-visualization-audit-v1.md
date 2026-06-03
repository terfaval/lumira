# Observation -> Orientation Visualization Audit v1

Date: 2026-06-03  
Type: REPO SCOUT / AUDIT / UX SUPPORT  
Scope: Dream-derived outputs already active, partially implemented, or documented for potential Orientation Layer surfacing

## Ticket Protocol

### 1) Goal restatement
- Audit the repository for dream-derived information already produced from dream material.
- Separate active runtime outputs from partial, planned, and internal-only outputs.
- Evaluate which existing signals could become calm Orientation visuals without implying interpretive authority.
- Answer which five strongest signals are already available or nearly available for a first Reflective Space Orientation screen.

### 2) Touched files
- New: `docs/superpowers/audits/observation-to-orientation-visualization-audit-v1.md`

### 3) Implementation steps
1. Read required repo guidance and documentation indexes.
2. Trace active runtime path from capture -> observation -> latent -> opening -> viewport.
3. Audit domain types, composition layers, route contracts, and current UI surfacing.
4. Cross-check with recent runtime contracts, audits, and roadmap docs for partial/planned signals.
5. Classify each signal by status, user-facing viability, orientation value, and anti-pattern risk.

### 4) Acceptance criteria (DoD)
- Inventory table completed with `Active | Partial | Planned | Unknown` statuses.
- User-facing potential assessed for each signal.
- Orientation value rated for each signal.
- Visualization opportunities listed without redesigning runtime.
- Anti-patterns clearly identified.
- Top 10 Orientation Signals ranked.
- Final question answered explicitly with 5 strongest current/nearly-current signals.

### 5) Testing / validation plan
- Documentary and code audit only.
- Validation by reading active routes, types, composition functions, UI workspace, runtime contracts, and recent audits.
- No schema or runtime mutation.

### 6) Rollback plan
- Revert this file.

---

## Source Basis

Primary implementation evidence:
- `app/capture/page.tsx`
- `src/cognition/observation/descriptive-observation-scaffold.ts`
- `src/domain/observation/types.ts`
- `src/cognition/latent/latent-engine.ts`
- `src/domain/latent/types.ts`
- `src/domain/latent/transport.ts`
- `src/cognition/glossary/extract-glossary-candidates-from-observations.ts`
- `src/domain/glossary/types.ts`
- `src/domain/threads/types.ts`
- `src/domain/openings/types.ts`
- `src/reflective-space/composition/compose-reflective-space-viewport.ts`
- `src/reflective-space/composition/derive-glossary-cues.ts`
- `src/reflective-space/composition/derive-thread-surfaces.ts`
- `src/reflective-space/composition/derive-opening-surfaces.ts`
- `src/ui/reflective-space/reflective-space-workspace.tsx`
- `src/reflective-space/composition/compose-homepage-orientation-payload.ts`
- `app/api/reflective-objects/[id]/glossary-candidates/route.ts`
- `app/api/reflective-objects/[id]/latent-snapshots/route.ts`
- `app/api/latent/snapshots/[id]/openings/route.ts`
- `src/runtime/orchestration/prepare-latent-opening-for-reflection.ts`

Primary documentation evidence:
- `docs/canon/LUMIRA-MINIMAL-REFLECTIVE-RUNTIME-v1.md`
- `docs/canon/Lumira_Reflective_Interaction_Model_v2.md`
- `docs/canon/Lumira_Reflective_Composer_Model_v1.md`
- `docs/canon/observation-ontology-slice-spec-v2.md`
- `docs/runtime/lumira-capture-space-composition-contract-v1.md`
- `docs/runtime/lumira-reflective-cognition-runtime-contract-v0.md`
- `docs/runtime/latent-governance-primitives-v1.md`
- `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`
- `docs/runtime/lumira-homepage-orientation-aggregate-payload-contract-v1.md`
- `docs/runtime/reflective-thread-model-v1.md`
- `docs/superpowers/audits/reflection-thread-reality-audit-v1.md`
- `docs/superpowers/audits/2026-05-26-latent-architecture-audit-v1.md`
- `docs/superpowers/audits/2026-05-26-reflective-space-experiential-convergence-audit-v1.md`
- `docs/superpowers/plans/2026-05-25-observation-architecture-completion-roadmap-v1.md`

---

## 1. Inventory

| Signal | Source | Current Status |
| --- | --- | --- |
| Observation summary | Observation | Active |
| Observation fragments by category | Observation | Active |
| Scene/location/actor/object fragments | Observation | Active |
| Emotion/body-state/dream-quality fragments | Observation | Active |
| Agency/metacognitive fragments | Observation | Active |
| Affect transition / emotional contradiction / atmosphere fragments | Observation | Active |
| Spatial instability / dream-state / altered-realism / continuity-fragment observations | Observation | Active |
| Recurrence-candidate fragments | Observation | Active |
| Observation uncertainty notes | Observation | Active |
| Summary trace / explicit-anchor trace | Observation | Active |
| Evidence adequacy tier | Observation | Active |
| Semantic policy result + reasons | Observation | Active |
| Provenance tier | Observation | Active |
| Glossary candidates | Glossary | Active |
| Glossary candidate recurrence counts | Glossary | Active |
| Glossary terms / notes / associations | Glossary Memory | Active |
| Derived glossary cues in viewport | Viewport continuity composition | Active |
| Thread titles / states / continuity cues | Threads | Active |
| Dormant or quiet thread resurfacing possibility | Latent -> Threads | Active |
| Opening types generated from latent suggestions | Openings | Active |
| Opening tone / suppression / revisit state | Openings | Active |
| Public latent summary | Latent transport | Active |
| Public latent signals (`possible recurrence`, `possible resurfacing`) | Latent transport | Active |
| Public latent suggestions (`possible_*`) | Latent transport | Active |
| Public latent lifecycle state (`centerState`, `noCenterReason`) | Latent transport | Active |
| Internal reflective center category | Latent lifecycle | Active |
| Internal lifecycle salience / attenuation / cooldown state | Latent lifecycle | Active |
| Internal neighborhood payload (`relatedCategories`, `glossaryAnchors`, `affectAdjacency`, `continuityCues`) | Latent lifecycle | Active |
| Internal processing mode candidates and rationale | Latent lifecycle | Active |
| Homepage dream preview from observation summary | Homepage orientation payload | Active |
| Homepage dream preview from dream excerpt | Homepage orientation payload | Active |
| Homepage dream preview from `ai_summary` metadata | Homepage orientation payload | Partial |
| Latent hints inside active reflective-space viewport | Legacy reflective-space assembler | Partial |
| Center lifecycle persistence streak / emergence history | Latent lifecycle | Partial |
| User-owned salience proxies from highlights / explicit emphasis metadata | Latent lifecycle | Partial |
| Structured continuity hints beyond simple recurrence count | Observation roadmap | Planned |
| Local phenomenological relation modeling | Observation roadmap | Planned |
| Affective density / intensity calibration | Observation roadmap | Planned |
| Richer scene-level atmosphere modeling | Observation roadmap | Planned |
| Direction-level orientation surfaces (`emotional`, `relational`, `agency`, etc.) | Reflective thread / experiential docs | Planned |
| Branch / merge / reconnect thread identity | Reflective thread docs | Planned |
| Cross-object latent continuity clustering | Observation roadmap / thread docs | Planned |
| Symbolic density / resonance scoring | Deferred latent systems | Planned |
| Dream-to-life bridge prompts as orientation material | Reflective thread docs | Planned |

---

## 2. User-Facing Potential

### Observation summary
- Could a user see this: Yes
- Why: Already shown in current workspace and already used as homepage preview fallback.

### Observation fragments by category
- Could a user see this: Yes
- Why: Current workspace renders fragment category + fragment text for the selected dream.

### Scene/location/actor/object fragments
- Could a user see this: Yes
- Why: These are already durable observation fragments and are safe descriptive cues.

### Emotion/body-state/dream-quality fragments
- Could a user see this: Yes
- Why: These remain descriptive and can be surfaced without explaining the dream.

### Agency/metacognitive fragments
- Could a user see this: Maybe
- Why: They exist now and are structurally useful, but wording must stay phenomenological rather than psychological.

### Affect transition / emotional contradiction / atmosphere fragments
- Could a user see this: Maybe
- Why: Strong orientation value, but should be transformed into gentle cues rather than raw analytic labels.

### Spatial instability / dream-state / altered-realism / continuity-fragment observations
- Could a user see this: Maybe
- Why: Good dream-structure signals, but present implementation is still cue-based and should remain non-diagnostic.

### Recurrence-candidate fragments
- Could a user see this: Yes
- Why: Already feeds glossary and latent recurrence seams; user-facing phrasing can stay light.

### Observation uncertainty notes
- Could a user see this: Maybe
- Why: Better as soft qualifiers than as a dedicated surface.

### Summary trace / explicit-anchor trace
- Could a user see this: No
- Why: This is provenance scaffolding, not a meaningful user-facing signal by itself.

### Evidence adequacy tier
- Could a user see this: No
- Why: Internal evidence hygiene; surfacing it would create pseudo-analytic authority.

### Semantic policy result + reasons
- Could a user see this: No
- Why: Boundary enforcement metadata is internal governance, not orientation.

### Provenance tier
- Could a user see this: No
- Why: Useful for trust shaping inside the system, not for dream-facing UX.

### Glossary candidates
- Could a user see this: Maybe
- Why: They are retrievable now, but candidate-state language is still system-facing.

### Glossary candidate recurrence counts
- Could a user see this: Maybe
- Why: Count can support motif return cues, but exact numbers risk dashboardification.

### Glossary terms / notes / associations
- Could a user see this: Yes
- Why: Already explicitly user-visible and framed as calm continuity memory.

### Derived glossary cues in viewport
- Could a user see this: Yes
- Why: Already shown in current reflective-space UI as lightweight continuity cues.

### Thread titles / states / continuity cues
- Could a user see this: Yes
- Why: Already shown in current UI and inherently continuity-oriented.

### Dormant or quiet thread resurfacing possibility
- Could a user see this: Yes
- Why: Already safely transformed into optional resurfacing/opening behavior.

### Opening types generated from latent suggestions
- Could a user see this: Yes
- Why: Already visible as optional openings and phrased as invitations, not truths.

### Opening tone / suppression / revisit state
- Could a user see this: Maybe
- Why: Tone is safe; suppression/cadence internals should stay mostly implicit except where needed for calm control.

### Public latent summary
- Could a user see this: Maybe
- Why: Transport is already safe-projected, but the summary is generic and not yet a strong visual signal.

### Public latent signals (`possible recurrence`, `possible resurfacing`)
- Could a user see this: Yes
- Why: These are already transformed, optional, and bounded.

### Public latent suggestions (`possible_*`)
- Could a user see this: Yes
- Why: They already drive openings.

### Public latent lifecycle state (`centerState`, `noCenterReason`)
- Could a user see this: Maybe
- Why: High orientation value if transformed gently; raw terms like `suppressed` or `weakening` should not be shown directly.

### Internal reflective center category
- Could a user see this: Maybe
- Why: Potentially useful if translated into a soft orientation cue, but raw center selection should stay hidden.

### Internal lifecycle salience / attenuation / cooldown state
- Could a user see this: No
- Why: These are orchestration mechanics and high-risk pseudo-objective signals.

### Internal neighborhood payload (`relatedCategories`, `glossaryAnchors`, `affectAdjacency`, `continuityCues`)
- Could a user see this: Maybe
- Why: The neighborhood concept is promising, but should surface only as transformed adjacency cues.

### Internal processing mode candidates and rationale
- Could a user see this: No
- Why: Explicitly internal-only and too close to interpretive framing.

### Homepage dream preview from observation summary
- Could a user see this: Yes
- Why: Already active as a calm preview fallback.

### Homepage dream preview from dream excerpt
- Could a user see this: Yes
- Why: Already active and safe.

### Homepage dream preview from `ai_summary` metadata
- Could a user see this: Maybe
- Why: Contract exists, implementation path exists, but canonical source remains unresolved.

### Latent hints inside active reflective-space viewport
- Could a user see this: Maybe
- Why: Legacy assembler supports it, but the active bounded viewport does not use it.

### Center lifecycle persistence streak / emergence history
- Could a user see this: No
- Why: Useful internally; numeric persistence semantics invite false certainty.

### User-owned salience proxies from highlights / explicit emphasis metadata
- Could a user see this: Maybe
- Why: Best used indirectly to decide what surfaces, not as visible scoring.

### Structured continuity hints beyond simple recurrence count
- Could a user see this: Yes
- Why: Explicitly planned as reflective-space-safe surfacing and well suited to calm orientation cues.

### Local phenomenological relation modeling
- Could a user see this: Maybe
- Why: Promising but not implemented, and relation language can drift toward interpretation.

### Affective density / intensity calibration
- Could a user see this: No
- Why: Too likely to become emotional analytics.

### Richer scene-level atmosphere modeling
- Could a user see this: Yes
- Why: If kept soft and descriptive, atmosphere is one of the best orientation-layer materials.

### Direction-level orientation surfaces (`emotional`, `relational`, `agency`, etc.)
- Could a user see this: Yes
- Why: Docs explicitly place these in orientation, but runtime support is not yet there.

### Branch / merge / reconnect thread identity
- Could a user see this: Maybe
- Why: Important long-term, but raw graph semantics would be too heavy for early orientation.

### Cross-object latent continuity clustering
- Could a user see this: Maybe
- Why: Potentially valuable for continuity constellations, but currently deferred and high-risk if over-asserted.

### Symbolic density / resonance scoring
- Could a user see this: No
- Why: High authority risk and explicitly deferred latent-side scoring.

### Dream-to-life bridge prompts as orientation material
- Could a user see this: Maybe
- Why: Docs allow user-led bridge prompts, but this is not yet runtime-backed and is higher-risk than dream-structural cues.

---

## 3. Orientation Value

| Signal | Orientation Value | Why |
| --- | --- | --- |
| Observation summary | Medium | Gives calm orientation, but is broad and generic. |
| Observation fragments by category | High | Closest active descriptive substrate for "the system noticed something here." |
| Scene/location/actor/object fragments | High | Concrete and comprehensible. |
| Emotion/body-state/dream-quality fragments | High | Helps orient the felt texture of the dream. |
| Agency/metacognitive fragments | High | Strong reflective usefulness without requiring meaning claims. |
| Affect transition / contradiction / atmosphere fragments | High | Excellent orientation material if transformed gently. |
| Spatial instability / dream-state / altered-realism / continuity-fragment observations | High | Strongly dream-specific and visually suggestive. |
| Recurrence-candidate fragments | High | Supports continuity orientation without interpretive certainty. |
| Observation uncertainty notes | Low | Better as background restraint than as a primary signal. |
| Summary trace / explicit-anchor trace | Low | Internal support data, not orientation. |
| Evidence adequacy tier | Low | Internal trust machinery only. |
| Semantic policy result + reasons | Low | Governance, not orientation. |
| Provenance tier | Low | Governance, not orientation. |
| Glossary candidates | Medium | Useful, but candidate-state wording is immature. |
| Glossary candidate recurrence counts | Medium | Helpful if softened; risky if numeric. |
| Glossary terms / notes / associations | High | Stable continuity memory already aligned with product philosophy. |
| Derived glossary cues in viewport | High | Already close to calm orientation signals. |
| Thread titles / states / continuity cues | High | Strong re-entry and continuity orientation value. |
| Dormant or quiet thread resurfacing possibility | High | Good signal that something nearby matters without claiming meaning. |
| Opening types generated from latent suggestions | Medium | Useful orientation support, but openings are more invitation than visualization substrate. |
| Opening tone / suppression / revisit state | Low | Mostly pacing mechanics. |
| Public latent summary | Medium | Safe but generic. |
| Public latent signals | High | Already shaped into optional continuity wording. |
| Public latent suggestions | Medium | More actionable than visual; better adjacent to orientation than central in it. |
| Public latent lifecycle state | Medium | Could guide calm orientation if translated softly. |
| Internal reflective center category | Medium | Potentially strong, but raw exposure would overstate system certainty. |
| Internal lifecycle salience / attenuation / cooldown state | Low | Strong anti-pattern territory. |
| Internal neighborhood payload | High | Promising substrate for adjacency and continuity visuals. |
| Internal processing mode candidates and rationale | Low | Internal orchestration only. |
| Homepage dream preview from observation summary | Medium | Useful threshold preview, but not enough on its own for orientation depth. |
| Homepage dream preview from dream excerpt | Low | Useful preview text, weak orientation signal. |
| Homepage dream preview from `ai_summary` metadata | Medium | Could help, but source is unresolved. |
| Latent hints inside active reflective-space viewport | Medium | Safe shape exists, but active path does not use it. |
| Center lifecycle persistence streak / emergence history | Low | Too score-like and system-centric. |
| User-owned salience proxies | Medium | Good ranking substrate, poor display substrate. |
| Structured continuity hints beyond simple recurrence count | High | Strong future orientation material. |
| Local phenomenological relation modeling | Medium | Potentially rich, but wording risk remains. |
| Affective density / intensity calibration | Low | Too analytics-adjacent. |
| Richer scene-level atmosphere modeling | High | Very strong for non-interpretive orientation. |
| Direction-level orientation surfaces | High | Explicitly aligned with orientation, once backed by runtime. |
| Branch / merge / reconnect thread identity | Medium | Better for mature continuity navigation than first-screen orientation. |
| Cross-object latent continuity clustering | Medium | Promising later-stage constellation material; high over-interpretation risk. |
| Symbolic density / resonance scoring | Low | Too authority-laden. |
| Dream-to-life bridge prompts as orientation material | Medium | Potentially meaningful, but not first-wave safe. |

---

## 4. Visualization Opportunities

Promising signal families and lightweight UI possibilities:

### Observation fragments
- Scene and location fragments: scene beads, place markers, small topology chips.
- Actor and object fragments: motif chips, relationship dots, recurring-object pins.
- Emotion and body-state fragments: low-density mood dots, body/affect traces, tone clusters.
- Transition and continuity fragments: scene-shift ticks, dream-cut markers, continuity seams.
- Spatial instability / altered realism / dream-state quality: atmosphere haze, instability ripples, dream-logic markers.
- Agency and metacognition: awareness glints, agency shift markers, lucidity/constraint toggles.
- Affect transition / contradiction / atmosphere: emotional movement traces, paired tension dots, ambient field indicators.

### Glossary memory
- Glossary terms: motif constellation, recurring motif ring, memory shelf dots.
- Glossary notes: quiet note halo, user-pinned motif marker.
- Glossary associations: subtle lines from current dream to familiar motifs.
- Derived glossary cues: repeated motif pulse, faint repetition echo, cluster density without showing counts.

### Threads and continuity
- Dormant/quiet threads: sleeping thread markers, faint revisit lines, continuity embers.
- Thread continuity cues: short label strands, nearby-line indicators, re-entry breadcrumbs.
- Thread states: calm hue or opacity differences rather than badges.

### Latent-safe transformed signals
- Public recurrence signal: recurrence shimmer, echo marks, "seen before" motif pulse.
- Dormant resurfacing signal: near-return marker, soft resurfacing line.
- Public lifecycle state: one quiet center glow, a resting state, or a softened no-center field.
- Internal neighborhood payload transformed safely: adjacency ring, nearby motif cluster, affect-neighbor haze.

### Homepage threshold previews
- Observation-summary preview: compact orientation sentence beside each dream.
- Dream excerpt fallback: first-fragment whisper text for empty states.
- `ai_summary` or equivalent future preview: only if its source stays non-interpretive and canonical.

What seems strongest for a first orientation layer:
- motif recurrence
- emotional movement
- scene/continuity transitions
- dream-state instability
- dormant continuity nearby

---

## 5. Anti-Patterns

Signals that should probably not become Orientation visuals:

- Raw latent confidence bands as visible meters.
- Center score, persistence streak, cooldown timestamp, attenuation multipliers.
- Processing mode selection, candidate modes, rationale traces, material priorities.
- Evidence adequacy tiers, provenance tiers, semantic policy results, semantic policy reasons.
- Exact glossary recurrence counts shown numerically.
- Exact ranking weights or latent weighting outputs.
- No-opening reasons rendered as system diagnostics.
- Any graph or score view that implies the system knows the dream's true structure.
- Symbolic density / resonance scoring.
- Cross-object clustering visuals unless evidence and wording are extremely conservative.

Why these are risky:
- They invite dashboardification.
- They convert internal heuristics into pseudo-objective user truth.
- They increase AI authority posture.
- They shift the interface away from reflective orientation and toward analysis theater.

---

## 6. Top 10 Orientation Signals

Ranked by reflective usefulness, user comprehensibility, and low risk of over-interpretation.

1. Derived glossary cues
   - Already active, lightweight, recurrence-friendly, and user-comprehensible.
2. Observation fragments for scene / actor / object / location
   - Concrete descriptive cues with low authority risk.
3. Affect transition / emotional contradiction / atmosphere observations
   - High reflective value and strong visual potential when softened.
4. Spatial instability / dream-state / altered-realism observations
   - Very dream-specific orientation material with low need for explanation.
5. Dormant or quiet thread cues
   - Strong continuity feeling without requiring system authority.
6. Recurrence-candidate fragments
   - Clear bridge between one dream and longer continuity memory.
7. Agency and metacognitive observations
   - Useful reflective direction cues that remain dream-structural.
8. Public latent recurrence / resurfacing signals
   - Already transformed into safe, optional phrasing.
9. Thread continuity cues and titles
   - Good re-entry substrate, especially for returning users.
10. Public latent lifecycle state transformed into calm status
   - Valuable if softened into "present / resting / quiet" rather than raw lifecycle jargon.

Near-miss signals that are promising but not top-10 safe today:
- glossary candidate counts
- internal neighborhood payload
- `ai_summary` preview source
- latent hints from legacy assembler
- direction-level orientation surfaces from docs

---

## Final Answer

### If we were designing the first Reflective Space Orientation screen tomorrow, what are the 5 strongest dream-derived signals already available (or nearly available) in the repo that deserve visual representation?

1. Derived glossary cues
   - Best current continuity signal.
   - Already active in the viewport.
   - Naturally supports calm motif-based visuals.

2. Observation fragment families, especially scene, actor, object, location, and recurrence fragments
   - Most direct evidence that the system noticed concrete dream structure.
   - Already active and user-readable.

3. Affect-structure observations: `affect_transition`, `emotional_contradiction`, `affective_atmosphere`
   - High orientation value.
   - Already implemented in observation and latent substrate.
   - Strong fit for soft emotional movement visuals.

4. Dream-structure observations: `spatial_instability`, `dream_state_quality`, `continuity_fragment`, `altered_realism`
   - Highly dream-specific.
   - Already implemented.
   - Strong candidate for non-interpretive atmosphere and transition cues.

5. Dormant/quiet continuity signals from threads and latent resurfacing
   - Already active through thread surfaces and latent resurfacing logic.
   - Strong re-entry/orientation value with low over-interpretation risk.

## Practical conclusion

The repo already contains enough material for a first Orientation screen without inventing new pipelines.

The safest first-wave visual substrate is:
- observation-derived structure
- glossary-derived recurrence memory
- thread-derived continuity presence
- selected transformed latent cues

The signals to avoid surfacing directly are the internal scoring, confidence, and orchestration layers.
