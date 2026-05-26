# Observation Boundary Hardening Plan v1

Date: 2026-05-25  
Type: PLAN / AUDIT / COGNITION-BOUNDARY  
Scope: Architecture hardening plan only (no implementation in this ticket)

## Ticket Protocol

### 1) Goal restatement
- Define how Observation can become phenomenologically richer without becoming interpretive.
- Harden Observation -> Latent boundaries so latent sophistication cannot silently corrupt descriptive truth.
- Establish evidence/provenance and persistence boundaries that remain safe under B-level and future C-level expansion.
- Keep reflective-space pacing calm and non-authoritative while Observation richness increases.

### 2) Touched files
- New: `docs/superpowers/plans/2026-05-25-observation-boundary-hardening-plan-v1.md`

### 3) Implementation steps (for this planning ticket)
1. Read canonical and ticket-mandated philosophy/runtime docs (using current canonical locations).
2. Audit current write paths in `app/api`, domain contracts, cognition modules, Supabase repositories/migrations.
3. Map contamination and drift risks at Observation and Observation-adjacent boundaries.
4. Produce hardening strategy and sequencing guidance without proposing runtime redesign.

### 4) Acceptance criteria (DoD)
- Observation write-path map delivered.
- Descriptive boundary strategy delivered.
- Ontology compatibility matrix delivered.
- Future expansion seam plan delivered.
- Evidence discipline recommendations delivered.
- Durable vs ephemeral plan delivered.
- Reflective-space safety notes delivered.
- Observation anti-hallucination rules delivered.

### 5) Testing / validation plan
- Validation method is code-and-doc audit only (no runtime mutation).
- Source cross-check coverage:
  - `app/api/reflective-objects/[id]/observations/route.ts`
  - `src/domain/observation/http-contract.ts`
  - `src/cognition/observation/descriptive-observation-scaffold.ts`
  - `app/api/reflective-objects/[id]/latent-snapshots/route.ts`
  - `src/cognition/latent/latent-engine.ts`
  - `app/api/latent/snapshots/[id]/openings/route.ts`
  - `src/cognition/openings/derive-opening-candidates-from-latent.ts`
  - `src/cognition/openings/opening-cadence-policy.ts`
  - `supabase/migrations/20260524_0003_observations.sql`
  - `docs/canon/OBSERVATION-ONTOLOGY-PLANNING-v2.md`

### 6) Rollback plan
- Not applicable (plan document only).

---

## 0. Scope Clarification

This plan hardens boundaries around Observation semantics and downstream contamination risk.  
It does not define schema migrations, extraction algorithm rewrites, or latent redesign internals.

---

## 1) Observation Write-Path Map

## 1.1 Direct Observation writes

| Path | Write Type | Source Actor | Current Validation | Provenance | Risk |
|---|---|---|---|---|---|
| `POST /api/reflective-objects/[id]/observations` | Manual/API write to `observations` + `observation_fragments` | Client caller (human/UI/service) | Structural only (`source`, non-empty `summary`, fragments/evidence shape, enum checks) | `source`, fragment evidence snippet/span/context, uncertainty notes | HIGH |
| `SupabaseObservationRepository.create` | Durable insert | Repository layer | None beyond DB constraints | DB timestamps + ownership FKs | MEDIUM |

Key finding:
- The active Observation ingress accepts free-form semantic content in `summary` and `fragmentText` if structure is valid.
- No explicit descriptive-vs-interpretive semantic gate currently blocks authoritative phrasing.

## 1.2 Observation-adjacent derived writes (downstream)

| Path | Write Type | Dependency | Contamination Surface | Risk |
|---|---|---|---|---|
| `POST /api/reflective-objects/[id]/latent-snapshots` | Derived latent snapshot write | Observations + glossary + threads + responses | Recurrence and continuity framing can amplify weak or interpretive observation labels | HIGH |
| `POST /api/reflective-objects/[id]/glossary-candidates` | Derived glossary candidate upsert | Observation fragments | Repeated fragment labels can become recurrence memory substrate | MEDIUM |
| `POST /api/latent/snapshots/[id]/openings` | Derived openings write | Latent suggestions | Observation-origin drift can surface as invitation text despite sanitizers | MEDIUM |

## 1.3 System-generated Observation potential path

`DescriptiveObservationEngine` + `buildDescriptiveObservationScaffold` exists, but is not the active automatic write owner route today.  
It is still critical because future adoption could reintroduce heuristic category drift unless hardened.

## 1.4 Missing write-path controls

- No semantic boundary classifier in Observation POST path.
- No explicit provenance tiering (`manual_user`, `system_extract`, `imported_transform`, `reviewed`) beyond two coarse source enums.
- No quarantine state for low-confidence or policy-violating observation payloads.
- No dedicated update route, but DB policy permits updates; boundary rules for future patch/edit paths are undefined.

---

## 2) Descriptive Boundary Strategy

## 2.1 Contract objective

Encode Observation as a bounded descriptive contract:
- Allowed: phenomenological description, explicit local emotional relation, experiential structure, dream-state descriptors.
- Forbidden: psychological verdicts, symbolic certainty claims, hidden-cause explanations, identity diagnosis language.

## 2.2 Boundary hardening layers (architecture direction)

1. Ingress semantic gate (Observation write boundary):
   - Keep existing structural validation.
   - Add semantic validation pass for `summary` + `fragmentText`:
     - reject explicit authoritative interpretation,
     - or downgrade to uncertainty-tagged candidate state (non-durable surface) per policy.

2. Category-intent coherence checks:
   - Validate that fragment category and wording remain descriptive.
   - Flag mismatches (for example symbolic causality phrasing inside `emotion`/`recurrence_candidate`).

3. Provenance-weighted trust:
   - Observations from different origins should carry different downstream trust weights.
   - Latent/opening derivation should weight by provenance and evidence quality, not only category presence.

4. Latent-boundary firewall:
   - Observation may inform latent hypotheses.
   - Latent hypotheses must never back-write into durable Observation text/categories automatically.

## 2.3 Suggested semantic policy outcomes

- `accept`: descriptive and evidence-linked.
- `accept_with_uncertainty`: weak but non-interpretive; include explicit uncertainty marker.
- `reject_interpretive`: contains forbidden authoritative interpretation.
- `defer_insufficient_evidence`: claims exceed evidence anchoring quality.

---

## 3) Ontology Compatibility Matrix (Current vs B-Level Target)

Reference target: `docs/canon/OBSERVATION-ONTOLOGY-PLANNING-v2.md`

| Dimension | Current State | Compatibility | Notes |
|---|---|---|---|
| Scene structure | `scene`, `transition` categories exist | PARTIAL | Scene fragmentation/continuity detail is under-modeled. |
| Actors/presence | `actor` category exists | PARTIAL | Presence nuance and relational tone are mostly free text. |
| Interactions | `interaction` category exists | PARTIAL | Interaction tone/asymmetry not explicit. |
| Agency states | No dedicated category | GAP | Currently diffused across `interaction`, `emotion`, `body_state`, `dream_quality`. |
| Emotional/affect structure | `emotion` category exists | PARTIAL | Emotional transitions/contradictions are not first-class. |
| Embodiment | `body_state` exists | PARTIAL | Good start, but limited expressivity for altered embodiment phenomena. |
| Spatial structure | `location` category exists | PARTIAL | No explicit spatial instability model. |
| Dream-state qualities | `dream_quality` exists | PARTIAL | Metacognition/lucidity gets collapsed here. |
| Metacognitive moments | No dedicated category | GAP | Must be separable from generic dream quality. |
| Local meaning relations | Implicit in free text | PARTIAL | Needs explicit bounded descriptive relation rules. |
| Recurrence handling | `recurrence_candidate` category exists | CONFLICT-PRONE | Useful seam, but high leakage risk into interpretation and latent overreach. |

Pressure conclusion:
- Current ontology is a transitional scaffold, not yet a stable B-level descriptive substrate.
- Expansion should prioritize missing phenomenological dimensions before adding latent sophistication.

---

## 4) Future C-Level Expansion Seam Plan

## 4.1 Seams that should exist now

- Stable Observation core with descriptive-only invariants.
- Explicit separation of:
  - durable descriptive facts,
  - optional uncertainty metadata,
  - non-durable ranking/weighting overlays.
- Provenance lineage fields that survive cross-object continuity usage.
- Policy hook points for object-type-specific descriptive profiles.

## 4.2 Structures to keep deferred (latent-side)

- Continuity weight estimation.
- Symbolic density estimates.
- Relational dynamic inference.
- Narrative identity trajectories.
- Attachment/conflict hypotheses.
- Cross-object interpretive clustering.

## 4.3 Non-negotiable boundary

Future latent overlays may attach to Observation lineage, but must not overwrite durable Observation semantics or categories.

---

## 5) Evidence Discipline Recommendations

## 5.1 Current strengths

- Every fragment has evidence snippet requirement.
- Optional span metadata exists.
- Downstream latent/openings carry source provenance arrays.

## 5.2 Gaps

- Evidence spans are often nullable by design; weak anchoring can pass.
- No minimum evidence adequacy policy by category/confidence.
- Summary text can contain claims not explicitly linked to fragment-level evidence.

## 5.3 Recommendations

1. Require evidence adequacy scoring per fragment:
   - `strong_span`, `snippet_only`, `weak_fallback`.
2. Disallow high-certainty or recurrence-forward phrasing when evidence tier is weak.
3. Require summary-to-fragment trace mapping (explicit linkage, not free-floating summary assertion).
4. Preserve lineage IDs across latent/opening derivation and UI surfacing for inspectability.

---

## 6) Durable vs Ephemeral Observation Plan

## 6.1 Durable (keep as canonical)

- Observation records that pass descriptive boundary checks.
- Evidence-linked fragments and uncertainty notes.
- Provenance minimals required for lineage.

## 6.2 Ephemeral (runtime-only or degradable)

- Extraction confidence/ranking scores.
- Candidate-level semantic alerts or policy flags.
- Temporary salience/recurrence weighting.
- Latent-derived overlays and opening surfacing decisions.

## 6.3 Persistence hardening rule

If structure is probabilistic, ranking-oriented, or interpretive-hypothesis-adjacent, default to ephemeral unless explicitly justified durable.

---

## 7) Reflective-Space Safety Notes

## 7.1 Compatibility strengths now

- Viewport composition already enforces bounded density, section caps, and payload guardrails.
- Opening generation requires explicit user invocation boundary.
- Cadence/suppression policy supports contemplative pacing.

## 7.2 Risks from richer Observation

- Over-surfacing raw analysis could create machine-analysis theater.
- Recurrence-heavy fragments may pressure synthetic coherence in orientation layers.
- Weakly grounded emotion/agency claims could escalate emotional pressure.

## 7.3 Safety constraints for surfacing

- Observation richness should mostly feed latent substrate and selective cues, not full raw dumps.
- Surface only bounded, invitation-safe derivatives.
- Preserve omission legitimacy: zero surfaced opening/cue is valid.

---

## 8) Observation Anti-Hallucination Rules

1. Omission over invention: if evidence is weak, skip or mark unresolved.
2. Adjacency is not meaning: co-occurrence cannot create hidden-cause claims.
3. Recurrence is not verdict: repeated motif/fragment does not imply explanation.
4. Phenomenology first: describe what is present before any continuity abstraction.
5. Confidence-constrained language: lower evidence/confidence must reduce assertion strength.
6. No symbolic forcing: ban definitive symbolic equations in Observation layer.
7. No diagnostic voice: prohibit pseudo-clinical framing in Observation payloads.
8. No latent backflow: latent hypothesis text cannot auto-promote into Observation truth.
9. Summary must be traceable: each strong summary claim needs fragment lineage support.
10. Preserve contradiction: conflicting observations can coexist without forced normalization.

---

## 9) Sequencing Recommendations (Implementation-Ready Direction, Not Build Spec)

1. Boundary first:
   - Add semantic guardrails to Observation write ingress before ontology expansion.
2. Evidence discipline next:
   - Introduce evidence adequacy tiers and summary trace linkage.
3. Ontology enrichment third:
   - Add missing descriptive dimensions (agency, metacognition, affect transitions) with strict non-interpretive contract.
4. Latent integration fourth:
   - Recalibrate latent/opening derivation to consume richer observation safely by provenance-weighted rules.
5. Persistence policy enforcement fifth:
   - Formalize durable vs ephemeral storage boundaries for new dimensions and overlays.

---

## Final Principle Check

The hardening direction is viable if expansion order is respected:
- do not add richness before semantic boundary controls,
- do not expand latent authority before evidence/provenance discipline is tightened.

Target state remains:

Observation becomes richer without becoming more authoritative.
