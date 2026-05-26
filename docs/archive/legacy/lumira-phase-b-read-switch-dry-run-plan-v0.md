# Lumira Phase B Read-switch Dry Run Plan v0

## 1. Purpose

Define a safe execution plan for Phase B reflective-first read dry runs before any default/user-facing switch.

Why this exists:
- reflective projections must be compared against legacy reads before adoption
- parity evidence must be explicit, reproducible, and route-scoped
- read migration must remain immediately reversible

Clarifications:
- dry-run != rollout
- dry-run != canonical ownership transfer
- dry-run != production adoption

## 2. Dry-run Philosophy

Core principles:
- compare before switching
- preserve legacy authority
- reflective reads remain secondary
- rollback remains immediate
- evidence beats intuition
- omission is preferable to synthetic continuity
- calmness parity is mandatory

Hard rule:
- no hidden production dependency on projection outputs

## 3. Candidate Dry-run Surfaces

| Surface | Risk | Parity complexity | Projection dependencies | Suppression sensitivity | Density sensitivity | Rollback complexity |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/session-summary` | Critical | Very high | A1+A2+A3+A4 (+ lens/response projection shape where present) | High | High | Medium |
| `/session/[id]/summary` | Critical | Very high | A3 re-entry + A4 highlights + A2 openings + A1 threads | High | High | Medium |
| `/session/[id]` | High | High | A3 re-entry + A1/A2 | High | High | Low-Medium |
| `/session/[id]/(flow)/work` | High | High | A1 threads + A2 openings + response projection semantics | Medium-High | Medium | Low-Medium |
| `/session/[id]/(flow)/highlights` | Medium-High | Medium | A4 unified highlights | Medium | Medium | Low |

Recommended dry-run order:
1. `/session/[id]/(flow)/highlights`
2. `/session/[id]/(flow)/work`
3. `/session/[id]`
4. `/api/session-summary`
5. `/session/[id]/summary`

Rationale:
- start with narrower domain surfaces
- end with highest aggregation risk surfaces (summary/re-entry)

## 4. Dry-run Modes

Allowed dry-run modes:
- shadow payload comparison (legacy payload + reflective payload in parallel)
- internal-only reflective payload generation
- side-by-side parity assertions in validation harness/tests
- non-user-facing comparison logs/artifacts
- isolated route-level validation harness execution

Explicitly forbidden:
- hidden production/default switch
- silent user exposure
- reflective payload acting as implicit canonical fallback

## 5. Required Parity Dimensions

Mandatory parity dimensions:
- suppression/defer behavior parity
- visibility-layer parity
- calmness/density parity
- lineage/source-trace preservation
- fallback behavior parity
- deterministic ordering stability
- highlight continuity parity (pin/reject/salience posture)
- neighborhood boundedness
- omission behavior parity (weak signals can be omitted)
- no urgency/pressure escalation

Acceptable divergence:
- reflective payload may omit weak/low-confidence continuity where contract allows omission
- formatting/layout-level differences that do not alter behavioral semantics

Unacceptable divergence:
- suppressed/deferred resurfacing in ambient/foreground
- density inflation beyond contract caps
- missing lineage for foreground/surfaced items

## 6. Read Comparison Methodology

Method:
1. collect legacy payload for target surface
2. generate reflective payload from same runtime snapshot
3. compare against parity dimensions
4. classify differences
5. produce route-level go/no-go

Mismatch categories:
- blocker: safety/contract violation (suppression, density, rollback, ownership ambiguity)
- warning: non-blocking precision drift (e.g., trace breadth)
- acceptable divergence: contract-compliant difference
- intentional reflective simplification: documented omission of weak continuity

Evidence package per route:
- input snapshot reference
- legacy payload
- reflective payload
- diff summary
- category map (blocker/warning/acceptable/simplification)

## 7. Route-by-route Validation Strategy

### `/session/[id]/(flow)/highlights`
- Inputs: split highlight reads + rejected keys + glossary links
- Expected reflective differences: normalized unified shape only
- Assertions: deterministic order, pin/reject parity, no semantic auto-merge
- Rollback expectation: direct split-table reads unchanged
- No-go: reject drift, salience inflation, missing source lineage

### `/session/[id]/(flow)/work`
- Inputs: work_versions/work_latest + dream_answers + direction context
- Expected reflective differences: thread/opening read projections and optional omission
- Assertions: continuity ordering, answer lineage stability, no pressure escalation
- Rollback expectation: legacy work read path intact
- No-go: state drift, suppression mismatch, unstable ordering

### `/session/[id]`
- Inputs: session/entry/frame/work/answer context + re-entry projection payload
- Expected reflective differences: bounded center/neighborhood + ambient split
- Assertions: center conservatism, suppression parity, density caps
- Rollback expectation: existing session page assembly remains authoritative
- No-go: foreground inflation, suppressed leakage, unstable center selection

### `/api/session-summary`
- Inputs: current summary route DTO + reflective composition from same source artifacts
- Expected reflective differences: projection-shaped continuity fields + bounded omission
- Assertions: suppression/defer parity, calmness caps, lineage presence
- Rollback expectation: route continues legacy output by default
- No-go: critical behavioral divergence in suppress/density/fallback

### `/session/[id]/summary`
- Inputs: summary page runtime reads + reflective re-entry/highlight projections
- Expected reflective differences: structured reflective continuity ordering
- Assertions: same safety profile as API summary plus UI-surface density behavior
- Rollback expectation: current page read assembly remains primary
- No-go: any blocker from API summary plus UI-level overload drift

## 8. Suppression/Density Guardrails

Hard validation rules:
- suppressed/deferred openings must not reappear in ambient/foreground
- no continuity flooding beyond caps
- no foreground inflation under ambiguity
- neighborhood must remain bounded
- calmness caps must hold
- silence legitimacy must hold

Explicit no-go examples:
- deferred opening appears in ambient list after suppression mapping
- ambient + neighborhood exceed configured cap under same input
- low-confidence opening enters active foreground without contract gate

## 9. Rollback Safety Requirements

Dry-run rollback safety requires:
- dry-run path removable without behavior change
- legacy reads remain canonical/authoritative
- reflective generation disableable instantly
- no hidden coupling to projection output
- no persistence dependency on reflective read artifacts

Rollback validation checks:
- route-level disable-by-non-use proof
- no write-path references to dry-run payloads
- no hidden canonical projection store

## 10. Evidence Collection Requirements

Required evidence:
- payload snapshots (legacy vs reflective)
- parity comparison reports by route
- caller audit outputs
- route isolation proof
- test command outputs
- drift checklist results

Reproducibility requirements:
- stable input dataset/sample definition
- deterministic comparison ordering
- timestamped validation artifacts
- explicit command list and expected output envelope

## 11. Owner Approval Gates

Owner approval required:
- before any user-visible reflective read dry-run exposure
- before any summary/re-entry dry-run exposure beyond internal validation context
- before any default reflective-first route switch
- before Phase C ownership-transfer planning starts

Approval packet:
- per-route parity report
- unresolved warnings list
- rollback proof
- caller isolation proof

## 12. No-go Conditions

Dry-run progression is blocked if:
- suppression parity fails
- route isolation fails
- density caps fail
- fallback path is unclear/unproven
- hidden canonicalization appears
- lineage is missing for surfaced continuity
- deterministic ordering is unstable
- rollback path is incomplete

## 13. Recommended Execution Sequence

1. Build route-by-route dry-run validation harness (internal-only)
2. Validate low-risk surfaces first (`highlights`, then `work`)
3. Validate highlight/read parity package (A4-centric)
4. Validate work-flow parity package (A1/A2-centric)
5. Validate summary/re-entry parity package (`/api/session-summary`, `/session/[id]`, `/session/[id]/summary`)
6. Owner review of full evidence
7. Select first reflective-first read candidate (still non-default until separate approval)

Sequencing logic:
- move from narrow surface scope to high aggregation scope
- gate each step with blocker/warning classification and rollback proof

## 14. Recommended Next Tickets

1. `VALIDATION — Route-by-route Reflective Read Dry Run`
2. `VALIDATION — Summary/Re-entry Reflective Payload Diff Audit`
3. `PLAN/BUILD — Opening Lineage Precision Tightening` (if dry-run evidence warrants)
4. `PLAN — First Reflective-first Read Candidate Selection`

## Validation

Docs/planning only.

- No runtime changes
- No route/API switches
- No schema/Supabase changes
