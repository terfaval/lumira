# Reflective Center Lifecycle Engine v1

Date: 2026-05-26  
Status: Implemented (bounded lifecycle foundation)

## Scope

This note documents the first durable reflective-center lifecycle layer for latent cognition.

This implementation is intentionally bounded:
- no dialogue expansion,
- no symbolic interpretation system,
- no therapeutic/diagnostic claims,
- no mandatory surfacing behavior.

## Implemented Foundations

## 1) Durable center lifecycle memory

Latent snapshots now persist lifecycle payload in durable snapshot state:
- `centerCategory`
- `centerState` (`possible`, `emerging`, `stabilized`, `weakening`, `dormant`, `suppressed`)
- `centerScore`
- `persistenceStreak`
- `cooldownUntil`
- bounded neighborhood + attenuation + salience metadata

Persistence boundary:
- `supabase/migrations/20260526_0017_reflective_center_lifecycle_memory.sql`
- `src/infrastructure/supabase/adapters/latent-row.ts`
- `src/domain/latent/types.ts`

## 1.1 Lifecycle payload shape hardening

Lifecycle payloads are now treated as validated infrastructure state, not loosely trusted JSON.

Canonical contract enforcement:
- payload must contain valid core lifecycle fields (`centerState`, `centerScore`, `persistenceStreak`),
- category/state values are validated against canonical enums,
- numeric values are finite and bounded,
- cooldown timestamps are sanitized (`invalid -> null`),
- neighborhood and metadata arrays are deduped/capped and invalid members are dropped.

Degradation semantics:
- empty payload (`{}`) is interpreted as lifecycle-empty, not lifecycle-valid,
- malformed payloads do not execute as valid lifecycle memory,
- read path attempts legacy-column fallback only when payload validation fails and legacy state exists,
- write path normalizes lifecycle before persistence and emits `{}` for lifecycle-null snapshots.

Safety principle:
- lifecycle corruption degrades toward calm/no-center behavior rather than synthetic continuity inflation.

## 2) User-owned salience integration

Center scoring now includes a user-owned salience layer:
- highlight-weight proxy from explicit-anchor + user-reviewed/manual observation traces,
- glossary note density contribution,
- revisitation behavior via recent lifecycle history on the same reflective object,
- persistence/writing signal from responses + activated openings,
- explicit emphasis from reflective object metadata keys when provided.

Rule enforced in weighting:
- user-owned salience scales center stability and can outweigh recurrence-only reinforcement.

## 3) Cross-snapshot attenuation

Longitudinal attenuation now influences recurrence/center promotion:
- repetition decay for repeated center continuity without sufficient reinforcement,
- refractory penalty for weak repeated continuity under low user salience,
- cooldown penalty when recent switch activity indicates oscillation risk.

This prevents passive repeated recurrence from escalating indefinitely.

## 3.1 Cooldown enforcement semantics

Cooldown is now an active eligibility gate, not metadata-only payload.

Behavior:
- cooldown begins when challenger pressure is high (switch-window threshold) and also extends when challenger pressure repeats during an already-active cooldown window,
- while cooldown is active, recurrence and phenomenology resurfacing are damped unless strong user-owned salience is present,
- challenger center promotion requires stronger margin during cooldown; marginal challengers are retained/demoted instead of rapidly foregrounded,
- cooldown expiry restores normal challenger/recurrence behavior without permanent lockout.

Interaction rules:
- suppression remains strongest gate and can still force `suppressed`,
- no-center remains valid under cooldown (`cooldown_active` no-center reason),
- cooldown is attentional recovery, not punitive suppression.

## 4) Anti-thrashing center dynamics

Center switching is damped with hysteresis:
- challenger centers must exceed prior stabilized/emerging center score by margin,
- high switch pressure tightens challenger margin,
- stability can retain prior center when challenger is marginal.

Result:
- calmer center continuity, lower foreground churn.

## 5) Continuity neighborhood persistence (bounded)

Lifecycle payload stores bounded nearby continuity:
- top related categories (capped),
- local glossary anchors,
- affect adjacency,
- local thread continuity cues.

Neighborhoods remain local-first and uncertainty-bounded.

## 6) Demotion and silence legitimacy

Lifecycle transitions explicitly support letting-go:
- stable/emerging -> weakening under insufficient/no-center evidence,
- weakening/suppressed -> dormant under continued sparse input,
- suppression-overlap -> suppressed lifecycle state.

No-center remains valid and can return no optional suggestions.

## 6.1 Center-scoped suppression locality

Suppression now applies to the active continuity line rather than object-global scope.

Center-local suppression overlap is evaluated through bounded locality signals:
- center/neighborhood observation lineage overlap,
- local glossary-anchor lineage overlap,
- local thread/response lineage overlap,
- affect-adjacent observation overlap.

Propagation boundaries:
- suppression propagates only when overlap signals indicate same continuity line,
- unrelated continuity lines on the same reflective object remain eligible,
- suppression does not force substitute centers; no-center remains valid.

Interaction semantics:
- suppression remains higher-priority than cooldown when locality overlap is present,
- cooldown and attenuation still govern non-suppressed challengers and resurfacing pressure.

## 6.2 Response provenance locality hardening

Response lineage now follows bounded reflective locality before it enters suppression overlap semantics.

Local response lineage rules:
- latent route requests object-local responses (not full user-wide response history),
- lifecycle provenance keeps only responses with local lexical overlap to current observation context,
- opening lineage inherits this narrowed response subset rather than broad response memory.

Suppression overlap tightening:
- response overlap alone is not sufficient to force suppression,
- suppression requires strong locality overlap (`centerObservation` or `glossary` or `thread`) or a weak-observation overlap reinforced by local response overlap,
- ambiguous lineage now degrades toward non-suppression.

Safety effect:
- unrelated continuity lines on shared objects are less likely to suppress each other through broad response inheritance.

## 6.3 Observation provenance locality hardening

Observation lineage now follows continuity-local boundaries before it enters opening and suppression overlap semantics.

Local observation lineage rules:
- latent snapshot route uses a bounded object-local observation window (local-first, capped history),
- lifecycle provenance keeps a scored local subset of observations (center-category proximity, neighborhood/affect adjacency, local glossary/thread/response cue overlap, explicit-anchor support),
- opening provenance inherits this narrowed observation subset rather than full object observation history.

Suppression overlap tightening:
- broad observation overlap alone is no longer sufficient for strong suppression,
- strong observation-driven suppression requires either bounded observation lineage or reinforcement via local glossary/thread/response overlap,
- weak observation overlap (`neighborhood`/`affect`) requires reinforcement and otherwise degrades toward non-suppression.

Safety effect:
- shared-object but continuity-unrelated historical observations no longer collapse suppression toward object-global behavior.

## 7) Processing-mode compatibility

Processing-mode orchestration is now embedded in lifecycle payload as orientation-only internal state.

Lifecycle payload now includes:
- `processingMode.selectedMode` (`exploratory` / `affective` / `agency_oriented` / `existential` / `continuity_oriented` / `null`),
- bounded candidate modes with confidence bands and rationale traces,
- mode confidence + uncertainty,
- no-mode reason for ambiguous/sparse/suppressed states,
- nearby material preparation priorities.

Compatibility rules:
- suppression/cooldown/attenuation can reduce mode confidence and force no-mode,
- mode selection cannot override center suppression semantics,
- no-center and silence remain valid with exploratory or no-mode outcomes,
- orchestration remains internal-only and does not add interpretation-layer surfacing.

## Verification

Validation commands executed:
- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run lint`
- `npm.cmd run build`

Build log reference:
- `docs/build-logs/2026-05-26T16-39-32-854Z.log`

## Known Limitations

- Highlight salience currently uses bounded proxy signals and metadata hints, not a dedicated highlight table in this clean-room schema.
- Lifecycle memory is snapshot-durable but still heuristic; no learned calibration.
- Cross-snapshot attenuation is deterministic and should be tuned with broader real-user distributions.
- Cooldown enforcement remains deterministic and uses heuristic override thresholds for strong user-owned salience.
- Center-scoped suppression locality remains heuristic and lineage-based; it does not use graph-level continuity reasoning.
- Response locality still relies on lexical overlap heuristics and object associations; no graph-level continuity inference is introduced.
- Observation locality is continuity-scored and bounded, but remains heuristic (category/tokens/lineage) rather than graph-level continuity reasoning.
- Payload hardening is adapter/validation-layer normalization (bounded and non-throwing), not schema-level JSON validation.
- Processing-mode orchestration remains deterministic heuristic logic and should be tuned against broader longitudinal distributions.
