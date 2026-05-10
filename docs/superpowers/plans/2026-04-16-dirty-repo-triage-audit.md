# Dirty Repo Triage Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a read-only dirty-repo triage audit that classifies current repo dirtiness by control impact and ownership risk rather than by generic cleanup value.

**Architecture:** Evidence-first audit using the current workspace status, selective git history, worktree inspection, and targeted file reads. The output is a single audit document that separates dirty surface, ownership/intent, control impact, triage labels, and next control actions without performing cleanup.

**Tech Stack:** Git, PowerShell, Markdown docs.

---

## File Structure (Plan-Level)

- Create: `docs/superpowers/audits/2026-04-16-dirty-repo-triage-audit.md`
- Create: `docs/superpowers/plans/2026-04-16-dirty-repo-triage-audit.md`
- Reference (read-only): `docs/superpowers/specs/2026-04-16-dirty-repo-triage-audit-design.md`
- Reference (read-only): `docs/superpowers/audits/2026-04-16-stabilization-control-audit.md`
- Reference (read-only): current workspace git state and selected dirty paths

---

### Task 1: Capture the Current Dirty Surface

**Files:**
- Modify: `docs/superpowers/audits/2026-04-16-dirty-repo-triage-audit.md`

- [ ] **Step 1: Read the approved dirty-repo triage design**

Run:
```bash
Get-Content -Raw "docs/superpowers/specs/2026-04-16-dirty-repo-triage-audit-design.md"
```
Expected: The design defines scope, control-first principles, evidence sources, and triage labels.

- [ ] **Step 2: Inspect the root workspace status**

Run:
```bash
git status --short
git diff --name-only
```
Expected: A concrete list of modified, deleted, untracked, and nested-repo indicators in the current workspace.

- [ ] **Step 3: Create the audit document scaffold**

Create `docs/superpowers/audits/2026-04-16-dirty-repo-triage-audit.md` with this exact content:

```markdown
# Dirty Repo Triage Audit (2026-04-16)

## 1) Current Dirty Surface

### Root Status Summary

- 

### Dirty Items

| item | status kind | notes |
|---|---|---|

## 2) Ownership and Intent

| item | likely owner/thread | evidence | safe to touch | confidence |
|---|---|---|---|---|

## 3) Control Impact

| item | planning risk | branch/worktree risk | overwrite/confusion risk | summary |
|---|---|---|---|---|

## 4) Triage Classification

| item | label | rationale | future handling direction |
|---|---|---|---|

## 5) Next Control Actions

1. 
```

- [ ] **Step 4: Verify the scaffold**

Run:
```bash
Get-Content -Raw "docs/superpowers/audits/2026-04-16-dirty-repo-triage-audit.md"
```
Expected: The file exists and contains all five required sections.

---

### Task 2: Determine Ownership and Intent

**Files:**
- Modify: `docs/superpowers/audits/2026-04-16-dirty-repo-triage-audit.md`

- [ ] **Step 1: Inspect worktree and nested-repo signals**

Run:
```bash
git worktree list
git submodule status
```
Expected: Worktree entries are visible, and nested-repo/submodule signals are identified or absent.

- [ ] **Step 2: Inspect selected dirty paths for likely ownership**

Run:
```bash
git log --oneline -- docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md
git log --oneline -- app/api/sessions/[sessionId]/highlights/reject/route.ts
git log --oneline -- app/glossary/page.tsx
git log --oneline -- app/glossary/suggestions/page.tsx
git log --oneline -- public/background/evening.png
```
Expected: You have enough evidence to tell whether each dirty path is active user work, stabilization-related residue, or ambiguous.

- [ ] **Step 3: Fill the ownership table**

Update the table with entries in this shape:

```markdown
| app/glossary/page.tsx | likely active product work | modified in current workspace, not tied to stabilization docs | no | medium |
| docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md | stabilization audit follow-up | directly tied to stabilization audit artifact | yes, but only via explicit audit work | high |
```

---

### Task 3: Assess Control Impact

**Files:**
- Modify: `docs/superpowers/audits/2026-04-16-dirty-repo-triage-audit.md`

- [ ] **Step 1: Write the root status summary**

Summarize the current dirty surface under `### Root Status Summary` in this shape:

```markdown
- The root workspace contains a mix of application-file edits, stabilization-doc edits, a deleted asset, and a nested-repo/worktree anomaly.
- The current dirty surface is not homogeneous: some items appear user-owned, while others are artifacts of the stabilization analysis thread.
```

- [ ] **Step 2: Fill the control-impact table**

Add rows in this shape:

```markdown
| docs/superpowers/audits/2026-04-08-master-repo-stabilization-audit.md | medium | low | medium | stabilization context is useful, but leaving it mixed into `main` increases audit ambiguity |
| app/glossary/page.tsx | high | medium | high | likely active app work that should not be touched during repo-control cleanup |
```

- [ ] **Step 3: Add the dirty-items inventory**

Populate `### Dirty Items` with one row per relevant item or grouped item set.

---

### Task 4: Classify Dirty Items

**Files:**
- Modify: `docs/superpowers/audits/2026-04-16-dirty-repo-triage-audit.md`

- [ ] **Step 1: Apply triage labels**

Fill the `Triage Classification` table using only:
- `active`
- `salvage`
- `park`
- `stale`
- `discard-candidate`
- `do-not-touch`
- `unknown`

- [ ] **Step 2: Bias uncertain ownership toward protection**

Where evidence is weak, classify the item as `do-not-touch` or `unknown`, not as discardable.

- [ ] **Step 3: Record grouped rationale**

For grouped items, use this shape:

```markdown
| glossary page edits | do-not-touch | likely active product/UI work with no evidence that it belongs to stabilization cleanup | protect from repo-control cleanup until separately triaged |
| stale first-response worktree residue | stale | prunable worktree pointer appears superseded by later branch history | review in a later explicit cleanup pass |
```

---

### Task 5: Capture Minimum Next Control Actions

**Files:**
- Modify: `docs/superpowers/audits/2026-04-16-dirty-repo-triage-audit.md`

- [ ] **Step 1: Write 3-5 control actions**

Under `## 5) Next Control Actions`, add items in this shape:

```markdown
1. Separate stabilization-audit document changes from unrelated product-file edits before creating any new control ledger.
2. Protect likely active product changes by excluding them from repo-control cleanup decisions.
3. Decide whether nested repo/worktree residue should be formally isolated before new stabilization execution begins.
4. Revisit salvageable stabilization artifacts only after the dirty surface is partitioned by ownership.
```

- [ ] **Step 2: Add the audit constraint**

Append:

```markdown
## 6) Audit Constraint

This audit is read-only. It does not stash, revert, delete, move, or commit dirty items. It only classifies them for future control decisions.
```

- [ ] **Step 3: Run the final consistency scan**

Run:
```bash
rg -n "Current Dirty Surface|Ownership and Intent|Control Impact|Triage Classification|Next Control Actions|Audit Constraint" "docs/superpowers/audits/2026-04-16-dirty-repo-triage-audit.md"
```
Expected: All required sections exist and the document remains classification-only.

---

## Testing / Validation

- Validation is document-focused:
  - confirm each dirty item is represented,
  - confirm risky/uncertain ownership is protected,
  - confirm the audit recommends future handling without taking action,
  - confirm the audit supports the next execution-control design step.

## Rollback Plan

- Revert or delete the audit document if needed:

```bash
git revert <commit-sha>
```
