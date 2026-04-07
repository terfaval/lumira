# Master Repo Stabilization Design

Date: 2026-04-07
Repo: c:\mira
Owner timezone: Europe/Budapest

## 1) Goal & Time Horizon

Goal:
- Deliver a 4–6 week stabilization program for the repo.
- Establish domain boundaries and pipeline layering.
- Produce a file-level inventory with `keep / improve / defer / remove` decisions.
- Execute concrete DB consolidation and cleanup migrations.

Time horizon:
- Weeks 1–6, grouped into three waves.

## 2) Scope & Non-Goals

In scope (4–6 weeks):
- File-level inventory with `keep / improve / defer / remove` flags.
- First-response path stabilization and boundary cleanup.
- Frame and latent fixes (explicitly flagged and scheduled).
- Pipeline layering and blocking vs async decisions.
- Removal of unused routes and modules.
- DB consolidation with concrete migrations and cleanup steps.

Out of scope for this program:
- Major feature expansions or new product surfaces.
- Full UI redesign.
- Performance work not tied to first-response path.

## 3) Inputs (Read-Only References)

Primary references:
- docs/superpowers/specs/2026-04-06-domain-boundary-audit-design.md
- docs/superpowers/specs/2026-04-06-first-response-boundary-design.md
- docs/superpowers/audits/2026-04-06-domain-boundary-audit.md (when completed)

Code references:
- app/** and app/api/**
- src/domain/**
- src/orchestration/**
- src/db/repositories/**
- src/lib/**
- supabase/**

## 4) Deliverables

Primary outputs:
- Domain map with ownership boundaries and dependencies.
- Pipeline map with `block / async / deferred` classification.
- File-level inventory with `keep / improve / defer / remove` and rationale.
- 4–6 week wave plan with dependencies, risks, and milestones.
- DB consolidation plan with explicit migrations and cleanup steps.

Secondary outputs:
- Drift notes and boundary violations.
- Risk register with rollback guidance.

## 5) Domain & Pipeline Map

Core pipeline (block):
- session -> observe -> frame -> work

Support pipeline (async):
- index -> latent -> anchors -> directions -> glossary

Deferred pipeline (async or offline):
- dreammap, backfill, admin jobs, legacy pipelines

Rules:
- Glossary is async support for latent enrichment, not a blocking dependency.
- First-response depends only on the core pipeline.

## 6) File-Level Inventory Format

Each relevant file must be tagged with:
- status: `keep | improve | defer | remove`
- owner domain
- pipeline layer: `block | async | deferred`
- rationale
- dependencies
- risks

Inventory table columns:
- file
- status
- owner domain
- pipeline layer
- rationale
- dependencies
- risks

Special flags:
- `frame-fix` for files needing frame correction.
- `latent-fix` for files needing latent correction.

Definition:
- `improve` indicates a file stays but needs functional upgrades to fulfill its role.

## 7) Cleanup Waves (4–6 Weeks)

Wave 1 (Week 1–2): First-response stabilization
- Core boundary cleanup for session/observe/frame/work.
- Must-fix items for frame and latent (if they block or destabilize core output).
- Remove critical boundary drift in core routes.

Wave 2 (Week 3–4): Support pipeline cleanup
- Enforce async for index/latent/glossary/anchors/directions.
- Normalize API contracts and pipeline events.
- Execute non-blocking improvements that reduce coupling.

Wave 3 (Week 5–6): Deferred separation and removals
- Remove confirmed unused routes/modules.
- Split deferred pipelines into offline or background processing.
- Complete remaining `improve` items.

## 8) DB Consolidation Plan

Target outcomes:
- Define a reduced set of authoritative tables.
- Archive or remove obsolete tables and columns.
- Normalize indexes to support core queries.

Migrations:
- Provide explicit migration steps per table group.
- Use idempotent migrations where possible.
- Each migration includes rollback guidance.

Data cleanup:
- Remove orphan records.
- Drop legacy fields when not used by any `keep/improve` files.

Rollback:
- Snapshot before structural changes.
- Versioned migrations for safe revert.

## 9) Execution Tracking

Tracking table fields:
- item
- status (todo/doing/done)
- owner
- risk
- link

Cadence:
- Weekly update pass on inventory and wave progress.

## 10) Risks & Constraints

Risks:
- Breaking first-response by moving support work too early.
- Latent/glossary coupling assumptions.
- DB migrations affecting live data without full rollback path.

Constraints:
- Avoid dependency changes unless explicitly approved.
- Prefer minimal diffs and scoped changes.

## 11) Definition of Done

- File-level inventory completed with `keep / improve / defer / remove`.
- Wave plan finalized and sequenced.
- DB consolidation plan includes concrete migrations.
- All decisions trace back to domain/pipeline boundaries.

