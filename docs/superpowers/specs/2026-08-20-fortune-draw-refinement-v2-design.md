# Fortune Draw Refinement V2 Design

## Goal

Refine the Fortune Journaling Draw state so it uses the shared step shell, real card-back asset, stronger responsive fan composition, and toggleable in-place selection without changing persisted session semantics.

This slice is a focused Draw UX patch.

## Repository Grounding

Current Draw behavior is implemented in:

- `src/features/fortune-journaling/FortuneJournalingPageClient.tsx`
- `src/features/fortune-journaling/fortune-journaling-page-client.module.css`

Current evidence in the repository:

- Step II still renders a separate remaining-count line inside Draw
- Draw still renders a `Vissza a könyvtárhoz` button inside the surface
- selected cards are removed from the deck into a selected tray
- face-down cards still use a temporary text-based `Lumira` placeholder
- desktop Draw uses a shallow fan with fixed-feeling sizing

The current session-create flow already commits the spread on the final required selection. That persistence behavior remains authoritative for this patch.

## Scope

This patch changes only:

- Step I / Step II / Step III header-left behavior
- Step II instruction copy
- Draw desktop/mobile layout and selection behavior
- Draw card-back rendering
- focused Fortune Draw tests

This patch does not change:

- `tarot_mode_library.json`
- Major Arcana data
- session schema
- session API contracts
- spread reconstruction
- facilitator runtime
- Reflection Workspace
- Step III persisted spread semantics

## Approved State And Navigation Model

### Step I

- shared shell header shows `I. LÉPÉS`
- header-left control navigates to `/`

### Step II

- shared shell header shows `II. LÉPÉS`
- instruction line is the only draw guidance
- initial copy: `Válassz X kártyát`
- after selection begins: `Válassz még X kártyát`
- no standalone `Még X kártyát válassz` heading remains in Draw
- header-left control returns to Library, clears local in-progress selection, and creates no session

### Step III And Later Persisted Stages

- once the final required Draw selection is made, the current create-session flow still commits immediately
- Step III does not restore Step II
- from Step III onward, header-left is conceptually an exit, not backward navigation
- header-left returns to the Fortune Library without deleting, rewinding, or mutating the persisted session

## Draw Layout Design

### Desktop / Tablet-like Layout

Above the existing stacked/mobile layout breakpoint, Draw becomes a bounded single-screen composition:

- shared Step II header remains visible
- optional mode orientation copy may remain as restrained supporting copy under the instruction
- all 22 face-down cards remain visible in one fan
- page-level vertical scrolling is disabled only for desktop Draw
- horizontal page overflow is not allowed

The fan must be fluid and viewport-relative rather than tuned to one fixed desktop width.

Implementation direction:

- use CSS custom properties with `clamp()` plus `vw` and `vh` inputs
- size card width, card height, overlap, arc lift, horizontal spread, and transform origin together
- keep sensible min/max guards so cards do not become tiny on smaller desktop widths or oversized on large screens

### Mobile Layout

Below the existing stacked/mobile breakpoint:

- do not use the desktop fan
- use a straightforward stacked or simple grid layout
- keep all 22 cards selectable
- allow vertical scrolling
- prevent horizontal overflow

## Fan Geometry

The desktop fan should read as a deliberate physical fan rather than a shallow overlapping row.

Required qualities:

- stronger horizontal spread
- stronger outer-card rotation
- more pronounced vertical curvature
- centered and symmetric composition
- transform-based layout rather than document-flow positioning

The geometry should scale proportionally with viewport size so the full fan remains inside the visible Draw composition.

## Selection Interaction

### Incomplete Draw

Before the required count is reached:

- clicking an unselected card selects it
- clicking a selected card deselects it
- selection count never exceeds `mode.card_count`
- duplicate selection is not allowed

### Visual Treatment

- selected cards remain in their original fan or mobile-layout position
- selected cards do not move into a tray or separate area
- selected state is stronger than ordinary hover
- selected cards stay visibly raised and scaled even when not hovered
- hover on unselected cards still lifts and scales modestly
- selected hover may add only a very small extra affordance
- selected state may use restrained outline, shadow, or offset reinforcement

### Completion

- final required unique selection still triggers the existing persistence and Spread transition immediately
- no post-commit deselection is required
- no Step III -> Step II restoration is introduced

## Card-back Asset

Draw must use:

- `public/fortune-journaling/card-back.png`

Rules:

- use the real asset for every face-down card on desktop and mobile Draw
- preserve the image aspect ratio
- remove the temporary text-based placeholder treatment
- do not modify the asset itself

## Testing Boundary

Add or update focused Fortune tests for:

- Step II remaining-count copy in the shared header
- select -> deselect before completion
- selection uniqueness
- maximum card-count enforcement
- final selection persistence trigger
- Step II header-left returning to Library if testable at component level
- Step III header-left exiting to Library without draw restoration if testable at component level

Test placement rule:

- keep client-state Draw behavior coverage at the component/page level
- only touch `src/features/fortune-journaling/session.test.ts` if an invariant already belongs to existing session helpers rather than client state

## Implementation Shape

Recommended implementation remains intentionally narrow:

1. update header copy and header-left behavior in `FortuneJournalingPageClient.tsx`
2. remove obsolete Draw-only guidance, back button, tray, and placeholder card back
3. add toggleable in-place Draw selection while preserving the final-selection commit flow
4. rebuild Draw CSS for a viewport-relative desktop fan and stacked mobile selection layout
5. update focused Fortune tests without expanding session or persistence abstractions

## Non-scope

- no persistence redesign
- no session lifecycle weakening
- no Journal view
- no Reflection Workspace changes
- no spread layout redesign
- no artwork lookup changes for revealed cards
- no shuffle animation work unless it is effectively free within the existing patch

## Result

After this patch:

- Draw uses the shared shell cleanly
- desktop Draw becomes a non-scrolling bounded composition with a larger, clearer, responsive fan
- mobile Draw remains intentionally different and scrollable
- selected cards stay in place and can be toggled before commit
- the final Draw commit and persisted Spread flow remain intact
