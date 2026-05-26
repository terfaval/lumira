# Lumira Reflective Center Selection Contract v1

## Status

Canonical runtime-UX contract for reflective center selection in Reflective Space.

This document defines:
- what can become a reflective center
- how center strength emerges and decays
- how foreground/midground/background are selected
- how focus-state context modifies center behavior
- how latent supports attention without becoming authority

This document is:
- planning-level contract
- runtime-aware
- UX-orchestration-guiding

This document is NOT:
- recommendation system spec
- productivity prioritization model
- interpretation engine
- implementation ticket

---

## Ticket Protocol

### 1) Goal restatement
- Define the canonical contract for selecting and stabilizing the current reflective center.
- Preserve optionality, calmness, ambiguity, and user meaning ownership.
- Ensure center selection remains non-authoritative and anti-amplification-safe.
- Provide explicit unresolved questions and implementation gap handoff.

### 2) Touched files
- New: `docs/runtime/lumira-reflective-center-selection-contract-v1.md`
- New: `docs/runtime/lumira-reflective-center-selection-technical-gaps-v1.md`

### 3) Planning steps
1. Anchored to Focus-State contract and technical gaps.
2. Anchored center philosophy to latent attention bridge model and latent audit findings.
3. Defined eligibility, strengthening, weakening, suppression, and no-center outcomes.
4. Added mode-aware behavior, local-before-global discipline, and anti-amplification rules.
5. Added review checklist and future contract questions.

### 4) Acceptance criteria (DoD)
- Canonical reflective center definition provided.
- All 10 required conceptual areas defined.
- User-owned salience precedence specified.
- Silence/no-center legitimacy specified.
- Companion technical gap document delivered.

### 5) Validation
- Documentation-only contract.
- No runtime/schema/UI changes.

### 6) Rollback
- Documentation-only rollback by reverting this file.

---

## 1) Core Principle

Reflective center selection is:

# attentional gravity organization

It is NOT:
- recommendation ranking
- task prioritization
- interpretation authority
- meaning assignment

The system should help answer:

# what may be worth staying with now?

not:

# what this means.

---

## 2) Canonical Reflective Center Definition

A reflective center is:

# the current gravitational focus of reflection

It should feel like:

# stay with this

not:

# solve this

---

## 3) Primary Contract Questions (Answered)

1. What can become a center?  
Only eligible center candidates with sufficient grounding and pacing legitimacy.

2. What strengthens a center?  
Diverse grounded evidence plus user-owned engagement signals.

3. What weakens a center?  
Non-engagement, explicit suppression/defer, weak evidence, lexical-only recurrence.

4. What prevents escalation?  
Mode gates, suppression precedence, anti-amplification rules, overload/silence gates.

5. What remains foreground/midground/background?  
Center-linked active material in foreground, nearby support in midground, dormant/weak/suppressed in background.

6. How does user-owned salience outrank inference?  
Hard precedence rule: user-authored/confirmed actions dominate inference-only signals.

7. When is silence/no-center correct?  
Low confidence, conflicting signals, saturation, high emotional density, explicit user quiet intent.

8. How does local-before-global discipline work?  
Global continuity only enters selection when overlap legitimacy gates pass.

9. How does behavior differ by focus-state?  
Orientation soft center, local temporary micro-center, deep single dominant center, capture writing-as-center.

10. How does latent support without authority?  
Latent provides bounded candidate organization and context shaping; never final meaning claims.

---

## 4) Center Eligibility

### 4.1 Eligible center candidate classes

Eligible candidates include:
- current reflective object (dream/memory/journal fragment)
- object-local dream fragment/scene transition
- user highlight
- affective transition or contradiction with evidence
- active/revisited reflective thread
- reflective opening (user-opened or context-legitimate)
- reflective response or user note
- glossary motif with user context
- continuity neighborhood with strong local grounding

### 4.2 Ineligible or restricted classes

Not eligible for direct center promotion:
- raw latent hypothesis payloads
- lexical recurrence alone
- repeated AI phrasing alone
- ungrounded global dormant thread signals
- suppressed/dismissed items (unless explicit user restore)

### 4.3 Never-auto-promote rules

The following may never auto-promote to foreground center:
- dismissed centers
- suppressed openings
- weak-confidence recurrence-only candidates
- cross-context candidates with no overlap proof

---

## 5) User-Owned Salience Precedence

### 5.1 Core precedence rule

User-owned signals outrank inference-only signals.

### 5.2 High-strength user-owned signals

- confirmed highlights
- user reflective responses
- glossary notes and user-pinned motifs
- explicit connection statements (`this feels connected`)
- revisitation actions
- thread continuation actions
- sustained writing engagement
- explicit confirmations
- explicit suppression/dismissal/defer actions

### 5.3 System-inferred signals (supportive, weaker alone)

- recurrence detection
- latent continuity possibilities
- lexical similarity markers
- latent opportunity classification

### 5.4 Suppression precedence

User suppression/dismiss/defer is a binding negative salience signal and must override inferred promotion pressure.

---

## 6) Signal Weighting Philosophy

Center strength should emerge from converging grounded signals, not repetition count.

### 6.1 Positive weighting dimensions

- evidence diversity (multiple source types)
- user interaction depth (response/note/highlight continuation)
- continuity grounding (thread/motif/object-local coherence)
- emotional density with evidence support
- reflective engagement recency with persistence
- validated recurrence with user context

### 6.2 Negative weighting dimensions

- lexical-only recurrence
- repeated near-identical snapshots
- repeated AI restatement without new evidence
- unresolved global-scope carryover without local overlap
- repeated non-engagement to same invitation

### 6.3 Prohibited weighting logic

Center strength must NOT increase from:
- repetition alone
- phrasing reuse
- snapshot volume
- isolated recurrence count

---

## 7) Foreground / Midground / Background Selection

### 7.1 Foreground

Foreground contains:
- current center candidate
- center-attached active opening or response context
- center-linked writing surface

Properties:
- engageable now
- low competition
- one primary center (especially in deep reflection)

### 7.2 Midground

Midground contains:
- nearby glossary notes/motifs with overlap
- linked highlights
- related responses
- adjacent continuity lines

Properties:
- contextual support
- revisitable
- non-demanding

### 7.3 Background

Background contains:
- dormant threads
- weak recurrence
- old low-salience continuity
- suppressed/deferred structures

Properties:
- quiet
- non-demanding
- no silent auto-promotion

---

## 8) Focus-State-Aware Center Behavior

### 8.1 Orientation Mode

- broader topology visible
- soft center dominance
- bounded multi-structure visibility
- no center overload

### 8.2 Local Interaction Mode

- temporary local micro-center
- no automatic escalatory center replacement
- reversible local focus

### 8.3 Deep Reflection Mode

- one dominant center required
- adjacent context only
- reduced competition and opening count
- writing-first center lock

### 8.4 Capture Mode

- usually no reflective center selection routine
- writing itself is the center
- continuity surfacing withheld by default

---

## 9) Local-Before-Global Discipline

Default rule:

# local continuity outranks global continuity

### 9.1 Local scope precedence

Local scope order:
1. object-local evidence and user salience
2. thread-local continuity
3. motif-local relational memory
4. global continuity signals (only if overlap gate passes)

### 9.2 Global overlap legitimacy gates

Global signal may influence current center only if one or more apply:
- shared user-confirmed glossary motif
- explicit user-declared connection
- clear thread membership overlap
- strong evidence-backed affective similarity
- repeated validated continuity across objects

Without gate passage, global continuity remains background only.

---

## 10) Silence / No-Center Legitimacy

No-center is a valid outcome and often the safest pacing behavior.

### 10.1 Legitimate no-center conditions

- low confidence across candidates
- conflicting candidate signals
- density or pressure risk
- explicit suppression/defer posture
- high emotional load with weak grounding
- early latent stage with low relational memory

### 10.2 Allowed no-center outputs

- weak orientation only
- no opening surfaced
- present-material-only reflection
- quiet revisitation state
- capture-only flow

---

## 11) Center Lifecycle

### 11.1 Canonical lifecycle states

- `possible`
- `emerging`
- `user_resonant`
- `stabilized`
- `weakened`
- `suppressed`

### 11.2 Upward movement conditions

`possible -> emerging`:
- initial grounded support beyond lexical-only recurrence

`emerging -> user_resonant`:
- user interaction (highlight/note/response/explicit connection)

`user_resonant -> stabilized`:
- multi-source evidence + repeated user-confirmed relevance over time

### 11.3 Weakening conditions

Any active state -> `weakened` when:
- repeated non-engagement
- contradictory evidence
- confidence decay
- local overlap loss

### 11.4 Suppression behavior

Any non-suppressed state -> `suppressed` on explicit user action.  
Suppressed state cannot auto-stabilize or auto-promote.

Critical invariant:

# system repetition alone must never stabilize a center

---

## 12) Deep Reflection Support Model

Latent may support deep reflection via:
- nearby center-linked context
- related highlights and motifs
- linked responses and thread continuity
- bounded continuity fragments

Latent must not:
- flood context
- expose raw hypotheses
- surface confidence scores
- generate diagnostic narratives
- create AI authority posture

Deep Reflection remains writing-first and center-first.

---

## 13) Anti-Amplification Rules

1. Repetition is not validation.
2. Ignored openings reduce future resurfacing weight.
3. Suppression overrides inference.
4. Lexical recurrence alone remains weak.
5. Repeated AI phrasing is not evidence.
6. Snapshot frequency cannot inflate center confidence.
7. Global dormant-thread presence cannot override local relevance gates.
8. Low-evidence candidates decay toward background or silence.

---

## 14) Required Review Focus

Review must verify:
- center selection remains non-authoritative
- user-owned salience clearly dominates inference
- orientation avoids multi-center overload
- deep reflection preserves one-center clarity
- silence/no-center remains viable
- local-before-global discipline is enforceable
- latent remains orchestration, not interpretation

---

## 15) Canonical References

- `docs/runtime/lumira-reflective-focus-state-contract-v1.md`
- `docs/runtime/lumira-reflective-focus-state-technical-gaps-v1.md`
- `docs/runtime/latent-attention-reflective-center-model-v1.md`
- `docs/superpowers/audits/2026-05-26-latent-architecture-audit-v1.md`
- `docs/canon/lumira-reflective-space-ia-v0.md`
- `docs/canon/lumira-reflective-interaction-grammar-v0.md`
- `docs/canon/opening-interaction-principles-v1.md`
- `docs/canon/lumira-reflective-thread-model-v0.md`
- `docs/canon/LUMIRA-CONSTITUTION-v1.md`
- `docs/superpowers/audits/2026-05-26-reflective-space-experiential-convergence-audit-v1.md`

---

## 16) Open Follow-Up Questions

1. Should center lifecycle be persisted per candidate type or normalized across all center classes?
2. What exact overlap threshold passes global-to-local eligibility?
3. How should center weakening decay be time-based vs interaction-based?
4. What is the max center-switch cadence allowed in Orientation without disorientation?
5. Which explicit user actions should hard-lock deep center for a session segment?
6. How should center selection vary in early-latent vs mature-latent users?
7. What fallback phrasing should represent no-center state without implying failure?

---

## 17) Final Principle

Reflective center selection succeeds when Lumira softly organizes reflective gravity, user-owned salience remains primary, silence remains legitimate, and latent supports attentional orientation without claiming meaning authority.
