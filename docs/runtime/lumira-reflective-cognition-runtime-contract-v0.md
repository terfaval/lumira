# Lumira Reflective Cognition Runtime Contract v0

## Purpose

Define a runtime cognition contract for Lumira Reflective Space that operationalizes layer responsibilities, ownership boundaries, payload directions, and cross-layer behavior for:

- Observation
- Latent
- Highlights
- Glossary
- Reflective Work / Threads / Openings / Responses

This document is architecture/planning only and is intended as a precursor to API contracts, route contracts, and clean schema implementation.

## Design Foundations

- `docs/gpts/Observation_Latent_Glossary_Work_Redesign_Handoff.md`
- `docs/design/Lumira_Reflective_Interaction_Model_v2.md`
- `docs/design/Lumira_Reflective_Composer_Model_v1.md`
- `docs/design/lumira-reflective-payload-architecture-v0.md`
- `docs/design/lumira-reflective-space-ia-v0.md`
- `docs/design/lumira-reflective-thread-model-v0.md`
- `docs/design/lumira-reflective-data-model-bridge-v0.md`
- `docs/plans/lumira-reflective-schema-target-v0.md`
- `docs/plans/lumira-supabase-clean-rebuild-strategy-v0.md`

## Runtime Philosophy

- Runtime behavior is reflective-cognition-first, not workflow-step-first.
- Canonical raw dream entry remains the source material authority.
- Observation describes; latent hypothesizes; dialogue invites.
- User-owned actions (highlighting, pinning, writing, dismissing) are primary truth signals.
- Continuity is thread-driven and memory-aware, but non-coercive.
- AI output is always non-authoritative, revisable, and optional.

## Layer Overview

### Dream Entry Layer

- Canonical substrate of dream text and edits.
- Runtime role: anchor all higher cognition layers to concrete source material.
- Ownership: fully user-owned content.

### Observation Layer

- Descriptive extraction layer.
- Runtime role: structure what appears in the dream without inferring meaning claims.
- Visibility: mostly internal, selectively transformed to user-safe cues.

### Latent Layer

- Internal probabilistic inference layer.
- Runtime role: model continuity/tension/priority hypotheses and generate candidate reflective directions.
- Visibility: internal-only in raw form.

### Highlights Layer

- User salience and attention shaping layer.
- Runtime role: primary interaction primitive for continuity anchoring and reflective activation.
- Visibility: user-visible and user-controlled.

### Glossary Layer

- Personal continuity memory layer.
- Runtime role: track recurring motifs, candidate promotion, pinned motif memory, suppression.
- Visibility: user-visible, contextual, non-authoritative.

### Reflective Thread Layer

- Continuity trajectory layer.
- Runtime role: organize openings/responses/notes around reflective centers over time.
- Visibility: user-visible continuity structure.

### Reflective Dialogue Layer

- User-facing invitation layer.
- Runtime role: translate internal cognition into safe, optional reflective openings.
- Visibility: user-visible transformed outputs only.

## Layer Relationship Model

- Dream Entry -> Observation:
  - descriptive extraction from canonical text.
- Observation -> Latent:
  - latent consumes descriptive evidence, not user meaning claims.
- Observation + Latent + User signals -> Highlights/Threads/Openings:
  - user actions and continuity models co-determine surfacing.
- Highlights <-> Glossary:
  - highlights influence candidate/pinned motif evolution; glossary contextualizes highlights.
- Highlights + Glossary + Responses -> Threads:
  - thread continuity emerges from interaction history and recurrence.
- Threads -> Reflective Dialogue:
  - dialogue openings are attached to active continuity centers.

## Internal vs External Cognition Boundaries

- Internal-only:
  - raw latent hypotheses
  - confidence score internals
  - alternative reading sets
  - internal continuity/tension ranking structures
  - raw observation internals not needed for user clarity
- Transform-before-surface:
  - latent-driven continuity hints
  - recurrence priority signals
  - uncertainty/ambiguity indicators
- User-visible:
  - highlights
  - glossary candidate/pinned states
  - reflective openings (invitation form)
  - reflective responses and notes
  - thread continuity states (open/revisited/dormant etc.)

## Observation Runtime Contract

### Responsibilities

- Extract descriptive, evidence-linked structure from dream entries.
- Produce stable runtime substrate for latent, orientation, and continuity systems.
- Preserve phenomenological fidelity and ambiguity.

### Inputs

- canonical dream entry text
- relevant session-local entry edits
- optional prior observation context for normalization

### Outputs

- structured observation payload
- evidence-linked descriptive elements
- recurrence candidates (descriptive candidates only)

### Output Categories

- scene/setting descriptors
- actor/entity descriptors
- interaction descriptors
- affect descriptors
- metacognitive/lucidity indicators
- continuity hints (descriptive, not inferential claims)

### Evidence Requirements

- every salient extracted element should map to textual evidence or explicit source fragment.
- missing-evidence elements should be dropped or marked low-confidence internal-only.

### Recurrence Detection

- allowed as descriptive pattern signaling (similar motifs reappearing).
- must not produce interpretive conclusions.

### Phenomenology Modeling

- capture perspective shifts, embodiment, fragmentation, coherence breaks, dream-state qualities.
- maintain descriptive phrasing.

### Agency Modeling

- describe agency dynamics (blocked/mobilized/passive/active).
- no diagnosis or trait claims.

### Affect Modeling

- capture emotional tone transitions and density changes.
- preserve uncertainty where affect is ambiguous.

### Lucidity / Metacognition Modeling

- detect reflective-awareness moments and dream-state recognition cues.
- keep as descriptive signals.

### What Observation Must NEVER Do

- never output authoritative meaning claims.
- never produce diagnostic language.
- never overwrite user meaning.
- never present symbolic interpretation as fact.

## Latent Runtime Contract

### Responsibilities

- Build internal probabilistic reflective hypotheses from observation + continuity memory + user signals.
- Prioritize reflective possibilities for openings/lenses/continuity resurfacing.

### Inputs

- observation payloads (current + continuity-relevant history)
- highlight history
- glossary recurrence memory
- thread lifecycle/activity context
- attention lens context

### Outputs

- internal hypothesis set
- confidence/stability metadata
- evidence links
- alternative reading set
- prioritization candidates for reflective openings

### Hypothesis Model

- hypotheses are provisional, weighted, revisable structures.
- hypotheses represent possible continuity/tension/agency/relational lines.

### Confidence / Stability Model

- confidence indicates current support strength.
- stability indicates temporal persistence (`emerging|stable|volatile` style).
- confidence/stability remain internal unless transformed into gentle uncertainty-aware phrasing.

### Evidence Linking

- each hypothesis must reference supporting observation/highlight/glossary/thread evidence.
- unsupported hypotheses are demoted or dropped.

### Alternative Readings

- retain competing plausible readings internally.
- surfaced dialogue should avoid single-path certainty.

### Continuity Modeling

- model cross-session motif/emotion/agency continuity.
- continuity increases resurfacing eligibility, not mandatory surfacing.

### Tension Modeling

- model unresolved emotional/relational tension lines.
- output as possible reflective focus candidates.

### Relational Modeling

- model closeness/distance, authority, conflict, care-dependence dynamics as provisional internal signals.

### What Latent Must NEVER Do

- never surface raw hypotheses as final truth.
- never collapse ambiguity into single certainty.
- never directly present internal confidence as diagnostic authority.

## Highlights Runtime Contract

### Responsibilities

- Capture user-marked salience anchors.
- Serve as primary reflective activation primitive.
- Bind local material to continuity structures (threads/glossary/openings).

### User Ownership

- creation/edit/confirmation/dismissal are user-owned acts.
- AI may suggest; only user confirmation persists salience as active highlight.

### Highlight Types

- text-span highlight
- motif/session-level highlight
- suggested highlight (pending user confirmation)

### Highlight Lifecycle

- suggested -> active -> pinned/archived
- suggested -> dismissed
- active -> dismissed/archived/revisited

### Highlight-to-Glossary Relationship

- highlights can generate glossary candidates.
- highlights can link to pinned terms.
- glossary link is contextual memory, not semantic override.

### Highlight-to-Thread Relationship

- highlights can originate threads.
- highlights can attach to existing threads.
- highlight activity can reactivate dormant threads.

### Highlight Resurfacing Logic

- resurfacing depends on recurrence, thread continuity, and user significance.
- resurfacing must be gentle, not alert-like.

### What Highlights Must NEVER Become

- not an AI-owned semantic labeling system.
- not a forced task checklist.
- not a hidden auto-interpretation channel.

## Glossary Runtime Contract

### Responsibilities

- maintain personal motif continuity memory.
- track candidate recurrence and pinned motif history.
- provide context-sensitive continuity cues.

### Candidate Lifecycle

- generated from observation/highlight recurrence signals.
- ranked by recurrence and contextual relevance.
- remains provisional until user confirmation.

### Pinned Lifecycle

- user-confirmed motif memory state.
- can be annotated, suppressed, revisited, or archived.

### Recurrence Tracking

- track frequency, session spread, and continuity co-occurrence.
- recurrence informs surfacing priority only.

### User Notes

- user-authored motif notes are first-class meaning ownership artifacts.
- notes influence context phrasing, not hard conclusions.

### Surface Policies

- glossary context appears as optional reflective memory cues.
- never dominate active dream material.

### Suppression / do_not_surface

- suppression state must be respected at surfacing time.
- suppressed motifs may remain internally tracked but not actively surfaced.

### Glossary Context Rules

- contextualize current dream with prior motifs.
- always phrase as invitation/resonance check.

### What Glossary Must NEVER Do

- never act as symbolic truth engine.
- never override current dream evidence.
- never force meaning by recurrence alone.

## Reflective Thread Runtime Contract

### Responsibilities

- persist reflective continuity around active centers.
- organize openings, responses, notes, highlights, motif links over time.

### Thread Origins

- highlight-origin
- glossary/motif-origin
- opening-origin
- response-origin
- unresolved-scene or continuity-signal origin
- manual user start

### Thread Lifecycle

- `open`
- `answered`
- `deferred`
- `dormant`
- `revisited`
- `dismissed`

### Openings

- openings are attachable thread invitations, not mandatory next-steps.
- thread may have multiple concurrent openings.

### Responses

- responses are durable reflective writing events attached to thread context.
- responses can update thread activity weight and continuity strength.

### Notes

- notes provide local context and can refine thread center over time.

### Continuation Logic

- continuation is triggered by new responses, highlight activity, motif recurrence, or explicit revisit.

### Re-entry Logic

- re-entry restores reflective continuity context (active thread center + nearby anchors).

### Fading / Dormancy

- inactivity and reduced relevance can move thread toward dormant/background state.
- dormancy is reversible by recurrence or user revisit.

### Thread-to-Highlight Relationships

- N:M: multiple highlights can support one thread; one highlight can relate to multiple threads.

### Thread-to-Glossary Relationships

- N:M motif linkage enables continuity-aware resurfacing and contextual invitations.

## Reflective Dialogue Contract

### AI Question Philosophy

- questions are attention invitations, not workflow tasks.
- prefer fewer, higher-quality, context-grounded invitations.

### Opening vs Question Distinction

- opening: broader reflective possibility object, can exist without explicit question form.
- question: a possible phrasing of an opening for active dialogue moment.

### Tone Constraints

- calm, non-dogmatic, non-diagnostic, non-coercive.
- avoid interpretive certainty language.

### Reflective Invitation Rules

- attach invitations to concrete thread/highlight/motif/evidence context.
- keep optional and easy to ignore.

### Ambiguity Preservation

- preserve multiple plausible readings.
- invite resonance checks, not verdict acceptance.

### Non-authoritative Rules

- never claim definitive symbolic or psychological truth.
- always preserve user final authority of meaning.

### When AI Should NOT Ask

- when context quality is weak/unsupported
- when user is in active uninterrupted reflective writing flow
- when repeated prompts would create interrogation pressure
- when recent invitations were explicitly dismissed/deferred

## Runtime Payload Direction

### Observation Payload Direction

- canonical internal descriptive payload
- selective derivative signals to orientation/highlight candidate pathways

### Latent Payload Direction

- internal probabilistic hypothesis payload
- transformed outputs only for user-facing openings/lens cues

### Highlight Payload Direction

- user-visible anchor payload with provenance/state
- source/evidence refs for thread and glossary linkage

### Glossary Payload Direction

- continuity memory payload (candidate/pinned/recurrence/suppression)
- user-facing contextual cues only

### Reflective Thread Payload Direction

- continuity payload combining lifecycle, attachments, and activity signals
- user-visible thread state + context slices

## User-facing vs Internal Runtime Signals

- User-facing:
  - highlights and their states
  - glossary candidate/pinned cues
  - reflective openings/invitations
  - thread lifecycle visibility
  - responses/notes
- Internal:
  - raw latent hypotheses and confidence
  - raw ranking/weighting vectors
  - low-level observation extraction internals
  - orchestration diagnostics

## Cross-session Continuity Model

- continuity is built from:
  - glossary recurrence
  - thread reactivation patterns
  - highlight motif recurrence
  - latent continuity inference
- continuity affects surfacing priority and re-entry cues.
- continuity does not create mandatory workflow steps.

## Attention Lens Interaction Model

- attention lenses are soft weighting controls influencing:
  - opening selection style
  - motif/context emphasis
  - thread resurfacing priorities
- lenses may be user-selected and/or system-suggested.
- lenses should be persisted as:
  - current state (`attention_lenses`)
  - event history (`attention_lens_events`)
- lenses cannot hard-lock reflective path progression.

## Future API Implications

- separate layer-oriented contract surfaces are likely needed:
  - observation generation/refresh
  - latent inference/refresh
  - highlight lifecycle operations
  - glossary candidate/pin/suppress operations
  - thread/opening/response/note lifecycle operations
  - lens selection/state operations
- API responses should distinguish:
  - internal objects (never exposed raw)
  - transformed user-facing reflective objects.

## Future Schema Implications

- requires first-class thread/opening/response/note entities.
- requires unified highlight target model with provenance + dismissal memory.
- requires glossary candidate/pinned/suppression state model.
- requires orientation unification and preserved internal observation/latent substrates.
- requires attachment/join structures across highlights, glossary terms, openings, responses, and threads.

## Explicit Non-goals

- no final SQL schema definitions
- no endpoint path finalization
- no route/layout redesign
- no implementation sequencing details beyond runtime contract boundaries
- no legacy runtime hard-binding where it conflicts with reflective target architecture

## Open Questions

- What minimum evidence threshold should gate opening generation from latent candidates?
- Should thread closure be explicit user action, implicit dormancy, or both?
- How aggressively should suppressed glossary motifs be retained in internal ranking?
- What is the required parity window for legacy `dream_answers` during response cutover?
- Should cross-session thread identity remain deferred until post-alpha?
- Which attention lens defaults should be system-provided vs user-defined?

## Recommended Next Documents

- `docs/plans/lumira-reflective-runtime-compat-contract-v0.md`
- `docs/plans/lumira-reflective-thread-state-machine-v0.md`
- `docs/plans/lumira-reflective-opening-generation-policy-v0.md`
- `docs/plans/lumira-reflective-glossary-surfacing-policy-v0.md`
- `docs/plans/lumira-reflective-observation-latent-payload-contract-v0.md`
