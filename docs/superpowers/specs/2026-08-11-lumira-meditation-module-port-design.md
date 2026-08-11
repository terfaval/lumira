# Lumira Meditation Module Port Design

Date: 2026-08-11
Status: approved for implementation planning

## Goal

Integrate the existing Kincstarto meditation experience into Lumira as a self-contained module with:

- a homepage entry point
- a dedicated meditation route
- the same core meditation experience as Kincstarto
- minimal impact on Lumira's existing reflective system boundaries

## Scope

This design covers:

- homepage entry placement and behavior
- route and module boundaries
- filesystem layout for the port
- data and asset strategy for the first integration pass
- visual deltas required for Lumira compatibility

This design does not cover:

- admin editor save repair
- migration of meditation content to Supabase
- introduction of Vercel Blob to Lumira
- deeper integration between meditation content and Lumira reflective objects

## Product Intent

The meditation module should feel like a deliberate secondary entrance inside Lumira, not like a fragment of the existing reflective workflow. The homepage should invite entry into a slower, quieter space, then hand off into a dedicated meditation world that preserves the atmosphere and interaction model already established in Kincstarto.

Lumira remains primarily a guided dream journaling and reflection app. Meditation is an adjacent support surface, not the new primary product axis. The homepage hierarchy must preserve that distinction.

## User-Facing Outcome

From the Lumira homepage, the user sees a Meditation panel in place of the current "Recent objects" tile. The panel uses meditation-specific background imagery, Lumira typography, a short invitation, and a centered CTA.

Approved invitation line:

`Lépj be egy lassabb, csendesebb térbe.`

Clicking the panel or CTA navigates to a dedicated `/meditation` route. That route presents the Kincstarto meditation experience with its ring-based selection space, preview state, reader flow, and atmospheric background. The experience remains intentionally separate from Lumira's reflective surfaces.

## Recommended Homepage Approach

Use the existing homepage tile slot currently occupied by "Recent objects" and replace it with a Meditation tile that is visually closer to the capture tile than to the informational tiles.

The panel should:

- remain secondary to capture in hierarchy
- use full-background meditation imagery
- use centered CTA treatment
- use the approved invitation line
- route to `/meditation`

Recommended initial copy set:

- Title: `Meditáció`
- Invitation: `Lépj be egy lassabb, csendesebb térbe.`
- CTA: `Meditációk megnyitása`

The tile can be fully clickable, but the centered CTA remains the main visual action.

## Route And Boundary Model

The meditation experience should live at:

- `/meditation`

This route is a boundary, not an extension of the reflective-space runtime.

Boundary rules:

- the homepage only links into the module
- the meditation route owns its own atmosphere and UI behavior
- no first-pass dependency on reflective objects, openings, glossary, threads, or response surfaces
- no shared domain state with the reflective system beyond normal app shell concerns

This keeps the port small, reduces regression risk, and avoids forcing the meditation module into Lumira concepts it does not need.

## Module Isolation Strategy

Keep as much meditation-specific logic as possible in a dedicated feature area so the port does not spread through the app.

Target structure:

- `app/meditation/page.tsx`
- `src/features/meditation/`
- `src/features/meditation/components/`
- `src/features/meditation/hooks/`
- `src/features/meditation/lib/`
- `src/features/meditation/styles/`
- `data/meditations/`
- `data/audio/meditation_audio_map.json`
- relevant assets under `public/`

Lumira should only need small touchpoints outside the module:

- homepage tile replacement
- route entry file
- optional shared icon usage
- reuse of Lumira font variables

Everything else should stay inside the meditation module boundary.

## Port Strategy

The first implementation pass should be a feature port, not a redesign.

Preserve from Kincstarto:

- meditation loading behavior
- ring layout and selection flow
- center focus behavior
- preview panel behavior
- reader behavior
- atmospheric page treatment
- meditation data shape
- audio map loading approach

Only the minimum intentional deltas should be introduced:

- replace the existing back control with a Lumira-compatible chevron-left style
- use Lumira font variables instead of Kincstarto-specific font setup where necessary
- change the back navigation destination to Lumira homepage

Everything else should stay as close as practical to the Kincstarto experience.

## Data Strategy

Use a file-based port in the first pass.

Rationale:

- the existing Kincstarto meditation content already lives as JSON files
- the current goal is faithful integration, not content system redesign
- the admin editor save path is currently broken in Kincstarto and should not be coupled to the first Lumira integration pass
- moving to Supabase now would widen scope into schema, migration, repository, and admin rewrite work
- adding Vercel Blob to Lumira now would introduce a second storage concern without solving the immediate integration need

First-pass storage approach:

- port meditation JSON files directly into Lumira repository data
- port the audio map JSON into Lumira repository data
- keep server-side loaders file-based

Deferred work:

- admin save repair
- decision on long-term storage home
- possible later Supabase migration if meditation content becomes a maintained Lumira subsystem

## Visual Integration Rules

The meditation route should remain visibly Kincstarto-derived, but it should not look foreign inside Lumira.

Allowed Lumira adaptations:

- Lumira font variables
- Lumira-compatible back control styling
- Lumira homepage entry treatment

Not recommended in the first pass:

- rewriting the meditation page into Lumira homepage tile language
- folding the meditation UI into reflective-space components
- reworking the content architecture
- replacing the atmospheric background treatment with neutral Lumira shells

## Touched Files And Boundaries

Expected touched areas for implementation:

- homepage UI component and homepage styles
- new meditation route entry
- new meditation feature directory
- new meditation data files
- new meditation public assets

Expected untouched boundaries in the first pass:

- reflective-space composition logic
- object orientation flows
- deep reflection flows
- capture flow semantics
- reflective repositories and schemas

## Testing And Validation

Implementation should validate:

- homepage renders the new Meditation tile correctly
- the tile navigates to `/meditation`
- the meditation route loads data successfully from repository files
- the meditation route renders the expected primary interaction states
- back navigation returns to homepage
- Lumira build, lint, and typecheck remain clean

Preferred validation commands:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

Build validation must use the repository build wrapper so logging lands in the expected build log files.

## Risks

- Asset paths from Kincstarto may assume files that do not yet exist in Lumira `public/`
- The meditation module may depend on incidental global styling from Kincstarto
- Audio-related behavior may expose missing assets or path mismatches after port
- Homepage tile styling may accidentally compete too strongly with capture if hierarchy is not kept controlled

## Risk Controls

- port assets before visual tuning
- keep the route self-contained rather than reusing unrelated Lumira UI primitives
- limit first-pass visual changes to the agreed deltas
- validate route behavior before attempting admin/editor concerns

## Deferred Follow-Up

After successful integration, the next reasonable follow-up ticket is:

- repair or redesign meditation admin saving

That follow-up can also reopen the long-term storage decision:

- remain file-based
- move meditation content into Supabase
- define whether audio assets need a separate managed storage path

## Acceptance Criteria

- Lumira homepage no longer shows the existing "Recent objects" tile in its current slot
- that slot is replaced by a Meditation tile with meditation imagery, centered CTA, and the approved invitation line
- the tile links to `/meditation`
- `/meditation` renders the Kincstarto-style meditation experience with minimal behavioral drift
- the route uses Lumira-compatible fonts
- the route uses a chevron-left style back control returning to homepage
- meditation content loads from repository files
- no reflective-system schema or repository changes are required for the first pass
