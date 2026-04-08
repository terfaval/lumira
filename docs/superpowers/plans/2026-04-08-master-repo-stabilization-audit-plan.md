# Master Repo Stabilization Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a complete 4–6 week stabilization audit with a file-level inventory, domain/pipeline map, wave plan, and DB consolidation plan.

**Architecture:** Read-only audit across routes, domain modules, orchestration jobs, repositories, and Supabase migrations. Synthesize into a single audit report with explicit `keep / improve / defer / remove` decisions and a sequenced cleanup plan.

**Tech Stack:** Next.js App Router, TypeScript, Supabase SQL migrations.

---

## File Structure (Plan-Level)

- Create: `docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md`
- Reference (read-only): `docs/superpowers/specs/2026-04-07-master-repo-stabilization-design.md`
- Reference (read-only): `docs/superpowers/specs/2026-04-06-domain-boundary-audit-design.md`
- Reference (read-only): `docs/superpowers/specs/2026-04-06-first-response-boundary-design.md`
- Reference (read-only): `app/**`, `src/**`, `supabase/migrations/**`

---

### Task 1: Ensure a Dedicated Worktree

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
git worktree add ..\mira-stabilization-2026-04-08 -b audit/master-stabilization-2026-04-08
```
Expected: New worktree created at `..\mira-stabilization-2026-04-08` and checked out on `audit/master-stabilization-2026-04-08`.

- [ ] **Step 3: Move into the worktree and confirm**

Run:
```bash
cd ..\mira-stabilization-2026-04-08
git status --short
```
Expected: Clean status in the new worktree.

---

### Task 2: Create the Audit Document Scaffold

**Files:**
- Create: `docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md`

- [ ] **Step 1: Create the audit doc with required sections**

Create the file with this exact content:
```markdown
# Master Repo Stabilization Audit (2026-04-08)

## 1) Goal & Scope

- Produce a file-level inventory with `keep / improve / defer / remove` decisions.
- Define domain and pipeline boundaries (block / async / deferred).
- Build a 4–6 week wave plan based on the inventory.
- Define a concrete DB consolidation plan with explicit migrations.

## 2) Domain & Pipeline Map

### Core (Block)
- session -> observe -> frame -> work

### Support (Async)
- index -> latent -> anchors -> directions -> glossary

### Deferred (Async/Offline)
- dreammap, backfill, admin jobs, legacy pipelines

Rules:
- Glossary is async support for latent enrichment (not blocking).

## 3) File-Level Inventory

Columns:
- file
- status (`keep | improve | defer | remove`)
- owner domain
- pipeline layer (`block | async | deferred`)
- rationale
- dependencies
- risks
- flags (`frame-fix`, `latent-fix`)

| file | status | owner domain | pipeline layer | rationale | dependencies | risks | flags |
|---|---|---|---|---|---|---|---|

## 4) Pipeline Entry Points

- API routes:
- UI entry pages:
- Orchestration jobs:

## 5) Wave Plan (4–6 Weeks)

### Wave 1 (Week 1–2): First-response stabilization

### Wave 2 (Week 3–4): Support pipeline cleanup

### Wave 3 (Week 5–6): Deferred separation and removals

## 6) DB Consolidation Plan

### Target Tables (authoritative)

### Candidate Removals / Archives

### Migrations (explicit list)

### Data Cleanup

### Rollback

## 7) Risks & Constraints

- 
```

---

### Task 3: Inventory Pipeline Entry Points (Routes + UI)

**Files:**
- Modify: `docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md`

- [ ] **Step 1: List API routes**

Run:
```bash
rg --files app/api | sort
```
Expected: A sorted list of route files.

- [ ] **Step 2: List user-facing entry pages**

Run:
```bash
rg --files app/session app/new app/page.tsx | sort
```
Expected: Session flow pages, new session pages, and root entry.

- [ ] **Step 3: Record route + page entries in the audit**

Append under **Pipeline Entry Points**:
```markdown
- API routes:
  - (paste list from Step 1)
- UI entry pages:
  - (paste list from Step 2)
```

---

### Task 4: Inventory Domain Modules, Jobs, and Repositories

**Files:**
- Modify: `docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md`

- [ ] **Step 1: List domain modules**

Run:
```bash
rg --files src/domain | sort
```
Expected: Sorted list of domain files.

- [ ] **Step 2: List orchestration jobs**

Run:
```bash
rg --files src/orchestration | sort
```
Expected: Sorted list of job files.

- [ ] **Step 3: List repository modules**

Run:
```bash
rg --files src/db/repositories | sort
```
Expected: Sorted list of repository files.

- [ ] **Step 4: Add these files to the inventory table**

For each file from Steps 1–3, add a row to the inventory table and assign:
- status (`keep | improve | defer | remove`)
- owner domain
- pipeline layer (`block | async | deferred`)
- rationale
- dependencies
- risks

---

### Task 5: Frame + Latent + Glossary Focus Scan

**Files:**
- Modify: `docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md`

- [ ] **Step 1: Locate frame-related modules**

Run:
```bash
rg -n "frame" app src
```
Expected: All frame-related references.

- [ ] **Step 2: Locate latent-related modules**

Run:
```bash
rg -n "latent" app src
```
Expected: All latent-related references.

- [ ] **Step 3: Locate glossary-related modules**

Run:
```bash
rg -n "glossary" app src
```
Expected: All glossary-related references.

- [ ] **Step 4: Flag frame/latent files in inventory**

Update inventory rows with:
- `frame-fix` for frame-related files that need correction.
- `latent-fix` for latent-related files that need correction.

---

### Task 6: DB Consolidation Audit

**Files:**
- Modify: `docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md`

- [ ] **Step 1: List migration files**

Run:
```bash
rg --files supabase/migrations | sort
```
Expected: Sorted list of migration SQL files.

- [ ] **Step 2: Extract all table definitions**

Run:
```bash
rg -n "create table" supabase/migrations
```
Expected: Lines containing `create table` with file paths.

- [ ] **Step 3: Extract alterations and drops**

Run:
```bash
rg -n "alter table|drop table|drop column" supabase/migrations
```
Expected: Lines with alter/drop operations.

- [ ] **Step 4: Summarize authoritative tables**

In **DB Consolidation Plan**, list authoritative tables by name with a one-line role each.

- [ ] **Step 5: Identify candidate removals/archives**

List tables/columns that are not referenced by any `keep/improve` files.

- [ ] **Step 6: Define explicit migrations**

For each candidate removal/archive, define one migration with:
- file name (new migration SQL)
- operations (drop, archive, move)
- rollback guidance

---

### Task 7: Build the Wave Plan

**Files:**
- Modify: `docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md`

- [ ] **Step 1: Assign Wave 1 items**

Criteria:
- Any `block` pipeline items.
- All `frame-fix` and `latent-fix` that affect first response.

Add bullet items under **Wave 1** with file references and rationale.

- [ ] **Step 2: Assign Wave 2 items**

Criteria:
- `async` support items and glossary improvements.

Add bullet items under **Wave 2** with file references and rationale.

- [ ] **Step 3: Assign Wave 3 items**

Criteria:
- `defer` and `remove` items.

Add bullet items under **Wave 3** with file references and rationale.

---

### Task 8: Risks & Constraints

**Files:**
- Modify: `docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md`

- [ ] **Step 1: Capture risks tied to the waves**

Add 5–10 bullet points, each mapping to a specific file or subsystem.

---

### Task 9: Review and Commit

**Files:**
- Modify: `docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md`

- [ ] **Step 1: Quick consistency scan**

Run:
```bash
rg "Wave 1|Wave 2|Wave 3|keep|improve|defer|remove" docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md
```
Expected: All waves and status labels present.

- [ ] **Step 2: Commit the audit report**

Run:
```bash
git add docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md
git commit -m "docs: add master repo stabilization audit"
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
