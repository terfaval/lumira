# Docs Reorganization Report

## Scope executed

Reorganized documentation under:

- `docs/design`
- `docs/plans`
- `docs/gpts`
- `docs/architecture`

No runtime code, schema, API, or app behavior changes were made.

## Files moved to canon (`docs/canon`)

- `Lumira_Interaction_Principles_v0.md`
- `Lumira_Reflective_Composer_Model_v1.md`
- `Lumira_Reflective_Interaction_Model_v2.md`
- `lumira-evolution-north-star-v0.md`
- `lumira-reflective-interaction-grammar-v0.md`
- `lumira-reflective-payload-architecture-v0.md`
- `lumira-reflective-space-ia-v0.md`
- `lumira-reflective-thread-model-v0.md`
- `lumira-shared-primitive-redesign-v1.md`
- `lumira-visual-system-philosophy-v1.md`
- `Observation_Latent_Glossary_Work_Redesign_Handoff.md`

## Files moved to runtime (`docs/runtime`)

- `lumira-reflective-cognition-runtime-architecture-v0.md`
- `lumira-reflective-cognition-runtime-contract-v0.md`
- `lumira-reflective-opening-canonical-data-model-v0.md`
- `lumira-reflective-opening-generation-policy-v0.md`
- `lumira-reflective-opening-lifecycle-api-contract-v0.md`
- `lumira-reflective-reentry-payload-contract-v0.md`
- `lumira-reflective-schema-target-v0.md`
- `lumira-reflective-thread-canonical-data-model-v0.md`
- `lumira-reflective-thread-state-machine-v0.md`
- `lumira-reflective-thread-transition-invariants-v0.md`

## Files moved to archive (`docs/archive/legacy-transition`)

- `DB_Schema_Fix_&_Runtime_Stabilization_Handoff.md`
- `highlight-contract-glossary-access-gate.md`
- `Lumira_Reflective_Interaction_Model_v1.md`
- `Lumira_Visual_Foundation_Audit_v0.md`
- `Lumira_Visual_Foundation_Implementation_Plan_v1.md`
- `lumira-alpha-preparation-program.md`
- `lumira-canonical-architecture-map-v0.md`
- `lumira-first-reflective-read-candidate-selection-v0.md`
- `lumira-post-direction-reflective-interaction-alignment-v0.md`
- `lumira-reflective-data-model-bridge-v0.md`
- `lumira-reflective-implementation-governance-v0.md`
- `lumira-reflective-implementation-roadmap-v0.md`
- `lumira-reflective-projection-contract-pack-v0.md`
- `lumira-reflective-runtime-compat-contract-v0.md`
- `lumira-reflective-space-layer-composition-map-v0.md`
- `lumira-reflective-summary-reentry-expansion-strategy-v0.md`
- `lumira-route-api-ownership-contract-pack-v0.md`
- `lumira-summary-reentry-owner-approval-criteria-v0.md`
- `lumira-unified-reflective-space-rollout-plan-v0.md`
- `Multi-Assistant_Coordination_&_Operating_Model_Handoff.md`
- `Reflective_Space_Visual_Direction_Gap_Audit_v1.md`
- `reflective-space-ux-transition-experiments-v0.md`
- `summary-highlights-glossary-alpha-boundary.md`

## Uncertain files needing owner review

- `docs/runtime/lumira-reflective-cognition-runtime-architecture-v0.md`
  - Dominant target-runtime content, but includes explicit bridge/compatibility sequencing sections.
- `docs/runtime/lumira-reflective-schema-target-v0.md`
  - Dominant target-schema model, but includes transitional compatibility and bridge mapping fields.
- `docs/runtime/lumira-reflective-thread-canonical-data-model-v0.md`
  - Canonical object modeling mixed with projection-to-canonical migration contract text.
- `docs/runtime/lumira-reflective-opening-canonical-data-model-v0.md`
  - Canonical object modeling mixed with bridge/rollback semantics.

## Mixed canon + legacy content detected

- `docs/runtime/lumira-reflective-cognition-runtime-architecture-v0.md`
- `docs/runtime/lumira-reflective-cognition-runtime-contract-v0.md`
- `docs/runtime/lumira-reflective-schema-target-v0.md`
- `docs/runtime/lumira-reflective-thread-canonical-data-model-v0.md`
- `docs/runtime/lumira-reflective-opening-canonical-data-model-v0.md`
- `docs/runtime/lumira-reflective-opening-lifecycle-api-contract-v0.md`
- `docs/runtime/lumira-reflective-reentry-payload-contract-v0.md`

These were kept in `docs/runtime` because their dominant purpose is clean-room target runtime definition, but they should be de-bridged in next extraction passes.

## Recommended extraction docs (next)

1. `Lumira Constitution v1`
   - Product-level non-authoritative reflective doctrine and interaction constitution.
2. `Minimal Reflective Runtime v1`
   - Smallest clean-room runtime topology, objects, and invariants without bridge language.
3. `Clean-room Technical Constitution v1`
   - Engineering constitution for ownership, boundaries, persistence contracts, and anti-legacy drift rules.