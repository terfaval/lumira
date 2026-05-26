# Lumira Reflective Data Model Bridge v0

## Purpose

Translate the current reflective conceptual model into an implementation-oriented persistence bridge that can guide upcoming schema redesign decisions without creating migrations yet.

## Current Conceptual Baseline

This bridge is grounded in:

- `docs/design/Lumira_Reflective_Interaction_Model_v2.md`
- `docs/design/Lumira_Reflective_Composer_Model_v1.md`
- `docs/design/lumira-reflective-payload-architecture-v0.md`
- `docs/design/lumira-reflective-space-ia-v0.md`
- `docs/design/lumira-reflective-thread-model-v0.md`
- `docs/gpts/Observation_Latent_Glossary_Work_Redesign_Handoff.md`

Operational assumptions used by this bridge:

- Reflective Space is state/layer-based (orientation + deep reflection), not route/workflow-based.
- Dream text remains canonical; AI orientation/orchestration must stay secondary and non-authoritative.
- Threads are continuity structures, not task/checklist/chat abstractions.
- Observation/latent/index/anchor systems are mostly internal substrates that may produce user-visible derivatives.

Additional constraints clarified by the redesign handoff:

- Observation can become richer and more structured, but must remain descriptive and evidence-linked.
- Latent cognition may be interpretive internally (probabilistic hypotheses), but never surfaced as authoritative truth.
- Highlights are expected to become a primary interaction primitive, so first-class durable modeling is required.
- Directions are evolving from lock-in modes toward soft attention lenses/weighting.
- Glossary promotion remains user-confirmed (`candidate` vs `pinned`) and must never override current-dream evidence.

## Entity Classification Matrix

| Entity | User-visible | User-editable | Durable persistence | JSON payload viable | Relational table likely | Current runtime representation | Current status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dream Space | Yes | Partial | Yes | Partial | Yes | `dream_sessions` + `dream_entries` + latest pointers | Transitional |
| Dream Entry | Yes | Yes | Yes | No (primary) | Yes | `dream_entries` | Sufficient (core) |
| Dream Surface | Yes | Indirect | Yes | Partial | Yes | Composite of entries/highlights/glossary/thread-like artifacts | Transitional |
| Highlight | Yes | Yes | Yes | Partial | Yes | `dream_entry_highlights`, `dream_session_highlights`, `dream_session_rejected_suggestions` | Transitional (split model) |
| Reflective Note | Yes | Yes | Yes | Yes (short term) | Yes (long term) | `dream_entry_highlights.note`, `glossary_notes`, fragments in `dream_answers` | Transitional |
| Reflective Opening | Yes | No (content) | Yes (state) | Yes | Yes | Mostly `frame_versions.payload`, `work_versions.payload`, suggestion rows | Transitional |
| Reflective Response | Yes | Yes | Yes | Partial | Yes | `dream_answers` (+ linkage drift with work IDs) | Transitional (contract drift risk) |
| Reflective Thread | Yes | Partial | Yes | Partial | Yes | No canonical table; approximated by `work_versions`, `work_latest`, `dream_answers` | Obsolete approximation |
| Glossary Term | Yes | Partial | Yes | Partial | Yes | `glossary_terms` | Sufficient but extensible |
| Glossary Occurrence | Yes | No direct | Yes | Partial | Yes | `glossary_occurrences`, `glossary_occurrence_events` | Sufficient but extensible |
| Continuity Signal | Peripheral | No | Yes | Yes | Maybe | Latent/index/anchor payloads + recurrence counters | Transitional |
| Orientation Payload | Yes | No | Yes | Yes | Yes (version pointer pattern) | `frame_versions/latest`, `session_index_versions/latest` | Sufficient (transitional shape) |
| Attention Lens | Sometimes | Partial | Yes | Yes | Yes | `session_directions` + direction hints in frame/work payloads | Transitional |
| Observation Payload | Mostly No | No | Yes | Yes | Yes (version pointer pattern) | `observation_versions/latest` | Sufficient (internal) |
| Latent Hypothesis | No direct | No | Yes | Yes | Yes (version pointer pattern) | `latent_versions/latest` | Sufficient (internal) |

## Entity-by-Entity Mapping

### Dream Space

1. Conceptually: one dream-centered reflective workspace boundary for a session.
2. User-visible: yes.
3. User-editable: partially (title/raw entries/attached artifacts).
4. Durable persistence: yes.
5. JSON payload: partially (orientation snapshots), not as sole canonical form.
6. Relational table need: yes (`dream_spaces` concept can map to existing `dream_sessions` initially).
7. Current table mapping: `dream_sessions` (root), `dream_entries` (content), latest/version tables (enrichment).
8. Sufficiency status: transitional; root exists but reflective continuity semantics are spread.
9. Needed relationships: 1:N to entries, highlights, threads, openings, responses; N:M to glossary terms via occurrences.
10. Alpha constraints: keep `dream_sessions` ID contract stable; preserve current route/session reads.

### Dream Entry

1. Conceptually: canonical raw dream material.
2. User-visible: yes.
3. User-editable: yes.
4. Durable persistence: yes.
5. JSON payload: no (primary should remain text rows).
6. Relational table need: yes.
7. Current table mapping: `dream_entries`.
8. Sufficiency status: sufficient for alpha.
9. Needed relationships: belongs to Dream Space; 1:N highlights; referenced by notes/threads.
10. Alpha constraints: no breaking change to `dream_entries` read/write paths.

### Dream Surface

1. Conceptually: user-facing reflective substrate combining raw entry + anchors + continuity links.
2. User-visible: yes.
3. User-editable: indirectly via highlights/notes/responses.
4. Durable persistence: yes (composite state).
5. JSON payload: partially for assembled view model only.
6. Relational table need: yes (via constituent entities, not necessarily a single table first).
7. Current table mapping: assembled from `dream_entries`, highlight tables, glossary tables, work/answer artifacts.
8. Sufficiency status: transitional; composition exists but is fragmented.
9. Needed relationships: aggregates highlights, notes, openings, thread anchors.
10. Alpha constraints: keep dream text primary; orientation overlays must stay secondary.

### Highlight

1. Conceptually: user-owned salience anchor.
2. User-visible: yes.
3. User-editable: yes.
4. Durable persistence: yes.
5. JSON payload: viable for suggestion metadata, not ideal as sole store.
6. Relational table need: yes.
7. Current table mapping: `dream_entry_highlights` (text-span anchors), `dream_session_highlights` (session-level items), `dream_session_rejected_suggestions` (dismissed suggestions).
8. Sufficiency status: transitional split; not yet one canonical highlight contract.
9. Needed relationships: belongs to Dream Entry/Space; optional link to thread, note, glossary term, opening, response.
10. Alpha constraints: preserve existing add/edit/reject flows and rejection dedupe behavior.

### Reflective Note

1. Conceptually: local contextual reflection fragment.
2. User-visible: yes.
3. User-editable: yes.
4. Durable persistence: yes (selectively).
5. JSON payload: yes for short-term embedding in related entities.
6. Relational table need: likely yes for long-term thread continuity + querying.
7. Current table mapping: `dream_entry_highlights.note`, `glossary_notes`, some note-like `dream_answers` content.
8. Sufficiency status: transitional and fragmented.
9. Needed relationships: optional parent = highlight/thread/glossary term/opening.
10. Alpha constraints: do not remove existing note fields/paths before bridge consolidation.

### Reflective Opening

1. Conceptually: AI-surfaced reflective invitation/possibility.
2. User-visible: yes.
3. User-editable: content no; state yes (dismiss/defer/engage).
4. Durable persistence: yes for continuity and suppression/resurfacing logic.
5. JSON payload: yes for generated content + source trace.
6. Relational table need: likely yes for state transitions and thread linkage.
7. Current table mapping: openings currently embedded in `frame_versions.payload`, `work_versions.payload`, and suggestion artifacts.
8. Sufficiency status: transitional; no explicit lifecycle table.
9. Needed relationships: belongs to space/thread; optionally linked to highlight/glossary term/latent signal.
10. Alpha constraints: opening behavior must remain optional/non-blocking (no mandatory answer state).

### Reflective Response

1. Conceptually: sustained user reflective writing.
2. User-visible: yes.
3. User-editable: yes.
4. Durable persistence: yes.
5. JSON payload: partial (metadata); response body should be first-class.
6. Relational table need: yes.
7. Current table mapping: `dream_answers` (with current field-contract drift across runtime callsites).
8. Sufficiency status: transitional; usable but not thread-first.
9. Needed relationships: belongs to thread; can reference opening/highlight/motif/entry excerpt.
10. Alpha constraints: maintain `dream_answers` compatibility during transition; do not break current work answer flow.

### Reflective Thread

1. Conceptually: continuity trajectory around reflective centers.
2. User-visible: yes.
3. User-editable: partially (state/attachments/continuations).
4. Durable persistence: yes.
5. JSON payload: partial for topology/derived scoring.
6. Relational table need: yes (thread identity + state + membership links).
7. Current table mapping: approximated by `work_versions`, `work_latest`, `dream_answers`, `session_directions`.
8. Sufficiency status: obsolete approximation for target model.
9. Needed relationships: 1:N responses/openings; N:M highlights/glossary terms; belongs to Dream Space; optional cross-dream continuity.
10. Alpha constraints: bridge via compatibility views/wrappers before replacing work-card assumptions.

### Glossary Term

1. Conceptually: personal motif memory node.
2. User-visible: yes.
3. User-editable: partially (notes/pinning/visibility).
4. Durable persistence: yes.
5. JSON payload: partial for enrichments only.
6. Relational table need: yes.
7. Current table mapping: `glossary_terms` (+ optional archetype linkage).
8. Sufficiency status: mostly sufficient, missing explicit thread linkage and richer status model.
9. Needed relationships: 1:N occurrences/notes; N:M threads/highlights.
10. Alpha constraints: remain non-authoritative; maintain candidate-vs-pinned behavior.

### Glossary Occurrence

1. Conceptually: motif appearance in a specific context.
2. User-visible: yes (as recurrence cue), raw evidence usually indirect.
3. User-editable: no direct content editing.
4. Durable persistence: yes.
5. JSON payload: partial for evidence blobs.
6. Relational table need: yes.
7. Current table mapping: `glossary_occurrences`, `glossary_occurrence_events`.
8. Sufficiency status: sufficient base, needs richer attachment targets (highlight/thread).
9. Needed relationships: belongs to term + session; can link to entry span/highlight/thread.
10. Alpha constraints: recurrence signals must stay gentle and non-prescriptive.

### Continuity Signal

1. Conceptually: ambient indicator of recurrence/revisitation/unresolved continuity.
2. User-visible: peripheral only.
3. User-editable: no direct edit.
4. Durable persistence: yes (to support resurfacing quality).
5. JSON payload: yes, often ideal for computed signal bundles.
6. Relational table need: maybe; table likely only if querying/filtering by signal type becomes core.
7. Current table mapping: derived from `latent_*`, `session_index_*`, `dream_anchor_*`, glossary counters.
8. Sufficiency status: transitional (derived, no explicit continuity signal store).
9. Needed relationships: can target thread/highlight/term/space.
10. Alpha constraints: keep as low-pressure cue; no dashboard/gamified exposure.

### Orientation Payload

1. Conceptually: re-entry framing and reflective map context.
2. User-visible: yes.
3. User-editable: not directly.
4. Durable persistence: yes.
5. JSON payload: yes.
6. Relational table need: yes (version + pointer model already used).
7. Current table mapping: `frame_versions/latest`, `session_index_versions/latest`.
8. Sufficiency status: sufficient for alpha, transitional toward unified orientation schema.
9. Needed relationships: belongs to Dream Space; links to openings/threads/lenses.
10. Alpha constraints: keep collapsible secondary role and non-interpretive tone.

### Attention Lens

1. Conceptually: temporary weighting/focus framing.
2. User-visible: sometimes.
3. User-editable: partially (selection and override behavior).
4. Durable persistence: yes (for continuity and revisit coherence).
5. JSON payload: yes.
6. Relational table need: yes for explicit user selections/events.
7. Current table mapping: `session_directions`, direction hints inside frame/work payloads.
8. Sufficiency status: transitional; currently direction-centric not thread-centric.
9. Needed relationships: belongs to space; optionally bound to thread/opening cluster.
10. Alpha constraints: preserve current `session_directions` write/read behavior.

### Observation Payload

1. Conceptually: extracted non-authoritative structural material from dream text.
2. User-visible: indirect only.
3. User-editable: no.
4. Durable persistence: yes.
5. JSON payload: yes.
6. Relational table need: yes through version/pointer lifecycle.
7. Current table mapping: `observation_versions`, `observation_latest`.
8. Sufficiency status: sufficient internal substrate; schema-version bridge is transitional.
9. Needed relationships: feeds latent/index/anchor/openings/candidate extraction.
10. Alpha constraints: keep non-user-facing raw forms; avoid direct surfacing of raw extraction internals.

### Latent Hypothesis

1. Conceptually: uncertain internal reflective possibility model.
2. User-visible: no direct form.
3. User-editable: no.
4. Durable persistence: yes.
5. JSON payload: yes.
6. Relational table need: yes through version/pointer lifecycle.
7. Current table mapping: `latent_versions`, `latent_latest`.
8. Sufficiency status: sufficient internal substrate.
9. Needed relationships: source for openings/continuity signals/attention weighting.
10. Alpha constraints: never surface as authoritative claims; only via softened downstream invitations.

## Legacy Runtime Mapping

### Work Versions / Work Latest

Legacy role:

- `work_versions.payload` stores generated work cards and interaction context snapshots.
- `work_latest` holds session pointer to latest work version.

Future mapping:

- Becomes transitional backing for `Reflective Thread` activation snapshots.
- Card-specific fields map into `Reflective Opening` candidates and thread-state events.
- `work_latest` semantics should migrate toward `thread_focus_latest` style pointer (conceptually), while retaining compatibility during alpha.

Bridge classification:

- `work_versions`: transitional (content useful, shape workflow-biased).
- `work_latest`: transitional pointer, likely replaceable by thread-focus pointer.

### Dream Answers

Legacy role:

- Stores answer text and work linkage.

Future mapping:

- Canonical seed for `Reflective Response` table/model.
- Must gain explicit attachment metadata for opening/thread/highlight/motif context.

Bridge classification:

- Transitional but critical.
- Contract drift noted in audits (field naming differences across runtime paths) must be normalized in redesign phase.

### Session Directions

Legacy role:

- Records selected direction slug per session.

Future mapping:

- Maps to persisted `Attention Lens` choices/events.
- Can also provide initial thread-weighting hints at transition time.

Bridge classification:

- Transitional and still alpha-required.

### Highlight Tables

Current split:

- `dream_entry_highlights`: canonical text-span anchors + optional local note.
- `dream_session_highlights`: session-level/suggested highlight records with status/source.
- `dream_session_rejected_suggestions`: suggestion dismissal memory.

Future mapping:

- Unified Highlight model with:
  - anchor definition (entry span or session-level motif anchor)
  - provenance (`user`, `ai_suggested`, `imported`)
  - state (`active`, `dismissed`, `pinned`, `archived`)
  - optional attachments (thread, note, glossary term, opening, response)

Bridge classification:

- All three are transitional; preserve runtime behavior, consolidate semantics later.

### Glossary Tables

Current:

- `term_candidates`: candidate queue with recurrence counts.
- `glossary_terms`: pinned/accepted motif memory.
- `glossary_occurrences`: session-level recurrence tracking.
- `glossary_notes`: user-provided meaning/context (including `do_not_surface` compatibility concerns in runtime).

Future mapping:

- Candidate vs pinned remains explicit.
- Recurrence remains computed from occurrences/events.
- `do_not_surface` must remain supported as suppression signal.
- Add motif-thread linkage as first-class relation.

Bridge classification:

- Mostly sufficient base with targeted extension needed (thread linkage, stronger visibility-state contract).

### Observation / Latent / Index / Anchor Tables

Current substrate tables:

- Observation: `observation_versions`, `observation_latest`.
- Latent: `latent_versions`, `latent_latest`.
- Index: `session_index_versions`, `session_index_latest`.
- Anchor: `dream_anchor_versions`, `dream_anchor_latest`.

Future role:

- Remain internal orchestration substrate.
- Continue generating user-facing derivatives (openings, suggestions, continuity cues, candidate motifs).
- Should not be exposed as direct user-editable entities.

Bridge classification:

- Sufficient internal pattern (version + latest pointer), with schema harmonization likely.

## Persistence Recommendations

### Relational Tables

Recommended first-class relational entities for redesign target:

- `dream_spaces` (or explicit continuation of `dream_sessions` with reflective semantics)
- `dream_entries`
- `reflective_threads`
- `reflective_responses`
- `reflective_openings`
- `highlights` (unified contract)
- `reflective_notes`
- `glossary_terms`
- `glossary_occurrences`
- join tables:
  - thread-highlights
  - thread-terms
  - opening-attachments
  - response-attachments

### JSON Payloads

Good JSON candidates:

- orientation payload bodies (frame/index synth outputs)
- opening source trace / evidence
- continuity-signal bundles
- optional note metadata
- derived topology summaries

### Internal-only Payloads

Keep internal-only (never directly surfaced as raw objects):

- observation raw payloads
- latent hypothesis payloads
- most anchor/index intermediate payloads
- orchestration diagnostics/material snapshots

### Transitional Tables

Bridge-period transitional tables likely retained during alpha:

- `work_versions`, `work_latest`
- `dream_answers`
- `session_directions`
- `dream_entry_highlights`, `dream_session_highlights`, `dream_session_rejected_suggestions`

## Migration / Rebuild Implications

- A pure in-place rename strategy is high-risk because current runtime paths are split across pages, APIs, and jobs.
- Bridge should use staged dual-write/read-compat windows once implementation begins.
- Work-card-centric artifacts (`work_versions`) should be reinterpreted as thread-event history before deprecation.
- Highlight split requires consolidation logic that preserves:
  - text-span anchors,
  - suggested-vs-user provenance,
  - rejection memory.
- Glossary evolution should preserve candidate history and `do_not_surface` semantics.
- Observation/latent/index/anchor tables can remain mostly stable as internal substrate while user-facing reflective tables evolve around them.

## Alpha Compatibility Strategy

1. Preserve all current alpha-required tables and endpoint contracts during bridge rollout.
2. Treat new reflective entities as additive first; avoid immediate destructive replacement.
3. Keep `dream_entries` canonical and unchanged for capture/revisit reliability.
4. Maintain existing `dream_answers` and `session_directions` paths until reflective response/lens adapters are proven.
5. Keep highlight APIs behaviorally identical while internally preparing unified highlight schema.
6. Keep glossary non-authoritative and user-confirmed; no auto-promotion to pinned motifs.
7. Keep observation/latent raw payloads internal; only derivative invitations/cues are user-facing.
8. Maintain non-interpretive contract across all surfaced entities.

## Open Questions

- Should thread identity be session-scoped only in alpha, or prepared for cross-dream continuity from day one?
- Which dismissal states must be first-class at launch (`dismissed`, `deferred`, `do_not_surface`) and at which entity levels?
- Do reflective notes need separate table immediately, or can they remain attached to highlights/threads during bridge phase?
- What is the canonical response-link contract replacing current `dream_answers` field drift (`work_id` vs `work_block_id` semantics)?
- Should attention lens history be append-only events or mutable latest-selection state plus history table?

## Recommended Next Documents

- `lumira-reflective-schema-target-v0.md` (table-level target schema proposal, no SQL yet)
- `lumira-reflective-runtime-compat-contract-v0.md` (API/read-model compatibility during bridge)
- `lumira-reflective-migration-sequence-v0.md` (staged migration/rebuild plan)
- `lumira-reflective-thread-state-machine-v0.md` (thread/opening/response state transitions)
- `lumira-reflective-highlight-unification-contract-v0.md` (entry/session/rejection consolidation rules)
