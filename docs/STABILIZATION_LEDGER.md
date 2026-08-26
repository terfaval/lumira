# Stabilization Ledger

## Purpose

Append-only historical stabilization record for the clean-room rebuild.

This ledger exists to record:
- what was completed
- when it was completed
- which boundaries were affected
- how completion was validated

Use this file to understand how Lumira reached its current state.

Do not use this file as:
- the primary onboarding document
- the primary current-state summary
- the coordinator workflow guide

For present operational reality, use `docs/CURRENT_STATE.md`.
For onboarding and navigation, use `docs/DOCS_INDEX.md` and `docs/AGENT_START_HERE.md`.

## Logging Rule

For every completed build ticket:

1. Add/update an entry here with date, phase, and touched boundaries.
2. Run build through `npm run build` so logs are written to:
- `docs/BUILD_LOG.md` (summary)
- `docs/build-logs/<timestamp>.log` (full output)

## Ledger Scope

This ledger should contain:
- milestone chronology
- completed work history
- touched-boundary summaries
- validation references
- historically relevant limitations
- stabilization history

This ledger should not become:
- a current-state tracker
- an active-priority tracker
- a roadmap
- a plan
- a general discussion log

`docs/CURRENT_STATE.md` answers:
- what is true now
- what we are working on now
- what changed recently enough to affect safe contribution

`docs/STABILIZATION_LEDGER.md` answers:
- how we got here
- what completed stabilization work changed the repository
- what validation supported those completions

## Entry Guidance

## 2026-08-25 - Fortune Optional Focus Step V1

- Phase: BUILD
- Touched boundaries:
  - `app/api/fortune/sessions`
  - `app/fortune`
  - `src/features/fortune-journaling`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Added a new optional pre-session Focus step between Library and Draw, renumbered the shared step shell to `I / II / III / IV`, and kept Reflection Workspace outside the numbered sequence.
  - Kept Focus client-local until the existing final-card session-create boundary, then persisted it through the already-supported `focusText` session field without introducing a parallel context field or new persistence abstraction.
  - Surfaced persisted Focus in the Reflection Workspace session context and `Előzmények -> A vetés`, while preserving the existing facilitator/session lifecycle and reusing the established focus-aware facilitator packet path.
- Verification:
  - `npx.cmd vitest run src/features/fortune-journaling/pre-session-state.test.ts src/features/fortune-journaling/draw-state.test.ts src/features/fortune-journaling/session.test.ts app/api/fortune/sessions/route.test.ts app/fortune/page.test.tsx app/fortune/reflection-workspace-page.test.tsx src/features/fortune-journaling/reflection-workspace.test.ts src/features/fortune-journaling/card-info.test.ts` -> pass
  - `npx.cmd tsc --noEmit --pretty false` -> fails on pre-existing unrelated type errors in `src/cognition/latent-v2/opportunity-constructor-v3/__tests__/opportunity-constructor-v3.test.ts` and `src/cognition/observation-v3/pipeline/replay/__tests__/preserved-case-loader.test.ts`
- `npm.cmd run build` -> no fresh clean verification obtained in this session: earlier 2026-08-25 build logs include one success (`docs/build-logs/2026-08-25T20-15-41-779Z.log`) and one concurrent-build lock failure (`docs/build-logs/2026-08-25T20-17-54-780Z.log`), while a fresh rerun timed out locally after 184.9s without producing a new logged result
- Follow-up note:
  - No schema or facilitator contract expansion was required for this ticket because `focusText` was already present in the Fortune session HTTP/domain/facilitator path.

## 2026-08-25 - Fortune Reflection Workspace UX V1

- Phase: BUILD
- Touched boundaries:
  - `app/fortune`
  - `src/features/fortune-journaling`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Consolidated the persisted Fortune reflection phase into one shared workspace shell for `ready-for-next-round`, `awaiting-reply`, `awaiting-resting-choice`, and `paused`, while preserving `complete` as a distinct terminal presentation outside the active workspace.
  - Added a persistent selected-card rail, compact session context strip, stage-specific center content, multiline composer only when a reply is actually expected, and a History drawer that occupies the desktop workspace zone without covering the card rail.
  - Reused the existing Step III tarot metadata path for rail-card inspection, enforced local History/card-inspect mutual exclusivity without touching persistence semantics, and kept all session/facilitator lifecycle behavior on the existing hydrated session-turn model.
- Verification:
  - `npx.cmd vitest run app/fortune/page.test.tsx app/fortune/reflection-workspace-page.test.tsx src/features/fortune-journaling/session.test.ts src/features/fortune-journaling/reflection-workspace.test.ts src/features/fortune-journaling/draw-geometry.test.ts` -> pass
  - `npx.cmd tsc --noEmit` -> fails on pre-existing unrelated type errors in `src/cognition/latent-v2/opportunity-constructor-v3/__tests__/opportunity-constructor-v3.test.ts` and `src/cognition/observation-v3/pipeline/replay/__tests__/preserved-case-loader.test.ts`
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-25T14-23-37-950Z.log`)
- Follow-up note:
  - One failed build log (`docs/build-logs/2026-08-25T14-21-16-330Z.log`) was produced only because a previous in-progress `next build` still held the build lock after a timeout; the subsequent full rerun completed successfully.

## 2026-08-20 - Fortune Library Proportion And Info Surface Polish

- Phase: BUILD
- Touched boundaries:
  - `app/fortune`
  - `src/features/fortune-journaling`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Increased desktop library tile proportions while preserving identical geometry across all three card-count groups, the approved two-row desktop composition, and the desktop-only library scroll lock.
  - Widened the fixed-position mode info surface so authored descriptions and `use_when[]` content breathe horizontally, and widened the page-level Fortune Journaling info surface to read as a near-full-width explanatory overlay above the grid.
  - Added restrained transparent-track scrollbar styling for Fortune info surfaces without hiding internal scroll affordances when they are still needed.
- Verification:
  - `npm.cmd test -- app/fortune/page.test.tsx app/api/fortune/sessions/route.test.ts src/features/fortune-journaling/session.test.ts src/features/fortune-journaling/facilitator/__tests__/fortune-facilitator-runtime.test.ts` -> pass
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-20T08-44-56-874Z.log`)
- Follow-up note:
  - Direct desktop screenshot validation was attempted but not completed because local Playwright browser installation required approval and that approval was not granted in-session.

## 2026-08-20 - Fortune Library Final Composition And Mode Info Panel

- Phase: BUILD
- Touched boundaries:
  - `app/fortune`
  - `src/features/fortune-journaling`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Finalized the desktop Fortune library as a single-screen three-group composition with lighter `2 LAPOS / 3 LAPOS / 4 LAPOS` labels, identical tile geometry across all groups, a preserved two-row height for the one-tile `4 LAPOS` column, and a desktop-only page scroll lock limited to the library state.
  - Replaced the tile-anchored mode popover with one stable grid-relative overlay panel that stays in the same centered position for every mode, keeps the library visible behind it, and swaps content without moving or resizing the grid.
  - Preserved the separate page-level Fortune Journaling info surface, the Meditation-style chevron back control, tile-start session behavior, and all existing draw/spread/runtime boundaries.
- Verification:
  - `npm.cmd test -- app/fortune/page.test.tsx app/api/fortune/sessions/route.test.ts src/features/fortune-journaling/session.test.ts src/features/fortune-journaling/facilitator/__tests__/fortune-facilitator-runtime.test.ts` -> pass
  - `npm.cmd run lint` -> fails on pre-existing unrelated lint errors in `src/cognition/glossary/__tests__/extract-glossary-candidates-from-observations.test.ts`, `src/reflective-space/composition/__tests__/compose-deep-reflection-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-object-orientation-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-reflective-space-viewport.test.ts`, and `src/runtime/orchestration/__tests__/generate-glossary-candidates-for-reflective-object.test.ts`
  - `npm.cmd run typecheck` -> fails on pre-existing unrelated type errors in `src/cognition/latent-v2/opportunity-constructor-v3/__tests__/opportunity-constructor-v3.test.ts` and `src/cognition/observation-v3/pipeline/replay/__tests__/preserved-case-loader.test.ts`
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-20T08-05-32-769Z.log`)
- Follow-up note:
  - Desktop screenshot validation could not be completed in-session because local Playwright browser binaries were unavailable, so the visual assessment here is limited to implemented layout constraints plus server-rendered markup inspection.

## 2026-08-20 - Fortune Library Viewport Composition And Info Surfaces

- Phase: BUILD
- Touched boundaries:
  - `app/fortune`
  - `src/features/fortune-journaling`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Reworked the default Fortune library into one shared desktop composition with the `2`, `3`, and `4` card-count groups displayed side by side, keeping all seven modes within a compact two-row maximum tile arrangement instead of stacked sections.
  - Replaced text-like count glyphs with CSS-rendered miniature card silhouettes, removed the remaining library eyebrow, adopted the Meditation-style back-chevron top row, and added a separate page-level Fortune Journaling info surface that does not affect session state.
  - Kept per-mode info on the anchored-popover path while constraining desktop placement to tile-relative overlays that do not push neighboring tiles or page height, and preserved the existing mobile overlay fallback plus all existing draw/spread/runtime boundaries.
- Verification:
  - `npm.cmd test -- app/fortune/page.test.tsx app/api/fortune/sessions/route.test.ts src/features/fortune-journaling/session.test.ts src/features/fortune-journaling/facilitator/__tests__/fortune-facilitator-runtime.test.ts` -> pass
  - `npm.cmd run lint` -> fails on pre-existing unrelated lint errors in `src/cognition/glossary/__tests__/extract-glossary-candidates-from-observations.test.ts`, `src/reflective-space/composition/__tests__/compose-deep-reflection-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-object-orientation-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-reflective-space-viewport.test.ts`, and `src/runtime/orchestration/__tests__/generate-glossary-candidates-for-reflective-object.test.ts`
  - `npm.cmd run typecheck` -> fails on pre-existing unrelated type errors in `.next/types/validator.ts`, `src/cognition/latent-v2/opportunity-constructor-v3/__tests__/opportunity-constructor-v3.test.ts`, and `src/cognition/observation-v3/pipeline/replay/__tests__/preserved-case-loader.test.ts`
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-20T07-42-18-066Z.log`)
- Follow-up note:
  - Authenticated browser validation was still not available in-session, so the desktop viewport-fit assessment here is based on the implemented layout constraints plus server-rendered markup inspection rather than a signed-in screenshot run.

## 2026-08-20 - Fortune Library Draw Spread Visual Refinement V1

- Phase: BUILD
- Touched boundaries:
  - `app/fortune`
  - `src/features/fortune-journaling`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Removed the large hero and primary panel framing from the library, draw, and spread surfaces so the Fortune flow sits directly on the existing page background with spacing and typography carrying the hierarchy.
  - Refined the mode library into card-count-derived grouped grids with square-leaning tiles, interactionally separate circular `i` controls, and anchored info popovers that do not stretch neighboring tiles.
  - Tightened the desktop draw fan to keep all 22 face-down Major Arcana within the content width, separated selected cards into their own tray, preserved the mobile alternative, and refined the spread hierarchy plus centered reflection CTA without changing the downstream runtime.
- Verification:
  - `npm.cmd test -- app/fortune/page.test.tsx app/api/fortune/sessions/route.test.ts src/features/fortune-journaling/session.test.ts src/features/fortune-journaling/facilitator/__tests__/fortune-facilitator-runtime.test.ts` -> pass
  - `npm.cmd run lint` -> fails on pre-existing unrelated lint errors in `src/cognition/glossary/__tests__/extract-glossary-candidates-from-observations.test.ts`, `src/reflective-space/composition/__tests__/compose-deep-reflection-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-object-orientation-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-reflective-space-viewport.test.ts`, and `src/runtime/orchestration/__tests__/generate-glossary-candidates-for-reflective-object.test.ts`
  - `npm.cmd run typecheck` -> fails on pre-existing unrelated type errors in `src/cognition/latent-v2/opportunity-constructor-v3/__tests__/opportunity-constructor-v3.test.ts` and `src/cognition/observation-v3/pipeline/replay/__tests__/preserved-case-loader.test.ts`
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-20T07-07-42-017Z.log`)
- Follow-up note:
  - Visual browser validation was not completed in-session because the local `/fortune` route redirected to auth, so acceptance here is based on code inspection plus route and session recovery tests.

## 2026-08-13 - OBS-V3-STAB-11 Provisional Carrier Relaxation

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/descriptive-extraction/`
  - `src/cognition/observation-v3/pipeline/__tests__/`
  - `src/cognition/observation-v3/memory-realization/__tests__/`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Relaxed descriptive extraction so the native provisional candidate can survive when scene-level evidence grounding fails but at least one descriptive unit remains fully grounded to source text.
  - Kept the existing native C0 candidate shape and derived provisional locality evidence from grounded observation spans instead of inventing a second provisional carrier family or fabricating canonical scenes.
  - Preserved the canonical scene-first authority boundary by leaving final fail-closed enforcement at memory realization and keeping admission and persistence semantics unchanged.
- Verification:
  - `npm.cmd test -- src/cognition/observation-v3/descriptive-extraction/__tests__/descriptive-extraction.test.ts` -> pass
  - `npm.cmd test -- src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts` -> pass
  - `npm.cmd test -- src/cognition/observation-v3/memory-realization/__tests__/memory-realization.test.ts` -> pass
  - `npm.cmd test -- src/cognition/observation-v3/pipeline/__tests__/pipeline-runner.test.ts` -> pass
  - `npm.cmd test -- src/cognition/observation-v3/authority-admission/__tests__/shadow-authority-admission.test.ts` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-13T07-56-23-598Z.log`)
- Follow-up note:
  - The successful build preserved the existing Turbopack NFT tracing warning rooted through `next.config.ts`; this ticket did not widen or remediate that warning.

## 2026-08-12 - OBS-V3-CUTOVER-11 Failed Capture Diagnostic Enrichment

- Phase: BUILD
- Touched boundaries:
  - `app/capture/page.tsx`
  - `app/capture/page.test.tsx`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Extended the existing `llm_observation_extraction_failed` capture diagnostic for explicit V3 failures instead of introducing a second diagnostic path.
  - Added deterministic reachability reporting for failed stage, supplemental realization, authority admission, iterative recovery, and final completeness so `not_reached` is emitted only when the pipeline result proves the later stage was never reached.
  - Preserved the full structured failed-stage `failure` payload and widened final-completeness extraction to already-produced pipeline artifacts, including pre-admission completeness-stage artifacts, without changing capture, admission, supplemental, or persistence semantics.
- Verification:
  - `npx.cmd vitest run app/capture/page.test.tsx` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-12T16-56-44-297Z.log`)
- Follow-up note:
  - The successful build preserved the existing Turbopack NFT tracing warning rooted through `next.config.ts`; this ticket did not widen or remediate that warning.

## 2026-08-10 - OBS-V3-STAB-08B Pipeline Completion and Governance Disposition Separation

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/pipeline/`
  - `src/cognition/observation-v3/validation/__tests__/`
  - `docs/v2-build/observation/Observation-V3-End-to-End-Replay-Completion.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - focused subsystem suites:
    - `npx.cmd vitest run src/cognition/observation-v3/pipeline/__tests__/pipeline-summary.test.ts src/cognition/observation-v3/pipeline/__tests__/pipeline-runner.test.ts src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts src/cognition/observation-v3/pipeline/replay/__tests__/pipeline-replay-runner.test.ts src/cognition/observation-v3/validation/__tests__/full-benchmark-baseline.test.ts` -> pass
  - repository verification:
    - `npm.cmd run typecheck` -> pass
    - `npm.cmd run lint -- src/cognition/observation-v3/pipeline src/cognition/observation-v3/validation scripts/generate-observation-v3-stab-05-evidence.ts` -> pass
    - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-10T07-19-39-502Z.log`
- Notes:
  - Added explicit execution-oriented `pipelineCompletionStatus` to the terminal summary so successful runs that reach Authority Admission no longer present governance deferral or rejection as pipeline failure.
  - Promoted `governanceDisposition` as the primary governance field for new consumers while retaining `finalOutcome` only as a deprecated compatibility alias for replay and validation consumers that still expect it.
  - Preserved truthful `failureSourceStage` reporting and verified representative `completed + deferred`, `completed + rejected`, and actual execution-failure cases without changing Authority Admission policy or disposition mapping.

## 2026-08-09 - OBS-V3-STAB-07A Native Pre-Composition Candidate Isolation

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/descriptive-extraction/`
  - `src/cognition/observation-v3/completeness-analysis/`
  - `src/cognition/observation-v3/pipeline/`
  - `src/cognition/observation/llm-scene-observation-extractor.ts`
  - `scripts/generate-observation-v3-stab-07a-evidence.ts`
  - `.validation/observation-v3/stabilization/stab-07a/20260809T174000Z-native-c0-isolation/`
  - `docs/v2-build/observation/Observation-V3-Remaining-Issue-Register.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - focused subsystem suites:
    - `npm.cmd test -- src/cognition/observation-v3/descriptive-extraction/__tests__/descriptive-extraction.test.ts` -> pass
    - `npm.cmd test -- src/cognition/observation-v3/completeness-analysis/__tests__/completeness-analysis.test.ts` -> pass
    - `npm.cmd test -- src/cognition/observation-v3/supplemental-realization/__tests__/supplemental-realization.test.ts` -> pass
    - `npm.cmd test -- src/cognition/observation-v3/memory-composition/__tests__/memory-composition.test.ts` -> pass
    - `npm.cmd test -- src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts` -> pass
    - `npm.cmd test -- src/cognition/observation-v3/pipeline/replay/__tests__/pipeline-replay-runner.test.ts` -> pass
    - `npm.cmd test -- src/cognition/observation-v3/validation/__tests__/full-benchmark-baseline.test.ts` -> pass
  - repository verification:
    - `npm.cmd run typecheck` -> pass
    - `npm.cmd run lint -- src/cognition/observation-v3/descriptive-extraction src/cognition/observation-v3/completeness-analysis src/cognition/observation-v3/supplemental-realization src/cognition/observation-v3/memory-composition src/cognition/observation-v3/pipeline src/cognition/observation/llm-scene-observation-extractor.ts` -> pass
    - `npm.cmd run lint` -> pass with `3` pre-existing unrelated warnings in `src/cognition/latent-v2/opportunity-constructor/provenance.ts` and `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
    - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-09T15-35-39-021Z.log`
  - machine-readable evidence:
    - `npx.cmd tsx scripts/generate-observation-v3-stab-07a-evidence.ts --stabilization-root .validation/observation-v3/stabilization/stab-07a/20260809T174000Z-native-c0-isolation` -> pass
- Notes:
  - Replaced `ObservationV2Bundle` as the active pre-composition shadow-path carrier with a native `ObservationV3NativeC0Candidate`, keeping C0 as the authoritative input to initial Completeness, Supplemental baseline seeding, and baseline Memory Composition seeding.
  - Retained V2 projection only as an explicit compatibility/comparison boundary through native-candidate projection helpers and the legacy `llm-scene-observation-extractor` bridge, so the native shadow pipeline no longer consumes a V2 bundle to make active-path decisions.
  - Added concise machine-readable carrier evidence at `.validation/observation-v3/stabilization/stab-07a/20260809T174000Z-native-c0-isolation/stab-07a-evidence.json`, including native C0 identity, initial Completeness input identity, Supplemental baseline identity, Composition baseline identity, V2 projection identity, and confirmation that the projection is not re-consumed by the native pipeline.

## 2026-08-09 - OBS-V3-STAB-06 Targeted Tail-Recovery Reliability and Cost-Latency Hardening

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/supplemental-realization/`
  - `src/cognition/observation/experiment/openai-structured-experiment.ts`
  - `scripts/generate-observation-v3-stab-05-evidence.ts`
  - `.validation/observation-v3/stabilization/stab-06/20260809T142000Z-tail-window-hardening/`
  - `docs/v2-build/observation/Observation-V3-Remaining-Issue-Register.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - focused subsystem suites:
    - `npx.cmd vitest run src/cognition/observation-v3/supplemental-realization/__tests__/supplemental-realization.test.ts` -> pass
    - `npx.cmd vitest run src/cognition/observation-v3/pipeline/__tests__/pipeline-runner.test.ts src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts src/cognition/observation-v3/pipeline/replay/__tests__/preserved-case-loader.test.ts src/cognition/observation-v3/pipeline/replay/__tests__/pipeline-replay-runner.test.ts src/cognition/observation-v3/validation/__tests__/full-benchmark-baseline.test.ts` -> pass
  - repository verification:
    - `npm.cmd run lint` -> pass with `3` pre-existing unrelated warnings in `src/cognition/latent-v2/opportunity-constructor/provenance.ts` and `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
    - `npm.cmd run typecheck` -> pass
    - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-09T13-26-32-887Z.log`
  - fresh provider-backed validation:
    - `npx.cmd tsx scripts/run-observation-topology-experiment.ts --benchmark OBS-H-002 --configuration C_TARGETED_RECOVERY --repeat 3 --output-root .validation/observation-topology-experiments/stab-06-postfix` -> completed with one descriptive-provider timeout before Supplemental on `repeat-01`, plus two successful recovery executions
    - `npx.cmd tsx scripts/run-observation-topology-experiment.ts --benchmark OBS-H-002 --configuration C_TARGETED_RECOVERY --repeat 1 --output-root .validation/observation-topology-experiments/stab-06-postfix` -> pass, supplying a third successful post-fix recovery execution
    - `npx.cmd tsx scripts/run-observation-topology-experiment.ts --benchmark OBS-B-001 --configuration C_TARGETED_RECOVERY --repeat 3 --output-root .validation/observation-topology-experiments/stab-06-postfix` -> pass
    - `npx.cmd tsx scripts/run-observation-topology-experiment.ts --benchmark OBS-A-002 --benchmark OBS-E-001 --configuration C_TARGETED_RECOVERY --repeat 1 --output-root .validation/observation-topology-experiments/stab-06-postfix` -> pass
- Notes:
  - Repaired the primary `OBS-H-002` failure at the intended upstream seam: large high-confidence terminal tail gaps with `coverage_tail_loss_detected`, `late_section_missing`, and `ending_not_retained` now build an ending-biased bounded window that always includes the source ending instead of spending most of the budget on already-covered earlier material.
  - Fresh `OBS-H-002` recovery windows moved from roughly `3161-3200` characters to a stable `1225`-character terminal window (`2632..3857`), while average supplemental extraction tokens dropped from `4689.33` to `2629.33` and average uncovered tail shrank from `1892.33` to `616.33`.
  - `OBS-B-001` remained recovery-functional under the same bounded planner, `OBS-A-002` still skipped Supplemental under `not_required`, and the fresh `OBS-E-001` activation remained consistent with `required_before_admission`, so no `STAB-04` or `STAB-05` regression was introduced by this repair.
  - Added evidence-only per-attempt Supplemental provider latency capture through the existing provider evidence path; machine-readable STAB-06 results are recorded at `.validation/observation-v3/stabilization/stab-06/20260809T142000Z-tail-window-hardening/stab-06-evidence.json`.

## 2026-08-09 - OBS-V3-STAB-05 Uncertainty-Aware Overlap Governance

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/memory-composition/`
  - `scripts/generate-observation-v3-stab-05-evidence.ts`
  - `.validation/observation-v3/stabilization/stab-05/20260809T123211Z-overlap-governance-hardening/`
  - `docs/v2-build/observation/Observation-V3-Remaining-Issue-Register.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - focused subsystem suites:
    - `npx.cmd vitest run src/cognition/observation-v3/memory-composition/__tests__/memory-composition.test.ts` -> pass
    - `npx.cmd vitest run src/cognition/observation-v3/memory-realization/__tests__/memory-realization.test.ts` -> pass
    - `npx.cmd vitest run src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts` -> pass
    - `npx.cmd vitest run src/cognition/observation-v3/pipeline/replay/__tests__/pipeline-replay-runner.test.ts` -> pass
    - `npx.cmd vitest run src/cognition/observation-v3/validation/__tests__/full-benchmark-baseline.test.ts` -> pass
    - `npx.cmd vitest run src/cognition/observation-v3/memory-composition/__tests__/memory-composition.test.ts src/cognition/observation-v3/memory-realization/__tests__/memory-realization.test.ts src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts src/cognition/observation-v3/pipeline/replay/__tests__/pipeline-replay-runner.test.ts src/cognition/observation-v3/validation/__tests__/full-benchmark-baseline.test.ts` -> pass
  - repository verification:
    - `npm.cmd run typecheck` -> pass
    - `npm.cmd run lint -- src/cognition/observation-v3/memory-composition src/cognition/observation-v3/memory-realization src/cognition/observation-v3/pipeline src/cognition/observation-v3/validation scripts/generate-observation-v3-stab-05-evidence.ts` -> pass
    - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-09T10-39-43-606Z.log`
  - representative benchmark replay:
    - `npx.cmd tsx scripts/run-observation-v3-full-benchmark-baseline.ts --validation-root .validation --output-root .validation/observation-v3/stabilization/stab-05/20260809T123211Z-overlap-governance-hardening/runs --baseline-id run-1` -> pass
    - `npx.cmd tsx scripts/generate-observation-v3-stab-05-evidence.ts --stabilization-root .validation/observation-v3/stabilization/stab-05/20260809T123211Z-overlap-governance-hardening --run-id run-1` -> pass
- Notes:
  - Hardened Memory Composition so recovery-origin overlap is no longer treated as safely additive whenever it is merely non-duplicate; low-novelty, high-overlap redundant Supplemental restatements are now abstained instead of surviving as stronger parallel facts.
  - Duplicate collapse remains intact, legitimate coexistence remains intact, and unresolved alternatives remain preserved when the overlap is not safely redundant.
  - Historical `OBS-E-001`-style overlap regression evidence is captured in `.validation/observation-v3/stabilization/stab-05/20260809T123211Z-overlap-governance-hardening/stab-05-evidence.json`, while current main still skips Supplemental for `OBS-E-001` under `STAB-04`.
  - `OBS-H-002` continues to preserve unresolved alternatives on fresh replay; targeted-recovery execution reliability remains deferred to `STAB-06`.

## 2026-08-09 - OBS-V3-STAB-04 Recovery Abstention and Short-Dream Activation Hardening

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/pipeline/`
  - `src/cognition/observation-v3/supplemental-realization/`
  - `src/cognition/observation-v3/validation/__tests__/`
  - `src/cognition/observation-v3/pipeline/replay/__tests__/`
  - `.validation/observation-v3/stabilization/stab-04/20260809T080500Z-recovery-abstention-short-dream-activation-hardening/`
  - `docs/v2-build/observation/Observation-V3-Remaining-Issue-Register.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - focused subsystem suites:
    - `npx.cmd vitest run src/cognition/observation-v3/pipeline/__tests__/pipeline-runner.test.ts` -> pass
    - `npx.cmd vitest run src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts` -> pass
    - `npx.cmd vitest run src/cognition/observation-v3/supplemental-realization/__tests__/supplemental-realization.test.ts` -> pass
    - `npx.cmd vitest run src/cognition/observation-v3/pipeline/replay/__tests__/pipeline-replay-runner.test.ts` -> pass
    - `npx.cmd vitest run src/cognition/observation-v3/validation/__tests__/full-benchmark-baseline.test.ts` -> pass
  - repository verification:
    - `npm.cmd run typecheck` -> pass
    - `npm.cmd run lint` -> pass with `3` pre-existing unrelated warnings in `src/cognition/latent-v2/opportunity-constructor/provenance.ts` and `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
    - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-09T08-00-45-006Z.log`
  - representative benchmark replay:
    - `npx.cmd tsx scripts/run-observation-v3-full-benchmark-baseline.ts --validation-root .validation --output-root .validation/observation-v3/stabilization/stab-04/20260809T080500Z-recovery-abstention-short-dream-activation-hardening/runs --baseline-id run-1` -> pass
    - `npx.cmd tsx scripts/run-observation-v3-full-benchmark-baseline.ts --validation-root .validation --output-root .validation/observation-v3/stabilization/stab-04/20260809T080500Z-recovery-abstention-short-dream-activation-hardening/runs --baseline-id run-2` -> pass
- Notes:
  - Repaired the Supplemental Realization activation contract so `recoveryRecommendation.disposition` controls execution and `eligibility` remains capability metadata.
  - Added planner defense-in-depth so `not_required` cannot independently produce supplemental work even if invoked.
  - Representative artifact summary at `.validation/observation-v3/stabilization/stab-04/20260809T080500Z-recovery-abstention-short-dream-activation-hardening/stab-04-summary.json` shows `OBS-A-001`, `OBS-A-002`, and `OBS-E-001` abstaining from Supplemental while `OBS-C-002` still executes it, with deterministic rerun equality across both runs.

## 2026-08-08 - OBS-V3-STAB-03 Final-Candidate Completeness Lifecycle Repair

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/completeness-analysis/`
  - `src/cognition/observation-v3/pipeline/`
  - `src/cognition/observation-v3/stabilization/__tests__/`
  - `.validation/observation-v3/stabilization/stab-03/20260808T133700Z-final-completeness-lifecycle-repair/`
  - `docs/v2-build/observation/Observation-V3-Remaining-Issue-Register.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - focused subsystem suites:
    - `npx.cmd vitest run src/cognition/observation-v3/completeness-analysis/__tests__/completeness-analysis.test.ts` -> pass
    - `npx.cmd vitest run src/cognition/observation-v3/stabilization/__tests__/stab-02-admission-lifecycle-diagnosis.test.ts` -> pass
    - `npx.cmd vitest run src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts` -> pass
    - `npx.cmd vitest run src/cognition/observation-v3/pipeline/replay/__tests__/pipeline-replay-runner.test.ts` -> pass
    - `npx.cmd vitest run src/cognition/observation-v3/validation/__tests__/full-benchmark-baseline.test.ts` -> pass
  - repository verification:
    - `npm.cmd run typecheck` -> pass
    - `npm.cmd run lint` -> pass with `3` pre-existing unrelated warnings in `src/cognition/latent-v2/opportunity-constructor/provenance.ts` and `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
    - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-08T11-34-15-614Z.log`
  - representative benchmark replay:
    - `npx.cmd tsx --eval "<stab-03 representative slice runner>"` -> completed with artifact root `.validation/observation-v3/stabilization/stab-03/20260808T133700Z-final-completeness-lifecycle-repair/`
- Notes:
  - Added explicit `post_composition` final Completeness on the native shadow path while preserving the initial `C0` Completeness report as the Supplemental Realization trigger.
  - Routed Authority Admission to consume the final `C2` Completeness report and aligned final Completeness source identity with the authoritative pipeline source identity.
  - Representative benchmark evidence now shows `OBS-A-002` admitted, `OBS-E-001` admitted with observations, and `OBS-H-002` still deferred for genuine recoverable omission, with deterministic rerun stability across all three cases.

## 2026-08-08 - OBS-V3-STAB-02 Admission Lifecycle Diagnosis and Final-Candidate Completeness Decision

- Phase: AUDIT
- Touched boundaries:
  - `src/cognition/observation-v3/completeness-analysis/`
  - `src/cognition/observation-v3/stabilization/`
  - `src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts`
  - `.validation/observation-v3/stabilization/stab-02/20260808T073544Z-obs-v3-stab-02/`
  - `docs/v2-build/observation/Observation-V3-Admission-Lifecycle-Diagnosis-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-Final-Candidate-Completeness-Lifecycle-Decision.md`
  - `docs/v2-build/observation/Observation-V3-Universal-Deferral-Root-Cause-Matrix.md`
  - `docs/v2-build/observation/Observation-V3-Remaining-Issue-Register.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - focused tests:
    - `npx.cmd vitest run src/cognition/observation-v3/stabilization/__tests__/stab-02-admission-lifecycle-diagnosis.test.ts src/cognition/observation-v3/completeness-analysis/__tests__/completeness-analysis.test.ts src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts` -> pass
  - repository verification:
    - `npm.cmd run typecheck` -> pass
    - `npm.cmd run lint` -> pass with `3` pre-existing unrelated warnings in `src/cognition/latent-v2/opportunity-constructor/provenance.ts` and `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
    - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-08T07-36-02-890Z.log`
  - corpus diagnosis:
    - `npx.cmd tsx --eval "<createObservationV3Stab02Diagnosis>"` -> completed with artifact root `.validation/observation-v3/stabilization/stab-02/20260808T073544Z-obs-v3-stab-02/`
- Notes:
  - Diagnosed that the active native shadow path reuses `C0` Completeness for Admission and therefore lacks a constitutionally sufficient final-candidate Completeness lifecycle.
  - Proved that `post_composition` is the smallest correct final lifecycle model because Admission already binds Completeness identity to the composed-candidate hash.
  - Partitioned the `0/17` non-admission outcome into `12` genuine omissions, `2` stale deferrals, `2` overlap/uncertainty quality regressions, and `1` governance-only rejection path.
  - Exposed a second governance defect: Completeness source identity hashing is inconsistent with the authoritative pipeline source identity and must be repaired together with the lifecycle in `OBS-V3-STAB-03`.

## 2026-08-08 - OBS-V3-STAB-01 Observation V3 Stabilization Readiness Review and Ordered Completion Program

- Phase: AUDIT
- Touched boundaries:
  - `docs/v2-build/observation/Observation-V3-Stabilization-Readiness-Review-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-Ordered-Completion-Program.md`
  - `docs/v2-build/observation/Observation-V3-Remaining-Issue-Register.md`
  - `docs/v2-build/observation/Observation-V3-Constitutional-Closure-Criteria.md`
  - `docs/v2-build/observation/Observation-V3-Runtime-Cutover-Prerequisites.md`
  - `docs/v2-build/observation/Observation-V3-Architecture.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - required evidence review against:
    - `docs/v2-build/observation/Observation-V3-Constitutional-Architecture-Review-2026-08.md`
    - `docs/v2-build/observation/Observation-V3-Architectural-Improvement-Catalog.md`
    - `docs/v2-build/observation/Observation-V3-Technical-Debt-Register.md`
    - `docs/v2-build/observation/Observation-V3-Constitutional-Hardening-Report-2026-08.md`
    - `docs/v2-build/observation/Observation-V3-Full-Benchmark-Baseline-2026-08.md`
    - `docs/v2-build/observation/Observation-V3-End-to-End-Semantic-Validation-2026-08.md`
    - `docs/v2-build/observation/Observation-V3-V2-Comparison-Report-2026-08.md`
    - `docs/v2-build/observation/Observation-V3-Production-Candidacy-Assessment.md`
    - `docs/v2-build/observation/Observation-V3-Authority-Admission-Contract.md`
    - `docs/v2-build/observation/Observation-V3-Authority-Admission-Policy-Calibration.md`
    - `docs/v2-build/observation/Observation-V3-Authority-Admission-Shadow-Stability-Review-2026-08.md`
    - `docs/v2-build/observation/Observation-V3-Completeness-Rule-Calibration.md`
    - `docs/v2-build/observation/Observation-V3-Completeness-Stability-Review-2026-08.md`
    - `docs/v2-build/observation/Observation-V3-Supplemental-Realization-Shadow-Implementation.md`
    - `docs/v2-build/observation/Observation-V3-Supplemental-Realization-Equivalence-Report-2026-08.md`
    - `docs/v2-build/observation/Observation-V3-Memory-Composition-Contract.md`
    - `docs/v2-build/observation/Observation-V3-Memory-Realization-Contract.md`
    - `docs/v2-build/observation/Observation-V3-Corpus-Replay.md`
    - `docs/v2-build/observation/Observation-V3-Native-Replay-Validation-Report-2026-08.md`
  - implementation scout against:
    - `src/cognition/observation-v3/pipeline/pipeline-runner.ts`
    - `src/cognition/observation-v3/pipeline/pipeline-summary.ts`
    - `src/cognition/observation-v3/pipeline/shadow-pipeline.ts`
    - `src/cognition/observation-v3/completeness-analysis/completeness-analyzer.ts`
    - `src/cognition/observation-v3/authority-admission/admission-evaluator.ts`
    - `src/cognition/observation-v3/authority-admission/admission-policy.ts`
    - `src/domain/observation/README.md`
    - `src/domain/observation/contracts.ts`
  - no runtime code changes, tests, or build run; scope was assessment, issue registration, and program authoring
- Notes:
  - Concluded that the highest-confidence remaining closure blocker is the absence of a final-candidate completeness lifecycle between Supplemental Realization and Authority Admission on the active native shadow path.
  - Distinguished constitutional closure from runtime cutover and authored explicit closure criteria plus separate runtime prerequisites.
  - Established the ordered stabilization sequence around lifecycle diagnosis first, then semantic repair, then admission recalibration, then baseline refresh, then closure review, then runtime readiness.

## 2026-08-03 - OBS-V3-VAL-01 Full Native Benchmark Baseline and End-to-End Semantic Validation

- Phase: VALIDATION
- Touched boundaries:
  - `src/cognition/observation-v3/validation/`
  - `scripts/run-observation-v3-full-benchmark-baseline.ts`
  - `.validation/observation-v3/full-benchmark-baseline/20260803T081500Z-obs-v3-full-benchmark-baseline/`
  - `docs/v2-build/observation/Observation-V3-Full-Benchmark-Baseline-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-End-to-End-Semantic-Validation-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-V2-Comparison-Report-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-Production-Candidacy-Assessment.md`
  - `docs/v2-build/observation/Observation-V3-Architecture.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - focused validation test:
    - `npx.cmd vitest run src/cognition/observation-v3/validation/__tests__/full-benchmark-baseline.test.ts` -> pass
  - benchmark execution:
    - `npx.cmd tsx scripts/run-observation-benchmark.ts --all` -> completed with fresh artifact root `20260802T220955Z-39b3730-all`, `15` successes and `2` failures (`OBS-C-002`, `OBS-H-002`)
    - `npx.cmd tsx scripts/run-observation-benchmark.ts --id OBS-C-002` -> completed with fresh artifact root `20260802T222720Z-39b3730-OBS-C-002`
    - `npx.cmd tsx scripts/run-observation-benchmark.ts --id OBS-H-002` -> completed with fresh artifact root `20260802T222720Z-39b3730-OBS-H-002`
    - `npx.cmd tsx scripts/run-observation-topology-experiment.ts --benchmark <17 ids> --configuration C_TARGETED_RECOVERY --repeat 1` -> completed with fresh artifact root `20260802T223051Z-39b3730-subset-17-C_TARGETED_RECOVERY-r1`, `16` successes and `1` failure (`OBS-H-002`)
  - native V3 baseline materialization:
    - `npx.cmd tsx scripts/run-observation-v3-full-benchmark-baseline.ts --validation-root .validation --baseline-id 20260803T081500Z-obs-v3-full-benchmark-baseline` -> pass, `17` of `17` cases fully replayable
  - determinism comparison:
    - compared `20260803T073327Z-obs-v3-full-benchmark-baseline` vs `20260803T081500Z-obs-v3-full-benchmark-baseline` -> `17/17` same provisional IDs, canonical IDs, canonical hashes, lineage classifications, and replay outcomes
  - repository verification:
    - `npm.cmd run typecheck` -> pass
    - `npm.cmd run lint` -> pass with `3` pre-existing unrelated warnings in `src/cognition/latent-v2/opportunity-constructor/provenance.ts` and `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
    - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-03T07-48-53-606Z.log`
- Notes:
  - Established the first complete native Observation V3 benchmark baseline with stage-complete artifacts for all 17 preserved benchmark cases.
  - Completed the first end-to-end semantic comparison against Observation V2 and found V3 better in 14 cases, equivalent in 1 case, and worse in 2 cases.
  - Concluded that V3 is suitable for expanded shadow but not yet suitable for limited production because zero benchmark cases were admitted and overlap-heavy edge cases remain governance-sensitive.

## 2026-08-02 - OBS-V3-ARCH-02 Native Provisional Candidate and Admission Boundary Constitutional Hardening

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/memory-composition/`
  - `src/cognition/observation-v3/memory-realization/`
  - `src/cognition/observation-v3/authority-admission/`
  - `src/cognition/observation-v3/pipeline/`
  - `docs/v2-build/observation/Observation-V3-Native-Provisional-Memory-Candidate.md`
  - `docs/v2-build/observation/Observation-V3-Canonical-Admission-Boundary.md`
  - `docs/v2-build/observation/Observation-V3-Constitutional-Hardening-Report-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-Architecture.md`
  - `docs/v2-build/observation/Observation-V3-Memory-Composition-Contract.md`
  - `docs/v2-build/observation/Observation-V3-Memory-Realization-Contract.md`
  - `docs/v2-build/observation/Observation-V3-Authority-Admission-Contract.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - focused subsystem suites:
    - `npx.cmd vitest run src/cognition/observation-v3/memory-composition/__tests__/memory-composition.test.ts` -> pass
    - `npx.cmd vitest run src/cognition/observation-v3/memory-realization/__tests__/memory-realization.test.ts` -> pass
    - `npx.cmd vitest run src/cognition/observation-v3/authority-admission/__tests__/admission-evaluator.test.ts src/cognition/observation-v3/authority-admission/__tests__/shadow-authority-admission.test.ts` -> pass
  - pipeline and replay suites:
    - `npx.cmd vitest run src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts` -> pass
    - `npx.cmd vitest run src/cognition/observation-v3/pipeline/replay/__tests__/pipeline-replay-runner.test.ts src/cognition/observation-v3/pipeline/replay/__tests__/preserved-case-loader.test.ts src/cognition/observation-v3/authority-admission/__tests__/calibration-review.test.ts src/cognition/observation/benchmark/__tests__/observation-benchmark-runner.test.ts src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts` -> pass
  - repository verification:
    - `npm.cmd run typecheck` -> pass
    - `npm.cmd run lint -- src/cognition/observation-v3 src/cognition/observation/benchmark src/cognition/observation` -> pass
    - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-02T20-22-13-846Z.log`
  - preserved corpus replay:
    - `npx.cmd tsx --eval "<runObservationV3CorpusReplay against OBSERVATION_BENCHMARK_CORPUS_V1_PATH and .validation>"` -> completed with summary `{ benchmarkCount: 17, executedCount: 5, classifications: { fully_replayable: 5, artifact_incomplete: 12 }, dispositions: { deferred_for_supplemental_realization: 4, rejected_governance_failure: 1, not_executed: 12 } }`
- Notes:
  - Introduced the native `ComposedProvisionalMemoryCandidate` as the V3-owned constitutional carrier between Memory Composition and Memory Realization.
  - Removed the preferred native-path dependence on `ObservationV2Bundle` as the provisional memory carrier while preserving explicit shadow compatibility and comparison seams.
  - Changed Authority Admission so the full `CanonicalMemoryCandidate` is the request-contract input.
  - Added `provisional-identity-transition.json`, `canonical-identity-transition.json`, `admission-identity-input-comparison.json`, and `native-identity-lineage-comparison.json` as hardening evidence artifacts.

## 2026-08-02 - OBS-V3-ARCH-01 Observation V3 Constitutional Architecture Review

- Phase: AUDIT
- Touched boundaries:
  - `docs/v2-build/observation/Observation-V3-Constitutional-Architecture-Review-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-Architectural-Improvement-Catalog.md`
  - `docs/v2-build/observation/Observation-V3-Technical-Debt-Register.md`
  - `docs/v2-build/observation/Observation-V3-Architecture.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - architectural consistency review against implemented subsystem seams in `src/cognition/observation-v3/`
  - subsystem contract review against:
    - `docs/v2-build/observation/Observation-V3-Architecture.md`
    - `docs/v2-build/observation/Observation-V3-Subsystem-Contracts.md`
    - `docs/v2-build/observation/Observation-V3-Dataflow.md`
    - `docs/v2-build/observation/Observation-V3-Replay-Ready-Artifact-Model.md`
    - `docs/v2-build/observation/Observation-V3-End-to-End-Replay-Completion.md`
  - dependency review across the active native shadow seams in:
    - `src/cognition/observation-v3/descriptive-extraction/`
    - `src/cognition/observation-v3/completeness-analysis/`
    - `src/cognition/observation-v3/supplemental-realization/`
    - `src/cognition/observation-v3/memory-composition/`
    - `src/cognition/observation-v3/memory-realization/`
    - `src/cognition/observation-v3/authority-admission/`
    - `src/cognition/observation-v3/pipeline/`
    - `src/cognition/observation-v3/pipeline/replay/`
  - documentation consistency review across the new review deliverables and the updated architecture document
  - no runtime tests or build run; ticket scope was architecture review and documentation only
- Notes:
  - Concluded that Observation V3 has the right overall decomposition direction, especially around deterministic governance, explicit admission, and replay-ready evidence retention.
  - Identified two pre-adoption constitutional blockers: V3 still uses `ObservationV2Bundle` as its effective internal provisional memory carrier, and Authority Admission currently evaluates a reduced native candidate summary instead of the full canonical realized candidate.
  - Standardized the reviewed architectural direction around the implemented stage names `Supplemental Realization` and `Memory Composition`, replacing the older `Recovery` and `Reconciliation` terminology as the preferred long-term description.

## 2026-08-02 - OBS-V3-E2E-03 Provider Evidence Retention

- Touched boundaries:
- `src/cognition/observation-v3/provider-evidence/`
- `src/cognition/observation-v3/descriptive-extraction/`
- `src/cognition/observation-v3/supplemental-realization/`
- `src/cognition/observation-v3/pipeline/replay/`
- `src/cognition/observation/llm-scene-observation-extractor.ts`
- `src/cognition/observation/benchmark/`
- `src/cognition/observation/experiment/configurations/`
- `docs/v2-build/observation/Observation-V3-Provider-Evidence-Retention.md`
- `docs/v2-build/observation/Observation-V3-Replay-Ready-Artifact-Model.md`
- `docs/v2-build/observation/Observation-V3-Provider-Evidence-Validation-Report-2026-08.md`

- Summary:
- Added a shared provider-evidence ownership module for canonical attempt evidence, stable identities, serialization, hashing, compatibility, and atomic receipts.
- Integrated descriptive provider evidence capture into the native extraction path without changing semantic extraction behavior.
- Integrated supplemental provider evidence capture per bounded target execution and persisted those artifacts through topology experiment writers.
- Extended replay loading so fresh canonical evidence artifacts are consumable while historical roots remain explicitly classifiable as non-replayable.

- Verification:
- `npx.cmd vitest run src/cognition/observation-v3/provider-evidence/__tests__/provider-evidence.test.ts` -> pass
- `npx.cmd vitest run src/cognition/observation-v3/descriptive-extraction/__tests__/descriptive-extraction.test.ts src/cognition/observation-v3/supplemental-realization/__tests__/supplemental-realization.test.ts src/cognition/observation-v3/memory-composition/__tests__/memory-composition.test.ts src/cognition/observation/benchmark/__tests__/observation-benchmark-runner.test.ts src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts src/cognition/observation-v3/pipeline/__tests__/pipeline-runner.test.ts src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts src/cognition/observation-v3/pipeline/replay/__tests__/preserved-case-loader.test.ts src/cognition/observation-v3/pipeline/replay/__tests__/pipeline-replay-runner.test.ts src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts` -> pass (`10` files, `81` tests)
- `npx.cmd tsc --noEmit` -> pass
- `npm.cmd run lint -- src/cognition/observation src/cognition/observation-v3` -> pass
- `npm.cmd run build` -> pass

- Validation note:
- Fresh August 2, 2026 benchmark and topology roots now preserve provider-boundary evidence. Fresh replay still terminates later at `failed_supplemental_realization`, so evidence retention is complete but end-to-end fresh replay remains partially blocked.

## 2026-08-02 - OBS-V3-E2E-02 Preserved Benchmark Matrix Loader and Full Native V3 Corpus Replay

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/pipeline/`
  - `src/cognition/observation-v3/pipeline/replay/`
  - `docs/v2-build/observation/Observation-V3-Corpus-Replay.md`
  - `docs/v2-build/observation/Observation-V3-Corpus-Replay-Validation-Report-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-End-to-End-Shadow-Pipeline.md`
  - `docs/v2-build/observation/Observation-V3-Architecture.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - focused replay and pipeline tests:
    - `npx.cmd vitest run src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts src/cognition/observation-v3/pipeline/replay/__tests__/pipeline-replay-runner.test.ts` -> pass (`2` files, `6` tests)
  - `npx.cmd tsc --noEmit` -> pass
  - `npm.cmd run lint -- src/cognition/observation-v3/pipeline src/cognition/observation-v3/pipeline/replay` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-02T14-59-46-708Z.log`
  - repository corpus replay:
    - `npx.cmd tsx --eval "<runObservationV3CorpusReplay against OBSERVATION_BENCHMARK_CORPUS_V1_PATH and .validation>"` -> completed, summary `{ benchmarkCount: 17, executionCount: 0, classifications: { artifact_incomplete: 8, unsupported: 9 }, failures: { missing_replay_evidence: 8, missing_lineage: 9 } }`
- Notes:
  - Added a new preserved benchmark replay layer that discovers validation roots, builds deterministic replay packages, verifies lineage compatibility, fingerprints orchestration-only replay logic, and invokes the native V3 shadow pipeline only when provider-boundary replay evidence exists.
  - Tightened the replay seam so Descriptive Extraction and Supplemental Realization now consume preserved provider-response objects rather than downstream reconstructed payloads, and missing supplemental replay is now an explicit failure instead of a silent empty fallback.
  - Real repository replay on Sunday, August 2, 2026 proved the orchestration and classification layer but also exposed the current preservation ceiling: none of the 17 corpus entries can execute end-to-end because the preserved July-August roots do not retain provider-boundary generative evidence.

## 2026-08-02 - OBS-V3-E2E-01 Native Observation V3 End-to-End Shadow Pipeline

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/pipeline/`
  - `docs/v2-build/observation/Observation-V3-End-to-End-Shadow-Pipeline.md`
  - `docs/v2-build/observation/Observation-V3-End-to-End-Validation-Report-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-Architecture.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - focused pipeline tests:
    - `npx.cmd vitest run src/cognition/observation-v3/pipeline/__tests__/pipeline-runner.test.ts src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts` -> pass (`2` files, `5` tests)
  - `npx.cmd tsc --noEmit` -> pass
  - `npm.cmd run lint -- src/cognition/observation-v3/pipeline src/cognition/observation-v3/source-analysis src/cognition/observation-v3/descriptive-extraction src/cognition/observation-v3/completeness-analysis src/cognition/observation-v3/supplemental-realization src/cognition/observation-v3/memory-composition src/cognition/observation-v3/memory-realization src/cognition/observation-v3/authority-admission` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-02T14-33-12-404Z.log`
- Notes:
  - Implemented the first native Observation V3 pipeline core as a separate orchestration boundary that owns stage order, skip logic, failure propagation, pipeline fingerprinting, and orchestration artifact packaging without changing active Observation V2 routing or authority.
  - Added a preserved replay primary runner that injects generative evidence only at the Descriptive Extraction and Supplemental Realization provider seams while keeping Source Analysis, Completeness Analysis, Memory Composition, Memory Realization, and Authority Admission native and deterministic.
  - Recorded the present limitation explicitly: the end-to-end spine exists and is verified by focused tests, but a full preserved benchmark matrix replay harness over repository-preserved cases remains the recommended next ticket because older preserved roots do not consistently retain raw structured extraction payloads.

## 2026-08-02 - OBS-V3-04C Native Memory Composition Engine

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/memory-composition/`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - focused native-engine and regression tests:
    - `npx.cmd vitest run src/cognition/observation-v3/memory-composition/__tests__/memory-composition.test.ts src/cognition/observation/benchmark/__tests__/targeted-recovery-refinement.test.ts src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts src/cognition/observation/benchmark/__tests__/observation-benchmark-artifact-writer.test.ts src/cognition/observation/benchmark/__tests__/observation-expanded-targeted-recovery-baseline.test.ts` -> pass (`5` files, `46` tests)
  - preserved artifact replay:
    - `npx.cmd tsx --eval "<preserved topology replay against .validation/observation-topology-experiments/runs>"` -> completed, `36` preserved targeted-recovery artifact directories compared, all classified `equivalent_with_representation_difference`
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass with `3` pre-existing unrelated warnings in latent V2/runtime files
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-02T12-30-35-004Z.log`
- Notes:
  - Replaced the V3 Memory Composition subsystem’s internal delegation to `reconcileTargetedRecoveryCandidate` with a native deterministic stage pipeline covering normalization, duplicate/coexistence analysis, locality composition, chronology ordering, and coverage derivation.
  - Added stage-level exports and audit artifacts including `duplicate-decisions`, `coexistence-analysis`, `locality-decisions`, `transition-decisions`, `provenance-map`, and `composition-trace` while preserving the public `composeMemoryPackages` boundary introduced in `OBS-V3-04B`.
  - Preserved July-August targeted-recovery replay remained within the accepted equivalence envelope: no `composition_stricter`, `composition_more_permissive`, or `semantically_incomparable` results appeared.

## 2026-08-02 - OBS-V3-04B Memory Composition Shadow Implementation and Experimental Reconciliation Equivalence

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/memory-composition/`
  - `src/cognition/observation/experiment/configurations/targeted-recovery.ts`
  - `src/cognition/observation/benchmark/observation-topology-experiment-fingerprint.ts`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - focused Memory Composition and targeted-recovery tests:
    - `npx.cmd vitest run src/cognition/observation-v3/memory-composition/__tests__/memory-composition.test.ts src/cognition/observation/benchmark/__tests__/targeted-recovery-refinement.test.ts src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts src/cognition/observation/benchmark/__tests__/observation-benchmark-artifact-writer.test.ts src/cognition/observation/benchmark/__tests__/observation-expanded-targeted-recovery-baseline.test.ts` -> pass (`5` files, `42` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass with `3` pre-existing unrelated warnings in latent V2/runtime files
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-02T11-05-33-213Z.log`
- Notes:
  - Introduced a live V3 shadow Memory Composition subsystem with a pure composition API, deterministic fingerprinting, composition artifact packaging, and a comparison-grade equivalence classifier for experimental reconciliation outputs.
  - Switched the targeted-recovery experimental seam to call V3 Memory Composition and emit composition artifacts such as `composition-inputs`, `duplicate-analysis`, `locality-composition`, `chronology-composition`, `transition-composition`, `provenance-composition`, and `composition-summary` while preserving the existing benchmark-facing reconciliation result shape.
  - Extended topology fingerprint capture so targeted-recovery implementation fingerprints now include the V3 Memory Composition files, keeping preserved experiment evidence sensitive to subsystem changes without altering active V2 Observation behavior.

## 2026-08-02 - OBS-V3-03A Descriptive Extraction Structural Extraction Refactor

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/descriptive-extraction/`
  - `src/cognition/observation/llm-scene-observation-extractor.ts`
  - `src/cognition/observation/benchmark/observation-benchmark-fingerprint.ts`
  - `docs/v2-build/observation/Observation-V3-Descriptive-Extraction.md`
  - `docs/v2-build/observation/Observation-V3-Descriptive-Extraction-Structural-Refactor.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - focused extraction tests:
    - `npx.cmd vitest run src/cognition/observation-v3/descriptive-extraction/__tests__/descriptive-extraction.test.ts src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts src/cognition/observation/__tests__/llm-scene-observation-diagnostics.test.ts src/cognition/observation/__tests__/observation-extraction-validation.test.ts` -> pass (`4` files, `34` tests)
  - benchmark runner and regression tests:
    - `npx.cmd vitest run src/cognition/observation/benchmark/__tests__/observation-benchmark-runner.test.ts src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts` -> pass (`2` files, `25` tests)
    - benchmark runner coverage includes:
      - one successful benchmark path via `runs the isolated extractor and derived constructor for a selected benchmark`
      - one retry-success benchmark path via `continues through all benchmarks when one extraction fails` where the second benchmark succeeds with `accepted_after_attempt_2`
      - one failed benchmark path via the same regression and the explicit configuration-failure case
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint -- src/cognition/observation/llm-scene-observation-extractor.ts src/cognition/observation-v3/descriptive-extraction src/cognition/observation/benchmark/observation-benchmark-fingerprint.ts` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-02T10-52-27-357Z.log`
- Notes:
  - Extracted first-pass descriptive realization into a new live V3 subsystem that now owns prompt execution, schema application, provider interaction, structured parsing, normalization, and provisional candidate construction.
  - Preserved the active V2 orchestration boundary in `llm-scene-observation-extractor.ts`, which still owns Source Analysis shadow invocation, Completeness Analysis shadow invocation, existing guard interpretation, retry sequencing, fallback mapping, and attempt-evidence emission.
  - Updated benchmark fingerprint capture so prompt/schema/model/timeout evidence now points to the extracted V3 descriptive-extraction subsystem while retry-policy evidence remains attached to the orchestration seam.

## 2026-08-02 - OBS-V3-04A Memory Composition Responsibility Scout and Constitutional Contract

- Phase: BUILD
- Touched boundaries:
  - `docs/v2-build/observation/Observation-V3-Memory-Composition-Responsibility-Scout.md`
  - `docs/v2-build/observation/Observation-V3-Memory-Composition-Contract.md`
  - `docs/v2-build/observation/Observation-V3-Memory-Composition-V2-Equivalence-Plan.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - documentation consistency review against:
    - `docs/v2-build/observation/Observation-V3-Architecture.md`
    - `docs/v2-build/observation/Observation-V3-Subsystem-Contracts.md`
    - `docs/v2-build/observation/Observation-V3-Dataflow.md`
    - `docs/v2-build/observation/Observation-V3-Memory-Construction-Philosophy.md`
    - `docs/v2-build/observation/Observation-V3-Supplemental-Realization-Contract.md`
    - `docs/v2-build/observation/Observation-V3-Authority-Admission-Contract.md`
    - `docs/v2-build/observation/Observation-Architectural-Responsibility-Map.md`
    - `docs/v2-build/observation/Observation-Ideal-Subsystem-Boundaries.md`
    - `docs/v2-build/validation-benchmark/Observation-Targeted-Recovery-Refinement-Guide-v1.md`
    - `docs/v2-build/validation-benchmark/Observation-Targeted-Recovery-Reconciliation-Repair-Guide-v1.md`
    - `docs/v2-build/validation-benchmark/Observation-Candidate-Topology-Experiment-Guide-v1.md`
    - `docs/v2-build/validation-benchmark/Observation-Expanded-Targeted-Recovery-Experimental-Baseline-Report-2026-07.md`
    - repository seams in `src/cognition/observation/experiment/configurations/targeted-recovery.ts`, `src/cognition/observation/experiment/targeted-recovery-refinement.ts`, `src/cognition/observation/benchmark/observation-topology-experiment-runner.ts`, and `src/cognition/observation/benchmark/observation-topology-experiment-types.ts`
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint -- src/cognition/observation/experiment src/cognition/observation/benchmark src/cognition/observation-v3` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-02T10-13-08-842Z.log`
- Notes:
  - Defined Memory Composition as the constitutional subsystem that composes baseline and supplemental provisional realization packages into one coherent provisional memory candidate without performing realization, canonicalization, authority admission, or persistence.
  - Mapped the current experimental `reconciliation` seam into its proper V3 ownership boundaries, separating package creation from composition and separating composition from later Memory Realization and Authority Admission.
  - Established a future shadow-equivalence seam that compares V3 composition against current experimental reconciliation behavior while preserving provisionality, provenance lineage, and complete V2 behavioral invariance.

## 2026-08-02 - OBS-V3-03A Supplemental Realization Responsibility Scout and Contract Design

- Phase: BUILD
- Touched boundaries:
  - `docs/v2-build/observation/Observation-V3-Supplemental-Realization-Responsibility-Scout.md`
  - `docs/v2-build/observation/Observation-V3-Supplemental-Realization-Contract.md`
  - `docs/v2-build/observation/Observation-V3-Supplemental-Realization-V2-Equivalence-Plan.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - documentation consistency review against:
    - `docs/v2-build/observation/Observation-V3-Architecture.md`
    - `docs/v2-build/observation/Observation-V3-Subsystem-Contracts.md`
    - `docs/v2-build/observation/Observation-V3-Dataflow.md`
    - `docs/v2-build/observation/Observation-V3-Memory-Construction-Philosophy.md`
    - `docs/v2-build/observation/Observation-V3-Completeness-Analysis-Contract.md`
    - `docs/v2-build/observation/Observation-V3-Authority-Admission-Contract.md`
    - `docs/v2-build/validation-benchmark/Observation-Targeted-Recovery-Refinement-Guide-v1.md`
    - `docs/v2-build/validation-benchmark/Observation-Targeted-Recovery-Reconciliation-Repair-Guide-v1.md`
    - `docs/v2-build/validation-benchmark/Observation-Candidate-Topology-Experiment-Guide-v1.md`
    - `docs/v2-build/validation-benchmark/Observation-Expanded-Targeted-Recovery-Experimental-Baseline-Report-2026-07.md`
    - repository seams in `src/cognition/observation/llm-scene-observation-extractor.ts`, `src/cognition/observation/experiment/configurations/targeted-recovery.ts`, `src/cognition/observation/experiment/targeted-recovery-refinement.ts`, and `src/cognition/observation/benchmark/observation-topology-experiment-runner.ts`
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint -- src/cognition/observation-v3/authority-admission src/cognition/observation-v3/completeness-analysis src/cognition/observation-v3/source-analysis` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-02T10-00-54-911Z.log`
- Notes:
  - Defined Supplemental Realization as the bounded continuation of descriptive memory construction after Completeness demonstrates material under-realization and before Memory Composition or Authority Admission.
  - Separated current experimental targeted-recovery responsibilities into their proper V3 owners: Completeness for measurement and justification, Supplemental Realization for bounded additional realization, Memory Composition for duplicate and locality merge policy, and benchmark infrastructure for blind-review and comparison packaging.
  - Established a future shadow-equivalence seam that preserves provisionality, prohibits authority leakage, and compares V3 bounded realization packages against the current benchmark-only targeted-recovery prototype rather than against V2 production persistence.

## 2026-08-02 - OBS-V3-06D Authority Admission Shadow Stability Review

- Phase: BUILD
- Touched boundaries:
  - `docs/v2-build/observation/Observation-V3-Authority-Admission-Shadow-Stability-Review-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-Authority-Admission-Shadow-Implementation.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - `npx.cmd vitest run src/cognition/observation-v3/authority-admission/__tests__/admission-evaluator.test.ts src/cognition/observation-v3/authority-admission/__tests__/shadow-authority-admission.test.ts src/cognition/observation-v3/authority-admission/__tests__/calibration-review.test.ts` -> pass (`3` files, `34` tests)
  - preserved evidence review against:
    - `.validation/observation-v3/authority-admission-shadow/20260802T091000Z-obs-v3-authority-admission-shadow/`
    - `.validation/observation-v3/authority-admission-calibration/20260802T112200Z-obs-v3-authority-admission-calibration/`
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint -- src/cognition/observation-v3/authority-admission scripts/run-observation-v3-authority-admission-calibration.ts scripts/run-observation-v3-authority-admission-shadow.ts` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-02T09-47-03-729Z.log`
- Notes:
  - Confirmed that the calibrated `shadow-v2` admission evaluator is deterministic, replay-stable, policy-consistent, governance-consistent, and evidence-independent on the preserved benchmark roots.
  - Found no benchmark-ID, V2-outcome, or reviewer-label dependency in the evaluator, and no contradictory or unstable branches requiring policy repair.
  - Recorded only non-blocking documentation clarifications: two reserved policy fields and one reserved reason code are currently present in the policy or contract shape but not used as active evaluator branches.

## 2026-08-02 - OBS-V3-06C Authority Admission Shadow Validation and Policy Calibration

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/authority-admission/`
  - `scripts/run-observation-v3-authority-admission-calibration.ts`
  - `docs/v2-build/observation/Observation-V3-Authority-Admission-Shadow-Validation-Plan.md`
  - `docs/v2-build/observation/Observation-V3-Authority-Admission-Policy-Calibration.md`
  - `docs/v2-build/observation/Observation-V3-Authority-Admission-Shadow-Validation-Report-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-Authority-Admission-Shadow-Implementation.md`
  - `docs/v2-build/observation/Observation-V3-Authority-Admission-Shadow-Equivalence-Plan.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - `npx.cmd vitest run src/cognition/observation-v3/authority-admission/__tests__/admission-evaluator.test.ts src/cognition/observation-v3/authority-admission/__tests__/shadow-authority-admission.test.ts src/cognition/observation-v3/authority-admission/__tests__/calibration-review.test.ts` -> pass (`3` files, `34` tests)
  - `npx.cmd tsx scripts/run-observation-v3-authority-admission-calibration.ts --shadow-review-root .validation/observation-v3/authority-admission-shadow/20260802T091000Z-obs-v3-authority-admission-shadow --calibration-id 20260802T112200Z-obs-v3-authority-admission-calibration` -> completed, calibration root `.validation/observation-v3/authority-admission-calibration/20260802T112200Z-obs-v3-authority-admission-calibration`
  - `npx.cmd vitest run src/cognition/observation-v3/completeness-analysis/__tests__/completeness-analysis.test.ts src/cognition/observation-v3/completeness-analysis/__tests__/completeness-calibration.test.ts src/cognition/observation-v3/completeness-analysis/__tests__/stability-review.test.ts` -> pass (`3` files, `29` tests)
  - `npx.cmd vitest run src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts src/cognition/observation/__tests__/observation-extraction-validation.test.ts src/cognition/observation/benchmark/__tests__/observation-benchmark-artifact-writer.test.ts src/cognition/observation/benchmark/__tests__/observation-benchmark-runner.test.ts` -> pass (`4` files, `46` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint -- src/cognition/observation-v3/authority-admission scripts/run-observation-v3-authority-admission-calibration.ts scripts/run-observation-v3-authority-admission-shadow.ts` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-02T09-22-10-175Z.log`
- Notes:
  - Added a preserved-evidence calibration harness that replays frozen `shadow-v1`, evaluates a calibrated `shadow-v2` policy, emits semantic-review and pre/post comparison artifacts, and remains fully side-effect-free.
  - Preserved severe-failure blocking while correcting the one preserved false deferral by escalating uncovered prefix loss to candidate rejection instead of supplemental-realization deferral.
  - Added an admission-level materiality classifier so future source-shape-sensitive recoverable weakness can remain non-blocking when preserved evidence does not show material omission, without weakening provenance, evidence integrity, or realization fail-closed behavior.

## 2026-08-02 - OBS-V3-06B Authority Admission Shadow Implementation and V2 Authority Equivalence

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/authority-admission/`
  - `scripts/run-observation-v3-authority-admission-shadow.ts`
  - `docs/v2-build/observation/Observation-V3-Authority-Admission-Shadow-Implementation.md`
  - `docs/v2-build/observation/Observation-V3-Authority-Admission-Equivalence-Report-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-Authority-Admission-Shadow-Equivalence-Plan.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - `npx.cmd vitest run src/cognition/observation-v3/authority-admission/__tests__/admission-evaluator.test.ts src/cognition/observation-v3/authority-admission/__tests__/shadow-authority-admission.test.ts` -> pass (`2` files, `29` tests)
  - `npx.cmd tsx scripts/run-observation-v3-authority-admission-shadow.ts --calibration-root .validation/observation-v3/completeness-calibration/20260801T100214Z-obs-v3-completeness-calibration --review-id 20260802T091000Z-obs-v3-authority-admission-shadow` -> completed, review root `.validation/observation-v3/authority-admission-shadow/20260802T091000Z-obs-v3-authority-admission-shadow`
  - `npx.cmd vitest run src/cognition/observation-v3/completeness-analysis/__tests__/completeness-analysis.test.ts src/cognition/observation-v3/completeness-analysis/__tests__/completeness-calibration.test.ts src/cognition/observation-v3/completeness-analysis/__tests__/stability-review.test.ts` -> pass (`3` files, `29` tests)
  - `npx.cmd vitest run src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts src/cognition/observation/__tests__/observation-extraction-validation.test.ts src/cognition/observation/benchmark/__tests__/observation-benchmark-artifact-writer.test.ts src/cognition/observation/benchmark/__tests__/observation-benchmark-runner.test.ts` -> pass (`4` files, `46` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint -- src/cognition/observation-v3/authority-admission scripts/run-observation-v3-authority-admission-shadow.ts` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-02T07-12-59-535Z.log`
- Notes:
  - Implemented a deterministic, side-effect-free authority-admission shadow evaluator with structured findings, policy fingerprinting, deterministic shadow authority identities, and V2-equivalence comparison.
  - Chose a preserved-artifact benchmark seam rather than live runtime interception so accepted and rejected parseable candidates could be reviewed without altering active Observation behavior.
  - The initial `shadow-v1` policy proved replay-stable but remains intentionally conservative, producing broad recovery deferral rather than authority admission across most preserved accepted V2 candidates.

## 2026-08-02 - OBS-V3-06A Authority Admission Contract Design

- Phase: BUILD
- Touched boundaries:
  - `docs/v2-build/observation/Observation-V3-Authority-Admission-Responsibility-Scout.md`
  - `docs/v2-build/observation/Observation-V3-Authority-Admission-Contract.md`
  - `docs/v2-build/observation/Observation-V3-Authority-Admission-Shadow-Equivalence-Plan.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - documentation consistency review against:
    - `docs/v2-build/observation/Observation-V3-Architecture.md`
    - `docs/v2-build/observation/Observation-V3-Subsystem-Contracts.md`
    - `docs/v2-build/observation/Observation-V3-Dataflow.md`
    - `docs/v2-build/observation/Observation-V3-Memory-Construction-Philosophy.md`
    - `docs/v2-build/observation/Observation-V3-Core-Concepts.md`
    - `docs/v2-build/observation/Observation-V3-Completeness-Analysis-Contract.md`
    - `docs/v2-build/observation/Observation-V3-Completeness-Admission-Relevance-Assessment.md`
    - `docs/v2-build/observation/Observation-V3-Completeness-Stability-Review-2026-08.md`
    - current V2 authority path in `app/capture/page.tsx`, `src/cognition/observation/llm-scene-observation-extractor.ts`, and `src/infrastructure/persistence/observation-v2-write-store.ts`
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-02T06-43-30-231Z.log`
- Notes:
  - Authored the proposal-stage V3 Authority Admission responsibility scout, contract, and shadow-equivalence plan without introducing any runtime admission behavior.
  - Defined a deterministic admission vocabulary that separates canonical descriptive candidates from authoritative Memory Truth and explicitly decouples authority from persistence.
  - Recorded the major V2 migration hazard that persisted V2 bundles currently imply practical authority while several downstream readers can still blur missing V3 authority through legacy fallback.

## 2026-08-02 - OBS-V3-02D Completeness Stability and Admission-Relevance Review

- Phase: BUILD
- Touched boundaries:
  - `scripts/run-observation-v3-completeness-stability-review.ts`
  - `src/cognition/observation-v3/completeness-analysis/stability-review.ts`
  - `src/cognition/observation-v3/completeness-analysis/__tests__/stability-review.test.ts`
  - `docs/v2-build/observation/Observation-V3-Completeness-Stability-Review-Plan.md`
  - `docs/v2-build/observation/Observation-V3-Completeness-Admission-Relevance-Assessment.md`
  - `docs/v2-build/observation/Observation-V3-Completeness-Stability-Review-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-Completeness-Analysis-Shadow-Implementation.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - `npx.cmd vitest run src/cognition/observation-v3/completeness-analysis/__tests__/stability-review.test.ts` -> pass (`1` file, `5` tests)
  - `npx.cmd vitest run src/cognition/observation-v3/completeness-analysis/__tests__/completeness-analysis.test.ts src/cognition/observation-v3/completeness-analysis/__tests__/completeness-calibration.test.ts src/cognition/observation-v3/completeness-analysis/__tests__/stability-review.test.ts` -> pass (`3` files, `29` tests)
  - `npx.cmd vitest run src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts src/cognition/observation/__tests__/observation-extraction-validation.test.ts src/cognition/observation/benchmark/__tests__/observation-benchmark-artifact-writer.test.ts` -> pass (`3` files, `29` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint -- src/cognition/observation-v3/completeness-analysis/stability-review.ts src/cognition/observation-v3/completeness-analysis/__tests__/stability-review.test.ts scripts/run-observation-v3-completeness-stability-review.ts` -> pass
  - `npx.cmd tsx scripts/run-observation-v3-completeness-stability-review.ts --calibration-root .validation/observation-v3/completeness-calibration/20260801T100214Z-obs-v3-completeness-calibration --review-id 20260802T062612Z-obs-v3-completeness-stability-review` -> completed, review root `.validation/observation-v3/completeness-stability/20260802T062612Z-obs-v3-completeness-stability-review`
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-02T06-28-49-311Z.log`
- Notes:
  - Added a deterministic review harness that replays preserved completeness candidates, aggregates cross-run/source-shape stability, classifies governance roles for completeness signals, and emits the full Phase A-H artifact set without invoking recovery or admission behavior.
  - Confirmed deterministic replay equality across `90` calibrated analyzer replays over the preserved `30` candidates while preserving the V2-active runtime boundary.
  - Recorded the current governance position as `STABLE WITH SOURCE-SHAPE OBSERVATIONS` and `READY WITH GOVERNANCE LIMITATIONS`, with Authority Admission contract design now the recommended next ticket and no contract change required in the completeness analyzer itself.

## 2026-07-31 - EXP-05C Expanded Targeted Recovery Experimental Baseline

- Phase: BUILD
- Touched boundaries:
  - `package.json`
  - `scripts/run-observation-expanded-targeted-recovery-baseline.ts`
  - `src/cognition/observation/benchmark/observation-expanded-targeted-recovery-baseline.ts`
  - `src/cognition/observation/benchmark/__tests__/observation-expanded-targeted-recovery-baseline.test.ts`
  - `docs/v2-build/validation-benchmark/Observation-Candidate-Topology-Experiment-Guide-v1.md`
  - `docs/v2-build/validation-benchmark/Observation-Targeted-Recovery-Refinement-Guide-v1.md`
  - `docs/v2-build/validation-benchmark/Observation-Targeted-Recovery-Reconciliation-Repair-Guide-v1.md`
  - `docs/v2-build/validation-benchmark/Observation-Expanded-Targeted-Recovery-Sample-Plan-v1.md`
  - `docs/v2-build/validation-benchmark/Observation-Expanded-Targeted-Recovery-Experimental-Baseline-Guide-v1.md`
  - `docs/v2-build/validation-benchmark/Observation-Expanded-Targeted-Recovery-Experimental-Baseline-Report-2026-07.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - `npx.cmd vitest run src/cognition/observation/benchmark/__tests__/observation-expanded-targeted-recovery-baseline.test.ts` -> pass (`1` file, `10` tests)
  - `npx.cmd vitest run src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts src/cognition/observation/benchmark/__tests__/observation-expanded-targeted-recovery-baseline.test.ts src/cognition/observation/benchmark/__tests__/observation-topology-blind-review-set.test.ts src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts src/cognition/observation/benchmark/__tests__/targeted-recovery-refinement.test.ts` -> pass (`5` files, `54` tests)
  - `npx.cmd tsc --noEmit` -> pass
  - `npm.cmd run lint -- src/cognition/observation/benchmark/observation-expanded-targeted-recovery-baseline.ts src/cognition/observation/benchmark/__tests__/observation-expanded-targeted-recovery-baseline.test.ts scripts/run-observation-expanded-targeted-recovery-baseline.ts` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-31T08-36-40-215Z.log`
  - `npx.cmd tsx scripts/run-observation-expanded-targeted-recovery-baseline.ts` -> completed, run group `20260731T072311Z-39b3730-subset-9-A-vs-C-r3`, baseline run `20260731T072311Z-39b3730-subset-9-A_CURRENT_BASELINE-r3`, repaired-C run `20260731T075248Z-39b3730-subset-9-C_TARGETED_RECOVERY-r3`, review set `20260731T082753Z-reviewset-expanded-targeted-recovery-baseline`
  - `npx.cmd tsx scripts/run-observation-expanded-targeted-recovery-baseline.ts --refresh .validation/observation-topology-experiments/expanded-baseline/20260731T072311Z-39b3730-subset-9-A-vs-C-r3 .validation/observation-topology-experiments/runs/20260731T072311Z-39b3730-subset-9-A_CURRENT_BASELINE-r3 20260731T072311Z-39b3730-subset-9-A_CURRENT_BASELINE-r3 .validation/observation-topology-experiments/runs/20260731T075248Z-39b3730-subset-9-C_TARGETED_RECOVERY-r3 20260731T075248Z-39b3730-subset-9-C_TARGETED_RECOVERY-r3 .validation/observation-topology-experiments/review-sets/20260731T082753Z-reviewset-expanded-targeted-recovery-baseline` -> completed, corrected run-group aggregation without rerunning model experiments
- Notes:
  - Added a stratified expanded-baseline harness that selects a bounded `9`-item benchmark sample, schedules an `A` versus repaired-`C` three-run matrix, preserves all scheduled runs, and emits repeated-run stability, recovery-discipline, cost-latency, and discrepancy-ledger artifacts under `.validation/observation-topology-experiments/expanded-baseline/`.
  - Preserved identity-safe cross-run review packaging with opaque candidate references and separate private mapping, and extended tests to guard against configuration, path, and run-number leakage.
  - Corrected expanded-baseline cost aggregation so baseline operational summaries derive model-call counts from preserved retry-or-attempt evidence when the baseline configuration emits no stage artifacts.
  - The expanded sample showed repaired `C_TARGETED_RECOVERY` as a consistent advantage on `OBS-C-002` and `OBS-H-002`, neutrality on the short controls, and mixed or run-dependent behavior on the remaining broader sample, leaving stability investigation as the next evidence step rather than production-candidacy review.

## 2026-07-30 - EXP-04C-R1 Targeted Recovery Reconciliation Defect Resolution

- Phase: BUILD
- Touched boundaries:
  - `package.json`
  - `scripts/generate-observation-topology-blind-review-set.ts`
  - `src/cognition/observation/benchmark/observation-topology-blind-review-set.ts`
  - `src/cognition/observation/benchmark/observation-topology-experiment-types.ts`
  - `src/cognition/observation/benchmark/__tests__/observation-topology-blind-review-set.test.ts`
  - `src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts`
  - `src/cognition/observation/benchmark/__tests__/targeted-recovery-refinement.test.ts`
  - `src/cognition/observation/experiment/configurations/targeted-recovery.ts`
  - `src/cognition/observation/experiment/targeted-recovery-refinement.ts`
  - `docs/v2-build/validation-benchmark/Observation-Candidate-Topology-Experiment-Guide-v1.md`
  - `docs/v2-build/validation-benchmark/Observation-Targeted-Recovery-Refinement-Guide-v1.md`
  - `docs/v2-build/validation-benchmark/Observation-Targeted-Recovery-Reconciliation-Repair-Guide-v1.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - `npx.cmd vitest run src/cognition/observation/benchmark/__tests__/targeted-recovery-refinement.test.ts` -> pass (`1` file, `15` tests)
  - `npx.cmd vitest run src/cognition/observation/benchmark/__tests__/observation-topology-blind-review-set.test.ts src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts` -> pass (`2` files, `9` tests)
  - `npx.cmd vitest run src/cognition/observation/benchmark/__tests__/observation-topology-blind-review-set.test.ts src/cognition/observation/benchmark/__tests__/targeted-recovery-refinement.test.ts src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts` -> pass (`4` files, `44` tests)
  - `npx.cmd tsc --noEmit` -> pass
  - `npm.cmd run lint -- src/cognition/observation/benchmark src/cognition/observation/experiment/configurations/targeted-recovery.ts src/cognition/observation/experiment/targeted-recovery-refinement.ts scripts/generate-observation-topology-blind-review-set.ts` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-30T19-01-30-228Z.log`
  - `npx.cmd tsx scripts/run-observation-topology-experiment.ts --benchmark OBS-A-002 --benchmark OBS-C-002 --benchmark OBS-D-001 --configuration C_TARGETED_RECOVERY` -> completed, run `20260730T190500Z-39b3730-subset-3-C_TARGETED_RECOVERY-r1`
  - `npx.cmd tsx scripts/generate-observation-topology-blind-review-set.ts --spec .validation/observation-topology-experiments/review-sets/20260730-targeted-recovery-repair-review-spec.json` -> completed, review set `20260730T191002Z-reviewset-targeted-recovery-repair-review`
- Notes:
  - Added canonical physical-gap normalization and canonical recovery-window normalization so one uncovered tail can preserve multiple diagnostic reasons without creating duplicate recovery requests.
  - Strengthened deterministic reconciliation with recovery-window provenance, cross-recovery duplicate comparison, duplicate-locality merge analysis, and evidence-ordered locality assembly so repaired Configuration C no longer prepends late recovery localities ahead of earlier baseline material.
  - Added a legacy-compatible blind review set generator that consumes both modern opaque candidate artifacts and older `artifactDirectory`-based runs while emitting a clean public blind index and a separate private reversal map.
  - Preserved the experiment-only isolation boundary: repaired reconciliation remains in validation-only topology modules and generated artifacts stay under `.validation/observation-topology-experiments/`.

## 2026-07-30 - EXP-03C Targeted Recovery Fidelity and Reconciliation Refinement

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation/benchmark/observation-topology-experiment-artifact-writer.ts`
  - `src/cognition/observation/benchmark/observation-topology-experiment-types.ts`
  - `src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts`
  - `src/cognition/observation/benchmark/__tests__/targeted-recovery-refinement.test.ts`
  - `src/cognition/observation/experiment/configurations/targeted-recovery.ts`
  - `src/cognition/observation/experiment/targeted-recovery-refinement.ts`
  - `docs/v2-build/validation-benchmark/Observation-Candidate-Topology-Experiment-Guide-v1.md`
  - `docs/v2-build/validation-benchmark/Observation-Targeted-Recovery-Refinement-Guide-v1.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - `npx.cmd vitest run src/cognition/observation/benchmark/__tests__/targeted-recovery-refinement.test.ts` -> pass (`1` file, `9` tests)
  - `npx.cmd vitest run src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts` -> pass (`1` file, `8` tests)
  - `npx.cmd vitest run src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts src/cognition/observation/benchmark/__tests__/targeted-recovery-refinement.test.ts` -> pass (`3` files, `37` tests)
  - `npx.cmd tsc --noEmit` -> pass
  - `npm.cmd run lint` -> pass with `3` pre-existing unrelated warnings in `src/cognition/latent-v2/opportunity-constructor/provenance.ts` and `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-30T17-10-45-726Z.log`
  - `npx.cmd tsx scripts/run-observation-topology-experiment.ts --benchmark OBS-A-002 --benchmark OBS-C-002 --benchmark OBS-D-001 --configuration A_CURRENT_BASELINE` -> completed with failures, run `20260730T171751Z-39b3730-subset-3-A_CURRENT_BASELINE-r1`
  - `npx.cmd tsx scripts/run-observation-topology-experiment.ts --benchmark OBS-A-002 --benchmark OBS-C-002 --benchmark OBS-D-001 --configuration C_TARGETED_RECOVERY` -> completed, run `20260730T172127Z-39b3730-subset-3-C_TARGETED_RECOVERY-r1`
- Notes:
  - Replaced the prototype Configuration C concatenation flow with a structured reconciliation layer that admits the best parseable baseline candidate provisionally, separates recovery gaps from bounded recovery windows, and preserves source-grounded baseline units unless deterministic overlap analysis justifies replacement.
  - Added auditable duplicate classification, replacement decisions, locality reconstruction, provenance fields, and completeness diagnostics so rejected-but-parseable baseline material can survive recovery without implying production acceptance.
  - Removed public blind-index configuration leakage by switching reviewer artifacts to opaque candidate references and keeping the anonymization mapping private.
  - Historical prototype-C comparison artifacts remain available for `OBS-A-002` and `OBS-C-002`; no preserved original prototype-C run exists for the newly added `OBS-D-001` comparator item.

## 2026-07-27 - CONT-I01D Exactness Seam Runtime Resolution

- Phase: BUILD
- Touched boundaries:
  - `src/domain/anchor-v1/continuity-neighborhood-reader.ts`
  - `src/infrastructure/supabase/repositories/anchor-continuity-neighborhood-reader.ts`
  - `src/infrastructure/supabase/repositories/create-continuity-neighborhood-reader.ts`
  - `src/infrastructure/supabase/repositories/__tests__/anchor-opportunity-identity-classifier.test.ts`
  - `src/infrastructure/supabase/repositories/__tests__/anchor-continuity-neighborhood-reader.test.ts`
  - `src/infrastructure/supabase/repositories/__tests__/create-continuity-neighborhood-reader.test.ts`
  - `src/reflective-space/__tests__/resolve-opening-thread.test.ts`
  - `src/shared/__tests__/opportunity-identity-exact-classification-migration.test.ts`
  - `docs/BUILD_LOG.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/infrastructure/supabase/repositories/__tests__/anchor-opportunity-identity-classifier.test.ts src/infrastructure/supabase/repositories/__tests__/anchor-continuity-neighborhood-reader.test.ts src/infrastructure/supabase/repositories/__tests__/create-continuity-neighborhood-reader.test.ts src/reflective-space/__tests__/resolve-opening-thread.test.ts src/reflective-space/__tests__/resolve-opening-continuity-neighborhood-lookup.test.ts` -> pass (`5` files, `50` tests)
  - `npx.cmd vitest run -c vitest.config.ts --dir app/api/openings/[id]/select/__tests__` -> pass (`1` file, `3` tests)
  - `npx.cmd vitest run src/infrastructure/supabase/repositories/__tests__/anchor-supabase-repository.test.ts src/shared/__tests__/anchor-foundation-migration.test.ts src/shared/__tests__/opportunity-identity-exact-classification-migration.test.ts` -> pass (`3` files, `8` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass with pre-existing warnings only in `src/cognition/latent-v2/opportunity-constructor/provenance.ts` and `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-27T15-32-01-052Z.log`
  - `supabase --version` -> command not found
- Notes:
  - Corrected the exact classifier runtime seam to require a one-row table-return RPC payload and to reject malformed or contradictory classification output instead of silently degrading to `none`.
  - Reserved `ContinuityNeighborhoodOperationalError` for transport/query failures and introduced `ContinuityNeighborhoodContractError` for malformed RPC payloads and exactness/materialization invariant failures.
  - Added dedicated structural validation for `20260727_0001_opportunity_identity_exact_classification.sql` plus a factory-level reader test that exercises the production constructor path against the exact RPC seam.
  - Left unrelated pre-existing working-tree edits outside the CONT-I01 closure slice, including unrelated canon/runtime docs and legacy absolute local-path links in older spec documents.

## 2026-07-27 - CONT-I01C Exact Opportunity Continuity Classification

- Phase: BUILD
- Touched boundaries:
  - `src/domain/anchor-v1/continuity-neighborhood.ts`
  - `src/infrastructure/supabase/repositories/anchor-continuity-neighborhood-reader.ts`
  - `src/infrastructure/supabase/repositories/create-continuity-neighborhood-reader.ts`
  - `src/infrastructure/supabase/repositories/__tests__/anchor-opportunity-identity-classifier.test.ts`
  - `src/infrastructure/supabase/repositories/__tests__/anchor-continuity-neighborhood-reader.test.ts`
  - `src/reflective-space/__tests__/resolve-opening-thread.test.ts`
  - `docs/v2-build/continuity/Continuity-Neighborhood-Contract-v1.md`
  - `supabase/migrations/20260727_0001_opportunity_identity_exact_classification.sql`
  - `docs/BUILD_LOG.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/infrastructure/supabase/repositories/__tests__/anchor-opportunity-identity-classifier.test.ts` -> pass (`1` file, `6` tests)
  - `npx.cmd vitest run src/infrastructure/supabase/repositories/__tests__/anchor-continuity-neighborhood-reader.test.ts` -> pass (`1` file, `17` tests)
  - `npx.cmd vitest run src/reflective-space/__tests__/resolve-opening-thread.test.ts` -> pass (`1` file, `9` tests)
  - `npx.cmd vitest run src/reflective-space/__tests__/resolve-opening-continuity-neighborhood-lookup.test.ts` -> pass (`1` file, `4` tests)
  - `npx.cmd vitest run -c vitest.config.ts --dir app/api/openings/[id]/select/__tests__` -> pass (`1` file, `3` tests)
  - `npx.cmd vitest run src/infrastructure/supabase/repositories/__tests__/anchor-supabase-repository.test.ts src/shared/__tests__/anchor-foundation-migration.test.ts` -> pass (`2` files, `5` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint -- src/domain/anchor-v1/continuity-neighborhood.ts src/infrastructure/supabase/repositories/anchor-continuity-neighborhood-reader.ts src/infrastructure/supabase/repositories/__tests__/anchor-continuity-neighborhood-reader.test.ts src/infrastructure/supabase/repositories/__tests__/anchor-opportunity-identity-classifier.test.ts src/reflective-space/__tests__/resolve-opening-thread.test.ts` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-27T14-57-30-742Z.log`
  - `supabase --version` -> command not found
- Notes:
  - Replaced ordinary opportunity-side participation scans with a repository-owned exact classification seam that returns `none | unique | ambiguous` before bounded cluster materialization begins.
  - Added a database-owned exact classification function plus user-scoped opportunity and opportunity-manifestation indexes so transport-layer row caps cannot hide a second Anchor identity cluster.
  - Narrowed ambiguity evidence to representative anchor identities instead of claiming exhaustive participation evidence.
  - Removed the unrelated `OPN-CLOSE-01` ledger drift from this build-ticket history.

## 2026-07-24 - OPN-S01 Opening Constitutional Lifecycle Simplification and Thread Identity Alignment

- Phase: BUILD
- Touched boundaries:
  - `docs/canon/opening-interaction-principles-v1.md`
  - `docs/runtime/opening-philosophy-and-reflective-invitation-model-v1.md`
  - `docs/runtime/reflective-thread-model-v1.md`
  - `docs/runtime/latent-opening-dialogue-boundary-contract-v1.md`
  - `docs/runtime/lumira-reflective-opening-lifecycle-api-contract-v0.md`
  - `docs/runtime/lumira-reflective-opening-canonical-data-model-v0.md`
  - `docs/runtime/lumira-reflective-thread-state-machine-v0.md`
  - `docs/runtime/lumira-reflective-thread-canonical-data-model-v0.md`
  - `docs/runtime/lumira-reflective-thread-transition-invariants-v0.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - repository implementation audit of Opening and Thread boundaries -> runtime already resolves or creates thread identity at Opening selection
  - `git diff -- src/domain/openings/types.ts src/domain/openings/README.md src/domain/threads/types.ts src/domain/threads/README.md src/reflective-space/resolve-opening-thread.ts src/reflective-space/README.md` -> no implementation changes required
  - targeted constitutional consistency audit across updated Opening and Thread authorities -> pass
  - no build, lint, typecheck, or test run; ticket landed as documentation authority normalization only
- Notes:
  - Simplified Opening constitutional doctrine to the two primary postures `silence` and `invitation exists`, with only `accepted` and `dismissed` as terminal constitutional outcomes.
  - Demoted richer opening lifecycle vocabularies such as `generated`, `candidate`, `engaged`, `revisited`, `expired`, and `archived` to implementation detail in the living runtime authority set.
  - Aligned Opening and Thread doctrine on one constitutive boundary: accepted Opening selection makes Thread constitutionally real, and the first user-authored contribution begins reflective participation rather than creating thread identity.
  - Preserved the existing implementation because the active Backend V2 reflective-space runtime already follows the clarified Architecture Council model.

## 2026-07-23 - LAT-CLOSE-01 Latent Constitutional Closure Recording and Stewardship Synchronization

- Phase: CLOSURE
- Touched boundaries:
  - `docs/constitution/stewardship/LATENT_CONSTITUTIONAL_CLOSURE_REVIEW_2026-07.md`
  - `docs/constitution/stewardship/LATENT_CONSTITUTIONAL_CLOSURE_RECORD_2026-07.md`
  - `docs/constitution/stewardship/BACKEND_V2_CONSTITUTIONAL_REALIZATION_STATE.md`
  - `docs/constitution/stewardship/BACKEND_V2_CONSTITUTIONAL_STEWARDSHIP_PROGRAM.md`
  - `docs/constitution/navigation/CONSTITUTIONAL_NAVIGATION.md`
  - `docs/constitution/README.md`
  - `docs/STABILIZATION_LEDGER.md`
- Closure verdict:
  - `CONSTITUTIONALLY CLOSED WITH STEWARDSHIP OBSERVATIONS`
- Final requirement status:
  - `LAT-R009`, `LAT-R011`, `LAT-R020`, `LAT-R021`, `LAT-R022`, `LAT-R023`, `LAT-R024`, `LAT-R027`, `LAT-R030`, `LAT-R032`, and `LAT-R033` -> `SATISFIED`
  - `LAT-R015`, `LAT-R025`, and `LAT-R026` -> `SATISFIED WITH NON-BLOCKING VERIFICATION LIMITATION`
- Resolved findings:
  - authority mutability -> resolved
  - lifecycle reachability -> resolved
  - posture authority leakage -> resolved
  - lineage bypass -> resolved
  - accepted-authority delete seam -> resolved
  - `LAT-R04C-F1-DELETE-SEAM` -> `RESOLVED`
- Review chain:
  - June 2026 readiness baseline
  - Latent constitutional responsibility mapping
  - `LAT-R02A`, `LAT-R02B`, `LAT-R02C`, `LAT-R03A`, and `LAT-R03B` realization and closure records
  - `LAT-R04` Reflective Continuity realization
  - `LAT-R04C` targeted resolution
  - `LAT-R04D` accepted-authority delete-seam removal
  - 2026-07-23 formal Latent closure review
  - 2026-07-23 formal Latent closure record
- Verification limitation:
  - live SQL verification unavailable
  - Supabase CLI unavailable
  - Docker unavailable
  - migration, trigger, service-role, and cascade behavior verified statically
  - limitation preserved as non-blocking verification uncertainty only
- Transition:
  - Implementation complete
  - Constitutional closure approved
  - Live SQL verification unavailable
  - Stewardship active
- Notes:
  - Latent is now entered into active constitutional stewardship without reopening implementation.
  - Living constitutional state, navigation, and stewardship documents now reflect the reviewed closed-layer posture.

## 2026-07-23 - Latent Reflective Continuity Targeted Resolution LAT-R04C

- Phase: BUILD
- Touched boundaries:
  - `supabase/migrations/20260722_0001_latent_reflective_continuity.sql`
  - `src/domain/latent-v2/types.ts`
  - `src/domain/latent-v2/lifecycle.ts`
  - `src/domain/latent-v2/__tests__/lifecycle.test.ts`
  - `src/infrastructure/supabase/adapters/latent-opportunity-row.ts`
  - `src/infrastructure/supabase/adapters/__tests__/latent-opportunity-row.test.ts`
  - `src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts`
  - `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
  - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
  - `src/shared/__tests__/latent-generation-run-hardening-migration.test.ts`
  - `docs/superpowers/specs/2026-07-22-latent-reflective-continuity-r04-design.md`
  - `docs/superpowers/plans/2026-07-23-lat-r04c-targeted-resolution-addendum.md`
  - `docs/superpowers/audits/2026-07-23-lat-r04c-targeted-resolution-record.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/shared/__tests__/latent-generation-run-hardening-migration.test.ts src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts src/domain/latent-v2/__tests__/lifecycle.test.ts` -> pass (`4` files, `105` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-23T08-06-32-421Z.log`
  - live DB verification attempt:
    - `supabase --version` -> command not found
    - `docker --version` -> command not found
- Notes:
  - Hardened accepted-authority persistence so accepted Latent authority rows are admitted through the atomic successor-acceptance seam rather than ordinary table mutation paths.
  - Moved first-generation acceptance onto the same atomic seam, enforced history-derived posture reads, and made unsupported persisted posture fail closed.
  - Realized contradiction-aware weakening and abandonment while keeping omission without explicit contradictory accepted authority conservative.

## 2026-07-04 - Reflection Candidate Evidence Accumulation Slice IF-REF-002A

- Phase: BUILD
- Touched boundaries:
  - `supabase/migrations/20260704_0001_reflection_candidate_evidence.sql`
  - `src/domain/reflection-candidates/types.ts`
  - `src/domain/reflection-candidates/contracts.ts`
  - `src/infrastructure/supabase/adapters/reflection-candidate-row.ts`
  - `src/infrastructure/supabase/repositories/reflection-candidate-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/reflection-candidate-supabase-repository.test.ts`
  - `app/api/openings/[id]/responses/route.ts`
  - `app/api/openings/[id]/responses/__tests__/route.test.ts`
  - `docs/superpowers/plans/2026-07-04-if-ref-002a-candidate-evidence-plan.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/infrastructure/supabase/repositories/__tests__/reflection-candidate-supabase-repository.test.ts app/api/openings/[id]/responses/__tests__/route.test.ts` -> pass (`2` files, `14` tests)
- Notes:
  - Added a dedicated `reflection_candidate_evidence` relation so continued reflective work can accumulate provenance without overloading the provisional candidate row.
  - Extended the reflective response write boundary to append evidence only when the target candidate is unambiguous at the reused thread boundary.
  - Preserved conservative ambiguity handling: when multiple provisional candidates exist on a thread, the runtime does not guess and instead creates a fresh provisional candidate for the new response lineage.

## 2026-06-22 - Observation V2 Stabilization Phase 3 Phenomenology & Metacognition Capture

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation/llm-scene-observation-extractor.ts`
  - `src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts`
  - `docs/superpowers/specs/2026-06-22-observation-v2-phenomenology-metacognition-phase3-design.md`
  - `docs/superpowers/plans/2026-06-22-observation-v2-phenomenology-metacognition-phase3.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts` -> fail first on missing phenomenology/metacognition Phase 3 prompt guidance, then pass (`1` file, `19` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-06-22T18-07-09-091Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Strengthened the live scene-first extractor prompt so phenomenology explicitly covers reality-behavior anomalies such as impossible space, transformed environments, altered identity, discontinuity, strange reflections, and distorted time.
  - Strengthened the live prompt so metacognition explicitly covers noticing, realizing, dream-state recognition, awareness of uncertainty, awareness of remembering, awareness of not knowing, self-observation, and lucid awareness.
  - Added explicit anti-interpretation and non-invention prompt constraints plus focused positive and negative fixtures so anomaly capture improves without forcing awareness, interpretation, or unsupported category emission.

## 2026-06-22 - Observation V2 Stabilization Phase 2 Coverage Fidelity

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation/llm-scene-observation-extractor.ts`
  - `src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts`
  - `docs/superpowers/specs/2026-06-22-observation-v2-coverage-fidelity-phase2-design.md`
  - `docs/superpowers/plans/2026-06-22-observation-v2-coverage-fidelity-phase2.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts` -> fail first on missing late-retention prompt guidance and missing late-section guard behavior, then pass (`1` file, `16` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-06-22T17-37-26-869Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Strengthened the scene-first extractor prompt so meaningful late-dream material, final transitions, final encounters, emotional shifts, dream-state changes, and unresolved ending states are explicitly preserved when present.
  - Added a conservative late-section presence guard for long dreams that detects obvious ending loss or thin compressed closing traces without comparing beginning/middle/end density or synthesizing observations.
  - Reused the existing retry/fallback pattern so repeated ending-loss outputs fail closed instead of being silently persisted after retry.

## 2026-06-22 - Observation V2 Stabilization Phase 1 Scene Transition Fidelity Improvement

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation/llm-scene-observation-extractor.ts`
  - `src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts`
  - `docs/superpowers/specs/2026-06-22-observation-v2-scene-transition-fidelity-phase1-design.md`
  - `docs/superpowers/plans/2026-06-22-observation-v2-scene-transition-fidelity-phase1.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts` -> fail first on missing transition-boundary prompt guidance and missing over-merge guard behavior, then pass (`1` file, `13` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-06-22T17-06-33-842Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Strengthened the scene-first extractor prompt so scene boundaries are guided by situational, relational, goal-state, and dream-logic transitions rather than relying mainly on location change.
  - Added a conservative extractor-local over-merge guard for long single-scene outputs with many internal transition cues, while keeping the LLM as the scene-boundary authority and avoiding deterministic scene splitting.
  - Reused the existing retry/fallback semantics so clearly macro-scene outputs are retried once and then fail closed instead of being silently persisted after repeated under-segmentation.

## 2026-06-21 - Latent Discovery Phase 4 Handoff Harness

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/latent-v2/experimental-construction-handoff/types.ts`
  - `src/cognition/latent-v2/experimental-construction-handoff/handoff-packet.ts`
  - `src/cognition/latent-v2/experimental-construction-handoff/parser.ts`
  - `src/cognition/latent-v2/experimental-construction-handoff/validator.ts`
  - `src/cognition/latent-v2/experimental-construction-handoff/harness.ts`
  - `src/cognition/latent-v2/experimental-construction-handoff/index.ts`
  - `src/cognition/latent-v2/experimental-construction-handoff/__tests__/handoff-harness.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/cognition/latent-v2/experimental-construction-handoff/__tests__/handoff-harness.test.ts` -> fail first on missing experimental handoff module, then pass (`1` file, `7` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-06-21T07-24-53-773Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Added a non-production Discovery -> Construction handoff packet that preserves full constructor evidence space while making Discovery an additive mandatory-to-consider candidate map rather than a replacement input.
  - Added an isolated experimental output contract plus validator rules that require every Discovery candidate to be considered, while still allowing reject-all, merge, split, and full-evidence missed-structure construction behaviors.
  - Kept the harness completely outside production orchestration and persistence; it validates boundary behavior only and records the standing assumption that frequent missed-structure construction indicates Discovery quality risk.

## 2026-06-18 - Deep Reflection Thread-Centered Route And Shell v1

- Phase: BUILD
- Touched boundaries:
  - `app/api/openings/[id]/select/route.ts`
  - `app/api/openings/[id]/select/__tests__/route.test.ts`
  - `app/api/openings/[id]/responses/route.ts`
  - `app/api/openings/[id]/responses/__tests__/route.test.ts`
  - `app/objects/[objectId]/reflect/page.tsx`
  - `app/objects/[objectId]/reflect/[threadId]/page.tsx`
  - `src/domain/openings/contracts.ts`
  - `src/infrastructure/supabase/repositories/opening-supabase-repository.ts`
  - `src/reflective-space/resolve-opening-thread.ts`
  - `src/reflective-space/composition/compose-deep-reflection-payload.ts`
  - `src/reflective-space/composition/__tests__/compose-deep-reflection-payload.test.ts`
  - `src/reflective-space/composition/compose-object-orientation-payload.ts`
  - `src/reflective-space/composition/homepage-route-target-registry.ts`
  - `src/ui/object-orientation/view-model.ts`
  - `src/ui/object-orientation/object-orientation-layer.tsx`
  - `src/ui/reflective-space/deep-reflection-shell.tsx`
  - `src/ui/reflective-space/deep-reflection-shell.module.css`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - Focused TDD pass:
    - `npx.cmd vitest run "app/api/openings/[id]/select/__tests__/route.test.ts" "app/api/openings/[id]/responses/__tests__/route.test.ts" "src/reflective-space/composition/__tests__/compose-deep-reflection-payload.test.ts"` -> fail first on missing thread-centered route/composer seams, then pass (`3` files, `11` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`126` files, `623` tests)
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-18T20-20-08-744Z.log`
- Notes:
  - Replaced the old object-only Deep Reflection assumption with a truthful thread-centered handoff: Orientation now selects through a dedicated opening-selection endpoint that activates/reactivates the opening, resolves or creates the thread center immediately, persists that thread back onto opening provenance, and navigates to `/objects/[objectId]/reflect/[threadId]`.
  - Added the first bounded `composeDeepReflectionPayload(...)` path and a dedicated Deep Reflection shell so the new thread route renders one central dialogue lane, a quiet nearby-context rail, and alternate openings without reusing the broader reflective workspace viewport.
  - Preserved the existing response-save backend while teaching it to reuse a thread already attached during selection, which keeps first-response persistence aligned with the new thread-first lifecycle instead of recreating duplicate centers.

## 2026-06-17 - Anchor Constructor Canon-Aligned Discovery Audit & Calibration v1

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/anchor-v1/constructor/llm-anchor-constructor.ts`
  - `src/cognition/anchor-v1/constructor/__tests__/anchor-constructor.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/anchor-v1/constructor/__tests__/anchor-constructor.test.ts` -> fail first on missing prompt-calibration expectations, then pass (`1` file, `20` tests)
  - `npm.cmd test -- src/runtime/orchestration/__tests__/generate-anchors-for-reflective-object.test.ts` -> pass (`1` file, `4` tests)
  - `npm.cmd run typecheck` -> pass
  - Read-only live constructor audit before calibration via `npx.cmd tsx --eval ...` on real reflective packets:
    - `ae7fd730-eb19-43d6-9781-20e042fc5d9c` -> before baseline moved from all-`ENTITY` historical output to `ENTITY: 5, STRUCTURE: 1`, with no `ROLE` and mostly `EVIDENCE`
    - `04325afa-1495-4f98-9349-0838529d9f68` -> valid `no_anchor` with `0` opportunities
  - Read-only live constructor audit after discovery calibration via `npx.cmd tsx --eval ...`:
    - repeated runs on `ae7fd730-eb19-43d6-9781-20e042fc5d9c` reached all three canon categories within single runs, including `ENTITY: 2, ROLE: 3, STRUCTURE: 4` and later `ENTITY: 5, ROLE: 2, STRUCTURE: 2`
    - participation-role spread expanded beyond `EVIDENCE` to include `CONTEXT`, `STRUCTURAL_SUPPORT`, and `SALIENT_LINK`
    - repeated no-opportunity check on `04325afa-1495-4f98-9349-0838529d9f68` remained valid `no_anchor`
    - one final read-only audit run timed out at the provider boundary (`provider_timeout`) without changing validation or persistence behavior
  - `npm.cmd test` -> pass (`122` files, `570` tests)
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-17T14-06-01-086Z.log`
- Notes:
  - Audited the Anchor constructor path against the Anchor canon and found the main bias in discovery framing rather than schema, parser, validator, mapper, or persistence; the packet already exposed entity, interaction, and opportunity-structure evidence with sufficient breadth for prompt-side correction.
  - Calibrated the prompt to explicitly perform packet-level `ENTITY`, `ROLE`, and `STRUCTURE` discovery passes, preserve category independence within one run, and resist early collapse into named-entity discovery.
  - Strengthened participation-role guidance so the model no longer defaults every valid link to `EVIDENCE`, while also reinforcing the canon distinction that named people/objects remain `ENTITY` unless the label is purely functional.

## 2026-06-17 - Anchor Runtime Persistence Orchestration v1

- Phase: BUILD
- Touched boundaries:
  - `src/domain/anchor-v1/contracts.ts`
  - `src/infrastructure/supabase/repositories/anchor-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/anchor-supabase-repository.test.ts`
  - `src/cognition/anchor-v1/constructor/llm-anchor-constructor.ts`
  - `src/cognition/anchor-v1/constructor/index.ts`
  - `src/cognition/anchor-v1/constructor/__tests__/anchor-constructor.test.ts`
  - `src/runtime/orchestration/generate-anchors-for-reflective-object.ts`
  - `src/runtime/orchestration/__tests__/generate-anchors-for-reflective-object.test.ts`
  - `scripts/dev-run-anchor-v1.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/runtime/orchestration/__tests__/generate-anchors-for-reflective-object.test.ts` -> fail first before implementation (`module not found`), then pass (`1` file, `4` tests)
  - `npm.cmd test -- src/infrastructure/supabase/repositories/__tests__/anchor-supabase-repository.test.ts` -> pass (`1` file, `3` tests)
  - `npm.cmd test -- src/cognition/anchor-v1/constructor/__tests__/anchor-constructor.test.ts` -> pass (`1` file, `20` tests)
  - `npx.cmd tsx scripts/dev-run-anchor-v1.ts ae7fd730-eb19-43d6-9781-20e042fc5d9c` -> first blocked on `generation_context_runtime_mismatch`, then on `opportunity_ref_out_of_scope`, then on `trace_ref_out_of_scope`, finally pass with persisted result (`5` identities, `5` manifestations, `9` participations)
  - Dev-run artifact: `scripts/output/anchor-v1-ae7fd730-eb19-43d6-9781-20e042fc5d9c-2026-06-17T10-32-22-029Z`
  - `npm.cmd test` -> pass (`122` files, `570` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-17T10-32-32-152Z.log`
- Notes:
  - Added the first Anchor runtime orchestration entrypoint that composes the constructor packet, runs the existing constructor, parses and validates output, maps validated anchors to repository create inputs, and persists identities, manifestations, and participations in order.
  - Hardened persistence failure handling by extending the Anchor repository with owner-scoped identity deletion and using identity-level rollback for partial-write cleanup, relying on anchor foundation cascade semantics for dependent manifestations and participations.
  - Added a manual dev-run workflow with structured artifacts for packet, raw output, parsed output, validated output, mapped inputs, persisted records, and final summary, then used that workflow against a real reflective object to tighten the constructor’s exact runtime context, opportunity reference, and trace omission boundaries before successful persistence.

## 2026-06-17 - Anchor Constructor v1 Parser, Validator, Mapping, and Minimal LLM Constructor

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/anchor-v1/constructor/types.ts`
  - `src/cognition/anchor-v1/constructor/parser.ts`
  - `src/cognition/anchor-v1/constructor/safety.ts`
  - `src/cognition/anchor-v1/constructor/validator.ts`
  - `src/cognition/anchor-v1/constructor/mapping.ts`
  - `src/cognition/anchor-v1/constructor/llm-anchor-constructor.ts`
  - `src/cognition/anchor-v1/constructor/index.ts`
  - `src/cognition/anchor-v1/constructor/__tests__/anchor-constructor.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/anchor-v1/constructor/__tests__/anchor-constructor.test.ts` -> fail first (`1` file, `20` tests) before implementation exports, then pass (`1` file, `20` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd test` -> pass (`121` files, `566` tests)
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-17T08-50-08-858Z.log`
- Notes:
  - Added the first Anchor Constructor v1 output runtime contract, including conservative `create_new` identity decisions only, strict anchor/manifestation/participation enums, and a validated silence path.
  - Implemented parser and validator guards that require both observation grounding and opportunity grounding, verify packet-local observation/opportunity/trace references, and reject interpretive, diagnostic, identity-claim, advice, and user-facing leakage.
  - Added a pure mapping layer that produces Anchor Identity, Anchor Manifestation, and Anchor Participation create inputs without repository writes or orchestration, plus a minimal OpenAI-backed constructor with a contract-aligned non-interpretive prompt and strict JSON schema.

## 2026-06-17 - Anchor Constructor Packet Composer v1

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/anchor-v1/constructor/types.ts`
  - `src/cognition/anchor-v1/constructor/input-packet-composer.ts`
  - `src/cognition/anchor-v1/constructor/index.ts`
  - `src/cognition/anchor-v1/constructor/__tests__/input-packet-composer.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/anchor-v1/constructor/__tests__/input-packet-composer.test.ts` -> fail first (`1` file) before boundary implementation, then pass (`1` file, `3` tests)
  - `npm.cmd test` -> pass (`120` files, `546` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-17T08-05-03-072Z.log`
- Notes:
  - Added a dedicated Anchor constructor boundary with a constructor-facing packet contract instead of extending the Latent packet composer or leaking raw repository shapes into the future Anchor constructor.
  - Implemented a read-only packet composer that assembles the reflective object, Observation V2 scenes and observations, current-object latent opportunities, preserved opportunity evidence trace, and glossary context without any Anchor repository usage or persistence writes.
  - Preserved traceability by keeping `supportsNodeKeys` and `supportsEdgeIndexes` attached to the containing opportunity manifestation, evidence block, and supporting observation, while limiting glossary candidates to already-available cheap context passed into the composer rather than introducing candidate-specific fetch or derivation logic.

## 2026-06-17 - Anchor Foundation Persistence v1

- Phase: BUILD
- Touched boundaries:
  - `src/shared/types.ts`
  - `src/domain/anchor-v1/types.ts`
  - `src/domain/anchor-v1/contracts.ts`
  - `src/domain/anchor-v1/__tests__/types.test.ts`
  - `src/infrastructure/supabase/adapters/anchor-row.ts`
  - `src/infrastructure/supabase/adapters/__tests__/anchor-row.test.ts`
  - `src/infrastructure/supabase/repositories/anchor-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/create-anchor-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/anchor-supabase-repository.test.ts`
  - `src/shared/__tests__/anchor-foundation-migration.test.ts`
  - `supabase/migrations/20260617_0026_anchor_foundation.sql`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/domain/anchor-v1/__tests__/types.test.ts src/infrastructure/supabase/adapters/__tests__/anchor-row.test.ts src/infrastructure/supabase/repositories/__tests__/anchor-supabase-repository.test.ts src/shared/__tests__/anchor-foundation-migration.test.ts` -> fail first (`4` files) before implementation, then pass (`4` files, `9` tests)
  - `npm.cmd test` -> pass (`119` files, `543` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-17T06-46-00-434Z.log`
- Notes:
  - Added the first Anchor Foundation persistence primitives with strict canon enum sets for Anchor Identity, Anchor Manifestation, and Anchor Participation, including both `DREAM_DERIVED` and `REFLECTIVE_OBJECT_DERIVED` manifestation sources.
  - Kept the repository layer intentionally narrow with create/read support only, matching the foundation scope and avoiding extraction, weaving, lifecycle, normalization, reuse, or orchestration behavior.
  - Preserved continuity linkage in one participation table by supporting identity-only rows and manifestation-linked rows while enforcing owner-scoped foreign keys to anchors, latent opportunities, and reflective objects.

## 2026-06-17 - Latent Opportunity Evidence Trace Preservation

- Phase: BUILD
- Touched boundaries:
  - `src/domain/latent-v2/types.ts`
  - `src/cognition/latent-v2/opportunity-constructor/mapping.ts`
  - `src/infrastructure/supabase/adapters/latent-opportunity-row.ts`
  - `supabase/migrations/20260617_0025_latent_opportunity_evidence_trace.sql`
  - `src/cognition/latent-v2/opportunity-constructor/__tests__/opportunity-constructor.test.ts`
  - `src/infrastructure/supabase/adapters/__tests__/latent-opportunity-row.test.ts`
  - `src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts`
  - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
  - `src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/latent-v2/opportunity-constructor/__tests__/opportunity-constructor.test.ts` -> pass (`1` file, `30` tests)
  - `npm.cmd test -- src/infrastructure/supabase/adapters/__tests__/latent-opportunity-row.test.ts` -> pass (`1` file, `7` tests)
  - `npm.cmd test -- src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts` -> pass (`1` file, `8` tests)
  - `npm.cmd test -- src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts` -> pass (`1` file, `13` tests)
  - `npm.cmd test` -> pass (`115` files, `534` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-17T06-15-42-176Z.log`
- Notes:
  - Preserved validated constructor evidence trace fields through Latent V2 mapping and persistence so observation evidence can continue to identify which opportunity node keys and edge indexes it supports after repository writes and reads.
  - Kept the persistence extension Latent-only and minimal by adding explicit nullable array columns on `latent_opportunity_evidence_observations` rather than introducing Anchor-specific storage or a generic JSON payload.
  - Preserved existing evidence-observation behavior, kept glossary candidates non-persisted, and normalized missing trace support to empty arrays on the mapped and rehydrated domain shape for consistent downstream consumption.

## 2026-06-16 - Latent V2 Constructor Discovery Prompt And Coverage Expansion

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/latent-v2/opportunity-constructor/llm-opportunity-constructor.ts`
  - `src/cognition/latent-v2/opportunity-constructor/index.ts`
  - `src/cognition/latent-v2/opportunity-constructor/__tests__/opportunity-constructor.test.ts`
  - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/latent-v2/opportunity-constructor/__tests__/opportunity-constructor.test.ts` -> fail first (`buildOpportunityConstructorPrompt is not a function`)
  - `npm.cmd test -- src/cognition/latent-v2/opportunity-constructor/__tests__/opportunity-constructor.test.ts src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts` -> pass (`2` files, `39` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`115` files, `525` tests)
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-16T09-03-06-272Z.log`
- Notes:
  - Expanded constructor prompt guidance so discovery explicitly scans multiple canon-valid dream-internal opportunity classes, including scene transitions, absences, ambiguities, repair sequences, and search/finding/loss structures.
  - Added explicit multiplicity counterweights so the model still prefers fewer stronger opportunities without collapsing distinct evidence-supported structures into one narrow local tension.
  - Extended constructor and orchestration tests to cover three materially distinct opportunities from one priority object plus focused transition, gap, and repair/reassurance examples while preserving silence, safety, and inventory-graph rejection.

## 2026-06-16 - Latent V2 Same-Object Constructor Context Exclusion

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/latent-v2/opportunity-constructor/input-packet-composer.ts`
  - `src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts` -> pass (`1` file, `13` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`115` files, `522` tests)
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-16T07-04-46-276Z.log`
- Notes:
  - Removed same-priority-reflective-object opportunity identities from constructor context assembly so reruns of the same dream no longer feed prior opportunities from that same dream back into the constructor.
  - Preserved cross-object continuity by continuing to include recent opportunity identities whose manifestations originate from other reflective objects.
  - Kept repository schema and persistence behavior unchanged; the patch is isolated to packet composition and coverage for inclusion/exclusion behavior.

## 2026-06-15 - Latent V2 Orchestrator Debug Artifact Visibility

- Phase: BUILD
- Touched boundaries:
  - `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
  - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
  - `scripts/dev-run-latent-v2.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts` -> pass (`1` file, `12` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`115` files, `520` tests)
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-15T16-57-45-559Z.log`
- Notes:
  - Expanded the Latent V2 orchestrator result so successful persisted runs expose `parsedOutput`, `validatedOutput`, `mappedPayload`, `persistedIdentities`, and `persistedManifestations` alongside the input packet and raw LLM output.
  - Failure results now expose every artifact available before the failing stage, including parsed output on validation failures and mapped payload on persistence failures, without changing prompt, validation, mapping, or persistence semantics.
  - Updated the local dev runner to write plural persistence artifacts so debug review can inspect the full persisted identity and manifestation arrays from successful runs.

## 2026-06-15 - Latent V2 Structured Output Schema Evidence Ref Alignment

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/latent-v2/opportunity-constructor/llm-opportunity-constructor.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`115` files, `520` tests)
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-15T15-06-46-552Z.log`
- Notes:
  - Reworked the OpenAI structured output schema for evidence observation refs so optional scene identifiers are expressed as explicit allowed object variants instead of a single object shape that provider-side schema validation treated as missing required fields.
  - `observationV2SceneObservationId` remains required, while `sceneRowId` and `sceneStableId` are now schema-optional in a way that matches the current parser and validator contract.

## 2026-06-15 - Latent V2 Evidence Reference Ergonomics

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/latent-v2/opportunity-constructor/types.ts`
  - `src/cognition/latent-v2/opportunity-constructor/parser.ts`
  - `src/cognition/latent-v2/opportunity-constructor/validator.ts`
  - `src/cognition/latent-v2/opportunity-constructor/mapping.ts`
  - `src/cognition/latent-v2/opportunity-constructor/llm-opportunity-constructor.ts`
  - `src/cognition/latent-v2/opportunity-constructor/__tests__/opportunity-constructor.test.ts`
  - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/latent-v2/opportunity-constructor/__tests__/opportunity-constructor.test.ts src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts` -> pass (`36` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`115` files, `520` tests)
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-15T14-58-33-483Z.log`
- Notes:
  - Validation now matches evidence refs observation-first by `observationV2SceneObservationId`, allowing short stable scene ids or omitted scene ids without weakening evidence grounding.
  - If a scene reference is provided, it must still match the matched observation's canonical scene row id or stable scene id; unknown scene refs remain rejected.
  - Repository mapping now canonicalizes scene ids from the input packet before persistence, so short LLM-facing ids are never written through as canonical internal scene ids.

## 2026-06-15 - Latent V2 Opportunity Constructor Prompt And Schema Tightening

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/latent-v2/opportunity-constructor/llm-opportunity-constructor.ts`
  - `src/cognition/latent-v2/opportunity-constructor/types.ts`
  - `src/cognition/latent-v2/opportunity-constructor/parser.ts`
  - `src/cognition/latent-v2/opportunity-constructor/validator.ts`
  - `src/cognition/latent-v2/opportunity-constructor/__tests__/opportunity-constructor.test.ts`
  - `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
  - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/latent-v2/opportunity-constructor/__tests__/opportunity-constructor.test.ts src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts` -> pass (`31` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`115` files, `515` tests)
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-15T13-31-14-254Z.log`
- Notes:
  - Tightened the structured-output schema and prompt so the constructor requests only canon-aligned reflective opportunities, canonical categories, allowed structure types, and `safety.userFacingReady = false`.
  - Parser-level enforcement now rejects non-canonical categories and disallowed structure types such as `graph` before persistence can begin.
  - Validator-level enforcement now rejects user-facing-ready outputs and broad inventory-style scene/actor/object mappings that drift away from focused reflective structure, while preserving valid silence outputs and non-persistent failure behavior in orchestration.

## 2026-06-13 - Glossary Live Admission Enforcement Slice

- Phase: BUILD
- Touched boundaries:
  - `src/runtime/orchestration/generate-glossary-candidates-for-reflective-object.ts`
  - `src/runtime/orchestration/__tests__/generate-glossary-candidates-for-reflective-object.test.ts`
  - `src/cognition/glossary/continuity-admission.ts`
  - `src/cognition/glossary/__tests__/continuity-admission.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/glossary/__tests__/continuity-admission.test.ts src/runtime/orchestration/__tests__/generate-glossary-candidates-for-reflective-object.test.ts` -> pass
  - `npm.cmd test` -> pass (`109` files, `461` tests)
  - `npm.cmd run lint` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-13T16-31-32-476Z.log`
- Notes:
  - Enforced the existing continuity admission gate in the live glossary candidate orchestration path between extraction and classification/persistence.
  - Rejected candidates now short-circuit before glossary term lookup and before candidate persistence.
  - Added localized Hungarian admission heuristics for generic actor and generic location/motif phrases needed by the current runtime examples, while leaving Observation extraction, identity generation, UI payload shape, and persistence schema unchanged.

## 2026-06-13 - Glossary Entity Create Route And Modal Rename Alignment

- Phase: BUILD
- Touched boundaries:
  - `app/api/glossary/terms/route.ts`
  - `app/api/glossary/terms/__tests__/route.test.ts`
  - `src/domain/glossary/contracts.ts`
  - `src/domain/glossary/http-contract.ts`
  - `src/infrastructure/supabase/repositories/glossary-supabase-repository.ts`
  - `src/ui/object-orientation/object-orientation-layer.tsx`
  - `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`
  - `src/reflective-space/composition/__tests__/compose-object-orientation-payload.test.ts`
  - `src/reflective-space/composition/__tests__/compose-reflective-space-viewport.test.ts`
- Verification:
  - `npm.cmd test -- app/api/glossary/terms/__tests__/route.test.ts` -> pass
  - `npm.cmd test -- src/ui/object-orientation/__tests__/orientation-layer.test.tsx` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-13T15-24-09-183Z.log`
- Notes:
  - Added the missing `POST /api/glossary/terms` path so glossary entity creation returns JSON instead of falling through to an HTML error response.
  - Aligned the glossary candidate modal labels to Hungarian and moved entity renaming into the modal header with the same edit/save/cancel icon pattern used for dream-title editing in Orientation.
  - Existing-entity header renames now persist through `PATCH /api/glossary/terms/[id]`, while create-new candidate flows use the same inline header editing pattern before resolution.

## 2026-06-13 - Observation Display Language And Identity v1

- Phase: BUILD
- Touched boundaries:
  - `src/domain/observation/v2-runtime.ts`
  - `src/infrastructure/supabase/adapters/observation-v2-row.ts`
  - `src/cognition/observation/llm-scene-observation-extractor.ts`
  - `src/cognition/glossary/extract-glossary-candidates-from-observations.ts`
  - `src/reflective-space/composition/derive-glossary-cues.ts`
  - `src/domain/observation/__tests__/v2-runtime.test.ts`
  - `src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts`
  - `src/cognition/glossary/__tests__/extract-glossary-candidates-from-observations.test.ts`
  - `src/runtime/orchestration/__tests__/generate-glossary-candidates-for-reflective-object.test.ts`
  - `src/reflective-space/composition/__tests__/derive-glossary-cues.test.ts`
  - `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`
- Verification:
  - `npm test` -> pass (`109` files, `450` tests)
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-13T06-37-06-130Z.log`
- Notes:
  - Observation V2 derived items now separate stable identity from language-aware display text through `identityKey`, `displayLabel`, and `sourceLanguage`, while preserving legacy `label` compatibility for existing readers.
  - Dream language is carried in Observation V2 provenance as `hu`, `en`, or `unknown` without requiring schema changes or historical migrations.
  - Glossary candidate extraction now propagates Observation display labels while deriving matching keys from stable Observation identity, preserving existing glossary classification and continuity-admission behavior.

## 2026-06-12 - Capture Glossary Schema Drift Emergency Fix

- Phase: BUILD
- Touched boundaries:
  - `src/infrastructure/supabase/repositories/glossary-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts`
- Verification:
  - Live Supabase probe: `node --env-file=.env.local -e "<glossary candidate select/insert probes>"` -> confirmed hosted DB rejects `candidate_class` with `42703` on select and `PGRST204` on insert, while metadata-free insert succeeds
  - `npm test` -> pass (`108` files, `437` tests)
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-12T16-03-02-761Z.log`
- Notes:
  - Confirmed the configured Supabase project is missing the `20260612_0022_glossary_match_candidate_foundation.sql` columns even though later identity-scope behavior is present.
  - Fixed the repository-side backward-compatibility matcher so capture retries candidate writes without metadata columns when PostgREST returns `PGRST204` schema-cache misses, not just raw Postgres `42703`.
  - This restores capture safety against the currently drifted database while leaving the intended Glossary V2 schema behavior unchanged once `0022` is actually applied.

## 2026-06-12 - Capture Glossary Candidate Invocation Slice

- Phase: BUILD
- Touched boundaries:
  - `app/capture/page.tsx`
  - `app/capture/page.test.tsx`
  - `app/api/reflective-objects/[id]/glossary-candidates/route.ts`
  - `src/runtime/orchestration/generate-glossary-candidates-for-reflective-object.ts`
  - `src/runtime/orchestration/__tests__/generate-glossary-candidates-for-reflective-object.test.ts`
- Verification:
  - `npm test` -> pass (`108` files, `436` tests)
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-12T15-49-24-581Z.log`
- Notes:
  - Wired the live capture success path to invoke the existing glossary extraction, classification, and persistence flow immediately after Observation V2 durability and before the orientation redirect.
  - Extracted the generation flow into a shared orchestration seam so capture and `POST /api/reflective-objects/[id]/glossary-candidates` now reuse one authority instead of duplicating extraction logic.
  - Added automated coverage proving capture invokes the seam after Observation persistence, preserves redirect behavior, classifies no-term outputs as `new_candidate`, and reuses repository upsert semantics on repeated invocation.
  - Added backward-compatible candidate persistence fallback so pre-migration `glossary_candidate_states` tables without `candidate_class` / `proposed_entity_ids` no longer break capture or candidate upsert.

## 2026-06-12 - Ambiguous Resolution Completion Slice

- Phase: BUILD
- Touched boundaries:
  - `app/api/glossary/candidates/[id]/resolve/route.ts`
  - `app/api/glossary/candidates/[id]/resolve/__tests__/route.test.ts`
  - `src/infrastructure/supabase/repositories/glossary-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts`
  - `supabase/migrations/20260612_0023_glossary_candidate_identity_scope.sql`
- Verification:
  - `npm test` -> pass (`107` files, `429` tests)
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-12T12-53-43-041Z.log`
- Notes:
  - Ambiguous glossary candidates may now resolve by creating a new continuity entity, including role-shaped labels such as unknown-role continuity entries.
  - Candidate persistence identity now preserves `source_category` alongside the existing per-dream normalized key so same-label actor/location/object candidates remain distinct.

## 2026-06-11 - Glossary Recognition Normalization Slice

- Phase: BUILD
- Touched boundaries:
  - `src/domain/glossary/recognition-normalization.ts`
  - `src/domain/glossary/http-contract.ts`
  - `src/domain/glossary/__tests__/recognition-normalization.test.ts`
  - `src/domain/glossary/__tests__/http-contract.test.ts`
  - `src/cognition/glossary/extract-glossary-candidates-from-observations.ts`
  - `src/cognition/glossary/__tests__/extract-glossary-candidates-from-observations.test.ts`
- Verification:
  - `npm test` -> pass (`105` files, `405` tests)
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-11T16-57-13-516Z.log`
- Notes:
  - Added a shared glossary recognition normalization utility and removed the separate ASCII-biased candidate extractor normalization path.
  - Recognition normalization now performs deterministic whitespace cleanup, Unicode accent folding, case folding, and simple punctuation collapse for glossary keys and future matching preparation.
  - Alias parsing now preserves the first user-facing alias string while deduping by the same shared recognition fingerprint used for candidate `normalizedKey` generation.
  - An initial `npm run typecheck` invocation failed against a transient pre-build `.next/types/validator.ts` artifact; rerunning after the successful logged build passed without source changes.

## 2026-06-11 - Glossary Appearance Record Slice

- Phase: BUILD
- Touched boundaries:
  - `src/domain/glossary/types.ts`
  - `src/domain/glossary/contracts.ts`
  - `src/domain/glossary/http-contract.ts`
  - `src/infrastructure/supabase/adapters/glossary-row.ts`
  - `src/infrastructure/supabase/repositories/glossary-supabase-repository.ts`
  - `app/api/glossary/terms/[id]/appearances/route.ts`
  - `app/api/glossary/terms/[id]/appearances/__tests__/route.test.ts`
  - `src/domain/glossary/__tests__/http-contract.test.ts`
  - `src/infrastructure/supabase/adapters/__tests__/glossary-row.test.ts`
  - `src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts`
  - `src/reflective-space/composition/__tests__/compose-object-orientation-payload.test.ts`
  - `src/reflective-space/composition/__tests__/compose-reflective-space-viewport.test.ts`
  - `supabase/migrations/20260611_0021_glossary_appearance_records.sql`
  - `docs/backend-v2-migration/README.md`
- Verification:
  - `npm test` -> pass (`104` files, `399` tests)
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-11T15-46-37-550Z.log`
- Notes:
  - Added a dedicated canonical `glossary_appearance_records` persistence seam with legacy backfill from dream-scoped `glossary_associations`.
  - Candidate confirmation now writes dream-linked appearance records with optional appearance notes and explicit `confirmed_at`, then syncs `glossary_terms.appearance_count` from canonical appearance ownership.
  - Added the first entity-to-appearances API read path at `/api/glossary/terms/[id]/appearances`.
  - Restored the historical `docs/backend-v2-migration/README.md` file so the existing clean-room quarantine documentation test remains valid during repo-wide verification.

## 2026-06-11 - Observation V2 Native Persistence Phase 1

- Phase: BUILD
- Touched boundaries:
  - `src/domain/observation/v2-runtime.ts`
  - `src/domain/observation/contracts.ts`
  - `src/infrastructure/persistence/observation-v2-write-store.ts`
  - `src/infrastructure/persistence/observation-store.ts`
  - `src/infrastructure/persistence/__tests__/observation-v2-write-store.test.ts`
  - `src/infrastructure/supabase/adapters/observation-v2-row.ts`
  - `src/infrastructure/supabase/adapters/__tests__/observation-v2-row.test.ts`
  - `src/infrastructure/supabase/repositories/create-observation-v2-repository.ts`
  - `src/infrastructure/supabase/repositories/observation-v2-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/observation-v2-supabase-repository.test.ts`
  - `supabase/migrations/20260611_0019_observation_v2_native_persistence.sql`
  - `docs/backend-v2-migration/Observation-V2-Fallout-Ledger.md`
- Verification:
  - `npm test` -> pass (`103` files, `386` tests)
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-11T10-10-01-415Z.log`
- Notes:
  - Added the first native Observation V2 bundle durability path for the live generated capture flow.
  - Added native V2 bundle, scene, and scene-observation storage plus bundle rehydration back into `ObservationV2Bundle`.
  - Kept manual/API Observation ingress and V1 row/fragment durability intact as explicit compatibility seams, and updated the fallout ledger with the remaining split-ownership risks.

## 2026-06-11 - Observation V2 Ownership Cutover Phase 1

- Phase: BUILD
- Touched boundaries:
  - `app/capture/page.tsx`
  - `app/capture/page.test.tsx`
  - `src/cognition/observation/observation-engine.ts`
  - `src/cognition/observation/__tests__/observation-engine.test.ts`
  - `src/infrastructure/persistence/observation-v2-write-store.ts`
  - `src/infrastructure/persistence/__tests__/observation-v2-write-store.test.ts`
  - `docs/backend-v2-migration/Observation-V2-Fallout-Ledger.md`
- Verification:
  - `npm test` -> pass (`100` files, `376` tests)
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-11T08-06-13-010Z.log`
- Notes:
  - Cut the live capture-generated Observation path over to the scene-first extractor and a V2-owned write seam.
  - Moved `CreateObservationInput` projection behind a temporary storage adapter so callers no longer own the V1 write payload on the generated path.
  - Left manual/API ingress and durable read contracts explicitly V1-shaped, and recorded those remaining blockers in the Fallout Ledger.

## 2026-06-09 - Observation V2 Foundation Phase 1

- Phase: BUILD
- Touched boundaries:
  - `src/domain/observation/v2-runtime.ts`
  - `src/domain/observation/__tests__/v2-runtime.test.ts`
  - `src/cognition/observation/scene-discovery.ts`
  - `src/cognition/observation/scene-observation-scaffold.ts`
  - `src/cognition/observation/scene-discovery-projection.ts`
  - `src/cognition/observation/llm-scene-observation-extractor.ts`
  - `src/cognition/observation/observation-engine.ts`
  - `src/cognition/observation/__tests__/scene-discovery.test.ts`
  - `src/cognition/observation/__tests__/scene-observation-scaffold.test.ts`
  - `src/cognition/observation/__tests__/scene-discovery-projection.test.ts`
  - `src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts`
  - `src/cognition/observation/__tests__/observation-engine.test.ts`
  - `docs/backend-v2-migration/Observation-V2-Fallout-Ledger.md`
- Verification:
  - `npm test` -> pass (`94` files, `353` tests)
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-09T07-11-09-266Z.log`
- Notes:
  - Added the first additive scene-first Observation V2 runtime foundation.
  - Defined first-class Scene, scene-contained Observation, boundary reasoning, evidence context, and minimal derived structures.
  - Added a scene-first compatibility projection so V1 persistence and API remain temporary targets rather than design drivers.
  - Added a provider-backed scene-first LLM extraction entrypoint and embedded the approved observation granularity rule in its prompt.
  - Kept downstream layers, live routes, and UI surfaces uncut over in this phase, and documented the resulting fallout and likely future removals in the Observation V2 Fallout Ledger.

Ledger entries are appropriate for:
- completed milestones
- completed stabilization phases
- meaningful boundary changes
- historically significant implementation work
- validation-backed completion records

Ledger entries are not appropriate for:
- every small documentation edit
- every audit
- every discussion
- transient operational notes
- routine current-state updates

## 2026-06-06 - Observation V2 Phase 1 Mapping Layer

- Phase: BUILD
- Touched boundaries:
  - `src/domain/observation/v2.ts`
  - `src/domain/observation/__tests__/v2.test.ts`
- Verification:
  - `npm run typecheck` -> pass
  - `npm test` -> pass (`86` files, `321` tests)
  - `npm run lint` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-06T11-37-32-178Z.log`
- Notes:
  - Added a pure internal Observation V2 bridge in the observation domain layer without changing persistence, public API contracts, extraction behavior, UI behavior, glossary behavior, or latent behavior.
  - The new module defines `DescriptiveObservation`, `ObservationBundleV2Like`, deterministic category-to-role mapping, fragment-to-descriptive-observation adaptation, and bundle projection from the existing V1 `Observation` shape.
  - Projection remains additive and side-effect-free; current V1 fragments and bundles stay canonical for runtime, storage, and downstream consumers in this phase.

## 2026-06-05 - Capture Space v1 Implementation

- Phase: BUILD
- Touched boundaries:
  - `app/capture/page.tsx`
  - `app/capture/page.module.css`
  - `app/capture/page.test.tsx`
  - `app/capture/capture-space.tsx`
  - `app/capture/capture-metrics.ts`
  - `app/capture/capture-metrics.test.ts`
- Verification:
  - `npm test` -> pass (`84` files, `304` tests)
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-05T17-24-20-667Z.log`
- Notes:
  - `/capture` now renders as a single-purpose writing surface with one large textarea, Hungarian-only title copy, passive word/character metrics, and a single `Rögzítés` action.
  - Capture no longer asks for a manual title; the persisted reflective object title is derived from the dream text so the existing save pipeline and post-save redirect remain intact.
  - Successful capture still lands on `/objects/[objectId]`, preserving the orientation-first handoff instead of returning to reflection directly.

## 2026-06-05 - Orientation + Homepage Visual Consistency Pass

- Phase: BUILD
- Touched boundaries:
  - `src/ui/object-orientation/object-orientation-layer.tsx`
  - `src/ui/object-orientation/object-orientation-layer.module.css`
  - `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`
  - `src/ui/homepage/homepage-orientation-hub.module.css`
- Verification:
  - `npm test` -> pass (`81` files, `279` tests)
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-05T06-29-16-142Z.log`
- Notes:
  - Orientation shell atmosphere was calmed toward Homepage.
  - Dream header label was removed and the edit affordance was reduced to a pencil icon control.
  - Hover/focus language was aligned across Orientation and Homepage interactive surfaces.

## 2026-06-05 - Observation Evidence Diagnostics and Timeout Hardening

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/observation-extraction-validation.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`
  - `src/cognition/observation/__tests__/observation-extraction-validation.test.ts`
- Verification:
  - `npm run typecheck` -> pass
  - `npm test` -> pass (`83` files, `293` tests)
  - `npm run lint` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-05T13-15-14-242Z.log`
- Notes:
  - Evidence-validation failures now emit bounded diagnostics with category, fragment text, received snippet, exact-match result, and a nearest source excerpt.
  - OpenAI observation extraction now uses a 25-second request timeout and classifies timeout fallbacks separately from other provider failures.
  - Validation remains strict exact-normalized substring matching; this pass adds observability and capture-time hardening only.

## 2026-06-05 - LLM Observation Partial Evidence Repair v1

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/observation-extraction-validation.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`
  - `src/cognition/observation/__tests__/observation-extraction-validation.test.ts`
- Verification:
  - `npm run typecheck` -> pass
  - `npm test` -> pass (`83` files, `297` tests)
  - `npm run lint` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-05T14-00-20-349Z.log`
- Notes:
  - Evidence validation now splits valid fragments from failing fragments instead of collapsing the whole extraction immediately.
  - A one-shot repair-only LLM pass can replace unsupported evidence with exact local quotes or explicitly drop unsupported fragments, while preserving untouched valid fragments.
  - Any repaired aggregate is rebuilt and then fully revalidated through the existing strict evidence validator and semantic policy before persistence.

## 2026-06-05 - LLM Observation Extractor v1

- Phase: BUILD
- Touched boundaries:
  - `app/capture/page.tsx`
  - `app/capture/page.test.tsx`
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/observation-extraction-validation.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`
  - `src/domain/observation/types.ts`
  - `src/domain/observation/semantic-policy.ts`
  - `src/domain/observation/__tests__/http-contract.test.ts`
  - `src/domain/observation/__tests__/semantic-policy.test.ts`
  - `src/infrastructure/environment/env.ts`
  - `src/infrastructure/environment/__tests__/env.test.ts`
  - `src/infrastructure/supabase/adapters/observation-row.ts`
  - `src/infrastructure/supabase/adapters/__tests__/observation-row.test.ts`
  - `src/infrastructure/supabase/client/__tests__/create-supabase-infrastructure-client.test.ts`
  - `supabase/migrations/20260605_0018_observation_llm_source.sql`
- Verification:
  - `npm run typecheck` -> pass
  - `npm test` -> pass (`82` files, `287` tests)
  - `npm run lint` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-05T07-28-33-856Z.log`
- Notes:
  - Capture now prefers validated LLM observation extraction and falls back to the deterministic scaffold when extraction is unsafe, invalid, or unavailable.
  - Observation persistence remains compatible with existing downstream Latent and reflection paths via the existing `CreateObservationInput` shape.
  - A new explicit observation source `system_llm_extract` distinguishes LLM-generated observation provenance from deterministic scaffold output.

## 2026-06-04 - Orientation Layer Layout Convergence Pass

- Phase: BUILD
- Touched boundaries:
  - `src/ui/object-orientation/object-orientation-layer.tsx`
  - `src/ui/object-orientation/object-orientation-layer.module.css`
  - `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`
- Verification:
  - `npm test` -> pass (`81` files, `279` tests)
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-04T19-45-48-974Z.log`
  - Desktop screenshot to be captured manually by owner
- Notes:
  - A corrupted ignored `.next/dev/types` artifact blocked an intermediate `typecheck` / `build` run.
  - Removing the stale generated `.next/dev/types` files restored clean `typecheck` and `build` results without source changes.

## Historical Reset Baseline

Date: 2026-05-24

1. Documentation authority split completed:
- `docs/canon/`
- `docs/runtime/`
- `docs/archive/legacy-transition/`

2. Legacy runtime/application trees removed (clean-room reset performed).
3. Legacy artifacts/build leftovers removed.
4. Remaining `.worktrees/` filesystem residue noted as non-canonical blocker.

## Clean-room Build Backfill (retrospective)

Date window: 2026-05-24 to 2026-05-25
Source references: `supabase/migrations/20260524_0001` .. `20260525_0012`, runtime/UI/composition route code, and ticket outputs.

### Phase 1 - Foundation Skeleton
- Domain-first structure established: `app/`, `src/domain`, `src/runtime`, `src/cognition`, `src/reflective-space`, `src/infrastructure`, `src/ui`, `src/shared`.
- Thin-route and reflective-space-first boundaries established.

### Phase 2 / 2b - Reflective Object Persistence + Ownership Hardening
- Reflective object persistence model introduced.
- User ownership + RLS hardening introduced.
- References:
  - `supabase/migrations/20260524_0001_reflective_objects.sql`
  - `supabase/migrations/20260524_0002_reflective_objects_rls.sql`

### Phase 3 - Observation Layer Scaffold
- Observation entities + persistence introduced.
- Evidence-linked descriptive observation boundaries established.
- Reference: `supabase/migrations/20260524_0003_observations.sql`

### Phase 4 - Glossary Memory Scaffold
- Glossary continuity memory + candidate/suppression persistence introduced.
- Reference: `supabase/migrations/20260524_0004_glossary_memory.sql`

### Phase 5 - Reflective Thread Scaffold
- Durable thread continuity structures + object/glossary associations introduced.
- Reference: `supabase/migrations/20260524_0005_reflective_threads.sql`

### Phase 5b - Reflective Response Scaffold
- User-authored reflective response persistence + associations introduced.
- Reference: `supabase/migrations/20260524_0006_reflective_responses.sql`

### Phase 6 - Latent Scaffold + Write Protection
- Latent snapshots/signals/suggestions persistence introduced with bounded confidence/visibility.
- Canonical-state non-mutation boundary maintained.
- Reference: `supabase/migrations/20260524_0007_latent_scaffold.sql`

### Phase 6b - Runtime Integrity Audit + Boundary Hardening
- Cross-layer boundary checks and hardening applied (read-only composition, no latent authority leak, thin routes).
- Verification culture established across typecheck/lint/test/build gates.

### Phase 7 / 7b / 7c - Openings + Cadence + Suppression Lifecycle
- Opening infrastructure introduced with user-gating and optional surfacing.
- Cadence/dedupe/silence-first behavior introduced.
- Suppression lifecycle + revisit policy introduced.
- References:
  - `supabase/migrations/20260524_0008_openings.sql`
  - `supabase/migrations/20260524_0009_opening_suppression_lifecycle.sql`

### Phase 8 / 8b - Opening-to-Response Bridge + Revisitable Dialogue Read Model
- Opening activation events + opening-response associations introduced.
- Activation-without-response legitimacy preserved.
- Bridge FK issue fixed by adding `(id, user_id)` uniqueness for owner-safe composite references.
- Reference: `supabase/migrations/20260524_0010_opening_response_bridge.sql`

### Phase 9 / 9b / 9c - Reflective Space UI + Viewport API + Guardrails
- Minimal contemplative Reflective Space UI integrated.
- Backend-composed `/api/reflective-space/viewport` read path introduced.
- Viewport guardrails, section windows, bounded dialogue windows, and anti-feed constraints hardened.
- Read-path index hygiene added.
- References:
  - `supabase/migrations/20260525_0012_viewport_read_path_indexes.sql`
  - `docs/runtime/reflective-space-viewport-guardrails-v1.md`

### Phase 10 - User Auth + Admin Bootstrap
- Supabase auth flow integrated for protected Reflective Space access.
- Minimal admin bootstrap boundary introduced.
- Reference: `supabase/migrations/20260525_0011_user_admin_bootstrap.sql`

## Known Ongoing Risks

- Large historical dirty-worktree residue can hide unrelated diffs during reviews.
- Cursor stability and section caps should stay under regression tests as data volume grows.
- Build logging discipline depends on consistent use of `npm run build` (now enforced by documented process + wrapper).

## New Entry (2026-05-25)

### Stabilization Observability + Process Hardening

- Backfilled this ledger with clean-room Phase 1-10 + hardening sequence from repository evidence.
- Added mandatory build logging wrapper:
  - `scripts/run-build-with-log.mjs`
  - `docs/BUILD_LOG.md`
  - `docs/build-logs/`
- Wired `npm run build` to always write summary + full-output build logs.
- Added process guardrails in:
  - `AGENTS.md`
  - `docs/README.md`

## New Entry (2026-05-25 UTC)

### Phase 11 - Observation Semantic Boundary Guardrails v1 (Infrastructure Hardening)

- Ticket type: BUILD / COGNITION-INFRASTRUCTURE / SAFETY-HARDENING.
- Scope delivered:
  - semantic boundary gate at Observation ingress,
  - provenance + evidence-strength seam persistence,
  - summary-to-fragment trace linkage seam,
  - explicit latent backflow prevention on durable observation writes,
  - recurrence candidate trust hardening,
  - thin ontology-preparation extension seams.

Touched boundaries:
- Domain contracts and policy:
  - `src/domain/observation/types.ts`
  - `src/domain/observation/http-contract.ts`
  - `src/domain/observation/semantic-policy.ts`
- Observation route boundary:
  - `app/api/reflective-objects/[id]/observations/route.ts`
- Observation persistence adapters/repository:
  - `src/infrastructure/supabase/adapters/observation-row.ts`
  - `src/infrastructure/supabase/repositories/observation-supabase-repository.ts`
- Recurrence trust in latent scaffold:
  - `src/cognition/latent/latent-engine.ts`
- Schema hardening:
  - `supabase/migrations/20260525_0013_observation_semantic_guardrails.sql`
- Tests updated/added across observation + recurrence paths.

Architectural impact:
- Observation durability now requires descriptive semantic pass before persistence.
- Interpretive and insufficient-evidence payloads are blocked from durable Observation state.
- Observation records now carry explicit semantic/provenance/boundary metadata for future auditability.

Known limitations:
- Guardrail evaluator is heuristic v1 and may require iterative tuning for edge phrasing.
- Historical observations rely on migration defaults for new boundary columns.
- B-level ontology dimensions (agency/metacognition/affect transitions) are still pending.

Future-safe note:
- This phase hardens infrastructure boundaries only; it does not complete ontology expansion or latent redesign.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-25T21-02-55-337Z.log`

## New Entry (2026-05-25 UTC)

### Phase 12 - Observation Ontology Slice v1 (Agency States + Metacognitive Moments)

- Ticket type: BUILD / ONTOLOGY / OBSERVATION-BLEVEL.
- Scope delivered:
  - first-class Observation categories added: `agency_state`, `metacognitive_moment`,
  - bounded extraction support for explicit agency/metacognitive phenomenology cues,
  - semantic policy coherence integration for new categories,
  - evidence/provenance compatibility preserved for new dimensions,
  - latent-safe consumption seam added without Observation backflow.

Touched boundaries:
- Observation domain and category contracts:
  - `src/domain/observation/types.ts`
  - `src/domain/observation/semantic-policy.ts`
  - `src/domain/observation/README.md`
- Extraction scaffold:
  - `src/cognition/observation/descriptive-observation-scaffold.ts`
- Latent seam calibration (downstream-only):
  - `src/cognition/latent/latent-engine.ts`
- Supabase row adapters:
  - `src/infrastructure/supabase/adapters/observation-row.ts`
  - `src/infrastructure/supabase/adapters/glossary-row.ts`
- Minimal schema extension:
  - `supabase/migrations/20260525_0014_observation_ontology_slice_agency_metacognition.sql`
- Tests:
  - `src/domain/observation/__tests__/semantic-policy.test.ts`
  - `src/domain/observation/__tests__/http-contract.test.ts`
  - `src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts`
  - `src/cognition/latent/__tests__/latent-engine.test.ts`

Architectural impact:
- Observation can now persist agency and metacognitive phenomenology as explicit substrate dimensions.
- Semantic hardening remains active; interpretive and authoritative phrasing still rejected at ingress.
- Latent can consume the new dimensions probabilistically (`internal_only` signal) without mutating durable Observation truth.

Known limitations:
- Category detection remains cue-based and intentionally conservative.
- Agency/metacognitive transition granularity is partial (not full B-level ontology coverage yet).
- No reflective-space surfacing expansion was introduced in this slice.

Future-safe note:
- This phase is a bounded ontology slice, not full ontology completion.
- Next slices should follow the same pattern: semantic boundary first, thin category expansion second.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-25T21-30-29-868Z.log`

## New Entry (2026-05-26 UTC)

### Phase 13 - Observation Ontology Slice v2 (Affect Transitions + Contradiction + Atmosphere)

- Ticket type: BUILD / ONTOLOGY / OBSERVATION-BLEVEL.
- Scope delivered:
  - first-class Observation categories added:
    - `affect_transition`
    - `emotional_contradiction`
    - `affective_atmosphere`
  - semantic boundary integration for new affect categories (coherence + anti-interpretive enforcement),
  - bounded extraction cue support for affect transitions, contradiction, and atmospheric affect structure,
  - additive schema/category-constraint extension for observation and glossary category lineage,
  - latent-safe downstream seam extension without Observation backflow.

Touched boundaries:
- Observation domain and semantic policy:
  - `src/domain/observation/types.ts`
  - `src/domain/observation/semantic-policy.ts`
  - `src/domain/observation/README.md`
- Extraction scaffold:
  - `src/cognition/observation/descriptive-observation-scaffold.ts`
- Latent seam calibration (downstream-only):
  - `src/cognition/latent/latent-engine.ts`
- Supabase adapters:
  - `src/infrastructure/supabase/adapters/observation-row.ts`
  - `src/infrastructure/supabase/adapters/glossary-row.ts`
- Schema extension:
  - `supabase/migrations/20260526_0015_observation_ontology_slice_affect_structure.sql`
- Canon spec:
  - `docs/canon/observation-ontology-slice-spec-v2.md`
- Tests:
  - `src/domain/observation/__tests__/semantic-policy.test.ts`
  - `src/domain/observation/__tests__/http-contract.test.ts`
  - `src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts`
  - `src/cognition/latent/__tests__/latent-engine.test.ts`

Architectural impact:
- Observation can now persist affect movement, contradiction, and atmospheric affect as explicit descriptive substrate.
- Semantic hardening remains primary gate; interpretive/diagnostic affect wording is rejected at ingress.
- Latent continues to consume ontology slices probabilistically with `internal_only` seams and no durable backflow.

Known limitations:
- Affect classification remains cue-based and conservative.
- Fine-grained affect intensity calibration is not implemented in this slice.
- Reflective-space surfacing behavior remains intentionally unchanged (substrate-facing slice).

Future-safe note:
- This phase is a bounded ontology slice and not full affect ontology completion.
- Further affect enrichment should keep the same sequence: semantic boundary integrity before representational breadth.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T04-15-28-421Z.log`

## New Entry (2026-05-26 UTC)

### Phase 14 - Observation B3 Completion + Runtime Alignment v1 (Spatial Instability + Dream-State Phenomenology)

- Ticket type: BUILD / ONTOLOGY-ALIGNMENT / OBSERVATION.
- Scope delivered:
  - first-class Observation categories added:
    - `spatial_instability`
    - `dream_state_quality`
    - `continuity_fragment`
    - `altered_realism`
  - semantic boundary expansion for metaphysical/spiritual authority rejection while preserving phenomenological dream wording,
  - bounded extraction cue support for spatial/dream-state instability with lightweight flattening mitigation,
  - additive schema/category-constraint extension for observation fragments and glossary source-category lineage,
  - latent-safe downstream seam extension (`internal_only`, low-confidence) without Observation backflow,
  - roadmap/runtime reconciliation plus canonical v3 slice spec creation.

Touched boundaries:
- Observation domain and semantic policy:
  - `src/domain/observation/types.ts`
  - `src/domain/observation/semantic-policy.ts`
  - `src/domain/observation/README.md`
- Extraction scaffold:
  - `src/cognition/observation/descriptive-observation-scaffold.ts`
- Latent seam calibration (downstream-only):
  - `src/cognition/latent/latent-engine.ts`
- Supabase adapters:
  - `src/infrastructure/supabase/adapters/observation-row.ts`
  - `src/infrastructure/supabase/adapters/glossary-row.ts`
- Schema extension:
  - `supabase/migrations/20260526_0016_observation_ontology_slice_spatial_dreamstate.sql`
- Canon/roadmap docs:
  - `docs/canon/Observation-Ontology-Slice-Spec-v3-Spatial-DreamState.md`
  - `docs/superpowers/plans/2026-05-25-observation-architecture-completion-roadmap-v1.md`
- Tests:
  - `src/domain/observation/__tests__/semantic-policy.test.ts`
  - `src/domain/observation/__tests__/http-contract.test.ts`
  - `src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts`
  - `src/cognition/latent/__tests__/latent-engine.test.ts`

Architectural impact:
- Repo runtime now includes explicit B3 spatial/dream-state descriptive substrate categories end-to-end (types, validation, extraction, adapters, schema constraints, latent seam).
- Semantic guardrails now block metaphysical authority drift cases identified in the 2026-05-26 drift audit while still allowing uncertain phenomenological dream language.
- Extraction remains conservative and omission-friendly with reduced broad actor-regex dominance and reduced tiny-fragment context loss.

Known limitations:
- Category detection remains cue-based and intentionally bounded.
- Dream-state/metaphysical phrasing coverage is heuristic and may need iterative edge-case tuning.
- Reflective-space surfacing remains intentionally unchanged (substrate-facing completion ticket).

Reconciliation note:
- This phase resolves B3 alignment drift identified by audit:
  - `docs/superpowers/audits/2026-05-26-observation-b-level-slice-drift-review-v1.md`

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T04-50-59-032Z.log`

## New Entry (2026-05-26 UTC)

### Phase 15 - Latent Recalibration v1 Governance Primitives Foundation

- Ticket type: BUILD / COGNITION-GOVERNANCE / LATENT.
- Scope delivered:
  - provenance-aware and evidence-aware latent weighting,
  - uncertainty propagation into confidence shaping and center eligibility,
  - deterministic reflective-center candidate selection with no-center legitimacy,
  - anti-amplification primitives (repetition saturation / weak recurrence suppression),
  - scope discipline for dormant resurfacing (local-overlap gating),
  - silence-preserving demotion behavior with optional-suggestion withholding,
  - bounded processing-mode seam preparation (internal-only phrasing seam).

Touched boundaries:
- Latent governance runtime:
  - `src/cognition/latent/latent-engine.ts`
- Latent governance tests:
  - `src/cognition/latent/__tests__/latent-engine.test.ts`
- Opening cadence anti-amplification tests:
  - `src/cognition/openings/__tests__/opening-cadence-policy.test.ts`
- Latent scaffold route/runtime call sites:
  - `app/api/reflective-objects/[id]/latent-snapshots/route.ts`
  - `src/reflective-space/composition/get-reflective-space-viewport.ts`
- Runtime governance documentation:
  - `docs/runtime/latent-governance-primitives-v1.md`
  - `docs/runtime/README.md`

Architectural impact:
- Latent confidence is no longer static-by-signal; it is now weighted by provenance/evidence/uncertainty quality.
- Weak repeated continuity no longer self-amplifies into recurrence importance.
- Dormant global continuity no longer enters local attention without overlap evidence.
- No-center outcome is now explicit and suggestion surfacing can remain intentionally silent.

Known limitations:
- Heuristic weighting model (not learned calibration).
- Center stabilization is deterministic per invocation but not yet cross-snapshot memory-governed.
- Processing mode behavior is seam-only and does not orchestrate dialogue/runtime modes yet.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T10-56-03-659Z.log`

## New Entry (2026-05-26 UTC)

### Phase 16 - Reflective Center Engine v1 (Lifecycle + Salience + Longitudinal Attenuation)

- Ticket type: BUILD / LATENT / REFLECTIVE-CENTER.
- Scope delivered:
  - durable reflective-center lifecycle payload on latent snapshots,
  - lifecycle states (`possible`, `emerging`, `stabilized`, `weakening`, `dormant`, `suppressed`),
  - user-owned salience integration (highlight proxy, glossary note density, revisitation, explicit emphasis, writing persistence),
  - cross-snapshot attenuation (repetition decay, refractory penalty, cooldown penalty),
  - anti-thrashing hysteresis and bounded center switching,
  - lifecycle-aware demotion + suppression-aware transitions,
  - bounded continuity neighborhood persistence,
  - preservation of no-center/silence legitimacy.

Touched boundaries:
- Latent runtime engine:
  - `src/cognition/latent/latent-engine.ts`
- Latent lifecycle/persistence domain and validation:
  - `src/domain/latent/types.ts`
  - `src/domain/latent/validation.ts`
- Latent persistence adapters:
  - `src/infrastructure/supabase/adapters/latent-row.ts`
- Latent snapshot route integration (history + salience context):
  - `app/api/reflective-objects/[id]/latent-snapshots/route.ts`
- Route test harness updates:
  - `app/api/reflective-objects/[id]/latent-snapshots/__tests__/route.test.ts`
- Lifecycle-focused tests:
  - `src/cognition/latent/__tests__/latent-engine.test.ts`
  - `src/domain/latent/__tests__/validation.test.ts`
- Schema extension:
  - `supabase/migrations/20260526_0017_reflective_center_lifecycle_memory.sql`
- Runtime documentation:
  - `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`
  - `docs/runtime/latent-governance-primitives-v1.md`
  - `docs/runtime/README.md`

Architectural impact:
- Latent center behavior is no longer snapshot-local only; lifecycle continuity is persisted per snapshot and influences subsequent center selection.
- User-owned salience has explicit leverage against recurrence-only inflation while keeping interpretation boundaries internal and probabilistic.
- Cross-snapshot anti-amplification now exists in latent scoring path before continuity expansion.
- Quiet/no-center outcomes remain first-class and test-covered.

Known limitations:
- Highlight salience currently uses bounded proxy + metadata channels in this clean-room schema.
- Lifecycle and attenuation heuristics remain deterministic and may require calibration against broader usage.
- Neighborhood persistence remains intentionally capped/local-first to avoid narrative graph inflation.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T11-59-18-406Z.log`

## New Entry (2026-05-26 UTC)

### Phase 17 - Lifecycle Cooldown Enforcement Patch 1 (Active Governance Gate)

- Ticket type: BUILD / LATENT / GOVERNANCE-PATCH.
- Scope delivered:
  - active cooldown enforcement in lifecycle eligibility and recurrence surfacing,
  - cooldown-aware challenger damping with salience-based override to preserve revisability,
  - cooldown-window extension under repeated challenge pressure during active cooldown,
  - cooldown-aware no-center preservation (`cooldown_active` reason) without forced fallback center,
  - lifecycle test expansion for cooldown reactivation, expiry, no-center coexistence, challenger interaction, extension persistence, and strong-user-salience fairness.

Touched boundaries:
- Latent runtime engine:
  - `src/cognition/latent/latent-engine.ts`
- Lifecycle governance tests:
  - `src/cognition/latent/__tests__/latent-engine.test.ts`
- Runtime documentation:
  - `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`
  - `docs/runtime/latent-governance-primitives-v1.md`

Architectural impact:
- `cooldownUntil` now actively influences reflective cognition rather than persisting as inert metadata.
- Rapid oscillation and weak repetition resurfacing are damped longitudinally while preserving non-locking user-owned salience override.
- Silence legitimacy remains intact under active cooldown pressure.

Known limitations:
- Cooldown enforcement remains deterministic threshold logic and should be tuned with broader production distributions.
- Salience override currently depends on bounded proxy channels (metadata/highlight proxies) until dedicated highlight infrastructure is canonical.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T12-34-48-687Z.log`

## New Entry (2026-05-26 UTC)

### Phase 18 - Center-Scoped Suppression Semantics Patch 2 (Local Reflective Quieting)

- Ticket type: BUILD / LATENT / GOVERNANCE-PATCH.
- Scope delivered:
  - suppression evaluation narrowed from reflective-object scope to continuity-line locality,
  - suppression overlap now requires bounded lineage overlap (center/neighborhood observations, glossary, thread/response, affect-adjacent observation),
  - unrelated continuity lines remain eligible and are not auto-suppressed,
  - suppression precedence over cooldown preserved for overlapping local continuity,
  - no-center/silence legitimacy preserved without forced fallback-center substitution.

Touched boundaries:
- Latent runtime engine:
  - `src/cognition/latent/latent-engine.ts`
- Lifecycle governance tests:
  - `src/cognition/latent/__tests__/latent-engine.test.ts`
- Runtime documentation:
  - `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`
  - `docs/runtime/latent-governance-primitives-v1.md`

Architectural impact:
- Suppression now behaves as local reflective quieting rather than global reflective shutdown at object boundary.
- Continuity neighborhoods stay separable under suppression pressure while anti-thrashing/cooldown/attenuation remain active.

Known limitations:
- Lineage overlap remains heuristic and bounded; no graph-level continuity inference is introduced.
- Locality checks depend on available provenance channels and may need tuning on broader distributions.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T13-01-21-643Z.log`

## New Entry (2026-05-26 UTC)

### Phase 19 - Lifecycle Payload Shape Hardening Patch 3 (Integrity Boundaries)

- Ticket type: BUILD / LATENT / GOVERNANCE-PATCH.
- Scope delivered:
  - strict lifecycle payload validation + normalization introduced as canonical read/write boundary,
  - empty payload (`{}`) treated as lifecycle-empty rather than lifecycle-valid,
  - malformed/partial payloads degraded safely with bounded defaults or lifecycle-null fallback,
  - legacy center columns preserved as bounded compatibility fallback when payload invalid,
  - adapter contract hardened to normalize lifecycle payload before persistence.

Touched boundaries:
- Lifecycle validation primitives:
  - `src/domain/latent/validation.ts`
  - `src/domain/latent/__tests__/validation.test.ts`
- Persistence adapters:
  - `src/infrastructure/supabase/adapters/latent-row.ts`
  - `src/infrastructure/supabase/adapters/__tests__/latent-row.test.ts`
- Runtime documentation:
  - `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`
  - `docs/runtime/latent-governance-primitives-v1.md`

Architectural impact:
- Lifecycle payload is now a deterministic, normalized contract rather than implicitly trusted JSON.
- Invalid lifecycle memory degrades toward lifecycle-null/quiet behavior instead of synthetic continuity execution.
- Adapter read/write semantics align with one canonical lifecycle shape boundary.

Known limitations:
- Integrity hardening is currently adapter/validation-layer bounded (non-throwing), not DB-enforced JSON schema validation.
- Legacy fallback remains intentionally minimal and should eventually be versioned when payload schema evolution begins.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T15-17-04-176Z.log`

## New Entry (2026-05-26 UTC)

### Phase 20 - Response Provenance Locality Hardening Patch 4 (Suppression Lineage Boundaries)

- Ticket type: BUILD / LATENT / GOVERNANCE-PATCH.
- Scope delivered:
  - response provenance narrowed to continuity-local overlap before lifecycle/opening propagation,
  - latent snapshot route switched from broad user-wide response loading to object-local response retrieval,
  - suppression overlap tightened so response overlap cannot trigger suppression on its own,
  - ambiguous locality now degrades toward non-suppression,
  - opening lineage now inherits bounded local response provenance instead of broad carryover.

Touched boundaries:
- Latent runtime engine:
  - `src/cognition/latent/latent-engine.ts`
- Latent lifecycle tests:
  - `src/cognition/latent/__tests__/latent-engine.test.ts`
- Latent snapshot route + route tests:
  - `app/api/reflective-objects/[id]/latent-snapshots/route.ts`
  - `app/api/reflective-objects/[id]/latent-snapshots/__tests__/route.test.ts`
- Response repository contracts + implementation:
  - `src/domain/responses/contracts.ts`
  - `src/infrastructure/supabase/repositories/response-supabase-repository.ts`
- Runtime governance docs:
  - `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`
  - `docs/runtime/latent-governance-primitives-v1.md`

Architectural impact:
- Suppression locality no longer relies on broad response-history inheritance.
- Response lineage is now bounded by object association and local reflective-text overlap.
- Continuity-line suppression requires stronger locality evidence and avoids accidental cross-line collapse.

Known limitations:
- Response locality remains lexical/object-association heuristic, not graph-level continuity reasoning.
- Locality thresholds may still require tuning with broader real-user distributions.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T16-10-52-257Z.log`

## New Entry (2026-05-26 UTC)

### Phase 21 - Observation Provenance Locality Hardening Patch 5 (Continuity-Scoped Suppression Boundaries)

- Ticket type: BUILD / LATENT / GOVERNANCE-PATCH.
- Scope delivered:
  - latent snapshot ingestion tightened to a bounded local-first observation window,
  - observation provenance narrowed to continuity-local subsets via locality scoring,
  - opening provenance now carries bounded observation lineage instead of full object observation history,
  - suppression overlap tightened so broad observation overlap alone does not force strong suppression,
  - ambiguous observation locality now degrades toward non-suppression.

Touched boundaries:
- Latent runtime engine:
  - `src/cognition/latent/latent-engine.ts`
- Latent snapshot route + route tests:
  - `app/api/reflective-objects/[id]/latent-snapshots/route.ts`
  - `app/api/reflective-objects/[id]/latent-snapshots/__tests__/route.test.ts`
- Lifecycle governance tests:
  - `src/cognition/latent/__tests__/latent-engine.test.ts`
- Runtime governance docs:
  - `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`
  - `docs/runtime/latent-governance-primitives-v1.md`

Architectural impact:
- Observation lineage now behaves as nearby reflective continuity memory instead of reflective-object-global carryover.
- Suppression overlap remains center-scoped but now requires stronger locality semantics for observation-driven suppression.
- Shared-object continuity lines remain separable under suppression pressure without weakening silence legitimacy or cooldown behavior.

Known limitations:
- Observation locality selection remains heuristic (category proximity + token lineage cues + bounded windows), not graph-level continuity inference.
- Thresholds and lineage window sizes are deterministic and may need tuning against broader real-user distributions.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T16-39-32-854Z.log`

## New Entry (2026-05-26 UTC)

### Phase 22 - Processing-Mode Orchestration v1 (Bounded Internal Orientation Layer)

- Ticket type: BUILD / LATENT / ORCHESTRATION.
- Scope delivered:
  - lifecycle payload extended with bounded processing-mode state,
  - internal mode orchestration added for `exploratory`, `affective`, `agency_oriented`, `existential`, `continuity_oriented`,
  - mode confidence/uncertainty and no-mode legitimacy implemented,
  - nearby material prioritization seams added (`observations`, `glossary`, `notes`, `responses`, `neighborhood`),
  - cooldown/suppression-compatible mode degradation behavior added,
  - processing-mode state retained as internal-only non-authoritative runtime primitive.

Touched boundaries:
- Latent runtime engine:
  - `src/cognition/latent/latent-engine.ts`
- Latent domain model + validation:
  - `src/domain/latent/types.ts`
  - `src/domain/latent/validation.ts`
  - `src/domain/latent/__tests__/validation.test.ts`
- Latent persistence adapters:
  - `src/infrastructure/supabase/adapters/latent-row.ts`
  - `src/infrastructure/supabase/adapters/__tests__/latent-row.test.ts`
- Latent orchestration tests:
  - `src/cognition/latent/__tests__/latent-engine.test.ts`
- Runtime governance docs:
  - `docs/runtime/latent-processing-modes-and-architecture-clarifications-v1.md`
  - `docs/runtime/latent-governance-primitives-v1.md`
  - `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`
  - `docs/runtime/README.md`

Architectural impact:
- Latent now produces orientation-level processing tendencies without introducing interpretation-layer output.
- Ambiguous or weak mode competition can degrade to no-mode instead of forcing synthetic certainty.
- Lifecycle calmness controls continue to bound orchestration through suppression/cooldown-compatible confidence degradation.

Known limitations:
- Mode scoring remains deterministic heuristic logic and not learned calibration.
- Conflict/no-mode thresholds are bounded constants that may need tuning on broader usage distributions.
- Nearby material prioritization is a preparation seam and not yet connected to downstream dialogue/UX orchestration.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T17-44-03-376Z.log`

## New Entry (2026-05-26 UTC)

### Phase 23 - Homepage Orientation Hub v1 Scaffold (Routes + Payload + Responsive Composition)

- Ticket type: BUILD / HOMEPAGE / ROUTES / PAYLOAD / RESPONSIVE-COMPOSITION.
- Scope delivered:
  - homepage shell replaced with Orientation Hub composition,
  - bounded homepage aggregate composer added in reflective-space composition layer,
  - explicit homepage route target registry added with `implemented` / `placeholder` / `missing` statuses,
  - scaffold routes added for capture, glossary, journal, guide, object orientation, and deep reflection,
  - mobile composition updated to capture-first + 2x2 tile threshold with preview suppression.

Touched boundaries:
- Homepage route + composition wiring:
  - `app/page.tsx`
  - `src/reflective-space/composition/compose-homepage-orientation-payload.ts`
  - `src/reflective-space/composition/homepage-route-target-registry.ts`
- Homepage UI composition:
  - `src/ui/homepage/homepage-orientation-hub.tsx`
  - `src/ui/homepage/homepage-orientation-hub.module.css`
- Shared auth/placeholder scaffolding:
  - `src/ui/shared/require-authenticated-user.ts`
  - `src/ui/shared/calm-placeholder-page.tsx`
  - `src/ui/shared/calm-placeholder-page.module.css`
- New scaffold routes:
  - `app/capture/page.tsx`
  - `app/glossary/page.tsx`
  - `app/journal/page.tsx`
  - `app/guide/page.tsx`
  - `app/objects/[objectId]/page.tsx`
  - `app/objects/[objectId]/reflect/page.tsx`
- Tests:
  - `src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts`

Architectural impact:
- Homepage now consumes a bounded orientation payload and no longer renders as a broad dashboard-like workspace shell.
- Route href/status decisions are centralized in composition registry rather than inferred in UI.
- Mobile homepage uses entry-first tiles and suppresses dense desktop preview lists.

Known limitations:
- Route destinations are scaffold-level placeholders and intentionally minimal for v1 pass.
- Glossary item-level detail route remains `missing` and non-blocking in this scaffold.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Lint: `npm.cmd run lint` (pass)
- Tests: `npm.cmd test` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-26T17-58-59-778Z.log`

## New Entry (2026-05-31 UTC)

### Phase 24 - Internal Transport Boundary for Processing Modes (Governance Patch 6)

- Ticket type: BUILD / LATENT / GOVERNANCE-PATCH.
- Scope delivered:
  - explicit internal vs public latent transport projection layer added,
  - latent snapshot APIs now return public-safe projection payloads by default,
  - internal orchestration internals (`processingMode`, candidates, rationale traces, material priorities, lifecycle weighting internals) removed from default route transport payloads,
  - bounded public lifecycle state retained (`centerState`, `noCenterReason`),
  - public summary transport language sanitized to avoid raw mode/category leakage.

Touched boundaries:
- Latent transport boundary contracts:
  - `src/domain/latent/transport.ts`
  - `src/domain/latent/types.ts`
  - `src/domain/latent/README.md`
- Latent snapshot route transport hardening:
  - `app/api/latent/snapshots/route.ts`
  - `app/api/latent/snapshots/[id]/route.ts`
  - `app/api/reflective-objects/[id]/latent-snapshots/route.ts`
- Boundary verification tests:
  - `src/domain/latent/__tests__/transport.test.ts`
  - `app/api/latent/snapshots/__tests__/route.test.ts`
  - `app/api/latent/snapshots/[id]/__tests__/route.test.ts`
  - `app/api/reflective-objects/[id]/latent-snapshots/__tests__/route.test.ts`
- Runtime boundary documentation:
  - `docs/runtime/latent-processing-modes-and-architecture-clarifications-v1.md`
  - `docs/runtime/latent-governance-primitives-v1.md`
  - `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`
  - `docs/runtime/README.md`

Architectural impact:
- Internal latent orchestration richness is preserved server-side while default route transport contracts now enforce non-interpretive downstream boundaries.
- Processing-mode outputs are explicitly infrastructural and no longer leaked as raw route payload artifacts.
- Future dialogue-preparation can consume internal orchestration intentionally without relying on raw public snapshot payload exposure.

Known limitations:
- Public projection currently applies at route transport boundaries; repository/domain objects remain full-fidelity internal models by design.
- Summary sanitization is deterministic and bounded; future dialogue contracts may replace this with dedicated public continuity summary fields.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-31T11-55-51-742Z.log`

## New Entry (2026-05-31 UTC)

### Phase 25 - True No-Mode Silence (Governance Patch 7)

- Ticket type: BUILD / LATENT / GOVERNANCE-PATCH.
- Scope delivered:
  - removed derived-mode fallback wording when `selectedMode === null`,
  - no-mode reflective-opportunity descriptions now remain mode-silent,
  - no-mode opening phrasing now remains generic and non-orienting,
  - high-uncertainty weak-gravity handling now degrades toward no-mode silence instead of weak exploratory substitution,
  - exploratory/no-mode distinction hardened with explicit regression coverage.

Touched boundaries:
- Latent orchestration behavior:
  - `src/cognition/latent/latent-engine.ts`
- No-mode semantics tests:
  - `src/cognition/latent/__tests__/latent-engine.test.ts`
  - `src/domain/latent/__tests__/transport.test.ts`
  - `app/api/latent/snapshots/[id]/__tests__/route.test.ts`
- Runtime documentation:
  - `docs/runtime/latent-processing-modes-and-architecture-clarifications-v1.md`
  - `docs/runtime/latent-governance-primitives-v1.md`
  - `docs/runtime/README.md`

Architectural impact:
- No-mode is now treated as true orientation absence rather than fallback mode flavor.
- Internal and public payload paths can no longer reconstruct implicit mode flavor from no-mode phrasing paths.
- Exploratory remains available as an explicit mode only when reflective gravity is sufficient.

Known limitations:
- Exploratory/no-mode separation remains deterministic heuristic logic and may require distribution tuning as longitudinal production data grows.
- No-mode semantics are enforced in latent orchestration and transport projection paths; downstream consumers must continue to treat internal payloads as non-authoritative orchestration artifacts.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-05-31T12-29-36-501Z.log`

## New Entry (2026-06-01 UTC)

### Phase 26 - Reflection Entry Activation v1 (Live Orientation -> Reflection Route)

- Ticket type: BUILD / REFLECTION ENTRY / PHASE 1.
- Scope delivered:
  - mounted first live reflection entry route at `/objects/[objectId]/reflect`,
  - replaced route placeholder with real `ReflectiveSpaceWorkspace` mount,
  - added initial center-object hydration from route params into viewport bootstrap,
  - promoted orientation route target `reflective_object_orientation` from `placeholder` to `implemented`,
  - documented route/navigation/hydration/limitations in runtime docs.

Touched boundaries:
- Route activation:
  - `app/objects/[objectId]/reflect/page.tsx`
- Workspace hydration seam:
  - `src/ui/reflective-space/reflective-space-workspace.tsx`
- Orientation navigation target registry:
  - `src/reflective-space/composition/homepage-route-target-registry.ts`
- Regression coverage:
  - `src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts`
- Runtime delivery docs:
  - `docs/runtime/reflection-entry-activation-v1.md`

Architectural impact:
- Users can now enter a live reflection workspace from Orientation Recent Objects without hitting placeholder reflection route walls.
- Reflection viewport loading remains contract-stable and uses existing `centerObjectId` query wiring without payload redesign.
- Refresh preserves entry context through route-param-driven hydration.

Known limitations:
- Capture redesign and automated `Capture -> Observation -> Latent -> Opening` chain are intentionally out of scope in this phase.
- `/objects/[objectId]` and other non-reflection scaffold routes remain placeholders.
- Reflection entry is currently provided through recent object links, not full orientation IA completion.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-01T11-11-02-287Z.log`

## New Entry (2026-06-01 UTC)

### Phase 27 - Capture -> Observation Operational Path v1 (First Real User Input Loop)

- Ticket type: BUILD / CAPTURE / OBSERVATION / PHASE 2.
- Scope delivered:
  - replaced `/capture` placeholder with minimal operational dream capture form,
  - persisted reflective object from user input (`title`, `dreamText`),
  - generated and persisted descriptive observation scaffold from submitted dream text,
  - redirected capture flow to live reflection route `/objects/[objectId]/reflect`,
  - promoted orientation capture route target from `placeholder` to `implemented`.

Touched boundaries:
- Capture route and server action:
  - `app/capture/page.tsx`
  - `app/capture/page.module.css`
- Observation scaffold ingestion path:
  - `src/cognition/observation/descriptive-observation-scaffold.ts` (consumed)
  - `src/infrastructure/supabase/repositories/create-observation-repository.ts` (consumed)
- Reflective object creation path:
  - `src/infrastructure/supabase/repositories/create-reflective-object-repository.ts` (consumed)
- Orientation route status and regression coverage:
  - `src/reflective-space/composition/homepage-route-target-registry.ts`
  - `src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts`
- Runtime delivery docs:
  - `docs/runtime/capture-observation-operational-path-v1.md`

Architectural impact:
- First live user-authored capture loop now persists real input and immediately hands off into mounted reflection workspace.
- No runtime contract redesign was introduced; flow composes existing reflective object + observation domain boundaries.
- Refresh/re-entry behavior is persistence-backed and route-stable via existing reflection hydration seam.

Known limitations:
- Latent/opening generation remains intentionally out of scope for this phase.
- Validation UX remains minimal and non-polished.
- Journal/glossary continuity orchestration remains unchanged.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-01T11-42-09-721Z.log`

## New Entry (2026-06-01 UTC)

### Phase 28 - Latent -> Opening Operational Path v1 (Automatic Reflection Preparation)

- Ticket type: BUILD / LATENT / OPENING / PHASE 3.
- Scope delivered:
  - added automatic reflection preparation trigger on reflection route entry,
  - implemented route/service-level operational chain:
    - `Observation -> Latent Snapshot -> Opening Evaluation`,
  - reused existing latent/opening artifacts on re-entry to avoid duplicate generation,
  - preserved no-opening legitimacy and reflection workspace silence fallback,
  - preserved failure safety by keeping reflection workspace usable when preparation fails.

Touched boundaries:
- Reflection entry route integration:
  - `app/objects/[objectId]/reflect/page.tsx`
- Runtime orchestration service:
  - `src/runtime/orchestration/prepare-latent-opening-for-reflection.ts`
- Orchestration regression coverage:
  - `src/runtime/orchestration/__tests__/prepare-latent-opening-for-reflection.test.ts`
- Runtime delivery docs:
  - `docs/runtime/latent-opening-operational-path-v1.md`

Architectural impact:
- Reflection entry now performs automatic latent/opening preparation without changing schema or API contracts.
- Existing cadence/suppression/cooldown/no-center semantics remain authoritative because the implementation reuses:
  - `buildLatentSnapshotScaffold`
  - `deriveOpeningCandidatesFromLatent`
  - `applyOpeningCadencePolicy`
- Route-level error handling prevents preparation failures from blocking workspace rendering.

Known limitations:
- Reuse detection for latent snapshots is provenance-based (`sourceReflectiveObjects` overlap), not direct object-keyed snapshot ownership.
- No response, continuity, glossary, topology, or dialogue redesign is included in this phase.
- No new opening types or latent cognition rules were introduced.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-01T12-14-41-981Z.log`

## New Entry (2026-06-01 UTC)

### Phase 29 - Response + Continuity Completion v1 (First Closed Reflection Loop)

- Ticket type: BUILD / RESPONSE / CONTINUITY / PHASE 4.
- Scope delivered:
  - verified and kept mounted workspace response authoring path,
  - persisted response-object associations during opening response save for object continuity lineage,
  - scoped reflection viewport response and dialogue surfaces to current reflection object context,
  - added explicit continuity cue in workspace when prior reflection exists for selected object,
  - preserved fallback behavior for no-opening/no-response/no-dialogue and save failures.

Touched boundaries:
- Opening response API persistence path:
  - `app/api/openings/[id]/responses/route.ts`
- Route tests:
  - `app/api/openings/[id]/responses/__tests__/route.test.ts`
- Object-scoped viewport composition:
  - `src/reflective-space/composition/compose-reflective-space-viewport.ts`
- Workspace continuity cue:
  - `src/ui/reflective-space/reflective-space-workspace.tsx`
- Runtime delivery docs:
  - `docs/runtime/response-continuity-completion-v1.md`

Architectural impact:
- Response saves now preserve object context explicitly through response-object associations.
- Refresh/re-entry on `/objects/[objectId]/reflect` now uses object-scoped response/dialogue surfaces for clearer remembered-reflection continuity.
- No schema/migration changes were required.

Known limitations:
- Continuity cue is intentionally MVP-level and does not include advanced thread navigation/topology views.
- No glossary/highlight integration was added in this phase.
- Dialogue UX model remains bounded archive view (no redesign).

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-01T15-57-40-035Z.log`

## New Entry (2026-06-01 UTC)

### Phase 30 - Homepage Orientation Hub P0 Experiential Convergence Pass

- Ticket type: BUILD / UX / HOMEPAGE / EXPERIENTIAL-CONVERGENCE.
- Scope delivered:
  - removed homepage hero copy block so homepage opens directly into panel composition,
  - restored Capture panel as immediate first visual entry by structure (no replacement hero/onboarding content),
  - moved auth/session controls out of primary homepage hierarchy into a low-emphasis secondary utility disclosure.

Touched boundaries:
- Homepage route composition:
  - `app/page.tsx`
  - `app/page.module.css`
- Homepage UI composition:
  - `src/ui/homepage/homepage-orientation-hub.tsx`
  - `src/ui/homepage/homepage-orientation-hub.module.css`

Architectural impact:
- No runtime, payload, orchestration, route-registry, preview-count, or mobile tile contract changes.
- Homepage now starts with orientation panel structure itself, reducing launcher/app-shell first-fold pressure.
- Session controls remain accessible while no longer competing with orientation panels in first-fold hierarchy.

Known limitations:
- This pass is intentionally P0-only and does not redesign panel visuals/copy system-wide.
- Screenshots were not generated in this terminal-only execution context.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Lint: `npm.cmd run lint` (pass)
- Tests: `npm.cmd test` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-01T20-25-18-322Z.log`

## New Entry (2026-06-01 UTC)

### Phase 31 - Homepage Orientation Hub P1 Visual Hierarchy Convergence Pass

- Ticket type: BUILD / UX / HOMEPAGE / VISUAL-HIERARCHY.
- Scope delivered:
  - homepage copy switched to Hungarian-first at UI level for orientation panel labels and CTA language,
  - Capture panel upgraded to distinct primary entry surface with atmospheric background image (`public/home/capture_day.png`) and readability-preserving overlay,
  - glossary/journal/guide explicit "Open ..." CTA buttons removed; entry behavior moved to panel-surface linking,
  - panel hierarchy rebalanced (primary/secondary/tertiary visual weighting) with reduced secondary competition and tighter viewport-fit spacing,
  - homepage-specific vertical rhythm tightened to preserve one-surface orientation feel on common desktop heights.

Touched boundaries:
- Homepage route shell:
  - `app/page.tsx`
  - `app/page.module.css`
- Homepage UI composition:
  - `src/ui/homepage/homepage-orientation-hub.tsx`
  - `src/ui/homepage/homepage-orientation-hub.module.css`

Architectural impact:
- No runtime, payload shape, orchestration, cognition, route registry, or preview count contract changes were introduced.
- Capture now carries stronger entry gravity without introducing new homepage features.
- Secondary panels are visually demoted while preserving bounded orientation composition behavior.

Known limitations:
- Automated screenshot generation could not be completed without adding local Playwright test dependency; dependency was not added to respect ticket constraints.
- Dynamic user-generated preview text may still contain non-Hungarian content when source data is non-Hungarian.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Lint: `npm.cmd run lint` (pass)
- Tests: `npm.cmd test` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-01T20-41-47-466Z.log`

## New Entry (2026-06-02 UTC)

### Phase 32 - Homepage Orientation Hub P1.1 Polish Pass

- Ticket type: BUILD / UX / HOMEPAGE / POLISH.
- Scope delivered:
  - typography foundation switched to `Space Grotesk` (display) + `Source Sans 3` (text) through root layout font wiring,
  - session/admin controls moved from in-flow accordion into a compact floating lower-left utility rail,
  - Capture surface converted to full-surface entry interaction with single overlay link and non-interactive affordance chip,
  - duplicate Capture CTA wording removed,
  - Capture visual layering softened and hierarchy stabilized with calmer image treatment and hover/focus behavior,
  - Hungarian-first homepage copy encoding repaired at component level.

Touched boundaries:
- Global font shell:
  - `app/layout.tsx`
- Homepage route shell:
  - `app/page.tsx`
  - `app/page.module.css`
- Homepage UI composition:
  - `src/ui/homepage/homepage-orientation-hub.tsx`
  - `src/ui/homepage/homepage-orientation-hub.module.css`
- Utility controls:
  - `src/ui/auth/session-controls.tsx`
  - `src/ui/auth/session-controls.module.css`

Architectural impact:
- No runtime, payload, route, or orchestration contract changes were introduced.
- Homepage composition remains structurally identical while Capture now behaves as an entry surface rather than a peer card.
- Utility controls remain accessible without consuming homepage orientation space.

Known limitations:
- Screenshot generation was not repeated in this pass.
- Source-derived preview content can still reflect the language of stored user data.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Lint: `npm.cmd run lint` (pass)
- Tests: `npm.cmd test` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-02T06-55-56-165Z.log`

## New Entry (2026-06-02 UTC)

### Phase 33 - Homepage Orientation Hub P1.2 Final Polish and Bugfix Pass

- Ticket type: BUILD / UX / HOMEPAGE / BUGFIX / POLISH.
- Scope delivered:
  - replaced unicode escape sequences in homepage-facing strings with direct Hungarian text to prevent immersion-breaking literal escape rendering,
  - tightened homepage vertical rhythm and reduced excess whitespace below the composition,
  - softened Capture surface image treatment with stronger overlay and reduced visual lift,
  - preserved full-surface Capture interaction while simplifying its affordance posture,
  - normalized remaining homepage utility copy to proper Hungarian diacritics.

Touched boundaries:
- Homepage route shell:
  - `app/page.tsx`
  - `app/page.module.css`
- Homepage UI composition:
  - `src/ui/homepage/homepage-orientation-hub.tsx`
  - `src/ui/homepage/homepage-orientation-hub.module.css`
- Utility controls:
  - `src/ui/auth/session-controls.tsx`

Architectural impact:
- No runtime, payload, route, or orchestration changes were introduced.
- Homepage remains structurally identical while final text/rendering and compositional polish issues are resolved.

Known limitations:
- Screenshot capture was not rerun in this pass.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Lint: `npm.cmd run lint` (pass)
- Tests: `npm.cmd test` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-02T07-15-05-654Z.log`

## New Entry (2026-06-02 UTC)

### Phase 34 - Homepage Capture Surface Correction Pass

- Ticket type: BUILD / UX / HOMEPAGE / CAPTURE-CORRECTION.
- Scope delivered:
  - removed the unwanted `Belépési felület` eyebrow from the Capture panel,
  - replaced the separate title and small affordance with a single large CTA row: `+ Új álom rögzítése`,
  - kept the full Capture surface clickable while simplifying it to one visual action target,
  - centered Capture content horizontally, increased vertical breathing room, and reduced awkward desktop line wrapping,
  - lightened the daytime image treatment so the surface reads brighter and less heavy,
  - added a homepage UI regression test to lock the new Capture markup in place.

Touched boundaries:
- Homepage UI composition:
  - `src/ui/homepage/homepage-orientation-hub.tsx`
  - `src/ui/homepage/homepage-orientation-hub.module.css`
- Homepage UI regression tests:
  - `src/ui/homepage/__tests__/homepage-orientation-hub.test.tsx`

Architectural impact:
- No runtime, payload, route, or orchestration changes were introduced.
- The change is limited to homepage presentation and a targeted UI regression test.

Known limitations:
- Screenshot capture was not produced in this terminal pass.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Lint: `npm.cmd run lint` (pass)
- Tests: `npm.cmd test` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-02T08-49-28-872Z.log`

## New Entry (2026-06-02 UTC)

### Phase 35 - Homepage Capture Typography and Centering Follow-up

- Ticket type: BUILD / UX / HOMEPAGE / POLISH.
- Scope delivered:
  - forced the Capture CTA label onto the display font stack so it no longer falls back to body typography,
  - increased Capture top and bottom padding and slightly expanded its minimum height,
  - vertically centered the homepage panel composition within the desktop page shell while preserving mobile top-flow behavior.

Touched boundaries:
- Homepage route shell:
  - `app/page.module.css`
- Homepage UI composition:
  - `src/ui/homepage/homepage-orientation-hub.module.css`

Architectural impact:
- No runtime, payload, route, or orchestration changes were introduced.
- Changes are limited to homepage layout and typography presentation.

## New Entry (2026-06-03 UTC)

### Phase 36 - Reflective Space Orientation Layer v1

- Ticket type: BUILD / REFLECTIVE SPACE / ORIENTATION.
- Scope delivered:
  - replaced the `/objects/[objectId]` calm placeholder with the first real Orientation Layer route,
  - introduced a dream-first orientation composition with Dream Surface, Glossary Surface, Opening Stack, and Thread Overview,
  - reused existing observation, glossary-candidate, opening, and latent-opening preparation flows instead of creating a parallel runtime,
  - preserved `/objects/[objectId]/reflect` as the Deep Reflection route and used it as the handoff target for title editing and opening entry,
  - added orientation payload, view-model, and UI tests to lock the smallest coherent build in place.

Touched boundaries:
- Object orientation route:
  - `app/objects/[objectId]/page.tsx`
- Reflective-space orientation composition:
  - `src/reflective-space/composition/compose-object-orientation-payload.ts`
  - `src/reflective-space/composition/__tests__/compose-object-orientation-payload.test.ts`
- Object orientation UI:
  - `src/ui/object-orientation/object-orientation-layer.tsx`
  - `src/ui/object-orientation/object-orientation-layer.module.css`
  - `src/ui/object-orientation/view-model.ts`
  - `src/ui/object-orientation/__tests__/view-model.test.ts`
  - `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`

Architectural impact:
- Added a dedicated orientation read-model composition for a single reflective object without changing persistence contracts.
- Reused existing latent opening preparation, opening lifecycle APIs, and glossary extraction/runtime semantics.
- Deep Reflection route behavior remains intact and unchanged in purpose.

Known limitations:
- Opening and thread continuity remain the current runtime approximation; this pass does not add thread topology, emotion surfaces, notes, or deep-reflection redesign.
- Screenshot capture for desktop, laptop, and mobile was not produced in this terminal pass.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Lint: `npm.cmd run lint` (pass)
- Tests: `npm.cmd test` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-03T13-42-25-046Z.log`

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Lint: `npm.cmd run lint` (pass)
- Tests: `npm.cmd test` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-02T08-55-23-599Z.log`

## New Entry (2026-06-03 UTC)

### Phase 37 - Capture Save RLS Infrastructure Key Fix

- Ticket type: BUILD / BUGFIX / CAPTURE / PERSISTENCE.
- Scope delivered:
  - traced the `capture` save failure to server-side Supabase infrastructure writes using the public anon key,
  - verified the live failure mode as RLS rejection on `reflective_objects` writes with anon credentials,
  - updated server-side infrastructure env loading to expose `SUPABASE_SERVICE_ROLE_KEY`,
  - updated the infrastructure client to prefer the service-role key for trusted server persistence while preserving anon fallback,
  - added regression coverage for both environment loading and infrastructure key selection.

Touched boundaries:
- Runtime environment loading:
  - `src/infrastructure/environment/env.ts`
  - `src/infrastructure/environment/__tests__/env.test.ts`
- Server-side Supabase infrastructure client:
  - `src/infrastructure/supabase/client/create-supabase-infrastructure-client.ts`
  - `src/infrastructure/supabase/client/__tests__/create-supabase-infrastructure-client.test.ts`

Architectural impact:
- No schema or route contract changed.
- Server-side repository writes now use the intended privileged server credential when available, which aligns persistence behavior with authenticated capture and reflective-object creation flows.

Verification references:
- Targeted tests: `npm.cmd test -- src/infrastructure/supabase/client/__tests__/create-supabase-infrastructure-client.test.ts src/infrastructure/environment/__tests__/env.test.ts` (pass)
- Typecheck: `npm.cmd run typecheck` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-03T15-03-38-891Z.log`

## New Entry (2026-06-04 UTC)

### Phase 38 - Capture to Orientation Redirect Fix

- Ticket type: BUILD / BUGFIX / ROUTING / CAPTURE.
- Scope delivered:
  - corrected the post-capture redirect target so a newly created reflective object lands on `/objects/[objectId]`,
  - preserved the existing Deep Reflection destination at `/objects/[objectId]/reflect` for orientation-layer handoff and existing reflection links,
  - added a capture-page regression test that exercises the server action and locks the first destination to the orientation route.

Touched boundaries:
- Capture route:
  - `app/capture/page.tsx`
  - `app/capture/page.test.tsx`

Architectural impact:
- No payload, runtime, persistence, or route-shape changes.
- The fix is limited to the first navigation handoff after capture submission.

Verification references:
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Typecheck: `npm.cmd run typecheck` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-04T06-45-09-904Z.log`

## New Entry (2026-06-05 UTC)

### Phase 39 - Observation Ontology Alignment and Schema Enforcement

- Ticket type: BUILD / RUNTIME ALIGNMENT / OBSERVATION.
- Scope delivered:
  - identified live extractor category drift with repository evidence from the Hungarian regression dream probe: `Location`, `Social Interaction`, `Action`, `Response`, `Physical Sensation`, `Visual Perception`, `Overall Feeling`,
  - constrained LLM observation extraction schema categories to the canonical runtime vocabulary via explicit enum enforcement,
  - added deterministic normalization for safe ontology-adjacent aliases such as `affect_state` -> `emotion`, `continuity_candidate` -> `continuity_fragment`, and formatting-only variants,
  - upgraded invalid-category validation diagnostics so fallback logs now include the offending category and the full allowed vocabulary,
  - aligned observation runtime docs and Supabase adapter typing to the same canonical category set.

Touched boundaries:
- Observation extraction runtime:
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/observation-extraction-validation.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`
  - `src/cognition/observation/__tests__/observation-extraction-validation.test.ts`
- Observation domain and persistence typing:
  - `src/domain/observation/README.md`
  - `src/infrastructure/supabase/adapters/observation-row.ts`
- Runtime documentation:
  - `docs/runtime/lumira-observation-extraction-contract-v1.md`

Architectural impact:
- Observation extraction, validation, runtime typing, and persistence now share one explicit category vocabulary.
- The LLM schema no longer permits category labels that cannot be persisted.
- Validator fallback reasons now expose ontology drift immediately instead of collapsing to bare `invalid_category`.

Verification references:
- Targeted tests: `npm.cmd test -- src/cognition/observation/__tests__/llm-observation-extractor.test.ts src/cognition/observation/__tests__/observation-extraction-validation.test.ts src/infrastructure/supabase/adapters/__tests__/observation-row.test.ts` (pass)
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (fails: existing timeouts in `app/api/reflective-objects/[id]/latent-snapshots/__tests__/route.test.ts` and `app/api/reflective-objects/[id]/observations/__tests__/route.test.ts`)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-05T12-38-11-646Z.log`

## New Entry (2026-06-05 UTC)

### Phase 40 - Observation Phenomenological Category Emission Tuning

- Ticket type: BUILD / OBSERVATION / LLM EXTRACTOR.
- Scope delivered:
  - strengthened the LLM observation extractor prompt so it explicitly prefers evidence-backed phenomenological categories over broad descriptive fallbacks,
  - added regression coverage for Hungarian fragments that map to `agency_state`, `metacognitive_moment`, `altered_realism`, and `affect_transition`,
  - added focused latent handoff coverage confirming those center-relevant categories surface as reflective-opportunity material without changing latent thresholds.

Touched boundaries:
- Observation extraction runtime:
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`
- Latent handoff regression coverage:
  - `src/cognition/latent/__tests__/latent-engine.test.ts`

Architectural impact:
- No schema, persistence, semantic-policy, or latent-threshold changes.
- Category vocabulary remains aligned across extractor schema, validation, typing, persistence, and latent consumption.
- Strict evidence validation and repair behavior remain unchanged.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-05T15-59-44-686Z.log`

## New Entry (2026-06-05 UTC)

### Phase 41 - Observation Phenomenology Policy Alignment v1

- Ticket type: BUILD / OBSERVATION / SEMANTIC POLICY ALIGNMENT.
- Scope delivered:
  - aligned semantic-policy coherence cues with explicit phenomenological cases already encouraged by the LLM extractor,
  - added bounded agency cues for refusal, resistance, coercion-adjacent force, escape pressure, slowed movement, and inability-to-reach style control loss,
  - added bounded altered-reality cues for mirror anomaly, missing reflection, distorted reflection, impossible perceived image, and reality-behaving-strangely cases,
  - expanded explicit affect-transition and discontinuity cue coverage without converting generic recurrence into continuity,
  - clarified extractor prompt boundaries between `dream_state_quality`, `altered_realism`, `spatial_instability`, and `continuity_fragment`,
  - added regression coverage for policy acceptance and prompt-boundary guidance without changing latent weights, thresholds, or downstream runtime behavior.

Touched boundaries:
- Observation semantic policy:
  - `src/domain/observation/semantic-policy.ts`
  - `src/domain/observation/__tests__/semantic-policy.test.ts`
- Observation extractor prompt guidance:
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`

Architectural impact:
- Observation remains evidence-first and non-interpretive; this change only narrows false uncertainty for explicit phenomenological cases.
- Category vocabulary, persistence constraints, repair validation, and latent scoring remain unchanged.
- Broad recurrence is still kept separate from explicit discontinuity.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-05T17-59-36-011Z.log`

## New Entry (2026-06-05 UTC)

### Phase 42 - AI-Generated Editable Dream Title v0

- Ticket type: BUILD / CAPTURE / ORIENTATION.
- Scope delivered:
  - added a dedicated AI dream-title helper separate from observation extraction,
  - kept the deterministic capture-title fallback and updated the stored reflective object title only when the AI title succeeds,
  - preserved capture route flow and observation extraction boundaries,
  - added a minimal inline rename affordance on the orientation dream header using the existing reflective-object patch route.

Touched boundaries:
- Capture flow:
  - `app/capture/page.tsx`
  - `app/capture/page.test.tsx`
  - `app/capture/capture-metrics.ts`
- Dedicated dream title generation:
  - `src/cognition/title/llm-dream-title-generator.ts`
  - `src/cognition/title/__tests__/llm-dream-title-generator.test.ts`
- Orientation title editing:
  - `src/ui/object-orientation/object-orientation-layer.tsx`
  - `src/ui/object-orientation/object-orientation-layer.module.css`
  - `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`

Architectural impact:
- No schema changes.
- Observation extractor schema and latent/opening/thread orchestration remain unchanged.
- Title generation is isolated from descriptive observation extraction and remains non-interpretive by prompt contract.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-05T18-30-47-648Z.log`

## New Entry (2026-06-05 UTC)

### Phase 43 - LLM Observation SummaryTrace Alignment v1

- Ticket type: BUILD / OBSERVATION / RUNTIME FIX.
- Scope delivered:
  - made `summaryTrace` explicit in the LLM extraction schema and prompt,
  - added deterministic final `summaryTrace` rebuild from the surviving validated fragments after evidence repair/drop,
  - ensured fragment drop cannot leave stale trace references in the final persisted observation payload,
  - added semantic-policy diagnostics for invalid, stale, and unsupported caller-supplied summary traces without loosening evidence or category guardrails,
  - added regression coverage for missing-trace rebuild, stale-trace survivor rebuild, and the Hungarian phenomenology case that previously risked `summary_trace_missing`.

Touched boundaries:
- Observation extraction:
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`
- Observation semantic policy:
  - `src/domain/observation/semantic-policy.ts`
  - `src/domain/observation/__tests__/semantic-policy.test.ts`

Architectural impact:
- Final Observation runtime order now follows:
  - LLM extraction
  - schema/category validation
  - evidence validation + repair/drop
  - final surviving fragments
  - deterministic `summaryTrace` rebuild
  - semantic policy
  - persist
- Semantic policy remains authoritative; unsupported evidence and interpretive output are still rejected or deferred.
- No latent, opening, thread, glossary, UI, or schema changes.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-05T18-52-27-528Z.log`

## New Entry (2026-06-05 UTC)

### Phase 44 - Orientation Inline Dream Title Editing Polish

- Ticket type: BUILD / ORIENTATION / UI POLISH.
- Scope delivered:
  - reduced the orientation-layer dream title scale slightly,
  - removed the separate rename button and helper copy,
  - moved title editing onto the existing pencil affordance with inline single-line editing,
  - added keyboard-safe save/cancel controls using the existing reflective-object patch route.

Touched boundaries:
- Orientation header title editing:
  - `src/ui/object-orientation/object-orientation-layer.tsx`
  - `src/ui/object-orientation/object-orientation-layer.module.css`
  - `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`

Architectural impact:
- No schema, route-flow, or reflective-space architecture changes.
- Title editing remains local to the orientation header and persists through the existing `PATCH /api/reflective-objects/[id]` boundary.
- A stale generated `.next/dev/types` artifact had to be removed before final verification; no source behavior changed as part of that cleanup.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-05T20-13-28-670Z.log`

## New Entry (2026-06-06 UTC)

### Observation V2 Phase 2 - Separate Discovery Output From Persistence Shape

- Ticket type: BUILD / RUNTIME / OBSERVATION V2.
- Scope delivered:
  - introduced `ObservationDiscoveryResult` as an explicit pre-persistence runtime concept,
  - added a deterministic discovery-to-persistence projection boundary for `ObservationDiscoveryResult -> CreateObservationInput`,
  - refactored scaffold and LLM extraction to produce discovery-oriented intermediates before V1 payload shaping,
  - preserved V1 persistence shape, schema, API surface, UI behavior, glossary behavior, and latent behavior.

Touched boundaries:
- Observation discovery runtime:
  - `src/cognition/observation/observation-discovery.ts`
  - `src/cognition/observation/observation-discovery-projection.ts`
- Observation extraction:
  - `src/cognition/observation/descriptive-observation-scaffold.ts`
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/observation-engine.ts`
- Observation discovery verification:
  - `src/cognition/observation/__tests__/observation-discovery.test.ts`

Architectural impact:
- Observation discovery now exists as its own runtime stage inside cognition.
- Persistence shaping is isolated to a single projection step that emits the unchanged V1 `CreateObservationInput`.
- Semantic policy behavior remains intact with minimal breakage by being preserved at the compatibility boundary rather than forcing a broader runtime rewrite.
- No schema, repository, API contract, UI, glossary, or latent contract changes were introduced.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-06T12-37-23-725Z.log`

## New Entry (2026-06-06 UTC)

### Observation V2 Phase 2.1 - Clean Discovery Boundary Before Derived Summary

- Ticket type: BUILD / RUNTIME / OBSERVATION V2.
- Scope delivered:
  - demoted discovery-owned summary compatibility from top-level `summaryCandidate` to transitional `projectionCompatibility.summaryText`,
  - reduced obvious V1 fragment-shaped coupling by constructing scaffold discovery observations directly and by remapping validated LLM fragments into discovery observations before projection,
  - documented direct HTTP `CreateObservationInput` parsing as a manual/API compatibility ingress rather than the canonical cognition path,
  - preserved cognition flow as `ObservationDiscoveryResult -> projection -> CreateObservationInput` for generation paths.

Touched boundaries:
- Observation discovery boundary:
  - `src/cognition/observation/observation-discovery.ts`
  - `src/cognition/observation/observation-discovery-projection.ts`
- Observation cognition producers:
  - `src/cognition/observation/descriptive-observation-scaffold.ts`
  - `src/cognition/observation/llm-observation-extractor.ts`
- Observation compatibility ingress:
  - `src/domain/observation/http-contract.ts`
  - `app/api/reflective-objects/[id]/observations/route.ts`
- Verification:
  - `src/cognition/observation/__tests__/observation-discovery.test.ts`
  - `src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts`
  - `src/cognition/observation/__tests__/observation-engine.test.ts`

Architectural impact:
- Discovery output is now more clearly observation-first and no longer implies top-level summary ownership.
- V1 summary compatibility behavior remains available only as transitional projection metadata.
- Manual POST creation remains intentionally parallel for compatibility, with explicit inline documentation.
- No schema, API behavior, UI behavior, glossary behavior, latent behavior, or semantic-policy behavior changes were introduced.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-06T13-43-38-945Z.log`

## New Entry (2026-06-06 UTC)

### Observation V2 Phase 3 - Derive Summary From Discovery Output

- Ticket type: BUILD / RUNTIME / OBSERVATION V2.
- Scope delivered:
  - moved V1 summary ownership fully into projection by deriving `CreateObservationInput.summary` from ordered `ObservationDiscoveryResult.observations`,
  - kept `projectionCompatibility.summaryText` only as a transitional fallback when ordered discovery observations cannot produce a usable summary,
  - added a safe generic summary fallback for preserve-defaults compatibility cases where neither discovery observations nor compatibility summary can produce text,
  - removed scaffold-only summary-trace injection so scaffold projection now rebuilds `summaryTrace` from the same derived summary behavior used by the general projection path.

Touched boundaries:
- Observation discovery projection:
  - `src/cognition/observation/observation-discovery-projection.ts`
- Scaffold compatibility path:
  - `src/cognition/observation/descriptive-observation-scaffold.ts`
- Verification:
  - `src/cognition/observation/__tests__/observation-discovery.test.ts`
  - `src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts`

Architectural impact:
- Projection is now the canonical summary-shaping boundary for cognition-driven Observation V2 flow.
- Summary precedence is now:
  - ordered discovery observations
  - transitional compatibility summary
  - safe generic fallback
- V1 persistence shape remains unchanged, including `summary`, `summaryTrace`, and fragment persistence contracts.
- Manual HTTP `CreateObservationInput` ingress remains transitional and parallel by design; this phase does not remove it.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass: `88` files, `330` tests)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-06T14-11-34-104Z.log`

## New Entry (2026-06-06 UTC)

### Observation V2 Phase 4 - Native Multi-Observation Support In Discovery

- Ticket type: BUILD / RUNTIME / OBSERVATION V2.
- Scope delivered:
  - introduced a discovery-level shared-evidence registry so multiple observations can reference one evidence span without duplicating discovery metadata,
  - changed discovery observations from inline `spans[]` storage to `spanIds[]` references against bundle-local `evidenceSpans`,
  - added internal discovery metrics for observation count and evidence span count,
  - expanded scaffold fallback so one sentence can safely emit multiple clause observations while preserving one shared source-evidence span,
  - preserved V1 persistence projection by resolving discovery evidence references back into the existing fragment payload shape.

Touched boundaries:
- Observation discovery runtime:
  - `src/cognition/observation/observation-discovery.ts`
  - `src/cognition/observation/observation-discovery-projection.ts`
- Observation cognition producers:
  - `src/cognition/observation/descriptive-observation-scaffold.ts`
  - `src/cognition/observation/llm-observation-extractor.ts`
- Verification:
  - `src/cognition/observation/__tests__/observation-discovery.test.ts`
  - `src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts`
  - `src/cognition/observation/__tests__/observation-extraction-validation.test.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`

Architectural impact:
- Discovery now models shared evidence explicitly as bundle-local evidence spans plus observation references.
- Projection remains the only V1 shaping boundary; schema, API contracts, UI behavior, and repository persistence stay unchanged.
- Structured normalization and LLM validation continue accepting repeated evidence snippets, but discovery now preserves them as one shared span before projection.
- Manual HTTP `CreateObservationInput` ingress remains a compatibility-era parallel path and is still outside the discovery-native model.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass: `88` files, `334` tests)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-06T15-06-09-195Z.log`

## New Entry (2026-06-06 UTC)

### Observation V2 Phase 5 - Internal Salience Profiles (Inline Hybrid)

- Ticket type: BUILD / RUNTIME / OBSERVATION V2.
- Scope delivered:
  - introduced bounded internal salience profiles for discovery observations with Phase 5 v1 dimensions:
    - `anomaly`
    - `agencyTension`
    - `metacognitivePresence`
  - extended the existing single LLM extraction schema so fragments may propose inline salience without adding a second provider pass,
  - normalized salience after discovery assembly by removing unknown dimensions, dropping unsupported values, and rejecting obviously unsupported metacognitive salience,
  - added conservative scaffold salience generation for anomaly, agency tension, and explicit dream-awareness cues,
  - kept projection, persistence, API, UI, latent, and glossary behavior unchanged by ignoring salience on the V1 bridge.

Touched boundaries:
- Observation salience runtime:
  - `src/domain/observation/salience.ts`
  - `src/cognition/observation/observation-salience.ts`
- Observation discovery and extraction:
  - `src/cognition/observation/observation-discovery.ts`
  - `src/cognition/observation/observation-extraction-validation.ts`
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/descriptive-observation-scaffold.ts`
- V2 observation projection surface:
  - `src/domain/observation/v2.ts`
- Verification:
  - `src/cognition/observation/__tests__/observation-discovery.test.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`
  - `src/cognition/observation/__tests__/descriptive-observation-scaffold.test.ts`
  - `src/domain/observation/__tests__/v2.test.ts`

Architectural impact:
- Observation salience now exists as an internal Observation V2 concept attached to `ObservationDiscoveryObservation`.
- The validated LLM path can propose salience inline, but deterministic normalization remains the final guardrail.
- Scaffold fallback produces conservative salience only; it does not attempt parity with validated LLM nuance.
- The V1 bridge still projects `ObservationDiscoveryResult` to `CreateObservationInput` without salience fields, preserving storage and downstream compatibility.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass: `88` files, `342` tests)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-06T16-11-48-548Z.log`

## New Entry (2026-06-06 UTC)

### Observation LLM Structured Output Salience Schema Fix

- Ticket type: BUILD / RUNTIME / OBSERVATION V2.
- Scope delivered:
  - fixed the OpenAI structured-output `salience` JSON schema so every declared nested property is listed in nested `required`,
  - kept `anomaly`, `agencyTension`, and `metacognitivePresence` as nullable enums with values `present | strong | null`,
  - preserved optional `salience` at the fragment level while making provided salience objects strict-schema compliant,
  - added regression coverage for schema construction and parsing of `null` salience dimensions.

Touched boundaries:
- Observation extraction schema:
  - `src/cognition/observation/llm-observation-extractor.ts`
- Verification:
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`

Architectural impact:
- This change is limited to the OpenAI response-format contract and extractor regression coverage.
- Discovery normalization still treats `null` salience dimensions as absent while preserving supported non-null dimensions.
- Persistence, API, UI, latent, and glossary boundaries remain unchanged.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass: `88` files, `343` tests)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-06T19-36-34-135Z.log`

## New Entry (2026-06-06 UTC)

### Capture Path Hard-Fail On Observation LLM Failure

- Ticket type: BUILD / RUNTIME / CAPTURE.
- Scope delivered:
  - removed the capture-route scaffold fallback for observation generation,
  - changed capture to require validated LLM observation extraction before any dream object or observation is persisted,
  - redirected failed observation analysis back to `/capture?error=analysis` instead of saving partial capture state,
  - preserved title generation as best-effort metadata enrichment after validated observation success,
  - added repository support for caller-supplied reflective object ids so capture can generate the object id before persistence and still keep the flow all-or-nothing.

Touched boundaries:
- Capture route:
  - `app/capture/page.tsx`
  - `app/capture/page.test.tsx`
- Reflective object creation contract:
  - `src/domain/reflective-objects/types.ts`
  - `src/infrastructure/supabase/adapters/reflective-object-row.ts`
- Observation extraction runtime:
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`

Architectural impact:
- Capture no longer treats deterministic scaffold observation output as an acceptable success path.
- Observation LLM success is now a hard prerequisite for persistence in the manual dream capture flow.
- Partial persistence is prevented by generating the reflective object id before save and writing only after validated extraction returns.
- This hard-fail policy is currently scoped to capture and does not remove scaffold behavior from unrelated observation runtime surfaces.

Verification references:
- Typecheck: `npm.cmd run typecheck` (pass)
- Tests: `npm.cmd test` (pass: `88` files, `345` tests)
- Lint: `npm.cmd run lint` (pass)
- Build: `npm.cmd run build` (pass)
- Build log: `docs/BUILD_LOG.md` -> `docs/build-logs/2026-06-06T20-06-31-296Z.log`

## 2026-06-07 - Observation Extraction Schema + Timeout Stabilization

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`
  - `src/cognition/observation/__tests__/observation-salience.test.ts`
- Verification:
  - `npm run typecheck` -> pass
  - `npm test` -> pass (`89` files, `346` tests)
  - `npm run lint` -> pass
  - `npm run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-07T06-08-18-959Z.log`
- Notes:
  - Re-encoded the nullable observation `salience` response-format field as an `anyOf` object-or-null schema so the nested object branch keeps explicit required keys for `anomaly`, `agencyTension`, and `metacognitivePresence`.
  - Raised the observation extraction OpenAI timeout to `40_000ms`; the inspected runtime source previously used `25_000ms`.
  - Existing fallback diagnostics remained sufficient: capture still logs `llm_observation_extraction_failed` with the extractor reason, and extractor-level provider/repair/evidence failures remain logged with bounded detail.

## 2026-06-10 - Sleep & Dream Guide Route v1

- Phase: BUILD
- Touched boundaries:
  - `app/guide/page.tsx`
  - `src/ui/guide/view-model.ts`
  - `src/ui/guide/guide-workspace.tsx`
  - `src/ui/guide/guide-card.tsx`
  - `src/ui/guide/guide-modal.tsx`
  - `src/ui/guide/guide-tips.tsx`
  - `src/ui/guide/guide-safety-note.tsx`
  - `src/ui/guide/guide-related-cards.tsx`
  - `src/ui/guide/guide-workspace.module.css`
  - `src/reflective-space/composition/homepage-route-target-registry.ts`
  - `app/guide/page.test.tsx`
  - `src/ui/guide/__tests__/view-model.test.ts`
  - `src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts`
- Verification:
  - `npm.cmd test -- app/guide/page.test.tsx src/ui/guide/__tests__/view-model.test.ts src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts` -> pass (`3` files, `9` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-10T10-37-42-510Z.log`
- Notes:
  - Replaced the `/guide` placeholder with a public Sleep & Dream Guide route backed by the existing guide card content and search helpers.
  - Added guide-specific filtering, responsive card grid, modal detail flow, related-card switching, and route-scoped semantic guide tokens for category, safety, and surface treatments.
  - Updated the homepage route target registry so `guide_home` now resolves as an implemented route.

## 2026-06-10 - Sleep & Dream Guide Polish v1

- Phase: BUILD
- Touched boundaries:
  - `app/guide/page.test.tsx`
  - `src/ui/guide/__tests__/guide-modal.test.tsx`
  - `src/ui/guide/__tests__/view-model.test.ts`
  - `src/ui/guide/view-model.ts`
  - `src/ui/guide/guide-workspace.tsx`
  - `src/ui/guide/guide-modal.tsx`
  - `src/ui/guide/guide-workspace.module.css`
- Verification:
  - `npm.cmd test -- app/guide/page.test.tsx src/ui/guide/__tests__/view-model.test.ts src/ui/guide/__tests__/guide-modal.test.tsx` -> pass (`3` files, `6` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-10T11-39-57-376Z.log`
- Notes:
  - Replaced the large guide hero with a lighter page header and subtle home back control.
  - Removed secondary filtering from both UI and guide filtering logic, leaving search plus primary category only.
  - Reduced preview density on cards and related cards, demoted the secondary pill visually, and changed the modal close control to an icon-style affordance.
  - Smoothed the modal reading flow by rendering the main content as one continuous reading block and moved the home back control into an overlaid left-side position so the title and subtitle keep their original alignment.

## 2026-06-10 - Guide Homepage Entry Panel v1

- Phase: BUILD
- Touched boundaries:
  - `app/guide/page.tsx`
  - `app/guide/page.test.tsx`
  - `src/ui/guide/guide-workspace.tsx`
  - `src/ui/guide/guide-modal-state.ts`
  - `src/ui/guide/__tests__/guide-modal-state.test.ts`
  - `src/ui/homepage/homepage-orientation-hub.tsx`
  - `src/ui/homepage/homepage-orientation-hub.module.css`
  - `src/ui/homepage/__tests__/homepage-orientation-hub.test.tsx`
- Verification:
  - `.\node_modules\.bin\vitest.cmd run src/ui/homepage/__tests__/homepage-orientation-hub.test.tsx app/guide/page.test.tsx src/ui/guide/__tests__/guide-modal-state.test.ts src/ui/guide/__tests__/guide-modal.test.tsx src/ui/guide/__tests__/view-model.test.ts src/content/sleep-dream-guide/__tests__/search.test.ts` -> pass (`6` files, `23` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-10T13-59-01-335Z.log`
- Notes:
  - Replaced the homepage `Útmutató` placeholder content with a compact guide-entry panel containing three fixed featured links and a subtle `/guide` chevron action.
  - Added minimal `/guide?card=<slug>` support by resolving a valid slug on page load, opening the existing modal, and removing only the `card` param on close.
  - Left homepage search, guide card content, and the broader guide page layout unchanged outside this URL-entry behavior.

## 2026-06-10 - Homepage Panel Polish After Guide Entry

- Phase: BUILD
- Touched boundaries:
  - `src/ui/homepage/homepage-orientation-hub.module.css`
- Verification:
  - `.\node_modules\.bin\vitest.cmd run src/ui/homepage/__tests__/homepage-orientation-hub.test.tsx app/guide/page.test.tsx src/ui/guide/__tests__/guide-modal-state.test.ts src/ui/guide/__tests__/guide-modal.test.tsx src/ui/guide/__tests__/view-model.test.ts src/content/sleep-dream-guide/__tests__/search.test.ts` -> pass (`6` files, `23` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-10T14-20-20-646Z.log`
- Notes:
  - Clamped Dream Journal preview copy to two lines so long summaries stop overgrowing the shared dashboard row.
  - Moved the Guide panel chevron into reserved layout flow at the bottom-right instead of absolute overlap, while keeping featured-row chevrons untouched.
  - Visual verification of the polished homepage was confirmed by the user after the local changes; an attempted automated Playwright screenshot path was blocked because browser installation was declined.

## 2026-06-11 - Backend V2 Clean-Room Severance Pass v1

- Phase: BUILD
- Touched boundaries:
  - `src/domain/index.ts`
  - `src/runtime/types.ts`
  - `src/domain/reflective-objects/README.md`
  - `src/domain/observation/README.md`
  - `src/domain/glossary/README.md`
  - `src/domain/latent/README.md`
  - `src/domain/openings/README.md`
  - `src/domain/threads/README.md`
  - `src/domain/responses/README.md`
  - `src/cognition/README.md`
  - `src/cognition/observation/README.md`
  - `src/cognition/glossary/README.md`
  - `src/cognition/latent/README.md`
  - `src/cognition/openings/README.md`
  - `src/infrastructure/persistence/README.md`
  - `src/infrastructure/persistence/observation-v2-write-store.ts`
  - `src/infrastructure/supabase/repositories/README.md`
  - `src/reflective-space/README.md`
  - `docs/canon/backend-v2/BACKEND_V2_CONSTRUCTION_SITE.md`
  - `docs/backend-v2-migration/README.md`
  - `docs/audits/backend-v2-protected-dependency-ledger-v1.md`
  - `docs/AGENT_START_HERE.md`
  - `docs/DOCS_INDEX.md`
  - `docs/SPEC_INDEX.md`
- Verification:
  - `npm.cmd test -- src/shared/__tests__/backend-v2-quarantine-docs.test.ts` -> pass (`1` file, `5` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`101` files, `381` tests)
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-11T09-23-19-420Z.log`
- Notes:
  - Quarantined the current backend-only observation/glossary/latent/openings/threads/responses substrate with explicit legacy status notes while leaving pages, routes, and UI intact.
  - Removed the generic `reflective-objects` default barrel export so new Backend V2 work does not inherit it as a default domain root.
  - Added a clean-room Backend V2 construction-site note and a protected dependency ledger for surfaces that still rely on quarantined backend modules.

## 2026-06-11 - Glossary Observation Reconnection

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/glossary/extract-glossary-candidates-from-observations.ts`
  - `src/reflective-space/composition/derive-glossary-cues.ts`
  - `app/api/reflective-objects/[id]/glossary-candidates/route.ts`
  - `src/reflective-space/composition/compose-object-orientation-payload.ts`
  - `src/reflective-space/composition/compose-reflective-space-viewport.ts`
  - `app/objects/[objectId]/page.tsx`
  - `app/api/reflective-space/viewport/route.ts`
  - `src/cognition/glossary/__tests__/extract-glossary-candidates-from-observations.test.ts`
  - `src/reflective-space/composition/__tests__/derive-glossary-cues.test.ts`
  - `app/api/reflective-objects/[id]/glossary-candidates/__tests__/route.test.ts`
  - `src/reflective-space/composition/__tests__/compose-object-orientation-payload.test.ts`
  - `src/reflective-space/composition/__tests__/compose-reflective-space-viewport.test.ts`
  - `app/api/reflective-space/viewport/__tests__/route.test.ts`
- Verification:
  - `npm.cmd test` -> pass (`103` files, `390` tests)
  - `npm.cmd run lint` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-11T11-20-42-705Z.log`
- Notes:
  - Reconnected glossary candidate extraction to native Observation V2 bundles by reading scene-derived actors, locations, objects, affect, and recurrence-oriented observation text before falling back to legacy observation fragments.
  - Reconnected glossary cue derivation in object orientation and reflective-space viewport composition to Observation V2 bundles, while preserving narrow legacy fallback for mixed-history objects.
  - Kept glossary candidate schema, lifecycle states, repository shape, and term creation behavior unchanged.

## 2026-06-11 - Glossary Entity Ownership Slice

- Phase: BUILD
- Touched boundaries:
  - `src/domain/glossary`
  - `src/infrastructure/supabase/adapters/glossary-row.ts`
  - `src/infrastructure/supabase/repositories/glossary-supabase-repository.ts`
  - `app/api/glossary/terms/[id]/route.ts`
  - `supabase/migrations/20260611_0020_glossary_entity_ownership_slice.sql`
  - `docs/superpowers/specs/2026-06-11-glossary-entity-ownership-slice-design.md`
  - `docs/superpowers/plans/2026-06-11-glossary-entity-ownership-slice.md`
- Verification:
  - `npm.cmd run lint` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass
  - `npm.cmd test` -> fail due pre-existing unrelated workspace state in `src/shared/__tests__/backend-v2-quarantine-docs.test.ts` expecting deleted `docs/backend-v2-migration/*` files
  - Focused glossary validation:
    - `npm.cmd test -- src/domain/glossary/__tests__/http-contract.test.ts` -> pass
    - `npm.cmd test -- src/infrastructure/supabase/adapters/__tests__/glossary-row.test.ts` -> pass
    - `npm.cmd test -- src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts` -> pass
    - `npm.cmd test -- app/api/glossary/terms/[id]/__tests__/route.test.ts` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-11T15-10-03-101Z.log`
- Notes:
  - Evolved the existing `glossary_terms` seam into a continuity-entity-shaped authority model instead of introducing a second persisted owner.
  - Added typed continuity fields, alias storage, general-note storage, and appearance counts while preserving `normalized_key`, `display_label`, and `notes` as compatibility mirrors.
  - Updated the glossary PATCH path to edit continuity-entity fields and updated candidate pinning so new rows are created as valid entity-shaped entries with a safe default type of `concept`.

## 2026-06-12 - Match Candidate Foundation Slice

- Phase: BUILD
- Touched boundaries:
  - `src/domain/glossary/types.ts`
  - `src/domain/glossary/http-contract.ts`
  - `src/infrastructure/supabase/adapters/glossary-row.ts`
  - `src/infrastructure/supabase/repositories/glossary-supabase-repository.ts`
  - `app/api/glossary/candidates/[id]/__tests__/route.test.ts`
  - `app/api/reflective-objects/[id]/glossary-candidates/__tests__/route.test.ts`
  - `supabase/migrations/20260612_0022_glossary_match_candidate_foundation.sql`
  - `docs/superpowers/specs/2026-06-12-match-candidate-foundation-slice-design.md`
  - `docs/superpowers/plans/2026-06-12-match-candidate-foundation-slice.md`
- Verification:
  - `npm.cmd test` -> pass (`105` files, `409` tests)
  - `npm.cmd run lint` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-12T08-26-31-731Z.log`
- Notes:
  - Added the canonical candidate classes `match_candidate`, `ambiguous_match_candidate`, and `new_candidate` to glossary candidate domain contracts.
  - Persisted candidate class and proposed entity references in the glossary candidate state store without adding matching, ambiguity generation, or appearance creation logic.
  - Exposed candidate class metadata through existing candidate read/update seams so later Match Candidate generation can attach ownership-safe proposals.

## 2026-06-12 - Match Candidate Generation Slice v1

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/glossary/classify-glossary-candidates.ts`
  - `src/cognition/glossary/__tests__/classify-glossary-candidates.test.ts`
  - `app/api/reflective-objects/[id]/glossary-candidates/route.ts`
  - `app/api/reflective-objects/[id]/glossary-candidates/__tests__/route.test.ts`
- Verification:
  - `npm.cmd test` -> pass (`106` files, `415` tests)
  - `npm.cmd run lint` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-12T08-55-11-307Z.log`
- Notes:
  - Added deterministic-first candidate classification over extracted glossary candidates using normalized exact-match first, then alias matching.
  - Classified unique deterministic matches as `match_candidate` with one proposed entity id and forced all zero-match or multi-match cases to `new_candidate` with no proposed entities.
  - Kept ambiguity generation, appearance creation changes, morphology handling, and LLM matching out of scope.

## 2026-06-12 - Ambiguous Match Generation Slice v1

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/glossary/classify-glossary-candidates.ts`
  - `src/cognition/glossary/__tests__/classify-glossary-candidates.test.ts`
  - `app/api/reflective-objects/[id]/glossary-candidates/__tests__/route.test.ts`
- Verification:
  - `npm.cmd test` -> pass (`106` files, `418` tests)
  - `npm.cmd run lint` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-12T09-18-15-497Z.log`
- Notes:
  - Extended deterministic candidate classification so multi-entity exact matches and multi-entity alias matches now produce `ambiguous_match_candidate`.
  - Kept exact matches authoritative over alias matches, deduped repeated entity ids, and sorted proposed entity ids deterministically before persistence.
  - Left user resolution flow, appearance creation from ambiguity, morphology, and LLM fallback out of scope.

## 2026-06-12 - Match Candidate Resolution Slice v1

- Phase: BUILD
- Touched boundaries:
  - `src/domain/glossary/types.ts`
  - `src/domain/glossary/contracts.ts`
  - `src/domain/glossary/http-contract.ts`
  - `src/domain/glossary/__tests__/http-contract.test.ts`
  - `src/infrastructure/supabase/repositories/glossary-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts`
  - `app/api/glossary/candidates/[id]/route.ts`
  - `app/api/glossary/candidates/[id]/__tests__/route.test.ts`
  - `app/api/glossary/candidates/[id]/resolve/route.ts`
  - `app/api/glossary/candidates/[id]/resolve/__tests__/route.test.ts`
- Verification:
  - `npm.cmd test` -> pass (`107` files, `426` tests)
  - `npm.cmd run lint` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-12T10-20-35-994Z.log`
- Notes:
  - Introduced a unified `resolveCandidate(...)` authority covering existing-entity confirmation, ambiguous existing-entity selection, and new-entity creation.
  - Moved appearance creation behind candidate resolution instead of generic lifecycle patching, while preserving `pinned` as the existing resolved lifecycle state.
  - Added a dedicated candidate resolution API route and blocked `PATCH nextState="pinned"` so public resolution flows through the single resolution seam.

## 2026-06-12 - Glossary Orientation Panel UI Integration v1

- Phase: BUILD
- Touched boundaries:
  - `package.json`
  - `package-lock.json`
  - `src/domain/glossary/contracts.ts`
  - `src/infrastructure/supabase/repositories/glossary-supabase-repository.ts`
  - `src/reflective-space/composition/compose-object-orientation-payload.ts`
  - `src/reflective-space/composition/__tests__/compose-object-orientation-payload.test.ts`
  - `src/reflective-space/composition/__tests__/compose-reflective-space-viewport.test.ts`
  - `src/ui/object-orientation/view-model.ts`
  - `src/ui/object-orientation/__tests__/view-model.test.ts`
  - `src/ui/object-orientation/object-orientation-layer.tsx`
  - `src/ui/object-orientation/object-orientation-layer.module.css`
  - `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`
- Verification:
  - `npm.cmd test` -> pass (`107` files, `431` tests)
  - `npm.cmd run lint` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-12T14-24-11-348Z.log`
- Notes:
  - Replaced the legacy glossary cue list in object orientation with a unified Glossary V2 panel covering match, ambiguous, new, and saved rows in contract order.
  - Added Lucide-based row actions, bottom filter controls, and a single candidate resolution modal wired to the existing candidate lifecycle and resolution endpoints.
  - Added repository support for loading saved glossary entities associated with the current reflective object without inventing a new detail route.
  - Saved entity detail navigation remains intentionally unresolved because the only current glossary route is the placeholder `/glossary` page and no stable entity detail view exists yet.

## 2026-06-12 - Glossary Candidate UUID Guard and V2 Provenance Fix

- Phase: BUILD
- Touched boundaries:
  - `supabase/migrations/20260612_0023_glossary_candidate_provenance_text.sql`
  - `src/infrastructure/supabase/adapters/glossary-row.ts`
  - `src/infrastructure/supabase/repositories/glossary-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts`
  - `src/runtime/orchestration/__tests__/generate-glossary-candidates-for-reflective-object.test.ts`
- Verification:
  - `npm.cmd test` -> pass (`108` files, `440` tests)
  - `npm.cmd run lint` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-12T16-34-51-836Z.log`
- Notes:
  - Added a repository/adapter guard that strips non-UUID values from `proposedEntityIds` before persistence and reclassifies zero-valid-id candidates to `new_candidate`.
  - Kept Observation V2 synthetic identifiers in provenance-only fields by converting glossary candidate and association observation provenance columns from `uuid` to `text`.
  - Added regression coverage for fresh-user V2 extraction, UUID-only existing-entity matches, and the specific `obs1_1` candidate insert failure mode.

## 2026-06-13 - Glossary Continuity Admission Layer v1

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/glossary/continuity-admission.ts`
  - `src/cognition/glossary/__tests__/continuity-admission.test.ts`
  - `src/cognition/glossary/extract-glossary-candidates-from-observations.ts`
  - `src/cognition/glossary/__tests__/extract-glossary-candidates-from-observations.test.ts`
  - `src/runtime/orchestration/__tests__/generate-glossary-candidates-for-reflective-object.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test` -> pass (`109` files, `447` tests)
  - `npm.cmd run lint` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-13T04-45-07-450Z.log`
- Notes:
  - Inserted a deterministic continuity admission layer between observation extraction and glossary candidate persistence.
  - Rejected system-perspective labels, emotional labels, composite scene/event phrases, and first-appearance generic motifs before classification.
  - Preserved existing match/new/ambiguous glossary classification for admitted candidates only, without changing UI, language handling, or persistence schema.

## 2026-06-13 - Glossary Orientation Panel UI Polish

- Phase: BUILD
- Touched boundaries:
  - `src/ui/object-orientation/view-model.ts`
  - `src/ui/object-orientation/__tests__/view-model.test.ts`
  - `src/ui/object-orientation/object-orientation-layer.tsx`
  - `src/ui/object-orientation/object-orientation-layer.module.css`
  - `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`
- Verification:
  - `npm.cmd test` -> pass (`109` files, `447` tests)
  - `npm.cmd run lint` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-13T05-21-31-136Z.log`
- Notes:
  - Swapped glossary row semantics so the left lamp now signals candidate status and the right border now signals entity type.
  - Replaced the pill filter row with a bottom-anchored dropdown that only changes row visibility and leaves candidate state untouched.
  - Kept the unified list order but added deterministic secondary entity-type ordering and a bounded scroll viewport sized for roughly three rows on desktop.

## 2026-06-13 - Glossary Entity Rename Flow v1

- Phase: BUILD
- Touched boundaries:
  - `app/api/glossary/candidates/[id]/resolve/__tests__/route.test.ts`
  - `src/domain/glossary/__tests__/http-contract.test.ts`
  - `src/infrastructure/supabase/repositories/glossary-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts`
  - `src/ui/object-orientation/object-orientation-layer.tsx`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test` -> pass (`109` files, `454` tests)
  - `npm.cmd run lint` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-13T07-12-05-801Z.log`
- Notes:
  - Kept the glossary candidate modal one-step while making `canonicalLabel` editable for new candidates, match confirmations, and ambiguous existing-entity selections.
  - Routed existing-entity renames through Glossary candidate resolution so the selected continuity entity is renamed before the appearance record is created.
  - Preserved ownership boundaries by leaving Observation data untouched and keeping `appearanceNote` on the appearance record while `generalNote` remains limited to create-new entity flow.

## 2026-06-14 - Observation V2 Derived Structure Completion

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation/llm-scene-observation-extractor.ts`
  - `src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts` -> pass (`1` file, `5` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-14T19-51-26-260Z.log`
- Notes:
  - Strengthened the live Observation V2 extractor prompt to explicitly request `interactions`, `affect`, `agency`, `phenomenology`, and `metacognition`.
  - Added the evidence rule that these categories should only be extracted when supported by explicit dream evidence or strongly implied by directly described dream action.
  - Preserved the existing schema, parser, runtime bundle, and persistence behavior without adding fallback enrichment or retry logic.

## 2026-06-15 - Observation V2 Derived Structure Construction Phase

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation/llm-derived-structure-constructor.ts`
  - `src/cognition/observation/__tests__/llm-derived-structure-constructor.test.ts`
  - `app/capture/page.tsx`
  - `app/capture/page.test.tsx`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/observation/__tests__/llm-derived-structure-constructor.test.ts app/capture/page.test.tsx` -> pass (`2` files, `10` tests)
  - `npm.cmd test` -> pass (`110` files, `463` tests)
  - `npm.cmd run lint` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-15T06-17-47-614Z.log`
- Notes:
  - Added a dedicated Observation V2 bundle-level LLM construction seam that reads scene summaries, observations, evidence excerpts, and existing derived structures before returning updated scene-local derived categories.
  - Wired live capture to run the constructor after scene extraction and before native Observation V2 persistence.
  - Preserved the first-pass extractor and native V2 durability path while shifting population responsibility for the canonical derived categories toward a distinct Observation-to-Derived phase.

## 2026-06-15 - Observation/Glossary Identity Hygiene

- Phase: BUILD
- Touched boundaries:
  - `src/domain/observation/v2-runtime.ts`
  - `src/domain/glossary/recognition-normalization.ts`
  - `src/cognition/glossary/continuity-admission.ts`
  - `src/cognition/glossary/extract-glossary-candidates-from-observations.ts`
  - `src/domain/observation/__tests__/v2-runtime.test.ts`
  - `src/domain/glossary/__tests__/recognition-normalization.test.ts`
  - `src/cognition/glossary/__tests__/continuity-admission.test.ts`
  - `src/cognition/glossary/__tests__/extract-glossary-candidates-from-observations.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/domain/glossary/__tests__/recognition-normalization.test.ts src/cognition/glossary/__tests__/continuity-admission.test.ts src/cognition/glossary/__tests__/extract-glossary-candidates-from-observations.test.ts src/domain/observation/__tests__/v2-runtime.test.ts` -> pass (`4` files, `26` tests)
  - `npm.cmd test` -> pass (`110` files, `467` tests)
  - `npm.cmd run lint` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-15T06-17-47-614Z.log`
- Notes:
  - Canonicalized dreamer/self actor identities to `Álmodó` during Observation V2 bundle normalization so actor-derived structures no longer diverge across self-reference variants.
  - Blocked dreamer-equivalent labels from entering glossary candidate generation in both fragment-based and V2-derived extraction, with continuity admission retaining the same guard as a secondary safety net.
  - Trimmed explanatory appositive suffixes from glossary candidate display labels so continuity candidates surface as canonical identity names only.
 
## 2026-06-15 - Latent V2 Opportunity Schema And Persistence Foundation

- Phase: BUILD
- Touched boundaries:
  - `supabase/migrations/20260615_0024_latent_opportunity_foundation.sql`
  - `src/domain/latent-v2/types.ts`
  - `src/domain/latent-v2/contracts.ts`
  - `src/shared/types.ts`
  - `src/infrastructure/supabase/adapters/latent-opportunity-row.ts`
  - `src/infrastructure/supabase/adapters/__tests__/latent-opportunity-row.test.ts`
  - `src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/create-latent-opportunity-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/infrastructure/supabase/adapters/__tests__/latent-opportunity-row.test.ts` -> pass (`1` file, `2` tests)
  - `npm.cmd test -- src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts` -> pass (`1` file, `1` test)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`112` files, `473` tests)
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-15T09-07-03-236Z.log`
- Notes:
  - Added a native Latent V2 persistence foundation for `latent_opportunity_identities`, `latent_opportunity_manifestations`, `latent_opportunity_evidence_blocks`, `latent_opportunity_evidence_observations`, and `latent_opportunity_glossary_links`.
  - Anchored manifestations on `priority_reflective_object_id` and linked evidence observations directly to native `observation_v2_scene_observations`.
  - Kept glossary continuity links at manifestation scope and omitted a `glossary_appearance_record_id` reference in the first build because current glossary appearance persistence does not expose a clean user-owned composite key for ownership-safe foreign-key enforcement.

## 2026-06-15 - Latent V2 LLM Opportunity Constructor Contract Layer

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/latent-v2/opportunity-constructor/index.ts`
  - `src/cognition/latent-v2/opportunity-constructor/types.ts`
  - `src/cognition/latent-v2/opportunity-constructor/parser.ts`
  - `src/cognition/latent-v2/opportunity-constructor/validator.ts`
  - `src/cognition/latent-v2/opportunity-constructor/safety.ts`
  - `src/cognition/latent-v2/opportunity-constructor/mapping.ts`
  - `src/cognition/latent-v2/opportunity-constructor/__tests__/opportunity-constructor.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/latent-v2/opportunity-constructor/__tests__/opportunity-constructor.test.ts` -> pass (`1` file, `13` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`113` files, `486` tests)
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-15T11-39-13-114Z.log`
- Notes:
  - Added the first pure Latent V2 opportunity-constructor seam defining the contract-shaped input/output packet types, raw JSON parsing, conservative validation, and explicit repository-input mapping without calling any LLM or persistence writer.
  - Enforced the non-interpretive boundary with extendable prohibited-language scans plus output-flag checks for interpretive, diagnostic, identity-claim, and advice language.
  - Restricted identity reuse to explicitly supplied existing identities, required priority-object evidence plus in-scope Observation V2 references, and persisted only confirmed glossary links while dropping candidate glossary mentions from mapping output.

## 2026-06-15 - Latent V2 Constructor Input Packet Composer

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/latent-v2/opportunity-constructor/input-packet-composer.ts`
  - `src/cognition/latent-v2/opportunity-constructor/index.ts`
  - `src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts`
  - `src/domain/latent-v2/contracts.ts`
  - `src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts` -> pass (`1` file, `11` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`114` files, `497` tests)
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-15T12-12-57-160Z.log`
- Notes:
  - Added the first pure constructor input-packet composer that assembles a contract-compatible Latent V2 opportunity-constructor packet from native `reflective_objects`, `observation_v2`, `glossary`, and `latent_opportunity` reads.
  - Preserved the glossary boundary by separating confirmed terms, appearance-record context, and candidate-only context while filtering non-candidate glossary rows out of constructor input.
  - Added a bounded recent-manifestation read to Latent V2 repository access so composer context can include priority-object-relevant and recent existing opportunity identities without touching legacy latent/opening/thread structures.

## 2026-06-15 - Latent V2 LLM Generation And Persistence Orchestrator

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/latent-v2/opportunity-constructor/llm-opportunity-constructor.ts`
  - `src/cognition/latent-v2/opportunity-constructor/index.ts`
  - `src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts`
  - `src/domain/latent-v2/contracts.ts`
  - `src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository.ts`
  - `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
  - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts` -> pass (`1` file, `10` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`115` files, `507` tests)
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-15T12-56-22-990Z.log`
- Notes:
  - Added the first Latent V2 end-to-end generation orchestrator that composes a real constructor packet, requests contract-shaped JSON from the existing OpenAI Responses infrastructure, parses and validates it, maps it to repository payloads, and persists only validated opportunities.
  - Preserved the contract boundary by allowing both `create_new` and validator-approved `reuse_existing` identity paths while persisting confirmed glossary links only and keeping glossary candidates context-only.
  - Hardened persistence failure handling with explicit Latent V2 cleanup methods and rollback of already-created identities/manifestations so failed runs do not leave partial opportunity graphs behind.

## 2026-06-16 - Latent Opportunity Discovery Broadening Pass v1

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/latent-v2/opportunity-constructor/llm-opportunity-constructor.ts`
  - `src/cognition/latent-v2/opportunity-constructor/__tests__/opportunity-constructor.test.ts`
  - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/latent-v2/opportunity-constructor/__tests__/opportunity-constructor.test.ts src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts` -> fail first (`1` test) before prompt patch, then pass (`2` files, `41` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`115` files, `527` tests)
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-16T09-45-28-479Z.log`
- Notes:
  - Broadened constructor guidance without changing schema, validator, mapper, repository, or persistence behavior by explicitly instructing the LLM to scan the full priority object before narrowing and to continue scanning across scenes and categories after finding strong candidates.
  - Expanded prompt coverage for non-spatial transitions, gap and ambiguity structures, repair and reassurance sequences, expectation violations, emerging continuity signals, and phenomenological salience while preserving the existing non-interpretive and no-inventory safety boundaries.
  - Added contract-level and orchestration-level tests proving that one priority object can validly yield multiple materially distinct opportunities, including transition, gap, repair, and phenomenological salience opportunities, without breaking existing persistence expectations.

## 2026-06-15 - Dreamer Variant Exclusion In Glossary Candidates

- Phase: BUILD
- Touched boundaries:
  - `src/domain/observation/v2-runtime.ts`
  - `src/cognition/glossary/continuity-admission.ts`
  - `src/domain/observation/__tests__/v2-runtime.test.ts`
  - `src/cognition/glossary/__tests__/continuity-admission.test.ts`
  - `src/cognition/glossary/__tests__/extract-glossary-candidates-from-observations.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/domain/observation/__tests__/v2-runtime.test.ts src/cognition/glossary/__tests__/extract-glossary-candidates-from-observations.test.ts src/cognition/glossary/__tests__/continuity-admission.test.ts` -> pass (`3` files, `25` tests)
  - `npm.cmd test` -> pass (`110` files, `470` tests)
  - `npm.cmd run lint` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-15T07-25-02-345Z.log`
- Notes:
  - Hardened dreamer/self detection from exact-match identity labels to normalized dreamer prefixes so qualified variants such as `Ăn (gyerek)`, `ĂlmodĂł (idĹ‘sebb)`, and `Dreamer (older)` collapse to the dreamer identity during Observation V2 actor normalization.
  - Reused the same normalized dreamer classifier as a secondary continuity-admission guard so qualified self-variants are rejected even if they arrive downstream as labels.
  - Confirmed glossary extraction still preserves real actor candidates including `BĂłra`, `Ăvi`, `Kata`, `ApĂˇm`, and `Markus`.
## 2026-06-17 - Anchor Identity Normalization Enforcement v1

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/anchor-v1/constructor/anchor-identity-canon.ts`
  - `src/cognition/anchor-v1/constructor/llm-anchor-constructor.ts`
  - `src/cognition/anchor-v1/constructor/validator.ts`
  - `src/cognition/anchor-v1/constructor/index.ts`
  - `src/cognition/anchor-v1/constructor/__tests__/anchor-constructor.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/anchor-v1/constructor/__tests__/anchor-constructor.test.ts` -> fail first (`1` file, `45` tests) before prompt/family-label hardening, then pass (`1` file, `45` tests)
  - `npx.cmd tsx scripts/dev-run-anchor-v1.ts ae7fd730-eb19-43d6-9781-20e042fc5d9c` -> first fail at validation with `structure_identity_label_not_in_canon`, then pass with persisted output (`9` identities, `9` manifestations, `25` participations)
  - Dev-run artifact: `scripts/output/anchor-v1-ae7fd730-eb19-43d6-9781-20e042fc5d9c-2026-06-17T15-56-25-507Z`
  - `npm.cmd test` -> pass (`122` files, `595` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-17T15-56-40-286Z.log`
- Notes:
  - Added a single-source Anchor identity canon module and reused it across prompt construction, validator enforcement, public constructor exports, and the constructor contract tests.
  - Enforced exact canon membership for `ROLE` and `STRUCTURE` `identityLabel` values while leaving `ENTITY` labels flexible and `manifestationLabel` values dream-specific.
  - Hardened the prompt with explicit closed-vocabulary instructions, canon lists, identity-versus-manifestation separation, omission rules, and negative guidance against invalid structure-family labels such as `Tension`.

## 2026-06-17 - Anchor V1 Canon Selection Quality Calibration v1

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/anchor-v1/constructor/llm-anchor-constructor.ts`
  - `src/cognition/anchor-v1/constructor/__tests__/anchor-constructor.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/anchor-v1/constructor/__tests__/anchor-constructor.test.ts` -> fail first (`1` file, `45` tests) before prompt calibration, then pass (`1` file, `47` tests)
  - `npx.cmd tsx scripts/dev-run-anchor-v1.ts ae7fd730-eb19-43d6-9781-20e042fc5d9c` -> pass with persisted output (`9` identities, `9` manifestations, `21` participations)
  - Dev-run artifact: `scripts/output/anchor-v1-ae7fd730-eb19-43d6-9781-20e042fc5d9c-2026-06-17T16-09-55-272Z`
  - `npm.cmd test` -> pass (`122` files, `597` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-17T16-12-31-793Z.log`
- Notes:
  - Tightened prompt guidance around dominant-pattern reasoning so STRUCTURE selection prefers the best-fitting canonical family rather than generic fallbacks, with explicit disambiguation for `Transition`, `Conflict`, `Search`, `Repair`, `Separation`, and `Connection`.
  - Added packet-level prompt regressions to guard that the calibration remains general across packets and is not tuned to a single reviewed dream.
  - Strengthened participation-role instructions without changing schema, validator, mapper, or persistence contracts; the live probe still shows an `EVIDENCE` bias, so this ticket improves instruction quality but does not guarantee balanced role distribution on every run.

## 2026-06-18 - Backend V2 Live Runtime Cutover: Latent V2 Authority Preparation

- Phase: BUILD
- Touched boundaries:
  - `src/runtime/orchestration/prepare-latent-opening-for-reflection.ts`
  - `src/runtime/orchestration/__tests__/prepare-latent-opening-for-reflection.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/runtime/orchestration/__tests__/prepare-latent-opening-for-reflection.test.ts` -> pass (`1` file, `6` tests)
  - `npm.cmd test -- app/api/reflective-objects/[id]/latent-snapshots/__tests__/route.test.ts` -> pass (`1` file, `2` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd test` -> pass (`122` files, `599` tests)
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-18T06-07-56-089Z.log`
- Notes:
  - Switched live reflection/opening preparation to a V2-first path that checks Observation V2, reuses or generates Latent V2 manifestations, and only falls back to legacy latent snapshot scaffolding when V2 authority is unavailable or cannot provide a bounded opening handoff.
  - Added a temporary convergence bridge that maps Latent V2 manifestations into the existing Opening contract without exposing manifestation summaries or other raw Latent V2 internals as user-facing truth.
  - Kept the legacy latent snapshot path intact as explicit compatibility fallback and left the manual latent snapshot API unchanged for now.

## 2026-06-18 - Thread V2 First Contribution Creation Seam

- Phase: BUILD
- Touched boundaries:
  - `app/api/openings/[id]/responses/route.ts`
  - `app/api/openings/[id]/responses/__tests__/route.test.ts`
  - `app/api/openings/[id]/activate/__tests__/route.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- app/api/openings/[id]/responses/__tests__/route.test.ts app/api/openings/[id]/activate/__tests__/route.test.ts` -> fail first (`2` files, `7` tests) before seam implementation, then pass (`2` files, `7` tests)
  - `npm.cmd run typecheck` -> first fail on nullable `createdThread` branch in `app/api/openings/[id]/responses/route.ts`, then pass after narrowing
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-18T13-20-13-002Z.log`
- Notes:
  - Established the first runtime seam where a user-authored reflective response creates a compatibility-backed thread only when no thread id is already provided in the request.
  - Preserved the existing response persistence order, opening activation behavior, object lineage persistence, opening-response association behavior, and explicit-thread compatibility path.
  - Kept the existing `reflective_threads` substrate in compatibility-only service as an interim seam and did not introduce reflection, completion, or workflow semantics.

## 2026-06-18 - Thread V2 Re-entry / Viewport Surfacing

- Phase: BUILD
- Touched boundaries:
  - `src/domain/threads/contracts.ts`
  - `src/infrastructure/supabase/repositories/thread-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/thread-supabase-repository.test.ts`
  - `src/reflective-space/composition/compose-reflective-space-viewport.ts`
  - `src/reflective-space/composition/__tests__/compose-reflective-space-viewport.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/reflective-space/composition/__tests__/compose-reflective-space-viewport.test.ts src/infrastructure/supabase/repositories/__tests__/thread-supabase-repository.test.ts` -> fail first (`2` files, `6` tests) before object-scoped thread retrieval, then pass (`2` files, `6` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-18T13-28-54-451Z.log`
- Notes:
  - Added a compatibility-backed object-scoped thread retrieval path to the existing thread repository so the reflective-space viewport can load threads associated with the current center object on re-entry.
  - Switched viewport composition to prefer object-first thread loading when `centerObjectId` is present, while preserving the existing user-wide fallback for compatibility and keeping bounded window behavior unchanged.
  - Left response surfaces, dialogue traces, opening surfaces, and the quarantined thread substrate behavior otherwise unchanged.

## 2026-06-18 - Opening Surfacing Object-First Alignment

- Phase: BUILD
- Touched boundaries:
  - `src/domain/openings/contracts.ts`
  - `src/infrastructure/supabase/repositories/opening-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/opening-supabase-repository.test.ts`
  - `src/reflective-space/composition/compose-reflective-space-viewport.ts`
  - `src/reflective-space/composition/__tests__/compose-reflective-space-viewport.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/infrastructure/supabase/repositories/__tests__/opening-supabase-repository.test.ts src/reflective-space/composition/__tests__/compose-reflective-space-viewport.test.ts` -> fail first (`2` files, `10` tests) before object-first opening retrieval, then pass (`2` files, `10` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-18T13-42-10-079Z.log`
- Notes:
  - Added an object-first opening surface retrieval path to the compatibility-backed opening repository, scoped by user, non-archived state, and reflective-object lineage via `source_objects`.
  - Switched viewport composition to prefer object-first opening loading when `centerObjectId` is present, while preserving the existing user-wide fallback and suppression filtering.
  - Left opening activation, suppression, dialogue traces, latent generation, convergence bridge behavior, and opening construction logic unchanged.

## 2026-06-18 - Opening Response Thread Lineage Hardening

- Phase: BUILD
- Touched boundaries:
  - `app/api/openings/[id]/responses/route.ts`
  - `app/api/openings/[id]/responses/__tests__/route.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- app/api/openings/[id]/responses/__tests__/route.test.ts app/api/openings/[id]/activate/__tests__/route.test.ts` -> fail first (`2` files, `9` tests) before thread reuse and lineage validation, then pass (`2` files, `9` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/2026-06-18T14-09-14-848Z.log`
- Notes:
  - Hardened the compatibility-backed opening response save path so it reuses an existing opening-linked thread when object-lineage-compatible thread continuity already exists, instead of creating duplicate threads on repeated saves.
  - Added explicit object-lineage validation for supplied `threadId` values before response persistence continues.
  - Normalized response-thread association creation so both the explicit-thread and created-thread paths persist the same response-thread lineage substrate.

## 2026-06-18 - Opening V2 Constructor MVP

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/openings/opening-v2-constructor/`
  - `src/cognition/openings/__tests__/opening-v2-constructor.test.ts`
  - `src/domain/openings/types.ts`
  - `src/infrastructure/supabase/adapters/opening-row.ts`
  - `src/infrastructure/supabase/repositories/__tests__/opening-supabase-repository.test.ts`
  - `src/runtime/orchestration/prepare-latent-opening-for-reflection.ts`
  - `src/runtime/orchestration/__tests__/prepare-latent-opening-for-reflection.test.ts`
  - `scripts/dev-run-opening-v2.ts`
  - `supabase/migrations/20260618_0027_opening_v2_metadata.sql`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/openings/__tests__/opening-v2-constructor.test.ts` -> pass (`1` file, `11` tests)
  - `npm.cmd test -- src/cognition/openings/__tests__/generate-opening-v2-create-input.test.ts` -> pass (`1` file, `1` test)
  - `npm.cmd test -- src/infrastructure/supabase/repositories/__tests__/opening-supabase-repository.test.ts` -> fail first on missing Opening V2 metadata persistence, then pass (`1` file, `7` tests)
  - `npm.cmd test -- src/runtime/orchestration/__tests__/prepare-latent-opening-for-reflection.test.ts` -> pass (`1` file, `6` tests)
  - `npm.cmd run typecheck` -> fail first on duplicate import and candidate typing, then pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-06-18T19-44-29-083Z.log`; a parallel second invocation collided and logged `docs/build-logs/2026-06-18T19-48-41-641Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Added an Opening V2 constructor path from persisted latent opportunity manifestations into the existing openings substrate as a provisional compatibility strategy, not final Opening V2 persistence architecture.
  - Persisted `question` into `utterance` and added narrow metadata persistence for `context` plus `sourceOpportunityManifestationId`.
  - Replaced the prior Latent V2 compatibility utterance bridge with generated Opening V2 question content when the constructor succeeds, while preserving a bounded fallback bridge when generation fails.
  - Generated sample Opening V2 outputs from the saved latent run via `scripts/dev-run-opening-v2.ts` for owner review before broader rollout: `scripts/output/opening-v2-samples-2026-06-18T19-44-05-370Z.json`

## 2026-06-19 - Opening V2 Content Calibration

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/openings/opening-v2-constructor/llm-opening-v2-constructor.ts`
  - `src/cognition/openings/opening-v2-constructor/validator.ts`
  - `src/cognition/openings/opening-v2-constructor/generate-opening-v2-create-input.ts`
  - `src/cognition/openings/__tests__/opening-v2-constructor.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/openings/__tests__/opening-v2-constructor.test.ts` -> pass (`1` file, `15` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-06-19T06-25-00-770Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Tightened the Opening V2 prompt around a single structural turning point rather than whole-opportunity summarization.
  - Added validator guardrails against reflective jargon, abstract relationship framing, over-broad opportunity coverage, and explanatory context summaries.
  - Regenerated sample Opening V2 outputs from the saved latent run for owner review: `scripts/output/opening-v2-samples-2026-06-19T06-24-43-399Z.json`

## 2026-06-19 - Opening V2 Single Turning Point Calibration

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/openings/opening-v2-constructor/llm-opening-v2-constructor.ts`
  - `src/cognition/openings/opening-v2-constructor/validator.ts`
  - `src/cognition/openings/__tests__/opening-v2-constructor.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/openings/__tests__/opening-v2-constructor.test.ts` -> pass (`1` file, `17` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-06-19T06-41-30-462Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Tightened the prompt so the model must choose one salient turning point, ignore other major shifts, and prefer a narrower doorway-question over a broader summary-question.
  - Added heuristic validation pressure against multiple major shifts by splitting structural node labels into sub-fragments and counting distinct matched turning-point signals.
  - Regenerated sample Opening V2 outputs from the saved latent run for owner review: `scripts/output/opening-v2-samples-2026-06-19T06-41-20-851Z.json`

## 2026-06-19 - Opening V2 Repair and Natural Language Stabilization

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/openings/opening-v2-constructor/llm-opening-v2-constructor.ts`
  - `src/cognition/openings/opening-v2-constructor/validator.ts`
  - `src/cognition/openings/opening-v2-constructor/generate-opening-v2-create-input.ts`
  - `src/cognition/openings/__tests__/opening-v2-constructor.test.ts`
  - `src/cognition/openings/__tests__/generate-opening-v2-create-input.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/openings/__tests__/opening-v2-constructor.test.ts` -> pass (`1` file, `20` tests)
  - `npm.cmd test -- src/cognition/openings/__tests__/generate-opening-v2-create-input.test.ts` -> pass (`1` file, `3` tests)
  - `npm.cmd run typecheck` -> fail first on corrupted generated `.next/dev/types` artifacts, then pass after clearing that generated folder
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> fail first at `docs/build-logs/2026-06-19T08-45-38-895Z.log` on the same corrupted `.next/dev/types` artifacts, then pass at `docs/build-logs/2026-06-19T08-47-27-024Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Split repair into an explicit repair task with failure-specific instructions and previous invalid draft context, instead of treating repair as a broad retry.
  - Tuned multi-shift validation to target enumerated structural bundling while allowing single-action anchored questions like the Markus/Kata repair scene.
  - Regenerated Opening V2 samples from the saved latent run for owner review after the repair changes: `scripts/output/opening-v2-samples-2026-06-19T08-44-29-292Z.json`

## 2026-06-19 - Opening V2 Hungarian Language Polish Pass

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/openings/opening-v2-constructor/llm-opening-v2-constructor.ts`
  - `src/cognition/openings/opening-v2-constructor/generate-opening-v2-create-input.ts`
  - `src/cognition/openings/opening-v2-constructor/index.ts`
  - `src/cognition/openings/__tests__/opening-v2-constructor.test.ts`
  - `src/cognition/openings/__tests__/generate-opening-v2-create-input.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/openings/__tests__/generate-opening-v2-create-input.test.ts` -> pass (`1` file, `5` tests)
  - `npm.cmd test -- src/cognition/openings/__tests__/opening-v2-constructor.test.ts` -> pass (`1` file, `21` tests)
  - Sample review runs from the provided latent run:
    - `scripts/output/opening-v2-samples-2026-06-19T09-08-51-695Z.json`
    - `scripts/output/opening-v2-samples-2026-06-19T09-10-34-897Z.json`
    - `scripts/output/opening-v2-samples-2026-06-19T09-11-08-663Z.json`
- Notes:
  - Added a separate Hungarian-only polish prompt that runs only after an Opening V2 output has already passed validation.
  - Kept repair and polish separate; polish rewrites only `question` and `context`, while preserving non-text fields unchanged.
  - Added guardrails and fallback so the original valid Opening is reused if polish fails provider-side, fails validation, or changes the question frame/anchor in a way that suggests broadened focus.
  - Exposed `polishStatus` in the constructor result for sample-review visibility without changing Opening persistence.

## 2026-06-20 - Latent Discovery Phase 1

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/latent-v2/discovery/types.ts`
  - `src/cognition/latent-v2/discovery/input-packet-composer.ts`
  - `src/cognition/latent-v2/discovery/index.ts`
  - `src/cognition/latent-v2/discovery/__tests__/input-packet-composer.test.ts`
  - `src/cognition/latent-v2/packet-shared.ts`
  - `src/cognition/latent-v2/opportunity-constructor/input-packet-composer.ts`
  - `src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts`
  - `docs/superpowers/plans/2026-06-20-latent-discovery-phase1.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/cognition/latent-v2/discovery/__tests__/input-packet-composer.test.ts src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts` -> pass (`3` files, `29` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-06-20T09-00-44-215Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Added an internal-only Discovery packet contract that is explicitly ephemeral and re-creatable from Observation V2 inputs.
  - Preserved scene grouping, boundary signals, derived structures, and per-scene observation clusters without wiring Discovery into production orchestration yet.
  - Replaced the latent constructor packet's blanket `category: "other"` fallback with derived-structure-based category inference so packet preservation improves before any global behavior swap.

## 2026-06-20 - Latent Discovery Phase 2

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/latent-v2/discovery/types.ts`
  - `src/cognition/latent-v2/discovery/parser.ts`
  - `src/cognition/latent-v2/discovery/validator.ts`
  - `src/cognition/latent-v2/discovery/discovery-pass.ts`
  - `src/cognition/latent-v2/discovery/index.ts`
  - `src/cognition/latent-v2/discovery/__tests__/discovery-runtime.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/cognition/latent-v2/discovery/__tests__/input-packet-composer.test.ts src/cognition/latent-v2/discovery/__tests__/discovery-runtime.test.ts src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts` -> pass (`4` files, `32` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-06-20T09-24-41-890Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Added the first internal Discovery runtime output contract with ephemeral candidate structures, scene refs, evidence groups, structure sketches, distinctness rationale, and uncertainty while keeping identity, lifecycle, salience, and persistence concerns out of scope.
  - Implemented a dedicated Discovery parser and validator that check candidate shape, packet-local scene and observation linkage, evidence-group integrity, and minimal structural presence without reusing Opportunity construction validation rules.
  - Added a first non-production deterministic Discovery pass plus a dense multi-scene regression that verifies multiplicity, late-scene retention, and evidence linkage without cutting production Latent orchestration over to Discovery yet.

## 2026-06-20 - Deep Reflection UX Refinement v1

- Phase: BUILD
- Touched boundaries:
  - `src/ui/reflective-space/deep-reflection-shell.tsx`
  - `src/ui/reflective-space/deep-reflection-shell.module.css`
  - `src/ui/reflective-space/__tests__/deep-reflection-shell.test.tsx`
  - `docs/superpowers/specs/2026-06-20-deep-reflection-ux-refinement-v1-design.md`
  - `docs/superpowers/plans/2026-06-20-deep-reflection-ux-refinement-v1.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/ui/reflective-space/__tests__/deep-reflection-shell.test.tsx` -> pass (`1` file, `2` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`130` files, `649` tests)
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-06-20T09-34-22-794Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Removed the detached Deep Reflection hero treatment so the opening now reads as the first thread entry instead of duplicated header content.
  - Converted the shell into a viewport-bounded thread surface with internal dialogue scrolling and a reduced composer footprint.
  - Omitted empty support sections entirely and added a narrow-screen `Context` reveal control that appears only when support content exists.

## 2026-06-20 - Deep Reflection UX Refinement v2

- Phase: BUILD
- Touched boundaries:
  - `src/ui/reflective-space/deep-reflection-shell.tsx`
  - `src/ui/reflective-space/deep-reflection-shell.module.css`
  - `src/ui/reflective-space/__tests__/deep-reflection-shell.test.tsx`
  - `docs/superpowers/specs/2026-06-20-deep-reflection-ux-refinement-v2-design.md`
  - `docs/superpowers/plans/2026-06-20-deep-reflection-ux-refinement-v2.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/ui/reflective-space/__tests__/deep-reflection-shell.test.tsx` -> pass (`1` file, `2` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`130` files, `649` tests)
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-06-20T10-13-15-694Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Replaced visible shell copy with Hungarian `tegező` language, including a `Kontextus` reveal control and an accessible `Küldés` action.
  - Moved the send action into the composer field, keeping it disabled when the textarea is empty and returning it to the disabled state after a successful submit clears the field.
  - Removed phantom no-rail spacing by centering the thread column when support content is absent, while also softening the outer shell and shifting tones toward Lumira’s green-beige Orientation atmosphere.

## 2026-06-21 - Deep Reflection UX Refinement v3

- Phase: BUILD
- Touched boundaries:
  - `src/ui/reflective-space/deep-reflection-shell.tsx`
  - `src/ui/reflective-space/deep-reflection-shell.module.css`
  - `src/ui/reflective-space/__tests__/deep-reflection-shell.test.tsx`
  - `docs/superpowers/specs/2026-06-21-deep-reflection-ux-refinement-v3-design.md`
  - `docs/superpowers/plans/2026-06-21-deep-reflection-ux-refinement-v3.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/ui/reflective-space/__tests__/deep-reflection-shell.test.tsx` -> pass (`1` file, `2` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`131` files, `654` tests)
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-06-21T06-47-44-869Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Preserved the vertical spaciousness while removing most of the thread-surface chrome so the opening, replies, and composer define the rhythm.
  - Restyled the opening as a lighter lead message and user entries as calm reply bubbles with subtle alignment cues inside Lumira's green-beige atmosphere.
  - Updated the composer placeholder to `Írd le, amit gondolsz...` and enlarged the embedded `Küldés` arrow without changing the button footprint or submit-enable behavior.

## 2026-06-21 - Deep Reflection UX Refinement v4

- Phase: BUILD
- Touched boundaries:
  - `app/objects/[objectId]/reflect/[threadId]/page.tsx`
  - `src/ui/reflective-space/deep-reflection-shell.tsx`
  - `src/ui/reflective-space/deep-reflection-shell.module.css`
  - `src/ui/reflective-space/__tests__/deep-reflection-shell.test.tsx`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/ui/reflective-space/__tests__/deep-reflection-shell.test.tsx` -> pass (`1` file, `3` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`134` files, `668` tests)
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-06-21T10-01-33-799Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Diagnosed that composer margin changes were being visually neutralized by the dialogue lane's flex-fill behavior, then separated the scrollable lane and composer into distinct shell rows so lower composer placement is controlled intentionally instead of by absorbed margins.
  - Added a subtle top-left back chevron that returns one attentional level to object Orientation at `/objects/[objectId]`, using the same quiet circular back-link treatment already established elsewhere in the app.
  - Kept the fixed viewport, internal dialogue scrolling, mobile context reveal behavior, and the prior bubble-depth styling direction unchanged while trimming bottom shell padding so the composer sits closer to the viewport floor.

## 2026-06-20 - Latent Discovery Phase 3

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/latent-v2/discovery/types.ts`
  - `src/cognition/latent-v2/discovery/cue-builder.ts`
  - `src/cognition/latent-v2/discovery/llm-discovery.ts`
  - `src/cognition/latent-v2/discovery/hybrid-discovery-pass.ts`
  - `src/cognition/latent-v2/discovery/validator.ts`
  - `src/cognition/latent-v2/discovery/index.ts`
  - `src/cognition/latent-v2/discovery/__tests__/hybrid-discovery-pass.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/cognition/latent-v2/discovery/__tests__/discovery-runtime.test.ts src/cognition/latent-v2/discovery/__tests__/input-packet-composer.test.ts src/cognition/latent-v2/discovery/__tests__/hybrid-discovery-pass.test.ts` -> pass (`3` files, `11` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-06-20T10-35-41-918Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Added a non-production Hybrid Discovery path that keeps heuristic logic strictly in a cue-building role while delegating candidate discovery itself to a dedicated LLM Discovery pass.
  - Introduced a Discovery-specific prompt and strict JSON-schema contract that ask only for internal candidate reflective structures, preserve multiplicity and ambiguity, and explicitly avoid Opportunity construction, persistence, lifecycle, salience, and user-facing language.
  - Kept Phase 2’s deterministic placeholder pass intact while wiring a separate cue -> LLM -> parser -> validator -> Discovery Result pipeline for experimental validation on dense multi-scene dreams without production cutover.

## 2026-06-21 - Experimental Opportunity Construction Generator Phase 5

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/latent-v2/experimental-opportunity-constructor/types.ts`
  - `src/cognition/latent-v2/experimental-opportunity-constructor/packet.ts`
  - `src/cognition/latent-v2/experimental-opportunity-constructor/parser.ts`
  - `src/cognition/latent-v2/experimental-opportunity-constructor/validator.ts`
  - `src/cognition/latent-v2/experimental-opportunity-constructor/harness.ts`
  - `src/cognition/latent-v2/experimental-opportunity-constructor/llm-experimental-opportunity-constructor.ts`
  - `src/cognition/latent-v2/experimental-opportunity-constructor/comparison.ts`
  - `src/cognition/latent-v2/experimental-opportunity-constructor/regression.ts`
  - `src/cognition/latent-v2/experimental-opportunity-constructor/index.ts`
  - `src/cognition/latent-v2/experimental-opportunity-constructor/__tests__/experimental-opportunity-constructor.test.ts`
  - `src/cognition/latent-v2/experimental-opportunity-constructor/__tests__/regression.test.ts`
  - `scripts/dev-run-latent-v2-experimental-comparison.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/latent-v2/experimental-opportunity-constructor/__tests__/experimental-opportunity-constructor.test.ts src/cognition/latent-v2/experimental-opportunity-constructor/__tests__/regression.test.ts` -> pass (`2` files, `6` tests)
  - `npm.cmd run typecheck` -> failed due pre-existing errors in `src/ui/reflective-space/__tests__/deep-reflection-shell.test.tsx:105` and `:106`
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-06-21T08-02-11-342Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Added an isolated experimental Opportunity Construction path that consumes full evidence plus Discovery output while explicitly treating Discovery as mandatory to consider but not mandatory to promote.
  - Added a diagnostic-heavy experimental output contract that records candidate outcomes, merge decisions, split decisions, rejected candidates, and missed-structure opportunities without changing production Opportunity contracts or persistence.
  - Added side-by-side comparison and regression harnesses so the current constructor and the experimental constructor can be evaluated against the same dream inputs for multiplicity, distinctness, evidence grounding, late-scene retention, and ambiguity preservation.

## 2026-06-23 - Glossary V2 Stabilization Phase 1 - Cross-Dream Continuity Visibility

- Phase: BUILD
- Touched boundaries:
  - `src/domain/glossary/types.ts`
  - `src/domain/glossary/continuity-visibility.ts`
  - `src/domain/glossary/__tests__/continuity-visibility.test.ts`
  - `app/api/reflective-objects/[id]/glossary-candidates/route.ts`
  - `app/api/reflective-objects/[id]/glossary-candidates/__tests__/route.test.ts`
  - `src/reflective-space/composition/compose-object-orientation-payload.ts`
  - `src/reflective-space/composition/__tests__/compose-object-orientation-payload.test.ts`
  - `src/ui/object-orientation/view-model.ts`
  - `src/ui/object-orientation/object-orientation-layer.tsx`
  - `src/ui/object-orientation/object-orientation-layer.module.css`
  - `src/ui/object-orientation/__tests__/orientation-layer.test.tsx`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/domain/glossary/__tests__/continuity-visibility.test.ts app/api/reflective-objects/[id]/glossary-candidates/__tests__/route.test.ts src/reflective-space/composition/__tests__/compose-object-orientation-payload.test.ts src/ui/object-orientation/__tests__/orientation-layer.test.tsx` -> pass (`4` files, `12` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-06-23T07-45-14-696Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Added a projection-only continuity visibility layer that groups existing candidate rows by `sourceCategory + normalizedKey`, preserving current persistence ownership while making cross-dream recurrence visible before confirmation.
  - Extended the reflective-object glossary candidates route and the object orientation payload composer to project `dreamCount`, `firstSeenAt`, `lastSeenAt`, and `possibleContinuity` onto object-local candidates without creating terms, appearances, or confirmation side effects.
  - Surfaced recurring unconfirmed candidates in the orientation glossary panel as a quiet `Lehetséges folytonosság • N álomban` hint, while leaving single-dream candidates and confirmation authority behavior unchanged.
## 2026-06-24 - Glossary V2 Stabilization - Runtime ContinuityHypothesis Contract

- Phase: BUILD
- Touched boundaries:
  - `src/domain/glossary/types.ts`
  - `src/domain/glossary/continuity-hypothesis.ts`
  - `src/domain/glossary/continuity-visibility.ts`
  - `src/domain/glossary/__tests__/continuity-visibility.test.ts`
  - `src/cognition/glossary/extract-glossary-candidates-from-observations.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/domain/glossary/__tests__/continuity-visibility.test.ts` -> pass (`1` file, `6` tests)
  - `npx.cmd vitest run app/api/reflective-objects/[id]/glossary-candidates/__tests__/route.test.ts` -> pass (`1` file, `6` tests)
  - `npx.cmd vitest run src/runtime/orchestration/__tests__/generate-glossary-candidates-for-reflective-object.test.ts` -> pass (`1` file, `8` tests)
  - `npx.cmd vitest run src/cognition/glossary/__tests__/extract-glossary-candidates-from-observations.test.ts` -> pass (`1` file, `10` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run test` -> pass (`136` files, `689` tests)
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-06-24T07-56-44-793Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Introduced a runtime-only `ContinuityHypothesis` domain contract so cross-dream recurrence is represented as an explicit advisory aggregation unit instead of only as candidate decoration.
  - Kept candidate rows dream-local and persistence-neutral while attaching hypothesis-backed visibility summaries to projected candidates.
  - Added conservative grouping rules: prefer `identityKey` when present, otherwise fall back to `sourceCategory + normalizedKey`, and mark fallback-based hypotheses explicitly.

## 2026-07-04 - IF-REF-002B Refinement - Reflection Admission Boundary Hardening

- Phase: BUILD
- Touched boundaries:
  - `app/api/openings/[id]/responses/route.ts`
  - `app/api/openings/[id]/responses/__tests__/route.test.ts`
  - `src/domain/reflection-candidates/contracts.ts`
  - `src/domain/reflection-candidates/types.ts`
  - `src/domain/reflections/contracts.ts`
  - `src/infrastructure/supabase/adapters/reflection-candidate-row.ts`
  - `src/infrastructure/supabase/repositories/reflection-candidate-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/reflection-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/reflection-candidate-supabase-repository.test.ts`
  - `src/infrastructure/supabase/repositories/__tests__/reflection-supabase-repository.test.ts`
  - `supabase/migrations/20260704_0003_reflection_admission.sql`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run app/api/openings/[id]/responses/__tests__/route.test.ts src/infrastructure/supabase/repositories/__tests__/reflection-candidate-supabase-repository.test.ts src/infrastructure/supabase/repositories/__tests__/reflection-supabase-repository.test.ts` -> pass (`3` files, `20` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> not run; ticket validation was explicitly limited to focused route/repository tests plus typecheck when required
- Notes:
  - Moved reflection admission to a single repository-level RPC so reflection creation and candidate archival cannot diverge at the route boundary.
  - Added explicit archived-candidate and candidate-evidence read seams so admitted reflection lineage remains recoverable after archival.
  - Split admission failure handling from candidate-creation failure handling without expanding admission meaning beyond `IF-REF-002B`.

## 2026-07-07 - IF-REF-005 - Reflection Repository Authority Consolidation

- Phase: BUILD
- Touched boundaries:
  - `src/domain/reflections/contracts.ts`
  - `src/domain/reflections/types.ts`
  - `src/infrastructure/supabase/adapters/reflection-row.ts`
  - `src/infrastructure/supabase/repositories/reflection-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/reflection-supabase-repository.test.ts`
  - `src/reflective-space/composition/compose-deep-reflection-payload.ts`
  - `src/reflective-space/composition/__tests__/compose-deep-reflection-payload.test.ts`
  - `app/objects/[objectId]/reflect/[threadId]/page.tsx`
  - `app/api/openings/[id]/responses/__tests__/route.test.ts`
  - `src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts`
  - `src/domain/responses/README.md`
  - `src/reflective-space/README.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/infrastructure/supabase/repositories/__tests__/reflection-supabase-repository.test.ts app/api/openings/[id]/responses/__tests__/route.test.ts src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts src/reflective-space/composition/__tests__/compose-deep-reflection-payload.test.ts` -> pass (`4` files, `34` tests)
  - `npx.cmd tsc --noEmit` -> fails on previously accepted Latent experimental fixture debt: missing `reflectionContext` in `OpportunityConstructorInputPacket` fixtures under `src/cognition/latent-v2/experimental-*` and `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-07T10-53-51-185Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Removed the obsolete direct Reflection creation seam so active repository authority now centers on the admitted production boundary.
  - Removed unused Deep Reflection composition dependencies without changing payload semantics or consumer behavior.
  - Updated repository-facing README files so active runtime authority is described truthfully without rewriting constitutional doctrine or historical context.

## 2026-07-07 - S-01A Observation Repository Authority Alignment

- Phase: BUILD
- Touched boundaries:
  - `src/domain/observation/README.md`
  - `src/cognition/observation/README.md`
  - `docs/v2-build/observation/Observation-V2-Ownership-Implementation-Plan.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-07T16-55-42-313Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Replaced outdated Observation quarantine language with conservative authority language that matches the live V2 write, persistence, retrieval, and downstream cognition seams.
  - Reframed the ownership implementation plan's draft-time repository assessment as historical context and added a current-state note so contributors do not read old cutover analysis as live authority.
  - Preserved compatibility as transitional support and left remaining Observation stabilization items in stewardship unchanged.

## 2026-07-08 - S-01E Observation Lifecycle Completion

- Phase: BUILD
- Touched boundaries:
  - `src/domain/observation/contracts.ts`
  - `src/domain/observation/v2-runtime.ts`
  - `src/domain/observation/__tests__/v2-runtime.test.ts`
  - `src/infrastructure/supabase/adapters/observation-v2-row.ts`
  - `src/infrastructure/supabase/adapters/__tests__/observation-v2-row.test.ts`
  - `src/infrastructure/supabase/repositories/observation-v2-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/observation-v2-supabase-repository.test.ts`
  - `supabase/migrations/20260708_0001_observation_v2_archive_visibility.sql`
  - Observation V2 repository test doubles updated for contract parity in:
    - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
    - `src/runtime/orchestration/__tests__/generate-anchors-for-reflective-object.test.ts`
    - `src/cognition/anchor-v1/constructor/__tests__/input-packet-composer.test.ts`
    - `src/cognition/latent-v2/discovery/__tests__/input-packet-composer.test.ts`
    - `src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts`
    - `src/reflective-space/composition/__tests__/compose-object-orientation-payload.test.ts`
    - `src/reflective-space/composition/__tests__/compose-reflective-space-viewport.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- --run src/domain/observation/__tests__/v2-runtime.test.ts src/infrastructure/supabase/adapters/__tests__/observation-v2-row.test.ts src/infrastructure/supabase/repositories/__tests__/observation-v2-supabase-repository.test.ts src/runtime/orchestration/__tests__/generate-anchors-for-reflective-object.test.ts src/cognition/anchor-v1/constructor/__tests__/input-packet-composer.test.ts` -> pass (`5` files, `20` tests)
  - `npm.cmd run typecheck` -> fails on previously known unrelated Latent `reflectionContext` fixture drift in:
    - `src/cognition/latent-v2/experimental-construction-handoff/__tests__/handoff-harness.test.ts`
    - `src/cognition/latent-v2/experimental-opportunity-constructor/__tests__/experimental-opportunity-constructor.test.ts`
    - `src/cognition/latent-v2/experimental-opportunity-constructor/__tests__/llm-experimental-opportunity-constructor.test.ts`
    - `src/cognition/latent-v2/experimental-opportunity-constructor/__tests__/regression.test.ts`
    - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-08T09-25-41-283Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Realized the remaining Observation-owned lifecycle as archive semantics rather than introducing supersession or version-transition machinery unsupported by the live repository.
  - Exposed persisted Observation V2 lifecycle metadata (`status`, `archivedAt`) in the native contract while preserving active-only default reads for downstream consumers.
  - Added an explicit archived-read path and widened bundle select visibility at the policy layer so archived Observation bundles remain retrievable when lifecycle work explicitly asks for them.

## 2026-07-09 - G-01B Candidate Identity Matching Authority

- Phase: BUILD
- Touched boundaries:
  - `src/infrastructure/supabase/repositories/glossary-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts`
  - `supabase/migrations/20260709_0001_glossary_candidate_identity_authority.sql`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts` -> pass (`1` file, `15` tests)
  - `npm.cmd run typecheck` -> fails on previously known unrelated Latent `reflectionContext` fixture drift in:
    - `src/cognition/latent-v2/experimental-construction-handoff/__tests__/handoff-harness.test.ts`
    - `src/cognition/latent-v2/experimental-opportunity-constructor/__tests__/experimental-opportunity-constructor.test.ts`
    - `src/cognition/latent-v2/experimental-opportunity-constructor/__tests__/llm-experimental-opportunity-constructor.test.ts`
    - `src/cognition/latent-v2/experimental-opportunity-constructor/__tests__/regression.test.ts`
    - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-09T11-04-22-362Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Candidate upsert now prefers `identity_key` when present and only falls back to `normalized_key` for legacy candidate rows that still have null identity metadata.
  - Confirmed continuity authority remains on `glossary_terms.id`; this slice does not change term resolution, appearance authority, or user confirmation boundaries.
  - Added partial unique indexes so identity-backed candidates and legacy normalized-only candidates can coexist without collapsing distinct candidate identities.

## 2026-07-09 - G-01C Glossary Note Authority Cleanup

- Phase: BUILD
- Touched boundaries:
  - `src/domain/glossary/types.ts`
  - `src/domain/glossary/http-contract.ts`
  - `src/infrastructure/supabase/adapters/glossary-row.ts`
  - `src/infrastructure/supabase/repositories/glossary-supabase-repository.ts`
  - `src/cognition/anchor-v1/constructor/input-packet-composer.ts`
  - `src/cognition/latent-v2/opportunity-constructor/input-packet-composer.ts`
  - `src/reflective-space/composition/compose-homepage-orientation-payload.ts`
  - focused tests in:
    - `src/domain/glossary/__tests__/http-contract.test.ts`
    - `src/infrastructure/supabase/adapters/__tests__/glossary-row.test.ts`
    - `src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts`
    - `src/cognition/anchor-v1/constructor/__tests__/input-packet-composer.test.ts`
    - `src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts`
    - `src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/domain/glossary/__tests__/http-contract.test.ts src/infrastructure/supabase/adapters/__tests__/glossary-row.test.ts src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts src/cognition/anchor-v1/constructor/__tests__/input-packet-composer.test.ts src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts` -> pass (`6` files, `59` tests)
  - `npm.cmd run typecheck` -> fails on previously known unrelated Latent `reflectionContext` fixture drift in:
    - `src/cognition/latent-v2/experimental-construction-handoff/__tests__/handoff-harness.test.ts`
    - `src/cognition/latent-v2/experimental-opportunity-constructor/__tests__/experimental-opportunity-constructor.test.ts`
    - `src/cognition/latent-v2/experimental-opportunity-constructor/__tests__/llm-experimental-opportunity-constructor.test.ts`
    - `src/cognition/latent-v2/experimental-opportunity-constructor/__tests__/regression.test.ts`
    - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-09T11-26-37-152Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - `generalNote` now acts as the authoritative Continuity Entity note in parser, adapter, repository, and local downstream reader behavior.
  - `notes` remains only as a compatibility mirror of the authoritative note value and is backfilled from legacy note-only rows when `general_note` is absent.
  - This slice does not change candidate identity authority, continuity entity identity, appearance ownership, or role-level continuity behavior.

## 2026-07-09 - G-01D Glossary Dead Legacy Cleanup

- Phase: BUILD
- Touched boundaries:
  - `src/domain/glossary/contracts.ts`
  - `src/infrastructure/supabase/repositories/glossary-supabase-repository.ts`
  - `src/infrastructure/persistence/README.md`
  - `src/infrastructure/persistence/glossary-store.ts`
  - focused contract-consumer test doubles in:
    - `app/api/reflective-objects/[id]/latent-snapshots/__tests__/route.test.ts`
    - `src/runtime/orchestration/__tests__/generate-anchors-for-reflective-object.test.ts`
    - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
    - `src/cognition/anchor-v1/constructor/__tests__/input-packet-composer.test.ts`
    - `src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - Repository caller audit before deletion:
    - `rg -n "glossary-store" src app` -> only `src/infrastructure/persistence/README.md`
    - `rg -n "\brenameTerm\b" src app` -> repository implementation plus test doubles only; no runtime callers
    - `rg -n "\bensureGlossaryTermForPinnedCandidate\b" src app` -> private method definition only
  - `npm.cmd test -- --run src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts app/api/reflective-objects/[id]/latent-snapshots/__tests__/route.test.ts src/runtime/orchestration/__tests__/generate-anchors-for-reflective-object.test.ts src/cognition/anchor-v1/constructor/__tests__/input-packet-composer.test.ts src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts` -> pass (`5` files, `41` tests)
  - `npm.cmd run typecheck` -> fails on previously known unrelated Latent `reflectionContext` fixture drift in:
    - `src/cognition/latent-v2/experimental-construction-handoff/__tests__/handoff-harness.test.ts`
    - `src/cognition/latent-v2/experimental-opportunity-constructor/__tests__/experimental-opportunity-constructor.test.ts`
    - `src/cognition/latent-v2/experimental-opportunity-constructor/__tests__/llm-experimental-opportunity-constructor.test.ts`
    - `src/cognition/latent-v2/experimental-opportunity-constructor/__tests__/regression.test.ts`
    - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
  - Additional broader affected-module test attempt surfaced the same unrelated drift at runtime:
    - `npm.cmd test -- --run src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts app/api/reflective-objects/[id]/latent-snapshots/__tests__/route.test.ts src/runtime/orchestration/__tests__/generate-anchors-for-reflective-object.test.ts src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts src/cognition/anchor-v1/constructor/__tests__/input-packet-composer.test.ts src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts` -> one unrelated failure in `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts` (`result.mode` expected `persisted`, received `failed`)
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-09T12-07-01-653Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Removed the obsolete glossary persistence bridge file after confirming it had no runtime callers and no compatibility responsibility beyond a stale README mention.
  - Removed the dead `renameTerm` alias from the glossary repository contract, implementation, and dependent test doubles after confirming active runtime code uses `updateTerm`.
  - Removed the unused private `ensureGlossaryTermForPinnedCandidate` helper after confirming no production path or compatibility seam referenced it.
  - Preserved active glossary routes, notes compatibility behavior, continuity identity authority, and all user-facing glossary flows.

## 2026-07-18 - LAT-R01A Latent Generation-Run Authority Foundation

- Phase: BUILD
- Touched boundaries:
  - `supabase/migrations/20260718_0001_latent_generation_run_authority.sql`
  - `src/shared/types.ts`
  - `src/domain/latent-v2/types.ts`
  - `src/domain/latent-v2/contracts.ts`
  - `src/cognition/latent-v2/opportunity-constructor/types.ts`
  - `src/infrastructure/supabase/adapters/latent-opportunity-row.ts`
  - `src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository.ts`
  - `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
  - `src/runtime/orchestration/prepare-latent-opening-for-reflection.ts`
  - focused contract-consumer and adapter tests in:
    - `src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts`
    - `src/infrastructure/supabase/adapters/__tests__/latent-opportunity-row.test.ts`
    - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
    - `src/runtime/orchestration/__tests__/prepare-latent-opening-for-reflection.test.ts`
    - `src/runtime/orchestration/__tests__/generate-anchors-for-reflective-object.test.ts`
    - `src/cognition/anchor-v1/constructor/__tests__/input-packet-composer.test.ts`
    - `src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts`
    - `src/cognition/openings/__tests__/opening-v2-constructor.test.ts`
    - `src/reflective-space/composition/__tests__/compose-deep-reflection-payload.test.ts`
    - latent experimental constructor fixture tests updated for packet-shape compatibility
  - `src/infrastructure/persistence/README.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - Focused latent authority seam:
    - `npx.cmd vitest run src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts src/runtime/orchestration/__tests__/prepare-latent-opening-for-reflection.test.ts` -> pass (`3` files, `22` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`139` files, `729` tests)
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-18T07-42-58-068Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Added first-class Latent generation-run persistence so one dream-scoped reflective object can have one current accepted manifestation set while preserving immutable historical runs and manifestations.
  - Migrated existing manifestations conservatively by grouping each existing `(user_id, priority_reflective_object_id)` manifestation set into one synthetic legacy current run rather than inventing unverifiable historical run boundaries.
  - Opening preparation now reads manifestations through current generation-run authority and only falls back to initial Latent V2 generation when no current run exists.
  - This slice intentionally does not compute canonical recomposition fingerprints from the final constructor packet, automatically supersede current runs, or persist lifecycle/split/merge history.

## 2026-07-18 - LAT-R01A-C1 Generation-Run Authority Hardening

- Phase: BUILD
- Touched boundaries:
  - `supabase/migrations/20260718_0002_latent_generation_run_empty_status_hardening.sql`
  - `src/domain/latent-v2/types.ts`
  - `src/domain/latent-v2/contracts.ts`
  - `src/domain/latent-v2/errors.ts`
  - `src/infrastructure/supabase/adapters/latent-opportunity-row.ts`
  - `src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository.ts`
  - `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
  - `src/runtime/orchestration/prepare-latent-opening-for-reflection.ts`
  - focused validation and contract fixtures in:
    - `src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts`
    - `src/infrastructure/supabase/adapters/__tests__/latent-opportunity-row.test.ts`
    - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
    - `src/runtime/orchestration/__tests__/prepare-latent-opening-for-reflection.test.ts`
    - `src/runtime/orchestration/__tests__/generate-anchors-for-reflective-object.test.ts`
    - `src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts`
    - `src/cognition/anchor-v1/constructor/__tests__/input-packet-composer.test.ts`
    - `src/reflective-space/composition/__tests__/compose-deep-reflection-payload.test.ts`
    - `src/shared/__tests__/latent-generation-run-hardening-migration.test.ts`
  - `src/infrastructure/persistence/README.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - Focused latent hardening seam:
    - `npx.cmd vitest run src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts src/infrastructure/supabase/adapters/__tests__/latent-opportunity-row.test.ts src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts src/runtime/orchestration/__tests__/prepare-latent-opening-for-reflection.test.ts src/shared/__tests__/latent-generation-run-hardening-migration.test.ts` -> pass (`5` files, `33` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`140` files, `738` tests)
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-18T11-18-51-872Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Hardened every supported generation-run transition with write-time expected-status filtering so stale concurrent transitions fail with a domain conflict instead of reporting success from a pre-read.
  - Reserved `no_change` for future recomposition and introduced terminal `empty` assessments for initial zero-opportunity runs so repeated page loads do not create duplicate non-authoritative runs.
  - Restricted generation-run deletion to pending rollback only, preserving accepted and terminal runs as immutable provenance-bearing authority state.

## 2026-07-18 - LAT-R01A-C2 Pending-Run Rollback Authority Fix

- Phase: BUILD
- Touched boundaries:
  - `src/domain/latent-v2/contracts.ts`
  - `src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository.ts`
  - focused repository and orchestration coverage in:
    - `src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts`
    - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
    - `src/shared/__tests__/latent-generation-run-hardening-migration.test.ts`
  - `src/infrastructure/persistence/README.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - Focused rollback-authority seam:
    - `npx.cmd vitest run src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts src/shared/__tests__/latent-generation-run-hardening-migration.test.ts` -> pass (`3` files, `44` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd test` -> pass (`140` files, `760` tests)
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-18T13-42-12-752Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Corrected pending-run rollback deletion so the repository now requests an exact delete count and only treats `count === 1` as confirmed success.
  - Kept deletion rollback-only at the write boundary with `id`, `user_id`, and `status = 'pending'`, while preserving focused conflict reporting for stale or non-pending rows.
  - Strengthened repository coverage around delete result semantics, invalid transition boundaries, and terminal-state deletion rejection; migration coverage remains explicitly static SQL-shape validation rather than behavioral execution proof.
  - Added orchestration regression coverage showing rollback still targets only the failed pending run, preserves reused identities, and keeps the original persistence failure visible when cleanup also fails.

## 2026-07-19 - LAT-R02A Latent Provenance Foundation

- Phase: BUILD
- Touched boundaries:
  - `supabase/migrations/20260719_0001_latent_generation_run_provenance.sql`
  - `src/domain/latent-v2/types.ts`
  - `src/cognition/latent-v2/opportunity-constructor/provenance.ts`
  - `src/cognition/latent-v2/opportunity-constructor/input-packet-composer.ts`
  - `src/cognition/latent-v2/opportunity-constructor/index.ts`
  - `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
  - `src/infrastructure/supabase/adapters/latent-opportunity-row.ts`
  - focused provenance validation in:
    - `src/cognition/latent-v2/opportunity-constructor/__tests__/provenance.test.ts`
    - `src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts`
    - `src/infrastructure/supabase/adapters/__tests__/latent-opportunity-row.test.ts`
    - `src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts`
    - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
    - `src/shared/__tests__/latent-generation-run-hardening-migration.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/cognition/latent-v2/opportunity-constructor/__tests__/provenance.test.ts src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts src/infrastructure/supabase/adapters/__tests__/latent-opportunity-row.test.ts src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts src/shared/__tests__/latent-generation-run-hardening-migration.test.ts` -> pass (`6` files, `78` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-19T10-57-13-486Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Added first-class run-level `authority_fingerprint`, `authority_provenance`, `context_provenance`, and `execution_provenance` persistence without altering legacy `input_fingerprint` meaning.
  - Captured provenance before pending run creation so accepted current and empty runs preserve the actual constructor packet authority, context, and execution contract that produced them.
  - Kept authority fingerprinting constitutionally narrow to Dream, Observation, confirmed Glossary, and admitted Reflection, while preserving Existing Opportunity material and truncation notes exclusively in Context Provenance.
  - Stabilized confirmed Glossary authority ordering so canonically equivalent authority inputs produce the same SHA-256 authority fingerprint.
  - Recorded `LAT-R02A-REV-001` as resolved and the final constitutional assessment for `LAT-R02A` as `SATISFIED`.
  - Preserved two deferred minor debt findings as non-blocking follow-up: Execution Provenance currently duplicates live constructor execution constants, and provenance JSON deserialization still relies on unchecked shape casts.

## 2026-07-19 - LAT-R02B Explicit Invalidation Event Authority

- Phase: BUILD
- Touched boundaries:
  - `supabase/migrations/20260719_0002_latent_generation_run_invalidation.sql`
  - `src/domain/latent-v2/types.ts`
  - `src/domain/latent-v2/contracts.ts`
  - `src/infrastructure/supabase/adapters/latent-opportunity-row.ts`
  - `src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/observation-v2-supabase-repository.ts`
  - focused verification and fixture updates in:
    - `src/shared/__tests__/latent-generation-run-invalidation-migration.test.ts`
    - `src/infrastructure/supabase/adapters/__tests__/latent-opportunity-row.test.ts`
    - `src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts`
    - `src/infrastructure/supabase/repositories/__tests__/observation-v2-supabase-repository.test.ts`
    - `src/cognition/anchor-v1/constructor/__tests__/input-packet-composer.test.ts`
    - `src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts`
    - `src/runtime/orchestration/__tests__/generate-anchors-for-reflective-object.test.ts`
    - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
    - `src/reflective-space/composition/__tests__/compose-deep-reflection-payload.test.ts`
  - `docs/constitution/stewardship/BACKEND_V2_CONSTITUTIONAL_REALIZATION_STATE.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/shared/__tests__/latent-generation-run-invalidation-migration.test.ts` -> pass (`4` tests)
  - `npm.cmd test -- src/infrastructure/supabase/adapters/__tests__/latent-opportunity-row.test.ts` -> pass (`7` tests)
  - `npm.cmd test -- src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts` -> pass (`27` tests)
  - `npm.cmd test -- src/infrastructure/supabase/repositories/__tests__/observation-v2-supabase-repository.test.ts` -> pass (`4` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-19T15-21-11-605Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Added the first immutable, deduplicated Latent invalidation-event table and repository seam without introducing mutable status or resolution fields.
  - Moved Observation V2 archive authority to the atomic SQL RPC `archive_observation_v2_bundle`, which archives the bundle, resolves the eligible accepted target run, and inserts the invalidation request in one transaction.
  - Target resolution now prefers accepted `current` and otherwise the latest accepted `empty` run ordered by `created_at desc, id desc`; `pending`, `failed`, `rejected`, `no_change`, and `superseded` are excluded.
  - Preserved accepted generation runs as immutable history and intentionally did not add staleness classification, reassessment, regeneration, or Opening changes.

## 2026-07-19 - LAT-R02B-C1 Superseded Empty Run Exclusion Correction

- Phase: BUILD
- Touched boundaries:
  - `supabase/migrations/20260719_0002_latent_generation_run_invalidation.sql`
  - `src/shared/__tests__/latent-generation-run-invalidation-migration.test.ts`
  - `docs/constitution/stewardship/BACKEND_V2_CONSTITUTIONAL_REALIZATION_STATE.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/shared/__tests__/latent-generation-run-invalidation-migration.test.ts` -> pass (`5` tests)
  - `npm.cmd test -- src/infrastructure/supabase/repositories/__tests__/observation-v2-supabase-repository.test.ts` -> pass (`4` tests)
  - `npm.cmd test -- src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts` -> pass (`27` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-19T17-35-19-763Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Resolved `LAT-R02B-REV-001` by adding `superseded_at is null` to the fallback accepted `empty` target-selection branch inside `archive_observation_v2_bundle`.
  - Preserved the existing ownership filters, deterministic ordering (`created_at desc, id desc`), archive semantics, dedupe behavior, and invalidation persistence contract.
  - Strengthened the static migration guard so future edits fail if the fallback `empty` branch stops excluding superseded generation runs.

## 2026-07-19 - LAT-R02C Assessment Reuse Resolver and Opening Seam

- Phase: BUILD
- Touched boundaries:
  - `src/domain/latent-v2/types.ts`
  - `src/domain/latent-v2/contracts.ts`
  - `src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts`
  - `src/runtime/orchestration/prepare-latent-opening-for-reflection.ts`
  - `src/runtime/orchestration/__tests__/prepare-latent-opening-for-reflection.test.ts`
  - Latent repository test-double updates in:
    - `src/cognition/anchor-v1/constructor/__tests__/input-packet-composer.test.ts`
    - `src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts`
    - `src/reflective-space/composition/__tests__/compose-deep-reflection-payload.test.ts`
    - `src/runtime/orchestration/__tests__/generate-anchors-for-reflective-object.test.ts`
    - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
  - `docs/constitution/stewardship/BACKEND_V2_CONSTITUTIONAL_REALIZATION_STATE.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts` -> pass (`34` tests)
  - `npm.cmd test -- src/runtime/orchestration/__tests__/prepare-latent-opening-for-reflection.test.ts` -> pass (`9` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-19T17-50-37-611Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Added explicit repository-level reuse resolution so accepted Latent generation runs are reusable only when accepted authority exists and no invalidation event targets that run.
  - Preserved the established accepted-run hierarchy by resolving eligible `current` first and otherwise the latest eligible non-superseded `empty` run.
  - Integrated Opening to consult the reuse resolver before manifestation reuse, while preserving the downstream generation path, legacy fallback path, and the separation between reuse blocking, staleness, and reassessment.

## 2026-07-19 - LAT-R02C-C1 Authoritative Reuse Decision Propagation

- Phase: BUILD
- Touched boundaries:
  - `src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts`
  - `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
  - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
  - `src/runtime/orchestration/prepare-latent-opening-for-reflection.ts`
  - `src/runtime/orchestration/__tests__/prepare-latent-opening-for-reflection.test.ts`
  - `docs/constitution/stewardship/BACKEND_V2_CONSTITUTIONAL_REALIZATION_STATE.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts` -> pass (`35` tests)
  - `npm.cmd test -- src/runtime/orchestration/__tests__/prepare-latent-opening-for-reflection.test.ts` -> pass (`10` tests)
  - `npm.cmd test -- src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts` -> pass (`19` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-19T19-39-52-526Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Aligned accepted-run reuse fallback selection with the R02B authority contract by enforcing deterministic `empty` selection parity on `created_at DESC, id DESC`.
  - Made the repository reuse decision authoritative through the Opening -> Generation seam by passing an explicit guard mode that skips downstream accepted-run reuse checks after Opening has already resolved `reusable = false`.
  - Preserved all unrelated generation semantics, persistence, manifestation creation, fallback behavior, and error handling.
  - Made invalidation evidence selection deterministic with `created_at DESC, id DESC` without adding staleness or reassessment semantics.

## 2026-07-20 - LAT-R03A Repository-Owned Authority Evaluation

- Phase: BUILD
- Touched boundaries:
  - `src/domain/latent-v2/authority-provenance.ts`
  - `src/domain/latent-v2/__tests__/authority-provenance.test.ts`
  - `src/domain/latent-v2/types.ts`
  - `src/domain/latent-v2/contracts.ts`
  - `src/cognition/latent-v2/opportunity-constructor/provenance.ts`
  - `src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts`
  - Latent repository test-double updates in:
    - `src/cognition/anchor-v1/constructor/__tests__/input-packet-composer.test.ts`
    - `src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts`
    - `src/reflective-space/composition/__tests__/compose-deep-reflection-payload.test.ts`
    - `src/runtime/orchestration/__tests__/generate-anchors-for-reflective-object.test.ts`
    - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
  - `docs/constitution/stewardship/BACKEND_V2_CONSTITUTIONAL_REALIZATION_STATE.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/domain/latent-v2/__tests__/authority-provenance.test.ts src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts` -> pass (`2` files, `45` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-20T14-54-23-457Z.log`
  - Build log summary: `docs/BUILD_LOG.md`
- Notes:
  - Extracted canonical Authority Provenance normalization and SHA-256 fingerprinting into a layer-neutral Latent domain primitive so both cognition and repository evaluation depend on the same constitutional identity semantics.
  - Added a detached accepted/candidate authority-evidence repository seam that compares only Authority Provenance and treats caller-supplied fingerprints as derivative evidence subject to repository verification.
  - Kept authority evaluation read-only and lifecycle-free by returning only sameness outcomes plus repository-derived fingerprints, while preserving separation from accepted-run selection, reuse resolution, staleness, reassessment, invalidation, and Opening behavior.

## 2026-07-21 - LAT-R03B Repository-Owned Staleness Determination

- Phase: BUILD
- Touched boundaries:
  - `src/domain/latent-v2/types.ts`
  - `src/domain/latent-v2/contracts.ts`
  - `src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts`
  - Latent repository test-double updates in:
    - `src/cognition/anchor-v1/constructor/__tests__/input-packet-composer.test.ts`
    - `src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts`
    - `src/reflective-space/composition/__tests__/compose-deep-reflection-payload.test.ts`
    - `src/runtime/orchestration/__tests__/generate-anchors-for-reflective-object.test.ts`
    - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
    - `src/runtime/orchestration/__tests__/prepare-latent-opening-for-reflection.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - `npx.cmd vitest run src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts` -> pass (`1` file, `58` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass with pre-existing warnings in `src/cognition/latent-v2/opportunity-constructor/provenance.ts` and `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-21T12-42-05-535Z.log`
  - `npm.cmd test` -> pass (`143` files, `827` tests)
- Notes:
  - Added the first repository-owned Accepted Opportunity staleness seam with exactly two substantive outcomes: `current` and `stale`.
  - Accepted `empty` repository semantics remain an accepted assessment outcome with no published Accepted Opportunity subject, so staleness determination now treats `empty` fallback resolution as a precondition failure rather than as an automatically stale accepted surface.
  - Grounded accepted-basis resolution in the existing repository `current` run seam while consulting the already established eligible accepted `empty` fallback hierarchy only to distinguish `no accepted opportunity exists` from `accepted basis could not be resolved`.
  - Kept Authority Evaluation optional, treated `grounds[]` as deterministic audit explanation only, and preserved separation from reassessment, regeneration, invalidation emission, reuse consequence, and Opening behavior.
  - Narrowed accepted-surface divergence to resolved-surface linkage/coherence failure against the currently resolved accepted basis and Accepted Opportunity target; manifestation count, identity count, and one missing manifestation alone are not stale grounds.
  - Implementation remains complete pending final repository review resolution rather than constitutional closure.

## 2026-07-21 - LAT-R03B Constitutional Closure

- Phase: CLOSURE
- Touched boundaries:
  - `docs/STABILIZATION_LEDGER.md`
- Closure basis:
  - `docs/constitution/clarifications/LATENT_STALENESS_DETERMINATION_CONSTITUTIONAL_DESIGN.md`
  - `docs/superpowers/specs/2026-07-21-latent-staleness-determination-r03b-design.md`
  - completed LAT-R03B implementation and repository review cycle on `main`
  - repository review resolution and final repository review approval
- Accepted validation evidence:
  - Focused repository tests: `npx.cmd vitest run src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts` -> pass (`58` tests)
  - Typecheck: `npm.cmd run typecheck` -> pass
  - Lint: `npm.cmd run lint` -> pass with pre-existing warnings only in `src/cognition/latent-v2/opportunity-constructor/provenance.ts` and `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
  - Build: `npm.cmd run build` -> pass at `docs/build-logs/2026-07-21T12-54-03-147Z.log`
  - Full test suite: `npm.cmd test` -> pass (`143` files, `827` tests)
- Closure record:
  - Initial repository review identified one closure-blocking accepted-surface divergence defect: staleness was being inferred from unsupported manifestation / identity cardinality assumptions.
  - Resolution narrowed accepted-surface divergence to resolved manifestation incoherence against the currently resolved accepted basis or Accepted Opportunity target scope and clarified accepted `empty` as `accepted assessment exists, but no Accepted Opportunity subject exists`.
  - Final repository review approved the corrected slice for constitutional closure with non-blocking observations only.
  - `LAT-R03B` is now constitutionally closed as a repository-owned, deterministic, read-only determination of whether one existing Accepted Opportunity is `current` or `stale` from constitutionally admitted repository evidence only.
  - The institution owns accepted-basis resolution for the target, required accepted-surface resolution, invalidation-currentness evidence for the current accepted basis, accepted-surface integrity evidence, additive stale-ground evaluation, the final `current | stale` judgment, and deterministic audit explanation.
  - The institution does not own Candidate Authority composition, Authority Evaluation execution, reassessment, regeneration, no-change handling, reuse consequence, invalidation production or cleanup, supersession, scheduling, or lifecycle orchestration.
- Final constitutional semantics:
  - Subject: staleness belongs to the Accepted Opportunity; historical generation runs remain immutable evidence and do not themselves become stale.
  - Accepted `empty`: accepted `empty` is neither `current` nor `stale`; it fails outside the substantive contract because no Accepted Opportunity subject exists and does not produce `accepted_surface_divergence`.
  - Substantive outcomes: exactly `current | stale`; repository-resolution and precondition failures remain outside the substantive result contract.
  - Closed stale grounds: `authority_divergence`, `invalidation_currentness_failure`, `accepted_surface_divergence`.
  - Grounds remain independently evaluated, additive, deterministically ordered as `["authority_divergence", "invalidation_currentness_failure", "accepted_surface_divergence"]`, and derivative audit explanation rather than lifecycle instruction.
  - `authority_divergence`: optional `AuthorityEvaluationResult` present and `outcome = materially_changed`; Authority Evaluation remains optional, externally produced, and `constitutionally_identical` does not suppress another stale ground.
  - `invalidation_currentness_failure`: invalidation targets the currently resolved accepted basis while the Accepted Opportunity still depends on that basis; historical invalidation does not contaminate a later current accepted basis and several relevant invalidations still produce one audit ground.
  - `accepted_surface_divergence`: established only when a resolved manifestation links to a different generation run than the resolved accepted basis, falls outside the accepted user scope, or falls outside the target reflective-object scope.
  - Insufficient by themselves: several manifestations, several identity IDs, one missing manifestation, accepted `empty`, generic repository failure, missing fresh Authority Evaluation, or a raw invalidation unrelated to the current accepted basis.
- Remaining non-blocking observations:
  - Authority Evaluation same-basis verifiability remains a deferred institutional observation because the current `AuthorityEvaluationResult` contract does not expose enough identity evidence for repository-side same-basis verification. This is outside LAT-R03B closure scope.
  - The earlier `docs/BUILD_LOG.md` touched-boundary inventory omission was non-blocking and is now corrected in the implementation entry above.
- Next unopened constitutional responsibility:
  - Later `reassessment consumption` is the next explicitly admitted downstream Latent responsibility in the governing doctrine, with later `regeneration policy` and `no-change handling after reassessment` remaining subsequent adjacent work rather than part of LAT-R03B.

## 2026-07-22 - LAT-R04B Authoritative Lifecycle Realization

- Phase: BUILD
- Touched boundaries:
  - `src/domain/latent-v2/lifecycle.ts`
  - `src/domain/latent-v2/__tests__/lifecycle.test.ts`
  - `src/domain/latent-v2/types.ts`
  - `src/domain/latent-v2/contracts.ts`
  - `src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts`
  - `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
  - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
  - `src/shared/__tests__/latent-generation-run-hardening-migration.test.ts`
  - `supabase/migrations/20260722_0001_latent_reflective_continuity.sql`
  - Latent repository test-double synchronization in:
    - `src/cognition/anchor-v1/constructor/__tests__/input-packet-composer.test.ts`
    - `src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts`
    - `src/reflective-space/composition/__tests__/compose-deep-reflection-payload.test.ts`
    - `src/runtime/orchestration/__tests__/generate-anchors-for-reflective-object.test.ts`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/BUILD_LOG.md`
- Verification:
  - `npx.cmd vitest run src/shared/__tests__/latent-generation-run-hardening-migration.test.ts src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts src/domain/latent-v2/__tests__/lifecycle.test.ts` -> pass (`4` files, `99` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-22T15-18-26-262Z.log`
- Notes:
  - Added a repository-grounded lifecycle planner and immutable-history reconstruction seam so posture remains a derived projection rather than an independent authority source.
  - Successor recomposition now assembles a materialized atomic acceptance package with identities, manifestations, evidence graph rows, lifecycle events, and lineage rows scoped to one authoritative repository operation.
  - Reuse now reconstructs prior posture from immutable lifecycle history and fails closed when history is missing or inconsistent; constructor omission alone remains insufficient to emit weakening or abandonment.
  - The continuity migration now represents append-only lifecycle history, immutable lineage history, and successor acceptance projection updates at the schema boundary rather than leaving the RPC as a placeholder.

## 2026-07-23 - LAT-R04D Accepted Authority Delete-Seam Removal

- Phase: BUILD
- Touched boundaries:
  - `src/domain/latent-v2/contracts.ts`
  - `src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository.ts`
  - `src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts`
  - `src/runtime/orchestration/generate-latent-opportunities-for-reflective-object.ts`
  - `src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts`
  - latent repository test-double synchronization in:
    - `src/cognition/anchor-v1/constructor/__tests__/input-packet-composer.test.ts`
    - `src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts`
    - `src/reflective-space/composition/__tests__/compose-deep-reflection-payload.test.ts`
    - `src/runtime/orchestration/__tests__/generate-anchors-for-reflective-object.test.ts`
  - `src/shared/__tests__/latent-generation-run-hardening-migration.test.ts`
  - `supabase/migrations/20260723_0001_latent_authority_delete_hardening.sql`
  - `docs/superpowers/audits/2026-07-23-lat-r04c-targeted-resolution-record.md`
  - `docs/superpowers/plans/2026-07-23-lat-r04c-targeted-resolution-addendum.md`
  - `docs/superpowers/audits/2026-07-23-lat-r04d-accepted-authority-delete-seam-removal.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/shared/__tests__/latent-generation-run-hardening-migration.test.ts src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts src/runtime/orchestration/__tests__/generate-latent-opportunities-for-reflective-object.test.ts src/domain/latent-v2/__tests__/lifecycle.test.ts` -> pass (`4` files, `106` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-23T11-42-43-395Z.log`
  - `supabase --version` -> command not found
  - `docker --version` -> command not found
- Notes:
  - Removed the dormant latent repository direct-create and direct-delete seams that predated atomic successor acceptance.
  - Narrowed rollback cleanup to pending generation-run deletion only.
  - Added trigger-based delete guards so accepted latent authority cannot be deleted through runtime seams, service-role table access, or destructive cascades from guarded parents.
  - Preserved the admitted pending rollback boundary without widening any accepted-authority mutation path.

## 2026-07-29 - RO-010-INV Long-Dream Extraction Completeness Investigation

- Phase: BUILD
- Touched boundaries:
  - `app/capture/page.tsx`
  - `app/capture/page.test.tsx`
  - `docs/BUILD_LOG.md`
  - `src/cognition/observation/llm-scene-observation-diagnostics.ts`
  - `src/cognition/observation/llm-scene-observation-extractor.ts`
  - `src/cognition/observation/__tests__/llm-scene-observation-diagnostics.test.ts`
  - `src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts`
  - `src/cognition/observation/__tests__/scene-discovery-projection.test.ts`
  - `docs/v2-build/observation/RO-010-Long-Dream-Extraction-Investigation.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts src/cognition/observation/__tests__/llm-scene-observation-diagnostics.test.ts src/cognition/observation/__tests__/scene-discovery-projection.test.ts app/capture/page.test.tsx src/infrastructure/persistence/__tests__/observation-v2-write-store.test.ts src/infrastructure/supabase/repositories/__tests__/observation-v2-supabase-repository.test.ts src/infrastructure/supabase/adapters/__tests__/observation-v2-row.test.ts` -> pass (`7` files, `47` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass with `3` pre-existing unrelated warnings in latent V2 files
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-29T11-35-21-192Z.log`
  - `npm.cmd test` -> pass (full Vitest suite, exit `0`)
- Notes:
  - Added attempt-scoped structured diagnostics for provider response, parsed structured output, normalized bundle, guard evaluation, projection, and capture-route persistence counts without logging full dream content.
  - Distinguished raw structured counts from normalized counts and surfaced default-insertion metrics so normalization cannot masquerade as retained extraction completeness.
  - Preserved fail-closed guard semantics and one-retry behavior while making retry stochastic variation observable.
  - Repository evidence now rejects projection and native V2 persistence as the primary late-section loss point for the characterized long-dream failures.

## 2026-07-30 - EXP-01 Observation Candidate Topology Experiment Harness

- Phase: BUILD
- Touched boundaries:
  - `package.json`
  - `scripts/run-observation-topology-experiment.ts`
  - `src/cognition/observation/benchmark/observation-topology-experiment-artifact-writer.ts`
  - `src/cognition/observation/benchmark/observation-topology-experiment-fingerprint.ts`
  - `src/cognition/observation/benchmark/observation-topology-experiment-metrics.ts`
  - `src/cognition/observation/benchmark/observation-topology-experiment-runner.ts`
  - `src/cognition/observation/benchmark/observation-topology-experiment-types.ts`
  - `src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts`
  - `src/cognition/observation/experiment/openai-structured-experiment.ts`
  - `src/cognition/observation/experiment/observation-topology-configuration-helpers.ts`
  - `src/cognition/observation/experiment/configurations/current-baseline.ts`
  - `src/cognition/observation/experiment/configurations/targeted-recovery.ts`
  - `src/cognition/observation/experiment/configurations/hierarchical-local-extraction.ts`
  - `src/cognition/observation/experiment/configurations/layered-output.ts`
  - `docs/v2-build/validation-benchmark/Observation-Candidate-Topology-Experiment-Guide-v1.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd run typecheck` -> pass
  - `.\\node_modules\\.bin\\eslint.cmd src\\cognition\\observation\\benchmark src\\cognition\\observation\\experiment scripts\\run-observation-topology-experiment.ts` -> pass
  - `npx.cmd vitest run src/cognition/observation/benchmark/__tests__/observation-benchmark-runner.test.ts src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts` -> pass (`2` files, `21` tests)
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-07-30T16-10-45-995Z.log`
  - `npx.cmd tsx scripts/run-observation-topology-experiment.ts --benchmark OBS-C-002 --benchmark OBS-A-002 --benchmark OBS-D-001 --configuration A_CURRENT_BASELINE` -> completed with failures, run `20260730T154906Z-39b3730-subset-3-A_CURRENT_BASELINE-r1`
  - `npx.cmd tsx scripts/run-observation-topology-experiment.ts --benchmark OBS-C-002 --benchmark OBS-A-002 --configuration C_TARGETED_RECOVERY --configuration D_HIERARCHICAL_LOCAL_EXTRACTION --configuration F_LAYERED_OUTPUT` -> completed, run `20260730T161328Z-39b3730-subset-2-configs-3-r1`
- Notes:
  - Added a benchmark-only experiment harness under `.validation/observation-topology-experiments/runs/` with stable configuration IDs, independent prompt/schema fingerprints, stage artifacts, and blind-review mappings.
  - Preserved production extractor routing by wrapping the active extractor for Configuration A and keeping C/D/F in validation-only modules outside capture and persistence seams.
  - Added a first layered experimental representation with regions, observations, transitions, uncertainty, completeness, and provenance.

## 2026-08-01 - OBS-V3-01 Source Analysis Shadow Seam

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/source-analysis/`
  - `src/cognition/observation/llm-scene-observation-extractor.ts`
  - `src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts`
  - `src/cognition/observation/benchmark/observation-benchmark-fingerprint.ts`
  - `src/cognition/observation/benchmark/observation-benchmark-runner.ts`
  - `src/cognition/observation/benchmark/__tests__/observation-benchmark-runner.test.ts`
  - `docs/v2-build/observation/Observation-V3-Source-Analysis.md`
  - `docs/v2-build/observation/Observation-V3-Source-Analysis-Responsibility-Scout.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npm.cmd test -- src/cognition/observation-v3/source-analysis/__tests__/source-analysis.test.ts src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts src/cognition/observation/benchmark/__tests__/observation-benchmark-runner.test.ts` -> pass (`3` files, `42` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass with `3` pre-existing unrelated warnings in latent V2/runtime files
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-01T07-15-01-516Z.log`
  - `npm.cmd run benchmark:observation:run -- --id OBS-A-001 --output-root .validation/observation-benchmark/source-analysis-shadow-check` -> completed, run `20260801T074516Z-39b3730-OBS-A-001`
  - `npm.cmd run benchmark:observation:run -- --id OBS-C-002 --output-root .validation/observation-benchmark/source-analysis-shadow-check` -> completed with failures, run `20260801T074515Z-39b3730-OBS-C-002`
  - `npm.cmd run benchmark:observation:run -- --id OBS-D-001 --output-root .validation/observation-benchmark/source-analysis-shadow-check` -> completed, run `20260801T072639Z-39b3730-OBS-D-001`
- Notes:
  - Introduced the first real Observation V3 subsystem boundary in shadow mode without changing the active V2 Observation authority path.
  - Added deterministic source profiling, isolated failure handling, benchmark artifact preservation via `source-profile.json`, and separate contract/analyzer fingerprints.
  - Verified representative short, long-tail, and fragmented benchmark items all emitted source-profile artifacts while preserving normal extraction routing and final benchmark verdict behavior.

## 2026-08-01 - OBS-V3-02B Completeness Analysis Shadow Implementation and V2 Guard Equivalence

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/completeness-analysis/`
  - `src/cognition/observation/llm-scene-observation-extractor.ts`
  - `src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts`
  - `src/cognition/observation/benchmark/observation-benchmark-fingerprint.ts`
  - `src/cognition/observation/benchmark/observation-benchmark-runner.ts`
  - `src/cognition/observation/benchmark/__tests__/observation-benchmark-runner.test.ts`
  - `src/cognition/observation/experiment/configurations/current-baseline.ts`
  - `src/cognition/observation/experiment/configurations/targeted-recovery.ts`
  - `docs/v2-build/observation/Observation-V3-Completeness-Analysis-Shadow-Implementation.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/cognition/observation-v3/completeness-analysis/__tests__/completeness-analysis.test.ts src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts src/cognition/observation/benchmark/__tests__/observation-benchmark-runner.test.ts src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts` -> pass (`4` files, `62` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass with `3` pre-existing unrelated warnings in latent V2/runtime files
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-01T09-25-14-526Z.log`
  - `npm.cmd run benchmark:observation:run -- --id OBS-A-001 --output-root .validation/observation-benchmark/completeness-shadow-check` -> completed, run `20260801T092717Z-39b3730-OBS-A-001`
  - `npm.cmd run benchmark:observation:run -- --id OBS-C-002 --output-root .validation/observation-benchmark/completeness-shadow-check` -> completed with failures, run `20260801T092826Z-39b3730-OBS-C-002`
  - `npm.cmd run benchmark:observation:run -- --id OBS-H-002 --output-root .validation/observation-benchmark/completeness-shadow-check` -> completed with failures, run `20260801T092828Z-39b3730-OBS-H-002`
  - `npm.cmd run benchmark:observation:run -- --id OBS-D-001 --output-root .validation/observation-benchmark/completeness-shadow-check` -> completed, run `20260801T093055Z-39b3730-OBS-D-001`
  - `npm.cmd run benchmark:observation:run -- --id OBS-E-002 --output-root .validation/observation-benchmark/completeness-shadow-check` -> completed, run `20260801T093053Z-39b3730-OBS-E-002`
- Notes:
  - Introduced the V3 Completeness Analysis subsystem as a deterministic, LLM-free shadow evaluator without changing V2 extraction authority, guard behavior, retry routing, fallback behavior, persistence, or final Observation output.
  - Added canonical physical gaps, conservative adequacy classification, authority-neutral recovery recommendations, attempt-level equivalence comparison, and benchmark preservation via `completeness-report.json`.
  - Live shadow validation showed V3 matched failure direction on known omission failures and was materially stricter than active V2 on several currently successful controls, primarily because of tail-gap, missing late-section, and ending-retention rules.

## 2026-08-01 - OBS-V3-02C Completeness Shadow Validation and Rule Calibration

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/completeness-analysis/`
  - `scripts/run-observation-v3-completeness-calibration.ts`
  - `src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts`
  - `docs/v2-build/observation/Observation-V3-Completeness-Shadow-Validation-Plan.md`
  - `docs/v2-build/observation/Observation-V3-Completeness-Rule-Calibration.md`
  - `docs/v2-build/observation/Observation-V3-Completeness-Shadow-Validation-Report-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-Completeness-Analysis-Shadow-Implementation.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/cognition/observation-v3/completeness-analysis/__tests__/completeness-analysis.test.ts src/cognition/observation-v3/completeness-analysis/__tests__/completeness-calibration.test.ts src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts src/cognition/observation/benchmark/__tests__/observation-benchmark-runner.test.ts src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts` -> pass (`5` files, `71` tests)
  - `npx.cmd tsc --noEmit` -> pass
  - `npm.cmd run lint` -> pass with `3` pre-existing unrelated warnings in latent V2/runtime files
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-01T10-41-01-711Z.log`
  - `npx.cmd tsx scripts/run-observation-v3-completeness-calibration.ts` -> executed the full preserved `8x3` matrix, validation root `.validation/observation-v3/completeness-calibration/20260801T100214Z-obs-v3-completeness-calibration/`
  - `npx.cmd tsx scripts/run-observation-v3-completeness-calibration.ts --existing-root .validation/observation-v3/completeness-calibration/20260801T100214Z-obs-v3-completeness-calibration` -> pass, regenerated post-calibration replay summaries against preserved candidate bundles
- Notes:
  - Preserved Observation V2 as the active authority path while calibrating only deterministic V3 completeness rules.
  - Added a frozen pre-calibration replay analyzer so pre/post adequacy can be compared on identical preserved candidate bundles without rerunning provider extraction.
  - Calibration corrected short coherent false positives such as `OBS-A-002` while preserving severe omission sensitivity on `OBS-C-002` and `OBS-H-002`.
  - Accepted multi-scene, fragmented, and uncertainty-heavy controls still show unresolved strictness, so V3 remains shadow-only and not admission-relevant.

## 2026-08-02 - OBS-V3-03B Supplemental Realization Shadow Implementation and Targeted-Recovery Equivalence

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/supplemental-realization/`
  - `src/cognition/observation/experiment/configurations/targeted-recovery.ts`
  - `src/cognition/observation/benchmark/observation-topology-experiment-fingerprint.ts`
  - `src/cognition/observation-v3/memory-composition/__tests__/memory-composition.test.ts`
  - `src/cognition/observation/benchmark/__tests__/targeted-recovery-refinement.test.ts`
  - `src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts`
  - `src/cognition/observation/benchmark/__tests__/observation-expanded-targeted-recovery-baseline.test.ts`
  - `src/cognition/observation/benchmark/__tests__/observation-benchmark-artifact-writer.test.ts`
  - `docs/v2-build/observation/Observation-V3-Supplemental-Realization-Shadow-Implementation.md`
  - `docs/v2-build/observation/Observation-V3-Supplemental-Realization-Equivalence-Report-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-Supplemental-Realization-V2-Equivalence-Plan.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/cognition/observation-v3/supplemental-realization/__tests__/supplemental-realization.test.ts src/cognition/observation-v3/memory-composition/__tests__/memory-composition.test.ts src/cognition/observation/benchmark/__tests__/targeted-recovery-refinement.test.ts src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts src/cognition/observation/benchmark/__tests__/observation-expanded-targeted-recovery-baseline.test.ts src/cognition/observation/benchmark/__tests__/observation-benchmark-artifact-writer.test.ts` -> pass (`6` files, `52` tests)
  - `npx.cmd tsx --eval "<preserved supplemental replay summary>"` -> pass, preserved replay summary `{ total: 23, windowExact: 23, windowDiff: 0, comparisonCounts: { equivalent: 23, equivalent_with_representation_difference: 0, realization_stricter: 0, realization_more_permissive: 0, semantically_incomparable: 0 } }`
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass with `3` pre-existing unrelated warnings in latent V2/runtime files
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-02T12-53-26-309Z.log`
- Notes:
  - Established `src/cognition/observation-v3/supplemental-realization/` as the live shadow owner of bounded supplemental realization planning, prompt preparation, supplemental package construction, provenance, diagnostics, and artifact generation.
  - Rewired the experimental targeted-recovery configuration to delegate bounded supplemental generation to the V3 subsystem while preserving the existing experiment output shape and leaving all production Observation behavior unchanged.
  - Preserved replay showed exact recovery-window equivalence on all `23` replayable preserved canonical-window cases reviewed in this ticket.

## 2026-08-02 - OBS-V3-05A Memory Realization Responsibility Scout and Constitutional Contract

- Phase: BUILD
- Touched boundaries:
  - `docs/v2-build/observation/Observation-V3-Memory-Realization-Responsibility-Scout.md`
  - `docs/v2-build/observation/Observation-V3-Memory-Realization-Contract.md`
  - `docs/v2-build/observation/Observation-V3-Memory-Realization-V2-Equivalence-Plan.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - Documentation consistency review against:
    - `Observation-V3-Architecture.md`
    - `Observation-V3-Subsystem-Contracts.md`
    - `Observation-V3-Dataflow.md`
    - `Observation-V3-Memory-Construction-Philosophy.md`
    - `Observation-V3-Implementation-Blueprint.md`
    - `Observation-V3-Memory-Composition-Contract.md`
    - `Observation-V3-Supplemental-Realization-Contract.md`
    - `Observation-V3-Authority-Admission-Contract.md`
  - Repository scout against current implicit canonicalization and persistence seams in:
    - `src/domain/observation/v2-runtime.ts`
    - `src/cognition/observation/scene-discovery.ts`
    - `src/cognition/observation/experiment/observation-topology-configuration-helpers.ts`
    - `src/infrastructure/persistence/observation-v2-write-store.ts`
    - `src/infrastructure/supabase/adapters/observation-v2-row.ts`
    - `src/infrastructure/supabase/repositories/observation-v2-supabase-repository.ts`
    - `src/cognition/observation-v3/authority-admission/shadow-authority-admission.ts`
    - `app/capture/page.tsx`
- Notes:
  - Defined Memory Realization as the missing canonicalization subsystem between `Memory Composition` and `Authority Admission`.
  - Documented that V2 currently spreads canonicalization across bundle hardening, persistence/row adapters, and the Authority Admission canonical-equivalent shadow adapter.
  - Established that canonical status is structural and admission-ready, but still non-authoritative and not persistence-authorized by itself.

## 2026-08-02 - OBS-V3-05B Memory Realization Shadow Implementation and Canonical-Equivalent Replacement

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/memory-realization/`
  - `src/cognition/observation-v3/authority-admission/`
  - `docs/v2-build/observation/Observation-V3-Memory-Realization-Shadow-Implementation.md`
  - `docs/v2-build/observation/Observation-V3-Memory-Realization-Equivalence-Report-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-Memory-Realization-V2-Equivalence-Plan.md`
  - `docs/v2-build/observation/Observation-V3-Authority-Admission-Shadow-Implementation.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/cognition/observation-v3/memory-realization/__tests__/memory-realization.test.ts src/cognition/observation-v3/authority-admission/__tests__/admission-evaluator.test.ts src/cognition/observation-v3/authority-admission/__tests__/shadow-authority-admission.test.ts` -> pass (`3` files, `40` tests)
  - `npx.cmd vitest run src/cognition/observation-v3/memory-realization/__tests__/memory-realization.test.ts src/cognition/observation-v3/authority-admission/__tests__/shadow-authority-admission.test.ts src/cognition/observation-v3/memory-composition/__tests__/memory-composition.test.ts src/cognition/observation-v3/supplemental-realization/__tests__/supplemental-realization.test.ts src/cognition/observation/benchmark/__tests__/observation-benchmark-artifact-writer.test.ts` -> pass (`5` files, `34` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass with `3` pre-existing unrelated warnings in latent V2/runtime files
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-02T13-31-06-623Z.log`
  - `npx.cmd tsx scripts/run-observation-v3-authority-admission-shadow.ts --review-id 20260802T133200Z-obs-v3-authority-admission-shadow-native-default` -> pass, preserved replay root `.validation/observation-v3/authority-admission-shadow/20260802T133200Z-obs-v3-authority-admission-shadow-native-default/`
- Notes:
  - Implemented native Memory Realization as the default shadow source for canonical candidate identity, canonical hash, realization validation, canonical provenance, and Authority Admission shadow input.
  - Retained the legacy canonical-equivalent adapter only for dual-path comparison and backward readability of older review roots.
  - Applied one bounded contract repair so Authority Admission compares Completeness against upstream candidate lineage hash rather than falsely equating pre-realization candidate hash with post-realization canonical hash.

## 2026-08-02 - OBS-V3-E2E-04 Supplemental Replay Investigation and Native Replay Completion

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/pipeline/replay/`
  - `src/cognition/observation-v3/supplemental-realization/package-builder.ts`
  - `src/cognition/observation/benchmark/observation-topology-experiment-artifact-writer.ts`
  - `src/cognition/observation/benchmark/observation-topology-experiment-runner.ts`
  - `docs/v2-build/observation/Observation-V3-Supplemental-Replay-Investigation.md`
  - `docs/v2-build/observation/Observation-V3-End-to-End-Replay-Completion.md`
  - `docs/v2-build/observation/Observation-V3-Native-Replay-Validation-Report-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-End-to-End-Shadow-Pipeline.md`
  - `docs/v2-build/observation/Observation-V3-Corpus-Replay.md`
  - `docs/v2-build/observation/Observation-V3-Architecture.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/cognition/observation-v3/memory-realization/__tests__/memory-realization.test.ts src/cognition/observation-v3/pipeline/replay/__tests__/preserved-case-loader.test.ts src/cognition/observation-v3/pipeline/replay/__tests__/pipeline-replay-runner.test.ts src/cognition/observation-v3/pipeline/__tests__/pipeline-runner.test.ts src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts src/cognition/observation/benchmark/__tests__/observation-benchmark-runner.test.ts src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts src/cognition/observation-v3/supplemental-realization/__tests__/supplemental-realization.test.ts` -> pass (`9` files, `79` tests)
  - `npx.cmd tsc --noEmit` -> pass
  - `npm.cmd run lint -- src/cognition/observation src/cognition/observation-v3` -> pass
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-02T19-05-50-768Z.log`
  - `npx.cmd tsx --eval ...runObservationV3CorpusReplay(...)` -> pass for deterministic preserved-evidence native replay on `OBS-A-001`, `OBS-C-002`, and `OBS-D-001`
- Notes:
  - Repaired preserved supplemental replay by recovering canonical gap identity from preserved recovery-selection lineage, selecting the newest compatible topology root, and allowing coherent topology extraction replay when standalone benchmark extraction and supplemental lineage diverged.
  - Repaired two native supplemental package-construction defects surfaced by downstream Memory Realization: unclamped recovery-region evidence spans and double-shifting of already-absolute preserved evidence spans.
  - Added checkpointed topology experiment finalization and `--resume-run` support so interrupted experiment runs can continue or finalize without rewriting completed item artifacts.

## 2026-08-10 - OBS-V3-PRECLOSURE-CLEANUP Repository Clarity Hardening

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/memory-realization/`
  - `src/cognition/observation-v3/authority-admission/`
  - `src/cognition/observation-v3/memory-composition/`
  - `src/cognition/observation-v3/pipeline/`
  - `src/cognition/observation-v3/pipeline/replay/`
  - `src/cognition/observation-v3/validation/`
  - `docs/v2-build/observation/Observation-V3-Technical-Debt-Register.md`
  - `docs/v2-build/observation/Observation-V3-Dataflow.md`
  - `docs/v2-build/observation/Observation-V3-Subsystem-Contracts.md`
  - `docs/v2-build/observation/Observation-V3-Architecture.md`
  - `docs/v2-build/observation/Observation-V3-Supplemental-Realization-Responsibility-Scout.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd vitest run src/cognition/observation-v3/memory-realization/__tests__/memory-realization.test.ts src/cognition/observation-v3/authority-admission/__tests__/shadow-authority-admission.test.ts src/cognition/observation-v3/memory-composition/__tests__/memory-composition.test.ts src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts src/cognition/observation-v3/pipeline/replay/__tests__/pipeline-replay-runner.test.ts src/cognition/observation-v3/validation/__tests__/full-benchmark-baseline.test.ts` -> pass (`6` files, `44` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass with `3` pre-existing unrelated warnings in latent V2/runtime files
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-10T07-49-30-331Z.log`
- Notes:
  - Narrowed public Observation V3 barrel exports without removing required compatibility implementations.
  - Moved active native Admission request construction onto a neutral `admission-request` surface and kept the shadow-named builder as a compatibility alias.
  - Renamed active composition terminology toward compatibility-first naming while preserving legacy aliases needed for replay determinism and preserved readers.
  - Refreshed living Observation V3 architecture documents to the post-STAB-08B shadow state and explicitly marked the Supplemental Realization scout as historical proposal evidence.

## 2026-08-10 - OBS-V3-STAB-09 Full Post-Stabilization Baseline Refresh

- Phase: VALIDATION / EVIDENCE REFRESH
- Touched boundaries:
  - `.validation/observation-v3/stab-09/`
  - `scripts/generate-observation-v3-stab-09-artifacts.ts`
  - `docs/v2-build/observation/Observation-V3-Full-Benchmark-Baseline-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-V2-Comparison-Report-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-Production-Candidacy-Assessment.md`
  - `docs/v2-build/observation/Observation-V3-Remaining-Issue-Register.md`
  - `docs/v2-build/observation/Observation-V3-Architecture.md`
  - `docs/v2-build/observation/Observation-V3-Dataflow.md`
  - `docs/v2-build/observation/Observation-V3-Subsystem-Contracts.md`
  - `docs/STABILIZATION_LEDGER.md`
- Verification:
  - `npx.cmd tsx scripts/generate-observation-v3-stab-09-artifacts.ts` -> pass, artifact root `.validation/observation-v3/stab-09/20260810T130000Z-full-post-stabilization-baseline-refresh`
  - `npx.cmd vitest run src/cognition/observation-v3/descriptive-extraction/__tests__/descriptive-extraction.test.ts src/cognition/observation-v3/completeness-analysis/__tests__/completeness-analysis.test.ts src/cognition/observation-v3/supplemental-realization/__tests__/supplemental-realization.test.ts src/cognition/observation-v3/memory-composition/__tests__/memory-composition.test.ts src/cognition/observation-v3/memory-realization/__tests__/memory-realization.test.ts src/cognition/observation-v3/authority-admission/__tests__/admission-evaluator.test.ts src/cognition/observation-v3/authority-admission/__tests__/shadow-authority-admission.test.ts src/cognition/observation-v3/pipeline/__tests__/pipeline-runner.test.ts src/cognition/observation-v3/pipeline/__tests__/pipeline-summary.test.ts src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts src/cognition/observation-v3/pipeline/replay/__tests__/pipeline-replay-runner.test.ts src/cognition/observation-v3/pipeline/replay/__tests__/preserved-case-loader.test.ts src/cognition/observation-v3/validation/__tests__/full-benchmark-baseline.test.ts src/cognition/observation/benchmark/__tests__/observation-benchmark-runner.test.ts src/cognition/observation/benchmark/__tests__/observation-topology-experiment-runner.test.ts` -> pass (`15` files, `147` tests)
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass with `3` pre-existing unrelated warnings in latent V2/runtime files
  - `npm.cmd run build` -> pass at `docs/build-logs/2026-08-10T10-16-15-774Z.log`
- Notes:
  - Refreshed the full 17-case Observation V3 post-stabilization baseline against current main at commit `547648d`.
  - Produced fresh machine-readable baseline, semantic comparison, admission distribution, determinism, cost/latency, issue-classification, documentation-consistency, and summary artifacts under the STAB-09 root.
  - Fresh evidence preserved repaired lifecycle and governance invariants, kept deterministic replay stable, and shifted production-candidacy posture to constitutional closure review rather than runtime cutover readiness.

## 2026-08-10 - OBS-V3-STAB-10 Constitutional Closure Review

- Phase: CLOSURE
- Touched boundaries:
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/CURRENT_STATE.md`
- Closure verdict:
  - `CONSTITUTIONALLY CLOSED WITH STEWARDSHIP OBSERVATIONS`
- Closure record basis:
  - `docs/v2-build/observation/Observation-V3-Constitutional-Closure-Criteria.md`
  - `docs/v2-build/observation/Observation-V3-Full-Benchmark-Baseline-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-V2-Comparison-Report-2026-08.md`
  - `docs/v2-build/observation/Observation-V3-Remaining-Issue-Register.md`
  - `docs/v2-build/observation/Observation-V3-Production-Candidacy-Assessment.md`
- Review outcome:
  - Architecture completeness -> `SATISFIED`
  - Governance correctness -> `SATISFIED`
  - Semantic quality -> `SATISFIED`
  - Deterministic stability -> `SATISFIED`
  - Unresolved observations -> `SATISFIED`
  - Documentation status -> `SATISFIED`
- Non-blocking stewardship observations:
  - bounded duplicate or overlap-style accretion remains on a small number of cases
  - explicit compatibility or transition seams remain and stay non-authoritative
  - benchmark-grade rather than rollout-grade operational evidence remains outside closure
- Runtime-cutover blockers retained outside closure:
  - no V3 primary-runtime persistence, routing, read, rollback, or coexistence path exists
  - long-case incompleteness and live-provider late-section guard instability remain runtime-readiness concerns
- Constitutional consequence:
  - Observation V3 constitutional architecture and stabilization are formally closed
  - Observation V3 does not become production authority by this review
  - Observation V2 remains the only production authority pending separate runtime-readiness and cutover work
- Verification:
  - repository evidence review against current `main` and the refreshed STAB-09 package -> closure verdict issued
  - `rg -n "OBS-V3-STAB-10|CONSTITUTIONALLY CLOSED WITH STEWARDSHIP OBSERVATIONS|Observation V3 is constitutionally closeable pending formal review|No remaining issue currently traces" docs/STABILIZATION_LEDGER.md docs/CURRENT_STATE.md docs/v2-build/observation` -> pass

## 2026-08-10 - OBS-V3-RUNTIME-PERF-02 Fresh Provider-Backed Measurement

- Phase: VALIDATION
- Touched boundaries:
  - `src/cognition/observation-v3/pipeline`
  - `src/cognition/observation-v3/validation`
  - `scripts/run-observation-v3-runtime-perf-measurement.ts`
- Notes:
  - Added non-identity end-to-end and per-stage timing metadata to the Observation V3 pipeline result and persisted summary artifacts.
  - Added a focused four-case fresh provider-backed runtime-perf validation runner for `OBS-A-002`, `OBS-E-002`, `OBS-C-003`, and `OBS-H-002`.
  - Preserved deterministic identity, canonical hash, replay, and governance boundaries while reusing existing provider evidence for token, latency, and retry accounting.
- Verification:
  - `npx.cmd vitest run src/cognition/observation-v3/descriptive-extraction/__tests__/descriptive-extraction.test.ts src/cognition/observation-v3/supplemental-realization/__tests__/supplemental-realization.test.ts src/cognition/observation-v3/pipeline/replay/__tests__/pipeline-replay-runner.test.ts src/cognition/observation-v3/pipeline/__tests__/pipeline-runner.test.ts src/cognition/observation-v3/pipeline/__tests__/pipeline-summary.test.ts src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts src/cognition/observation-v3/validation/__tests__/full-benchmark-baseline.test.ts src/cognition/observation-v3/validation/__tests__/runtime-perf-measurement.test.ts` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-10T13-12-16-283Z.log`)
  - `npx.cmd tsx scripts/run-observation-v3-runtime-perf-measurement.ts --measurement-id 20260810T151500Z-obs-v3-runtime-perf-measurement` -> pass
- Evidence:
  - `.validation/observation-v3/runtime-perf-measurement/20260810T151500Z-obs-v3-runtime-perf-measurement/`

## 2026-08-10 - OBS-V3-LATENT-02 Latent Generation-Run Persistence Mapping

- Phase: BUILD
- Touched boundaries:
  - `supabase/migrations`
  - `src/domain/latent-v2`
  - `src/infrastructure/supabase/adapters`
  - `src/infrastructure/supabase/repositories`
  - `src/runtime/orchestration`
  - `src/reflective-space/composition`
  - `src/cognition/openings`
  - `src/cognition/anchor-v1`
  - `src/cognition/latent-v2/opportunity-constructor`
- Notes:
  - Added an explicit generation-run observation authority-family discriminator so Latent persistence no longer has to infer V2 versus V3 lineage from nullable provenance alone.
  - Extended latent evidence-observation persistence with a native V3 reference surface while preserving historical V2 rows and the existing V2 foreign-key path.
  - Kept active Latent runtime generation and invalidation behavior V2-only; only persistence, mapping, and V2-only read guards were widened.
- Verification:
  - `npx.cmd vitest run src/shared/__tests__/latent-generation-run-hardening-migration.test.ts src/infrastructure/supabase/adapters/__tests__/latent-opportunity-row.test.ts src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-10T21-04-44-008Z.log`)

## 2026-08-10 - OBS-V3-LATENT-03 V3-Native Latent Input Packet & Enrichment Foundation

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/latent-v2/opportunity-constructor`
  - `src/cognition/latent-v2/opportunity-constructor-v3`
- Notes:
  - Added a separate shadow-only Observation V3 Latent packet path that composes native V3 authority, locality, unit, evidence, uncertainty, and provenance into a V3-specific constructor packet.
  - Added deterministic Latent-owned enrichment for the V3 path so unit/locality semantic cues no longer depend on Observation V2 `derivedStructures`.
  - Added V3-specific prompt, parser, validator, mapper, and shadow execution harness surfaces while leaving the active V2 constructor, prompt, orchestration, persistence lineage, and invalidation behavior unchanged.
- Verification:
  - `npx.cmd vitest run src/cognition/latent-v2/opportunity-constructor-v3/__tests__/opportunity-constructor-v3.test.ts src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts src/cognition/latent-v2/opportunity-constructor/__tests__/opportunity-constructor.test.ts` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-10T21-29-04-041Z.log`)

## 2026-08-10 - OBS-V3-LATENT-02 Migration Guard Repair

- Phase: BUILD
- Touched boundaries:
  - `supabase/migrations`
  - `src/shared/__tests__`
- Notes:
  - Repaired the LATENT-02 persistence migration so historical Observation-family interpretation comes from additive schema defaults rather than guarded authority-row backfill updates.
  - Added structural partial-application repair for pre-V3 discriminator columns and hard-stop exceptions for unsafe mixed partial state that would otherwise require authority mutation.
  - Preserved the continuity guard, accepted continuity seam, V2 foreign keys, and active runtime behavior unchanged.
- Verification:
  - `npx.cmd vitest run src/shared/__tests__/latent-generation-run-hardening-migration.test.ts src/infrastructure/supabase/adapters/__tests__/latent-opportunity-row.test.ts src/infrastructure/supabase/repositories/__tests__/latent-opportunity-supabase-repository.test.ts` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-10T22-00-50-714Z.log`)

## 2026-08-11 - Lumira Meditation Module Port

- Phase: BUILD
- Touched boundaries:
  - `src/ui/homepage`
  - `app/meditation`
  - `src/features/meditation`
  - `data/meditations`
  - `data/audio`
  - `public/backgrounds`
  - `public/audio`
- Notes:
  - Replaced the homepage `Recent objects` tile with a Lumira-compatible Meditation entry tile using the approved invitation line and a direct `/meditation` entry point.
  - Ported the Kincstarto meditation module into an isolated Lumira feature boundary with file-based meditation JSON loading, audio map loading, ring selection UI, preview state, reader flow, and route-local back navigation.
  - Kept the storage model file-based for the first pass and avoided reflective-system schema or repository changes while still bringing over the supporting background and audio assets required by the meditation experience.
- Verification:
  - `npm.cmd test -- src/ui/homepage/__tests__/homepage-orientation-hub.test.tsx` -> pass
  - `npm.cmd test -- src/features/meditation/lib/meditation-loaders.test.ts src/features/meditation/lib/audio-loaders.test.ts` -> pass
  - `npm.cmd test -- src/features/meditation/components/MeditationSpace.test.tsx` -> pass
  - `npm.cmd test -- app/meditation/page.test.tsx` -> pass
  - `npm.cmd test -- src/features/meditation/components/MeditationSpace.test.tsx src/features/meditation/lib/meditation-loaders.test.ts src/features/meditation/lib/audio-loaders.test.ts app/meditation/page.test.tsx src/ui/homepage/__tests__/homepage-orientation-hub.test.tsx` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-11T09-08-31-013Z.log`)
- Follow-up stabilization:
  - Refined the homepage Meditation panel overlay/CTA to match the approved capture-style hover behavior while keeping the Kincstarto visual world.
  - Restored meditation reader text continuity across pause blocks, switched the active-session exit control to a round `X`, and exposed editor mode correctly for authenticated admins on the `/meditation` route.
  - Added reader-step regression coverage and reran repository verification for the follow-up patch.
  - `npm.cmd test -- src/features/meditation/lib/reader-step.test.ts` -> pass
  - `npm.cmd test -- app/meditation/page.test.tsx` -> pass
  - `npm.cmd test -- src/ui/homepage/__tests__/homepage-orientation-hub.test.tsx` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-11T09-54-38-594Z.log`)
  - Added admin inline editor preview support so timing can be checked from the currently selected text block without leaving editor mode, with manual stop and auto-stop on direct editing-field interaction.
  - Extended the reader/audio engines to support mid-sequence preview starts while preserving default start-from-beginning behavior in normal reader mode.
  - Added pure preview-selection and auto-stop policy coverage for the new editor preview logic and reran fresh repository verification for the follow-up patch.
  - `npx.cmd vitest run src/features/meditation/lib/editor-preview.test.ts src/features/meditation/lib/reader-step.test.ts` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-11T18-34-46-885Z.log`)

## 2026-08-11 - OBS-V3-CUTOVER-09 Capture / Generation Authority Routing Seam

- Phase: BUILD
- Touched boundaries:
  - `app/capture`
  - `src/runtime/orchestration`
  - `src/cognition/observation-v3/pipeline`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Added a transitional capture-time routing seam that resolves Observation generation explicitly as `default_v2` or `explicit_v3` without changing the live V2 default.
  - Split runtime behavior into generation-then-persistence so capture still fails before reflective-object creation when generation fails, while explicit V3 persists only admitted native V3 authority.
  - Extended the shadow-pipeline authority-admission stage payload with the full admission decision so the runtime seam can construct authoritative `ObservationV3AuthorityRecord` state without introducing a V2 compatibility authority path.
- Verification:
  - `npx.cmd vitest run app/capture/page.test.tsx src/runtime/orchestration/__tests__/generate-observation-for-reflective-object.test.ts` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-11T14-57-22-099Z.log`)
- Follow-up note:
  - The successful build preserved an existing Turbopack NFT tracing warning rooted through `next.config.ts`; this ticket did not widen or remediate that warning.

## 2026-08-11 - OBS-V3-CUTOVER-10 Controlled Production Evaluation Switch

- Phase: BUILD
- Touched boundaries:
  - `app/capture`
  - `src/runtime/orchestration`
  - `src/infrastructure/environment`
  - `src/infrastructure/supabase/client/__tests__`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Added a single environment-backed capture authority control through `OBSERVATION_CAPTURE_AUTHORITY_MODE`, resolved at runtime to the existing Observation seam as `default_v2` or `explicit_v3`.
  - Kept V2 as the conservative fallback for unset or invalid configuration and preserved rollback as future-routing-only behavior with no mutation of already-persisted V3 authority.
  - Routed the resolved control consistently through capture generation and immediate downstream glossary read resolution, while adding selected-mode visibility to existing capture diagnostics and failure logs instead of introducing a broader observability layer.
- Verification:
  - `npx.cmd vitest run app/capture/page.test.tsx src/runtime/orchestration/__tests__/resolve-observation-capture-authority-mode.test.ts src/infrastructure/environment/__tests__/env.test.ts` -> pass
  - `npx.cmd vitest run src/runtime/orchestration/__tests__/generate-observation-for-reflective-object.test.ts` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-11T14-59-33-789Z.log`)
- Follow-up note:
  - The successful build preserved the existing Turbopack NFT tracing warning rooted through `next.config.ts`; this ticket did not widen or remediate that warning.
- Follow-up stabilization:
  - Added one bounded iterative V3 supplemental-recovery pass on the live shadow pipeline when post-composition admission still returns `deferred_for_supplemental_realization` with an eligible targeted recovery route.
  - Kept the retry fail-closed and V3-native: no V3→V2 fallback was introduced, and the retry only re-enters supplemental realization, composition, canonical realization, and admission.
  - Added a live pipeline regression proving that a deferred first recovery pass can become admitted after the second bounded supplemental pass.
  - `npx.cmd vitest run src/runtime/orchestration/__tests__/generate-observation-for-reflective-object.test.ts src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-11T18-44-52-633Z.log`)
  - Fixed the capture-default live V3 path so the same iterative supplemental recovery still runs when capture passes `liveProviderExecution: {}` without an explicit `supplementalRealization` block.
  - Added a regression that mocks the default supplemental provider executor and proves the second bounded supplemental pass is invoked twice on the live capture-style path.
  - `npx.cmd vitest run src/runtime/orchestration/__tests__/generate-observation-for-reflective-object.test.ts src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-11T20-58-47-069Z.log`)

## 2026-08-13 - Observation V3 Memory Composition Semantic Reconciliation

- Phase: BUILD
- Touched boundaries:
  - `src/cognition/observation-v3/memory-composition`
  - `src/cognition/observation-v3/memory-realization/__tests__`
  - `src/cognition/observation-v3/authority-admission/__tests__`
  - `src/cognition/observation-v3/pipeline/__tests__`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Added a bounded semantic-equivalence reconciliation pass inside `memory_composition` after overlap detection so semantically equivalent or refinement-level baseline and supplemental material can resolve into one composed unit before canonical realization.
  - Distinguishes intra-recovery deduplication from baseline-plus-recovery refinement reconciliation by requiring compatible chronology, locality, and supporting evidence while preserving genuine ambiguity as unresolved overlap alternatives.
  - Preserved evidence, provenance, and uncertainty lineage across merged units and folded recovery-derived localities back into baseline localities when their surviving units did not establish a genuinely new boundary.
  - Corrected overlap classification ordering so `possible_duplicate` can be emitted before the generic `partial_overlap` branch.
- Verification:
  - `npm.cmd test -- src/cognition/observation-v3/memory-composition/__tests__/memory-composition.test.ts` -> pass
  - `npm.cmd test -- src/cognition/observation-v3/memory-realization/__tests__/memory-realization.test.ts` -> pass
  - `npm.cmd test -- src/cognition/observation-v3/authority-admission/__tests__/admission-evaluator.test.ts` -> pass
  - `npm.cmd test -- src/cognition/observation-v3/pipeline/__tests__/shadow-pipeline.test.ts` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-13T09-10-12-435Z.log`)
- Follow-up note:
  - The successful build preserved the existing Turbopack NFT tracing warning rooted through `next.config.ts`; this ticket did not widen or remediate that warning.

## 2026-08-18 - OBS-V3-CUTOVER-12 Runtime Authority Cutover

- Phase: BUILD
- Touched boundaries:
  - `src/runtime/orchestration`
  - `src/infrastructure/persistence`
  - `src/cognition/latent-v2/opportunity-constructor`
  - `app/api/reflective-objects/[id]/observations`
  - `docs/CURRENT_STATE.md`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Added one shared runtime Observation authority resolver and flipped the normal live authority mode to V3, while keeping explicit V2 selection as bounded compatibility behavior.
  - Cut native Observation reads, glossary generation, and latent-opening preparation over to the shared native authority seam so normal live flows no longer depend on implicit `default_v2` routing or V2-only latent generation gates.
  - Demoted legacy manual Observation POST ingress to read-only compatibility by rejecting authority-capable writes instead of allowing competing legacy Observation state to be created after cutover.
- Verification:
  - `npx.cmd vitest run src/infrastructure/persistence/__tests__/observation-native-read-store.test.ts src/runtime/orchestration/__tests__/resolve-observation-capture-authority-mode.test.ts src/runtime/orchestration/__tests__/prepare-latent-opening-for-reflection.test.ts app/api/reflective-objects/[id]/observations/__tests__/route.test.ts` -> pass
  - `npx.cmd vitest run app/capture/page.test.tsx src/runtime/orchestration/__tests__/generate-glossary-candidates-for-reflective-object.test.ts app/api/reflective-objects/[id]/glossary-candidates/__tests__/route.test.ts app/api/reflective-space/viewport/__tests__/route.test.ts src/cognition/latent-v2/opportunity-constructor/__tests__/input-packet-composer.test.ts` -> pass
  - `npx.cmd vitest run src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts src/reflective-space/composition/__tests__/compose-object-orientation-payload.test.ts src/reflective-space/composition/__tests__/compose-reflective-space-viewport.test.ts` -> pass
  - `npm.cmd run typecheck` -> fails on pre-existing replay-test typing errors in `src/cognition/observation-v3/pipeline/replay/__tests__/preserved-case-loader.test.ts`
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-18T19-45-33-273Z.log`)
- Follow-up note:
  - The successful build preserved the existing Turbopack NFT tracing warning rooted through `next.config.ts`; this ticket did not widen or remediate that warning.

## 2026-08-19 - Observation V3 Formal Cutover Closure Documentation

- Phase: BUILD
- Touched boundaries:
  - `docs/CURRENT_STATE.md`
  - `docs/STABILIZATION_LEDGER.md`
  - `docs/v2-build/observation/Observation-V3-Runtime-Cutover-Prerequisites.md`
- Notes:
  - Formally recorded in living documentation that Observation V3 is the active runtime Observation authority on normal live flows and that the runtime cutover workstream is closed.
  - Recorded that retained V2 behavior is compatibility-only, that legacy/manual Observation ingress is non-authoritative, and that current stabilization no longer requires generic Observation V3 cognition hardening.
  - Recorded the accepted post-cutover benchmark baseline as `20260818T195354Z-obs-v3-full-benchmark-baseline` with preserved `17/17 fully_replayable` and `17/17 admitted_with_observations` outcomes.
  - Preserved residual non-blocking debt separately: standalone `typecheck` remains red in `src/cognition/observation-v3/pipeline/replay/__tests__/preserved-case-loader.test.ts`, `default_v2` remains in compatibility vocabulary, and broader legacy/V2 residue cleanup remains a later workstream.
- Verification:
  - Verified the living documentation surfaces in scope no longer describe Observation V2 as the active runtime authority.
  - Confirmed remaining contrary references under `docs/v2-build/observation` are historical shadow-era records rather than current living authority state.

## 2026-08-19 - Fortune Journaling MVP Foundation and First Local Session

- Phase: BUILD
- Touched boundaries:
  - `app/fortune`
  - `src/content/fortune-journaling`
  - `src/features/fortune-journaling`
  - `src/reflective-space/composition`
  - `src/ui/homepage`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Added an authenticated `/fortune` daytime entry point and a top-level homepage Fortune tile without routing Fortune through Dream Journal, capture object types, recent objects, or the dream opening pipeline.
  - Added authoritative bundled Fortune content loaders for the 22-card Major Arcana deck and the authored tarot mode library, while keeping only `situation_unfolding` / `Helyzet kibontása` active in the MVP UI.
  - Implemented a local-only Fortune session slice with isolated deterministic deck draw, authored position assignment, optional focus, user-triggered hints, required first interpretation, and a temporary completion state with no persistence or AI generation.
- Verification:
  - `npm.cmd test -- src/content/fortune-journaling/index.test.ts src/features/fortune-journaling/session.test.ts app/fortune/page.test.tsx src/ui/homepage/__tests__/homepage-orientation-hub.test.tsx` -> pass
  - `npm.cmd run lint` -> fails on pre-existing unrelated lint errors in `src/cognition/glossary/__tests__/extract-glossary-candidates-from-observations.test.ts`, `src/reflective-space/composition/__tests__/compose-deep-reflection-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-object-orientation-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-reflective-space-viewport.test.ts`, and `src/runtime/orchestration/__tests__/generate-glossary-candidates-for-reflective-object.test.ts`
  - `npm.cmd run typecheck` -> fails on pre-existing unrelated type errors in `src/cognition/latent-v2/opportunity-constructor-v3/__tests__/opportunity-constructor-v3.test.ts` and `src/cognition/observation-v3/pipeline/replay/__tests__/preserved-case-loader.test.ts`
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-19T11-27-14-156Z.log`)
- Follow-up note:
  - The successful build preserved the existing Turbopack NFT tracing warning rooted through `next.config.ts`; this ticket did not widen or remediate that warning.

## 2026-08-19 - Fortune Journaling Session Persistence Foundation

- Phase: BUILD
- Touched boundaries:
  - `supabase/migrations`
  - `src/domain/fortune-sessions`
  - `src/infrastructure/supabase/adapters`
  - `src/infrastructure/supabase/repositories`
  - `app/api/fortune/sessions`
  - `app/fortune`
  - `src/features/fortune-journaling`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Added a dedicated `fortune_sessions` persistence table with owner-scoped RLS, minimal `active | completed` state, bundled-content card references, and no reuse of dream, thread, response, opening, or reflective-object persistence substrates.
  - Added a Fortune session domain/repository/API boundary that creates sessions atomically at draw time, preserves authored position keys and exact card ids, and completes the current slice by storing the first interpretation without adding AI or transcript turns.
  - Updated `/fortune` to recover persisted sessions explicitly from `?session=<id>`, resolving card ids back through bundled Major Arcana content and avoiding silent latest-session resume or redraw drift.
- Verification:
  - `npm.cmd test -- src/content/fortune-journaling/index.test.ts src/features/fortune-journaling/session.test.ts src/shared/__tests__/fortune-session-persistence-migration.test.ts src/infrastructure/supabase/repositories/__tests__/fortune-session-supabase-repository.test.ts app/api/fortune/sessions/route.test.ts app/api/fortune/sessions/[id]/route.test.ts app/fortune/page.test.tsx src/ui/homepage/__tests__/homepage-orientation-hub.test.tsx` -> pass
  - `npm.cmd run lint` -> fails on pre-existing unrelated lint errors in `src/cognition/glossary/__tests__/extract-glossary-candidates-from-observations.test.ts`, `src/reflective-space/composition/__tests__/compose-deep-reflection-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-object-orientation-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-reflective-space-viewport.test.ts`, and `src/runtime/orchestration/__tests__/generate-glossary-candidates-for-reflective-object.test.ts`
  - `npm.cmd run typecheck` -> fails on generated `.next/types/validator.ts` route-type resolution plus pre-existing unrelated errors in `src/cognition/latent-v2/opportunity-constructor-v3/__tests__/opportunity-constructor-v3.test.ts` and `src/cognition/observation-v3/pipeline/replay/__tests__/preserved-case-loader.test.ts`
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-19T12-04-13-740Z.log`)
- Follow-up note:
  - The successful build preserved the existing Turbopack NFT tracing warning rooted through `next.config.ts`; this ticket did not widen or remediate that warning.

## 2026-08-19 - Fortune AI Facilitator V1

- Phase: BUILD
- Touched boundaries:
  - `supabase/migrations`
  - `src/domain/fortune-sessions`
  - `src/content/fortune-journaling`
  - `src/features/fortune-journaling`
  - `src/infrastructure/supabase/adapters`
  - `src/infrastructure/supabase/repositories`
  - `app/api/fortune/sessions/[id]`
  - `app/api/fortune/sessions/[id]/facilitator-turn`
  - `app/api/fortune/sessions/[id]/reflective-reply`
  - `app/fortune`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Added a dedicated `fortune_session_turns` persistence layer with owner-scoped access, v1-scoped uniqueness for one assistant reflective prompt and one user reflective reply, and no reuse of dream threads, responses, openings, or reflective objects.
  - Split the Fortune session lifecycle so storing `first_interpretation` keeps the session `active`, assistant generation remains idempotent and retryable on the same session, and completion now happens only after the persisted reflective reply.
  - Added a Fortune-specific facilitator packet/runtime and authenticated API endpoints that resolve bundled mode/card context on the server, persist exactly one structured `reflection + question` assistant turn, persist one user reply, and recover the flow explicitly from `?session=<id>` plus persisted turns.
- Verification:
  - `npx.cmd vitest run src/shared/__tests__/fortune-session-turns-migration.test.ts src/infrastructure/supabase/repositories/__tests__/fortune-session-turn-supabase-repository.test.ts src/infrastructure/supabase/repositories/__tests__/fortune-session-supabase-repository.test.ts src/features/fortune-journaling/facilitator/__tests__/fortune-facilitator-runtime.test.ts src/content/fortune-journaling/index.test.ts src/features/fortune-journaling/session.test.ts app/api/fortune/sessions/route.test.ts app/api/fortune/sessions/[id]/route.test.ts app/api/fortune/sessions/[id]/facilitator-turn/route.test.ts app/api/fortune/sessions/[id]/reflective-reply/route.test.ts app/fortune/page.test.tsx` -> pass
  - `npm.cmd run lint` -> fails on pre-existing unrelated lint errors in `src/cognition/glossary/__tests__/extract-glossary-candidates-from-observations.test.ts`, `src/reflective-space/composition/__tests__/compose-deep-reflection-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-object-orientation-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-reflective-space-viewport.test.ts`, and `src/runtime/orchestration/__tests__/generate-glossary-candidates-for-reflective-object.test.ts`
  - `npm.cmd run typecheck` -> fails on pre-existing unrelated type errors in `src/cognition/latent-v2/opportunity-constructor-v3/__tests__/opportunity-constructor-v3.test.ts` and `src/cognition/observation-v3/pipeline/replay/__tests__/preserved-case-loader.test.ts`
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-19T13-20-49-256Z.log`)
- Follow-up note:
  - The successful build preserved the existing Turbopack NFT tracing warning rooted through `next.config.ts`; this ticket did not widen or remediate that warning.

## 2026-08-19 - Fortune Multi-turn Conversation And User-controlled Lifecycle V1

- Phase: BUILD
- Touched boundaries:
  - `supabase/migrations`
  - `src/domain/fortune-sessions`
  - `src/features/fortune-journaling`
  - `src/infrastructure/supabase/adapters`
  - `src/infrastructure/supabase/repositories`
  - `app/api/fortune/sessions/[id]`
  - `app/api/fortune/sessions/[id]/facilitator-turn`
  - `app/api/fortune/sessions/[id]/reflective-reply`
  - `app/api/fortune/sessions/[id]/pause`
  - `app/api/fortune/sessions/[id]/resume`
  - `app/api/fortune/sessions/[id]/complete`
  - `app/fortune`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Preserved `20260819_0001_fortune_sessions.sql` and `20260819_0002_fortune_session_turns.sql` as immutable history, and moved the multi-turn lifecycle expansion into `20260819_0003_fortune_multi_turn_rounds.sql` with `paused_at`, `round_index`, and round-aware assistant/reply uniqueness.
  - Extended the Fortune-only facilitator and recovery model to support multiple answered or unanswered rounds, backward-compatible hydration of legacy assistant-turn JSON, explicit `active | paused | completed` lifecycle, and `question | resting_point` assistant output without importing dream runtime surfaces.
  - Updated `/fortune` to auto-continue only after normal user replies, surface explicit `Continue / Pause / Complete` at resting points, keep provider-failure retries on the same session without persisting failed assistant turns, and re-check lifecycle state after provider generation before assistant persistence.
- Verification:
  - `npx.cmd vitest run src/shared/__tests__/fortune-session-persistence-migration.test.ts src/shared/__tests__/fortune-session-turns-migration.test.ts src/infrastructure/supabase/repositories/__tests__/fortune-session-supabase-repository.test.ts src/infrastructure/supabase/repositories/__tests__/fortune-session-turn-supabase-repository.test.ts src/features/fortune-journaling/facilitator/__tests__/fortune-facilitator-runtime.test.ts src/content/fortune-journaling/index.test.ts src/features/fortune-journaling/session.test.ts app/api/fortune/sessions/route.test.ts app/api/fortune/sessions/[id]/route.test.ts app/api/fortune/sessions/[id]/facilitator-turn/route.test.ts app/api/fortune/sessions/[id]/reflective-reply/route.test.ts app/api/fortune/sessions/[id]/pause/route.test.ts app/api/fortune/sessions/[id]/resume/route.test.ts app/api/fortune/sessions/[id]/complete/route.test.ts app/fortune/page.test.tsx` -> pass
  - `npm.cmd run lint` -> fails on pre-existing unrelated lint errors in `src/cognition/glossary/__tests__/extract-glossary-candidates-from-observations.test.ts`, `src/reflective-space/composition/__tests__/compose-deep-reflection-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-homepage-orientation-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-object-orientation-payload.test.ts`, `src/reflective-space/composition/__tests__/compose-reflective-space-viewport.test.ts`, and `src/runtime/orchestration/__tests__/generate-glossary-candidates-for-reflective-object.test.ts`
  - `npm.cmd run typecheck` -> fails on pre-existing unrelated type errors in `src/cognition/latent-v2/opportunity-constructor-v3/__tests__/opportunity-constructor-v3.test.ts` and `src/cognition/observation-v3/pipeline/replay/__tests__/preserved-case-loader.test.ts`
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-19T21-28-15-150Z.log`)
- Follow-up note:
  - The successful build preserved the existing Turbopack NFT tracing warning rooted through `next.config.ts`; this ticket did not widen or remediate that warning.

## 2026-08-20 - Fortune Shared Step Shell And Info Surface Refinement

- Phase: BUILD
- Touched boundaries:
  - `app/fortune`
  - `src/features/fortune-journaling`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Added a shared Fortune step shell across Library, Draw, and Spread with the approved `I. LÉPÉS / II. LÉPÉS / III. LÉPÉS` mapping while keeping Reflection outside the numbered shell.
  - Reworked the page-level Fortune Journaling explanation into a viewport-centered overlay with improved editorial hierarchy, and preserved it as a session-independent surface triggered from the top-right info control.
  - Replaced the fixed mode-info presentation with inward-opening tile-relative overlays that preserve grid stability, keep the library visible underneath, and retain separate Info-vs-start interaction semantics.
- Verification:
  - `npm.cmd test -- app/fortune/page.test.tsx app/api/fortune/sessions/route.test.ts src/features/fortune-journaling/session.test.ts src/features/fortune-journaling/facilitator/__tests__/fortune-facilitator-runtime.test.ts` -> pass
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-20T09-10-55-546Z.log`)
- Follow-up note:
  - Direct browser validation was intentionally left to the owner per ticket instruction; no Playwright browser installation or browser dependency changes were attempted in this ticket.

## 2026-08-20 - Fortune Shared Header Shell And Info Positioning Fix

- Phase: BUILD
- Touched boundaries:
  - `app/fortune`
  - `src/features/fortune-journaling`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Replaced the separated Fortune step caption with a single shared pre-reflection header shell that keeps the back chevron, centered step guidance, and page-level info trigger in one stable 3-area layout.
  - Corrected desktop mode-info geometry so the overlay grows inward from its source tile, anchors on the tile midpoint, and uses a substantially wider landscape surface with vertical-only scrolling.
  - Kept the page-level Fortune Journaling explanation on a distinct fixed, viewport-centered overlay path so it does not inherit tile-relative positioning behavior.
- Verification:
  - `npm.cmd test -- app/fortune/page.test.tsx app/api/fortune/sessions/route.test.ts src/features/fortune-journaling/session.test.ts src/features/fortune-journaling/facilitator/__tests__/fortune-facilitator-runtime.test.ts` -> pass
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-20T09-25-05-742Z.log`)
- Follow-up note:
  - Owner-requested visual validation remains local-dev only for this ticket; no Playwright browser installation or browser dependency changes were attempted.

## 2026-08-20 - Fortune Draw Refinement V2

- Phase: BUILD
- Touched boundaries:
  - `app/fortune`
  - `src/features/fortune-journaling`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Moved the Step II remaining-count guidance fully into the shared Fortune header, removed the Draw-local back button and selected-card tray, and made the header-left control step-aware: Step I returns home, Step II returns to Library and clears local draw state, Step III and later exit safely to the Fortune Library.
  - Replaced the temporary Draw placeholder backs with the real `public/fortune-journaling/card-back.png` asset and kept selected cards in their original fan/grid positions with toggleable pre-commit selection.
  - Rebuilt Draw into a stronger viewport-relative desktop fan with larger cards, deeper curvature, and desktop-only page scroll lock while preserving a separate stacked mobile selection layout with scrolling.
- Verification:
  - `npx.cmd vitest run src/features/fortune-journaling/draw-state.test.ts src/features/fortune-journaling/session.test.ts app/fortune/page.test.tsx` -> pass
  - `npm.cmd run lint -- app/fortune/page.test.tsx src/features/fortune-journaling/FortuneJournalingPageClient.tsx src/features/fortune-journaling/draw-state.ts src/features/fortune-journaling/draw-state.test.ts` -> pass
  - `npm.cmd run typecheck` -> fails on pre-existing unrelated errors in `src/cognition/latent-v2/opportunity-constructor-v3/__tests__/opportunity-constructor-v3.test.ts` and `src/cognition/observation-v3/pipeline/replay/__tests__/preserved-case-loader.test.ts`
  - `npm.cmd run lint` -> timed out before completion during repo-wide validation; targeted Fortune lint passed
  - `npm.cmd run build` -> pass (`docs/build-logs/2026-08-20T13-45-56-037Z.log`)
- Follow-up note:
  - Step III -> Step II restoration was intentionally not implemented in this ticket; from persisted Spread onward the shared header-left control exits to the Fortune Library without mutating the persisted session.

## 2026-08-26 - Homepage Meditation And Fortune Shared Carousel

- Phase: BUILD
- Touched boundaries:
  - `src/ui/homepage`
  - `docs/superpowers/specs`
  - `docs/superpowers/plans`
  - `docs/STABILIZATION_LEDGER.md`
- Notes:
  - Replaced the standalone homepage Fortune Journaling tile with a shared two-slide carousel in the meditation slot so Meditation and Fortune now live in one bounded secondary surface.
  - Added arrow-based slide switching and hover-paused autoplay at `7500ms` while keeping the rest of the homepage orientation composition unchanged.
  - Added a small pure helper module for carousel index wraparound and locked the homepage markup contract with targeted tests.
- Verification:
  - `npx.cmd vitest run src/ui/homepage/__tests__/homepage-feature-carousel.test.ts src/ui/homepage/__tests__/homepage-orientation-hub.test.tsx` -> pass (`2` files, `6` tests)
  - `npm.cmd run typecheck` -> fails on pre-existing unrelated errors in `src/cognition/latent-v2/opportunity-constructor-v3/__tests__/opportunity-constructor-v3.test.ts` and `src/cognition/observation-v3/pipeline/replay/__tests__/preserved-case-loader.test.ts`, plus existing Fortune-branch type errors in `src/features/fortune-journaling/card-info.ts` and `src/features/fortune-journaling/FortuneJournalingPageClient.tsx`
  - `npm.cmd run build` -> fails after successful compile during TypeScript validation on `src/features/fortune-journaling/card-info.ts` (`docs/build-logs/2026-08-26T17-30-31-780Z.log`)
- Follow-up note:
  - A previous timed-out build attempt also produced a transient lock-style failure log at `docs/build-logs/2026-08-26T17-24-21-909Z.log`; the later build log above is the authoritative ticket result.
