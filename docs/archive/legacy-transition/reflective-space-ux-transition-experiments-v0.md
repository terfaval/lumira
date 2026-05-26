# Reflective Space UX Transition Experiments v0

## Type

PLAN/DESIGN

## Goal

Define a rollback-safe UX transition path from direction/workflow-heavy interaction toward reflective-space-first interaction, without changing runtime ownership, schemas, or canonical write paths.

## Scope and guardrails

- No runtime behavior change in this ticket.
- No ownership transfer.
- No schema/migration changes.
- No production UI implementation.
- Preserve current canonical writes:
  - `/api/direction/select` -> `session_directions`
  - `/api/work-block/next` -> `work_versions`, `work_latest`
  - `/api/work/answer` -> `dream_answers`
  - `/api/session-summary` remains authoritative with guarded additive shadow posture.

## Inputs reviewed

Runtime and transition posture:
- `docs/audits/lumira-runtime-route-and-legacy-direction-inventory-v0.md`
- `docs/audits/work-route-runtime-responsibility-decomposition-v0.md`
- `docs/audits/lumira-direction-to-lens-readiness-gate-evidence-pack-v0.md`
- `docs/plans/lumira-direction-to-lens-transition-contract-v0.md`
- `docs/plans/lumira-route-api-ownership-contract-pack-v0.md`
- `docs/plans/lumira-reflective-runtime-compat-contract-v0.md`

Reflective UX and philosophy:
- `docs/design/lumira-reflective-interaction-grammar-v0.md`
- `docs/design/Lumira_Reflective_Interaction_Model_v2.md`
- `docs/design/Lumira_Interaction_Principles_v0.md`
- `docs/plans/lumira-evolution-north-star-v0.md`
- `docs/plans/lumira-reflective-reentry-payload-contract-v0.md`
- `docs/plans/lumira-reflective-space-layer-composition-map-v0.md`

Owner-facing criteria and shadow packets:
- `docs/plans/lumira-summary-reentry-owner-approval-criteria-v0.md`
- `docs/plans/lumira-reflective-summary-reentry-expansion-strategy-v0.md`
- `docs/audits/owner-reviewed-composer-shadow-sample-packet-v0.md`
- `docs/audits/human-readable-composer-shadow-comparison-packet-v1.md`

Current UX surfaces inspected:
- `app/new/NewClient.tsx`
- `app/session/[id]/summary/page.tsx`
- `app/session/[id]/(flow)/frame/page.tsx`
- `app/session/[id]/(flow)/direction/page.tsx`
- `app/session/[id]/(flow)/work/page.tsx`
- `components/WorkCard.tsx`
- `components/DirectionTile.tsx`

## 1) Current UX Pressure Inventory

### Pressure map

| Surface | Current cue | Pressure type | Classification |
| --- | --- | --- | --- |
| `/session/[id]/(flow)/frame` | "Valassz egy iranyt, ha tovabb dolgoznal..." + recommended tiles + immediate direction CTA | explicit next-step steering | acceptable transitional pressure |
| `/session/[id]/(flow)/direction` | "Ajanlott iranyok", "Gyors valasztas", dense selectable catalog | branch-selection ritual | acceptable transitional pressure |
| `/session/[id]/(flow)/work` | hard dependency on `?direction=...`; missing direction blocks progress | direction-locked entry | philosophically conflicting pressure |
| `/session/[id]/(flow)/work` + `WorkCard` | save action flows directly into next prompt generation | loop momentum pressure | acceptable transitional pressure |
| `/session/[id]/(flow)/work` closure state | "Szeretnel iranyt valtani, vagy most pihenni?" | binary continuation framing | accidental pressure |
| `/session/[id]/summary` | prominent "Kartya" continuation button, card counters, "Ajanlott iranyok" and "Tovabbi iranyok" blocks | progression and branching emphasis on re-entry surface | philosophically conflicting pressure |
| `/session/[id]/summary` | stat card "Rogzitett kartyak X/Y" | completion/progress signal | accidental pressure |
| `/session/[id]/summary` | "Mas iranyt keresek" expansion path | new-branch bias vs stay-with-center | accidental pressure |
| `DirectionTile` | "Megnyitas ->" hint and recommended badge | action-forward language | accidental pressure |
| `/new` | capture flow itself is calm and non-forceful | low pressure capture-first | acceptable transitional pressure |

### Classification summary

- Acceptable transitional pressure:
  - direction selection and work-loop continuity are currently required for stable canonical behavior.
  - "continue later" exits and fail-soft stop signals are useful stabilizers.
- Accidental pressure:
  - progress/counter framing and action-heavy labels on summary/re-entry over-amplify workflow feel.
  - repeated "more directions" framing increases branch pressure even when user may need stillness.
- Philosophically conflicting pressure:
  - required direction lock to enter work and re-entry surfaces dominated by task/progression affordances conflict with orientation-first reflective posture.

## 2) Reflective Space UX Principles

1. Orientation-first: help the user locate where they are before inviting any action.
2. Optionality: every invitation is reversible, ignorable, and non-blocking.
3. Silence legitimacy: "no opening now" is a valid successful state.
4. Reversible exploration: movement between surfaces should feel safe, not commitment-heavy.
5. Calm density: one center, bounded adjacent cues, no panel overload.
6. Soft continuity: continuity appears as ambient memory, not unresolved task debt.
7. Ambient meaning: cues are suggestive and evidence-linked, never declarative.
8. Non-authoritative stance: AI language remains observational and provisional.
9. No hidden urgency: avoid "resume now", "complete", or escalation framing.
10. No pseudo-therapeutic pressure: avoid diagnostic or emotionally coercive voice.
11. Invitation over instruction: prompts are openings, not assignments.

## 3) Reflective-Space-First UX Model

### Target feel

- The user enters a reflective environment, not a funnel.
- The system presents a calm center and a small horizon around it.
- Movement is lateral and depth-based, not step-index-based.
- Returning after time away feels like gentle re-orientation, not "unfinished workflow."

### Surface behavior model

- Foreground:
  - one reflective center (thread/opening/work anchor) with low-friction writing entry.
- Ambient continuity:
  - low-pressure contextual signals (motif recurrence, prior highlights, dormant continuity).
- Optional openings:
  - at most one primary and one secondary invitation, with explicit "not now" legitimacy.
- Reflective center posture:
  - "stay with this if useful" rather than "continue process."

### Session context variants

- Emotionally loaded return:
  - calmer, lower-density center with strong omission bias.
- Sparse/minimal session:
  - explicit permission for no action; no synthetic continuity inflation.
- Multi-day re-entry:
  - brief orientation slice first; optional deepening second.
- Pause states:
  - exits framed as valid reflective pacing, not interruption/failure.

## 4) Direction-System UX Demotion Ideas

### UX-only experiments (safe bridge)

1. Rename user-facing "direction" language to "lens" or "focus angle" while keeping underlying slugs/persistence unchanged.
2. Replace "Ajanlott iranyok" headline tone with lower-pressure wording ("Lehetseges nyitasok most").
3. Remove branch-choice framing ("choose your path") from summary and frame copy; keep same actions.
4. Demote direction blocks visually from primary call-to-action to optional secondary panel on summary.
5. Convert "quick pick" framing into "if it helps, you can start here."
6. In work closure states, prefer rest/return framing before switch-direction framing.

### Requires runtime coupling changes (defer)

1. Removing required direction query dependency from `/session/[id]/(flow)/work`.
2. Eliminating `/api/direction/select` or `session_directions`.
3. Replacing work-loop continuity generation owner (`/api/work-block/next`) with reflective owners.
4. Unifying direction and opening ownership under new canonical lens/opening tables.

## 5) Summary/Re-entry UX Evolution Concepts

Design target for `/session/[id]/summary` without ownership changes:

1. Make summary header orientation-first:
  - "where reflection currently rests" before "what to do next."
2. Introduce an ambient continuity block:
  - low-density "still here in the background" signals.
3. Demote progression stats:
  - keep available but less foregrounded than center and dream text.
4. Replace continuation-heavy labels:
  - from "continue" to "return if useful."
5. Keep openings optional:
  - no mandatory-feeling next action on re-entry.
6. Silence-compatible summaries:
  - explicit calm state when no strong opening is surfaced.

Preserved guarantees:
- rollback safety (wording/layout only in early slices)
- authoritative payload unchanged
- no ownership transfer

## 6) Work Card Reframing Concepts

Without changing work-loop infrastructure:

1. Reframe question copy as openings:
  - "One possible opening" instead of implied assignment tone.
2. Reframe answer CTA:
  - from "record answer" to "leave a note" style language.
3. Add quiet mode option in card framing:
  - explicit "pause here" affordance equivalent to continue-later flow.
4. Reduce linearity cues:
  - avoid language that implies mandatory sequential completion.
5. Support multi-presence wording:
  - center card can acknowledge adjacent continuity quietly without forcing branch switch.
6. Closure card softening:
  - first action becomes "rest now / return later", direction switch as secondary option.

## 7) Experiment Matrix

| Experiment | Risk | Runtime coupling | Rollback difficulty | Expected UX impact |
| --- | --- | --- | --- | --- |
| Summary headline and CTA wording softening | Low | None | Trivial | Medium |
| Rename visible "direction" labels to "lens" (display-only) | Low | None | Trivial | Medium |
| Reorder summary blocks: center/orientation first, directions lower | Low-Medium | None | Low | Medium-High |
| Add ambient continuity panel (additive, read-only from existing payload) | Medium | Low | Low | High |
| Work card copy reframing ("opening", "optional return") | Medium | Low | Low | Medium |
| Closure card action priority flip (rest first, switch direction secondary) | Medium | Low | Low | Medium |
| Hide direction panel behind "explore more" disclosure by default | Medium | Low | Low | Medium-High |
| Add summary quiet-state variant when no strong opening exists | Medium | Low | Low | High |
| Route-local guarded summary mode variant via flag/query | Medium | Medium | Medium | High |
| Remove required direction from work route | High | High | High | High |
| Remove `/api/direction/select` and `session_directions` writes | Very high | Very high | Very high | High |
| Replace work-loop owner with reflective runtime | Very high | Very high | Very high | Very High |

## 8) Safe vs Unsafe UX Experiments

### Safe now

- Wording softening on frame/summary/work surfaces.
- Optional framing language ("if useful", "return later").
- Additive ambient continuity panels on summary using existing read payloads.
- Reflective-space-first summary information architecture experiments (layout-only).
- Display-level lens terminology experiments that keep `direction_slug` unchanged.
- Quiet-state variants with explicit silence legitimacy.

### Unsafe now

- Removing `/api/direction/select`.
- Replacing work-loop ownership (`/api/work-block/next`, `/api/work/answer`).
- Deleting `session_directions` persistence.
- Flipping canonical summary ownership away from `/api/session-summary`.
- Work-route continuity rewrites that alter lineage substrate semantics.
- Any schema-dependent UX switch requiring migrations.

## 9) Owner-Readable "Future Lumira" Walkthrough

You return after several days.

Lumira does not greet you with tasks. It shows one quiet center from your dream-space: a line that still carries weight. Around it, there are only a few soft continuity signals, not a dashboard.

Nothing demands action. You can read, pause, or leave. If you want, one opening is available in language that feels invitational, not insistent.

If the session is emotionally heavy, the space stays sparse. It does not force coherence. It does not imply that the system knows what your dream "really means."

If you choose to write, the interface supports that depth without crowding you. If you do not, the session still feels complete for now.

When you return later, continuity is still there, but quiet. The atmosphere is one of companionship and room, not workflow pressure.

## 10) Recommended Next UX Experiment

### Recommendation

Prototype a **summary-page pressure softening slice** on `/session/[id]/summary`:

- copy softening for direction/continue language
- visual demotion of progression stats and direction blocks
- additive "ambient continuity" micro-block with low-density cues
- explicit quiet-state fallback message

### Why this is the safest meaningful next step

- rollback-safe (layout/copy only, no writer or schema touch)
- low coupling (contained to summary surface, not work generation path)
- high UX visibility (users feel the change immediately at re-entry)
- preserves authoritative payload and current runtime owners
- aligns with prior readiness guidance that summary/re-entry is the safest guarded experimentation surface

## Suggested prototype ticket

`BUILD (guarded UX) - Summary Re-entry Pressure Softening v0`

Scope:
- `/session/[id]/summary` UI copy/layout only
- no route/API payload changes
- no ownership transfer
- include owner review screenshots and before/after wording matrix

Success criteria:
- reduced workflow language density
- preserved calmness and optionality
- no regression in existing summary behaviors

