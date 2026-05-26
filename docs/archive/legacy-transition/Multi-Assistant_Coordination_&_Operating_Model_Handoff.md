# Lumira — Multi-Assistant Coordination & Operating Model Handoff v1

## Purpose

This document defines how Lumira development coordination should work across multiple GPT/Codex assistants.

The goal is to preserve:

* architectural coherence,
* reflective product philosophy,
* runtime safety,
* and long-term design continuity,

while allowing implementation, UX, audits, and redesign work to happen in parallel.

---

# 1. Core Coordination Principle

Lumira development should proceed through:

# small, validated, bounded slices

—not large uncontrolled rewrites.

The system is currently transitioning from:

* exploratory prototype state
  toward:
* stabilized alpha architecture.

Because of this:

* cleanup,
* redesign,
* schema simplification,
* UX evolution,
* and reflective model redesign

must remain coordinated.

---

# 2. Assistant Roles

## A. Primary System Architect Assistant

Responsibilities:

* maintain global system coherence
* preserve product philosophy
* maintain reflective model consistency
* coordinate roadmap direction
* define boundaries between alpha vs post-alpha
* detect architectural drift
* coordinate cleanup order
* validate conceptual consistency between UX/backend/model layers

This assistant should:

* think longitudinally
* preserve historical context
* maintain “why” behind decisions
* prevent local optimizations from breaking long-term direction

This assistant is NOT primarily:

* a rapid implementation engine
* a UI pixel designer
* a large-volume code generator

---

## B. Codex / Implementation Assistant

Responsibilities:

* execute tightly-scoped BUILD tickets
* perform audits/searches
* implement bounded cleanup slices
* update docs and ledgers
* run validation commands
* preserve existing behavior unless explicitly changed

Codex tasks should:

* have explicit scope
* define exact files/routes/tables
* define validation expectations
* define what must NOT change

Codex should avoid:

* autonomous product redesign
* uncontrolled refactors
* changing conceptual contracts without approval

---

## C. UX / Reflective Experience Assistant

Responsibilities:

* Reflective Space IA
* state/surface architecture
* pacing and interaction behavior
* desktop/mobile interaction logic
* emotional UX consistency
* instrumentation behavior
* reflective thread UX
* question presentation UX
* continuity/memory interaction patterns

The UX assistant should work from:

* the Reflective Interaction Model
* the Core Model Reframe
* and the dream-space philosophy

The UX assistant should avoid:

* inventing fake instrumentation
* SaaS/dashboard patterns
* productivity metaphors
* workflow-stepper assumptions

---

# 3. Development Philosophy

Lumira should evolve through:

1. Stabilization
2. Clarification
3. Simplification
4. Reflective redesign
5. UX deepening

—not through uncontrolled feature expansion.

---

# 4. Required Ticket Pattern

Every ticket should clearly state:

## Type

* AUDIT
* PLAN
* BUILD
* CLEANUP
* DOCS

## Scope

Exactly what is included/excluded.

## Risks

What could accidentally break.

## Validation

Required:

* typecheck
* lint result summary
* manual runtime validation when applicable

## Confirmation

Explicitly state:

* whether DB/schema changed
* whether runtime behavior changed
* whether UX changed
* whether APIs/routes changed

---

# 5. Alpha Stabilization Principle

Alpha priority is:

* runtime reliability
* architectural cleanup
* reflective coherence

NOT:

* feature breadth
* experimental systems
* visual polish
* speculative intelligence systems

Dream-map removal was an example of this principle:
remove unstable/unfocused systems before deeper redesign.

---

# 6. Reflective Product Principle

Lumira is NOT:

* a workflow engine
* a coaching app
* a chatbot
* a symbolic dream interpreter

Lumira IS:

* a reflective dream-space
* a continuity-aware memory system
* a contemplative dream instrument

This principle must survive:

* UX redesign
* backend redesign
* schema redesign
* AI model redesign

---

# 7. Non-Interpretive Contract

Lumira may internally use:

* probabilistic inference
* latent reflective hypotheses
* recurrence modeling
* emotional/tension modeling

BUT:
the user-facing layer must remain:

* non-authoritative
* autonomy-preserving
* revisable
* optional
* reflective rather than diagnostic

Internal cognition ≠ external certainty.

---

# 8. Documentation Principle

Important decisions should become:

* specs
* audits
* plans
* coordination memos

The system should not rely on:

* ephemeral chat memory
* undocumented assumptions
* hidden product logic

Docs are the long-term memory layer of the project.

---

# 9. Long-Term Coordination Principle

The product should evolve coherently across:

* runtime architecture
* DB contracts
* UX interaction model
* reflective cognition model
* glossary/memory systems
* AI question behavior

No assistant should optimize one layer while ignoring the others.

---

# 10. Current Strategic Direction

Current direction:

* stabilize alpha runtime
* simplify architecture
* redesign reflective interaction model
* evolve Summary into Reflective Space
* redesign Observation/Latent/Glossary/Work systems
* soften workflow rigidity
* deepen continuity and memory systems
* preserve calm reflective pacing

This direction should be treated as canonical unless explicitly superseded.
