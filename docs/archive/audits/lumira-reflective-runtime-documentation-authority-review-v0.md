# Lumira Reflective Runtime Documentation Authority and Consolidation Review v0

## Purpose

Audit reflective runtime documentation authority, overlap, and contradiction risk before starting next BUILD phase, with minimal consolidation recommendations focused on implementation safety.

Scope is documentation authority/build readiness only.

## Reviewed Set

Primary reviewed documents:

- `docs/architecture/lumira-canonical-architecture-map-v0.md`
- `docs/plans/lumira-reflective-cognition-runtime-architecture-v0.md`
- `docs/plans/lumira-reflective-thread-canonical-data-model-v0.md`
- `docs/plans/lumira-reflective-opening-canonical-data-model-v0.md`
- `docs/plans/lumira-reflective-cognition-runtime-contract-v0.md`
- `docs/plans/lumira-reflective-thread-state-machine-v0.md`
- `docs/plans/lumira-reflective-thread-transition-invariants-v0.md`
- `docs/plans/lumira-reflective-opening-lifecycle-api-contract-v0.md`
- `docs/plans/lumira-reflective-opening-generation-policy-v0.md`
- `docs/plans/lumira-reflective-runtime-compat-contract-v0.md`
- `docs/plans/lumira-route-api-ownership-contract-pack-v0.md`
- `docs/plans/lumira-reflective-projection-contract-pack-v0.md`
- `docs/plans/lumira-reflective-reentry-payload-contract-v0.md`
- `docs/plans/lumira-reflective-space-layer-composition-map-v0.md`
- `docs/plans/lumira-reflective-schema-target-v0.md`
- `docs/plans/lumira-unified-reflective-space-rollout-plan-v0.md`
- `docs/plans/lumira-reflective-summary-reentry-expansion-strategy-v0.md`
- `docs/plans/lumira-summary-reentry-owner-approval-criteria-v0.md`
- `docs/plans/lumira-reflective-implementation-roadmap-v0.md`
- `docs/plans/lumira-reflective-implementation-governance-v0.md`
- `docs/design/lumira-reflective-data-model-bridge-v0.md`
- `docs/design/lumira-reflective-payload-architecture-v0.md`
- `docs/design/lumira-reflective-interaction-grammar-v0.md`
- `docs/design/Lumira_Reflective_Interaction_Model_v2.md`
- `docs/design/Lumira_Reflective_Composer_Model_v1.md`
- `docs/gpts/Observation_Latent_Glossary_Work_Redesign_Handoff.md`
- Validation evidence docs listed in architecture map (`phase-a1-a4`, `projection-parity-gate-a5`, `phase-b1-b2`, `reentry-suppression-defer-parity`, summary/re-entry dry-run audits).

## 1. Documentation Authority Classification

| Document | Recommended classification | Rationale | Action |
| --- | --- | --- | --- |
| `docs/architecture/lumira-canonical-architecture-map-v0.md` | canonical/current | Authority index is required entrypoint for build-safety context | patch one document for consistency |
| `docs/plans/lumira-reflective-cognition-runtime-architecture-v0.md` | canonical/current | New execution-oriented runtime authority with ownership/composer/persistence boundaries | update authority map only |
| `docs/plans/lumira-reflective-thread-canonical-data-model-v0.md` | implementation input | Canonical thread identity/fields/authority boundary for persistence planning | update authority map only |
| `docs/plans/lumira-reflective-opening-canonical-data-model-v0.md` | implementation input | Canonical opening identity/lifecycle/visibility/authority model | update authority map only |
| `docs/plans/lumira-reflective-cognition-runtime-contract-v0.md` | duplicate/merge candidate + conflict-risk document | Overlaps heavily with runtime architecture doc; map currently elevates it without precedence rule | merge later |
| `docs/plans/lumira-reflective-thread-state-machine-v0.md` | canonical/current | State vocabulary and transition graph source | keep separate |
| `docs/plans/lumira-reflective-thread-transition-invariants-v0.md` | canonical/current | Non-negotiable safety/transition invariants | keep separate |
| `docs/plans/lumira-reflective-opening-lifecycle-api-contract-v0.md` | canonical/current | Opening state semantics and ownership semantics | keep separate |
| `docs/plans/lumira-reflective-opening-generation-policy-v0.md` | canonical/current | Surfacing/silence/evidence gating contract | keep separate |
| `docs/plans/lumira-reflective-runtime-compat-contract-v0.md` | canonical/current | Bridge semantics and single-write-owner migration posture | keep separate |
| `docs/plans/lumira-route-api-ownership-contract-pack-v0.md` | canonical/current | Route-level write/read/projection ownership authority | keep separate |
| `docs/plans/lumira-reflective-projection-contract-pack-v0.md` | canonical/current | Projection scope, non-ownership rules, parity/fallback requirements | keep separate |
| `docs/plans/lumira-reflective-reentry-payload-contract-v0.md` | canonical/current | Re-entry caps, center selection, suppression-respecting payload contract | keep separate |
| `docs/plans/lumira-reflective-space-layer-composition-map-v0.md` | implementation input | Composition blueprint for payload composer build | keep separate |
| `docs/plans/lumira-reflective-schema-target-v0.md` | target/future + conflict-risk document | Useful target mapping; state vocab sections currently diverge from newer canonical lifecycle docs | patch one document for consistency |
| `docs/plans/lumira-unified-reflective-space-rollout-plan-v0.md` | canonical/current | Unifies summary/re-entry/entry under one Reflective Space direction | keep separate |
| `docs/plans/lumira-reflective-summary-reentry-expansion-strategy-v0.md` | planning-only active | High-risk surface strategy; still relevant as rollout safety layer | keep separate |
| `docs/plans/lumira-summary-reentry-owner-approval-criteria-v0.md` | planning-only active | Owner acceptance gating for high-impact surfaces | keep separate |
| `docs/plans/lumira-reflective-implementation-roadmap-v0.md` | planning-only active | Phase sequencing and gates | keep separate |
| `docs/plans/lumira-reflective-implementation-governance-v0.md` | canonical/current | Source-of-truth governance matrix and sequencing control | keep separate |
| `docs/design/lumira-reflective-data-model-bridge-v0.md` | implementation input | Concept-to-persistence bridge and migration implications | keep separate |
| `docs/design/lumira-reflective-payload-architecture-v0.md` | implementation input | Visibility layer framing and payload taxonomy | keep separate |
| `docs/design/lumira-reflective-interaction-grammar-v0.md` | canonical/current | Tone/density/silence grammar constraints | keep separate |
| `docs/design/Lumira_Reflective_Interaction_Model_v2.md` | canonical/current | Reflective space experiential model | keep separate |
| `docs/design/Lumira_Reflective_Composer_Model_v1.md` | canonical/current | Composer behavior model and anti-pattern boundaries | keep separate |
| `docs/gpts/Observation_Latent_Glossary_Work_Redesign_Handoff.md` | canonical/current | Cognition redesign direction source | keep separate |
| `docs/audits/phase-a1-a4-projection-drift-review.md`, `projection-parity-gate-a5.md`, `phase-b1-b2-reflective-read-drift-review.md`, `reentry-suppression-defer-parity-assertion-pack.md` | validation evidence | Operational parity/risk evidence for guarded rollout | keep separate |

## 2. Overlap Map and Consolidation Decision

| Overlap zone | Documents | Risk | Recommendation |
| --- | --- | --- | --- |
| Runtime cognition architecture scope | `...runtime-contract-v0.md` vs `...runtime-architecture-v0.md` | competing “canonical” runtime definitions | update authority map only (precedence rule) |
| Thread state semantics | thread state machine, invariants, thread canonical model, schema target | mismatched state vocabulary in schema-facing doc | patch one document for consistency |
| Opening state semantics | opening lifecycle, opening generation policy, opening canonical model, schema target | schema target omits canonical lifecycle states | patch one document for consistency |
| Ownership boundaries | runtime compat, route/API ownership, projection contract, runtime architecture | mostly aligned, but spread across multiple docs | keep separate |
| Re-entry/summary direction | unified reflective space rollout + summary/reentry strategy + owner criteria + reentry payload contract | potential route-vs-space interpretation drift | keep separate |
| Payload composition blueprint | payload architecture + space layer composition map + re-entry payload contract | low conflict, high complementarity | keep separate |
| Schema direction vs runtime-lifecycle semantics | schema target vs newer thread/opening canonical models | implementation confusion risk for upcoming build/schema planning | patch one document for consistency |

## 3. Contradiction Review

### 3.1 Thread state vocabulary

Contradiction found:

- `lumira-reflective-thread-state-machine-v0.md` canonical thread states: `emerging`, `open`, `active`, `answered`, `dormant`, `resurfaced`, `deferred`, `archived`, `dismissed`.
- `lumira-reflective-thread-canonical-data-model-v0.md` aligns to that full set.
- `lumira-reflective-schema-target-v0.md` “Thread states” section lists `open`, `answered`, `deferred`, `dormant`, `revisited`, `dismissed` (missing `emerging`, `active`, `resurfaced`, `archived`, and introducing `revisited` at thread level).

Status: build-risk contradiction.

### 3.2 Opening state vocabulary

Contradiction found:

- Opening lifecycle contract and opening canonical model include full set: `generated`, `candidate`, `surfaced`, `engaged`, `deferred`, `revisited`, `expired`, `dismissed`, `archived`.
- Schema target opening state section lists a reduced subset and omits `generated`, `revisited`, `expired`.

Status: build-risk contradiction (especially for state-mapping semantics).

### 3.3 Ownership boundaries

No hard contradiction found.

- Runtime compatibility, route/API ownership, projection contract, and runtime architecture all preserve single-write-owner and projection-only non-ownership.

Status: aligned.

### 3.4 Projection vs canonical persistence

No hard contradiction found.

- Projection docs consistently prohibit canonical writes and silent lifecycle ownership drift.
- Canonical thread/opening model docs preserve compatibility-first migration.

Status: aligned.

### 3.5 Schema target vs conceptual models

Partial contradiction found:

- State vocab inconsistencies (thread/opening) as above.
- Schema target still expresses older transitional state shorthand in some sections.

Status: contradiction requiring consistency patch before build kickoff.

### 3.6 Summary/re-entry vs unified Reflective Space

No hard contradiction found.

- Unified rollout plan states summary/re-entry/entry are one Reflective Space with contextual emphasis.
- Summary/re-entry strategy and owner criteria align as safety-governed high-risk surface documents.

Status: aligned with overlap.

### 3.7 Cross-session continuity posture

No hard contradiction found.

- Thread/state/compat docs keep session-scoped first in alpha and defer canonical cross-session identity.

Status: aligned; still owner-question open.

### 3.8 Latent inspectability / cognition surfacing

No direct contradiction found; unresolved owner-level decision remains.

- Most docs enforce internal latent, transformed surfacing only.
- Runtime architecture and canonical models keep inspectability as open question, not decided policy.

Status: deferrable owner decision.

### 3.9 Glossary and highlight ownership rules

No hard contradiction found.

- User-owned salience precedence and glossary non-authoritative recurrence posture remain consistent across runtime/route/projection/re-entry docs.

Status: aligned.

## 4. Minimal Consolidation Recommendations

1. `docs/architecture/lumira-canonical-architecture-map-v0.md`
- Recommendation: update authority map only.
- Why: new canonical docs (`runtime-architecture-v0`, thread/opening canonical models) are not yet reflected; this creates ticket-entry drift risk.

2. `docs/plans/lumira-reflective-cognition-runtime-contract-v0.md` vs `...runtime-architecture-v0.md`
- Recommendation: merge later.
- Why: high thematic overlap; not required to merge before next build if precedence is explicitly set in map/governance.

3. `docs/plans/lumira-reflective-schema-target-v0.md`
- Recommendation: patch one document for consistency.
- Why: thread/opening state vocabulary currently conflicts with canonical lifecycle/state docs.

4. Summary/re-entry strategy + owner criteria + unified rollout plan
- Recommendation: keep separate.
- Why: they serve complementary roles (direction, risk strategy, owner gate).

5. Runtime compat + route ownership + projection pack
- Recommendation: keep separate.
- Why: each addresses distinct migration boundary level and together form the critical ownership safety envelope.

## 5. Build-Readiness Conclusion

### Is the set safe enough to start `BUILD — Reflective Space Payload Composer Foundation`?

Conditionally yes, with two pre-build documentation fixes.

### Build-blocking contradictions (must resolve before build)

1. Thread state vocabulary mismatch between schema target and canonical thread/state-machine docs.
2. Opening state vocabulary mismatch between schema target and canonical opening lifecycle docs.
3. Authority index drift: architecture map does not yet establish precedence for new canonical runtime/thread/opening architecture docs.

### Deferrable contradictions/questions (can defer beyond composer foundation)

1. Latent inspectability policy decision.
2. Cross-session continuity metadata shape (while keeping alpha session-scoped identity).
3. Advanced cooldown/resurfacing sophistication details.
4. Contract-level decision on persisting `generated` openings in alpha.

## 6. Recommended Source-of-Truth Bundle for Next BUILD

For `BUILD — Reflective Space Payload Composer Foundation`, treat as authoritative:

1. `docs/plans/lumira-reflective-cognition-runtime-architecture-v0.md`
2. `docs/plans/lumira-reflective-thread-canonical-data-model-v0.md`
3. `docs/plans/lumira-reflective-opening-canonical-data-model-v0.md`
4. `docs/plans/lumira-route-api-ownership-contract-pack-v0.md`
5. `docs/plans/lumira-reflective-runtime-compat-contract-v0.md`
6. `docs/plans/lumira-reflective-projection-contract-pack-v0.md`
7. `docs/plans/lumira-reflective-reentry-payload-contract-v0.md`
8. `docs/plans/lumira-reflective-space-layer-composition-map-v0.md`
9. `docs/plans/lumira-reflective-thread-state-machine-v0.md`
10. `docs/plans/lumira-reflective-thread-transition-invariants-v0.md`
11. `docs/plans/lumira-reflective-opening-lifecycle-api-contract-v0.md`
12. `docs/plans/lumira-reflective-opening-generation-policy-v0.md`
13. `docs/design/lumira-reflective-interaction-grammar-v0.md`
14. Validation evidence: `docs/audits/projection-parity-gate-a5.md`, `docs/audits/reentry-suppression-defer-parity-assertion-pack.md`, `docs/audits/phase-b1-b2-reflective-read-drift-review.md`

Use as contextual-support docs (non-primary in build conflicts):

- `docs/plans/lumira-reflective-cognition-runtime-contract-v0.md`
- `docs/plans/lumira-reflective-schema-target-v0.md` (until state vocab patched)
- summary/re-entry strategy/owner-criteria planning docs

## 7. Recommended Next Ticket

`PATCH/PLAN — Reflective Documentation Authority Alignment v0`

Minimum scope:

1. Update `docs/architecture/lumira-canonical-architecture-map-v0.md` with:
- new canonical docs added
- explicit precedence: `runtime-architecture-v0` supersedes overlapping runtime-contract sections for build tickets
- thread/opening canonical model docs included in canonical context bundles

2. Patch `docs/plans/lumira-reflective-schema-target-v0.md` state sections to align with canonical thread/opening lifecycle vocabulary (or explicitly mark reduced lists as transitional subsets, not canonical vocab).

## 8. Non-goals Confirmed

- No runtime code changes
- No route/API changes
- No schema/migration/Supabase changes
- No philosophy rewrite
- No broad docs cleanup beyond build-safety analysis
