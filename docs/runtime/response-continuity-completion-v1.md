# Response + Continuity Completion v1

Date: 2026-06-01  
Type: BUILD  
Phase: Reflection MVP Build Plan v1 - Phase 4

## Goal

Close the first usable loop:

`Opening -> User Response -> Persisted Reflection -> Continuity Cue`

## Response Save Path

Entry point:
- `src/ui/reflective-space/reflective-space-workspace.tsx`
  - `handleRespondToOpening(openingId)` posts to `/api/openings/[id]/responses`.

API path:
- `app/api/openings/[id]/responses/route.ts`:
  1. validates opening ownership and response payload,
  2. creates `reflective_responses` row,
  3. creates response-object association(s) from opening provenance object context,
  4. creates opening activation event (`opening_activation_events`),
  5. creates opening-response association (`opening_response_associations`).

## Opening Association Path

Response persistence now keeps opening lineage through:
- activation event (`opening_id`, `response_id`, context),
- opening-response association (`opening_id`, `response_id`),
- opening provenance context (source object lineage),
- explicit response-object association for object-scoped continuity retrieval.

## Refresh / Re-entry Behavior

Reflection route:
- `/objects/[objectId]/reflect`

Viewport composition:
- `src/reflective-space/composition/compose-reflective-space-viewport.ts`
  - uses `centerObjectId`,
  - scopes response surfaces to object associations when available (`listResponsesByReflectiveObject`),
  - scopes dialogue window to reflective object context (`reflectiveObjectId` filter in `composeOpeningDialogueWindow`).

Outcome:
- refresh and later re-entry on the same object route show persisted prior reflection context when present.

## Continuity Cue Behavior

Workspace cue:
- `src/ui/reflective-space/reflective-space-workspace.tsx`
  - shows explicit cue:
    - "You reflected on this material before. Prior traces are available below."
  - cue appears when object-scoped dialogue traces or response surfaces are present.

## Failure / Empty-State Handling

Existing behavior preserved:
- save failure -> inline error message (`Response writing failed.`), workspace remains usable.
- no opening -> explicit silence message remains valid.
- no responses/dialogues -> clear empty-state messaging remains.
- no forced continuity claim when no prior reflection exists.

## Known Limitations

- Continuity cue remains MVP-level and object-scoped only.
- No advanced thread-navigation/topology continuity UX is included.
- No glossary/highlight integration is included in this phase.
