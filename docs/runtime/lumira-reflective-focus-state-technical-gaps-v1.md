# Reflective Focus-State Technical Gaps v1

## Status

Companion implementation-gap document for `lumira-reflective-focus-state-contract-v1`.

Purpose:
- identify missing runtime and UX systems needed to implement focus states safely
- expose unresolved architecture before implementation hardens
- provide dependency-ordered planning tracks for coordinators

This document is:
- implementation-oriented
- coordinator-facing
- explicit about unresolved contracts

This document is NOT:
- implementation code
- schema migration
- route redesign
- component-level design spec

---

## 1) Scope and Inputs

Primary input contract:
- `docs/runtime/lumira-reflective-focus-state-contract-v1.md`

Additional authority:
- `docs/canon/lumira-reflective-space-ia-v0.md`
- `docs/canon/lumira-reflective-interaction-grammar-v0.md`
- `docs/canon/lumira-shared-primitive-redesign-v1.md`
- `docs/canon/lumira-visual-system-philosophy-v1.md`
- `docs/canon/opening-interaction-principles-v1.md`
- `docs/runtime/lumira-reflective-thread-state-machine-v0.md`
- `docs/runtime/lumira-reflective-opening-generation-policy-v0.md`
- `docs/runtime/lumira-reflective-reentry-payload-contract-v0.md`
- `docs/runtime/reflective-space-viewport-guardrails-v1.md`
- `docs/superpowers/audits/2026-05-26-reflective-space-experiential-convergence-audit-v1.md`

---

## 2) Gap Summary (Coordinator View)

Current state:
- philosophy and interaction grammar are mature
- runtime focus-state orchestration is not yet canonicalized
- active state models are simplified versus target behavior

Blocking gap classes:
1. missing runtime contracts
2. missing orchestration/state machines
3. missing visibility and weighting systems
4. missing persistence semantics for attentional restoration
5. missing UI behavior contracts for focus transitions
6. missing verification/telemetry contracts for calmness and pressure drift

---

## 3) Missing Runtime Contracts

### Gap R1: Focus-State Runtime Contract (missing)
- Missing: executable runtime object/state contract for Orientation/Local/Deep/Capture.
- Risk: mode behavior becomes route- or component-owned and drifts.
- Required artifact: `PLAN - reflective focus-state runtime contract v1`.

### Gap R2: Center Selection Contract (missing)
- Missing: deterministic rules for selecting one reflective center in Orientation and re-entry.
- Risk: multi-center competition and unstable attentional gravity.
- Required artifact: `PLAN - reflective center selection contract v1`.

### Gap R3: Continuity Weighting Contract (missing)
- Missing: foreground/midground/background weighting, promotion, and demotion rules.
- Risk: continuity flooding or sterile under-surfacing.
- Required artifact: `PLAN - continuity weighting and visibility contract v1`.

### Gap R4: Overload and Silence Contract (missing)
- Missing: explicit overload thresholds and silence escalation logic by mode.
- Risk: pressure drift and compulsive prompting.
- Required artifact: `PLAN - reflective overload and silence policy v1`.

---

## 4) Missing Orchestration / State Machines

### Gap O1: Focus Transition State Machine (missing)
- Missing: explicit state transitions and gating between Orientation/Local/Deep/Capture.
- Risk: abrupt mode jumps and inconsistent escalation.
- Required artifact: `PLAN - focus transition state machine v1`.

### Gap O2: Return Stack Semantics (missing)
- Missing: canonical one-level-back restoration model with context snapshots.
- Risk: disorienting returns and topology teleportation.
- Required artifact: `PLAN - attentional return and restoration contract v1`.

### Gap O3: Local Interaction Escalation Guard (missing)
- Missing: policy for when local interaction may escalate to deep reflection.
- Risk: accidental deep-mode entry from lightweight actions.
- Required artifact: `PLAN - local-to-deep escalation policy v1`.

### Gap O4: Capture Isolation Gate (partial)
- Missing: hardened gate preventing unsolicited continuity surfacing in capture context.
- Risk: capture interruption and reflective pressure at vulnerable moments.
- Required artifact: `PLAN - capture isolation and interruption policy v1`.

---

## 5) Missing Visibility and Layering Systems

### Gap V1: Continuity Layer Visibility Contract (missing)
- Missing: clear per-mode visibility contracts for foreground, midground, background.
- Risk: flattened continuity or hidden continuity with no legibility.
- Required artifact: `PLAN - continuity visibility hierarchy contract v1`.

### Gap V2: Density Budget Engine Contract (missing)
- Missing: mode-specific density budgets and demotion-before-expansion behavior.
- Risk: panel/grid overload regression.
- Required artifact: `PLAN - focus-state density budget contract v1`.

### Gap V3: Mode-aware Opening Surfacing Contract (partial)
- Missing: explicit opening caps/eligibility by focus state, not just global cadence.
- Risk: deep-mode or capture-mode invitation pressure.
- Required artifact: `PLAN - focus-state opening surfacing contract v1`.

---

## 6) Missing Persistence Semantics

### Gap P1: Focus-State Snapshot Persistence (missing)
- Missing: what minimal attentional context is persisted to restore prior mode naturally.
- Risk: return behavior cannot preserve reflective continuity.
- Required artifact: `PLAN - focus-state snapshot persistence contract v1`.

### Gap P2: Mode Transition Event Ledger (missing)
- Missing: transition/audit events for mode changes, demotions, and returns.
- Risk: drift cannot be diagnosed or validated.
- Required artifact: `PLAN - focus-state transition ledger contract v1`.

### Gap P3: Lifecycle Parity Mapping (missing)
- Missing: mapping from current simplified thread/opening states to focus-state semantics.
- Risk: inconsistently enforced user pacing signals (defer/dismiss/dormancy).
- Required artifact: `PLAN - lifecycle parity bridge for focus-state behavior v1`.

---

## 7) Missing UI Behavior Contracts

### Gap U1: Orientation Composition Contract (missing)
- Missing: contract for calm richness without dashboardification.
- Risk: orientation collapses into analytics-like panel grid.
- Required artifact: `PLAN - orientation composition contract v1`.

### Gap U2: Deep Reflection Narrowing Contract (missing)
- Missing: explicit UI behavior for preserving one center while retaining nearby context.
- Risk: deep reflection becomes editor/chat mode.
- Required artifact: `PLAN - deep reflection narrowing behavior contract v1`.

### Gap U3: Local Interaction Surface Contract (missing)
- Missing: constraints for sheet/popover/overlay behavior and reversibility.
- Risk: local actions become mode-switching micro-workflows.
- Required artifact: `PLAN - local interaction surface contract v1`.

### Gap U4: Capture Surface Contract (missing)
- Missing: strict visual/interaction constraints for half-awake, low-pressure capture.
- Risk: continuity prompts and utility controls pollute capture flow.
- Required artifact: `PLAN - capture surface contract v1`.

---

## 8) Missing Transition and Motion Rules

### Gap T1: Demotion-Before-Expansion Choreography (missing)
- Missing: concrete transition rules for density and continuity demotion.
- Risk: abrupt cognitive load spikes during deepening.
- Required artifact: `PLAN - focus-state transition choreography contract v1`.

### Gap T2: Mode-aware Motion Policy (missing)
- Missing: per-mode motion constraints for stabilization, not stimulation.
- Risk: motion introduces urgency or promotional energy.
- Required artifact: `PLAN - reflective motion policy by focus-state v1`.

---

## 9) Missing Verification and Governance

### Gap G1: Focus-State Conformance Checks (missing)
- Missing: validation suite proving mode behavior follows contract.
- Risk: implementation passes technical tests but fails experiential contract.
- Required artifact: `VALIDATION - focus-state contract conformance checks v1`.

### Gap G2: Calmness/Pressure Telemetry Contract (missing)
- Missing: non-invasive metrics for overload, prompt pressure, and multi-center competition.
- Risk: drift detected only after UX damage.
- Required artifact: `PLAN - reflective pacing telemetry contract v1`.

### Gap G3: Contract Hierarchy Index (partial)
- Missing: unified index from constitution -> runtime contracts -> implementation constraints for focus-state orchestration.
- Risk: teams implement against stale or fragmented docs.
- Required artifact: `PLAN - focus-state governance index and authority map v1`.

---

## 10) Dependency-Ordered Planning Tracks

### Track A (P0): Runtime Contract Core
1. Focus-state runtime contract
2. Center selection contract
3. Continuity weighting and visibility contract
4. Overload and silence policy

### Track B (P0): Orchestration Core
1. Focus transition state machine
2. Return/restoration contract
3. Local-to-deep escalation policy
4. Capture isolation policy

### Track C (P1): Surface Behavior Core
1. Orientation composition contract
2. Deep reflection narrowing contract
3. Local interaction surface contract
4. Capture surface contract

### Track D (P1): Persistence and Bridge Safety
1. Focus-state snapshot persistence contract
2. Transition ledger contract
3. Lifecycle parity bridge contract

### Track E (P2): Verification and Governance
1. Focus-state conformance checks
2. Calmness/pressure telemetry contract
3. Governance index and authority map

---

## 11) Implementation Readiness Gates

Do not begin broad focus-state implementation until:
- center selection contract approved
- visibility/weighting contract approved
- transition state machine approved
- return semantics approved
- capture isolation policy approved
- lifecycle parity mapping approved

Do not widen rollout until:
- conformance checks pass
- pressure/calmness telemetry baseline is stable
- owner review confirms no workflow/dashboard drift in prototypes

---

## 12) High-Risk Failure Scenarios if Gaps Stay Open

1. Orientation overload:
   - rich topology appears as dashboard density due to absent weighting/demotion rules.
2. Deep reflection dilution:
   - no enforced one-center policy causes multi-thread competition during writing.
3. Capture contamination:
   - reflective invitations leak into capture context and create pressure.
4. Return disorientation:
   - back action resets context instead of restoring attentional continuity.
5. Silent authority escalation:
   - simplified lifecycle semantics mis-handle defer/dismiss and reintroduce pressure loops.

---

## 13) Coordinator Action Checklist

1. Create planning tickets for Track A and Track B first.
2. Treat Track C as dependent on approved runtime/orchestration contracts.
3. Block implementation PRs that introduce focus behavior without lifecycle parity mapping.
4. Require explicit review against focus-state checklist from contract v1.
5. Gate rollout on validation/telemetry artifacts, not payload parity alone.

---

## 14) Final Principle

Focus-state implementation is safe only when attentional behavior is contract-owned, continuity layering is executable, and transitions/returns preserve reflective calmness without workflow pressure.
