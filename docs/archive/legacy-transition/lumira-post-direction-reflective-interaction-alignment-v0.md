# Lumira Post-Direction Reflective Interaction Alignment v0

## Purpose

Align existing runtime/design documentation with clarified owner intent:

- explicit direction-choosing should not be the long-term core UX
- reflective runtime should carry continuity, pacing, and safety without workflow pressure
- direction semantics should transition toward soft attentional posture/lens behavior

This is an alignment and sequencing document only.  
No runtime behavior change is introduced by this ticket.

## Documentation Review Coverage

Broad scan was performed across `docs/design`, `docs/plans`, `docs/gpts`, and reflective audits, then narrowed into runtime-owner and interaction-model authorities.

Primary reviewed clusters:

- Reflective interaction and space shape:
  - `docs/design/lumira-reflective-interaction-grammar-v0.md`
  - `docs/design/Lumira_Reflective_Interaction_Model_v1.md`
  - `docs/design/Lumira_Reflective_Interaction_Model_v2.md`
  - `docs/design/lumira-reflective-space-ia-v0.md`
  - `docs/design/Lumira_Reflective_Composer_Model_v1.md`
- Runtime ownership and transition contracts:
  - `docs/plans/lumira-reflective-cognition-runtime-architecture-v0.md`
  - `docs/plans/lumira-reflective-runtime-compat-contract-v0.md`
  - `docs/plans/lumira-route-api-ownership-contract-pack-v0.md`
  - `docs/plans/lumira-reflective-space-layer-composition-map-v0.md`
  - `docs/plans/lumira-unified-reflective-space-rollout-plan-v0.md`
  - `docs/plans/lumira-reflective-implementation-roadmap-v0.md`
  - `docs/plans/lumira-reflective-implementation-governance-v0.md`
- Canonical reflective lifecycle/model contracts:
  - `docs/plans/lumira-reflective-thread-canonical-data-model-v0.md`
  - `docs/plans/lumira-reflective-opening-canonical-data-model-v0.md`
  - `docs/plans/lumira-reflective-thread-state-machine-v0.md`
  - `docs/plans/lumira-reflective-thread-transition-invariants-v0.md`
  - `docs/plans/lumira-reflective-opening-lifecycle-api-contract-v0.md`
  - `docs/plans/lumira-reflective-opening-generation-policy-v0.md`
  - `docs/plans/lumira-reflective-reentry-payload-contract-v0.md`
  - `docs/plans/lumira-reflective-projection-contract-pack-v0.md`
- Bridge reality and governance context:
  - `docs/audits/lumira-runtime-route-and-legacy-direction-inventory-v0.md`
  - `docs/audits/lumira-reflective-runtime-documentation-authority-review-v0.md`
  - `docs/gpts/Observation_Latent_Glossary_Work_Redesign_Handoff.md`
  - `docs/gpts/DB_Schema_Fix_&_Runtime_Stabilization_Handoff.md`
  - `docs/gpts/Multi-Assistant_Coordination_&_Operating_Model_Handoff.md`

## Part 1 - What the current direction system actually does

### Runtime responsibilities still carried by direction/workflow surfaces

| Responsibility | Current mechanism | Why it still matters now |
| --- | --- | --- |
| Workflow pacing and step boundary | `/session/[id]/(flow)/frame -> direction -> work` + `/api/work-block/next` | Keeps current flow legible in alpha runtime |
| Safety and tone gating | direction metadata (`ai_contract`, `group_tags`, mode hints) + stop rules | Prevents unsafe or overly forceful prompts |
| Attention steering | `direction_slug` + `selected_directions` (`session_directions`) | Provides orientational bias in work generation and read assemblies |
| Continuity anchoring | work cards + answers (`work_versions`, `work_latest`, `dream_answers`) | Acts as practical continuity substrate before full canonical thread/opening ownership |
| Generation governance | frame recommendations + direction catalog + method/style fields | Constrains generation shape and pacing |
| Stop/slow logic | gentle/low-novelty controls + defer behavior patterns | Limits escalation pressure |

### Workflow packaging artifacts (not long-term core responsibilities)

| Artifact | Why it is packaging, not core runtime truth |
| --- | --- |
| Mandatory-feeling direction selection step | Reflective docs consistently prefer optional entry into depth, not forced branching |
| Direction card as primary interaction unit | Card shape is a transitional container; thread/opening objects are the deeper continuity units |
| Funnel-like next-step framing | Conflicts with reflective grammar constraints (`silence legitimacy`, `invitation over insistence`) |
| Route-sequence identity (`frame -> direction -> work`) as product identity | Reflective Space docs define one workspace with posture variance, not route-driven identity |

## Part 2 - What the reflective runtime already replaces

The documented reflective runtime already supersedes core direction-workflow assumptions in model terms:

| Legacy emphasis | Reflective replacement already specified | Status |
| --- | --- | --- |
| Direction-first focus | `reflective_center` calmness-first center selection | Defined in re-entry/space contracts; bridge-active |
| Work card continuity | canonical `reflective_threads` identity + lifecycle + lineage | Canonical model defined; read bridge active |
| Prompt-as-task | `reflective_openings` invitation lifecycle with suppress/defer/dismiss gates | Canonical policy/lifecycle defined; read bridge active |
| Linear progression | layered reflective space (`foreground`, `ambient_continuity`, `neighborhood`) | Defined and partially bridged |
| Direction lock | `attention_lenses` soft weighting only | Explicitly defined in contracts and models |
| Forceful resurfacing | suppression/cooldown hard gating + density caps + omission preference | Explicit invariant set in lifecycle/re-entry/grammar docs |
| Route-centric re-entry | bounded Reflective Space payload across summary/re-entry surfaces | Implemented in guarded/shadow bridge path |

Net: the project already has a coherent post-direction runtime model in contracts; remaining gap is ownership cutover and route simplification, not conceptual definition.

## Part 3 - Hidden workflow-thinking still embedded

| Embedded assumption | Transitional necessity or contradiction | Notes |
| --- | --- | --- |
| Direction step as expected flow milestone | Transitional necessity | Still needed for current route/API ownership and persistence |
| Card-sequence mentality in work loop | Transitional necessity with risk | Supports current continuity but reinforces completion feel if over-foregrounded |
| Recommended directions as implicit "next task" | Future contradiction | Should become optional orientation/lens cues |
| Route-local orchestration blending generation + assembly | Transitional necessity | High-coupling areas (`/api/session-summary`, work route) should stay stable until reflective read-owner hardens |
| Density pressure through mixed summary payloads | Future contradiction | Reflective contracts require strict caps and demotion-before-expansion |
| Direction identity treated as mode lock | Future contradiction | Conflicts with soft lens semantics and user agency |

## Part 4 - Emerging target interaction shape (from existing docs)

The converging target is a single reflective space that is:

- dream-centered, not workflow-centered
- orientation-first, with optional deeper engagement
- continuity-aware but low-pressure
- non-authoritative in language and inference surfacing
- centered on one calm reflective center at a time
- layered (foreground vs ambient vs neighborhood) rather than flattened
- silence-legitimate (no obligation to continue)
- supportive of processing postures via soft lens weighting, not rigid branch identity

In this shape, "modes" can still exist, but as gentle attentional postures influencing emphasis, wording, and invitation style, not as hard route-level progression tracks.

## Part 5 - Transitional architecture guidance

### Keep during transition

- current canonical write owners:
  - `/api/session/ensure`
  - `/api/direction/select`
  - `/api/work-block/next`
  - `/api/work/answer`
- direction catalog and `session_directions` persistence as compatibility layer
- work/answer continuity substrate (`work_versions`, `work_latest`, `dream_answers`)
- guarded shadow/dry-run comparison infrastructure

### Gradually weaken

- explicit direction-step pressure as "required next action"
- route-first framing of reflective progression
- direction-card primacy as identity of reflective process
- dense, mixed summary assemblies that create continuity pressure

### Replace with reflective runtime structures (already specified)

- center/foreground selection -> reflective center policy
- work continuity selection -> thread lifecycle + re-entry composer assembly
- question-next-step logic -> opening lifecycle and calmness/suppression gates
- direction semantics -> lens weighting + interaction grammar style guidance
- flow progression pressure -> layered optionality and ambient continuity posture

### Sequencing guidance

1. Keep shadow/guarded parity work as primary safety lane.
2. Continue route-local guarded read-owner experiments only where no `NO_GO` classes exist.
3. Move direction semantics from workflow-driving to orientation metadata first.
4. Delay major route collapse/UI redesign until reflective read-owner behavior is stable in high-risk surfaces (`/api/session-summary`, `/session/[id]/summary`, work flow route).

## Part 6 - Owner-level conclusions

1. Is current direction system compatible with long-term Lumira vision?  
Partially. It is operationally useful now but conceptually over-structured for the long-term reflective target.

2. Which parts are fundamentally transitional?  
Direction-step gating, direction-card-as-primary-unit behavior, and route-sequenced flow identity.

3. Which parts survive as deeper runtime concepts?  
Safety gating, pacing restraint, optionality, and attentional biasing survive, but under reflective runtime policy/lens grammar rather than workflow branching.

4. Does current reflective runtime trajectory already support a post-direction future?  
Yes. Current contracts already define thread/opening/layered center-based behavior and lens soft-weighting semantics consistent with post-direction interaction.

5. What architectural risks exist if directions are removed too early?  
Loss of current continuity scaffolding, destabilized work generation/read parity, unresolved ownership ambiguity across work/summary routes, and increased drift risk in high-coupling surfaces.

6. What should the next major runtime phase focus on?  
Stabilize reflective read-owner behavior in guarded route-local experiments, then demote direction from workflow step to optional lens context while preserving current write-owner containment.

## Recommended Next-Phase Focus

Primary focus for the next major phase:

1. Direction-to-lens bridge execution plan (`keep writes, demote workflow pressure, preserve lineage`).
2. Guarded read-owner hardening on summary/re-entry/work high-risk surfaces with strict `NO_GO` triage.
3. Post-stabilization route simplification plan for unified reflective space UX (only after parity and rollback confidence).

## Non-goal confirmation

This ticket does not modify runtime code, routes, persistence, ownership, Supabase, or UI behavior.
