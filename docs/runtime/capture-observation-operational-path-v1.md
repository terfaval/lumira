# Capture -> Observation Operational Path v1

Date: 2026-06-01  
Type: BUILD  
Phase: Reflection MVP Build Plan v1 - Phase 2

## Goal

Replace the `/capture` placeholder with a minimal operational flow:

`Dream text -> Reflective Object -> Descriptive Observation -> Reflection redirect`

## Route and Form

- Route: `/capture`
- File: `app/capture/page.tsx`
- UI fields:
  - `title`
  - `dreamText`
- Submit action: server action (`submitCapture`) in the same route file.

## Persistence Path

On submit:

1. Require authenticated user.
2. Create reflective object (`objectType: dream`, `sourceContext: manual`).
3. Build descriptive observation scaffold from submitted dream text.
4. Persist observation for the new reflective object.
5. Redirect to `/objects/[objectId]/reflect`.

Repositories and scaffold used:
- `createReflectiveObjectRepository()`
- `createObservationRepository()`
- `buildDescriptiveObservationScaffold(...)`

## Reflection Handoff

- Redirect target: `/objects/{objectId}/reflect`
- Phase 1 mounted reflection workspace consumes this object context using existing `centerObjectId` hydration path.
- Refresh preserves state via persisted reflective object + observation data.

## Orientation Status Update

- `capture_home` route target status changed from `placeholder` to `implemented`.

File:
- `src/reflective-space/composition/homepage-route-target-registry.ts`

## Out of Scope (Intentionally Unchanged)

- Latent generation
- Opening generation
- Glossary integration
- Highlights
- Advanced journal UX
- Dream map / topology

## Known Limitations

- Validation is intentionally minimal (`title` and `dreamText` required).
- Validation failure currently returns to `/capture?error=validation` without advanced inline UX messaging.
