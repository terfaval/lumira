# Lumira — DB Schema Fix & Runtime Stabilization Handoff v1

## Purpose

This document defines the DB/runtime stabilization direction before larger reflective-model redesign work.

The current system contains:

* migration/runtime drift,
* legacy table families,
* transitional wrappers,
* duplicated concepts,
* and schema-contract inconsistencies.

The goal is NOT immediate perfection.

The goal is:

# stable alpha runtime truth.

---

# 1. Current Strategic Position

The repo has already undergone:

* wrapper collapse,
* dream-map runtime removal,
* highlight/glossary contract tightening,
* reflective model clarification.

Now the DB/runtime layer needs:

* stabilization,
* truth alignment,
* and cleanup sequencing.

---

# 2. Canonical Runtime Endpoint

Canonical orchestration endpoint:

* `/api/session/ensure`

Wrapper routes removed:

* `/api/frame`
* `/api/frame/ensure`
* `/api/session/bootstrap`

This is already completed.

---

# 3. Core Alpha Runtime Chain

Current alpha-critical chain:

1. User captures dream
2. `dream_sessions` + `dream_entries`
3. `/api/session/ensure`
4. Observation generation
5. Session index generation
6. Latent generation
7. Anchor ranking
8. Frame generation
9. Reflective work/question generation
10. Saved answers
11. Revisit via Reflective Space

This chain must remain stable during cleanup.

---

# 4. Core Tables To Preserve

## Session layer

* `dream_sessions`
* `dream_entries`
* `dream_answers`

## Observation layer

* `observation_versions`
* `observation_latest`

## Latent layer

* `latent_versions`
* `latent_latest`

## Session continuity layer

* `session_index_versions`
* `session_index_latest`

## Reflective frame layer

* `frame_versions`
* `frame_latest`

## Direction/work layer

* `direction_catalog`
* `session_directions`
* `work_versions`
* `work_latest`
* `work_question_ledger`

## Highlight/glossary layer

* `dream_entry_highlights`
* `dream_session_highlights`
* `dream_session_rejected_suggestions`
* `glossary_terms`
* `glossary_occurrences`
* `glossary_notes`

## Shared orchestration

* `domain_jobs`
* `domain_events`
* `material_snapshots`

---

# 5. Transitional / Legacy Areas

These are candidates for future removal or merge:

* legacy observation tables
* old summary-era tables
* duplicate anchor/index concepts
* isolated dream-map remnants
* unused wrapper-era logic

However:
cleanup must follow runtime proof.

Never remove based only on naming assumptions.

---

# 6. Important Current Direction

## Anchors + Index

Current direction:

* likely transitional
* increasingly overlapping with glossary/memory systems

Long-term possibility:

* absorb anchor/index responsibilities into glossary-driven recurrence and retrieval systems

But:
DO NOT redesign this prematurely during alpha stabilization.

---

# 7. Glossary Direction

Glossary is:

* NOT symbolic interpretation
* NOT a universal dream dictionary

Glossary IS:

* personal motif memory
* cross-session recurrence layer
* user-owned continuity system

Candidate generation should primarily come from:

* observation extraction

NOT:

* arbitrary AI inference

User confirmation remains critical.

---

# 8. Highlight Contract

Canonical understanding:

## `dream_entry_highlights`

* raw text-span/user salience layer

## `dream_session_highlights`

* session-level normalized reflective signal state

## `dream_session_rejected_suggestions`

* rejection-memory lifecycle

Current alpha decision:

* keep dual-table structure
* tighten ownership/contracts
* defer larger redesign

---

# 9. Migration Strategy Principle

The DB may eventually be rebuilt more cleanly.

However:
current priority is runtime stability first.

Recommended order:

1. Stabilize runtime contracts
2. Audit migration truth
3. Produce canonical schema manifest
4. Only then:

   * simplify
   * rebuild
   * or migrate deeply

Do NOT attempt a full redesign migration while:

* UX is shifting
* reflective model is evolving
* observation/latent redesign is still in flux

---

# 10. Current Known Schema Gaps

Already patched:

* glossary compatibility columns
* rejected suggestion upsert policy
* glossary visibility fields

But larger risks still exist:

* migration order drift
* undeclared runtime dependencies
* partial legacy table families
* hidden rebuild inconsistencies

A future:

# “full rebuild verification”

ticket is still required.

---

# 11. Alpha Stability Principle

Alpha DB/runtime goal is:

# predictable reflective runtime behavior

—not perfect architecture.

It is acceptable temporarily to:

* preserve transitional tables,
* keep duplicated structures,
* defer cleanup,

if stability is preserved.

---

# 12. Important Constraint

Observation/latent/work redesign is coming.

Therefore:
avoid schema decisions that lock the system into:

* current rigid workflow assumptions,
* current work-card structure,
* current direction-locking model.

The DB should remain flexible enough for:

* reflective thread systems
* dream-space states
* softer question systems
* glossary-centered continuity
* highlight-driven reflection

---

# 13. Immediate Recommended Next Phase

Not implementation yet:

* produce canonical schema/runtime manifest
* identify truly active runtime payloads
* separate:

  * user-visible reflective state
  * internal cognition state
  * orchestration/debug state

This should support:

* future observation redesign
* latent redesign
* reflective-space UX
* and eventual DB simplification/rebuild.
