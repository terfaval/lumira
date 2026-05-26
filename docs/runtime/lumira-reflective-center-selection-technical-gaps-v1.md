# Reflective Center Selection Technical Gaps v1

## Status

Companion implementation-gap document for `lumira-reflective-center-selection-contract-v1`.

Purpose:
- identify missing systems required for safe center-selection implementation
- expose unresolved architecture across runtime, orchestration, persistence, and UX layering
- define dependency order and readiness gates before implementation

This document is:
- implementation-oriented
- coordinator-facing
- explicit about unresolved contracts and risks

This document is NOT:
- implementation code
- schema migration
- algorithm implementation
- UI component spec

---

## 1) Scope and Inputs

Primary contract:
- `docs/runtime/lumira-reflective-center-selection-contract-v1.md`

Related authority:
- `docs/runtime/lumira-reflective-focus-state-contract-v1.md`
- `docs/runtime/lumira-reflective-focus-state-technical-gaps-v1.md`
- `docs/runtime/latent-attention-reflective-center-model-v1.md`
- `docs/superpowers/audits/2026-05-26-latent-architecture-audit-v1.md`
- `docs/runtime/lumira-reflective-thread-state-machine-v0.md`
- `docs/runtime/lumira-reflective-opening-generation-policy-v0.md`
- `docs/runtime/lumira-reflective-reentry-payload-contract-v0.md`
- `docs/canon/lumira-reflective-thread-model-v0.md`
- `docs/canon/lumira-reflective-interaction-grammar-v0.md`

---

## 2) Gap Summary

Current reality:
- center-selection philosophy is clear
- center-selection mechanics are not yet contract-executable
- active latent/runtime logic is still coarse and partially lexical

High-risk unresolved classes:
1. missing candidate registry and eligibility engine
2. missing salience precedence and suppression enforcement engine
3. missing local-before-global overlap gate implementation contract
4. missing lifecycle persistence for center states
5. missing mode-aware center composition rules
6. missing anti-amplification and no-center enforcement checks

---

## 3) Missing Runtime Weighting Systems

### Gap W1: Center Candidate Registry Contract (missing)
- Missing: normalized candidate classes and typed candidate sources.
- Risk: ad hoc center classes by route/component.
- Required artifact: `PLAN - reflective center candidate registry contract v1`.

### Gap W2: Eligibility Engine Contract (missing)
- Missing: formal eligibility filters and never-auto-promote rules.
- Risk: weak/global/lexical candidates leak into foreground.
- Required artifact: `PLAN - reflective center eligibility engine contract v1`.

### Gap W3: Salience Precedence Engine (missing)
- Missing: deterministic precedence between user-owned and inferred signals.
- Risk: inference silently outranks user intent.
- Required artifact: `PLAN - user salience precedence runtime contract v1`.

### Gap W4: Confidence/Strength Shape Contract (missing)
- Missing: center strength computation and decay model.
- Risk: center stabilization by repetition loops.
- Required artifact: `PLAN - center strength and decay contract v1`.

---

## 4) Missing Orchestration Logic

### Gap O1: Center Selection Orchestrator Contract (missing)
- Missing: orchestrator stage order (candidate -> filter -> score -> gate -> select -> compose).
- Risk: non-deterministic behavior and hidden authority drift.
- Required artifact: `PLAN - reflective center selection orchestrator v1`.

### Gap O2: No-Center Decision Contract (missing)
- Missing: explicit no-center branch and suppression conditions.
- Risk: system forced to pick a center under weak/conflicting signals.
- Required artifact: `PLAN - no-center and silence decision contract v1`.

### Gap O3: Center Switch Policy (missing)
- Missing: switch thresholds and anti-churn constraints.
- Risk: center thrashing and attentional instability.
- Required artifact: `PLAN - center switch and stability policy v1`.

### Gap O4: Focus-State Coupling Contract (missing)
- Missing: how center behavior changes by Orientation/Local/Deep/Capture at runtime layer.
- Risk: one-size-fits-all center behavior and deep-mode drift.
- Required artifact: `PLAN - focus-state-aware center orchestration contract v1`.

---

## 5) Missing Persistence Semantics

### Gap P1: Center Lifecycle Persistence (missing)
- Missing: durable representation for `possible/emerging/user_resonant/stabilized/weakened/suppressed`.
- Risk: lifecycle semantics cannot be enforced or audited.
- Required artifact: `PLAN - reflective center lifecycle persistence contract v1`.

### Gap P2: Suppression/Restore Semantics (partial)
- Missing: unified suppression semantics across centers, openings, threads.
- Risk: suppressed material reappears through alternate pathways.
- Required artifact: `PLAN - center suppression and restoration semantics v1`.

### Gap P3: Center History and Audit Trail (missing)
- Missing: mutation ledger for selection decisions and state transitions.
- Risk: no forensic trace for pressure/authority drift.
- Required artifact: `PLAN - center selection audit ledger contract v1`.

---

## 6) Missing Topology Organization Systems

### Gap T1: Local-Before-Global Overlap Engine (missing)
- Missing: explicit overlap criteria and gate scoring.
- Risk: global continuity pollution and unrelated resurfacing.
- Required artifact: `PLAN - local-before-global overlap gate contract v1`.

### Gap T2: Foreground/Midground/Background Selector (missing)
- Missing: mode-aware topology layering allocator.
- Risk: flattened continuity or overloaded foreground.
- Required artifact: `PLAN - center-neighborhood layering allocator v1`.

### Gap T3: Neighborhood Boundary Contract (missing)
- Missing: bounded neighborhood size/shape rules around current center.
- Risk: graph explosion or context starvation.
- Required artifact: `PLAN - reflective neighborhood boundary contract v1`.

---

## 7) Missing Latent Governance Requirements

### Gap L1: Anti-Amplification Runtime Guards (partial)
- Missing: cross-snapshot dedupe/refractory semantics in center-strength pathway.
- Risk: repetition-driven center inflation.
- Required artifact: `PLAN - center anti-amplification guards v1`.

### Gap L2: Lexical Recurrence Softening Rules (partial)
- Missing: strict lexical-only downweighting enforcement in center selection.
- Risk: lexical repetition treated as continuity gravity.
- Required artifact: `PLAN - lexical recurrence demotion policy v1`.

### Gap L3: Latent Output Visibility Gate (partial)
- Missing: contract preventing raw latent hypotheses from center narration surfaces.
- Risk: interpretation authority leakage.
- Required artifact: `PLAN - latent-to-center visibility and phrasing gate v1`.

### Gap L4: Maturity-Aware Behavior Contract (missing)
- Missing: early-latent vs mature-latent center-selection policy differences.
- Risk: over-assertive centering for low-context users.
- Required artifact: `PLAN - latent maturity-sensitive center policy v1`.

---

## 8) Missing UI Behavior and Visibility Rules

### Gap U1: Orientation Center Legibility Contract (missing)
- Missing: how one soft center remains legible amid richer topology.
- Risk: multi-center overload.
- Required artifact: `PLAN - orientation center legibility contract v1`.

### Gap U2: Deep Reflection One-Center Lock Contract (missing)
- Missing: explicit UI/runtime lock behavior preserving one dominant center.
- Risk: center competition during sustained writing.
- Required artifact: `PLAN - deep reflection center lock behavior v1`.

### Gap U3: Local Interaction Non-Escalation Contract (missing)
- Missing: local focus rules that avoid accidental center replacement/escalation.
- Risk: small actions trigger large attentional shifts.
- Required artifact: `PLAN - local interaction center impact policy v1`.

### Gap U4: Capture Center Isolation Contract (missing)
- Missing: capture-mode rules ensuring writing-as-center with no continuity pressure.
- Risk: capture disruption and reflection pressure.
- Required artifact: `PLAN - capture center isolation contract v1`.

---

## 9) Missing Validation Requirements

### Gap V1: Center Selection Conformance Suite (missing)
- Missing: deterministic test matrix for eligibility, precedence, suppression, no-center outcomes.
- Risk: hidden behavior drift during iteration.
- Required artifact: `VALIDATION - center selection conformance suite v1`.

### Gap V2: Pressure/Overload Validation Checks (missing)
- Missing: checks for orientation multi-center overload and deep reflection center competition.
- Risk: experiential regressions undetected by technical tests.
- Required artifact: `VALIDATION - center pressure and overload checks v1`.

### Gap V3: Silence Legitimacy Checks (missing)
- Missing: explicit tests that no-center outcomes remain available under uncertainty/saturation.
- Risk: forced center behavior.
- Required artifact: `VALIDATION - no-center and silence legitimacy checks v1`.

---

## 10) Dependency-Ordered Planning Tracks

### Track A (P0): Core Center Runtime
1. Center candidate registry
2. Eligibility engine
3. Salience precedence engine
4. Strength/decay contract

### Track B (P0): Orchestration and Governance
1. Center selection orchestrator
2. No-center decision contract
3. Center switch stability policy
4. Focus-state-aware orchestration contract

### Track C (P0): Scope and Topology Safety
1. Local-before-global overlap gate
2. Layering allocator
3. Neighborhood boundary contract

### Track D (P1): Persistence and Suppression Integrity
1. Lifecycle persistence
2. Suppression/restore semantics
3. Audit ledger contract

### Track E (P1): Latent Safety Hardening
1. Anti-amplification guards
2. Lexical demotion policy
3. Visibility gate
4. Maturity-aware policy

### Track F (P2): Validation and Rollout Gating
1. Conformance suite
2. Pressure/overload checks
3. Silence legitimacy checks

---

## 11) Implementation Readiness Gates

Do not implement broad center-selection behavior until:
- candidate registry and eligibility engine are approved
- salience precedence and suppression semantics are approved
- local-before-global gate is approved
- no-center decision path is approved
- deep one-center lock behavior is approved

Do not roll out expanded center selection until:
- anti-amplification guards are active
- conformance and overload checks pass
- owner review confirms non-authoritative posture

---

## 12) High-Risk Failure Modes if Gaps Stay Open

1. Center authority drift:
   - inferred signals outrank user intent, producing directive centering.
2. Continuity hallucination:
   - unrelated global signals steer local center.
3. Recurrence inflation:
   - repeated phrasing/snapshots stabilize weak centers.
4. Deep reflection fracture:
   - multiple centers compete during writing.
5. Silence collapse:
   - no-center path disappears and system always pushes a center.

---

## 13) Coordinator Action Checklist

1. Open Track A and B planning tickets first; block implementation until approved.
2. Treat Track C as mandatory before global continuity influence work.
3. Require explicit suppression precedence proofs in any center-selection proposal.
4. Require no-center outcome handling in every center-selection API/UI design.
5. Gate rollout on validation artifacts, not ranking/parity output alone.

---

## 14) Final Principle

Center selection is safe only when user-owned salience remains primary, local grounding constrains global memory, no-center remains a first-class outcome, and latent guidance never becomes interpretive authority.
