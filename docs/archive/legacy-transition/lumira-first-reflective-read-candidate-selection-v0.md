# Lumira First Reflective-first Read Candidate Selection v0

## 1. Purpose

This document selects the first safe reflective-first read candidate for controlled Phase B execution planning.

Why this matters:
- the first switch sets the safety baseline for all later Phase B reads
- the first switch must be reversible, route-local, and projection-only
- a low-risk first surface reduces ownership drift and rollback complexity

Clarifications:
- first reflective-first read != reflective runtime adoption
- first switch remains experimental and fully reversible
- legacy runtime remains authoritative

## 2. Candidate Surface Comparison

| Surface | Dry-run verdict | Parity confidence | Suppression sensitivity | Density sensitivity | Lineage complexity | Rollback complexity | User-visible behavioral risk | Hidden canonicalization risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/session/[id]/(flow)/highlights` | GO (PASS WITH NOTES overall gate context) | High on validated dimensions (pin/reject/order/lineage/salience) | Medium | Medium | Medium (A2 warning remains precision-level) | Low | Lower | Low |
| `/session/[id]/(flow)/work` | GO (PASS WITH NOTES overall gate context) | Medium-High (thread/opening posture + suppression checks passed) | Medium-High | Medium | Higher (thread/opening/response composition) | Low-Medium | Higher (continuity pacing pressure risk) | Medium |

Comparison reasoning:
- highlights is a narrower read domain with fewer cross-domain runtime effects
- work is directly adjacent to continuity pacing and answer flow behavior
- highlights rollback is cleaner because it does not couple to question progression behavior

## 3. Recommended First Candidate

Recommended first reflective-first read candidate:

`/session/[id]/(flow)/highlights`

Why this is safest:
- highest practical parity confidence from completed dry-run evidence
- smallest behavioral blast radius compared with work continuity surfaces
- simpler rollback locality (restore split-highlight reads directly)
- lower risk of reflective-pressure drift than work/thread/opening surfaces
- preserves single-write-owner and projection-only boundaries cleanly

## 4. Risk Assessment

Selected candidate risks:
- warning: broad lineage attachment precision (A2 carry-forward note)
- warning: normalized unified shape may mask split-source nuance if trace display is weak
- blocker: any reject/suppression parity drift
- blocker: any salience inflation or semantic auto-merge behavior

Acceptable divergences:
- normalized unified payload shape vs split legacy shape
- omission of weak continuity where contract permits omission

Rollback triggers:
- reject state resurfacing
- deterministic ordering instability
- missing per-item source lineage on surfaced rows
- any hidden projection ownership behavior

## 5. Required Switch Constraints

Execution constraints for eventual switch:
- route-local switch only on `/session/[id]/(flow)/highlights`
- no ownership transfer
- no summary/re-entry coupling in this slice
- projection-only read layer
- no hidden fallback canonicalization
- immediate route-local rollback path must remain live
- caller isolation proof required before enabling default behavior
- explicit owner approval required

## 6. Required Validation Before Execution

Mandatory go/no-go checks:
- typecheck and targeted projection tests pass
- dry-run parity report for highlights is current and reproducible
- route isolation scan confirms no unintended surface coupling
- rollback rehearsal passes (disable reflective read, restore legacy behavior deterministically)
- suppression/reject parity proof
- deterministic ordering proof
- no-write-path proof for projection layer

No-go if any fail.

## 7. Rollback Plan Requirements

Rollback must be:
- local to highlights read path only
- immediate (single surface disablement without broad runtime impact)
- deterministic (split-highlight legacy reads restored without data mutation)

Rollback verification must confirm:
- legacy split highlight reads are intact
- no persistent dependency on projection output exists
- no hidden projection cache/store ownership exists

## 8. Owner Approval Gates

Owner approval is mandatory before:
- any user-visible reflective-first read on highlights
- any production-default highlights read switch
- any expansion to additional surfaces after first switch

Required approval packet:
- highlights parity report + mismatch classification
- rollback rehearsal evidence
- caller isolation evidence
- unresolved warning list (including lineage precision status)

## 9. Expansion Constraints

After first switch, do NOT:
- auto-expand to `/session/[id]/(flow)/work`
- expand to `/session/[id]`, `/session/[id]/summary`, or `/api/session-summary`
- couple switch with ownership transfer
- couple switch with schema/Supabase actions
- assume bridge retirement

Expansion must remain separately gated per-surface.

## 10. Recommended Next Ticket

Recommended immediate next ticket:

`BUILD/VALIDATION — Controlled Reflective-first Highlights Read Switch (Phase B-B1)`

Ticket focus:
- route-local highlights read-switch implementation under strict rollback and parity gates
- no ownership transfer
- no summary/re-entry scope expansion
