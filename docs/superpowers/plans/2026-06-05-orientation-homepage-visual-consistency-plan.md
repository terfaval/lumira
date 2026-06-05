# Orientation + Homepage Visual Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce visible route drift between Orientation and Homepage by calming the Orientation shell, quieting the dream header, replacing the text edit affordance with a pencil icon, and aligning hover/focus language across both routes.

**Architecture:** Keep the work route-local and presentation-only. Update the Orientation JSX only where necessary for the dream header/edit affordance, then tune Orientation and Homepage CSS so both routes share the same calm hover/focus grammar and material feel without changing payloads, behavior, or composition models.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, Vitest, ESLint

---

## File Structure

- Modify: `src/ui/object-orientation/object-orientation-layer.tsx`
  - Remove the dream panel label and replace the text edit control with a pencil icon affordance.
- Modify: `src/ui/object-orientation/object-orientation-layer.module.css`
  - Reduce shell dominance, slightly soften the dream title, and add a shared hover/focus language for activatable Orientation elements.
- Modify: `src/ui/homepage/homepage-orientation-hub.module.css`
  - Align interactive tile hover/focus behavior with the Orientation interaction language.
- Modify: `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`
  - Update the render contract to reflect the missing dream label and icon-based edit affordance.

### Task 1: Lock the refined Orientation header contract with a failing test

**Files:**
- Modify: `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`
- Read for context: `src/ui/object-orientation/object-orientation-layer.tsx`

- [ ] **Step 1: Update the static render test for the quieter dream header**

Replace the current dream-header assertions with this shape:

```tsx
describe("ObjectOrientationLayer", () => {
  it("renders the refined orientation landscape with a quieter dream header", () => {
    const markup = renderToStaticMarkup(<ObjectOrientationLayer payload={payload} />);

    expect(markup).not.toContain("Álom");
    expect(markup).toContain("Álomszótár");
    expect(markup).toContain("Jelzések");
    expect(markup).toContain("Érzelmi tér");
    expect(markup).toContain("Szálak");
    expect(markup).toContain("Megnyitások");
    expect(markup).toContain("Jegyzetek");
    expect(markup).toContain("Lantern House");
    expect(markup).toContain("aria-label=\"Álom szerkesztése\"");
    expect(markup).toContain("aria-hidden=\"true\"");
    expect(markup).toContain("The doorway may matter here.");
    expect(markup).toContain("aria-pressed=\"true\">Új");
    expect(markup).toContain("/objects/obj-1/reflect");
  });
});
```

- [ ] **Step 2: Run the Orientation test to verify it fails before implementation**

Run:

```bash
npm.cmd test -- src/ui/object-orientation/__tests__/orientation-layer.test.tsx
```

Expected:

```text
FAIL  src/ui/object-orientation/__tests__/orientation-layer.test.tsx
```

The failure should show the current component still contains the dream label and lacks the icon affordance attributes.

- [ ] **Step 3: Commit the failing test contract**

Run:

```bash
git add src/ui/object-orientation/__tests__/orientation-layer.test.tsx
git commit -m "test: refine orientation visual consistency contract"
```

### Task 2: Update the Orientation JSX for the quieter dream header

**Files:**
- Modify: `src/ui/object-orientation/object-orientation-layer.tsx`
- Test: `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`

- [ ] **Step 1: Remove the dream panel label and replace the edit text with a pencil icon link**

Update the dream header markup inside `ObjectOrientationLayer`:

```tsx
<div className={styles.dreamHeader}>
  <div className={styles.panelTitleBlock}>
    <h1>{payload.dream.title}</h1>
  </div>
  <Link
    className={styles.dreamLink}
    href={payload.dream.editHref}
    aria-label="Álom szerkesztése"
  >
    <span aria-hidden="true">✎</span>
  </Link>
</div>
```

Keep the rest of the dream frame structure unchanged.

- [ ] **Step 2: Run the focused Orientation test to verify the JSX now satisfies the new header contract**

Run:

```bash
npm.cmd test -- src/ui/object-orientation/__tests__/orientation-layer.test.tsx
```

Expected:

```text
PASS  src/ui/object-orientation/__tests__/orientation-layer.test.tsx
```

- [ ] **Step 3: Commit the JSX refinement**

Run:

```bash
git add src/ui/object-orientation/object-orientation-layer.tsx src/ui/object-orientation/__tests__/orientation-layer.test.tsx
git commit -m "feat: refine orientation dream header affordance"
```

### Task 3: Tune the Orientation CSS for shell calmness and shared interaction language

**Files:**
- Modify: `src/ui/object-orientation/object-orientation-layer.module.css`
- Test: `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`

- [ ] **Step 1: Reduce the shell’s visual dominance and slightly soften the dream title**

Update the relevant Orientation CSS rules:

```css
.shell {
  min-height: 100vh;
  padding: 24px;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.46), transparent 30%),
    radial-gradient(circle at bottom right, rgba(255, 255, 255, 0.42), transparent 28%),
    linear-gradient(180deg, #f7f4ec 0%, #f3f2ed 52%, #f4f5f1 100%);
  color: #20303a;
}

.dreamHeader h1 {
  margin: 0;
  font-size: clamp(1.42rem, 2.4vw, 2.15rem);
  line-height: 1.02;
  letter-spacing: -0.028em;
  font-weight: 600;
}
```

- [ ] **Step 2: Turn the dream edit affordance into a calm icon control**

Replace the `.dreamLink` styling with:

```css
.dreamLink {
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  width: 2.45rem;
  height: 2.45rem;
  border-radius: 999px;
  text-decoration: none;
  color: #324750;
  background: rgba(243, 246, 245, 0.92);
  border: 1px solid rgba(86, 109, 120, 0.16);
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.dreamLink span {
  font-size: 1rem;
  line-height: 1;
}
```

- [ ] **Step 3: Add a shared calm hover/focus language to Orientation interactive elements**

Add these rules:

```css
.dreamLink:hover,
.dreamLink:focus-visible,
.glossaryButton:hover,
.glossaryButton:focus-visible,
.stateButton:hover,
.stateButton:focus-visible,
.tabButton:hover,
.tabButton:focus-visible,
.openingAction:hover,
.openingAction:focus-visible {
  border-color: rgba(73, 91, 80, 0.26);
  box-shadow: 0 10px 22px rgba(33, 48, 38, 0.06);
}

.glossaryButton:hover,
.glossaryButton:focus-visible,
.stateButton:hover,
.stateButton:focus-visible,
.tabButton:hover,
.tabButton:focus-visible {
  background: rgba(251, 252, 249, 0.96);
}

.openingCard:hover,
.openingCard:focus-within {
  border-color: rgba(73, 91, 80, 0.22);
  box-shadow: 0 10px 22px rgba(33, 48, 38, 0.05);
}

.dreamLink:focus-visible,
.glossaryButton:focus-visible,
.stateButton:focus-visible,
.tabButton:focus-visible,
.openingAction:focus-visible {
  outline: 2px solid rgba(59, 91, 72, 0.46);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Run the focused Orientation test again after the CSS pass**

Run:

```bash
npm.cmd test -- src/ui/object-orientation/__tests__/orientation-layer.test.tsx
```

Expected:

```text
PASS  src/ui/object-orientation/__tests__/orientation-layer.test.tsx
```

- [ ] **Step 5: Commit the Orientation CSS refinement**

Run:

```bash
git add src/ui/object-orientation/object-orientation-layer.module.css
git commit -m "style: align orientation visual language"
```

### Task 4: Align Homepage interactive tiles with the same hover/focus language

**Files:**
- Modify: `src/ui/homepage/homepage-orientation-hub.module.css`

- [ ] **Step 1: Reuse the Orientation hover/focus tone on Homepage interactive tiles**

Adjust the existing interactive tile rules:

```css
.interactive:hover,
.interactive:focus-within {
  cursor: pointer;
  border-color: rgba(73, 91, 80, 0.28);
  box-shadow: 0 10px 22px rgba(33, 48, 38, 0.06);
}

.tile {
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.interactive:hover,
.interactive:focus-within {
  background:
    radial-gradient(circle at 18% 14%, rgba(255, 255, 255, 0.72), transparent 40%),
    rgba(251, 250, 245, 0.8);
}
```

Keep the Homepage interaction language calm; do not add transform lift or scale.

- [ ] **Step 2: Strengthen the entry-link focus visibility to match Orientation**

Update the focus-visible rule:

```css
.panelEntryLink:focus-visible {
  outline: 2px solid rgba(59, 91, 72, 0.46);
  outline-offset: 3px;
}
```

- [ ] **Step 3: Commit the Homepage consistency pass**

Run:

```bash
git add src/ui/homepage/homepage-orientation-hub.module.css
git commit -m "style: align homepage interaction language"
```

### Task 5: Run verification and confirm no behavior drift

**Files:**
- Read: `src/ui/object-orientation/object-orientation-layer.tsx`
- Read: `src/ui/object-orientation/object-orientation-layer.module.css`
- Read: `src/ui/homepage/homepage-orientation-hub.module.css`

- [ ] **Step 1: Run the full test suite**

Run:

```bash
npm.cmd test
```

Expected:

```text
All tests pass, including the Orientation and Homepage suites.
```

- [ ] **Step 2: Run lint**

Run:

```bash
npm.cmd run lint
```

Expected:

```text
No ESLint errors.
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm.cmd run typecheck
```

Expected:

```text
No TypeScript errors.
```

- [ ] **Step 4: Run build through the repo script**

Run:

```bash
npm.cmd run build
```

Expected:

```text
Build succeeds and the build log is updated through the normal repo script.
```

- [ ] **Step 5: Confirm the diff stayed within the intended UI polish scope**

Run:

```bash
git diff --name-only HEAD~4..HEAD
```

Expected:

```text
Only these files appear for the implementation work:
- src/ui/object-orientation/object-orientation-layer.tsx
- src/ui/object-orientation/object-orientation-layer.module.css
- src/ui/homepage/homepage-orientation-hub.module.css
- src/ui/object-orientation/__tests__/orientation-layer.test.tsx
```

- [ ] **Step 6: Commit final verification artifacts if any tracked verification files changed**

Run:

```bash
git status --short
```

If ticket-related tracked files remain uncommitted, run:

```bash
git add src/ui/object-orientation/object-orientation-layer.tsx src/ui/object-orientation/object-orientation-layer.module.css src/ui/homepage/homepage-orientation-hub.module.css src/ui/object-orientation/__tests__/orientation-layer.test.tsx docs/BUILD_LOG.md docs/build-logs docs/STABILIZATION_LEDGER.md
git commit -m "feat: finalize orientation homepage visual consistency"
```

If there are no remaining ticket-related tracked changes, do not create an extra commit.

## Self-Review

- Spec coverage:
  - Orientation shell/background calmness is covered in Task 3.
  - Removing the dream label and shrinking the title is covered in Tasks 1-3.
  - Replacing `Szerkesztés` with a pencil icon is covered in Task 2.
  - Shared hover/focus language across Orientation and Homepage is covered in Tasks 3 and 4.
  - No runtime/payload/route changes are preserved by file scope and Task 5 diff verification.
- Placeholder scan:
  - No `TODO`, `TBD`, or deferred implementation markers remain.
  - Every code-changing step includes exact code or exact commands.
- Type consistency:
  - Uses the existing `ObjectOrientationLayer` and CSS module boundaries.
  - Keeps Homepage and Orientation changes in their current route-local stylesheets rather than inventing a new primitive layer.
