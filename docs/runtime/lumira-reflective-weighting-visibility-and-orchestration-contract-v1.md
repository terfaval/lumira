# Lumira Reflective Weighting, Visibility, and Orchestration Contract v1

## Status

Canonical attentional orchestration contract for reflective weighting, visibility layering, demotion, resurfacing, and silence legitimacy.

This document defines:
- how foreground/midground/background are arbitrated
- how calmness is preserved under density pressure
- how demotion and resurfacing gates operate
- how user-owned salience overrides inference
- how orchestration behavior varies by focus-state

This document is:
- planning-level
- runtime-UX contract
- orchestration-guiding

This document is NOT:
- implementation code
- scoring engine implementation
- schema/runtime mutation
- UI implementation

---

## Ticket Protocol

### 1) Goal restatement
- Define the first canonical attentional orchestration layer for Lumira.
- Establish executable visibility grammar for foreground/midground/background.
- Define demotion, resurfacing, silence, and density arbitration rules.
- Preserve non-authoritative, low-pressure reflective behavior.

### 2) Touched files
- New: `docs/runtime/lumira-reflective-weighting-visibility-and-orchestration-contract-v1.md`

### 3) Planning steps
1. Anchor orchestration philosophy to focus-state and center-selection contracts.
2. Define visibility eligibility and anti-escalation rules.
3. Define demotion/resurfacing/silence arbitration grammar.
4. Define homepage/mobile implications, blockers, and validation checks.

### 4) Acceptance criteria (DoD)
- Visibility layers and eligibility are explicit.
- Silence legitimacy and demotion-first policy are explicit.
- Resurfacing eligibility and suppression binding rules are explicit.
- Focus-state-aware orchestration behavior is explicit.
- Homepage/mobile implications and anti-patterns are explicit.

### 5) Testing / validation plan
- Contract-level review via checklist in Section 17.
- No runtime/schema/UI mutation in this ticket.

### 6) Rollback
- Documentation-only rollback by reverting this file.

---

## 1) Purpose and Scope

This contract defines how Lumira runtime should organize reflective visibility and weighting under uncertainty and density.

Core orchestration purpose:

# softly organize reflective gravity without becoming authority

The orchestration layer supports:
- orientation
- continuity legibility
- revisitation
- reflective pacing

It must not optimize for:
- engagement or retention
- emotional escalation
- urgency
- interpretive certainty

---

## 2) Orchestration Philosophy

Visibility exists to:
- preserve legibility
- preserve spaciousness
- preserve orientation clarity

Visibility does NOT exist to:
- maximize surfaced insight count
- maximize continuity density
- maximize perceived cleverness

Primary invariant:

# calmness outranks completeness

Secondary invariant:

# omission under ambiguity is healthier than weak surfacing

---

## 3) Visibility Layer Model

Canonical layers:

### Foreground
Current reflective center and directly relevant context.

### Midground
Nearby continuity with legitimate overlap and low pressure.

### Background
Dormant, weak, suppressed, unresolved, or low-confidence continuity.

Layer invariants:
- background remains quiet
- background cannot silently self-promote
- foreground competition remains low

---

## 4) Foreground / Midground / Background Rules

### 4.1 Foreground eligibility

Foreground requires all of:
- grounded relevance
- pacing legitimacy
- attentional clarity
- low competition

Allowed foreground candidates:
- current reflective object
- active reflective center
- user-confirmed motif
- explicitly revisited structure
- currently engaged opening
- nearby center-linked thread continuity

Not sufficient for foreground:
- lexical recurrence alone
- repeated AI phrasing
- snapshot count
- latent confidence alone
- dormant unresolved-thread presence alone

### 4.2 Midground eligibility

Midground may contain:
- nearby motifs
- related highlights
- linked glossary memory
- soft continuity adjacency
- low-pressure revisitation context

Midground properties:
- contextual
- revisitable
- non-demanding
- low urgency

Rule:

# midground supports; it does not compete

### 4.3 Background semantics

Background contains:
- dormant structures
- low-confidence recurrence
- suppressed/deferred items
- older low-salience continuity
- weak unresolved continuity

Background behavior:
- quiet persistence
- no silent escalation
- no resurfacing pressure loops

Background is not:
- failure
- lost state
- incomplete work backlog

---

## 5) Silence Legitimacy

Silence/no-surface is first-class valid runtime behavior.

Allowed silence outcomes:
- no opening
- no resurfacing
- no center promotion
- no continuity highlight escalation

Silence is preferred when:
- density risk is high
- evidence is weak or conflicting
- repeated non-engagement exists
- overlap legitimacy is weak
- emotional pressure risk is elevated
- user defer/suppress posture is active

Required invariant:

# absence of surfacing is often healthier than weak surfacing

---

## 6) Demotion Model

Demotion precedes additive escalation.

Demotion triggers include:
- rising foreground competition
- transition into Deep Reflection
- repeated non-engagement
- weakened overlap legitimacy
- pacing pressure signals
- viewport-driven density risk

Demotion operations:
- `foreground -> midground`
- `midground -> background`
- opening quieting/suppression eligibility
- adjacency fading
- continuity competition reduction

Required invariant:

# reduce competition before adding novelty

---

## 7) Resurfacing Model

Resurfacing must be:
- sparse
- overlap-grounded
- pacing-aware
- non-coercive

Resurfacing is NOT justified by:
- elapsed time alone
- repetition count
- engagement optimization pressure
- latent persistence alone

Legitimate resurfacing signals:
- explicit revisitation
- new overlap evidence
- confirmed motif continuity
- reflective re-entry proximity
- renewed user engagement

Suppression/defer binding rule:
- suppressed/deferred items cannot silently bypass suppression through alternate inference paths

---

## 8) User-Owned Salience Precedence

Hard precedence rule:

# user-owned salience outranks inference-only weighting

User-owned signals include:
- highlight
- note
- explicit connection
- revisitation
- glossary confirmation
- suppression/defer
- sustained writing

Inference-only signals remain:
- supportive
- weaker
- non-authoritative

Binding constraint:
- user suppression/defer remains active until explicit reactivation conditions are satisfied

---

## 9) Focus-State-Aware Orchestration

### Orientation Mode
- broader layered visibility allowed
- one soft center remains legible
- bounded topology richness, low pressure

### Local Interaction Mode
- local contextual visibility emphasis
- preserve surrounding context
- no broad escalation from local action alone

### Deep Reflection Mode
- one dominant center
- aggressive demotion of competing structures
- adjacent-only continuity context

### Capture Mode
- orchestration mostly suppressed
- continuity withheld by default
- writing itself acts as center

Cross-mode invariant:
- transitions should lower pressure, not increase demand

---

## 10) Density Arbitration

When density rises, apply this order:
1. demote
2. suppress (when eligibility requires)
3. simplify visible topology
4. choose silence if needed

Do NOT respond to density by:
- adding queues
- adding feeds
- adding tabs-as-pressure outlets
- adding extra AI summary blocks
- adding ranking dashboards

Density should reduce as:
- emotional load rises
- focus deepens
- viewport narrows

---

## 11) Homepage Implications

Homepage orchestration must:
- remain bounded
- remain low-competition
- prefer orientation over resurfacing pressure
- allow no-center/no-opening outcomes

Homepage must avoid:
- reflective inbox feeling
- unresolved queue framing
- "important things are waiting" pressure posture
- AI insight-feed behavior

---

## 12) Mobile Implications

Mobile orchestration should:
- further reduce visible density
- suppress preview-heavy continuity
- preserve Capture dominance
- prefer entry clarity over topology richness

Responsive invariant:

# as viewport shrinks, orchestration simplifies rather than compresses

Mobile-specific behavior:
- fewer surfaced continuity elements
- stricter demotion thresholds
- faster preference for silence under weak evidence

---

## 13) Anti-Amplification Rules

Explicitly prohibited:
- repetition as validation
- resurfacing loops
- unresolved opening pressure
- engagement-optimization resurfacing
- latent-confidence-only escalation
- continuity flooding
- unfinished-work pressure framing
- invisible foreground self-promotion
- accidental urgency generation

---

## 14) Anti-Patterns

Prohibited orchestration drift:
- dashboard-style continuity ranking
- productivity prioritization logic
- insight-feed orchestration
- hidden escalation pressure
- AI authority posture
- multi-center foreground overload
- unresolved-thread accumulation pressure
- inbox-like resurfacing
- "continue where you left off" coercion
- retention-driven resurfacing strategies

---

## 15) Open Implementation Questions

1. What exact threshold family triggers demotion across modes?
2. Should resurfacing cooldown windows be explicit and persisted?
3. How should ignored openings decay over repeated cycles?
4. What cadence caps prevent resurfacing pressure loops?
5. How should orchestration vary for early-latent vs mature-latent users?
6. What telemetry signals reliably indicate overload and pressure drift?
7. Should orchestration layer state persist cross-session, and at what granularity?
8. Beyond preview suppression, what explicit mobile-vs-desktop arbitration differences are required?
9. How should multiple weak valid centers arbitrate without forced promotion?
10. What overlap legitimacy score/gate is required before resurfacing eligibility?

---

## 16) Implementation Blockers and Readiness

Blockers before safe implementation:
1. Canonical weighting signal inventory and provenance classes are finalized.
2. Demotion trigger set is formalized per focus-state.
3. Suppression/defer lifecycle semantics are unified across openings/threads/center candidates.
4. Resurfacing eligibility gate contract is defined with explicit cooldown and overlap criteria.
5. Silence/no-surface outcome handling is integrated into payload/read-model contracts.
6. Mobile-specific simplification rules are aligned with homepage mobile contract.
7. Validation and telemetry contract for pressure/calmness drift is approved.

Readiness gate:
- orchestration implementation should not begin until weighting, demotion, resurfacing, and silence contracts are approved together.

---

## 17) Validation Checklist

Review must verify:
- calmness outranks completeness
- silence/no-surface is legitimate
- foreground competition remains low
- demotion precedes expansion
- resurfacing is sparse and legitimate
- user-owned salience overrides inference
- suppression/defer remains binding
- mobile orchestration simplifies rather than compresses
- homepage remains low-pressure
- orchestration does not become recommendation-engine behavior
- latent remains orchestration support, not authority

---

## 18) Canonical References

- `docs/runtime/lumira-reflective-focus-state-contract-v1.md`
- `docs/runtime/lumira-reflective-center-selection-contract-v1.md`
- `docs/runtime/lumira-homepage-orientation-composition-contract-v1.md`
- `docs/runtime/lumira-homepage-orientation-aggregate-payload-contract-v1.md`
- `docs/runtime/lumira-homepage-mobile-and-responsive-composition-contract-v1.md`
- `docs/canon/lumira-reflective-space-ia-v0.md`
- `docs/canon/lumira-reflective-interaction-grammar-v0.md`
- `docs/canon/Lumira_Interaction_Principles_v0.md`
- `docs/canon/opening-interaction-principles-v1.md`
- `docs/canon/LUMIRA-CONSTITUTION-v1.md`

---

## 19) Final Principle

Reflective orchestration succeeds when Lumira quietly organizes attention, preserves spaciousness and ambiguity, reduces pressure under uncertainty, and keeps continuity legible without becoming interpretive authority or engagement machinery.
