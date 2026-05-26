# Summary Reflective-Space-First IA v0 Packet

## Purpose

Owner-readable packet for the guarded UI-only IA restructure on `/session/[id]/summary`.

This packet captures:
- structural hierarchy changes (before/after)
- wording and emphasis changes
- screenshot checklist
- rollback notes
- validation notes

## Scope and guard confirmation

Changed files:
- `app/session/[id]/summary/page.tsx`
- `app/session/[id]/summary/summary.module.css`

Guard confirmation:
- No API contract changes
- No `/api/session-summary` behavior changes
- No `/api/direction/select` changes
- No `/api/work-block/next` changes
- No persistence changes
- No schema/migration changes
- No route ownership transfer
- No runtime flow rewrite

## Before/After Section Hierarchy

Before (dominant first impression):
1. Dashboard-like summary header + side panel
2. Stats/progression energy
3. Direction recommendation blocks
4. Card continuation/gallery pressure
5. Dream/frame content mixed into workflow framing

After (current guarded IA):
1. Reflective center (`Visszatérési fókusz`)
2. Canonical dream text (`Nyers álom`)
3. Frame (`Keretező nézet`)
4. Ambient continuity (`Csendes folytonosság`)
5. Optional openings (`Lehetséges nyitások`)
6. Optional support panel (`Jelölések és jegyzetek`)
7. Demoted history/gallery (`Korábbi visszatérési pontok`)
8. Demoted metadata stats

## Wording and Hierarchy Matrix

| Surface | Previous posture | New posture | Why |
| --- | --- | --- | --- |
| Top of page | workflow/dashboard feel | reflective re-entry anchor first | orientation-first entry point |
| Directions section | recommendation/branch pressure | `Lehetséges nyitások` + optional helper text | lowers path-selection pressure |
| Expand directions CTA | branch-seeking tone | `Megnézek más nyitásokat` | keeps choice optional and calm |
| History section | cards as progression artifacts | `Korábbi visszatérési pontok` | reframes as return anchors |
| Gallery CTA | continue energy | `Visszatérés a reflexióhoz` | soft return posture |
| Quiet fallback | implicit absence | explicit no-pressure state | silence legitimacy |
| Stats labels | progress/task cues | low-pressure metadata labels | demotes completion framing |

## Screenshot Checklist (Owner Review)

Use the same session for all captures.

Desktop:
1. before full-page summary
2. after full-page summary

Mobile width:
1. before summary
2. after summary

Focus comparisons:
- first visible section hierarchy
- dream/frame prominence
- optional openings tone
- lower-page progression density
- quiet-state readability

Suggested filenames:
- `summary-ia-before-desktop.png`
- `summary-ia-after-desktop.png`
- `summary-ia-before-mobile.png`
- `summary-ia-after-mobile.png`

## Pressure Reduction Audit

Reduced:
- top-of-page workflow dominance
- recommendation and branching pressure
- continuation urgency cues
- progression dashboard feel

Intentionally transitional (still present by design):
- direction tiles still route through existing direction/work runtime
- existing work gallery and return actions remain available
- summary still surfaces compatibility-era work substrate signals

## Rollback Notes

Rollback is file-local and trivial:
1. Revert `app/session/[id]/summary/page.tsx`.
2. Revert `app/session/[id]/summary/summary.module.css`.
3. Re-run validation.

No data rollback required.

## Validation Notes

Executed:
- `npm.cmd run typecheck`
- `npm.cmd run test -- src/domain/reflective/validation/sessionSummaryComposerGuardedReadExperiment.test.ts`

Results:
- typecheck: passed
- targeted reflective summary test: passed (`5/5`)
