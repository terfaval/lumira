````md id="lumira-clean-room-stack-decision-v1"
# Clean-room Stack Decision v1

## Status

Draft — Technical Direction Decision  
Clean-room rebuild foundation note.

This document records the current stack decision for the Lumira clean-room rebuild.

---

# 1. Decision

Lumira should remain a TypeScript-based web application for the clean-room rebuild.

Recommended baseline stack:

- Next.js
- React
- TypeScript
- Supabase

This decision is not based on TypeScript being philosophically important.

It is based on:
- webapp fit,
- Codex compatibility,
- type safety,
- agent maintainability,
- and reducing architectural complexity during rebuild.

---

# 2. Why TypeScript Remains Appropriate

Lumira contains many sensitive domain boundaries:

- Dream Entry
- Observation
- Latent Hypothesis
- Reflective Thread
- Reflective Opening
- Glossary Term
- Reflective Response
- Reflective Space

These objects must not be casually mixed.

TypeScript helps preserve:
- object boundaries,
- payload contracts,
- runtime states,
- internal vs user-facing distinctions,
- and safe refactorability.

This is especially important because most implementation work will be done by Codex or similar agents.

---

# 3. TypeScript Is Not the Architecture

TypeScript should remain the implementation language.

But the architecture must be:

# domain-first

not:

# framework-first.

The rebuild must not become:

- route-first Next.js logic,
- UI-owned cognition,
- API-owned meaning,
- or component-driven domain modeling.

Next.js routes should be thin delivery surfaces.

The reflective runtime should live in explicit domain/runtime layers.

---

# 4. Recommended High-Level Shape

The clean-room repo should roughly separate:

```txt
app/
  Route entrypoints only.
  No domain ownership.
  No hidden cognition logic.

src/domain/
  Canonical domain models and rules.

src/runtime/
  Reflective runtime orchestration and state movement.

src/cognition/
  Observation and latent cognition layers.

src/reflective-space/
  Reflective Space assembly and presentation-safe composition.

src/infrastructure/
  Supabase, persistence, storage, external service boundaries.

src/ui/
  Presentation components only.
  No meaning ownership.
````

Exact folder names may evolve, but the separation principle should remain stable.

---

# 5. Why Not Switch Fully to Python Now

Python may be useful later for research-heavy cognition work.

However, switching the whole app to Python now would likely introduce:

* frontend/backend split complexity,
* more deployment surface,
* more coordination burden,
* more agent-context fragmentation,
* and higher integration risk.

For a non-coder product owner working mostly through Codex, this would probably make the project harder, not easier.

---

# 6. Possible Future Python Boundary

A future Python cognition service may be considered if:

* observation/latent processing becomes research-heavy,
* NLP experimentation needs Python libraries,
* model pipelines become too complex for TypeScript,
* or cognition processing needs independent scaling.

If introduced later, Python should be isolated as:

# cognition infrastructure

not as the main application architecture.

The main app should still preserve:

* domain ownership,
* reflective runtime rules,
* user-facing restraint,
* and persistence contracts.

---

# 7. Friend Review Consideration

It is valid that some human reviewers may be more comfortable with other languages.

However, the primary maintainer will effectively be Codex.

Therefore the stack should optimize for:

* agent correctness,
* type boundaries,
* stable refactoring,
* and clear architectural contracts.

Human review can still focus on:

* repo structure,
* product logic,
* domain naming,
* generated documentation,
* tests,
* and behavior walkthroughs.

---

# 8. Non-Negotiable Architecture Rule

The problem to solve is not:

# which language is easiest.

The problem is:

# which architecture best preserves Lumira’s reflective integrity.

TypeScript is acceptable only if the repo is structured so that:

* routes do not own cognition,
* UI does not own meaning,
* latent does not surface directly,
* glossary does not become interpretation authority,
* threads do not become tasks,
* and runtime does not become workflow progression.

---

# 9. Current Stack Recommendation

Proceed with:

```txt
Next.js + React + TypeScript + Supabase
```

But rebuild around:

```txt
Reflective Space
Domain-first runtime
Internal/external cognition separation
Continuity-first architecture
Thin routes
Clear persistence boundaries
```

---

# 10. Final Principle

Do not change language to escape architectural confusion.

Clarify the architecture.

Then use TypeScript to enforce it.

```
