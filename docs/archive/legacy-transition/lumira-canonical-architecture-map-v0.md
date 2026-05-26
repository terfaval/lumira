# Lumira Canonical Architecture Map v0

## Purpose

Establish one canonical map of Lumira architecture knowledge so future tickets, audits, and Codex sessions can identify source-of-truth documents by layer and avoid partial-context drift.

## Authority Model

Document authority levels used in this map:

- `Canonical`: normative direction for current architecture decisions.
- `Runtime-current`: evidence of what the app/runtime currently does.
- `Planning-only`: intended direction and sequencing, not yet implemented.
- `Historical`: useful context, not current authoritative runtime direction.
- `Target/future`: intended architecture end-state guidance.

## Document Authority Map

### Canonical

- `docs/plans/lumira-evolution-north-star-v0.md`
- `docs/plans/lumira-reflective-cognition-runtime-contract-v0.md`
- `docs/plans/lumira-reflective-cognition-runtime-architecture-v0.md`
- `docs/plans/lumira-route-api-ownership-contract-pack-v0.md`
- `docs/plans/lumira-reflective-runtime-compat-contract-v0.md`
- `docs/plans/lumira-reflective-projection-contract-pack-v0.md`
- `docs/plans/lumira-reflective-thread-state-machine-v0.md`
- `docs/plans/lumira-reflective-thread-canonical-data-model-v0.md`
- `docs/plans/lumira-reflective-thread-transition-invariants-v0.md`
- `docs/plans/lumira-reflective-opening-lifecycle-api-contract-v0.md`
- `docs/plans/lumira-reflective-opening-generation-policy-v0.md`
- `docs/plans/lumira-reflective-opening-canonical-data-model-v0.md`
- `docs/plans/lumira-reflective-reentry-payload-contract-v0.md`
- `docs/plans/lumira-reflective-implementation-roadmap-v0.md`
- `docs/plans/lumira-reflective-implementation-governance-v0.md`
- `docs/plans/lumira-reflective-schema-target-v0.md`
- `docs/plans/lumira-supabase-clean-rebuild-strategy-v0.md`
- `docs/plans/lumira-supabase-clean-rebuild-execution-contract-v0.md`
- `docs/design/Lumira_Reflective_Interaction_Model_v2.md`
- `docs/design/Lumira_Reflective_Composer_Model_v1.md`
- `docs/design/lumira-reflective-space-ia-v0.md`
- `docs/design/lumira-reflective-thread-model-v0.md`
- `docs/design/lumira-reflective-payload-architecture-v0.md`
- `docs/design/lumira-reflective-data-model-bridge-v0.md`
- `docs/design/lumira-reflective-interaction-grammar-v0.md`
- `docs/plans/lumira-unified-reflective-space-rollout-plan-v0.md`
- `docs/plans/lumira-reflective-space-layer-composition-map-v0.md`
- `docs/gpts/Observation_Latent_Glossary_Work_Redesign_Handoff.md`

### Runtime-current

- `docs/audits/alpha-runtime-truth-matrix.md`
- `docs/audits/runtime-current-flow-audit.md`
- `docs/audits/highlights-reflective-read-switch-b1.md`
- `docs/audits/work-reflective-read-switch-b2.md`
- `docs/audits/phase-b1-b2-reflective-read-drift-review.md`
- `docs/STABILIZATION_LEDGER.md`

### Planning-only (active)

- `docs/plans/lumira-phase-b-read-switch-gate-criteria-v0.md`
- `docs/plans/lumira-phase-b-read-switch-dry-run-plan-v0.md`
- `docs/plans/lumira-first-reflective-read-candidate-selection-v0.md`
- `docs/plans/lumira-reflective-summary-reentry-expansion-strategy-v0.md`
- `docs/plans/lumira-summary-reentry-owner-approval-criteria-v0.md`

### Historical / superseded context

- `docs/design/Lumira_Reflective_Interaction_Model_v1.md` (superseded by v2)
- `docs/plans/wrapper-collapse-sequence.md` (historical after wrapper collapse completion)
- `docs/plans/dream-map-removal-plan.md` (historical after runtime/domain removal completion)
- `docs/audits/dream-map-api-job-repo-caller-audit.md` (historical cleanup context)
- older superpowers audits/plans/specs under `docs/superpowers/**` (legacy stabilization snapshots)

### Validation evidence (current reflective program)

- `docs/audits/phase-a1-a4-projection-drift-review.md`
- `docs/audits/projection-parity-gate-a5.md`
- `docs/audits/reentry-suppression-defer-parity-assertion-pack.md`
- `docs/audits/route-by-route-reflective-read-dry-run.md`
- `docs/audits/reflective-summary-payload-dry-run.md`
- `docs/audits/reflective-reentry-payload-dry-run.md`
- `docs/audits/summary-reentry-drift-risk-map.md`
- `docs/audits/summary-reentry-reflective-payload-diff-audit.md`
- `docs/audits/summary-reentry-owner-walkthrough-packet.md`
- `docs/audits/lumira-reflective-runtime-documentation-authority-review-v0.md`

## Build-Ticket Precedence Notes

- `docs/plans/lumira-reflective-cognition-runtime-architecture-v0.md` is the current execution-oriented runtime authority for build tickets.
- If runtime architecture content overlaps with `docs/plans/lumira-reflective-cognition-runtime-contract-v0.md`, the runtime architecture document takes build-ticket precedence unless the ticket explicitly targets cognition-contract revision.
- `docs/plans/lumira-reflective-thread-canonical-data-model-v0.md` is authoritative for canonical thread identity/field/lifecycle planning.
- `docs/plans/lumira-reflective-opening-canonical-data-model-v0.md` is authoritative for canonical opening identity/field/lifecycle/visibility planning.
- `docs/plans/lumira-reflective-schema-target-v0.md` remains target/future schema guidance and defers lifecycle vocabulary authority to:
  - `docs/plans/lumira-reflective-thread-state-machine-v0.md`
  - `docs/plans/lumira-reflective-opening-lifecycle-api-contract-v0.md`
  - `docs/plans/lumira-reflective-thread-canonical-data-model-v0.md`
  - `docs/plans/lumira-reflective-opening-canonical-data-model-v0.md`
- Build-readiness note: `BUILD — Reflective Space Payload Composer Foundation` is cleared after authority/state-vocabulary alignment, provided the build ticket follows the source-of-truth bundle defined in `docs/audits/lumira-reflective-runtime-documentation-authority-review-v0.md`.

### Target/future architecture

- `docs/plans/lumira-reflective-schema-target-v0.md`
- `docs/plans/lumira-reflective-cognition-runtime-contract-v0.md`
- `docs/plans/lumira-supabase-clean-rebuild-strategy-v0.md`
- `docs/plans/lumira-supabase-clean-rebuild-execution-contract-v0.md`

## Architecture Layers and Primary Sources

### Product philosophy

- Primary:
  - `docs/plans/lumira-evolution-north-star-v0.md`
  - `docs/design/Lumira_Reflective_Interaction_Model_v2.md`
  - `docs/gpts/Observation_Latent_Glossary_Work_Redesign_Handoff.md`

### Reflective interaction / UX model

- Primary:
  - `docs/design/Lumira_Reflective_Interaction_Model_v2.md`
  - `docs/design/Lumira_Reflective_Composer_Model_v1.md`
  - `docs/design/lumira-reflective-interaction-grammar-v0.md`
  - `docs/design/lumira-reflective-space-ia-v0.md`
  - `docs/design/lumira-reflective-thread-model-v0.md`
  - `docs/plans/lumira-summary-reentry-owner-approval-criteria-v0.md`

### Cognition model

- Primary:
  - `docs/gpts/Observation_Latent_Glossary_Work_Redesign_Handoff.md`
  - `docs/plans/lumira-reflective-cognition-runtime-contract-v0.md`
  - `docs/plans/lumira-reflective-cognition-runtime-architecture-v0.md`
  - `docs/design/lumira-reflective-payload-architecture-v0.md`
  - `docs/plans/lumira-reflective-thread-state-machine-v0.md`
  - `docs/plans/lumira-reflective-opening-lifecycle-api-contract-v0.md`

### Payload architecture

- Primary:
  - `docs/design/lumira-reflective-payload-architecture-v0.md`
  - `docs/plans/lumira-reflective-cognition-runtime-contract-v0.md`
  - `docs/plans/lumira-reflective-cognition-runtime-architecture-v0.md`
  - `docs/plans/lumira-reflective-projection-contract-pack-v0.md`
  - `docs/plans/lumira-reflective-reentry-payload-contract-v0.md`
  - `docs/plans/lumira-reflective-space-layer-composition-map-v0.md`

### Runtime ownership / compatibility

- Primary:
  - `docs/plans/lumira-route-api-ownership-contract-pack-v0.md`
  - `docs/plans/lumira-reflective-runtime-compat-contract-v0.md`
  - `docs/plans/lumira-reflective-thread-transition-invariants-v0.md`

### Runtime/schema target

- Primary:
  - `docs/design/lumira-reflective-data-model-bridge-v0.md`
  - `docs/plans/lumira-reflective-schema-target-v0.md`

### Supabase rebuild / migration strategy

- Primary:
  - `docs/plans/lumira-supabase-clean-rebuild-strategy-v0.md`
  - `docs/plans/lumira-supabase-clean-rebuild-execution-contract-v0.md`

### Alpha runtime truth

- Primary:
  - `docs/audits/alpha-runtime-truth-matrix.md`
  - `docs/audits/highlights-reflective-read-switch-b1.md`
  - `docs/audits/work-reflective-read-switch-b2.md`
  - `docs/audits/phase-b1-b2-reflective-read-drift-review.md`
  - `docs/STABILIZATION_LEDGER.md`

### Reflective space convergence and rollout

- Primary:
  - `docs/plans/lumira-unified-reflective-space-rollout-plan-v0.md`
  - `docs/plans/lumira-reflective-space-layer-composition-map-v0.md`
  - `docs/plans/lumira-phase-b-read-switch-gate-criteria-v0.md`
  - `docs/plans/lumira-phase-b-read-switch-dry-run-plan-v0.md`
  - `docs/plans/lumira-first-reflective-read-candidate-selection-v0.md`

## Per-Folder Interpretation

### `docs/design`

Not just frontend/visual docs. This folder contains core reflective interaction/cognition behavior models and should be treated as architecture input for runtime/schema/API planning.

### `docs/gpts`

Handoff and synthesis sources. In particular, `Observation_Latent_Glossary_Work_Redesign_Handoff.md` is a key cognition-direction source, not a throwaway prompt artifact.

### `docs/plans`

Execution-oriented architecture planning. These documents define runtime/schema/rebuild direction and phase sequencing; they are the bridge from conceptual design to implementation tickets.
The current reflective program has explicit phases:
- Phase A: projections + parity gates
- Phase B: guarded reflective-first read switches
- Summary/Re-entry: convergence planning and owner-gated validation

## Canonical Context Bundles For Future Tickets

### Thread / opening / state-machine tickets

- `docs/plans/lumira-evolution-north-star-v0.md`
- `docs/plans/lumira-reflective-cognition-runtime-contract-v0.md`
- `docs/plans/lumira-reflective-cognition-runtime-architecture-v0.md`
- `docs/plans/lumira-reflective-projection-contract-pack-v0.md`
- `docs/plans/lumira-reflective-thread-state-machine-v0.md`
- `docs/plans/lumira-reflective-thread-canonical-data-model-v0.md`
- `docs/plans/lumira-reflective-thread-transition-invariants-v0.md`
- `docs/plans/lumira-reflective-opening-lifecycle-api-contract-v0.md`
- `docs/plans/lumira-reflective-opening-generation-policy-v0.md`
- `docs/plans/lumira-reflective-opening-canonical-data-model-v0.md`
- `docs/plans/lumira-reflective-space-layer-composition-map-v0.md`
- `docs/design/lumira-reflective-thread-model-v0.md`
- `docs/design/Lumira_Reflective_Composer_Model_v1.md`
- `docs/design/Lumira_Reflective_Interaction_Model_v2.md`
- `docs/audits/alpha-runtime-truth-matrix.md`

### Schema / Supabase tickets

- `docs/plans/lumira-evolution-north-star-v0.md`
- `docs/design/lumira-reflective-data-model-bridge-v0.md`
- `docs/plans/lumira-reflective-schema-target-v0.md`
- `docs/plans/lumira-reflective-thread-canonical-data-model-v0.md`
- `docs/plans/lumira-reflective-opening-canonical-data-model-v0.md`
- `docs/plans/lumira-supabase-clean-rebuild-strategy-v0.md`
- `docs/plans/lumira-supabase-clean-rebuild-execution-contract-v0.md`
- `docs/audits/alpha-runtime-truth-matrix.md`

### Runtime / API tickets

- `docs/plans/lumira-evolution-north-star-v0.md`
- `docs/plans/lumira-reflective-cognition-runtime-contract-v0.md`
- `docs/plans/lumira-reflective-cognition-runtime-architecture-v0.md`
- `docs/plans/lumira-route-api-ownership-contract-pack-v0.md`
- `docs/plans/lumira-reflective-runtime-compat-contract-v0.md`
- `docs/plans/lumira-phase-b-read-switch-gate-criteria-v0.md`
- `docs/audits/alpha-runtime-truth-matrix.md`
- `docs/audits/runtime-current-flow-audit.md`
- `docs/audits/highlights-reflective-read-switch-b1.md`
- `docs/audits/work-reflective-read-switch-b2.md`
- `docs/STABILIZATION_LEDGER.md`

### UX / IA tickets

- `docs/plans/lumira-evolution-north-star-v0.md`
- `docs/design/Lumira_Reflective_Interaction_Model_v2.md`
- `docs/design/Lumira_Reflective_Composer_Model_v1.md`
- `docs/design/lumira-reflective-interaction-grammar-v0.md`
- `docs/design/lumira-reflective-space-ia-v0.md`
- `docs/design/lumira-reflective-thread-model-v0.md`
- `docs/design/lumira-reflective-payload-architecture-v0.md`
- `docs/plans/lumira-unified-reflective-space-rollout-plan-v0.md`
- `docs/plans/lumira-reflective-space-layer-composition-map-v0.md`
- `docs/plans/lumira-summary-reentry-owner-approval-criteria-v0.md`

### Observation / latent / model tickets

- `docs/plans/lumira-evolution-north-star-v0.md`
- `docs/gpts/Observation_Latent_Glossary_Work_Redesign_Handoff.md`
- `docs/plans/lumira-reflective-cognition-runtime-contract-v0.md`
- `docs/design/lumira-reflective-payload-architecture-v0.md`
- `docs/audits/observation-pathway-convergence-audit.md` (runtime-historical gap context)

## Deprecated / Historical Notes

- Wrapper-collapse documents and entries remain useful for change provenance but are no longer active runtime-direction docs.
- Dream-map removal docs are historical cleanup records; dream-map runtime/domain direction is no longer current product/runtime center.
- Legacy stabilization audits in `docs/superpowers/**` should be treated as historical snapshots unless explicitly referenced by current plans.

## Open Questions

- Should `docs/SPEC_INDEX.md` be updated to include the reflective program bundles (Phase A/B + Summary/Re-entry) and de-emphasize older migration-plan docs?
- Should we add a dedicated `docs/architecture/README.md` index that points to this map and defines maintenance rules?
- Should we explicitly tag each reflective plan/audit by phase in filename metadata or a manifest file to keep drift scanning easier?

## Maintenance Rule

When a new architecture-significant document is added, update this map and `docs/STABILIZATION_LEDGER.md` in the same ticket to keep authority boundaries explicit.
