# First-Response Boundary Cleanup (Phase 1)

Date: 2026-04-06

## Summary
We will make a minimal boundary cleanup so the first-user-path blocks only on observation + frame. Latent remains a required part of the reflective pipeline, but runs asynchronously and is not a prerequisite for the first response.

## Explicit Statements (per approval)
- Blocking chain: session -> entry save -> observation -> frame.
- Async required chain: latent -> later downstream enrichment.
- Non-goal: this patch does not attempt to improve frame quality, recommendation quality, or latent quality; it only cleans up the boundary.

## Goals
- Ensure `/api/session/ensure` can return a usable frame even when latent is not yet available.
- Preserve latent as a required reflective component, but remove it from the blocking path.
- Keep the patch minimal and localized.

## Non-Goals
- No redesign of anchors, session index, directions, catalog, dream map, or glossary.
- No changes to model prompts or quality tuning.
- No changes to UI flow or page structure.

## Current State (Key Dependencies)
- `jobGenerateFrame` requires observation + session index and currently returns early when latent is missing unless `allowFallbackWithoutLatent` is true.
- `/api/session/ensure` currently calls `jobGenerateFrame` without enabling the latent-missing fallback.
- Latent is computed in `jobUpdateLatent` as part of the ensure pipeline, which can delay frame readiness.

## Proposed Change (Minimal)
1. Update `/api/session/ensure` to call `jobGenerateFrame` with `allowFallbackWithoutLatent: true`.
2. Update `jobGenerateFrame` to avoid idempotency collisions when latent is missing by using a unique latent version input token instead of a fixed dummy UUID.

## Resulting Behavior
- First response path:
  - Session creation -> entry save -> observation -> frame.
  - Frame generation proceeds even if latent is missing.
- Reflective path:
  - Latent continues running (same job), and later enriches recommendations for downstream use.

## Post-Latent Behavior
- This patch does not introduce automatic frame re-generation after latent completes.
- The first frame (possibly observation-only) remains the initial response.
- Latent results are used only by downstream processes in this phase.

## File-Level Changes (Expected)
- `app/api/session/ensure/route.ts`
  - Pass `allowFallbackWithoutLatent: true` to `jobGenerateFrame`.
- `src/orchestration/jobs/jobGenerateFrame.ts`
  - Use a stable, unique latent-missing token in the input hash to prevent idempotency collisions and distinguish latent-present vs latent-missing runs.

## Risks / Tradeoffs
- Initial frame recommendations may be less specific until latent completes.
- If latent is missing, the frame job will still run, so recommendation quality is potentially more generic on first render.

## Verification
- `npm run typecheck`
- `npm run lint`
- Manual: create session -> ensure returns -> frame renders even if latent is missing.
