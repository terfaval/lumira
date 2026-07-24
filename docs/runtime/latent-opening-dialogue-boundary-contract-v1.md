# Latent -> Opening -> Dialogue Boundary Contract v1

Date: 2026-05-31  
Type: PLAN / ARCHITECTURE / CONTRACTS  
Status: Draft (contract-only; no runtime/schema changes)

## Purpose

Define the first explicit, versioned boundary contract for the implemented reflective chain:

```txt
Observation -> Latent -> Opening -> Dialogue -> Response
```

This contract clarifies:
- ownership
- responsibilities
- transport boundaries
- user-facing primitives
- internal-only structures
- extension seams

This document does not introduce a new runtime layer.

## Scope and Non-Goals

In scope:
- boundary semantics and handoff rules
- visibility and transport constraints
- explicit allowed/forbidden cross-boundary payload classes

Out of scope:
- latent redesign
- opening/dialogue runtime redesign
- schema migrations
- API implementation changes
- symbolic interpretation features

## Source Basis

Canonical:
- `docs/canon/LUMIRA-CONSTITUTION-v1.md`
- `docs/canon/LUMIRA-MINIMAL-REFLECTIVE-RUNTIME-v1.md`
- `docs/canon/Observation_Latent_Glossary_Work_Redesign_Handoff.md`

Runtime:
- `docs/runtime/latent-governance-primitives-v1.md`
- `docs/runtime/latent-processing-modes-and-architecture-clarifications-v1.md`
- `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`

Recent audits used as current-state evidence:
- `docs/superpowers/audits/2026-05-26-latent-governance-build-review-v1.md`
- `docs/superpowers/audits/2026-05-26-latent-architecture-audit-v1.md`
- `docs/superpowers/audits/2026-05-26-reflective-space-experiential-convergence-audit-v1.md`

Note:
- Requested audit labels "latent governance final recheck", "processing-mode orchestration final recheck", and "latent -> opening -> dialogue audit" are treated here as equivalent to the latest available audits above plus current runtime/route contracts.

---

## Section A - Chain Definition

## A.1 Canonical reflective chain

```txt
Observation -> Latent -> Opening -> Dialogue -> Response
```

## A.2 Chain Responsibility Map

| Stage | Purpose | Ownership | Persistence | User visibility | Internal visibility |
|---|---|---|---|---|---|
| Observation | descriptive, evidence-linked orientation substrate | Observation domain + semantic policy ingress | durable (`observations`, `observation_fragments`) | visible as descriptive material | fully visible to cognition/runtime |
| Latent | internal reflective organization (continuity, salience, uncertainty, center selection) | Latent cognition engine + latent repository | durable (`latent_snapshots`, `latent_signals`, `latent_suggestions`, lifecycle payload) | bounded transport projection only | full internal payload |
| Opening | optional bounded invitation institution | Openings cognition + openings repository | durable (`openings`, suppressions/events) | visible as invitation surfaces | implementation lifecycle detail + provenance |
| Dialogue | bounded reflective read model from opening activation lineage | Reflective-space composition + response/opening repos | derived view; source-of-truth is activation/association/response persistence | visible as bounded dialogue traces | composition internals visible server-side |
| Response | user-authored reflective artifact | Responses domain + response repository | durable (`reflective_responses`, associations, opening bridge tables) | visible user-authored text | full state/association metadata |

---

## Section B - Latent Contract

## B.1 What latent is

Latent is an internal reflective organization layer that may:
- estimate reflective gravity
- detect continuity/recurrence possibilities
- compute uncertainty-aware center candidates
- prioritize optional reflective directions
- maintain bounded lifecycle memory for orchestration

## B.2 What latent is not

Latent is not:
- a user-facing dialogue engine
- a symbolic truth or meaning authority
- a therapist/diagnostic layer
- a final-interpretation generator

## B.3 Allowed outbound primitives (latent -> opening/runtime consumers)

Allowed outbound classes:
- optional signal (`*_possibility`)
- optional suggestion (`possible_*`)
- bounded confidence posture (`low|tentative|moderate`)
- bounded lifecycle state (`centerState`, `noCenterReason`) in safe projection
- provenance lineage references

## B.4 Forbidden outbound primitives

Forbidden outbound classes:
- definitive meaning claims
- psychological/therapeutic judgments
- identity/fate claims
- symbolic truth statements
- raw internal orchestration internals in default public transport (score vectors, rationale traces, candidate rankings, internal uncertainty internals)

## B.5 Latent boundary rule

Raw latent cognition may cross into downstream systems only through explicit projection/transform boundaries; never as direct user-facing authority text.

Deliverable:
`Latent Boundary Contract` complete.

---

## Section C - Opening Contract

## C.1 What opening is

Opening is the first user-facing reflective primitive:
- an optional reflective invitation object
- user-agency-governed (accept/select, suppress, dismiss, reactivate)

Constitutionally, Opening has only two primary postures:
- silence
- invitation exists

Opening is not merely a question string.

## C.2 Lifecycle and agency

Minimum lifecycle/agency expectations:
- creation from bounded latent suggestion transformations
- cadence gating (cooldown/repetition/suppression overlap controls)
- explicit acceptance/selection boundary
- suppression and silence legitimacy
- optional response authorship (not mandatory)

Terminal constitutional outcomes:
- accepted
- dismissed

Additional runtime states may exist for implementation purposes, but they are not constitutional institutions.

## C.3 Ownership and transport

- Ownership: openings domain + repository + opening routes
- Opening text is transformed suggestion phrasing, not raw latent claim
- Opening transport may include provenance and state, but not latent internal authority structures

Deliverable:
`Opening Contract` complete.

---

## Section D - Dialogue Contract

## D.1 What dialogue is

Dialogue is a bounded reflective read model composed from:
- opening acceptance/selection events
- opening state/provenance
- optional associated response artifacts

Dialogue is not a canonical persistent chat entity in v1.

## D.2 Ownership and lifecycle posture

- Ownership: reflective-space composition layer (read-model owner)
- Source persistence owner: opening-activation and response/association domains
- Lifecycle: bounded-window retrieval and lineage composition, not autonomous dialogue-state machine

## D.3 Retention expectations

- Retention depends on source persistence (activation events, responses, openings)
- Dialogue traces remain reconstructible from persisted lineage
- Windowing/caps/omission rules govern surfacing density

Deliverable:
`Dialogue Contract` complete.

---

## Section E - Response Contract

## E.1 What response is

Response is a user-authored reflective artifact.

## E.2 Independence and continuity role

Responses can exist:
- without openings
- without dialogue traces
- without thread linkage

Responses may later contribute to:
- opening lineage when explicitly associated
- continuity/thread context when explicitly associated
- future reflective revisitation surfaces

## E.3 Ownership

- Ownership: responses domain and repository
- AI may not author authoritative response meaning on behalf of user

Deliverable:
`Response Contract` complete.

---

## Section F - User-Facing Primitive Contract

## F.1 First user-facing reflective primitive

In v1 chain semantics, first reflective interaction primitive is:

`Opening`

Reason:
- latent is internal cognition/orchestration
- opening is the first transformed invitation object explicitly designed for user-facing reflective language

Thread boundary:
- Thread becomes constitutionally real when an Opening is accepted/selected.
- The first user-authored response begins reflective participation inside that thread.

## F.2 Why latent is not user-facing

Latent contains internal uncertainty-bearing hypotheses and orchestration internals that are not safe as direct reflective language authority.

## F.3 Safe reflective primitives

Safe classes:
- optional invitation
- bounded continuity hint
- reflective option
- calm, non-coercive opening phrasing

## F.4 Unsafe primitives

Unsafe classes:
- diagnosis
- interpretive verdict
- hidden certainty claims
- raw latent internals (scores, rationale traces, ranking internals)

Deliverable:
`User-Facing Primitive Contract` complete.

---

## Section G - Reflective Style Contract

## G.1 Style semantics in v1

Style in this chain is the controlled relationship between:
- internal latent `processingMode`
- opening `openingType`
- opening `tone`
- dialogue trace phrasing behavior

## G.2 Ownership and boundary

- `processingMode` is an internal orchestration primitive.
- It may influence invitation shaping indirectly.
- It must not be surfaced as authoritative user-facing style diagnosis/label by default transport.

## G.3 Transport rule

- Public payloads may expose transformed invitation characteristics (`openingType`, `tone`, utterance).
- Public payloads should not expose raw style-selection internals (candidate mode rankings, rationale traces, internal confidence vectors) by default.

## G.4 Extensibility seam

Future style expansion should:
- extend projection/transformation contracts
- preserve internal/external separation
- keep user-facing language optional, non-authoritative, and ambiguity-safe

Deliverable:
`Reflective Style Contract` complete.

---

## Section H - Boundary Adapter Recommendation

## H.1 Decision

A lightweight adapter is recommended.  
No new runtime layer is recommended.

## H.2 Minimal adapter targets

1. `Latent -> Opening` projection adapter contract
- role: explicit mapping of allowed latent primitives into opening candidate inputs
- guarantees:
  - strips/omits internal-only latent orchestration internals
  - enforces non-authoritative language guardrails
  - binds explicit provenance and confidence posture

2. `Opening -> Dialogue` lineage adapter contract
- role: explicit mapping from activation + association persistence into dialogue trace entries
- guarantees:
  - stable lineage identity fields
  - bounded contextual joins (object/thread IDs)
  - clear treatment of activation-without-response

## H.3 Why adapter is sufficient

Current runtime already has the chain implemented.  
Gap is explicit boundary governance, not missing orchestration stage.

Deliverable:
`Boundary Adapter Recommendation` complete.

---

## Section I - Future Dialogue Architecture Readiness

## I.1 Already solved in current architecture

- Observation descriptive boundary and semantic guardrails
- Latent internal orchestration boundary with public-safe projection defaults
- Opening invitation behavior and suppression/cadence controls
- Opening-response bridge persistence and activation lineage
- Bounded dialogue read-model composition pattern

## I.2 Unsolved or partially solved

- explicit versioned boundary contracts across all handoffs (formalized by this doc, pending implementation adoption)
- repository-wide authority normalization so historical runtime vocabulary does not outrank the simplified constitutional Opening model
- stronger formal adapter interfaces for boundary enforcement reuse

## I.3 What future dialogue work should build on

Future dialogue preparation architecture should build on:
- this boundary contract as base governance
- existing activation/association lineage model
- strict internal-vs-user-facing transport separation
- silence legitimacy and non-coercive pacing invariants

No dedicated Dialogue Preparation runtime is justified until these contract boundaries are fully adopted and tested as the governing seam.

Deliverable:
`Dialogue Readiness Notes` complete.

---

## Final Principle

This boundary contract is successful when contributors can answer, without reading implementation code:
- what may cross each boundary
- what may never cross each boundary
- who owns each responsibility
