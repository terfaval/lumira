# Observation Architecture Completion Roadmap v1

Date: 2026-05-25  
Scope: Post-guardrail roadmap (clean-room aligned, implementation-aware)

## Purpose

Track remaining work after Observation Semantic Boundary Guardrails v1 so Observation can evolve toward B-level richness without boundary collapse.

This is a practical staged roadmap, not a speculative redesign.

---

## 1) Foundations Completed (Phase 11 + Phase 13 Baseline)

- Semantic ingress guard exists at Observation write boundary.
- Semantic result model active: `accept`, `accept_with_uncertainty`, `reject_interpretive`, `defer_insufficient_evidence`.
- Provenance tier field and boundary metadata persisted.
- Fragment evidence adequacy seam persisted (`strong_span`, `snippet_only`, `weak_fallback`).
- Summary-to-fragment trace seam persisted (`summary_trace`).
- Latent backflow guard explicitly enforced at ingress and repository write boundary.
- Recurrence candidate semantics hardened (descriptive cue + evidence-aware trust behavior).
- First B-level ontology slice added as first-class Observation categories: `agency_state`, `metacognitive_moment`.
- Extraction scaffold supports explicit agency/metacognitive cue detection.
- Semantic policy coherence checks include category-level guarding for agency/metacognition.
- Thin latent consumption seam for agency/metacognition added as `internal_only` low-confidence signal.
- Minimal schema/category constraints extended for observation fragments and glossary source-category linkage.
- Second B-level ontology slice added as first-class Observation categories:
  - `affect_transition`
  - `emotional_contradiction`
  - `affective_atmosphere`
- Semantic policy now rejects affective interpretive authority language and validates new affect category coherence.
- Extraction scaffold supports explicit affect-transition, contradiction, and atmosphere cues.
- Latent seam now supports affect-structure consumption as `internal_only` low-confidence substrate.
- Additive schema/category constraints extended for affect slice categories.
- Third B-level ontology slice added as first-class Observation categories:
  - `spatial_instability`
  - `dream_state_quality`
  - `continuity_fragment`
  - `altered_realism`
- Semantic policy now rejects metaphysical/spiritual authority language while allowing bounded phenomenological wording.
- Extraction scaffold supports bounded spatial/dream-state instability cues with conservative fallback behavior.
- Additive schema/category constraints extended for spatial/dream-state slice categories.

---

## 2) Remaining Ontology Gaps (B-Level)

- Local phenomenological relation modeling with ambiguity-preserving wording constraints remains unimplemented.
- Agency transition granularity (e.g., evolving control states) remains partial.
- Metacognitive transition granularity (emergence/fade/oscillation) remains partial.
- Affective density/intensity calibration remains partial (no fine-grained strength model yet).
- Affective atmosphere nuance remains cue-based (no richer scene-level phenomenology model yet).

---

## 3) Future B-Level Expansion Tasks

1. Add thin category expansion strategy with backwards-compatible adapters.
2. Add category-specific coherence validators (per dimension).
3. Add confidence language calibration by evidence adequacy tier.
4. Add object-type-aware descriptive profiles (dream/journal/memory/note safe defaults).
5. Expand recurrence into structured continuity hints while keeping non-interpretive contract.

---

## 4) Future C-Level Deferred Systems (Latent-Side)

- Continuity-weight estimation.
- Symbolic density and resonance scoring.
- Relational dynamic inference.
- Narrative identity trajectory modeling.
- Cross-object latent continuity clustering.

Constraint: these remain latent-side and must not auto-promote into durable Observation truth.

---

## 5) Latent Recalibration Needs

- Reweight latent recurrence trust using semantic policy + evidence adequacy tiers.
- Add provenance-tier-sensitive latent confidence shaping.
- Keep latent outputs probabilistic and invitation-safe before any surfacing expansion.
- Add explicit contract tests for "no latent -> observation backflow" across pipelines.

---

## 6) Reflective-Space Surfacing Considerations

- Keep Observation richness mostly substrate-facing; avoid raw analysis theater.
- Preserve section caps, omission legitimacy, and calm pacing defaults.
- Introduce selective surfacing rules by confidence + evidence + user salience.
- Validate wording drift continuously against interaction grammar constraints.

---

## 7) Evidence / Provenance Future Work

- Add summary trace quality checks (`trace_strength` rollups).
- Add fragment-level lineage IDs for import/transformation chains.
- Add evidence adequacy audit metrics and dashboards (internal only).
- Add explicit review path for `reviewed` provenance tier escalation.

---

## 8) Extraction / Runtime Future Work

- Replace keyword-heavy fallback classification with bounded descriptive extractor modules per dimension.
- Introduce uncertainty-first degradation behavior when evidence is sparse.
- Add partial-structure handling that prefers omission over inferred coherence.
- Add regression tests for phenomenological allowed meaning vs interpretive rejection edge cases.

---

## 9) Migration / Debt Notes

- Existing observations pre-guardrail rely on migration defaults for new boundary columns.
- Backfill strategy needed for historical `summary_trace` and `evidence_adequacy` quality uplift.
- Legacy placeholder composition paths should remain quarantined from production write flows.
- Schema remains intentionally thin; avoid introducing broad graph/meta layers before B-level stabilization.

---

## 10) Sequencing Recommendations

1. Stabilize guardrail telemetry and false-positive/false-negative review loop.
2. Implement B-level ontology increments in small category slices (one dimension family per ticket).
3. Recalibrate latent trust behavior after each ontology slice.
4. Add surfacing adjustments only after ontology + latent calibration pass.
5. Re-run architecture audit after first two B-level slices before C-level deferred work.

---

## Final Note

Phase 11 through Phase 13 are bounded hardening plus narrow ontology slices, not ontology completion.  
The next steps should keep the same discipline: safer boundaries first, richer cognition second.
