# Reflective Direction Model v1

Date: 2026-05-31  
Type: PLAN / AUDIT / REFLECTION-ARCHITECTURE  
Status: Draft (model-layer only; no runtime/schema changes)

## Purpose

Define the first bounded set of reflective directions that Lumira can recommend without violating non-interpretive constraints, and assess present architecture readiness.

This document includes:
- direction set v1,
- eligibility evidence requirements,
- direction-to-data-source availability mapping,
- retrieval capability audit,
- readiness assessment.

## Scope and Non-Goals

In scope:
- direction definitions and tiering
- evidence thresholds for eligibility
- architectural availability audit
- readiness and constraints for near-term use

Out of scope:
- runtime redesign
- latent/opening/dialogue redesign
- migrations or implementation planning
- symbolic interpretation expansion

## Source Basis

Canonical:
- `docs/canon/LUMIRA-CONSTITUTION-v1.md`
- `docs/canon/LUMIRA-MINIMAL-REFLECTIVE-RUNTIME-v1.md`
- `docs/canon/Observation_Latent_Glossary_Work_Redesign_Handoff.md`

Runtime:
- `docs/runtime/latent-opening-dialogue-boundary-contract-v1.md`
- `docs/runtime/latent-governance-primitives-v1.md`
- `docs/runtime/latent-processing-modes-and-architecture-clarifications-v1.md`

Recent audits:
- `docs/superpowers/audits/2026-05-26-latent-governance-build-review-v1.md`
- `docs/superpowers/audits/2026-05-26-latent-architecture-audit-v1.md`
- `docs/superpowers/audits/2026-05-26-reflective-space-experiential-convergence-audit-v1.md`

---

## Part B - Reflective Direction Set v1

## Tier 1 - Always Available (single-dream eligible)

1. Emotional Focus
- Lens: emotional tone, shifts, density, unresolved affective carryover.
- Output posture: "what is felt here" and "where emotional gravity appears."

2. Relational Focus
- Lens: interpersonal structure, closeness-distance, authority/support/conflict dynamics.
- Output posture: "how relationship patterns appear in the material."

3. Agency Position Focus
- Lens: capacity to act, blocked movement, helplessness, partial recovery of agency.
- Output posture: "how action and constraint appear."

4. Imaginal/Creative Focus
- Lens: imagery fields, atmospheres, motifs, scene qualities, dream-state texture.
- Output posture: "what imaginal material invites attention," without symbolic decoding.

## Tier 2 - Requires Sufficient Dream Material (longitudinal)

5. Change Focus
- Lens: shifts across dreams in emotion, agency, and relational posture.
- Output posture: "how the material is changing over time."

6. Dream-to-Dream Continuity Focus
- Lens: recurrence and continuity lines across multiple dreams.
- Output posture: "what seems to echo across entries."

## Tier 3 - Requires User Participation

7. Dream-to-Life Reflection Focus
- Lens: user-authored links between dream material and waking-life context.
- Output posture: "possible bridges the user wants to examine."
- Constraint: no autonomous life-meaning claims by Lumira.

Model critique outcome:
- Candidate set is directionally sound.
- "Agency/Helplessness" is refined to "Agency Position" to avoid binary collapse.
- "Imaginal/Creative" is retained but explicitly constrained to non-symbolic exploration.

---

## Part C - Direction Eligibility Matrix

Eligibility classes:
- `Minimum`: smallest evidence required to allow direction.
- `Stronger`: evidence level at which direction is likely useful and stable.

| Direction | Minimum evidence | Stronger evidence |
|---|---|---|
| Emotional Focus | 1 dream with at least 1 explicit affect marker or clear emotional transition in Observation | 2+ affect-linked fragments plus one user salience signal (note/highlight/response) |
| Relational Focus | 1 dream with at least 1 actor interaction or relational tension marker | 2+ relational fragments across 1-2 dreams with consistent interaction posture |
| Agency Position Focus | 1 dream with at least 1 agency-state fragment (blocked/acted/fled/froze/chose) | 2+ agency-state fragments, ideally with contrasted moments (blocked vs acted) |
| Imaginal/Creative Focus | 1 dream with vivid scene/motif/atmosphere material in Observation | Repeated imaginal motif or atmosphere across 2+ dreams or user-marked salience |
| Change Focus | 3 dreams over time with comparable emotional/agency/relational observations | 4+ dreams with at least 2 clear directional shifts and no strong uncertainty collapse |
| Dream-to-Dream Continuity Focus | 3 dreams with at least 1 recurrence candidate repeated | 4+ dreams with 2+ continuity lines supported by glossary or user notes |
| Dream-to-Life Reflection Focus | explicit user participation (response, note, or consented bridge prompt) | repeated user-authored bridges across sessions with preserved ambiguity |

Notes:
- "Dream count" is a governance minimum, not a truth threshold.
- If uncertainty is high and evidence is weak, eligibility should degrade to no-direction/silence.

---

## Part D - Direction -> Data Source Matrix

Legend:
- `A` = available now
- `P` = partially available
- `M` = missing as a reliable source for this direction

Sources:
- Observation
- Latent
- Glossary
- Glossary Notes
- Responses
- Previous Reflective Objects
- Openings
- Dialogue History

| Direction | Observation | Latent | Glossary | Glossary Notes | Responses | Previous Reflective Objects | Openings | Dialogue History |
|---|---|---|---|---|---|---|---|---|
| Emotional Focus | A | A | P | P | P | A | P | P |
| Relational Focus | A | A | P | P | P | A | P | P |
| Agency Position Focus | A | A | P | P | P | A | P | P |
| Imaginal/Creative Focus | P | P | P | P | P | A | P | P |
| Change Focus | P | P | P | P | P | A | P | P |
| Dream-to-Dream Continuity Focus | P | P | A | A | P | A | P | P |
| Dream-to-Life Reflection Focus | M | M | P | P | A | P | P | P |

Interpretation:
- Tier 1 directions are mostly supportable from current Observation + Latent + object history.
- Tier 2 depends on longitudinal retrieval quality that is present but still coarse/partial in audits.
- Tier 3 is primarily user-authored today; system-side life-bridge substrate is limited.

---

## Part E - Retrieval Capability Audit

| Retrieval capability | Status | Audit classification |
|---|---|---|
| Dream-to-dream continuity retrieval | PARTIAL | Exists through persisted observations/latent/object history, but longitudinal anti-amplification and locality discipline are still limited. |
| Glossary relationship retrieval | PARTIAL | Glossary terms/notes exist; locality and relation weighting remain coarse and lexical-heavy. |
| Response relationship retrieval | PARTIAL | Response lineage exists and has bounded provenance semantics, but bridge semantics are thin. |
| User salience retrieval | MISSING / PARTIAL | Core user-salience concept exists philosophically, but highlight/salience channels are not fully integrated into runtime scoring. |
| Dream-to-life bridge support | PARTIAL | Can rely on user responses and dialogue traces, but no dedicated architecture contract for life-context bridge semantics. |
| Opening lineage retrieval | EXISTS | Opening activation/suppression and response association persistence are implemented and auditable. |
| Dialogue history retrieval | PARTIAL | Dialogue exists as bounded read-model lineage, not as a full persistent dialogue engine. |
| Reflective neighborhood retrieval | PARTIAL | Local-first controls improved, but continuity neighborhoods remain heuristic and not fully topology-modeled. |

Architecture recommendations (non-implementation):
- treat continuity retrieval as probabilistic scaffolding, not a truth engine;
- require user participation for any dream-to-life bridge direction;
- preserve "no-direction" as a first-class outcome under weak or ambiguous retrieval.

---

## Part F - Direction Readiness Assessment

Readiness classes:
- `Ready now`: can be supported with current architecture and guardrails.
- `Constrained`: partially supportable; should remain conservative.
- `Aspirational`: depends on missing participation or infrastructure maturity.

| Direction | Readiness | Why |
|---|---|---|
| Emotional Focus | Ready now | Strongest fit with current Observation + bounded Latent orientation posture. |
| Relational Focus | Ready now | Relational fragments and latent relational orientation are available and bounded. |
| Agency Position Focus | Ready now | Agency states are represented and align with existing non-interpretive mode posture. |
| Imaginal/Creative Focus | Constrained | Supportable as descriptive imaginal attention; deeper symbolic handling is intentionally out of scope. |
| Change Focus | Constrained | Needs denser longitudinal material and stronger cross-snapshot stability semantics. |
| Dream-to-Dream Continuity Focus | Constrained | Possible today, but should remain conservative due recurrence/scope drift risks identified in audits. |
| Dream-to-Life Reflection Focus | Aspirational (user-led only today) | Requires explicit user participation and more mature bridge semantics to avoid interpretive overreach. |

---

## Final Question - Companion-Readiness Answer

If Lumira became a reflective companion tomorrow:

Directions it could already support well:
- Emotional Focus
- Relational Focus
- Agency Position Focus

Directions it could support carefully but only in constrained form:
- Imaginal/Creative Focus
- Change Focus
- Dream-to-Dream Continuity Focus

Directions that remain mostly aspirational without stronger participation/infrastructure:
- Dream-to-Life Reflection Focus (except strictly user-led, ambiguity-preserving usage)

Final boundary check:
- direction recommendation is allowed,
- meaning conclusion is not.

