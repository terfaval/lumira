# Lumira Runtime Route and Legacy Direction Inventory v0

## Executive summary

- Lumira's active runtime flow is still primarily moved by legacy core-flow APIs: `/api/session/ensure`, `/api/direction/select`, `/api/work-block/next`, and `/api/work/answer`.
- Reflective runtime is currently a read-layer bridge (projections, re-entry adapter, composer, shadow triage), not a canonical owner.
- Highest-risk coupling remains in `/api/work-block/next` and `/session/[id]/summary` because they combine multiple responsibilities.
- Direction system is still operationally required, but parts of it should later move from "workflow steering" to "attention lens + grammar guidance."
- Default ownership switch to composer/read-owner remains blocked; keep guarded/shadow posture.

## What currently moves Lumira session flow

1. `/new` creates `dream_sessions` + `dream_entries`, then triggers `/api/session/ensure`.
2. `/api/session/ensure` runs core orchestration (observe/index/latent/frame/anchors) and provides frame recommendations.
3. `/session/[id]/frame` and `/session/[id]/direction` expose recommended or catalog directions.
4. `/api/direction/select` persists chosen direction into `session_directions`.
5. `/session/[id]/work` calls `/api/work-block/next` (next card generation + persistence) and `/api/work/answer` (answer persistence + ledger).
6. `/api/session-summary` assembles summary/re-entry read payload; guarded composer shadow is additive only.

## Required questions (explicit answers)

### 1) What currently moves the Lumira session flow?
- Core movement is still legacy workflow orchestration plus direction/work APIs, with `/api/session/ensure` and `/api/work-block/next` as dominant runtime movers.

### 2) Which routes/files are still canonical runtime owners?
- Canonical write owners now:
  - `/new` (`app/new/NewClient.tsx`) for session/entry creation.
  - `/api/session/ensure` for observation/index/latent/frame/anchor job pipeline.
  - `/api/direction/select` for selected direction persistence (`session_directions`).
  - `/api/work-block/next` for work block generation and `work_versions` + `work_latest` writes.
  - `/api/work/answer` for `dream_answers` writes and question-ledger insertion.
  - `/api/sessions/[sessionId]/highlights` (+ `reject`, `pin`) for highlight/session salience writes.
- Canonical read assembly owner for summary surface:
  - `/api/session-summary` (legacy payload authoritative; shadow additive when guarded).

### 3) Which parts are legacy scaffolding?
- `/session/[id]` overview page (`app/session/[id]/page.tsx`) is legacy direct-read scaffolding.
- `/api/work/persist` exists but has no active caller in `app/` or `src/` currently.
- Large parts of summary page client assembly (`app/session/[id]/summary/page.tsx`) are legacy mixed orchestration/UI scaffolding.
- ROUTE_MAP is partially stale versus current summary+flow reality.

### 4) Which parts are still required during transition?
- `session_directions`, direction catalog, and direction cards remain required to keep current work generation coherent.
- `dream_answers`, `work_versions`, and `work_latest` remain required for continuity and reflective projections.
- `/api/session-summary` must remain legacy-authoritative while composer is shadow/guarded.
- Reflective projections, adapter, composer, and shadow triage are required as validation bridge layers.

### 5) Which direction-system responsibilities should move into reflective runtime?
- Center/foreground candidate weighting currently tied to direction context should move into reflective read policy.
- Suppression/cooldown-aware continuity surfacing should be centralized in reflective runtime policy (not route-local heuristics).
- Recommended direction influence should become orientation/lens context for reflective composition, not hard step-driving logic.

### 6) Which direction-system responsibilities might remain as soft lenses/style modes?
- `direction_slug` as attentional lens metadata.
- `group_tags` and `method_spec.question_style` as style hints/tone constraints.
- Safety-aware mode hints (`normal`/`gentle`) and optional user preference blocking (`blocked_group_tags`).

### 7) Which parts should not be touched yet?
- `/api/work-block/next` mutation pipeline and idempotency behavior.
- `/api/session/ensure` job sequencing and latest-pointer assumptions.
- `/api/session-summary` authoritative payload contract fields.
- Guard mechanics for reflective shadow/read switches.
- Highlight split-write path until unified ownership transfer gate.

### 8) Which parts are candidates for later UX redesign?
- `/session/[id]/summary` (currently overloaded: summary + direction control + highlight moderation + title/session actions).
- `/session/[id]/page` legacy overview (could be absorbed by a unified reflective entry/re-entry surface).
- Direction card presentation layers in frame/direction/summary for a less stepwise, more orientation-first experience.

### 9) Which areas are dangerous to refactor before composer/read-owner stabilization?
- `/api/work-block/next`: high coupling of safety, selection, composition, persistence, and stop policy.
- `/api/session-summary` + `/session/[id]/summary`: highest drift-risk read assembly surface.
- Projection/read switch gates (`workReadSwitch`, `highlightReadSwitch`, composer shadow mode) due rollback dependency.
- Any schema-touching rewrite around `work_versions`/`dream_answers`/`session_directions`.

## Route and file inventory

| Route / area | Primary files | Current role | Current owner status | Legacy / transitional / future | Risk | Recommended next action | Owner decision needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/new` | `app/new/page.tsx`, `app/new/NewClient.tsx` | Session bootstrap (writes session + raw entry, triggers ensure) | Canonical write owner for new session start | `KEEP` | Medium | Keep stable; no reflective ownership change | No |
| `/session/[id]` | `app/session/[id]/page.tsx` | Legacy direct-read overview and nav | Non-canonical read surface | `LEGACY` | Medium | Leave untouched until unified read surface plan | No |
| `/session/[id]/summary` | `app/session/[id]/summary/page.tsx` | Main summary/re-entry UX surface; direction + highlights + session actions | UI assembly surface; consumes `/api/session-summary` + highlight APIs | `TRANSITIONAL (HIGH-RISK)` | High | Avoid refactor before composer owner trial gating | No |
| `/session/[id]/(flow)/frame` | `app/session/[id]/(flow)/frame/page.tsx` | Frame display + recommended direction launch | Reads frame latest; delegates direction selection | `TRANSITIONAL` | Medium | Keep; later simplify once reflective orientation converges | No |
| `/session/[id]/(flow)/direction` | `app/session/[id]/(flow)/direction/page.tsx` | Direction catalog selection and recommendation view | Reads catalog/session directions; writes via `/api/direction/select` | `TRANSITIONAL` | Medium | Keep behavior; later recast as lens chooser | Yes (later product posture) |
| `/session/[id]/(flow)/work` | `app/session/[id]/(flow)/work/page.tsx` | Card-driven work loop; optional reflective read focus switch | Calls canonical work APIs; contains reflective read-toggle logic | `TRANSITIONAL (HIGH-COUPLING)` | High | Do not refactor workflow internals pre-stabilization | No |
| `/api/session/ensure` | `app/api/session/ensure/route.ts` | Orchestration pipeline (observe/index/latent/frame/anchors) | Canonical runtime orchestrator/write owner | `KEEP (CANONICAL)` | High | Keep sequencing stable; only additive diagnostics | No |
| `/api/session-summary` | `app/api/session-summary/route.ts` | Authoritative summary payload assembly; guarded composer shadow compare | Canonical summary read owner (legacy payload authoritative) | `TRANSITIONAL BRIDGE` | High | Preserve contract; keep composer shadow additive only | No |
| `/api/direction/select` | `app/api/direction/select/route.ts`, `src/lib/startDirection.ts` | Persist selected direction and route to work | Canonical direction persistence owner (`session_directions`) | `KEEP FOR NOW` | Medium | Keep as-is until attention-lens transfer plan | Yes (future lens ownership model) |
| `/api/work-block/next` | `app/api/work-block/next/route.ts` | Select material, enforce safety, compose next card, persist work | Canonical write owner for work block generation | `KEEP (HIGH-RISK CORE)` | Very high | Freeze internals except bugfixes; isolate future adapter boundary first | No |
| `/api/work/answer` | `app/api/work/answer/route.ts` | Persist answers and question-ledger entry | Canonical answer persistence owner | `KEEP FOR NOW` | Medium | Keep until reflective responses ownership plan | No |
| Highlight APIs | `app/api/sessions/[sessionId]/highlights/route.ts`, `.../reject/route.ts`, `app/api/highlights/pin/route.ts` | Highlight CRUD/reject/pin; optional reflective highlight projection read | Split write owners remain canonical | `TRANSITIONAL BRIDGE` | High | Maintain split writes; use projection read only under guarded mode | No |
| Glossary runtime (relevant) | `app/glossary/page.tsx`, `app/glossary/suggestions/page.tsx`, `src/domain/work/glossary/fetchGlossaryContext.ts` | Continuity memory context + glossary operations | Supporting domain; not summary owner | `KEEP/TRANSITIONAL` | Medium | Keep stable; avoid coupling into ownership shift now | No |
| Reflective projections | `src/domain/reflective/projections/*` | Read-only projection bridge from legacy models | Non-owner by contract | `TRANSITIONAL BRIDGE` | Medium | Continue parity validation only | No |
| Reflective re-entry adapter | `src/domain/reflective/reentry/reentryPayloadAdapter.ts` | Legacy-compatible reflective payload assembly | Non-owner adapter | `TRANSITIONAL BRIDGE` | Medium | Keep as baseline comparator | No |
| Reflective composer + shadow | `src/domain/reflective/composer/reflectiveSpaceComposer.ts`, `src/domain/reflective/shadow/*` | New payload composer + guarded shadow diff triage | Non-owner, guarded validation path only | `TRANSITIONAL BRIDGE` | Medium | Continue guarded owner-reviewed sampling | No |
| Legacy/dormant write endpoint | `app/api/work/persist/route.ts` | Legacy idempotent work persistence route (currently no direct callers found) | Legacy write path | `LEGACY SCAFFOLDING` | Medium | Keep untouched until explicit caller-proof removal audit | Yes (retirement timing) |

## Direction system decomposition

| Direction feature | Current behavior | Classification | Notes |
| --- | --- | --- | --- |
| `direction_slug` on work cards and routes | Drives selection, persistence, and work continuation | `KEEP FOR NOW` | Required for current continuity and card lineage |
| `selected_directions` (`session_directions`) | Durable record of user-picked directions | `KEEP FOR NOW` | Still needed across frame/direction/work/summary surfaces |
| Direction catalog (`direction_catalog`) | Source for title/description/group/tags/content metadata | `KEEP FOR NOW` | Central data source for direction UI + generation hints |
| Direction cards (`kind: direction_card`) | Core runtime work unit shape in `work_versions.payload` | `KEEP FOR NOW` | Coupled to existing work flow and projections |
| Direction-based work generation | Selection + composition pipeline in `/api/work-block/next` | `ABSORB INTO RUNTIME POLICY` | Long-term should become reflective policy surface, not route-local monolith |
| `method_spec` usage (e.g. `question_style`) | Used as question archetype/style hint | `TRANSFORM INTO INTERACTION GRAMMAR/STYLE GUIDANCE` | Keep as hint, reduce hard procedural coupling |
| Direction safety constraints (`ai_contract`, safety gates) | Tone/mode filtering and safety stop behavior | `ABSORB INTO RUNTIME POLICY` | Safety should remain first-class, direction-independent where possible |
| `group_tags` and blocked groups | Tag-based filtering + preference gating | `TRANSFORM INTO ATTENTION LENSES` | Better as optional lens weighting than hard path steering |
| Pacing rules (`low_novelty`, `gentle`, stop signals) | Stop/slow behavior and prompt cadence control | `TRANSFORM INTO INTERACTION GRAMMAR/STYLE GUIDANCE` | Should align with reflective calmness policy |
| `recommended_directions` from frame/latent | Suggested next focus options | `TRANSFORM INTO ATTENTION LENSES` | Preserve optional orientation, reduce "step pressure" |
| Selected direction persistence source values (`frame`, `direction_modal`, etc.) | Operational provenance trail | `KEEP FOR NOW` | Useful lineage during transition and audits |
| `/api/work/persist` legacy path | Extra write path without active caller evidence | `RETIRE LATER` | Retire only after caller-proof and rollback plan |
| Direction as explicit mid-flow step UX | Separate route and selector flow | `UNCLEAR / OWNER DECISION NEEDED` | Decide whether to keep explicit step or fold into unified reflective orientation |

## What should stay for now

- Keep canonical write owners unchanged for `session_directions`, `work_versions/work_latest`, `dream_answers`, and ensure pipeline outputs.
- Keep `/api/session-summary` authoritative response fields stable.
- Keep reflective composer in guarded shadow/validation posture only.
- Keep projection-first bridge semantics and rollback readiness.

## What to avoid touching now

- Avoid deep refactors in `/api/work-block/next` and `/api/session/ensure`.
- Avoid summary-route ownership changes in `/api/session-summary` and `/session/[id]/summary`.
- Avoid schema/persistence reshaping for direction/work/answer tables before read-owner stabilization.
- Avoid changing default states of reflective read/shadow guards.

## Candidates for later UX redesign

- Summary surface separation: split "owner review + highlights moderation + direction launch + session admin" into clearer layers.
- Direction UX: evolve from step-gated "pick one direction" toward optional lens-based orientation.
- Session overview (`/session/[id]`): fold legacy overview into unified reflective re-entry surface once ownership is stable.

## Dangerous early-refactor zones

1. `app/api/work-block/next/route.ts` (selection + safety + composition + persistence in one path).
2. `app/session/[id]/summary/page.tsx` (very broad UI and data responsibilities).
3. `app/api/session-summary/route.ts` (authoritative payload contract + guarded shadow integration).
4. Reflective switch points (`workReadSwitch`, `highlightReadSwitch`, composer shadow guards).
5. Cross-table continuity assumptions (`work_versions`, `dream_answers`, `session_directions`) used by both legacy and projection paths.

## Recommended sequencing (post-audit)

1. **Validation ticket**: caller-proof audit for `/api/work/persist` and any dormant legacy route dependencies.
2. **Plan ticket**: direction-system target model (`workflow step` vs `attention lens`) with explicit owner decision.
3. **Validation ticket**: route-local sample comparison expansion on `/api/session-summary` with owner sign-off on center/ambient drift.
4. **Build ticket (guarded)**: extract a narrow read-assembly boundary for summary page (without ownership transfer).
5. **Only then**: guarded read-owner experiment planning for summary/re-entry.

## Owner decisions (only where needed)

- Decide long-term direction UX posture:
  - keep explicit direction-step route as a core ritual, or
  - transition direction into optional lens metadata inside a unified reflective surface.
- Decide retirement timing policy for dormant legacy endpoints (notably `/api/work/persist`) after caller-proof audit.

## Audit evidence commands run

- `rg "direction_slug|selected_directions|direction_card|session_directions" app src`
- `rg "work_versions|work_latest|dream_answers" app src`
- `rg "composeReflectiveSpacePayload|buildReflectiveReentryPayload|buildReflectiveReentry" app src`
- `rg "session-summary|work-block|direction/select|work/answer" app src`
- Additional focused file reads and grep scans on core routes/APIs listed above.

## Containment statement

- This ticket is audit/plan only.
- No runtime behavior change.
- No route switch.
- No ownership transfer.
- No persistence/schema/Supabase modification.
