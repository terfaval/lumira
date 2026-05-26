# Lumira Reflective Opening Canonical Data Model v0

## Purpose

Define the canonical conceptual data model for `reflective_openings` so projected opening reads can later move safely into canonical lifecycle persistence without pressure loops, hidden ownership, or authority drift.

This ticket is planning-only. It does not implement schema, migrations, runtime logic, route/API changes, projection changes, or ownership transfer.

## Inputs

Used inputs:

- `docs/plans/lumira-reflective-cognition-runtime-architecture-v0.md`
- `docs/plans/lumira-reflective-thread-canonical-data-model-v0.md`
- `docs/plans/lumira-reflective-opening-lifecycle-api-contract-v0.md`
- `docs/plans/lumira-reflective-opening-generation-policy-v0.md`
- `docs/plans/lumira-reflective-thread-state-machine-v0.md`
- `docs/plans/lumira-reflective-thread-transition-invariants-v0.md`
- `docs/plans/lumira-reflective-runtime-compat-contract-v0.md`
- `docs/plans/lumira-route-api-ownership-contract-pack-v0.md`
- `docs/plans/lumira-reflective-projection-contract-pack-v0.md`
- `docs/plans/lumira-reflective-reentry-payload-contract-v0.md`
- `docs/plans/lumira-reflective-space-layer-composition-map-v0.md`
- `docs/gpts/Observation_Latent_Glossary_Work_Redesign_Handoff.md`
- `docs/design/lumira-reflective-data-model-bridge-v0.md`
- `docs/plans/lumira-reflective-schema-target-v0.md`
- `docs/architecture/lumira-canonical-architecture-map-v0.md`

Missing required inputs: none.

## 1. Opening Identity Model

### 1.1 What an opening is

A reflective opening is one lifecycle-tracked reflective invitation object, linked to continuity context, with optional user-visible phrasing. It is not just rendered text.

Opening identity is established by:

- lifecycle lineage continuity (generated/candidate/surfaced/etc. history)
- stable source/evidence provenance
- attachment context (thread, highlight, motif, entry, response) where applicable
- suppression/cooldown history tied to the same invitation object

### 1.2 Opening object vs displayed question text

- Opening object: canonical runtime entity with lifecycle, provenance, visibility, suppression, and audit.
- Displayed question text: one surface phrasing variant of an opening at a time.
- Multiple phrasing variants may correspond to the same opening identity.

### 1.3 Generated candidate vs surfaced invitation

- `generated`/`candidate`: internal lifecycle stages; may remain unsurfaced.
- `surfaced`/`revisited`: user-facing invitation posture.
- Surfacing is a gated transition, not identity creation.

### 1.4 Why openings are subordinate to thread continuity

- Thread continuity is the primary reflective structure.
- Openings are invitation-layer instruments attached to continuity context.
- Openings cannot force canonical thread identity or thread activation by themselves.

### 1.5 What does not create opening identity

- Single displayed prompt string alone.
- Surface location (summary/work/re-entry page).
- One latent or glossary signal without source lineage.
- Repeated regeneration phrasing without continuity lineage evidence.
- Projection id format alone.

## 2. Canonical Opening Fields (Conceptual)

Conceptual fields only, not SQL.

| Field | Meaning | Notes |
| --- | --- | --- |
| `opening_id` | canonical opening identity key | session-scoped in alpha |
| `session_id` | parent reflective session/space | required |
| `thread_id` (nullable) | linked canonical thread | optional in alpha, preferred when center exists |
| `lifecycle_state` | canonical opening lifecycle state | uses lifecycle contract vocabulary |
| `opening_type` | invitation class (`question|continuity_noticing|motif_resonance|scene_return|gentle_recall|reframe`) | exact enum can be refined later |
| `source_kind` | primary generation source (`work|frame|highlight|motif|response|continuity_signal|mixed`) | bridge-compatible |
| `source_references[]` | typed source refs (work/frame/entry/etc.) | deterministic provenance |
| `evidence_references[]` | evidence links supporting legitimacy | traceability requirement |
| `prompt_variants[]` | generated phrasing variants | internal/runtime-facing |
| `displayed_invitation_text` | current surfaced text variant | nullable if unsurfaced |
| `attachment_references[]` | typed attachment refs (`highlight|term|entry|response|thread|scene|note`) | subordinate context graph |
| `salience_references[]` | linked highlights/salience anchors + role | user salience precedence |
| `glossary_references[]` | linked motif terms/occurrences + role | advisory recurrence context |
| `confidence_posture` | internal posture (`low|medium|high` or equivalent) | never surfaced as certainty |
| `visibility_layer` | current visibility posture | see section 4 |
| `suppression_metadata` | defer/dismiss/suppress fields and reasons | user-governed binding inputs |
| `cooldown_metadata` | cooldown windows and counters | anti-spam and pacing |
| `resurfacing_metadata` | revisit eligibility, attempt history, freshness markers | bounded legitimacy gates |
| `timestamps` | `created_at`, `updated_at`, state timestamps, surfaced/engaged/deferred/dismissed/expired markers | chronology integrity |
| `audit_lineage` | transition actor/source, bridge provenance, invariant checks | rollback + auditability |

Field boundary rules:

- Raw latent payload internals are not canonical surfaced opening content.
- Confidence posture is orchestration input, not user-facing authority.
- Suppression/cooldown metadata is canonical and must not be duplicated with competing truth stores.

## 3. Lifecycle State Model

Canonical opening lifecycle states:

- `generated`
- `candidate`
- `surfaced`
- `engaged`
- `deferred`
- `revisited`
- `expired`
- `dismissed`
- `archived`

State posture summary:

- `generated`: internal draft output.
- `candidate`: validated internal invitation candidate.
- `surfaced`: visible optional invitation.
- `engaged`: user interaction occurred.
- `deferred`: user “not now”.
- `revisited`: legitimate reactivation after prior non-foreground state.
- `expired`: stale context decay.
- `dismissed`: explicit suppression.
- `archived`: historical endpoint.

### Alpha simplification posture

- Keep the full canonical state vocabulary in the conceptual model.
- Allow simplified operational policy first (strict evidence + deterministic cooldown baseline).
- Keep complete transition lineage even when some intermediate states are short-lived.

## 4. Surfacing and Visibility Model

Visibility layers:

- `internal/runtime-only`
- `ambient`
- `surfaced`
- `active_foreground`
- `suppressed`
- `archived/historical`

### Lifecycle-to-visibility interaction

- `generated` -> typically `internal/runtime-only`
- `candidate` -> typically `ambient` (internal queue)
- `surfaced` -> `surfaced` or `active_foreground` (bounded caps)
- `engaged` -> `surfaced` or contextual `active_foreground`
- `deferred`/`dismissed` -> `suppressed`
- `expired` -> `archived/historical` or hidden non-active
- `archived` -> `archived/historical`

Rules:

- Visibility and lifecycle are related but not identical dimensions.
- A state transition can occur without immediate foreground visibility promotion.
- Suppression state always outranks recency and novelty.
- Under uncertainty or saturation, omission is preferred over foreground surfacing.

## 5. Transition Authority

### 5.1 Canonical owner

Opening lifecycle mutation owner is the reflective opening runtime domain/service (future canonical owner). Projection/adapters/composer are read-shaping only.

### 5.2 Transitions requiring explicit user action

- `surfaced|engaged -> deferred`
- `surfaced|engaged|revisited -> dismissed`
- explicit restore/reactivation from dismissed suppression
- explicit engagement action leading to `engaged`

### 5.3 System-gated transitions

- `generated -> candidate` via internal validation gates
- `candidate -> surfaced` via evidence/salience/pacing/calmness gates
- `candidate|surfaced|deferred -> expired` via contextual staleness policy
- `deferred|expired -> revisited` only with cooldown satisfied + fresh contextual legitimacy
- `expired|dismissed -> archived` by lifecycle cleanup policy

### 5.4 Binding suppression/cooldown rules

- `dismissed` never auto-resurfaces.
- `deferred` requires cooldown expiration and fresh context.
- repeated non-engagement lowers resurfacing priority.
- repeated resurfacing without new evidence must demote eligibility.
- no duplicate suppression stores with competing truth.

## 6. Relationship Model

Canonical relationships:

- `reflective_threads`:
  - optional `thread_id` link; preferred when center exists.
  - opening cannot force thread activation or identity mutation.
- `dream_entries`:
  - entry-scene/span anchoring via attachment refs/evidence refs.
- `highlights`:
  - salience anchors influence priority; user-confirmed highlights outrank inferred signals.
- `glossary_terms` / motifs:
  - advisory recurrence linkage; cannot override dream evidence.
- `reflective_responses` (future) / `dream_answers` (bridge):
  - engagement and lineage linkage; response does not imply opening or thread closure.
- `observation/latent evidence refs`:
  - source evidence for legitimacy; latent remains internal and transformed.
- `attention_lenses`:
  - soft weighting context only; no hard mode lock.
- `re-entry payloads`:
  - openings are consumed as bounded foreground/ambient items; payloads are read-composed, non-owning.

## 7. Projection-to-Canonical Migration Model

Current projected identities include:

- `projected-opening:work:<work_version_id>`
- `projected-opening:frame:<frame_ref>`
- additional projection-derived ids if present in current adapters

### 7.1 Deterministic candidate mapping

- Canonical candidate mapping should be deterministic from `(session_id, projection_id, source_refs, prompt excerpt/signature)` lineage.
- Bridge provenance must be recorded in `audit_lineage`.
- Source/evidence references must preserve exact migration trace.

### 7.2 Migration constraints

- no hidden lifecycle mutation during mapping
- no implicit “surfaced” promotion from candidate-only projected posture
- deferred/dismissed projected suppression semantics must persist in canonical candidate
- no resurfacing of deferred/dismissed openings without legitimacy checks

### 7.3 Bridge compatibility and rollback

- keep frame/work prompt compatibility during bridge phase
- canonical opening adoption must remain rollbackable to projected reads
- rollback must preserve suppression/defer/cooldown history integrity

## 8. Alpha Persistence Boundary

### In scope for alpha

- session-scoped opening identity
- optional thread link
- lifecycle state
- visibility layer
- source/evidence refs
- prompt text and displayed invitation text
- suppression/defer/dismiss metadata
- cooldown metadata
- timestamps and audit lineage

### Deferred from alpha

- advanced adaptive cooldown algorithms
- cross-session opening persistence
- high-complexity resurfacing scoring
- automatic regeneration variant engines
- multi-thread opening orchestration

## 9. Safety Invariants

Must preserve:

- opening != task
- opening != interpretation
- surfaced question != obligation
- generated candidate may remain unsurfaced
- weak evidence prefers omission
- dismissed openings never auto-resurface
- deferred openings require cooldown and fresh context
- openings cannot force thread activation
- latent cognition cannot directly surface as certainty
- silence is valid

Additional invariant guardrails:

- no authority language escalation through lifecycle state changes
- no projection/composer canonical ownership drift
- no suppression bypass in fallback paths
- bounded opening density remains mandatory in re-entry and reflective surfaces

## 10. Future Schema Implications (Planning-Level Only)

Planning implications for later schema work:

- `reflective_openings` needs first-class lifecycle, visibility, suppression, cooldown, resurfacing, and audit lineage fields.
- attachment and source-trace structures are required to preserve deterministic provenance.
- opening-to-thread link should remain nullable but policy-preferred when continuity center exists.
- state and visibility should be modeled distinctly to avoid implicit pressure behavior.
- bridge provenance fields are required for safe migration from work/frame projections.

No SQL or migration definitions are part of this ticket.

## Open Owner-Level Questions

1. Should `generated` openings be durably persisted in alpha, or remain ephemeral unless promoted to `candidate`?
2. What owner-approved maximum foreground opening cap should be canonical for alpha across work/summary/re-entry contexts?
3. For `dismissed` openings, should manual restore be explicit user action only, or allow narrow owner-approved “restore from history” flow in alpha?
4. What minimum mandatory `source_trace` fields are required before an opening can transition `candidate -> surfaced`?
5. Should unthreaded openings be auto-expired after a bounded window if no valid thread attachment emerges?

## Explicit Non-Goals

- runtime implementation
- SQL/schema migration authoring
- Supabase changes
- route/API behavior changes
- projection behavior rewrites
- B1/B2 switch changes
- ownership transfer execution
- re-defining final thread model
- defining final response model in full detail
