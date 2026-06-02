# Reflection MVP Build Plan v1

Date: 2026-06-01  
Type: PLANNING / MVP DELIVERY PLAN  
Source audit: `docs/superpowers/audits/reflection-loop-reality-audit-v1.md`

## Ticket Protocol

### 1) Goal restatement
- Convert reflection-loop audit findings into a concrete MVP delivery roadmap.
- Define the smallest complete reflection experience that feels usable to a new user.
- Map current runtime reality (`implemented` / `partial` / `missing`) for each loop stage.
- Produce a dependency-driven phase sequence without redesigning core architecture.

### 2) Touched files
- New: `docs/runtime/reflection-mvp-build-plan-v1.md`

### 3) Implementation steps (for this planning ticket)
1. Read required audit and runtime architecture documents.
2. Audit live runtime codepaths in `app/`, `app/api/`, `src/ui/`, and `src/reflective-space/`.
3. Classify each reflection stage by runtime reality.
4. Define MVP boundary and phased build roadmap.

### 4) Acceptance criteria (DoD)
- Parts A-H are complete.
- Required/optional/future scope is explicit.
- Dependency graph reflects actual current runtime.
- Build phases are ordered and executable.
- Final question is answered directly.

### 5) Testing / validation plan
- Documentary + codepath validation against current repository state.
- No runtime code changes in this ticket.

### 6) Rollback plan
- Revert `docs/runtime/reflection-mvp-build-plan-v1.md`.

---

## Part A - MVP Definition

## Minimum Usable Reflection MVP

If Lumira launched tomorrow, the smallest complete-feeling reflection experience is:

1. User writes one dream.
2. System produces descriptive observation context.
3. System prepares latent reflection context and surfaces an optional opening (or explicit calm silence).
4. User can respond inside a reflection workspace tied to that dream.
5. User can see at least one continuity cue that this reflection is remembered.

This is the minimum loop:

`Dream -> Observation -> Latent -> Opening -> Response -> Continuity cue`

## Required (MVP)
- Live dream capture entry (not placeholder).
- Automatic or one-click observation generation from captured dream text.
- Latent snapshot generation from the captured dream context.
- Opening surfacing in a live reflection workspace.
- Response authoring and persistence from the same workspace.
- Minimal continuity visibility (at least prior response trace and/or recurring thread cue).

## Optional (MVP+)
- User-initiated thread association controls.
- Object orientation detail route richness.
- Dormant opening reactivation UI.
- Glossary candidate generation UI trigger.

## Future (Post-MVP)
- Dream map/topology.
- Multi-thread orchestration.
- Full continuity visualization.
- Mature highlight/salience workflow.
- Advanced glossary workflows and curation UX.

---

## Part B - Flow Analysis (Current Runtime Reality)

| Stage | Status | Current reality evidence |
|---|---|---|
| Dream | PARTIALLY IMPLEMENTED | Reflective object creation exists (`POST /api/reflective-objects`), but `/capture` route is placeholder. |
| Observation | PARTIALLY IMPLEMENTED | Observation persistence exists (`POST /api/reflective-objects/[id]/observations`), but requires structured payload and is not wired to user capture flow. |
| Latent | PARTIALLY IMPLEMENTED | Latent generation exists (`POST /api/reflective-objects/[id]/latent-snapshots`), but not connected to active user route progression. |
| Orientation | IMPLEMENTED | Homepage orientation hub is live (`app/page.tsx`, `HomepageOrientationHub`). |
| Reflection Entry | MISSING / PARTIAL | `/objects/[objectId]` and `/objects/[objectId]/reflect` are placeholders; no mounted reflection workspace route. |
| Opening | PARTIALLY IMPLEMENTED | Opening generation + lifecycle APIs exist, but no active UI flow invokes latent->opening generation for users. |
| Response | PARTIALLY IMPLEMENTED | Response + opening-response association APIs exist; workspace component supports this, but workspace is not mounted in active routes. |
| Continuity | PARTIALLY IMPLEMENTED | Thread/response/glossary associations + viewport composition exist, but continuity is not delivered through a complete user-facing reflection journey. |

---

## Part C - Reflection Entry Audit (Orientation -> Reflection)

## How user should enter reflection (MVP)
- Entry point: from Orientation home after capture or from recent dream card.
- Transition: deep-link to one live reflection workspace route with `centerObjectId`.
- Behavior: workspace loads dream context, available opening(s), response area, and continuity cues.

## Runtime pieces that already exist
- Orientation payload + route target registry.
- Bounded viewport composition API (`/api/reflective-space/viewport`).
- Reflection workspace UI component (`ReflectiveSpaceWorkspace`) including openings/responses/continuity panels.
- Opening activation/suppression/response APIs.

## Missing runtime pieces
- Mounted page route that renders `ReflectiveSpaceWorkspace`.
- Active route mapping from Orientation/Capture to that workspace.
- Operational chain from captured dream -> observation -> latent snapshot -> opening generation.
- Reliable fallback behavior when no opening is generated (silence path in active UX).

## MVP scope for Reflection Entry
- One mounted reflection route.
- One validated entry path from capture and one from orientation recents.
- One center object context (`centerObjectId`) per entry.

## Explicitly wait
- Separate orientation detail IA for every object.
- Multi-entry reflection navigation system.
- Full focus-state choreography from canon docs.

---

## Part D - Reflection Workspace MVP

## Minimum workspace definition

Required sections:
- Opening panel (invitation surface + activation).
- User response area (write + save response).
- Thread context (at least one continuity thread surface list).
- Continuity context (prior response/dialogue trace and/or recurring cues).

Optional in MVP:
- Glossary panel editing actions.
- Advanced dormant-opening revisit controls.
- Extended archive pagination controls beyond current bounded window.

Wait:
- Multi-thread active/ambient topology rendering.
- Rich object-level orientation workspace split.

---

## Part E - Continuity MVP

## Smallest meaningful continuity loop

Continuity can be minimal, but not invisible.

Required for MVP:
- User can see that the current reflection is remembered (response persists and is visible on return).
- User sees at least one recurring/continuity cue (thread cue or dialogue lineage phrasing).

Optional for MVP:
- Direct list of prior reflections across all objects.
- Glossary linkage in the same session.

Can wait:
- Full recurring-material map.
- Advanced glossary-connection exploration UI.

Conclusion:
- Continuity should be explicit-but-light in MVP, not purely implicit.

---

## Part F - Dependency Mapping

```txt
Reflection Entry
depends on:
- Orientation route targets
- Mounted Reflection Workspace route
- centerObjectId handoff

Dream Capture
depends on:
- Reflective object creation API
- Authenticated user context

Observation
depends on:
- Dream object persistence
- Observation generation/persistence call

Latent
depends on:
- Observation existence
- Latent snapshot API

Opening Surface
depends on:
- Latent snapshot
- Opening generation API with explicit invocation boundary
- Opening surface retrieval

Response Loop
depends on:
- Opening activation
- Response create + opening-response association

Continuity Visibility
depends on:
- Response persistence
- Thread/response associations
- Reflective-space viewport composition
```

Critical path:

`Capture -> Observation -> Latent -> Opening -> Workspace Response -> Continuity cue`

---

## Part G - Build Phases

## Phase 1 - Reflection Entry Activation
- Mount one live reflection workspace page route.
- Wire Orientation links and capture completion redirect to this route.
- Accept `centerObjectId` in route/query and hydrate viewport accordingly.

DoD:
- User can navigate from home to a real reflection page without hitting placeholders.

## Phase 2 - Capture -> Observation Operational Path
- Replace capture placeholder with minimal dream form (title + dream text).
- On submit: create reflective object and create descriptive observation.

DoD:
- Newly captured dream has persisted observation and appears in workspace context.

## Phase 3 - Latent -> Opening Operational Path
- After observation creation (or on workspace entry), create latent snapshot.
- Invoke opening generation with explicit invocation boundary.
- Ensure no-opening (silence) state is handled in UI as valid outcome.

DoD:
- User sees opening invitation(s) or explicit calm silence, not dead state.

## Phase 4 - Response + Continuity Completion
- Keep current opening activation and response save flow in mounted workspace.
- Ensure saved response appears in dialogue/revisitable response surfaces on refresh/re-entry.
- Ensure at least one continuity cue is visible after first cycle.

DoD:
- User completes one full reflection cycle and can re-enter with continuity evidence.

## Phase 5 - Optional MVP+ Stabilization
- Add glossary candidate extraction trigger from reflected object.
- Add lightweight continuity return indicator on homepage cards.

DoD:
- Optional enhancements shipped without changing MVP core loop definition.

---

## Part H - First User Journey (After MVP Completion)

1. New user signs in and lands on Orientation home.
2. User opens Capture and writes one dream entry.
3. System saves dream as reflective object.
4. System generates descriptive observation for that dream.
5. System generates latent snapshot and evaluates openings.
6. User is routed to Reflection Workspace for that dream.
7. Workspace shows dream context, opening invitation (or explicit silence), thread/continuity context.
8. User activates an opening and writes a response.
9. Response is saved and linked to opening activation.
10. User returns later and sees prior response/continuity cue, confirming loop continuity.

---

## Final Question Answer

The single most important missing piece is:

**a live Orientation/Capture -> Reflection Entry path that mounts the workspace and operationally executes `Observation -> Latent -> Opening` for the selected dream.**

Why this is the highest priority:
- Most core subsystems already exist as APIs and composition logic.
- The user cannot currently reach them as one coherent journey.
- Without this integration seam, Lumira has reflection components but no usable Reflection MVP experience.

