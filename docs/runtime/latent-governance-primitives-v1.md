# Latent Governance Primitives v1

Date: 2026-05-26  
Status: Implemented (governance foundation layer)

## Scope

This note documents the first production governance primitives implemented for the latent layer.

This implementation is intentionally bounded:
- no dialogue-layer expansion,
- no user-facing interpretation system,
- no raw latent exposure expansion,
- no symbolic authority behavior.

## Implemented Rules

## 1) Provenance-aware weighting

Implemented in `src/cognition/latent/latent-engine.ts`.

Signals now use weighted scoring across:
- observation provenance tier (`manual_user` / `reviewed` / `imported_transform` / `system_extract`),
- evidence adequacy (`strong_span`, `snippet_only`, `weak_fallback`),
- semantic policy result (`accept`, `accept_with_uncertainty`, deferred/rejected penalties),
- summary-trace quality and explicit-anchor preference,
- fragment-level uncertainty penalties,
- glossary overlap and user-note support boosts.

Result: weak and uncertain inputs lose influence; stronger grounded inputs stabilize eligibility.

## 2) Evidence-aware confidence shaping

Confidence is score-derived (`low` / `tentative` / `moderate`) rather than static by signal type.

Applied to:
- recurrence eligibility,
- reflective opportunity / center candidate,
- snapshot-level confidence band.

## 3) Uncertainty propagation

Uncertainty ratio is computed from weak evidence, uncertainty markers, and non-accept semantic states.

Propagation behavior:
- global uncertainty penalty dampens recurrence and phenomenology totals,
- weak/uncertain material reduces center eligibility,
- high-uncertainty snapshots can fall into no-center continuity mode.

## 4) Stable reflective center selection primitives

Center selection is now deterministic and score-based:
- category-level scores aggregate weighted fragment evidence,
- phenomenological categories are ranked by score with deterministic tie-break ordering,
- center eligibility requires threshold crossing under uncertainty constraints.

No-center is explicitly supported when eligibility is not met.

## 5) Anti-amplification primitives

Implemented controls:
- repetition saturation via recurrence penalty for repeated lexical fragments,
- weak repeated recurrence hard-degradation (`weak_fallback` recurrence repetition collapses),
- no auto-escalation from repeated low-quality cues,
- cadence-policy refractory/similarity-window tests reinforced.
- active lifecycle cooldown enforcement:
  - cooldown-aware recurrence damping,
  - cooldown-aware challenger gating,
  - cooldown-window extension under repeated switch pressure,
  - cooldown-aware no-center legitimacy when salience support is weak.

## 6) Scope discipline primitives

Dormant resurfacing now requires local overlap:
- dormant threads are scoped by lexical overlap with object-local observation context (`title`, `contextNote`, `continuityCues`),
- unrelated dormant continuity is suppressed.

Local before global behavior is enforced in the latent scaffold path.

## 7) Demotion / silence legitimacy

Silence is a first-class outcome:
- if no signal survives thresholds, latent emits low-confidence `continuity_possibility`,
- fallback no longer forces optional suggestion surfacing,
- no-center snapshots can return zero suggestions.

## 7.1 Center-scoped suppression semantics

Suppression is now continuity-local rather than reflective-object-global.

Active suppression is applied only when suppressed opening lineage overlaps the current center line through bounded locality checks:
- center/neighborhood observation overlap,
- local glossary lineage overlap,
- local thread/response lineage overlap,
- affect-adjacent observation overlap.

This preserves:
- unrelated center eligibility,
- neighborhood independence,
- and no-center/silence legitimacy without forced fallback centers.

## 7.2 Bounded response provenance semantics

Response lineage is now bounded before suppression evaluation.

Boundaries:
- snapshot route uses object-local response retrieval,
- latent provenance retains only locally overlapping response lineage,
- opening provenance carries this narrowed lineage forward.

Suppression guard:
- response overlap does not independently trigger suppression,
- response overlap can only reinforce weak locality overlap,
- when provenance locality is ambiguous, suppression degrades toward non-suppression.

This keeps suppression semantics aligned with continuity-line locality rather than broad reflective history overlap.

## 7.3 Bounded observation provenance semantics

Observation lineage is now bounded before opening propagation and suppression evaluation.

Boundaries:
- snapshot route reads observations through a capped local-first object window,
- latent provenance keeps only continuity-local observations selected by locality scoring,
- opening provenance inherits this narrowed observation lineage instead of full reflective-object observation memory.

Suppression guard:
- broad observation overlap alone is insufficient for strong suppression,
- center-observation overlap is strong only when lineage is bounded or reinforced by local glossary/thread/response overlap,
- weak observation overlap requires reinforcement and otherwise degrades toward non-suppression.

This keeps suppression semantics aligned with nearby reflective continuity rather than object-global observation history.

## 8) Attention layering + processing-mode orchestration v1

Layering primitives are represented through eligibility and visibility:
- foreground eligibility requires center threshold crossing,
- weak signals remain low/internal or are withheld,
- background/silent behavior preserved through no-center continuity fallback.

Processing-mode orchestration now runs as bounded internal lifecycle state:
- `exploratory`, `affective`, `agency_oriented`, `existential`, `continuity_oriented`.

Orchestration output includes:
- selected mode or no-mode,
- ranked candidate modes with bounded rationale traces,
- mode confidence and uncertainty,
- no-mode reason under ambiguity/sparsity/suppression,
- nearby material preparation priorities (`observations`, `glossary`, `notes`, `responses`, `neighborhood`).

Governance behavior:
- modes degrade under uncertainty and cooldown/suppression pressure,
- weak or conflicting gravity can resolve to no-mode,
- exploratory bias remains available for high ambiguity without forcing interpretive closure,
- mode state remains internal-only and non-authoritative.

## 8.1) Internal transport boundary enforcement

Patch 6 adds explicit transport projection boundaries for latent snapshot APIs.

Boundary rule:
- internal lifecycle + processing-mode payloads are valid for orchestration/runtime internals,
- raw orchestration internals are not returned by default downstream/public route transport payloads.

Default public route projection now omits:
- `processingMode.selectedMode` and orchestration internals,
- `processingMode.candidateModes`,
- `processingMode.rationaleTrace`,
- `processingMode.modeConfidence` and `processingMode.uncertainty`,
- `processingMode.materialPriorities`,
- lifecycle weighting internals (`centerScore`, salience, attenuation, neighborhood internals).

Default public projection includes only bounded reflective continuity state:
- lifecycle state (`centerState`, `noCenterReason`),
- optional reflective-space suggestions/signals (visibility-scoped),
- sanitized summary language.

## 8.2) No-mode silence semantics

Patch 7 enforces true no-mode behavior.

When `selectedMode === null`:
- no derived fallback mode is injected into suggestion phrasing,
- no derived fallback mode is injected into reflective-opportunity descriptions,
- summary/description behavior stays ambiguity-first and non-orienting.

Exploratory vs no-mode governance:
- exploratory remains valid only when sufficient reflective gravity supports an explicit open orientation,
- weak/high-uncertainty gravity degrades toward no-mode silence rather than weak exploratory substitution.

## 9) Lifecycle payload integrity primitives

Lifecycle payload persistence now follows one canonical adapter/validation contract:
- validate + normalize on read,
- validate + normalize on write,
- degrade invalid/partial payloads safely,
- preserve legacy column compatibility as bounded fallback.

Integrity rules:
- `{}` payload is treated as lifecycle-empty,
- malformed payload does not become trusted lifecycle state,
- invalid state/category values are rejected from lifecycle reconstruction,
- malformed nested fields are normalized with bounded defaults.

This prevents partial-shape drift between persistence and runtime cognition.

## Verification

Governance coverage was added in:
- `src/cognition/latent/__tests__/latent-engine.test.ts`
- `src/cognition/openings/__tests__/opening-cadence-policy.test.ts`

Validation commands executed:
- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run lint`
- `npm.cmd run build`

Build log reference:
- `docs/build-logs/2026-05-26T16-39-32-854Z.log`

## Known Limitations

- Weighting remains deterministic heuristic logic, not learned calibration.
- Center stability across snapshots is now lifecycle-memory-aware, but remains heuristic and bounded.
- Scope overlap is lexical-context based and should later include stronger association signals.
- Processing mode selection remains heuristic and bounded (category/salience/locality-driven), not learned calibration.
- Highlight salience is integrated via bounded proxy/metadata channels and should be migrated to dedicated salience entities when available.
- Cooldown gating is threshold-based and may need longitudinal tuning against broader usage distributions.
- Suppression locality is lineage-heuristic and bounded; it intentionally avoids graph-style narrative clustering.
- Response provenance locality uses bounded lexical/object heuristics and remains intentionally conservative.
- Observation provenance locality uses bounded continuity heuristics (category proximity + lineage cues) and remains intentionally conservative.
- JSON payload validity is currently enforced in adapter/validation logic, not via strict DB-side JSON schema constraints.

Lifecycle extension reference:
- `docs/runtime/latent-reflective-center-lifecycle-engine-v1.md`
