# Owner-Reviewed Composer Shadow Sample Packet v0

## Purpose

Evaluate guarded `/api/session-summary` composer shadow behavior against owner-facing Lumira feel criteria before any guarded read-owner trial.

This packet is validation-only and does not change production ownership or default behavior.

## Guard and containment

Shadow mode required:
- `REFLECTIVE_COMPOSER_SHADOW_ENABLED=1`
- `reflective_shadow_mode=composer`

Containment status:
- Legacy `/api/session-summary` fields remain authoritative.
- Shadow output is additive only.
- No route ownership transfer.
- No persistence/schema/Supabase changes.

## Sample source note

Real production session cohorts were not used in this ticket.

This packet uses deterministic realistic fixtures derived from current route-local summary inputs and the existing shadow+triage implementation.

Risk-oriented samples include explicit deterministic diff injections where current route inputs cannot naturally produce those risk classes yet (for example suppression lineage gaps).

## Review criteria used

Applied criteria from:
- `lumira-summary-reentry-owner-approval-criteria-v0.md`
- `lumira-reflective-reentry-payload-contract-v0.md`
- `lumira-reflective-summary-reentry-expansion-strategy-v0.md`
- `lumira-reflective-interaction-grammar-v0.md`

Evaluated dimensions:
- calmness
- spaciousness
- non-authoritative posture
- optionality
- orientation-first behavior
- no workflow/task pressure
- silence legitimacy
- suppression/defer safety
- lineage traceability

## Sample outcomes

| Sample | Legacy vs composer posture | Diff classes | Triage posture | Owner posture | Plain-language finding |
| --- | --- | --- | --- | --- | --- |
| Calm/simple session | composer equal/slightly calmer | warn-level center/ambient drift only (when present) | `ALLOWED_FUTURE_GUARDED_ROUTE_LOCAL_READ_EXPERIMENT` | `APPROVE_WITH_CONSTRAINTS` | Still feels like Lumira; no pressure leak observed; keep guarded posture. |
| Sparse/minimal session | composer minimal/equivalent | none | `ALLOWED_FUTURE_GUARDED_ROUTE_LOCAL_READ_EXPERIMENT` | `APPROVE` | Silence legitimacy preserved; low-density return remains acceptable. |
| Dense symbolic session | composer denser than adapter | `DENSITY_OVERFLOW` (deterministic fixture) | `BLOCKED` | `NO_GO` | Too dense under contract; blocked until overflow class is eliminated. |
| Emotionally loaded session | center/priority ambiguity under denser composition | `CENTER_MISMATCH` (denser fixture) | `ALLOWED_SHADOW_ONLY` | `HOLD` | Not a hard safety failure, but owner judgment needed before progression. |
| Dormant continuity session | calmer tie-break drift with no hard leak | `CENTER_MISMATCH` (calmer/equal) | `ALLOWED_FUTURE_GUARDED_ROUTE_LOCAL_READ_EXPERIMENT` | `APPROVE_WITH_CONSTRAINTS` | Acceptable if drift remains calmness-preserving and non-pressuring. |
| Defer/suppression-risk session | suppression safety breach simulation | `OPENING_SUPPRESSION_MISMATCH`, `VISIBILITY_LEAK` | `BLOCKED` | `NO_GO` | Any suppression leak remains hard no-go. |
| Missing/partial lineage session | foreground lineage integrity breach simulation | `MISSING_SOURCE_REF` | `BLOCKED` | `NO_GO` | Missing active lineage is unacceptable for guarded read-owner progression. |

## Owner-facing conclusions

What stayed safe:
- calm and sparse samples preserved low-pressure orientation.
- dormant-context center drift can be acceptable if calmer/equal and still optional.

What diverged:
- center selection can differ from adapter.
- ambient ordering/context may drift.

What is still hard blocked:
- suppression/defer visibility leaks.
- density overflow above reflective contract caps.
- missing source refs on active foreground structures.

Does it still feel like Lumira?
- In non-risk samples: mostly yes, with constraints.
- In risk-injected samples: no-go by safety policy.

## Owner posture per sample

- calm/simple: `APPROVE_WITH_CONSTRAINTS`
- sparse/minimal: `APPROVE`
- dense symbolic: `NO_GO`
- emotionally loaded: `HOLD`
- dormant continuity: `APPROVE_WITH_CONSTRAINTS`
- defer/suppression-risk: `NO_GO`
- missing/partial lineage: `NO_GO`

## Overall recommendation

- Composer remains safe for shadow mode.
- Composer is conditionally suitable for a future guarded route-local read-owner trial only when sample sets have zero `NO_GO` outcomes and no unresolved `HOLD` cases.
- Default route switch remains blocked.

Required constraints before any guarded read-owner trial:
1. Zero suppression/visibility leak classes.
2. Zero density overflow classes.
3. No missing active lineage classes.
4. Owner sign-off on center/ambient drift samples.

## Validation evidence

- `npm.cmd run typecheck` passed.
- `npm.cmd run test -- src/domain/reflective/validation/ownerReviewedComposerShadowSamplePacket.test.ts src/domain/reflective/validation/sessionSummaryComposerGuardedReadExperiment.test.ts src/domain/reflective/shadow/composerShadowDiffTriage.test.ts src/domain/reflective/shadow/composerShadowReadExperiment.test.ts` passed.
- Existing composer/reentry/projection validation suites remain passing in this phase.
