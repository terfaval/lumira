# Observation Architecture Audit v1

Date: 2026-05-25  
Scope type: AUDIT / ARCHITECTURE / COGNITION  
Authoring context: Clean-room reflective runtime review (no redesign spec in this ticket)

## Ticket Protocol

### 1) Goal restatement
- Audit the current Observation layer against Lumira’s reflective-space-first constitutions.
- Determine whether Observation remains descriptive, evidence-linked, ambiguity-preserving, and non-authoritative.
- Identify contamination and drift risks at the Observation -> Latent -> Opening boundary.
- Assess whether the current scaffold can safely support future reflective-object generality and reflective-space pacing.

### 2) Touched files
- New: `docs/superpowers/audits/2026-05-25-observation-architecture-audit-v1.md`

### 3) Implementation steps
1. Reviewed required canonical philosophy/runtime/governance corpus (using current canonical/archive locations).
2. Mapped current Observation/Latent/Openings code paths, repositories, and migrations.
3. Evaluated architecture against the 10 audit scope areas from ticket.
4. Produced architecture map, risk map, ontology pressure map, and future-facing guardrails.

### 4) Acceptance criteria (DoD)
- Current-state architecture map delivered.
- Conceptual risk map with severity delivered.
- Observation ontology pressure map delivered.
- Future-facing recommendations delivered without turning into a redesign plan.

### 5) Testing/validation plan
- Validation method for this ticket is documentary/code audit with source cross-checking.
- No runtime behavior or schema mutation executed.

### 6) Rollback / feature flag
- Not applicable (audit-only ticket; no runtime changes).

---

## Canonical Context Used

Requested paths were partially moved in this repository; equivalent canonical/archive documents were used:
- Canon: `docs/canon/*` (constitution, minimal runtime, technical constitution, schema/build, IA/thread/interaction/composer, interaction model, observation-latent handoff).
- Governance/rollout: `docs/archive/legacy-transition/*` for route ownership and summary/re-entry criteria.
- Audit baseline: `docs/archive/audits/alpha-runtime-truth-matrix.md`.
- Stabilization context: `docs/STABILIZATION_LEDGER.md`.

---

## A) Current-State Architecture Map

## A1. Primary entities and ownership
- Reflective Object is the canonical substrate and currently supports: `dream`, `journal_entry`, `memory`, `reflective_note`.
- Observation is persisted as `observations` + `observation_fragments`; object-owned, user-owned via RLS.
- Latent is persisted as `latent_snapshots` + `latent_signals` + `latent_suggestions`; internal-cognition-facing but directly queryable by user-scoped API.
- Openings are persisted with explicit suppression/cadence lifecycle and provenance back to latent/object/observation/glossary/thread/response IDs.

## A2. Generation flow (actual implemented)
1. User creates reflective object (`POST /api/reflective-objects`).
2. Observation creation is currently explicit/manual (`POST /api/reflective-objects/[id]/observations`) and accepts fully supplied summary/fragments payload.
3. Latent scaffold generation is route-driven (`POST /api/reflective-objects/[id]/latent-snapshots`) by reading existing observations, glossary terms, threads, responses and producing a scaffolded snapshot.
4. Opening generation is explicit (`POST /api/latent/snapshots/[id]/openings`) and hard-gated by `userInvocationBoundary=expand_opening_surface`, then cadence/suppression policies are applied.
5. Reflective-space viewport (`GET /api/reflective-space/viewport`) composes bounded sections from repositories; observations are read from persisted object-scoped observations; glossary cues are derived from observation fragments.

## A3. Reflective-space surfacing points
- Observation surfacing: viewport `sections.observations` and UI “Observation Orientation”.
- Latent direct surfacing: mostly indirect via openings; direct latent hints are not used in active viewport read model.
- Opening/dialogue surfacing: explicit activation, suppression, response authoring, bounded dialogue archive window.
- Continuity surfacing: thread surfaces + glossary cues + response surfaces, all bounded by limits and payload guardrails.

## A4. Persistence boundary (actual)
- Durable now:
  - Reflective objects
  - Observations + fragments
  - Glossary terms/candidates/associations
  - Threads + associations
  - Responses + associations
  - Latent snapshots/signals/suggestions
  - Openings + suppressions + activation events + opening-response associations
- Ephemeral/derived now:
  - Viewport section ordering/composition
  - Glossary cues derived from observations in read path
  - Dialogue window pagination cursor derivations

## A5. Notable architecture drift signals
- `get-reflective-space-viewport.ts` + assembler path appears to be placeholder/legacy composition code with synthetic objects and ephemeral observation/latent/opening generation and is not currently called by runtime routes.
- Active route uses `compose-reflective-space-viewport.ts` (bounded read composition), creating dual composition paradigms in repo.

---

## B) Conceptual Risk Map

| Risk | Severity | Why it matters |
|---|---|---|
| Manual Observation payload acceptance allows interpretive content injection | CRITICAL | Observation route trusts caller-provided summary/fragments; descriptive boundary can be bypassed silently. |
| Observation ontology is too narrow for target phenomenology | HIGH | Missing explicit dimensions (agency states, metacognition, emotional transitions, spatial logic) forces collapse into coarse categories or text blobs. |
| Observation generation scaffold is lexical/heuristic and sentence-split based | HIGH | Current extraction is weakly phenomenological and prone to taxonomy collapse and false confidence in labels. |
| Observation evidence anchoring is weak (mostly snippet, many null spans) | HIGH | Evidence lineage may degrade at scale; difficult to prove traceability for nuanced fragments. |
| Observation -> Latent contamination path is policy-based, not type-hard | HIGH | Latent is scaffolded from observation categories (e.g., `recurrence_candidate`) and can indirectly shape future observation authoring conventions. |
| Latent snapshots are internally framed but externally retrievable in full | MEDIUM | Increases chance of raw internal cognition being surfaced as user truth by future routes/UI changes. |
| Thread/opening state vocab diverges from canonical thread lifecycle docs | MEDIUM | Current states (`active/dormant/quiet/archived`) are simpler than conceptual lifecycle; migration drift risk rises during convergence. |
| Reflective-object type set is constrained vs future object generality target | MEDIUM | Current model supports some non-dream types, but many anticipated object types remain unsupported. |
| Two viewport composition implementations in codebase | MEDIUM | Unused placeholder pipeline can reintroduce synthetic behavior or confusion in future modifications. |
| Glossary cue derivation from observation text can over-promote repeated labels | MEDIUM | Recurrence phrasing may become pseudo-coherent continuity pressure without sufficient evidential breadth. |
| Openings cadence policy rejects low-confidence candidates categorically | LOW | Good for pressure control, but may hide useful “uncertain but gentle” openings if too strict later. |
| Summary stringing in viewport is static/generic | LOW | Not harmful now, but limits orientation nuance and can mask missing descriptive quality. |

### Explicit contamination risks (requested)
- Observation contamination by caller-injected interpretation via manual POST payload.
- Latent-to-observation contamination by reinforcing fragile `recurrence_candidate` labeling into continuity logic.
- Opening surfacing contamination if latent phrasing safeguards are weakened (currently marker-based sanitize only).
- Glossary contamination when interpretive fragments slip into observation and are then promoted as recurrence memory.

---

## C) Observation Ontology Pressure Map

## C1. What currently counts as an Observation (implemented)
- A persisted object with:
  - one summary string,
  - uncertainty notes array,
  - ordered fragments each with category + fragment text + evidence snippet/span/context.
- Category set: `scene`, `actor`, `interaction`, `emotion`, `location`, `transition`, `object`, `body_state`, `dream_quality`, `recurrence_candidate`.

## C2. Strengths
- Clear descriptive intent in domain docs and type contracts.
- Evidence fields are structurally required for fragments.
- Uncertainty is explicitly represented.
- Ownership boundary is clean (object + user + RLS).

## C3. Pressure points / weak abstractions
- Over-collapsed dimensions:
  - agency state is implicit, not first-class.
  - metacognitive/lucidity moments are collapsed into `dream_quality`.
  - emotional transitions are not explicit (only `emotion` category).
  - spatial structure and relational dynamics are not explicit, only inferred from free text.
- `recurrence_candidate` sits inside Observation categories, blending descriptive extraction with continuity intent.
- Summary field has no structural anti-interpretation guardrails.
- Taxonomy drift risk:
  - heuristic category assignment by keyword encourages shallow NLP tagging over phenomenological modeling.

## C4. Reflective-object generality pressure
- Positive: object model is not dream-only at table/type level.
- Constraints:
  - observation extractor heuristics are dream-phrase biased.
  - no object-type-specific descriptive profile boundary exists.
  - category set is fixed and may underfit memories/journals/relational notes.

---

## Scope Findings (10 requested areas)

## 1) Observation ontology
- Coherent baseline exists, but ontology is transitional and underpowered for target phenomenological fidelity.
- It is mostly descriptive in intention, but not structurally protected from interpretive injection.
- Risk of collapsing into shallow taxonomy is high due fixed categories + keyword rules.

## 2) Observation generation flow
- Two flows exist:
  - explicit manual observation creation (active path),
  - scaffold generator (currently not wired as primary route owner).
- Interpretation leakage starts at manual payload acceptance and weak summary governance.
- Traceability exists at schema level, but spans/context precision is low in generated scaffold.

## 3) Observation <-> Latent boundary integrity
- Boundary is conceptually present and partially enforced by language sanitization downstream.
- Still porous at architecture level:
  - latent depends on observation category outputs that can be noisy/interpreted.
  - no hard “descriptive-only validator” protects observation payloads before persistence.
- Future latent expansion could silently amplify weak observation semantics.

## 4) Evidence-linking architecture
- Strong: every fragment stores evidence snippet + optional spans and context labels; latent/openings carry provenance lists.
- Weak: evidence richness is often minimal (`raw_sentence`, null spans) and may not survive complexity growth.
- Lineage survives through IDs, but qualitative evidence adequacy is inconsistent.

## 5) Phenomenological coverage
- Partially covered:
  - scenes/actors/interactions/emotion/location/object/body/dream quality.
- Thin coverage:
  - agency transitions, emotional transitions, embodiment nuance, metacognitive moments, fragmentation quality, continuity hints beyond recurrence.
- Current scaffold cannot robustly represent full target breadth without overloading free text.

## 6) Reflective-space compatibility
- Current viewport enforces section caps, payload guardrails, silence-legitimate omission, and bounded dialogue windows.
- This is strongly aligned with contemplative pacing constraints.
- Main compatibility gap is upstream observation quality, not surfacing guardrails.

## 7) Reflective Object generality
- Data model is partially general (four object types).
- Runtime observation extraction and category assumptions remain closer to dream narrative phrasing.
- Safe generalization likely requires object-aware descriptive profiles, but this ticket does not redesign that.

## 8) Persistence and durability review
- System currently persists a broad cognition footprint (observations, latent snapshots, openings, events, associations).
- Over-persistence risk:
  - low-fidelity latent scaffolds become durable artifacts.
  - potentially weak or interpretively contaminated observations become durable continuity substrate.
- Durable/ephemeral distinction exists conceptually but is not yet tightly enforced operationally.

## 9) Interaction grammar compatibility
- Positive:
  - bounded openings,
  - suppression lifecycle,
  - activation_without_response legitimacy,
  - anti-feed dialogue windows,
  - calm wording in UI copy/tests.
- Risks:
  - if observation quality is weak, continuity cues can still feel synthetic.
  - repeated glossary/recurrence cues could pressure coherence if not demoted carefully.

## 10) Runtime architecture alignment
- Current architecture is transitional, not foundational-final.
- It aligns with clean-room direction on restraint and bounded surfacing.
- Bottlenecks for reflective-space convergence:
  - observation semantic depth,
  - hard descriptive boundary enforcement,
  - canonicalization of active vs placeholder composition paths,
  - durable-vs-ephemeral cognition policies.

---

## D) Future-Facing Recommendations (Guardrails, Not Redesign Specs)

## D1. Architectural directions
- Make Observation write path descriptor-validated by default (route-level + domain-level), not trust caller semantics.
- Treat `recurrence_candidate` as derived continuity signal rather than core observation category when possible.
- Keep latent raw payload consumption internal; expose only transformed invitation-safe objects to UI routes.
- Consolidate to one active reflective-space composition pathway and isolate placeholder assemblers explicitly.

## D2. Conceptual guardrails
- Observation records must answer only “what appears.”
- Any meaning-like phrasing in observation summary/fragments should fail or be demoted with explicit uncertainty tagging.
- Adjacency/recurrence should remain evidence-linked hints, never implicit interpretive verdicts.
- Preserve omission-first behavior when confidence or evidence quality is weak.

## D3. Ontology constraints
- Preserve evidence-link requirement for each fragment.
- Require explicit uncertainty semantics for weak fragments.
- Add pressure checks for overuse of generic categories (`scene`, `dream_quality`) as ontology quality signal.
- Keep object-type extensibility explicit and avoid dream-only category coupling.

## D4. Anti-pattern warnings
- Do not let manual API payloads become de facto interpretation channel.
- Do not treat recurrence count as meaning strength.
- Do not persist low-fidelity latent scaffolds indefinitely without lifecycle policy.
- Do not reactivate placeholder composition codepaths in production routes.

## D5. Sequencing recommendations
1. Boundary hardening audit slice: enforce descriptive-only observation payload contract.
2. Evidence quality slice: improve span/context anchoring expectations and fallback policy.
3. Composition convergence slice: formally retire or quarantine unused placeholder viewport path.
4. Ontology pressure slice: expand descriptive dimensions incrementally, preserving restraint and ambiguity.
5. Durability policy slice: classify latent/observation artifacts by retention tier (durable vs ephemeral).

---

## Final Principle Check

Current scaffold can support the future reflective runtime only if Observation boundary hardening and ontology deepening occur before latent sophistication expansion.

As implemented today, the system demonstrates strong pacing/suppression architecture but medium-to-high risk at the descriptive integrity boundary.

The governing principle remains correct and should be protected:

Lumira should notice carefully without claiming to fully understand.

