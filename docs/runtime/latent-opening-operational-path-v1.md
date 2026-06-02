# Latent -> Opening Operational Path v1

Date: 2026-06-01  
Type: BUILD  
Phase: Reflection MVP Build Plan v1 - Phase 3

## Goal

Activate automatic reflection preparation inside live reflection entry:

`Observation -> Latent Snapshot -> Opening Evaluation -> Workspace Surface`

## Generation Trigger

Trigger point:
- `app/objects/[objectId]/reflect/page.tsx`

Behavior on route entry:
1. Require authenticated user.
2. Call `prepareLatentOpeningForReflection({ userId, reflectiveObjectId })`.
3. Render `ReflectiveSpaceWorkspace` regardless of preparation result.

Preparation orchestrator:
- `src/runtime/orchestration/prepare-latent-opening-for-reflection.ts`

## Reuse Behavior

For each reflection entry:

1. Check object ownership/existence.
2. Read observations for the object.
3. Reuse most recent latent snapshot whose `provenance.sourceReflectiveObjects` contains the object ID.
4. If no reusable latent snapshot exists, generate one via existing latent scaffold pipeline.
5. Reuse existing openings linked to that latent snapshot (`listOpeningsByLatentSnapshot`).
6. Only if no openings exist, evaluate candidates via existing:
   - `deriveOpeningCandidatesFromLatent`
   - `applyOpeningCadencePolicy`
7. Persist approved openings only.

Result:
- Refresh/re-entry does not duplicate latent/opening artifacts when reusable artifacts already exist.

## Silence Behavior

If no opening qualifies:
- no opening is created,
- workspace still renders,
- existing explicit silence messaging remains the user-facing outcome.

This preserves:
- no-opening legitimacy,
- suppression/cooldown semantics,
- no forced invitation behavior.

## Failure Safety

If latent/opening preparation fails:
- error is caught in reflection route,
- workspace still renders,
- user can remain in reflection with fallback/silence state.

No schema changes were introduced.

## Known Limitations

- Latent reuse is based on provenance object overlap, not explicit per-object snapshot foreign key.
- No new opening types or cognition rules were added.
- Response/continuity/glossary UX remains unchanged in this phase.
