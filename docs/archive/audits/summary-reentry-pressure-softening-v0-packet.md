# Summary/Re-entry Pressure Softening v0 Packet

## Purpose

Owner-readable packet for the guarded UX-only summary softening slice on `/session/[id]/summary`.

This packet captures:
- before/after UI evidence references
- wording matrix
- pressure-reduction audit
- rollback notes
- validation notes

## Scope and guard confirmation

- Surface changed: `app/session/[id]/summary/page.tsx` and `app/session/[id]/summary/summary.module.css`
- No API contract changes
- No payload ownership changes
- No persistence/schema changes
- No runtime flow rewrites
- No direction/work runtime ownership changes

## Before/After Screenshot Packet

Local capture checklist (owner machine):
1. Open one summary page with at least one saved work card and at least one suggested direction.
2. Capture full-page screenshot before this slice (baseline branch).
3. Capture full-page screenshot after this slice (current branch).
4. Capture one mobile-width screenshot before/after for the same session.

Suggested shot list:
- `summary-desktop-before.png`
- `summary-desktop-after.png`
- `summary-mobile-before.png`
- `summary-mobile-after.png`

Visual anchors to compare:
- orientation section presence and tone
- ambient continuity block
- quiet-state text
- recommendation headline and CTA tone
- stat card visual emphasis
- continuation button emphasis

## Wording Matrix (Old -> New)

| Surface | Old phrasing | New phrasing | Rationale |
| --- | --- | --- | --- |
| Gallery section title | `Kartyak` | `Visszateresi pontok` | reframes from task objects to optional return points |
| Gallery CTA aria/title | `Folytatas` | `Visszateres a reflekciohoz` | lowers "continue now" pressure |
| Empty gallery state | `Meg nincs rogzitett kartya...` | `Most meg nincs rogzitett visszateresi pont...` | removes workflow/progress framing |
| Recommended block title | `Ajanlott iranyok` | `Lehetseges nyitasok most` | softens branch/assignment language |
| Recommended block helper | none | `Ha hasznos, ezek kozul valaszthatsz...` | explicit optionality |
| Expand-directions button | `Mas iranyt keresek` | `Megnezek mas lehetseges fokuszokat` | reduces hard "pick a path" energy |
| More-directions title | `Tovabbi iranyok` | `Tovabbi lehetseges nyitasok` | keeps optional opening posture |
| Salient label | `Kiemelt elemek` | `Csendes jelek` | lowers urgency and assertiveness |
| New quiet-state line | none | `Nem kotelezo most tovabbmenni...` | silence legitimacy and non-obligation |

## UX Pressure Audit (Post-change)

Reduced pressure:
- summary now includes an orientation-first block before action-heavy areas
- direction recommendations use softer "possible openings" language
- continuation CTA is less task-oriented
- stats are visually demoted (`statsDemoted`) and relabeled away from completion tone
- explicit quiet-state messaging legitimizes pause/no-action

Intentionally transitional pressure that remains:
- direction tiles still start direction flow (`startDirection`) and preserve legacy slugs/persistence
- work return route still uses existing direction/work semantics
- recommendation tiles remain available for continuity

## Rollback Notes

Rollback is straightforward:
1. Revert `app/session/[id]/summary/page.tsx`.
2. Revert `app/session/[id]/summary/summary.module.css`.
3. Re-run typecheck.

No data migration or route ownership rollback is needed.

## Validation Notes

Executed:
- `npm.cmd run typecheck`
- `npm.cmd run test -- src/domain/reflective/validation/sessionSummaryComposerGuardedReadExperiment.test.ts`

Results:
- typecheck passed
- targeted summary-related reflective validation test passed (5/5)

