# Orientation Layer Layout Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompose `/objects/[objectId]` into a bounded desktop orientation landscape that matches the approved wireframe, reduces persistent copy, and keeps overflow inside panels without changing runtime behavior.

**Architecture:** Keep all behavior and payload wiring inside the existing `ObjectOrientationLayer` component. Restructure the JSX into explicit top/bottom layout regions, add placeholder panels for `Jelzések`, `Érzelmi tér`, and `Jegyzetek`, then replace the current document-like CSS with a fixed-height desktop grid that gives each panel its own overflow boundary. Finish by updating the orientation-layer test and recording verification in the stabilization ledger.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, Vitest, ESLint

---

## File Structure

- Modify: `src/ui/object-orientation/object-orientation-layer.tsx`
  - Recompose the panel markup into explicit desktop top/bottom regions.
  - Split the dream surface into a title bar and a separately scrollable dream text region.
  - Replace long English helper copy with compact Hungarian labels.
- Modify: `src/ui/object-orientation/object-orientation-layer.module.css`
  - Replace the current tall left-column layout with a `100vh` desktop shell and a `3-column / 2-row` grid.
  - Add bounded internal scroll regions and quiet scrollbar styling.
  - Tune typography and spacing toward the homepage density.
- Modify: `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`
  - Assert the new Hungarian labels, stacked placeholder panels, and preserved dream/edit/opening behavior.
- Modify: `docs/STABILIZATION_LEDGER.md`
  - Add the completed ticket entry with UTC date, touched boundaries, and verification references after the code is finished and verified.

### Task 1: Lock the new UI contract with a failing orientation-layer test

**Files:**
- Modify: `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`
- Read for context: `src/ui/object-orientation/object-orientation-layer.tsx`

- [ ] **Step 1: Rewrite the static render test to assert the new panel labels and preserved behavior**

Replace the existing test body with assertions that match the approved desktop composition language:

```tsx
describe("ObjectOrientationLayer", () => {
  it("renders the bounded orientation landscape with compact Hungarian panel labels", () => {
    const markup = renderToStaticMarkup(<ObjectOrientationLayer payload={payload} />);

    expect(markup).toContain("Álom");
    expect(markup).toContain("Álomszótár");
    expect(markup).toContain("Jelzések");
    expect(markup).toContain("Érzelmi tér");
    expect(markup).toContain("Szálak");
    expect(markup).toContain("Megnyitások");
    expect(markup).toContain("Jegyzetek");
    expect(markup).toContain("Lantern House");
    expect(markup).toContain("Szerkesztés");
    expect(markup).toContain("The doorway may matter here.");
    expect(markup).toContain("aria-pressed=\"true\">Új");
    expect(markup).toContain("/objects/obj-1/reflect");
  });
});
```

- [ ] **Step 2: Run the orientation-layer test to verify it fails before implementation**

Run:

```bash
npm test -- src/ui/object-orientation/__tests__/orientation-layer.test.tsx
```

Expected:

```text
FAIL  src/ui/object-orientation/__tests__/orientation-layer.test.tsx
```

The failure should show missing Hungarian labels such as `Álom`, `Jelzések`, or `Megnyitások`.

- [ ] **Step 3: Commit the failing test change**

Run:

```bash
git add src/ui/object-orientation/__tests__/orientation-layer.test.tsx
git commit -m "test: define orientation layer convergence contract"
```

### Task 2: Recompose the orientation layer markup without changing behavior

**Files:**
- Modify: `src/ui/object-orientation/object-orientation-layer.tsx`
- Test: `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`

- [ ] **Step 1: Replace the layout markup with explicit top-row and bottom-row regions**

Update the main JSX so the desktop layout has two rows and the middle top column contains two separate placeholder panels:

```tsx
return (
  <main className={styles.shell}>
    <div className={styles.layout}>
      <section className={styles.topRow}>
        <article className={styles.dreamSurface}>
          <div className={styles.dreamFrame}>
            <div className={styles.dreamHeader}>
              <div className={styles.panelTitleBlock}>
                <p className={styles.panelLabel}>Álom</p>
                <h1>{payload.dream.title}</h1>
              </div>
              <Link className={styles.dreamLink} href={payload.dream.editHref}>
                Szerkesztés
              </Link>
            </div>

            <div className={styles.dreamBody}>
              <p className={styles.dreamText}>{payload.dream.preview}</p>
            </div>
          </div>
        </article>

        <div className={styles.signalColumn}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <p className={styles.panelLabel}>Jelzések</p>
            </div>
            <p className={styles.placeholderText}>Hamarosan.</p>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <p className={styles.panelLabel}>Érzelmi tér</p>
            </div>
            <p className={styles.placeholderText}>Hamarosan.</p>
          </section>
        </div>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <p className={styles.panelLabel}>Álomszótár</p>
          </div>
          {payload.glossary.items.length > 0 ? (
            <ul className={styles.glossaryList}>
              {payload.glossary.items.map((item) => (
                <li key={`${item.category}-${item.label}`}>
                  <button
                    type="button"
                    className={styles.glossaryButton}
                    onClick={() => setSelectedGlossaryItem(item)}
                  >
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>Még nincs visszatérő motívum.</p>
          )}
        </section>
      </section>

      <section className={styles.bottomRow}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <p className={styles.panelLabel}>Szálak</p>
          </div>
          <ul className={styles.stateList}>
            {payload.threadOverview.map((item) => {
              const active = selectedView === item.state;

              return (
                <li key={item.state}>
                  <button
                    type="button"
                    className={`${styles.stateButton} ${active ? styles.stateButtonActive : ""}`}
                    onClick={() => setSelectedView(item.state)}
                  >
                    <span className={styles.stateCopy}>
                      <strong>{toStateLabel(item.state)}</strong>
                    </span>
                    <span className={styles.countBadge}>{item.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={styles.panel}>
          <div className={styles.stackHeader}>
            <p className={styles.panelLabel}>Megnyitások</p>
            <ul className={styles.tabList}>
              {STACK_TABS.map((tab) => (
                <li key={tab.key}>
                  <button
                    type="button"
                    className={`${styles.tabButton} ${selectedView === tab.key ? styles.tabButtonActive : ""}`}
                    aria-pressed={selectedView === tab.key}
                    onClick={() => setSelectedView(tab.key)}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {feedback ? <p className={styles.feedback}>{feedback}</p> : null}

          {visibleOpenings.length > 0 ? (
            <ul className={styles.openingList}>
              {visibleOpenings.map((item) => (
                <li key={item.id} className={styles.openingCard}>
                  <strong>{item.title}</strong>
                  <span className={styles.openingMeta}>
                    {toStateLabel(item.state)} • {item.kind.replaceAll("_", " ")}
                  </span>
                  <button
                    type="button"
                    className={styles.openingAction}
                    disabled={pendingOpeningId === item.id}
                    onClick={() => void handleEnterOpening(item.id, item.href, item.state)}
                  >
                    {pendingOpeningId === item.id ? "Előkészítés..." : item.ctaLabel}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>
              {selectedView === "dormant" ? "Nincs szunnyadó megnyitás." : "Ebben a nézetben nincs megnyitás."}
            </p>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <p className={styles.panelLabel}>Jegyzetek</p>
          </div>
          <p className={styles.placeholderText}>Hamarosan.</p>
        </section>
      </section>
    </div>

    {selectedGlossaryItem ? (
      <div className={styles.modalBackdrop} role="presentation" onClick={() => setSelectedGlossaryItem(null)}>
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="orientation-glossary-title"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 id="orientation-glossary-title">{selectedGlossaryItem.label}</h3>
          <p>{selectedGlossaryItem.detail}</p>
          <div className={styles.modalActions}>
            <Link href="/glossary">Álomszótár megnyitása</Link>
            <button type="button" onClick={() => setSelectedGlossaryItem(null)}>
              Bezárás
            </button>
          </div>
        </div>
      </div>
    ) : null}
  </main>
);
```

- [ ] **Step 2: Localize the view labels to match the compact thread state copy**

Update the tab labels and state-label helper near the top of the file:

```tsx
const STACK_TABS: Array<{ key: Exclude<OrientationStackView, "dormant">; label: string }> = [
  { key: "new", label: "Új" },
  { key: "active", label: "Aktív" },
  { key: "all", label: "Mind" },
];

function toStateLabel(view: OrientationStackView): string {
  switch (view) {
    case "new":
      return "Új";
    case "active":
      return "Aktív";
    case "dormant":
      return "Szunnyadó";
    default:
      return "Mind";
  }
}
```

- [ ] **Step 3: Run the focused orientation-layer test to verify the markup now satisfies the UI contract**

Run:

```bash
npm test -- src/ui/object-orientation/__tests__/orientation-layer.test.tsx
```

Expected:

```text
PASS  src/ui/object-orientation/__tests__/orientation-layer.test.tsx
```

- [ ] **Step 4: Commit the markup-only convergence pass**

Run:

```bash
git add src/ui/object-orientation/object-orientation-layer.tsx src/ui/object-orientation/__tests__/orientation-layer.test.tsx
git commit -m "feat: recompose object orientation layout structure"
```

### Task 3: Replace the CSS with a bounded desktop grid and internal scroll regions

**Files:**
- Modify: `src/ui/object-orientation/object-orientation-layer.module.css`
- Test: `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`

- [ ] **Step 1: Replace the root shell and layout rules with a fixed-height desktop composition**

Update the shell and layout section near the top of the stylesheet:

```css
.shell {
  min-height: 100vh;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(210, 224, 246, 0.9), transparent 32%),
    radial-gradient(circle at bottom right, rgba(227, 236, 223, 0.9), transparent 30%),
    linear-gradient(180deg, #f5f1e7 0%, #eef2ee 48%, #edf3f7 100%);
  color: #20303a;
}

.layout {
  height: calc(100vh - 48px);
  max-width: 1380px;
  margin: 0 auto;
  display: grid;
  grid-template-rows: minmax(0, 1.1fr) minmax(0, 0.82fr);
  gap: 18px;
  overflow: hidden;
}

.topRow,
.bottomRow {
  min-height: 0;
  display: grid;
  gap: 18px;
}

.topRow {
  grid-template-columns: minmax(0, 1.45fr) minmax(240px, 0.78fr) minmax(280px, 0.92fr);
}

.bottomRow {
  grid-template-columns: minmax(220px, 0.72fr) minmax(0, 1.1fr) minmax(220px, 0.78fr);
}
```

- [ ] **Step 2: Add the dream-frame hierarchy and its dedicated internal scroll region**

Add or replace the dream-specific rules:

```css
.dreamSurface {
  min-height: 0;
}

.dreamFrame {
  height: 100%;
  min-height: 0;
  padding: 24px;
  border-radius: 26px;
  background: rgba(255, 252, 247, 0.78);
  border: 1px solid rgba(86, 109, 120, 0.16);
  box-shadow: 0 18px 55px rgba(48, 65, 70, 0.1);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 18px;
}

.dreamHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.panelTitleBlock {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.panelLabel {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #5a6f7a;
}

.dreamHeader h1 {
  margin: 0;
  font-size: clamp(1.6rem, 2.8vw, 2.6rem);
  line-height: 1;
  letter-spacing: -0.03em;
  font-weight: 600;
}

.dreamBody {
  min-height: 0;
  overflow: auto;
  padding-right: 6px;
}

.dreamText {
  margin: 0;
  font-size: 0.94rem;
  line-height: 1.7;
  color: #2d3e48;
  white-space: pre-wrap;
}
```

- [ ] **Step 3: Add compact panel styling, quiet scrollbars, and stacked middle-column rules**

Add or replace the shared panel rules and scrollbar treatment:

```css
.signalColumn {
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
}

.panel {
  min-height: 0;
  padding: 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(86, 109, 120, 0.14);
  box-shadow: 0 14px 38px rgba(50, 62, 65, 0.07);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
}

.panelHeader,
.stackHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
}

.glossaryList,
.stateList,
.openingList {
  min-height: 0;
  overflow: auto;
  list-style: none;
  padding: 0;
  margin: 0;
}

.glossaryList,
.stateList {
  display: grid;
  gap: 10px;
}

.openingList {
  display: grid;
  gap: 10px;
  align-content: start;
}

.dreamBody,
.glossaryList,
.stateList,
.openingList {
  scrollbar-width: thin;
  scrollbar-color: rgba(86, 109, 120, 0.18) transparent;
}

.dreamBody::-webkit-scrollbar,
.glossaryList::-webkit-scrollbar,
.stateList::-webkit-scrollbar,
.openingList::-webkit-scrollbar {
  width: 8px;
}

.dreamBody::-webkit-scrollbar-track,
.glossaryList::-webkit-scrollbar-track,
.stateList::-webkit-scrollbar-track,
.openingList::-webkit-scrollbar-track {
  background: transparent;
}

.dreamBody::-webkit-scrollbar-thumb,
.glossaryList::-webkit-scrollbar-thumb,
.stateList::-webkit-scrollbar-thumb,
.openingList::-webkit-scrollbar-thumb {
  background: rgba(86, 109, 120, 0.16);
  border-radius: 999px;
}
```

- [ ] **Step 4: Compact the controls and opening cards so the bottom row stays in the first viewport**

Replace the current oversized controls with calmer density:

```css
.stateButton,
.glossaryButton,
.openingCard {
  border: 1px solid rgba(86, 109, 120, 0.14);
  background: rgba(248, 250, 249, 0.9);
}

.stateButton {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 16px;
  text-align: left;
  cursor: pointer;
}

.stateCopy strong,
.glossaryButton strong,
.openingCard strong {
  display: block;
  margin-bottom: 4px;
  font-size: 0.92rem;
}

.countBadge,
.openingMeta,
.glossaryButton span {
  font-size: 0.82rem;
  color: #60737b;
}

.openingCard {
  padding: 14px;
  border-radius: 18px;
}

.openingAction {
  padding: 9px 12px;
  border-radius: 999px;
  border: none;
  background: #314c5c;
  color: #f8fbfc;
  cursor: pointer;
}
```

- [ ] **Step 5: Keep mobile in vertical flow and restrict the no-scroll rule to desktop**

Replace the responsive block at the bottom of the stylesheet:

```css
@media (max-width: 980px) {
  .shell {
    min-height: auto;
    padding: 18px;
  }

  .layout {
    height: auto;
    display: grid;
    grid-template-rows: none;
    overflow: visible;
  }

  .topRow,
  .bottomRow {
    grid-template-columns: 1fr;
  }

  .dreamFrame,
  .panel {
    height: auto;
  }

  .dreamBody,
  .glossaryList,
  .stateList,
  .openingList {
    overflow: visible;
  }

  .dreamHeader {
    flex-direction: column;
  }
}
```

- [ ] **Step 6: Run the focused orientation-layer test again after the CSS rewrite**

Run:

```bash
npm test -- src/ui/object-orientation/__tests__/orientation-layer.test.tsx
```

Expected:

```text
PASS  src/ui/object-orientation/__tests__/orientation-layer.test.tsx
```

- [ ] **Step 7: Commit the bounded-layout styling pass**

Run:

```bash
git add src/ui/object-orientation/object-orientation-layer.module.css
git commit -m "style: converge orientation layer desktop composition"
```

### Task 4: Run project verification, capture the required evidence, and log completion

**Files:**
- Modify: `docs/STABILIZATION_LEDGER.md`
- Read: `docs/BUILD_LOG.md`
- Read: `docs/build-logs/`

- [ ] **Step 1: Run the full test suite**

Run:

```bash
npm test
```

Expected:

```text
All tests pass, including object orientation and homepage suites.
```

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected:

```text
No ESLint errors.
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected:

```text
No TypeScript errors.
```

- [ ] **Step 4: Run the required build command so the build log and full log are recorded**

Run:

```bash
npm run build
```

Expected:

```text
Build succeeds, docs/BUILD_LOG.md receives a new summary entry, and docs/build-logs/ contains a new timestamped log.
```

- [ ] **Step 5: Capture the desktop screenshot for the ticket validation**

Open the orientation route in a desktop viewport after the build verification and save one screenshot showing:

```text
Álom | Jelzések | Érzelmi tér | Álomszótár | Szálak | Megnyitások | Jegyzetek
```

The screenshot must demonstrate:

```text
- no page-level desktop scroll
- dream text bounded inside its panel
- all major areas visible at once
- reduced persistent copy
```

- [ ] **Step 6: Append the stabilization ledger entry with UTC date, touched boundaries, and verification references**

Add an entry near the top of `docs/STABILIZATION_LEDGER.md` in this format:

```md
## 2026-06-04 - Orientation Layer Layout Convergence Pass

- Phase: BUILD
- Touched boundaries:
  - `src/ui/object-orientation/object-orientation-layer.tsx`
  - `src/ui/object-orientation/object-orientation-layer.module.css`
  - `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`
- Verification:
  - `npm test`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
  - desktop screenshot captured for `/objects/[objectId]`
```

- [ ] **Step 7: Commit the verified completion record**

Run:

```bash
git add docs/STABILIZATION_LEDGER.md docs/BUILD_LOG.md docs/build-logs src/ui/object-orientation/object-orientation-layer.tsx src/ui/object-orientation/object-orientation-layer.module.css src/ui/object-orientation/__tests__/orientation-layer.test.tsx
git commit -m "feat: finalize orientation layer layout convergence"
```

## Self-Review

- Spec coverage:
  - Desktop `100vh`, no-page-scroll, and internal scroll behavior are covered in Task 3.
  - Top-middle stacked `Jelzések` + `Érzelmi tér` is covered in Task 2.
  - Dream panel fixed-height rule and document-reader prohibition are covered by Task 2 markup and Task 3 `dreamFrame` / `dreamBody` CSS.
  - Copy reduction and Hungarian labels are covered in Task 2.
  - Validation, screenshot, build logging, and ledger update are covered in Task 4.
- Placeholder scan:
  - No `TODO`, `TBD`, or “implement later” markers remain.
  - Each code-changing step includes concrete code or concrete commands.
- Type consistency:
  - Uses the existing `ObjectOrientationLayer`, `OrientationStackView`, `payload`, and `selectedView` names already present in the codebase.
  - New CSS class names referenced in the JSX are all defined in the CSS task.
