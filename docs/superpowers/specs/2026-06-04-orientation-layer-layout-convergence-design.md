# Orientation Layer Layout Convergence Design

Date: 2026-06-04
Route: `/objects/[objectId]`
Scope: layout, copy, density, and scroll-behavior convergence only

## Goal

Bring the object Orientation Layer into alignment with the approved homepage-like orientation composition:

- single desktop viewport
- no page-level desktop scrolling
- all major areas visible at once
- dream remains primary without consuming the whole page
- overflow handled only inside bounded panels

This pass does not change runtime behavior, payload shape, route structure, or add new product surfaces.

## Required Composition

Desktop uses an explicit `3-column / 2-row` grid inside a `100vh` shell.

Top row:
- left: `Álom`
- center: stacked `Jelzések` and `Érzelmi tér`
- right: `Álomszótár`

Bottom row:
- left: `Szálak`
- center: `Megnyitások`
- right: `Jegyzetek`

Mobile may return to a normal vertical flow. The no-page-scroll rule applies to desktop only.

## Layout Contract

### Desktop shell

- Root orientation shell uses `height: 100vh`
- Desktop shell uses `overflow: hidden`
- Main layout fills the available height rather than growing with content
- Internal padding remains calm and bounded to preserve a landscape feel

### Grid

- Desktop grid is explicitly two rows
- Top row has a larger left dream column, a narrower middle stack column, and a medium right glossary column
- Bottom row aligns under those same three columns
- `Megnyitások` must remain visible in the first viewport and may not be pushed below long dream content

### Panel scrolling

- Page itself does not scroll on desktop
- Only panel interiors may scroll when content exceeds height
- Dream text area scrolls independently from the dream title bar
- Opening list, glossary list, or notes placeholder may scroll internally if needed
- Internal scrollbars should be visually quiet where browser support allows

## Panel Design

### Álom

The dream stays primary, but it is internally hierarchical rather than a single undifferentiated card.

Internal structure:
- top title bar with AI title and edit affordance
- bounded dream text region below

Rules:
- title bar remains fixed within the dream panel
- dream text is readable but not oversized
- long dream text scrolls inside the text region
- persistent helper copy is removed

### Jelzések

- Separate placeholder panel
- Minimal label only
- No long explanatory paragraph

### Érzelmi tér

- Separate placeholder panel stacked below `Jelzések`
- Minimal label only
- No logic change

### Álomszótár

- Compact heading and list density
- Existing light interaction remains
- Copy shifts to short Hungarian labeling
- If content exceeds available height, the panel may scroll internally

### Szálak

- Becomes less technical and more compact
- Visible state labels:
  - `Új`
  - `Aktív`
  - `Szunnyadó`
- Minimal supporting copy or none
- State selection continues to filter the opening stack

### Megnyitások

- Visible in the first viewport
- Uses compact rows or small cards
- Reduced explanatory copy
- Existing activation/reactivation behavior remains unchanged

### Jegyzetek

- Placeholder or existing surface only
- No new functionality
- Minimal label and quiet empty state if needed

## Copy Rules

Reduce persistent explanation substantially.

Preferred labels:
- `Álom`
- `Álomszótár`
- `Érzelmi tér`
- `Jelzések`
- `Szálak`
- `Megnyitások`
- `Jegyzetek`

Remove long guidance text that reads like onboarding or instructions permanently embedded into the surface.

## Typography And Density

- Heading hierarchy moves closer to homepage scale
- Body text becomes smaller and calmer
- Dream text remains comfortably readable without dominating the screen
- Opening and thread controls become more compact
- Spacing shifts from document-like vertical stacking to bounded panel rhythm

## Interaction And Behavior

Behavior preserved:
- dream edit affordance
- glossary modal/opening behavior
- thread-state filtering
- opening activation/reactivation and navigation

Not in scope:
- emotion field logic
- dream signal logic
- notes functionality expansion
- glossary deep editing
- thread topology changes
- onboarding flows

## Files Expected

- `src/ui/object-orientation/object-orientation-layer.tsx`
- `src/ui/object-orientation/object-orientation-layer.module.css`
- `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`
- `docs/STABILIZATION_LEDGER.md`

## Validation Plan

- Verify desktop page itself does not scroll
- Verify all six major areas are visible in first viewport
- Verify dream panel uses internal scroll for long text
- Verify persistent copy is reduced
- Verify layout matches approved wireframe direction
- Provide desktop screenshot
- Run:
  - `npm test`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`

## Risks And Constraints

- `100vh` desktop locking must not clip critical controls at common desktop heights
- Internal scroll regions need careful min-height and overflow settings to avoid accidental page growth
- Responsive fallback should remain simple and vertical rather than forcing the desktop contract onto mobile

## Implementation Recommendation

Use a CSS-grid-first rewrite of the orientation shell and panel structure with the smallest possible React markup changes needed to:

- introduce the middle stacked placeholder column
- split the dream panel into title bar and scrollable text body
- move thread overview and opening stack into the bottom row
- reduce or remove existing helper paragraphs

This keeps behavior stable while converging composition and density.
