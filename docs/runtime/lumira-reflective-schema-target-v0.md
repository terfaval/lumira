# Lumira Reflective Schema Target v0

## Purpose

Define a table-level target schema direction for Lumira Reflective Space that translates conceptual architecture into persistence structure without changing runtime, migrations, or Supabase schema in this ticket.

## Design Inputs

- `docs/design/Lumira_Reflective_Interaction_Model_v2.md`
- `docs/design/Lumira_Reflective_Composer_Model_v1.md`
- `docs/design/lumira-reflective-payload-architecture-v0.md`
- `docs/design/lumira-reflective-space-ia-v0.md`
- `docs/design/lumira-reflective-thread-model-v0.md`
- `docs/design/lumira-reflective-data-model-bridge-v0.md`
- `docs/gpts/Observation_Latent_Glossary_Work_Redesign_Handoff.md`
- `docs/audits/alpha-runtime-truth-matrix.md`

## Schema Design Principles

- Keep `dream_entries` canonical as the raw dream truth.
- Model reflective continuity as thread-centered, not card/workflow-centered.
- Separate user-facing reflective entities from internal orchestration payloads.
- Keep non-interpretive external contract while allowing internal probabilistic latent modeling.
- Use explicit lifecycle state fields for reflective objects (thread/opening/highlight/response/lens).
- Keep source-trace/evidence metadata durable for debuggability and trust.
- Preserve alpha runtime compatibility through additive, staged schema evolution.
- Prefer relational identity + state for durable reflective entities; keep generated context in JSON payload fields.

## Target Entity Overview

| Entity | Target persistence shape | Owner boundary | Visibility |
| --- | --- | --- | --- |
| Dream Space | relational root (`dream_spaces` or evolved `dream_sessions`) | user-owned | visible |
| Dream Entry | relational canonical text row | user-owned | visible |
| Reflective Thread | relational identity + state + timestamps | user-owned with AI suggestions | visible |
| Reflective Opening | relational row + payload + state | AI-generated, user-governed state | visible |
| Reflective Response | relational content + attachments | user-owned | visible |
| Reflective Note | relational content + local context | user-owned | visible |
| Highlight | relational anchor + provenance + state | user-owned confirmation | visible |
| Glossary Term | relational motif memory | user-owned confirmation | visible |
| Glossary Occurrence | relational recurrence event | system-generated, user-inspectable | visible/ambient |
| Attention Lens | relational selection + event history | user-selected / AI-suggested | partially visible |
| Continuity Signal | relational optional + payload | system-generated | ambient/peripheral |
| Orientation Payload | versions/latest pattern + JSON payload | system-generated | visible |
| Observation Payload | versions/latest pattern + JSON payload | internal system | internal/indirect |
| Latent Payload | versions/latest pattern + JSON payload | internal system | internal only |

## Proposed Target Tables

Required analysis matrix for proposed target tables:

| Target table | Purpose | Visibility | Owner scope | Core columns | Key relationships | State fields | JSON payload fields | Current table mapping | Migration strategy | Alpha compatibility concern |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dream_spaces` (concept) / `dream_sessions` (runtime) | Reflective workspace root | User-visible | `user_id` + session ownership | `id,user_id,status,title,created_at,updated_at` | parent of entries/threads/openings/highlights/orientation | `status` | optional focus metadata | `dream_sessions` | RETAIN (semantic EXTEND) | Do not rename table during alpha |
| `dream_entries` | Canonical dream text substrate | User-visible | `user_id`,`session_id` | `id,session_id,user_id,kind,content,created_at` | child of session; parent for span highlights | none (or `kind`) | optional metadata later | `dream_entries` | RETAIN | Must remain canonical source |
| `reflective_threads` | Continuity trajectory identity | User-visible | `user_id`,`session_id` | `id,session_id,user_id,state,origin_type,origin_ref_id,last_activity_at` | links to openings/responses/highlights/terms | canonical: `emerging,open,active,answered,dormant,resurfaced,deferred,archived,dismissed`; alpha operational subset may be narrower | `center_payload` | `work_versions`,`work_latest`,`dream_answers`,`session_directions` (implicit) | REPLACE (bridged from work tables) | Keep session-scoped first; cross-dream later |
| `reflective_openings` | AI invitation lifecycle object | User-visible | `user_id`,`session_id`, optional `thread_id` | `id,session_id,user_id,thread_id,state,opening_type,content,created_at` | belongs to thread/space, attaches to highlight/term/entry | canonical: `generated,candidate,surfaced,engaged,deferred,revisited,expired,dismissed,archived`; alpha operational subset may be narrower | `payload`,`source_trace` | `frame_versions.payload`,`work_versions.payload`,`dream_session_highlights` suggestions | BRIDGE -> REPLACE | Must remain optional, non-mandatory |
| `reflective_responses` | Durable reflective writing | User-visible | `user_id`,`session_id`, optional `thread_id/opening_id` | `id,session_id,user_id,thread_id,opening_id,state,content,created_at,updated_at` | belongs to thread/opening; attachment joins | `draft,saved,submitted,revisited,archived` | `payload` | `dream_answers` | BRIDGE -> REPLACE | Preserve current answer flow until cutover |
| `reflective_notes` | Lightweight contextual reflection | User-visible | `user_id`,`session_id` | `id,session_id,user_id,state,note_kind,content,created_at,updated_at` | attachable to highlight/thread/term/opening | `active,archived,dismissed` | `payload` | `dream_entry_highlights.note`,`glossary_notes` | BRIDGE -> REPLACE | Do not break existing highlight/glossary notes |
| `highlights` (unified target) | User-owned salience anchor | User-visible | `user_id`,`session_id`, optional `entry_id` | `id,session_id,user_id,entry_id,state,provenance,anchor_type,text,category` | links to notes, terms, threads, openings | `suggested,active,pinned,dismissed,archived` | `source_ref` | `dream_entry_highlights`,`dream_session_highlights`,`dream_session_rejected_suggestions` | BRIDGE -> REPLACE | Preserve split-table behavior during alpha |
| `glossary_terms` (target shape) | Personal motif memory node | User-visible | `user_id` | `id,user_id,state,canonical,canonical_key,display_label,category` | parent of occurrences; join to threads | `candidate,pinned,suppressed,archived` | `payload` | `glossary_terms`,`term_candidates` (candidate funnel) | EXTEND | Keep user-confirmed, non-authoritative semantics |
| `glossary_occurrences` (target shape) | Recurrence trace per motif context | User-visible/ambient | `user_id`,`term_id`,`session_id` | `id,term_id,session_id,user_id,source,created_at` | child of term; optional highlight/thread refs | none | `evidence_payload` | `glossary_occurrences`,`glossary_occurrence_events` | EXTEND | Keep recurrence as cue, not forced meaning |
| `attention_lenses` | Current lens state | Partially visible | `user_id`,`session_id` | `id,session_id,user_id,lens_key,state,created_at,updated_at` | parent to lens events; relates to thread surfacing | `active,inactive,expired,dismissed` | `weight_payload` | `session_directions` | BRIDGE -> REPLACE | Must be soft weighting, not lock mode |
| `attention_lens_events` | Lens history/event log | Internal + inspectable | `user_id`,`session_id`,`lens_id` | `id,lens_id,session_id,user_id,event_type,created_at` | child of attention_lenses | event-state transitions | `payload` | `session_directions` (historical intent) | EXTEND (new) | Enables replay/audit without forcing UX |
| `continuity_signals` | Persisted ambient continuity cues | Peripheral | `user_id`,`session_id` + optional refs | `id,session_id,user_id,signal_type,state,strength,created_at,updated_at` | optional refs to thread/term/highlight | `active,background,suppressed` | `payload` | derived from latent/index/anchor/glossary | EXTEND (new optional table) | Can stay derived-first if needed |
| `orientation_versions` / `orientation_latest` | Unified orientation payload/pointer | User-visible (secondary) | `user_id`,`session_id` | versions: `id,session_id,user_id,version,input_hash,created_at`; latest: `session_id,user_id,orientation_version_id,updated_at` | session-level orientation root | none | `payload`,`source_trace` | `frame_versions/latest` + `session_index_versions/latest` | BRIDGE -> REPLACE | Keep existing frame/index reads until proven |
| `observation_versions` / `observation_latest` | Internal descriptive extraction substrate | Internal/indirect | `user_id`,`session_id` | existing version/latest pointer columns | feeds latent/index/orientation/openings | none | `payload` | same-name current tables | RETAIN | Never surface raw observation directly |
| `latent_versions` / `latent_latest` | Internal probabilistic cognition substrate | Internal only | `user_id`,`session_id` | existing version/latest pointer columns | feeds openings/lenses/continuity signals | none | `payload` | same-name current tables | RETAIN | Never expose raw latent as truth |

### dream_spaces / dream_sessions

Target direction:

- Keep `dream_sessions` as alpha-compatible root.
- Long-term conceptual alias: `dream_spaces`.
- No rename in this phase; treat as semantic evolution.

Key fields (target shape):

- `id`, `user_id`, `status`, `title`, `created_at`, `updated_at`
- optional future fields: `active_thread_id`, `last_reflective_focus_at`

Relationships:

- 1:N to `dream_entries`
- 1:N to `reflective_threads`
- 1:N to `reflective_openings`
- 1:N to `highlights`
- 1:N to `orientation_versions`

### dream_entries

Key fields (current-compatible + target intent):

- `id`, `session_id`, `user_id`, `kind`, `content`, `created_at`
- optional future fields: `entry_version`, `is_canonical_snapshot`

Relationships:

- belongs to `dream_spaces/dream_sessions`
- 1:N to `highlights`
- referenced by attachment tables

### reflective_threads

Purpose:

- First-class continuity object replacing implicit work-card continuity.

Key fields (target):

- `id`, `session_id`, `user_id`
- `state` (canonical vocabulary: `emerging|open|active|answered|dormant|resurfaced|deferred|archived|dismissed`)
- `origin_type` (`highlight|motif|opening|response|manual|continuity_signal`)
- `origin_ref_id` (nullable)
- `center_payload` (jsonb)
- `weight` (numeric/float)
- `last_activity_at`, `created_at`, `updated_at`

Relationships:

- 1:N to `reflective_openings`
- 1:N to `reflective_responses`
- N:M to highlights/glossary terms via join tables

### reflective_openings

Purpose:

- Persist AI reflective invitations as lifecycle-managed entities.

Key fields (target):

- `id`, `session_id`, `user_id`, `thread_id` (nullable)
- `state` (canonical vocabulary: `generated|candidate|surfaced|engaged|deferred|revisited|expired|dismissed|archived`)
- `opening_type` (`question|tension|continuity_hint|motif_hint|reframe`)
- `content`
- `payload` (jsonb)
- `source_trace` (jsonb)
- `created_at`, `updated_at`, `engaged_at` (nullable), `dismissed_at` (nullable)

### reflective_responses

Purpose:

- Durable user reflective writing, thread-attached by default.

Key fields (target):

- `id`, `session_id`, `user_id`, `thread_id` (nullable), `opening_id` (nullable)
- `state` (`draft|saved|submitted|revisited|archived`)
- `content`
- `payload` (jsonb, optional structure/format metadata)
- `created_at`, `updated_at`

Compatibility note:

- Bridge from `dream_answers` during transition.

### reflective_notes

Purpose:

- Lightweight local reflective notes separate from long responses.

Key fields (target):

- `id`, `session_id`, `user_id`
- `state` (`active|archived|dismissed`)
- `content`
- `note_kind` (`inline|motif|thread_context|highlight_context`)
- `payload` (jsonb)
- `created_at`, `updated_at`

### highlights

Purpose:

- Unified highlight model replacing split entry/session highlight behavior over time.

Key fields (target):

- `id`, `session_id`, `user_id`, `entry_id` (nullable)
- `state` (`suggested|active|pinned|dismissed|archived`)
- `provenance` (`user|ai_suggested|import`)
- `anchor_type` (`entry_span|session_motif|scene_anchor`)
- `start_offset` (nullable), `end_offset` (nullable), `text`, `category`
- `note` (nullable)
- `source_ref` (jsonb)
- `created_at`, `updated_at`

### glossary_terms

Purpose:

- Personal motif memory with user-controlled promotion/suppression.

Key fields (target-compatible extension):

- `id`, `user_id`
- `state` (`candidate|pinned|suppressed|archived`)
- `canonical`, `canonical_key`, `display_label`
- `category`
- `recurrence_score` (nullable/computed cache)
- `do_not_surface` (boolean)
- `payload` (jsonb)
- `created_at`, `updated_at`

### glossary_occurrences

Purpose:

- Durable recurrence trace of motif appearances.

Key fields (target-compatible extension):

- `id` (or composite key strategy), `term_id`, `session_id`, `user_id`
- optional attachment refs: `highlight_id` (nullable), `thread_id` (nullable)
- `source` (`observation|highlight|user_note|import`)
- `evidence_payload` (jsonb)
- `created_at`

### attention_lenses / attention_lens_events

Purpose:

- Persist soft weighting/focus choices separately from thread content.

`attention_lenses` key fields:

- `id`, `session_id`, `user_id`
- `lens_key` (or direction slug compatibility)
- `state` (`active|inactive|expired|dismissed`)
- `weight_payload` (jsonb)
- `created_at`, `updated_at`

`attention_lens_events` key fields:

- `id`, `lens_id`, `session_id`, `user_id`
- `event_type` (`selected|reweighted|expired|dismissed|reactivated`)
- `payload` (jsonb)
- `created_at`

### continuity_signals

Purpose:

- Persist surfaced continuity cues when needed for control/querying.

Key fields (target):

- `id`, `session_id`, `user_id`, `thread_id` (nullable), `term_id` (nullable), `highlight_id` (nullable)
- `signal_type` (`recurrence|unresolved|revisited|density|dormant_reactivation`)
- `state` (`active|background|suppressed`)
- `strength` (numeric/float)
- `payload` (jsonb)
- `created_at`, `updated_at`

### orientation_versions / orientation_latest

Purpose:

- Unified orientation payload store (can absorb frame/index composition over time).

`orientation_versions` key fields:

- `id`, `session_id`, `user_id`
- `version`, `input_hash`, `payload` (jsonb), `source_trace` (jsonb)
- `created_at`

`orientation_latest` key fields:

- `session_id`, `user_id`, `orientation_version_id`, `updated_at`

Compatibility note:

- Transitional mapping from `frame_versions/latest` and `session_index_versions/latest`.

### observation_versions / observation_latest

Purpose:

- Retain internal descriptive extraction history and pointer semantics.

Key fields (existing-compatible):

- versions: `id`, `session_id`, `user_id`, `version`, `input_hash`, `model`, `payload`, `created_at`
- latest: `session_id`, `user_id`, pointer fields, `updated_at`

### latent_versions / latent_latest

Purpose:

- Retain internal probabilistic reflective cognition history and pointer semantics.

Key fields (existing-compatible):

- versions: `id`, `session_id`, `user_id`, `version`, `input_hash`, `model`, `payload`, `created_at`
- latest: `session_id`, `user_id`, pointer fields, `updated_at`

## Join / Attachment Tables

### thread_highlights

Fields:

- `thread_id`, `highlight_id`, `role` (`center|supporting|historical`), `created_at`

### thread_glossary_terms

Fields:

- `thread_id`, `term_id`, `role` (`primary_motif|secondary_motif|related`), `created_at`

### opening_attachments

Fields:

- `opening_id`, `attachment_type` (`highlight|term|entry|response|thread|scene`), `attachment_ref_id`, `payload`, `created_at`

### response_attachments

Fields:

- `response_id`, `attachment_type` (`highlight|term|entry|opening|thread|note`), `attachment_ref_id`, `payload`, `created_at`

### note_attachments

Fields:

- `note_id`, `attachment_type` (`highlight|term|entry|thread|opening`), `attachment_ref_id`, `payload`, `created_at`

## Retained Current Tables

Retain as-is for alpha runtime continuity:

- `dream_sessions`
- `dream_entries`
- `dream_answers`
- `session_directions`
- `observation_versions`, `observation_latest`
- `latent_versions`, `latent_latest`
- `session_index_versions`, `session_index_latest`
- `frame_versions`, `frame_latest`
- `dream_anchor_versions`, `dream_anchor_latest`
- `domain_jobs`
- `glossary_terms`, `glossary_occurrences`, `glossary_notes`, `term_candidates`
- `dream_entry_highlights`, `dream_session_highlights`, `dream_session_rejected_suggestions`
- `work_versions`, `work_latest`

## Transitional Compatibility Tables

Transition-period compatibility layer should treat these as bridge stores:

- `work_versions` / `work_latest` as pre-thread reflective activity history.
- `dream_answers` as pre-`reflective_responses` content source.
- `session_directions` as pre-`attention_lenses` selection history.
- `frame_versions/latest` + `session_index_versions/latest` as pre-`orientation_*` substrate.
- Split highlight tables as pre-unified `highlights` contract.
- `term_candidates` as candidate funnel before full glossary-state unification.

## Obsolete / Removal Candidate Tables

Likely removal candidates after full transition and verification:

- `work_latest` (replaced by thread focus/latest pattern)
- `work_versions` (once thread/opening history fully supersedes card model)
- `dream_session_highlights` and `dream_entry_highlights` split model (after unified `highlights`)
- `dream_session_rejected_suggestions` (after highlight/opening dismissal unification)
- `session_directions` (after `attention_lenses` migration)
- `frame_*` and `session_index_*` split orientation layer if consolidated into `orientation_*`

Deferred-domain historical candidates (outside this immediate reflective schema effort, still candidates in broader cleanup):

- `dream_map_versions`, `dream_map_latest`
- `dream_map_v2_versions`, `dream_map_v2_latest`

Current runtime table classification matrix (required):

| Current table | Classification | Target mapping note |
| --- | --- | --- |
| `dream_sessions` | RETAIN | Root table kept; conceptually treated as Dream Space |
| `dream_entries` | RETAIN | Canonical dream substrate remains |
| `dream_answers` | BRIDGE | Source for `reflective_responses` |
| `work_versions` | BRIDGE | Transitional pre-thread reflective activity history |
| `work_latest` | BRIDGE | Transitional latest pointer before thread-focus latest |
| `session_directions` | BRIDGE | Transitional precursor for `attention_lenses` + events |
| `dream_entry_highlights` | BRIDGE | Part of split highlight model feeding unified `highlights` |
| `dream_session_highlights` | BRIDGE | Part of split highlight model feeding unified `highlights` |
| `dream_session_rejected_suggestions` | BRIDGE | Dismissal memory to unify into highlight/opening states |
| `glossary_terms` | EXTEND | Keep and evolve with explicit state/visibility semantics |
| `glossary_occurrences` | EXTEND | Keep and enrich with attachment/evidence links |
| `glossary_notes` | BRIDGE | Transitional to `reflective_notes` + note attachments |
| `term_candidates` | BRIDGE | Candidate funnel; may fold into glossary term-state later |
| `observation_versions` | RETAIN | Internal substrate remains |
| `observation_latest` | RETAIN | Internal pointer substrate remains |
| `latent_versions` | RETAIN | Internal substrate remains |
| `latent_latest` | RETAIN | Internal pointer substrate remains |
| `session_index_versions` | BRIDGE | Transitional substrate toward unified `orientation_versions` |
| `session_index_latest` | BRIDGE | Transitional pointer toward unified `orientation_latest` |
| `dream_anchor_versions` | RETAIN | Internal anchor substrate retained for now |
| `dream_anchor_latest` | RETAIN | Internal anchor pointer retained for now |
| `frame_versions` | BRIDGE | Transitional substrate toward unified orientation model |
| `frame_latest` | BRIDGE | Transitional pointer toward unified orientation model |
| `dream_map_versions` | DEFER | Outside reflective core; cleanup handled separately |
| `dream_map_latest` | DEFER | Outside reflective core; cleanup handled separately |
| `dream_map_v2_versions` | DEFER | Outside reflective core; cleanup handled separately |
| `dream_map_v2_latest` | DEFER | Outside reflective core; cleanup handled separately |

## State Models

Canonical vocabulary authority note:

- Canonical thread/opening lifecycle vocabulary is defined by:
  - `docs/plans/lumira-reflective-thread-state-machine-v0.md`
  - `docs/plans/lumira-reflective-opening-lifecycle-api-contract-v0.md`
  - `docs/plans/lumira-reflective-thread-canonical-data-model-v0.md`
  - `docs/plans/lumira-reflective-opening-canonical-data-model-v0.md`
- This schema-target document is target/future schema guidance and may reference an alpha operational subset, but that subset is not canonical vocabulary authority.

### Thread states

Canonical thread states:

- `emerging`
- `open`
- `active`
- `answered`
- `dormant`
- `resurfaced`
- `deferred`
- `archived`
- `dismissed`

Alpha operational subset (non-canonical shorthand, if used for early slices):

- `open`
- `active`
- `answered`
- `deferred`
- `dormant`
- `dismissed`

### Opening states

Canonical opening states:

- `generated`
- `candidate`
- `surfaced`
- `engaged`
- `deferred`
- `revisited`
- `expired`
- `dismissed`
- `archived`

Alpha operational subset (non-canonical shorthand, if used for early slices):

- `candidate`
- `surfaced`
- `engaged`
- `deferred`
- `dismissed`
- `archived`

### Highlight states

- `suggested`: AI/system proposal pending user confirmation
- `active`: user-confirmed and currently relevant
- `pinned`: promoted to stronger continuity role
- `dismissed`: explicitly rejected/suppressed
- `archived`: historical, non-foreground

### Response states

- `draft`: started but not finalized
- `saved`: persisted intermediate reflection
- `submitted`: explicit reflective response
- `revisited`: later continuation/edit cycle
- `archived`: historical/hidden from foreground

### Attention lens states

- `active`: currently shaping weighting
- `inactive`: retained but not currently applied
- `expired`: auto-faded over time/context shift
- `dismissed`: explicitly removed from surfacing

## Payload Fields

### JSON payloads

Recommended JSON fields:

- `reflective_threads.center_payload`
- `reflective_openings.payload`
- `reflective_responses.payload`
- `reflective_notes.payload`
- `highlights.source_ref`
- `continuity_signals.payload`
- `attention_lenses.weight_payload`
- `attention_lens_events.payload`
- `orientation_versions.payload`
- `observation_versions.payload`
- `latent_versions.payload`

### Source trace payloads

Recommended source-trace JSON fields:

- `reflective_openings.source_trace`
- `orientation_versions.source_trace`
- `opening_attachments.payload`
- `response_attachments.payload`
- `note_attachments.payload`
- `glossary_occurrences.evidence_payload`

Suggested trace contents:

- generator/model identifiers
- source entity refs (`entry/highlight/thread/term/opening`)
- evidence snippets and offsets
- confidence/probability metadata
- alternative readings (internal trace only if needed)

### Internal-only payloads

Never directly surface raw internal payloads as user truth objects:

- `observation_versions.payload` raw structures
- `latent_versions.payload` hypothesis internals
- most `dream_anchor_*` and `session_index_*` intermediate structures
- orchestration diagnostics in `domain_events` / `material_snapshots` style payloads

## Migration / Rebuild Implications

- Requires staged additive rollout, not hard cutover.
- Requires temporary dual-read compatibility windows.
- Requires backfill mapping from legacy work/answer/direction/highlight split into thread/opening/response/lens models.
- Requires attachment mapping rules for highlights, glossary motifs, and responses.
- Requires explicit state-mapping functions:
  - legacy rejected suggestions -> highlight/opening dismissed states
  - direction selections -> attention lens events
  - work card activity -> thread/opening event lineage
- Requires contract-level validation before any table removals.

## Alpha Compatibility Strategy

- No destructive schema actions during alpha-prep phase.
- Keep existing alpha runtime tables and APIs stable while introducing target tables as additive.
- Defer table removals until:
  - reflective table reads are production-proven,
  - compatibility mappings are complete,
  - owner-approved cutoff criteria are met.
- Preserve non-interpretive outward behavior across all surfaced reflective objects.
- Keep glossary and highlight user-ownership semantics unchanged during transition.

## Open Questions

- Should `reflective_threads` support cross-session linking in v0 target or stay session-scoped first?
- Should `continuity_signals` be first-class relational in v0 or derived-only until post-alpha?
- Should `reflective_notes` be first-class immediately, or temporarily remain embedded in highlight/glossary structures?
- What exact canonical mapping will resolve `dream_answers` contract drift in runtime consumers?
- Do we consolidate `frame_*` + `session_index_*` into `orientation_*` in one phase or two phases?
- What minimum source-trace fields are mandatory for safe user-facing reflective openings?

## Recommended Next Documents

- `docs/plans/lumira-reflective-runtime-compat-contract-v0.md`
- `docs/plans/lumira-reflective-migration-sequence-v0.md`
- `docs/plans/lumira-reflective-thread-state-machine-v0.md`
- `docs/plans/lumira-reflective-highlight-unification-contract-v0.md`
- `docs/plans/lumira-reflective-payload-contract-v0.md`
