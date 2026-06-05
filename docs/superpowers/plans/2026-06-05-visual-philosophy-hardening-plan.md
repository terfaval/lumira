# Visual Philosophy Hardening + Mandatory UI Read Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strengthen Lumira’s existing visual canon with route-composition rules and make the visual philosophy read path mandatory before any UI implementation work begins.

**Architecture:** Keep the work entirely in documentation and onboarding entry points. Extend the existing visual philosophy canon with a new normative route-composition section, then update the active onboarding docs so UI work explicitly requires reading the visual philosophy and shared primitive redesign docs before route contracts and tickets. No runtime, route, or component files change.

**Tech Stack:** Markdown documentation, repository onboarding docs, git

---

## File Structure

- Modify: `docs/canon/lumira-visual-system-philosophy-v1.md`
  - Add the new normative `Route Composition Consistency` section.
  - Add `Orientation-Class Routes`, `Reflection-Class Routes`, `Shared Interaction Language`, and `Shared Visual Identity`.
- Modify: `AGENTS.md`
  - Add a mandatory UI read path for implementation tickets.
- Modify: `docs/AGENT_START_HERE.md`
  - Add the same UI read-path requirement in task-entry guidance.
- Optional verification reads: `docs/canon/lumira-shared-primitive-redesign-v1.md`

### Task 1: Extend the visual philosophy canon with route-composition enforcement

**Files:**
- Modify: `docs/canon/lumira-visual-system-philosophy-v1.md`
- Read for context: `docs/superpowers/specs/2026-06-05-visual-philosophy-hardening-design.md`

- [ ] **Step 1: Insert the new `Route Composition Consistency` section into the canon doc**

Add a new section before the final principle in `docs/canon/lumira-visual-system-philosophy-v1.md` using strong normative language. Insert this exact content:

```md
# 14. Route Composition Consistency

Visual philosophy must remain enforceable at the route-composition level, not only at the aesthetic level.

Different routes may serve different reflective functions.

They may vary in:

* composition
* density
* visible surface count
* scroll posture
* attentional narrowness

But they must still feel like they belong to the same product.

---

## 14.1 Orientation-Class Routes

Examples:

* Homepage
* Capture
* Orientation Layer

Orientation-class routes must be:

* orientation-first
* overview-oriented
* multi-surface
* context-visible
* glance-legible

On desktop, these routes should prefer a single-viewport composition where practical.

Page-level scrolling should be avoided where practical.

Multiple contextual surfaces should remain visible simultaneously when the route is serving orientation rather than deep work.

These routes must not be optimized primarily for document-style reading.

They should feel like:

# reflective landscapes

not:

# documents

---

## 14.2 Reflection-Class Routes

Examples:

* Deep Reflection
* Thread Reflection
* long-form writing environments

Reflection-class routes must be:

* attentional-narrowing
* depth-supporting
* reading-capable
* writing-capable
* continuity-preserving

They may use fewer simultaneously visible surfaces.

Document-like reading is acceptable here.

Scrolling is natural and expected where the route is designed for deeper staying, writing, or reading.

These routes should feel like:

# places to stay with a thought

not:

# orientation dashboards

---

## 14.3 Shared Interaction Language

Different routes may have different compositions.

Their interaction language must remain recognizably shared.

Across routes, the following must remain consistent:

* typography hierarchy
* spacing rhythm
* surface behavior
* hover language
* focus-state language
* density budgeting principles

Route-level variation must not create the feeling that interaction grammar changes from page to page.

---

## 14.4 Shared Visual Identity

Different routes may have different compositions,
but they should never feel like different products.

A user moving between:

* Homepage
* Capture
* Orientation
* Journal
* Glossary
* Deep Reflection

should still perceive:

* a shared visual language
* a shared material vocabulary
* a shared typography hierarchy
* a shared interaction energy

Composition may vary by route class.

Identity may not fragment by route.
```

- [ ] **Step 2: Re-read the surrounding sections to ensure the numbering and tone still flow cleanly**

Run:

```bash
Get-Content docs/canon/lumira-visual-system-philosophy-v1.md
```

Expected:

```text
The new section appears as section 14, fits the existing canon voice, and no duplicated "final principle" numbering remains.
```

- [ ] **Step 3: Commit the canon hardening change**

Run:

```bash
git add docs/canon/lumira-visual-system-philosophy-v1.md
git commit -m "docs: harden visual philosophy route consistency"
```

### Task 2: Add the mandatory UI read path to onboarding

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/AGENT_START_HERE.md`
- Read for context: `docs/canon/lumira-shared-primitive-redesign-v1.md`

- [ ] **Step 1: Add the required UI implementation read path to `AGENTS.md`**

Insert a new subsection after the existing repository reading/setup rules in `AGENTS.md`:

```md
## UI implementation read path

Before starting any UI implementation ticket, read in this order:
1. `docs/canon/lumira-visual-system-philosophy-v1.md`
2. `docs/canon/lumira-shared-primitive-redesign-v1.md`
3. the route-specific contract(s)
4. the implementation ticket

UI work must not begin before this reading path is completed.

Route contracts must be interpreted through the visual philosophy and shared primitive philosophy, not as isolated layout instructions.
```

- [ ] **Step 2: Add the same UI read path to `docs/AGENT_START_HERE.md`**

Under the "Required Reading by Task Type" section, add:

```md
### UI implementation task
- `docs/canon/lumira-visual-system-philosophy-v1.md`
- `docs/canon/lumira-shared-primitive-redesign-v1.md`
- route-specific contract(s)
- the implementation ticket

Do not begin UI implementation before completing this read path.
Interpret route-level UI work through the visual philosophy and shared primitive philosophy first.
```

- [ ] **Step 3: Verify the onboarding docs now contain the exact required read-path order**

Run:

```bash
Get-Content AGENTS.md
Get-Content docs/AGENT_START_HERE.md
```

Expected:

```text
Both files explicitly require:
1. visual philosophy
2. shared primitive redesign
3. route-specific contract(s)
4. implementation ticket
```

- [ ] **Step 4: Commit the onboarding enforcement change**

Run:

```bash
git add AGENTS.md docs/AGENT_START_HERE.md
git commit -m "docs: require visual canon before UI work"
```

### Task 3: Validate scope discipline and record completion status

**Files:**
- Read: `docs/canon/lumira-visual-system-philosophy-v1.md`
- Read: `AGENTS.md`
- Read: `docs/AGENT_START_HERE.md`

- [ ] **Step 1: Confirm only documentation and onboarding files changed**

Run:

```bash
git diff --name-only HEAD~2..HEAD
git status --short
```

Expected:

```text
Only documentation files for the canon and onboarding changes appear in the completed work for this ticket.
No runtime, UI component, CSS, route, or payload files were modified for this ticket.
```

- [ ] **Step 2: Confirm the final deliverable requirements are satisfiable from the diff**

Run:

```bash
git diff HEAD~2..HEAD -- docs/canon/lumira-visual-system-philosophy-v1.md AGENTS.md docs/AGENT_START_HERE.md
```

Expected:

```text
The diff clearly shows:
- the exact added canon sections
- the exact onboarding changes
- no runtime or UI implementation file edits
```

- [ ] **Step 3: Create the final completion commit if any uncommitted doc changes remain**

Run:

```bash
git status --short
```

If there are still staged or unstaged ticket changes, run:

```bash
git add docs/canon/lumira-visual-system-philosophy-v1.md AGENTS.md docs/AGENT_START_HERE.md
git commit -m "docs: finalize visual philosophy hardening"
```

If there are no remaining ticket changes, do not create an extra commit.

## Self-Review

- Spec coverage:
  - The new `Route Composition Consistency` section is covered in Task 1.
  - `Orientation-Class Routes`, `Reflection-Class Routes`, `Shared Interaction Language`, and `Shared Visual Identity` are all explicitly covered in Task 1.
  - Mandatory onboarding read-path enforcement is covered in Task 2.
  - Deliverable proof and no-UI/no-runtime scope confirmation are covered in Task 3.
- Placeholder scan:
  - No `TODO`, `TBD`, or generic “handle later” language remains.
  - Each task contains exact text to add and exact verification commands.
- Type consistency:
  - File paths match the approved spec.
  - The required read order is identical across the canon plan and both onboarding entry points.
