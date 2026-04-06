# Domain-Boundary Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a current domain-boundary audit that maps pipeline layers and ends with a concrete three-wave cleanup plan (Wave 1 core, Wave 2 support, Wave 3 deferred), without code changes.

**Architecture:** Read-only audit across app routes, orchestration jobs, domain modules, and repos. Synthesize findings into a domain map, pipeline map, first-response contract, and prioritized cleanup waves.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, repo-local domain/orchestration modules.

---

## File Structure (Plan-Level)

- Create: `docs/superpowers/audits/2026-04-06-domain-boundary-audit.md`
- Reference (read-only): `docs/target-v0-intent-spec.md`, `docs/target-v0-migration-plan.md`, `docs/observation_extract.md`, `docs/frame_compose.md`, `docs/latent_synthesize.md`, `docs/work_block_compose.md`
- Reference (read-only): `app/api/**`, `app/session/**`, `app/new/**`, `src/domain/**`, `src/orchestration/**`, `src/db/repositories/**`, `src/lib/**`

---

### Task 1: Prepare a Dedicated Worktree (If Needed)

**Files:**
- Modify: none

- [ ] **Step 1: Check if already in a linked worktree**

Run:
```bash
git rev-parse --git-dir
git rev-parse --git-common-dir
git branch --show-current
```
Expected: If `--git-dir` and `--git-common-dir` differ, you are already in a linked worktree.

- [ ] **Step 2: Create a new worktree if not already in one**

Run (example):
```bash
git worktree add ..\mira-audit-2026-04-06 -b audit/domain-boundary-2026-04-06
```
Expected: New worktree created at `..\mira-audit-2026-04-06` and checked out on `audit/domain-boundary-2026-04-06`.

- [ ] **Step 3: Move into the worktree and confirm**

Run:
```bash
cd ..\mira-audit-2026-04-06
git status --short
```
Expected: Clean status in the new worktree.

### Task 2: Inventory Pipeline Entry Points (Routes + UI Flow)

**Files:**
- Modify: none
- Create: `docs/superpowers/audits/2026-04-06-domain-boundary-audit.md`

- [ ] **Step 1: List pipeline-relevant API routes**

Run:
```bash
rg --files app/api | sort
```
Expected: A full list of route files including `session/submit`, `observe`, `frame`, `frame/ensure`, `index-session`, `synthesize`, `work-block/next`, `anchors/rank`, `latent/latest`.

- [ ] **Step 2: Identify user-facing entry pages**

Run:
```bash
rg --files app/session app/new app/page.tsx | sort
```
Expected: Session flow pages (`app/session/[id]/(flow)/**`), new session pages, and root entry.

- [ ] **Step 3: Start the audit report with a pipeline index**

Create the file with the following initial section headers and an initial list of pipeline steps to verify:
```markdown
# Domain-Boundary Audit (2026-04-06)

## 1) Pipeline Index (To Verify)

- Session creation + entry capture
- Observation extraction
- Session index build
- Latent update
- Frame generation
- Work block progression
- Direction selection
- Anchors ranking
- Glossary indexing
- Dream map aggregation (v0/v2)
- Admin/backfill jobs
```

### Task 3: Inventory Domain Modules, Jobs, and Repos

**Files:**
- Modify: `docs/superpowers/audits/2026-04-06-domain-boundary-audit.md`

- [ ] **Step 1: List domain modules**

Run:
```bash
rg --files src/domain | sort
```
Expected: Domain areas such as `observe`, `frame`, `latent`, `index`, `work`, `glossary`, `dreammap`, `image`.

- [ ] **Step 2: List orchestration jobs**

Run:
```bash
rg --files src/orchestration | sort
```
Expected: Jobs like `jobExtractObservation`, `jobBuildSessionIndexFromObservation`, `jobUpdateLatent`, `jobGenerateFrame`, `jobBuildDreamMapV0`.

- [ ] **Step 3: List repo access layers**

Run:
```bash
rg --files src/db/repositories | sort
```
Expected: Repos such as `frameRepo`, `latentRepo`, `observationRepo`, `sessionIndexRepo`, `workQuestionLedgerRepo`.

- [ ] **Step 4: Add a Domain Map section to the audit report**

Append:
```markdown
## 2) Domain Map (Draft)

### Core Domains
- Session (creation, entries, answers)
- Observe (neutral extraction)
- Frame (first-response narrative)

### Support Domains
- Index (embeddings/session index)
- Latent (recommendation shaping)
- Anchors (ranking/keys)
- Directions (catalog selection)
- Work (progression cards)

### Deferred/Exploratory
- Dream map (v0/v2)
- Glossary (indexing/backfill)
- Admin/backfill queues
- Image pipeline (if not core)
```

### Task 4: Map Pipeline Steps to Layers and Blocking

**Files:**
- Modify: `docs/superpowers/audits/2026-04-06-domain-boundary-audit.md`

- [ ] **Step 1: Inspect core pipeline routes for data dependencies**

Run:
```bash
rg "session/submit|session/ensure|observe|frame/ensure|frame|index-session|synthesize|work-block/next" app/api -n
```
Expected: References to main routes and their modules to follow.

- [ ] **Step 2: Record blocking vs async decisions**

Append:
```markdown
## 3) Pipeline Layering (Block / Async / Deferred)

### Critical First-User-Path (Block)
- Session creation + entry save
- Observation extraction (minimal)
- Frame generation (minimal)

### Reflective Support (Async)
- Session index build
- Latent update
- Anchors ranking
- Directions catalog enrichment

### Deferred / Exploratory (Async or Offline)
- Dream map pipelines
- Glossary indexing
- Admin/backfill jobs
```

### Task 5: Define First-Response Contract

**Files:**
- Modify: `docs/superpowers/audits/2026-04-06-domain-boundary-audit.md`

- [ ] **Step 1: Derive minimal data/state needed for first render**

Append:
```markdown
## 4) First-Response Contract (Minimum Required State)

- Authenticated or guest session context
- Persisted session record + entry record
- Minimal observation payload
- Minimal frame payload (title, framing_text, recommended_slugs)
```

### Task 6: Produce Three-Wave Cleanup Plan

**Files:**
- Modify: `docs/superpowers/audits/2026-04-06-domain-boundary-audit.md`

- [ ] **Step 1: Add the wave structure**

Append:
```markdown
## 5) Cleanup Waves (Ordered)

### Wave 1: First-Response Core Boundary Cleanup
- Area: session/entry creation
  - Issue: boundary drift between app/new and session APIs
  - Fix: unify minimal contract and remove non-core blocking steps
  - Impact: faster first response, fewer failure points
  - Risks: session-id propagation, auth edge cases
- Area: observe + frame
  - Issue: inconsistent minimal payload expectations
  - Fix: define and enforce minimal schema for first response
  - Impact: deterministic first frame
  - Risks: fallback behavior for short input

### Wave 2: Reflective Support Cleanup
- Area: latent + index + anchors
  - Issue: support modules used as if core
  - Fix: enforce async execution and explicit availability checks
  - Impact: improved perceived performance
  - Risks: UI assumptions about presence

### Wave 3: Deferred / Exploratory Separation
- Area: dream map + glossary + admin/backfill
  - Issue: mixed into runtime flow without clear isolation
  - Fix: fully asynchronous/offline separation
  - Impact: reduced runtime coupling
  - Risks: background job scheduling consistency
```

### Task 7: Review, Risks, and Commit

**Files:**
- Modify: `docs/superpowers/audits/2026-04-06-domain-boundary-audit.md`

- [ ] **Step 1: Add drift notes and risks**

Append:
```markdown
## 6) Drift Notes & Risks

- Note any routes that bypass domain boundaries.
- Note UI reads of legacy tables that contradict the intended domain map.
- Note any jobs used synchronously on the critical path.
```

- [ ] **Step 2: Quick consistency check**

Run:
```bash
rg "Wave 1|Wave 2|Wave 3" docs/superpowers/audits/2026-04-06-domain-boundary-audit.md
```
Expected: All three waves present.

- [ ] **Step 3: Commit the audit report**

Run:
```bash
git add docs/superpowers/audits/2026-04-06-domain-boundary-audit.md
git commit -m "docs: add domain-boundary audit with cleanup waves"
```
Expected: Commit created with the audit report.

---

## Testing / Validation

- Not applicable (analysis-only).

---

## Rollback Plan

- Revert the audit document commit if needed:
```bash
git revert <commit-sha>
```

