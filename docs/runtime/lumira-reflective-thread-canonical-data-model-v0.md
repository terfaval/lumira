# Lumira Reflective Thread Canonical Data Model v0

## Purpose

Define the canonical conceptual data model for `reflective_threads` so reflective continuity can later move from projection/work-derived reads to canonical thread persistence without authority drift, identity inflation, or ownership ambiguity.

This ticket is planning-only. It does not define SQL, migrations, runtime implementation, or ownership transfer execution.

## Ticket Protocol Snapshot

### Restated Goal

- Define what a reflective thread canonically represents as one continuity trajectory.
- Define canonical thread conceptual fields, lifecycle, transition authority, and relationship model.
- Define safe projection-to-canonical mapping from `projected-thread:work:<work_version_id>` to canonical candidates.
- Define alpha persistence boundary and invariants that preserve non-authoritative reflective behavior.

### Touched Files

- Create: `docs/plans/lumira-reflective-thread-canonical-data-model-v0.md`

### Implementation Steps (Planning)

1. Extract identity/lifecycle/authority constraints from runtime and invariant contracts.
2. Define canonical thread identity and conceptual field model (no SQL).
3. Define transition authority and relationship boundaries.
4. Define projection-to-canonical migration contract and alpha boundary.
5. Record safety invariants, schema implications, and owner-level decisions.

### Acceptance Criteria (DoD)

- Thread identity rules defined.
- Canonical conceptual field model defined.
- Lifecycle state model aligned to state machine/invariants.
- Transition authority and suppression rules defined.
- Relationship model and bridge mappings defined.
- Projection-to-canonical migration model defined.
- Alpha persistence boundary and deferred scope defined.
- Safety invariants and schema implications defined.
- Owner-level open questions listed.

### Validation Plan

- Documentation consistency review against required inputs.
- `npm.cmd run typecheck`.

### Rollback Plan

- Documentation-only rollback: revert this file.
- No runtime/API/schema behavior change in this ticket.

## Inputs

Primary inputs used:

- `docs/plans/lumira-reflective-cognition-runtime-architecture-v0.md`
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

Missing required inputs: none.

## 1. Thread Identity Model

### 1.1 What a reflective thread is

A reflective thread is one continuity trajectory inside one session-scoped reflective space. Its identity is continuity-based and evidence-linked, not route-step or card-instance semantics.

Thread identity is established by:

- accepted Opening selection when a legitimate bounded invitation is chosen into thread reality
- continuity lineage coherence (source/evidence/salience lineage remains connected)
- center-of-gravity continuity over time (even if center expression shifts)
- stable attachment neighborhood (responses/openings/highlights/motifs remain coherently related)
- user-action history coherence (defer/dismiss/revisit actions refer to the same reflective line)

The first user-authored contribution does not constitute thread identity.
It begins reflective participation inside the already-real thread.

### 1.2 What does not create thread identity

The following are insufficient as standalone identity proof:

- single latent similarity signal
- glossary recurrence alone
- adjacency in neighborhood/re-entry payloads
- resurfacing event alone
- one new attachment event (highlight/opening/response) without lineage continuity
- route-level progression or latest work pointer changes

### 1.3 Alpha scope identity posture

- Canonical thread identity is session-scoped in alpha.
- No hard cross-session identity lock is canonical in alpha.
- Cross-session continuity remains advisory metadata only.

### 1.4 Future cross-session posture

Future model may add optional continuity-group identity (for cross-session linking), but not as alpha canonical truth. If introduced later, it must preserve:

- explicit lineage evidence
- auditability of group membership changes
- no retroactive identity collapse of historical session-local threads

### 1.5 Merge/split restrictions

Alpha restrictions:

- no automatic merge engine
- no automatic split engine
- no silent merge/split from projection or adapter layers

Future merge/split preconditions (post-alpha planning):

- strong multi-signal lineage evidence
- explicit audit lineage preserving both predecessor paths
- user-visible continuity history preserved

### 1.6 Adjacency vs identity equivalence

- Adjacency means relatedness in neighborhood or continuity resonance.
- Identity equivalence means same continuity trajectory.
- Adjacency may influence surfacing order, but cannot mutate canonical thread identity by itself.

## 2. Canonical Thread Fields (Conceptual Model)

This section defines conceptual runtime fields, not SQL columns.

| Field | Conceptual meaning | Notes |
| --- | --- | --- |
| `thread_id` | canonical thread identity key | stable within session scope |
| `session_id` | parent reflective session/space | required in alpha |
| `continuity_group_id` (future optional) | optional cross-session continuity grouping key | deferred in alpha |
| `lifecycle_state` | canonical thread state | uses state-machine contract |
| `origin_type` | first origin class (`highlight|motif|opening|response|manual|continuity_signal|work_bridge`) | `work_bridge` allowed during migration |
| `origin_ref` | typed reference to initial origin artifact | nullable for manually seeded threads |
| `source_references[]` | typed source lineage refs (work/frame/entry/etc.) | deterministic provenance chain |
| `evidence_references[]` | evidence refs supporting continuity legitimacy | preserves traceability |
| `salience_references[]` | highlight/salience anchor refs with role metadata | user-owned salience precedence |
| `glossary_attachments[]` | motif-term links with attachment role (`primary|secondary|related`) | recurrence is advisory |
| `opening_attachments[]` | linked opening ids + role/status relationship | openings do not own thread identity |
| `response_lineage[]` | ordered response refs and response-context relation | `response != closure` invariant |
| `lens_context` | soft lens/direction context applied or observed | weighting context only |
| `timestamps` | lifecycle times (`created_at`, `updated_at`, `last_activity_at`, state transition times) | transition-safe chronology |
| `suppression_metadata` | defer/dismiss/suppression posture (`deferred_at`, `defer_until`, `dismissed_at`, restore markers, reasons) | binding user pacing authority |
| `resurfacing_metadata` | resurfacing eligibility/cooldown and attempt history | bounded resurfacing behavior |
| `confidence_posture` | internal confidence posture for surfacing/ranking (`low|medium|high` or equivalent) | never user-facing certainty |
| `audit_lineage` | mutation/audit fields (actor, transition source, bridge provenance, invariant checks) | rollback and forensic trace support |

Field boundary rules:

- conceptual field model must support deterministic lineage reconstruction
- raw latent payload internals are not canonical thread identity fields
- ranking/weighting fields cannot be treated as identity truth

## 3. Lifecycle State Model

Canonical thread states (aligned to thread state machine):

- `emerging`
- `open`
- `active`
- `answered`
- `dormant`
- `resurfaced`
- `deferred`
- `archived`
- `dismissed`

### 3.1 State semantics (canonical posture)

- `emerging`: provisional continuity line, not yet stabilized.
- `open`: recognized reflective line available for engagement.
- `active`: current foreground continuity center.
- `answered`: meaningful reflective response exists; still re-openable.
- `dormant`: retained but backgrounded continuity.
- `resurfaced`: temporary foreground reactivation candidate.
- `deferred`: explicit user “not now”.
- `archived`: historical non-active continuity.
- `dismissed`: explicit suppression; no automatic resurfacing.

### 3.2 Alpha simplification posture

Alpha implementation guidance for persistence planning:

- keep full state vocabulary in conceptual model
- treat `emerging` and `resurfaced` as lightweight intermediate states with strict guards
- prioritize core stable operational states (`open|active|answered|deferred|dormant|dismissed`)
- retain full history/audit even when intermediate states are short-lived

## 4. Transition Authority

### 4.1 Canonical transition owner

Canonical thread state mutation owner is the Reflective Continuity Runtime domain/service (future canonical owner), not projection/adapter/composer layers.

Bridge phase rule:

- projections may read/shape state posture
- projections must not canonically mutate thread lifecycle state

### 4.2 User-action-required transitions

Must require explicit user action:

- any transition to `deferred`
- any transition to `dismissed`
- explicit restore from dismissed suppression
- explicit reopen from archived historical posture
- any direct user-chosen center activation action that promotes a line to `active`

### 4.3 System-suggested/system-driven transitions

May be system-driven under invariant gates:

- `emerging -> open` when continuity legitimacy threshold is met
- `open|active|answered -> dormant` via inactivity/saturation decay
- `dormant|answered -> resurfaced` when fresh evidence and cooldown rules pass
- `resurfaced -> active` only after explicit user engagement or equivalent valid pull signal

### 4.4 Resurfacing blockers and suppression authority

Blocking rules:

- `dismissed` blocks auto-resurfacing until explicit restore
- `deferred` blocks resurfacing until defer cooldown and fresh context evidence
- `archived` remains non-active unless explicit reopen semantics are satisfied

Preservation rule:

- defer/dismiss/suppression authority is user-owned and binding input to orchestration.

## 5. Relationship Model

### 5.1 Canonical relationships

- `dream_entries`:
  - thread references entry-based evidence anchors (direct or via highlights/openings/responses).
- `reflective_openings`:
  - one thread may have many openings; openings are invitation layer, subordinate to thread continuity identity.
- `reflective_responses` (future canonical) / `dream_answers` (bridge):
  - one thread may have many responses; responses contribute lineage but do not imply closure.
- `highlights`:
  - many-to-many role-based attachments; user-owned salience can elevate continuity weight but not force identity merge.
- `glossary_terms` / motif memory:
  - many-to-many advisory attachments; recurrence can support continuity but cannot prove identity alone.
- `attention_lenses`:
  - contextual weighting relation; lens context may affect ordering/surfacing, not identity equivalence.

### 5.2 Bridge relationships

- `work_versions` / `work_latest`:
  - bridge lineage sources for projected thread identity candidates.
  - cannot remain hidden canonical owner after thread owner transfer.
- `session_directions`:
  - bridge precursor for lens context.
- re-entry payloads:
  - read-composed derivative consumers of thread state and attachments; no canonical state ownership.

## 6. Projection-to-Canonical Migration Model

Source projected identity today:

- `projected-thread:work:<work_version_id>`

### 6.1 Deterministic candidate mapping contract

For alpha migration mapping:

- candidate canonical thread is derived per `(session_id, work_version_id)` lineage anchor
- migration must preserve source refs (`work_version`, optional `work_latest`, linked `dream_answers`, `session_directions`, highlight/glossary refs if explicit)
- each candidate receives explicit bridge provenance in `audit_lineage`

### 6.2 Migration safety rules

- no silent merge across distinct projected thread ids
- no silent split from one projected thread into multiple canonical threads without explicit split event record
- latent/glossary similarity is adjacency hint only, not identity equality
- resurfacing evidence cannot create new canonical identity by itself
- mapping must be reproducible and deterministic from same source snapshot

### 6.3 Bridge compatibility and rollback

- work runtime remains compatibility source during bridge phase
- canonical thread writes do not invalidate fallback read path until parity gate passes
- rollback path must allow reversion to projected/read compatibility with preserved lineage

## 7. Alpha Persistence Boundary

### 7.1 In-scope for alpha canonical thread persistence

- session-scoped thread identity
- lifecycle state
- origin/source lineage references
- response references/lineage
- opening references
- salience and glossary attachments (role-based)
- suppression/defer/dismiss metadata
- resurfacing/cooldown metadata (bounded)
- timestamps and audit lineage

### 7.2 Deferred from alpha canonical persistence

- cross-session canonical merge graph
- advanced latent-continuity scoring persistence as canonical truth
- automatic merge/split engine
- multi-center orchestration persistence
- high-complexity global continuity graph operations

## 8. Safety Invariants

The canonical thread model must preserve:

- `thread != task`
- `thread != interpretation bucket`
- `response != closure`
- `recurrence != truth`
- `adjacency != identity`
- `latent confidence != user-visible certainty`
- dismissed threads never auto-resurface
- defer cooldown is mandatory
- silence is valid behavior

Additional runtime-safety invariants:

- no hidden canonicalization in projection/adapter/composer layers
- single-write-owner remains mandatory
- no route-local ownership drift
- user salience precedence outranks inference-only weighting

## 9. Future Schema Implications (Planning-Level Only)

Implications for later schema ticketing (no SQL here):

- `reflective_threads` requires durable identity, lifecycle, suppression, resurfacing, and audit fields.
- relationship surfaces are likely needed for thread-to-highlight and thread-to-glossary term roles.
- lineage-safe references are required for bridge provenance from `work_*`, `dream_answers`, and `session_directions`.
- transition/audit traces are required for rollbackability and invariant verification.
- optional future cross-session continuity-group fields should remain nullable/deferred in alpha.

This document intentionally does not define:

- final SQL schema
- migration files
- route/API contracts
- runtime implementation details

## Open Owner-Level Questions

1. Should alpha persist `emerging` and `resurfaced` as first-class stored states, or treat them as ephemeral transition postures with persisted transition logs only?
2. Should explicit user-created manual threads be permitted in alpha, or deferred until post-owner-transfer UX stabilization?
3. When cross-session identity is deferred, what minimum continuity-group placeholder metadata should be stored now to prevent migration ambiguity later?
4. Should thread-level suppression reasons be standardized to a small owner-approved taxonomy in alpha, or remain freeform metadata initially?

## Explicit Non-Goals

- implementing runtime code
- creating SQL
- creating migrations
- modifying Supabase
- changing routes/APIs
- altering current projections
- altering B1/B2 read switches
- transferring ownership
- defining opening/response final data models in full detail
