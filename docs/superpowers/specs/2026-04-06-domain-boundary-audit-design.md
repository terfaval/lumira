# Domain-Boundary Audit Design

Date: 2026-04-06
Repo: c:\mira

## 1) Goal & Scope

Goal:
- Stabilize architecture by defining clear domain boundaries and responsibilities.
- Derive pipeline layering (block/async/deferred) from those boundaries.
- Produce a concrete cleanup backlog without implementing changes.

Scope (in):
- Identify major domains, modules, and routes/jobs.
- Classify pipeline steps by layer and blocking behavior.
- Define the minimum "first-response" contract (required data/state).
- List drift points where implementation diverges from intended domain boundaries.

Scope (out):
- No code changes.
- No DB migrations or table consolidation.
- No dependency changes.

## 2) Deliverables

Primary outputs:
- Domain map: domain units, responsibilities, dependencies.
- Pipeline map: steps tagged as block / async / deferred.
- First-response contract: minimal required data/state.
- Cleanup plan: ordered waves with concrete tasks (planning only).

Secondary outputs:
- Drift notes: mismatches between domain intent and implementation.
- Risk list: areas likely to break if refactored without care.

## 3) Method

Top-down:
- Trace the core user path(s) and identify the essential domains.
- Define domain ownership boundaries and explicit responsibilities.

Bottom-up:
- Inspect key routes, jobs, and domain modules.
- Map actual usage and dependencies to the domain model.

Classification:
- For each pipeline step and domain module:
  - Assign to layer: Critical First-User-Path / Reflective Support / Deferred Exploratory.
  - Mark as block vs async vs deferred.
  - Provide short rationale.

Drift detection:
- Flag points where data flow or responsibilities cross domain boundaries without a clear contract.

## 4) Data Sources (Read-Only)

- app/** routes (especially app/api/** and session flow pages).
- src/domain/** and src/lib/** modules.
- src/orchestration/jobs/**.
- Existing docs in docs/** and any current audit files.

## 5) Definition of Done (DoD)

- All major pipeline steps and modules classified with rationale.
- Blocking vs async is explicit for each pipeline step.
- First-response contract is documented.
- Cleanup backlog is ordered and actionable.
- No code changes made.

## 6) Cleanup Plan Format (Waves)

The audit must converge into a concrete, ordered cleanup plan with three waves:
- Wave 1: First-response core boundary cleanup.
- Wave 2: Reflective support cleanup.
- Wave 3: Deferred / exploratory separation.

Each item includes:
- Area / module
- Current issue (drift or boundary violation)
- Proposed fix (conceptual)
- Expected impact
- Dependencies / risks

## 7) Risks & Constraints

- Keep scope limited to architecture/pipeline decisions.
- Avoid deep DB consolidation; note it as a later wave.
- Minimize inference; prefer evidence from code paths.

## 8) Next Step After Audit

- Write a multi-step implementation plan (separate doc) for Wave 1.

