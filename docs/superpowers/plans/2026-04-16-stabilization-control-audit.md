# Stabilization Control Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a read-only stabilization control audit that maps the original stabilization plan to actual branches, worktrees, commits, and landed outputs.

**Architecture:** Evidence-first audit using existing stabilization docs plus `git branch`, `git worktree`, and targeted `git log` comparisons. The output is a single audit document that separates source-of-truth assets, execution reality, divergence, and next decision points without changing product code or repo process.

**Tech Stack:** Git, PowerShell, Markdown docs.

---

## File Structure (Plan-Level)

- Create: `docs/superpowers/audits/2026-04-16-stabilization-control-audit.md`
- Create: `docs/superpowers/plans/2026-04-16-stabilization-control-audit.md`
- Reference (read-only): `docs/superpowers/specs/2026-04-16-stabilization-control-audit-design.md`
- Reference (read-only): `docs/superpowers/specs/2026-04-07-master-repo-stabilization-design.md`
- Reference (read-only): `docs/superpowers/plans/2026-04-08-master-repo-stabilization-audit-plan.md`
- Reference (read-only): `docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md`
- Reference (read-only): `docs/superpowers/specs/2026-04-06-domain-boundary-audit-design.md`
- Reference (read-only): `docs/superpowers/plans/2026-04-06-domain-boundary-audit-plan.md`
- Reference (read-only): `docs/superpowers/plans/2026-04-09-first-response-boundary-implementation.md`

---

### Task 1: Establish the Audit Baseline

**Files:**
- Modify: `docs/superpowers/audits/2026-04-16-stabilization-control-audit.md`

- [ ] **Step 1: Read the approved audit design**

Run:
```bash
Get-Content -Raw "docs/superpowers/specs/2026-04-16-stabilization-control-audit-design.md"
```
Expected: The design defines scope, source-of-truth hierarchy, output structure, and classification labels for the audit.

- [ ] **Step 2: Read the primary stabilization source docs**

Run:
```bash
Get-Content -Raw "docs/superpowers/specs/2026-04-07-master-repo-stabilization-design.md"
Get-Content -Raw "docs/superpowers/plans/2026-04-08-master-repo-stabilization-audit-plan.md"
Get-Content -Raw "docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md"
```
Expected: You have the intended direction, the planned audit steps, and the completed stabilization audit content in memory for comparison.

- [ ] **Step 3: Create the audit document scaffold**

Create `docs/superpowers/audits/2026-04-16-stabilization-control-audit.md` with this exact content:

```markdown
# Stabilization Control Audit (2026-04-16)

## 1) Baseline

### Source-of-Truth Roles

| artifact | role | authority level | notes |
|---|---|---|---|
| docs/superpowers/specs/2026-04-07-master-repo-stabilization-design.md |  |  |  |
| docs/superpowers/plans/2026-04-08-master-repo-stabilization-audit-plan.md |  |  |  |
| docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md |  |  |  |
| docs/superpowers/specs/2026-04-06-domain-boundary-audit-design.md |  |  |  |
| docs/superpowers/plans/2026-04-06-domain-boundary-audit-plan.md |  |  |  |
| docs/superpowers/plans/2026-04-09-first-response-boundary-implementation.md |  |  |  |

### Intended Stabilization Sequence

- 

## 2) Execution Reality

| branch/worktree | apparent purpose | actual commit themes | relation to main | status | alignment |
|---|---|---|---|---|---|

## 3) Plan Divergence

### Aligned Work
- 

### Drifted Work
- 

### Stalled or Ambiguous Work
- 

## 4) Asset Status

### Already on `main`
- 

### Branch-Only
- 

### Doc-Only
- 

### Merge-Ready or Salvageable
- 

### Stale or Safely Discardable
- 

## 5) Decision Points

1. 
```

- [ ] **Step 4: Run a quick scaffold check**

Run:
```bash
Get-Content -Raw "docs/superpowers/audits/2026-04-16-stabilization-control-audit.md"
```
Expected: The file exists and contains the five required sections from the approved design.

---

### Task 2: Classify the Source-of-Truth Hierarchy

**Files:**
- Modify: `docs/superpowers/audits/2026-04-16-stabilization-control-audit.md`

- [ ] **Step 1: Read the secondary stabilization docs**

Run:
```bash
Get-Content -Raw "docs/superpowers/specs/2026-04-06-domain-boundary-audit-design.md"
Get-Content -Raw "docs/superpowers/plans/2026-04-06-domain-boundary-audit-plan.md"
Get-Content -Raw "docs/superpowers/plans/2026-04-09-first-response-boundary-implementation.md"
```
Expected: You understand how the earlier domain-boundary and first-response materials relate to the later master stabilization artifacts.

- [ ] **Step 2: Fill the Source-of-Truth Roles table**

Update the table in `docs/superpowers/audits/2026-04-16-stabilization-control-audit.md` so it contains rows like this shape:

```markdown
| docs/superpowers/specs/2026-04-07-master-repo-stabilization-design.md | intended stabilization direction | primary | defines the program goal, waves, and consolidation targets |
| docs/superpowers/plans/2026-04-08-master-repo-stabilization-audit-plan.md | audit execution plan | primary | defines how the stabilization audit was supposed to be produced |
| docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md | completed analysis artifact | primary | records the actual stabilization audit output that landed on main |
```

- [ ] **Step 3: Write the Intended Stabilization Sequence bullets**

Add explicit bullets under `### Intended Stabilization Sequence` in this form:

```markdown
- Domain-boundary audit establishes current pipeline ownership and cleanup waves.
- Master stabilization design expands that into a repo-wide 4-6 week program.
- Master stabilization audit plan defines how to produce the inventory and consolidation audit.
- The completed stabilization audit becomes the baseline for follow-on execution work.
- First-response boundary execution should then implement the Wave 1 path without drifting into unrelated cleanup.
```

- [ ] **Step 4: Verify that every baseline artifact has a role**

Run:
```bash
rg -n "Source-of-Truth Roles|Intended Stabilization Sequence|primary|secondary" "docs/superpowers/audits/2026-04-16-stabilization-control-audit.md"
```
Expected: Each referenced document has an explicit role, and the intended execution order is written out.

---

### Task 3: Inventory Stabilization Branches and Worktrees

**Files:**
- Modify: `docs/superpowers/audits/2026-04-16-stabilization-control-audit.md`

- [ ] **Step 1: List branches**

Run:
```bash
git branch --all
```
Expected: You see `main` plus stabilization-related branches such as `audit/domain-boundary-2026-04-06`, `audit/master-stabilization-2026-04-08`, and `feature/first-response-boundary-2026-04-09`.

- [ ] **Step 2: List worktrees**

Run:
```bash
git worktree list
```
Expected: You see the current workspace plus any linked stabilization worktrees, including prunable ones.

- [ ] **Step 3: Seed the Execution Reality table**

Add rows for the known stabilization branches/worktrees in this shape:

```markdown
| audit/domain-boundary-2026-04-06 | produce domain-boundary audit | docs-only audit commits | branch exists outside main audit baseline | completed | aligned |
| audit/master-stabilization-2026-04-08 | produce repo-wide stabilization audit | audit scaffolding, inventory refinement, DB plan refinement | parts landed on main, branch adds follow-on audit refinements | partial | aligned |
| feature/first-response-boundary-2026-04-09 | execute first-response boundary cleanup | first-response fixes plus later lint/type cleanup | branch diverges from strict Wave 1 execution intent | diverged | drifted |
```

- [ ] **Step 4: Verify the table contains all expected branches**

Run:
```bash
rg -n "audit/domain-boundary-2026-04-06|audit/master-stabilization-2026-04-08|feature/first-response-boundary-2026-04-09" "docs/superpowers/audits/2026-04-16-stabilization-control-audit.md"
```
Expected: Each key stabilization branch appears in `Execution Reality`.

---

### Task 4: Compare Commit History Against the Plan

**Files:**
- Modify: `docs/superpowers/audits/2026-04-16-stabilization-control-audit.md`

- [ ] **Step 1: Inspect what the master stabilization audit branch contains beyond main**

Run:
```bash
git log --oneline main..audit/master-stabilization-2026-04-08
```
Expected: You see audit-oriented commits such as inventory, DB-plan, risk, and wave-plan refinements.

- [ ] **Step 2: Inspect what the first-response boundary branch contains beyond main**

Run:
```bash
git log --oneline main..feature/first-response-boundary-2026-04-09
```
Expected: You see a mix of first-response fixes and later cleanup commits, including lint/type work unrelated to the original stabilization execution framing.

- [ ] **Step 3: Inspect what the domain-boundary audit branch contains beyond main**

Run:
```bash
git log --oneline main..audit/domain-boundary-2026-04-06
```
Expected: You see the docs-only domain-boundary audit sequence.

- [ ] **Step 4: Write the `Plan Divergence` section**

Add concrete bullets in this form:

```markdown
### Aligned Work
- `audit/domain-boundary-2026-04-06` stayed aligned with its audit-only purpose and produced the domain-boundary baseline.
- `audit/master-stabilization-2026-04-08` remained focused on filling gaps in the stabilization audit and did not turn into feature work.

### Drifted Work
- `feature/first-response-boundary-2026-04-09` began as Wave 1 execution but later shifted into broad `any` removal and lint-oriented cleanup, which is adjacent engineering work rather than direct stabilization-plan execution.

### Stalled or Ambiguous Work
- The repo contains follow-on execution artifacts, but there is no single landed control document that maps them back to the original stabilization program.
```

- [ ] **Step 5: Verify that divergence claims match commit evidence**

Run:
```bash
rg -n "aligned|drifted|stalled|ambiguous|any|lint|Wave 1" "docs/superpowers/audits/2026-04-16-stabilization-control-audit.md"
```
Expected: Every divergence statement is explicit and traceable to branch history.

---

### Task 5: Separate Landed, Branch-Only, and Doc-Only Outputs

**Files:**
- Modify: `docs/superpowers/audits/2026-04-16-stabilization-control-audit.md`

- [ ] **Step 1: Review stabilization-related doc history**

Run:
```bash
git log --oneline --decorate --graph --max-count=25 --all -- docs/superpowers
```
Expected: You can see which stabilization docs landed on `main` and which remained branch-local.

- [ ] **Step 2: Fill the `Already on main` and `Doc-Only` sections**

Add bullets in this shape:

```markdown
### Already on `main`
- `docs/superpowers/specs/2026-04-07-master-repo-stabilization-design.md`
- `docs/superpowers/plans/2026-04-08-master-repo-stabilization-audit-plan.md`
- `docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md`

### Doc-Only
- `audit/domain-boundary-2026-04-06` outputs are analysis artifacts, not code execution.
- `audit/master-stabilization-2026-04-08` primarily extends the audit record rather than implementing stabilization changes.
```

- [ ] **Step 3: Fill the `Branch-Only`, `Merge-Ready or Salvageable`, and `Stale or Safely Discardable` sections**

Add bullets in this shape:

```markdown
### Branch-Only
- The later `feature/first-response-boundary-2026-04-09` code fixes remain off `main`.

### Merge-Ready or Salvageable
- Narrow first-response correctness fixes are potentially salvageable after separating them from unrelated lint cleanup.
- Additional audit clarifications from `audit/master-stabilization-2026-04-08` may be worth cherry-picking if they change operational decisions.

### Stale or Safely Discardable
- Branch-local cleanup commits that only broaden type/lint hygiene without direct stabilization value should not be treated as required stabilization work.
```

- [ ] **Step 4: Verify that all asset-status buckets are filled**

Run:
```bash
rg -n "Already on `main`|Branch-Only|Doc-Only|Merge-Ready or Salvageable|Stale or Safely Discardable" "docs/superpowers/audits/2026-04-16-stabilization-control-audit.md"
```
Expected: All five asset-status buckets exist and contain concrete content.

---

### Task 6: Capture the Minimum Next Decision Points

**Files:**
- Modify: `docs/superpowers/audits/2026-04-16-stabilization-control-audit.md`

- [ ] **Step 1: Write 3-5 decision points**

Under `## 5) Decision Points`, add a numbered list in this form:

```markdown
1. Decide whether `audit/master-stabilization-2026-04-08` should be merged, cherry-picked selectively, or frozen as historical context.
2. Decide whether `feature/first-response-boundary-2026-04-09` should be split into stabilization-critical fixes versus adjacent cleanup.
3. Decide which single document will become the future execution control ledger after this audit is accepted.
4. Decide whether any existing worktree should remain active, be archived, or be recreated with narrower scope.
```

- [ ] **Step 2: Run the final consistency scan**

Run:
```bash
rg -n "Source-of-Truth Roles|Execution Reality|Plan Divergence|Asset Status|Decision Points|aligned|drifted|branch-only|doc-only" "docs/superpowers/audits/2026-04-16-stabilization-control-audit.md"
```
Expected: The audit contains all required sections, classifications, and decision hooks from the design.

- [ ] **Step 3: Record the read-only nature of the audit**

Append this final note to the audit:

```markdown
## 6) Audit Constraint

This audit is read-only. It does not merge branches, delete worktrees, rewrite plans, or introduce a new control system. It exists only to restore factual execution visibility.
```

- [ ] **Step 4: Verify the final note exists**

Run:
```bash
rg -n "This audit is read-only" "docs/superpowers/audits/2026-04-16-stabilization-control-audit.md"
```
Expected: The final note is present verbatim.

---

## Testing / Validation

- Validation is document-focused:
  - confirm each required section exists,
  - confirm each key branch/worktree is classified,
  - confirm divergence claims are traceable to doc or git evidence,
  - confirm the audit does not prescribe implementation changes.

## Rollback Plan

- Revert or delete the audit document if needed:

```bash
git revert <commit-sha>
```
