# Lumira Reflective Cognition Runtime Architecture v0

## Purpose

Define the first execution-oriented Reflective Cognition Runtime Architecture for Lumira.

This architecture establishes how internal cognition is safely contained and transformed into reflective continuity structures, while preserving:

- single-write-owner discipline
- projection-only bridge semantics during transition
- non-authoritative external behavior
- user-owned salience precedence
- suppression/defer/dismiss authority
- rollbackability
- calmness/density constraints
- silence legitimacy

This is a planning/architecture artifact only. No runtime, route/API, schema, or Supabase changes are defined here.

## Inputs and Scope Notes

Required inputs reviewed:

- `docs/gpts/Observation_Latent_Glossary_Work_Redesign_Handoff.md`
- `docs/plans/lumira-evolution-north-star-v0.md`
- `docs/design/Lumira_Reflective_Interaction_Model_v2.md`
- `docs/design/Lumira_Reflective_Composer_Model_v1.md`
- `docs/design/lumira-reflective-payload-architecture-v0.md`
- `docs/design/lumira-reflective-data-model-bridge-v0.md`
- `docs/design/lumira-reflective-interaction-grammar-v0.md`
- `docs/plans/lumira-reflective-runtime-compat-contract-v0.md`
- `docs/plans/lumira-route-api-ownership-contract-pack-v0.md`
- `docs/plans/lumira-reflective-projection-contract-pack-v0.md`
- `docs/plans/lumira-reflective-thread-state-machine-v0.md`
- `docs/plans/lumira-reflective-thread-transition-invariants-v0.md`
- `docs/plans/lumira-reflective-opening-lifecycle-api-contract-v0.md`
- `docs/plans/lumira-reflective-opening-generation-policy-v0.md`
- `docs/plans/lumira-reflective-reentry-payload-contract-v0.md`
- `docs/plans/lumira-reflective-space-layer-composition-map-v0.md`
- `docs/plans/lumira-unified-reflective-space-rollout-plan-v0.md`
- `docs/plans/lumira-reflective-implementation-roadmap-v0.md`
- `docs/plans/lumira-reflective-implementation-governance-v0.md`

Referenced input missing:

- `docs/plans/lumira-canonical-architecture-map-v0.md` (not found)

## 1. Runtime Purpose

The Reflective Cognition Runtime is the containment and orchestration layer that transforms internal cognition into user-facing reflective continuity structures.

It is responsible for:

- descriptive observation derivatives
- latent probabilistic hypothesis transformation
- recurrence and continuity signaling
- highlight-driven salience integration
- glossary-based motif memory integration
- reflective thread lifecycle orchestration
- reflective opening lifecycle orchestration
- reflective response lineage binding
- attention lens weighting
- re-entry and orientation payload composition

The runtime is not a meaning authority and not a workflow progression engine.

## 2. Cognition Layer Boundaries

### 2.1 Canonical Layer Map

| Layer | Primary role | Visibility | Alpha classification | Target ownership posture |
| --- | --- | --- | --- | --- |
| Dream substrate (`dream_entries`) | canonical source material | user-visible, user-editable | KEEP | canonical substrate owner remains stable |
| Observation cognition | descriptive evidence-linked structuring | internal-first, derivative-only external | KEEP | internal cognition substrate |
| Latent cognition | probabilistic interpretive modeling | internal-only raw form | KEEP | internal cognition substrate |
| Highlights/salience | user-owned anchors | user-visible, interactive | KEEP+BRIDGE | future canonical unified highlight domain |
| Glossary/continuity memory | personal motif recurrence memory | optional contextual surfacing | KEEP+BRIDGE | future canonical continuity memory domain |
| Reflective threads | continuity trajectories | user-visible continuity structure | BRIDGE | future canonical runtime owner |
| Reflective openings | invitation lifecycle objects | optional user-facing invitations | BRIDGE | future canonical runtime owner |
| Reflective responses | durable reflective writing lineage | user-visible | BRIDGE | future canonical runtime owner |
| Attention lenses | soft weighting context | secondary orientation signal | BRIDGE | future canonical runtime owner |
| Orientation payloads | re-entry/orientational context | user-visible secondary layer | BRIDGE | future canonical orientation owner |
| Re-entry payload | bounded continuity return contract | user-visible contextual payload | BRIDGE | future canonical re-entry owner |
| Projection/adapter layer | compatibility read shaping | route/API internal | BRIDGE | temporary only, never canonical owner |
| Payload composer | route-safe payload assembly | route/API internal | BRIDGE | read composition only, no canonical writes |

### 2.2 Cognition Boundary Contracts

- Observation cognition remains descriptive, evidence-linked, non-interpretive.
- Latent cognition may be internally interpretive/probabilistic, but externally non-authoritative.
- Glossary is personal recurrence memory, not symbolic dictionary authority.
- Highlights are user-owned salience anchors and outrank inference-only weighting.
- Work/question artifacts are transitional sources that evolve into reflective openings and threads.

## 3. Cognition-to-Reflection Transformation Boundary

Internal cognition can influence user-facing runtime only through a guarded transformation pipeline:

1. Internal extraction/modeling (`observation_*`, `latent_*`, recurrence signals).
2. Evidence-link and uncertainty packaging (source refs + alternatives).
3. Policy gating (salience precedence, suppression/cooldown, calmness/density, silence legitimacy).
4. Reflective object shaping (opening/thread/continuity hint/orientation cue).
5. Bounded surfacing (foreground/midground/background constraints).

Hard transformation rules:

- latent hypotheses must become openings or continuity hints, never truth claims
- recurrence is advisory continuity support, never diagnosis or symbolic verdict
- affect/agency/relational modeling can influence weighting, never visible certainty
- evidence references must remain attached or traceable
- alternative readings and uncertainty posture must be preserved
- user-owned salience must outrank model-only confidence
- when confidence is weak or density is high, omission/silence is preferred

## 4. Runtime Domain Ownership Map

| Domain | Current owner | Projection/bridge owner | Future canonical owner | Write-owner constraint | Read/composer boundary |
| --- | --- | --- | --- | --- | --- |
| `reflective_threads` semantic domain | `work_versions/work_latest` + work routes | thread projection modules | reflective thread runtime | no parallel thread writers | composer may consume projected/native threads only |
| `reflective_openings` semantic domain | frame/work payload generation + current prompt surfaces | opening projection + lifecycle adapter | reflective opening runtime | only designated opening lifecycle owner mutates lifecycle | composer consumes lifecycle state, never mutates it |
| `reflective_responses` semantic domain | `/api/work/answer` -> `dream_answers` | response projection | reflective response runtime | single response writer at a time | composer reads projected/native responses |
| `attention_lenses` semantic domain | `/api/direction/select` -> `session_directions` | lens projection | attention lens runtime | no hidden lens writes in adapters | composer reads lens context only |
| glossary/continuity memory | glossary terms/occurrences/candidates flows | continuity projection usage in re-entry and openings | reflective glossary runtime | user confirmation gates pin/suppress state | composer reads motif cues; cannot promote motifs |
| highlights/salience | split highlight tables + highlight APIs | unified highlight projection | unified highlights runtime | user actions own salience state | composer reads salience anchors only |
| re-entry payload | summary/session assemblers | re-entry adapter builder | reflective re-entry runtime | payload builders are read-only | payload composition cannot persist canonical state |
| orientation payload | ensure frame/index latest | orientation projection | orientation runtime (`orientation_*`) | orientation remains secondary and non-authoritative | composer consumes orientation slices |
| payload composer | route-local assemblers currently | reflective payload composer foundation | canonical reflective space composer | never canonical state owner | only read assembly + DTO shaping |

## 5. Orchestration Topology (Target Shape)

### 5.1 Runtime Services

- `Cognition Substrate Service`
  - owns observation/latent internal production and version pointers.
- `Continuity Runtime Service`
  - owns reflective thread lifecycle transitions and resurfacing eligibility.
- `Opening Runtime Service`
  - owns opening generation-to-surfacing lifecycle transitions and suppression/cooldown semantics.
- `Salience/Memory Service`
  - owns highlight and glossary continuity weighting inputs with user-ownership precedence.
- `Attention Runtime Service`
  - owns lens weighting and orientation-context weighting.
- `Re-entry/Orientation Composition Service`
  - selects center, builds neighborhood, enforces caps, composes route-safe payloads.

### 5.2 Orchestration Responsibility Allocation

- Thread lifecycle transitions: Continuity Runtime Service.
- Opening lifecycle transitions: Opening Runtime Service.
- Resurfacing eligibility: Continuity Runtime + Opening Runtime policy gates.
- Defer/dismiss/suppression authority: explicit user actions persisted in owning domain; consumed by all services.
- Attention lens weighting: Attention Runtime Service as soft weighting only.
- Re-entry center selection: Re-entry/Orientation Composition Service using calmness-first signal hierarchy.
- Payload composition: payload composer over canonical/projected read models only.
- Ensure/work/answer route compatibility: retained via adapters until ownership transfer gates pass.

### 5.3 Bridge-Phase Compatibility

- Existing routes (`/api/session/ensure`, `/api/work-block/next`, `/api/work/answer`, `/api/direction/select`, `/api/session-summary`) remain operational owners until explicit transfer gates.
- Projections/adapters remain read-only compatibility structures.
- B1/B2 read switches remain additive and rollbackable.

## 6. Composer/Runtime Separation

### 6.1 Separation Contract

- Canonical runtime state:
  - lifecycle truth in canonical owning domains.
- Internal cognition outputs:
  - raw observation/latent payloads and internal signals.
- Projections:
  - temporary read-shape compatibility models.
- Compatibility adapters:
  - route/API bridge layers with explicit retirement conditions.
- Reflective payload composer:
  - read-only assembler enforcing layer grammar and caps.
- Route/API DTOs:
  - transport contracts derived from composer outputs.
- UI presentation:
  - contextual rendering of DTOs, never canonical owner.

### 6.2 Explicit Prohibitions

- composer-owned canonical state
- projection-owned persistence
- latent raw cognition surfacing as user-facing interpretation
- route-local hidden ownership drift
- permanent adapter ownership by accident

## 7. Persistence Boundary

### 7.1 Must Eventually Be Persisted (Canonical Runtime)

- reflective thread identity, state, lineage, transition metadata
- reflective opening lifecycle state, suppression/cooldown history, evidence refs
- reflective response bodies + lineage attachments
- unified highlight anchors/state/history
- glossary term state (candidate/pinned/suppressed) and occurrence links
- attention lens selection/events
- orientation versions/latest (unified orientation substrate)

### 7.2 May Remain Derived

- neighborhood assembly
- center ranking scores
- bounded ambient continuity lists
- presentation-layer density ordering
- calmness-mode selection heuristics

### 7.3 Internal-Only (Not User-Facing Raw)

- raw observation payload structures
- raw latent probabilistic payload structures
- internal confidence vectors/scoring internals

### 7.4 Must Remain User-Owned

- dream substrate meaning authority
- highlight salience confirmations/pins/dismissals
- defer/dismiss/suppression pacing authority
- reflective response authorship and revision decisions
- glossary promotion authority (`candidate` vs `pinned`)

### 7.5 Not Persisted Yet In Alpha (Defer)

- cross-session canonical thread identity merge graph
- high-complexity continuity signal graph persistence
- advanced automated latent inspectability surfaces
- multi-center automatic orchestration states

### 7.6 Follow-up Schema/Data-Model Planning Required

- PLAN: Reflective Thread Canonical Data Model v0
- PLAN: Reflective Opening Canonical Data Model v0
- PLAN: Reflective Response Canonical Data Model v0
- PLAN: Unified Highlights Canonical Data Model v0
- PLAN: Attention Lens and Orientation Canonical Data Model v0

No final SQL is defined in this document.

## 8. Current-vs-Target Compatibility Model

| Area | Current canonical runtime owner | Bridge behavior | Target canonical owner | Cutover gate |
| --- | --- | --- | --- | --- |
| Thread continuity | work runtime (`work_*`) | thread projection read model | `reflective_threads` | thread parity + transition invariant gate |
| Openings | embedded frame/work prompts | opening lifecycle projection | `reflective_openings` | opening lifecycle + suppression parity gate |
| Responses | `dream_answers` | reflective response projection | `reflective_responses` | response lineage/read parity gate |
| Lenses | `session_directions` | attention lens projection | `attention_lenses` | direction parity + fallback gate |
| Highlights | split highlight tables | unified highlight projection | unified `highlights` | CRUD/reject/pin parity gate |
| Re-entry payload | summary/session assemblers | re-entry adapter payload | reflective re-entry runtime | center/caps/suppression parity gate |
| Orientation | frame/index latest | orientation projection | `orientation_*` | orientation parity across routes |

Compatibility invariants:

- projection-only semantics
- single write owner per domain
- explicit rollback path per switch
- no destructive replacement before parity proof

## 9. Migration Sequence (Recommended Next)

Recommended sequence after this architecture ticket:

1. PLAN — Reflective Thread Canonical Data Model v0
2. PLAN — Reflective Opening Canonical Data Model v0
3. PLAN — Reflective Response Canonical Data Model v0
4. PLAN — Unified Reflective Space Read DTO and Route/API Convergence Contract v0
5. BUILD — Reflective Space Payload Composer Foundation
6. BUILD — Thread Runtime Persistence Foundation
7. BUILD — Opening Runtime Persistence Foundation
8. BUILD — Response Runtime Persistence Foundation
9. VALIDATION — Reflective Runtime Parity + Suppression/Calmness Gate v0

Rationale for this order:

- thread/opening/response canonical models must be explicit before composer hardening
- DTO convergence is required before broad read-switch expansion
- persistence transfer follows proven read-shape and lifecycle invariants

## 10. Drift and Safety Risks

| Risk | Failure mode | Mitigation |
| --- | --- | --- |
| latent cognition becomes authority | interpretive certainty leaks into user-facing outputs | enforce transformation boundary + uncertainty/evidence requirements |
| cognition bypasses reflective dialogue constraints | direct internal inference surfacing | require opening/continuity-hint mediation and grammar gates |
| hidden canonicalization in projections/adapters | temporary layer becomes de facto owner | explicit ownership matrix + retirement gates + caller audits |
| route/API ownership ambiguity | parallel write paths or implicit fallback truth | single-write-owner enforcement + route ownership contracts |
| workflow/task regression | reflective surfaces drift back to completion logic | grammar checks: invitation over obligation, calm pacing |
| summary/re-entry density drift | high-pressure continuity flooding | strict caps, demotion-before-expansion, silence legitimacy |
| glossary becomes symbolic dictionary | motif recurrence interpreted as fixed meaning | user-confirmed motif policy + non-authoritative phrasing |
| attention lenses become hard modes | route lock-in or forced filtering | keep lens as soft weighting with explicit user override |
| highlight precedence erosion | inference outranks user salience signals | salience precedence invariant in all ranking/surfacing |
| suppression authority drift | dismissed/deferred items reappear aggressively | suppression/cooldown states as hard gating inputs |

## 11. Open Owner-Level Decisions

1. Should cross-session reflective continuity stay deferred in alpha, or should a minimal canonical cross-session linkage be included now?
2. Should latent hypotheses ever be inspectable in alpha (even in constrained debug views), or remain transform-only into openings/continuity hints?
3. Should user-pinned glossary motifs be allowed to influence re-entry center selection in alpha, or remain secondary-only cues?
4. Should thread identity remain strictly session-scoped in alpha, or be designed now for future cross-dream continuity IDs?
5. What owner-approved saturation limits should cap concurrent resurfaced threads/openings per re-entry surface?

## 12. Non-Goals (Explicit)

- runtime code changes
- route/API behavior changes
- migrations or final SQL
- Supabase reset/provisioning actions
- ownership transfer execution
- B1/B2 read switch behavior changes
- contract rewrites of existing documents

## 13. Validation Notes

- Planning/documentation ticket only.
- Architecture aligned to compatibility, ownership, lifecycle, and grammar contracts listed in Inputs.
- Missing referenced source reported: `docs/plans/lumira-canonical-architecture-map-v0.md`.
