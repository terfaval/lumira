# Fortune Reflection Workspace UX V1 Design

## Goal

Redesign the persisted Fortune reflection phase into a focused journaling workspace that emphasizes the current reflective moment rather than a permanently visible chat transcript.

This is a presentation and interaction refactor only.

## Scope

This ticket changes only the persisted reflection presentation for:

- `ready-for-next-round`
- `awaiting-reply`
- `awaiting-resting-choice`
- `paused`

This ticket keeps `complete` outside the active workspace shell as a distinct terminal presentation.

This ticket does not change:

- facilitator semantics
- persistence/session schema
- round model
- pause/resume/complete behavior
- future focus/situation step
- Journal/resume architecture
- Draw or Library behavior

## Repository Grounding

Current reflection rendering is still split into separate stage panels inside:

- `src/features/fortune-journaling/FortuneJournalingPageClient.tsx`

Current card inspect authority already exists and should be reused through:

- `src/features/fortune-journaling/card-info.ts`

Current hydrated session state already provides the required presentation data:

- mode
- selected cards
- latest assistant turn
- persisted turns
- reflective reply
- paused/completed state

No new persistence/runtime abstraction is required based on current repository evidence.

## Approved Boundary

Primary implementation boundary:

- `src/features/fortune-journaling/FortuneJournalingPageClient.tsx`
- `src/features/fortune-journaling/fortune-journaling-page-client.module.css`

Reuse:

- `src/features/fortune-journaling/card-info.ts`
- existing Step III card inspect presentation path where practical
- existing hydrated session/turn data from `src/features/fortune-journaling/session.ts`

Only small local helpers may be added where needed for workspace-stage rendering, chronological transcript shaping, and local focus-surface state.

## Shared Reflection Workspace Shell

The persisted reflection phase becomes one persistent Reflection Workspace shell for:

- `ready-for-next-round`
- `awaiting-reply`
- `awaiting-resting-choice`
- `paused`

Desktop composition:

- existing Fortune shell/header stays above
- left persistent selected-card rail
- right stable journaling workspace

The shell remains spatially continuous across the active persisted reflection phase. Only the center content and action set change by stage.

Navigation rule remains unchanged:

- Step III / Reflection never restores Draw
- the left control exits safely to the Fortune Library
- exit does not delete, rewind, or mutate the persisted session

## Card Rail

The desktop left rail remains visible across the shared workspace shell.

Each selected card shows:

- artwork
- card number

Desktop hover:

- reveals the card name as a lightweight adjacent label
- must not shift the overall layout

Click:

- opens the existing Step III-style card inspect experience
- reuses the same authoritative card-info content and color mapping
- closes back to the exact same workspace state and textarea draft

Responsive/mobile:

- rail becomes a compact horizontal/stacked card treatment
- no horizontal page overflow

## Main Workspace Structure

The right-hand workspace is not a conventional message feed.

It has three stable subregions:

1. session context
2. current reflective moment
3. response/composer area

The intended attentional flow is:

- context
- current prompt
- user response

## Session Context

The top workspace strip remains compact and low-emphasis.

It contains:

- reading/mode name
- card count if useful
- `Előzmények`

It should be structurally ready for a future optional focus field, but this ticket does not add or request that value.

## Stage-specific Center Content

### `ready-for-next-round`

The center state is neutral and non-pressuring.

It does not fabricate assistant reflection or question content.

It presents continuation as an option:

- the user may request another reflective question
- or pause/stop here for now

`Reflektív kérdés kérése` remains the primary action.
Existing session controls remain secondary.

### `awaiting-reply`

The center region shows the current facilitator turn only.

- reflection remains visually quieter
- the question is the strongest text element
- the multiline composer sits lower in the workspace

The full historical transcript is not permanently visible here.

### `awaiting-resting-choice`

The same shell remains in place.

The center region shows the resting-point reflection and the existing:

- `Continue`
- `Pause`
- `Complete`

If the user chooses `Continue`, the same shell reveals the existing multiline continuation response path rather than switching to a different presentation model.

### `paused`

The same shell remains visible.

The center region shows:

- calm paused-state message
- existing `Resume`
- existing completion option

It must not imply that an active facilitator turn currently exists.

### `complete`

Completed sessions remain outside the shared Reflection Workspace shell.

They should read as closed/final rather than another active journaling moment.

## Composer

The response composer remains part of the shared shell.

It uses a multiline textarea styled like a journaling surface rather than a generic chat bar.

Existing behavior remains unchanged:

- no duplicate submission
- existing pending/loading behavior
- existing facilitator request flow
- existing persisted turn semantics
- existing error handling

## History / Előzmények

`Előzmények` opens a substantial history surface without leaving the workspace route.

Desktop treatment:

- large right-side drawer/overlay inside the workspace zone only
- card rail remains fully visible beside it
- underlying workspace remains visible but subordinate

Mobile treatment:

- near-full-screen sheet/drawer

History content has two sections:

### `A vetés`

Compact recap using only already-available data, such as:

- reading mode
- selected cards
- relevant session metadata already present

No invented focus/situation data.

### `Beszélgetés`

Chronological rendering of the full persisted Fortune conversation from stored turns.

Presentation should:

- distinguish facilitator and user clearly
- avoid heavy chat-bubble styling
- preserve assistant `reflection` plus optional `question`
- render user turns as persisted response text
- scroll internally when long

## Focus-surface Exclusivity

History and card inspect are mutually exclusive local focus surfaces.

Rules:

- opening `Előzmények` closes any open card inspect
- opening card inspect closes History first
- neither action mutates the persisted session
- neither action loses the textarea draft

## Responsive Behavior

Desktop:

- persistent vertical card rail
- stable right-hand journaling workspace
- History occupies workspace area only

Mobile:

- session context
- compact selected cards
- current reflective moment
- composer
- near-full-screen History

Page scrolling is acceptable on mobile where needed.

## Testing Boundary

Focused tests should cover:

- shared workspace shell across `ready-for-next-round`, `awaiting-reply`, `awaiting-resting-choice`, and `paused`
- `complete` remaining outside the shell
- neutral `ready-for-next-round` rendering without fabricated assistant content
- current-turn rendering hierarchy
- chronological History transcript from persisted turns
- History open/close preserving draft and session state
- History/card-inspect mutual exclusivity
- rail-card inspect reusing authoritative card info
- paused workspace rendering with existing actions
- exit-to-Library semantics from the persisted reflection phase
- existing facilitator submission/pending behavior inside the consolidated shell

UI-state behavior should stay at the component/page level.

Only touch deeper session tests if a true invariant already belongs there.

## Result

After this ticket:

- the persisted reflection phase reads as one stable journaling environment
- cards remain visible as reflective anchors
- the current reflective moment is foregrounded over transcript history
- history remains fully accessible without permanently occupying the workspace
- runtime and persistence semantics remain unchanged
