# Lumira Reflective Opening Lifecycle API Contract v0

## 1. Purpose

This contract defines canonical lifecycle semantics for reflective openings as runtime objects.

Why this is needed:

- openings coordinate cognition surfacing, thread continuity, and re-entry pacing
- without explicit lifecycle semantics, implementation can drift into pressure loops and unsafe resurfacing
- openings must be stable runtime entities, not ephemeral chatbot prompts

Required distinction:

- opening object: persistent lifecycle-tracked runtime entity
- surfaced invitation: temporary visible representation of an opening
- latent/internal candidate: non-user-visible precursor signal, not yet surfaced

## 2. Opening Runtime Philosophy

At runtime, an opening is a bounded reflective invitation linked to continuity context.

Core philosophy:

- openings are optional
- openings are non-authoritative
- openings preserve ambiguity
- openings preserve calmness through bounded surfacing
- silence is a valid runtime outcome

Lifecycle semantics must prevent:

- coercive progression
- urgency escalation
- overprompting

## 3. Canonical Opening Lifecycle States

Canonical states:

- `generated`
- `candidate`
- `surfaced`
- `engaged`
- `deferred`
- `revisited`
- `expired`
- `dismissed`
- `archived`

### State semantics table

| State | Meaning | Visibility | Persistence | Resurfacing eligibility | Cooldown behavior | Suppression behavior | Allowed transitions | Orchestration implications | Ownership semantics |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `generated` | internal model-produced opening draft | internal only | persisted or ephemeral per policy | no direct resurfacing | n/a | n/a | `candidate`, `expired` | generation stage output | system-owned |
| `candidate` | validated internal opening awaiting surfacing decision | internal/ambient | durable short-medium | yes if quality remains valid | pre-surface pacing gate applies | can be dropped before surfacing | `surfaced`, `expired`, `dismissed` | gating stage input | system-owned, user-not-yet-involved |
| `surfaced` | visible optional invitation | visible | durable | yes | visibility cooldown applies after interaction | suppression may apply via dismiss | `engaged`, `deferred`, `dismissed`, `expired` | surfacing stage active | shared; user response governs next state |
| `engaged` | user interacted (response/note/highlight link) | visible/contextual | durable | yes via revisit logic | no immediate resurfacing need | no suppression unless explicit action | `revisited`, `archived`, `deferred`, `dismissed` | continuity strengthening input | user action dominant |
| `deferred` | user indicates "not now" | low visibility | durable | yes, only post-cooldown + fresh context | mandatory defer cooldown | temporary suppression from foreground | `revisited`, `expired`, `dismissed`, `archived` | pacing/saturation demotion | user-owned pacing control |
| `revisited` | previously non-foreground opening reactivated with legitimacy | visible | durable | yes | revisit cooldown applies | may be suppressed again | `engaged`, `deferred`, `dismissed`, `expired`, `archived` | reactivation stage output | shared with user precedence |
| `expired` | opening stale in current context | hidden | durable historical | limited; only via contextual regeneration path | expires out of active queue | implicit non-surfacing | `archived` | lifecycle cleanup signal | system-managed |
| `dismissed` | explicit user suppression | suppressed | durable | no auto-resurface | strong suppression window | hard suppression until explicit restore | `archived`, `revisited` (manual restore only) | suppression guardrail state | user-owned |
| `archived` | historical lifecycle endpoint | historical | durable | none by default | n/a | remains non-active | none by default | retention/audit only | system + user historical ownership |

### State ownership rules

- system-owned states: `generated`, `candidate`
- shared states: `surfaced`, `engaged`, `revisited`
- user-governed suppression states: `deferred`, `dismissed`
- terminal historical state: `archived` (and `expired -> archived`)

## 4. Opening Object Model

Conceptual runtime object categories:

- `opening_id`
- `thread_reference`
- `source_signals`
- `opening_type`
- `confidence_posture`
- `surfaced_state`
- `lifecycle_state`
- `cooldown_metadata`
- `suppression_metadata`
- `continuity_lineage`
- `resurfacing_eligibility`
- `salience_relationship`
- `creation_context`
- `evidence_references`

Contract note:

- this is conceptual runtime/API contract structure
- it is not a storage schema or implementation payload definition

## 5. Opening Generation vs Surfacing

Generation and surfacing are separate lifecycle phases.

Generation stages:

- internal `generated` output
- internal `candidate` validation

Surfacing stages:

- `candidate -> surfaced` only after calmness/pacing/evidence gates
- `surfaced` can remain visible, be deferred/dismissed, or expire

Runtime visibility categories:

- internal/runtime-only: `generated`
- ambient/internal queue: `candidate`
- foreground invitation: `surfaced`/`revisited`
- suppressed: `deferred`/`dismissed`

Required outcomes:

- "not generated" is valid
- "generated but not surfaced" is valid
- "surfaced and ignored" is valid

## 6. Transition Trigger Semantics

Legitimate triggers:

- explicit user engagement
- explicit dismiss action
- explicit defer action
- explicit revisit action
- validated resurfacing evidence
- glossary recurrence with contextual support
- thread activation context change
- cooldown expiration
- saturation reduction
- contextual reactivation

Trigger legitimacy rules:

- transition must be evidence-backed or explicit user action
- user action has precedence over inferred signals
- stale or low-confidence recurrence cannot drive foreground escalation

Trigger precedence philosophy:

1. explicit user actions
2. suppression/cooldown constraints
3. center-linked continuity evidence
4. secondary recurrence signals

Prohibited trigger class:

- engagement-maximization transitions

## 7. Defer / Dismiss / Expire Semantics

Semantics must remain distinct:

- `deferred`: temporary "not now"
- `dismissed`: explicit suppression
- `expired`: context-stale lifecycle decay
- `archived`: historical end state

Behavior rules:

- dismiss is not a hidden retry queue
- defer is not unresolved obligation
- expire is not silent reactivation permission
- archive is not active resurfacing source

Restoration and resurfacing:

- `deferred` may re-enter via legitimate revisit conditions after cooldown
- `dismissed` requires explicit restore intent
- `expired` requires new contextual legitimacy, not repetition

## 8. Resurfacing Eligibility Rules

Eligibility constraints:

- requires fresh evidence or meaningful contextual reactivation
- must satisfy cooldown windows
- must pass saturation gates
- recurrence alone is insufficient without context relevance

Anti-spam invariants:

- repeated non-engagement lowers priority
- repeated resurfacing attempts without new evidence demote eligibility
- competition is bounded by foreground caps

Alignment rule:

- resurfacing behavior must satisfy thread transition invariants and suppression semantics

## 9. Relationship to Threads and Continuity

Attachment semantics:

- openings attach to thread centers when available
- unthreaded openings remain provisional and limited

Continuity influence boundaries:

- openings can influence thread salience only through legitimate engagement signals
- openings cannot force canonical thread identity changes
- opening lineage must remain traceable to thread continuity context

Ownership relationship:

- thread continuity remains primary structure
- opening lifecycle is subordinate invitation layer

## 10. Payload Visibility Layers

Visibility layers:

- internal/runtime-only
- ambient
- surfaced
- active foreground
- suppressed
- archived/historical

Visibility transition rules:

- internal -> ambient/surfaced only by policy gates
- surfaced -> suppressed/historical via user action or decay
- suppressed -> surfaced only through explicit/legitimate reactivation paths

Re-entry implications:

- re-entry payloads include only bounded foreground + constrained ambient items
- internal-only lifecycle states are excluded from direct user payloads

## 11. Opening Density and Saturation Rules

Concurrency and density bounds:

- foreground openings remain strictly capped
- only center-relevant openings are eligible for foreground
- secondary openings compete under calmness-first policy

Saturation behavior:

- high saturation raises surfacing threshold
- saturation demotes low-confidence candidates to ambient/internal
- repeated defer/dismiss reduces future surfacing aggressiveness

Hard prohibition:

- no chatbot conversational pressure behavior

## 12. Non-authoritative API Semantics

API/runtime semantics must preserve:

- ambiguity
- optionality
- uncertainty
- user ownership
- non-diagnostic behavior

Confidence posture rules:

- confidence is internal ranking posture
- confidence cannot be surfaced as certainty

Evidence-linked surfacing:

- surfaced openings require traceable evidence references
- uncertainty markers are required when evidence is partial

Explicit prohibition:

- lifecycle escalation from inferred emotional urgency

## 13. Compatibility / Adapter Behavior

Bridge-runtime opening behavior:

- adapter-composed openings may project from current canonical runtime artifacts
- projections are read/model compatibility only
- lifecycle ownership remains single-write-owner aligned

Constraints:

- projection-only adapters cannot mutate meaning semantics
- no hidden canonical stores created by compatibility layer
- fallback must prefer restraint/minimal surfacing over synthetic expansion

Compat alignment:

- follows `lumira-reflective-runtime-compat-contract-v0.md`
- preserves single-write-owner principle

## 14. Alpha Boundary

| Area | Classification | Alpha guidance |
| --- | --- | --- |
| opening sophistication | SIMPLIFY | keep core lifecycle states and bounded rules |
| contextual timing | SIMPLIFY | deterministic cooldown and evidence gates first |
| adaptive cooldowns | BRIDGE | basic policy windows, no deep personalization |
| multi-thread orchestration | DEFER | center-first, limited neighborhood influence |
| advanced resurfacing | SIMPLIFY | strict anti-spam and legitimacy checks |
| emotional-state adaptation | DEFER | avoid deep affective adaptation in alpha |
| cross-session opening persistence | BRIDGE | lightweight recurrence cues only |
| dynamic saturation models | DEFER | baseline saturation caps first |

Alpha-safe simplicity:

- prioritize clear, conservative lifecycle behavior over advanced adaptation.

## 15. Failure Modes / Anti-patterns

Prohibited failure patterns:

- chatbotification
- interrogation loops
- resurfacing spam
- hidden urgency escalation
- pseudo-therapy behavior
- perpetual unfinished-state pressure
- silent opening resurrection
- density explosion
- opening inflation
- hidden canonicalization
- engagement optimization logic

Warning indicators:

- opening volume increases while engagement declines
- resurfacing repeats without new evidence
- high defer/dismiss rates with unchanged surfacing behavior

Implementation cautions:

- do not conflate opening lifecycle with workflow progression
- do not allow ranking systems to become authority systems
- do not bypass suppression/cooldown logic in fallback paths

## 16. Runtime / Backend Implications

Guardrail implications:

- orchestration layers must separate generation, gating, surfacing, and suppression stages
- persistence contracts must preserve lifecycle lineage and suppression metadata
- payload builders must enforce visibility-layer constraints
- re-entry assembly must respect opening caps and suppression states
- reflective UI surfaces must consume bounded lifecycle outputs
- compatibility adapters must remain projection-only
- thread/opening APIs must preserve optionality and non-coercion
- runtime cutover plans must include lifecycle parity checks

This section defines constraints for implementation planning, not implementation design.

## 17. Recommended Follow-up Tickets

- `docs/plans/lumira-reflective-reentry-api-contract-v0.md`
- `PLAN - reflective runtime adapter slice planning`
- `PLAN - reflective payload normalization strategy v0`
- `PLAN - opening persistence planning`
- `PLAN - reflective orchestration slice planning`
- `PLAN - supabase rebuild sequencing slices for opening lifecycle parity`

## Explicit Non-goals

- no runtime code changes
- no route/endpoint implementation
- no SQL/schema/migrations
- no Supabase operations
