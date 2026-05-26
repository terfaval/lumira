# Lumira Reflective Implementation Governance v0

## Purpose

Define one implementation governance layer so reflective build sequencing can proceed without document-authority ambiguity.

This document is planning-only and does not change runtime, schema, or Supabase state.

## Source-of-Truth Map

| Area | Authoritative document | Scope note |
| --- | --- | --- |
| Product north star | `docs/plans/lumira-evolution-north-star-v0.md` | canonical product/runtime direction |
| Runtime compatibility | `docs/plans/lumira-reflective-runtime-compat-contract-v0.md` | coexistence, ownership transfer, bridge semantics |
| Schema target | `docs/plans/lumira-reflective-schema-target-v0.md` | target table model and state/payload boundaries |
| Clean rebuild execution | `docs/plans/lumira-supabase-clean-rebuild-execution-contract-v0.md` | reset/rebuild/cutover safety gates and sequencing |
| Thread lifecycle | `docs/plans/lumira-reflective-thread-state-machine-v0.md` | canonical runtime thread/opening state behavior |
| Opening lifecycle | `docs/plans/lumira-reflective-opening-lifecycle-api-contract-v0.md` | opening lifecycle object/state transitions |
| Opening generation/surfacing | `docs/plans/lumira-reflective-opening-generation-policy-v0.md` | generation gates, silence rules, surfacing pacing |
| Re-entry payload | `docs/plans/lumira-reflective-reentry-payload-contract-v0.md` | return-time continuity payload structure and bounds |
| Invariants/safety | `docs/plans/lumira-reflective-thread-transition-invariants-v0.md` | non-negotiable transition guardrails |

## Clean Rebuild Rule

- Fresh baseline rebuild should not recreate legacy bridge tables by default.
- Legacy bridge tables/adapters are allowed only with explicit route/API caller proof.
- If caller proof is missing, default action is `do not recreate`.

## Thread State Precedence

- `docs/plans/lumira-reflective-thread-state-machine-v0.md` is authoritative for runtime thread states and transition semantics.
- Earlier conceptual thread docs (for example `docs/design/lumira-reflective-thread-model-v0.md`) remain philosophy/context references, not runtime state authority.

## Opening Ownership Boundary

- Opening generation policy governs candidate creation and surfacing gates.
- Opening lifecycle API contract governs persisted opening state transitions.
- Thread state machine governs thread-level effects of opening events.
- Re-entry payload contract governs return-time opening visibility and density.

## Implementation Sequencing Order

1. Implementation roadmap and build sequencing.
2. Route/API ownership contracts.
3. Schema baseline SQL planning/build slices.
4. Supabase provisioning and cutover execution.
5. Runtime and UX implementation slices.

## Governance Constraints

- No runtime code changes in governance tickets.
- No SQL/migration changes in governance tickets.
- No Supabase actions in governance tickets.
