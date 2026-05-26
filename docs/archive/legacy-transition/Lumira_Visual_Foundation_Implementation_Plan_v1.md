# Lumira Visual Foundation Implementation Plan v1

## 1. Executive summary

### Current frontend state
- The active UI is primitive-led but visually mixed: `Shell` + `GlassCardSurface` + global tokens are widely reused, while many routes still carry route-local style logic (`<style jsx>` and module-level overrides).
- Reflective runtime maturity is high in data/runtime contracts (thread/opening/reentry/projection/governance), but visual/surface behavior is still partially legacy (glass, blur, cinematic gradient, premium hover, dense utility clusters).
- The most coupled frontend dependencies are:
  - global `app/globals.css` token and utility surface layer
  - `components/GlassCardSurface/*` (used across core reflective and non-reflective routes)
  - `components/Shell.tsx` (header, drawer, modal, surface wrapper behavior)
  - route-local toolbar/filter/panel patterns duplicated across `summary`, `direction`, `evening`, `glossary`, `archive`.

### Main architecture mismatch
- Runtime philosophy is shell/layer/posture-oriented; current visual implementation is still route-fragmented and component-style-fragmented.
- Reflective space model expects orientation vs deep-reflection layering with calm pacing invariants; current screens still encode local interaction drama (hover lift/scale, blur overlays, floating toolbars, dense pills).

### Highest-risk implementation areas
- `GlassCardSurface` as the transitive visual root for most surfaces.
- Route-local style blocks in `frame`, `work`, `evening`, `archive`, `glossary`, `new` that bypass shared primitive governance.
- Background/atmospheric stack (`BackgroundImageLayer`, dormant cosmic/fractal systems, gradient drift) with high visual influence and low semantic control.
- Typography metadata style (uppercase labels + heavy weight + tracking) repeated across orientation/support surfaces.

### Recommended implementation philosophy
- Foundation-first, compatibility-preserving migration:
  - stabilize token contract and primitive semantics first
  - migrate surface ontology second
  - only then route-level adoption under parity checks.
- Keep reflective runtime invariants as non-negotiable guardrails; visuals must adapt to runtime, not reinterpret runtime.

### Why foundation-first, not screen-first
- Screen-first will re-encode old visual assumptions route-by-route and reintroduce divergence.
- Shared primitives currently own most visual behavior; changing routes before primitives creates duplicate temporary systems and rollback complexity.
- Reflective calmness, continuity, and silence legitimacy depend on cross-route consistency; this is only achievable when tokens/surfaces/motion primitives are corrected before screen composition.

---

## 2. Current frontend architecture map

### Global styling and theme roots
- `app/globals.css`
  - token root (`--bg-*`, `--text-*`, `--accent-*`, spacing, radius, shadow)
  - shell primitives (`.shell`, `.surface-layer`, `.card`, `.btn`, `.pill`, safe-area helpers)
  - includes legacy-like layers (`.glass-card`, backdrop blur, gradient surfaces)
  - contains many fallback vars not centrally defined (`--glass-*`, `--panel-*`, `--overlay-*`, `--line-strong`, etc).
- `components/NapszakInitializer.tsx`
  - currently hard-forces `data-napszak="default"` (`FORCE_DEFAULT_THEME = true`), making day/night branching mostly dormant.

### App root and atmosphere composition
- `app/layout.tsx`
  - active: `BackgroundLayerGate`
  - imported but not rendered: `CosmicNeonLayerGate`, `FractalLayerGate` (dormant legacy atmospheric inheritance).
- `components/BackgroundLayerGate.tsx` -> `components/BackgroundImageLayer.tsx`
  - dynamic background source resolution + animated gradient drift + blur/filter effects.

### Shared primitives and cross-route coupling
- `components/Shell.tsx`
  - top bar, drawer, info panel, guest modal, content surface mode (`card`/`none`/`ghost`), `space` mode.
  - strong coupling to global classes and safe-area behavior.
- `components/GlassCardSurface/GlassCardSurface.tsx` + module css
  - core surface primitive with gradient paper, gloss/grain overlays, blur variants, optional interaction/glow.
  - transitive base for `Card`, `WorkCard`, tiles, panels, modals, and many route surfaces.
- `components/Card.tsx`, `PrimaryButton.tsx`, `Pill.tsx`
  - thin wrappers around global style classes.
- `components/FullScreenLoadingOverlay.tsx`, `FlowLoadingOverlay.tsx`, `LumiraLoader.tsx`
  - overlay and loading animation system with blur/sigil animation.

### Core reflective route shell and modules
- Flow shell: `app/session/[id]/(flow)/FlowShellClient.tsx` + `layout.module.css`
  - two-panel shell, mobile panel toggle, title edit overlay, info panel integration.
- Reflective routes:
  - `frame/page.tsx` (orientation framing and recommended direction cards)
  - `direction/page.tsx` + `direction.module.css` (selection modal behavior, filters, panel/fab controls)
  - `work/page.tsx` + `components/WorkCard.tsx` (deep reflection card loop)
  - `highlights/page.tsx` + `components/HighlightsPanel*`
  - `summary/page.tsx` + `summary.module.css` (re-entry synthesis surface with dense mixed sections).

### Non-reflective but shared visual inheritance routes
- `new/NewClient.tsx`, `archive/ArchiveClient.tsx`, `evening/page.tsx`, `glossary/*.tsx`, `landing/*`.
- Many of these define route-local `<style jsx>` blocks with independent panel/filter/overlay styles.

### Route-specific styling systems
- CSS modules:
  - `app/session/[id]/summary/summary.module.css`
  - `app/session/[id]/(flow)/direction/direction.module.css`
  - `app/session/[id]/(flow)/layout.module.css`
  - `components/HighlightsPanel.module.css`
  - `components/DreamRawPanel.module.css`
  - `components/DirectionTile.module.css`
  - `components/EveningCardTile.module.css`
  - `components/EveningCardFlip.module.css`
  - `components/landing/LandingPage.module.css`
  - `app/dreamspace/guide/page.module.css`
- Route-local style-jsx surfaces:
  - `new`, `frame`, `work`, `archive`, `evening`, `glossary`, `glossary/suggestions`, `archive/controls`.

### Active dependency relationships
- `Shell` -> global `.shell`, `.surface-layer`, `.btn`, `.icon-btn`, modal classes.
- `Card` -> `GlassCardSurface`.
- `WorkCard` -> `GlassCardSurface` + `PrimaryButton` + inline style-jsx.
- Direction/evening/archive tiles -> `GlassCardSurface` + `Pill` + module-local hover behaviors.
- Flow/summary/highlights route composition -> shared primitives + local CSS modules + inline overrides.

### Inactive/dormant systems
- `CosmicNeonLayerGate`, `CosmicLayerGate`, `FractalLayerGate` are present but not active in root render tree.
- Theme branches for `dawn`/`afternoon` are functionally dormant with forced default napszak.

---

## 3. Shared primitive dependency graph

| Primitive / System | Dependency scope | Risk | Migration sensitivity | Reflective importance |
|---|---|---|---|---|
| `GlassCardSurface` | 26 files across reflective + non-reflective routes | Very High | Very High | Very High |
| `Shell` | all main app shells | Very High | High | Very High |
| global tokens (`app/globals.css`) | every route | Very High | Very High | Very High |
| `PrimaryButton`/`.btn` | action surfaces across routes | Medium | Medium | High |
| `Pill`/`.pill` | taxonomy, metadata, filters | Medium | Medium | Medium |
| `FullScreenLoadingOverlay` + `LumiraLoader` | transition and blocking states | High | Medium | High |
| `DreamRawPanel` | deep reflection left panel + highlight overlay | High | High | High |
| `HighlightsPanel` | summary + flow highlights | High | High | High |
| Flow shell (`FlowShellClient` + `layout.module.css`) | frame/direction/work/highlights | Very High | Very High | Very High |
| `BackgroundLayerGate` + `BackgroundImageLayer` | global atmospheric baseline | High | High | High |
| route-local style-jsx toolbars/panels | `evening`, `archive`, `glossary`, `new`, `frame`, `work` | High | High | Medium |

### Key graph interpretation
- `GlassCardSurface` and `Shell` form the primary visual trunk.
- Route-local style blocks are bypass branches; they are the biggest source of design drift and regression-prone overrides.
- Any migration that touches route shells before primitive contract hardening will multiply divergence.

---

## 4. Reflective implementation constraints

### Must preserve
- reflective pacing over completion pressure
- silence legitimacy (non-action is valid)
- continuity layering (foreground/midground/background)
- orientation-first framing before deep intervention
- optionality without workflow framing
- calm return/re-entry readability.

### Must not reintroduce
- dashboardification (simultaneous dense control clusters)
- workflow/task pressure signaling
- compulsive continuation loops via visual urgency
- cinematic drift (dominant atmospheric drama)
- synthetic significance cues (glow/premium aura as authority signal)
- AI authority aesthetic (oracle-like framing).

### Frontend guardrails derived from reflective runtime docs
- One gravitational center per state.
- Bounded openings only; avoid stacking concurrent attention magnets.
- Support layers stay secondary and dismissible.
- Continuity content must remain quiet context, not command center.
- Interaction affordances should invite reflection, not throughput.

---

## 5. Recommended implementation phases

## Phase 0 - Baseline freeze and observability
- Goals:
  - freeze visual baseline for parity comparison
  - capture representative snapshots for `frame`, `direction`, `work`, `summary`, `highlights`, `new`, `evening`.
- Affected systems:
  - no visual rewrite; add measurement checklist only.
- Regression risks:
  - low; process-only.
- Validation requirements:
  - baseline screenshots and behavior notes (desktop + mobile).
- Rollback:
  - none required.

## Phase 1 - Visual token hardening
- Goals:
  - define explicit token contract for colors, surfaces, blur, shadow, overlay, motion durations, typography meta weights.
  - eliminate implicit fallback token chains where possible.
- Affected systems:
  - `app/globals.css`, token consumers in shared primitives.
- Regression risks:
  - global contrast and readability shifts.
- Validation requirements:
  - contrast, text hierarchy, parity checks on all shell types.
- Rollback:
  - token version switch (`v_current` / `v_next`) via scoped root attribute.

## Phase 2 - Surface ontology migration (primitive-level)
- Goals:
  - formalize warm reflective surfaces (`base`, `elevated`, `quiet-overlay`, `interactive-soft`) and map old glass variants.
  - keep API compatibility but remap visual internals.
- Affected systems:
  - `GlassCardSurface`, `Card`, shell section surfaces.
- Regression risks:
  - transitive breakage across 20+ files.
- Validation requirements:
  - cross-route surface parity matrix.
- Rollback:
  - compatibility adapter in `GlassCardSurface` preserving old variant rendering.

## Phase 3 - Typography normalization
- Goals:
  - reduce uppercase/tracking-heavy metadata headers.
  - normalize weight scale for long reflective reading and mobile legibility.
- Affected systems:
  - `summary.module.css`, `direction.module.css`, `HighlightsPanel.module.css`, landing/guide metadata labels.
- Regression risks:
  - perceived information loss in micro-labels.
- Validation requirements:
  - reading comfort checks on long text blocks and section scanability.
- Rollback:
  - scoped typography utility fallback classes.

## Phase 4 - Motion primitive replacement
- Goals:
  - replace scale/lift/glow-driven hover defaults with calm intent cues.
  - normalize transition timings and remove dramatic animation signatures from reflective space.
- Affected systems:
  - tile modules, `GlassCardSurface` interactive mode, `WorkCard`, toolbar/button hover states.
- Regression risks:
  - reduced affordance discoverability.
- Validation requirements:
  - keyboard/focus parity + hover discoverability test.
- Rollback:
  - motion profile flag (`legacy` vs `reflective-calm`).

## Phase 5 - Atmospheric/background simplification
- Goals:
  - make atmosphere supportive and non-dominant.
  - remove dormant cosmic/fractal inheritance and ambiguous imports.
- Affected systems:
  - `app/layout.tsx`, `BackgroundImageLayer`, atmosphere-related CSS vars.
- Regression risks:
  - perceived “flatness” if simplified too aggressively.
- Validation requirements:
  - ambient continuity checks against calmness criteria.
- Rollback:
  - controlled fallback to prior background map/opacity profile.

## Phase 6 - Shared primitive redesign adoption
- Goals:
  - migrate `Shell`, buttons, pills, overlays, loading surfaces to hardened primitives/tokens.
  - consolidate repeated route-local toolbar/panel patterns into shared utilities.
- Affected systems:
  - `Shell`, `FullScreenLoadingOverlay`, common filter/toolbar pattern components.
- Regression risks:
  - cross-route layout regressions, mobile safe-area edge cases.
- Validation requirements:
  - route shell contract tests + mobile keyboard/safe-area checks.
- Rollback:
  - keep route-local fallback styles behind conditional class switch.

## Phase 7 - Reflective Space shell implementation
- Goals:
  - make shell/layer posture explicit: orientation layer, deep reflection layer, continuity/support layer.
  - centralize attention-layer orchestration in the flow shell.
- Affected systems:
  - `FlowShellClient`, flow layout modules, left/right panel layering logic.
- Regression risks:
  - state posture mismatch between routes.
- Validation requirements:
  - posture parity checks per state (`frame`, `direction`, `work`, `summary`, `highlights`).
- Rollback:
  - dual-shell compatibility mode during transition.

## Phase 8 - Route-level migration (posture-driven, not independent redesign)
- Goals:
  - migrate reflective routes in architecture order, not visual preference order.
  - remove route-local styling forks that duplicate primitives.
- Recommended order:
  1. `frame`
  2. `direction`
  3. `work`
  4. `highlights`
  5. `summary`
  6. supporting routes (`new`, `archive`, `glossary`, `evening`, `landing`).
- Regression risks:
  - route-level divergence if done out of order.
- Validation requirements:
  - parity and calmness gate at each route completion.
- Rollback:
  - route-level feature flag fallbacks to previous surface/motion profile.

---

## 6. Reflective Space migration strategy

### Migration principle
- Treat current route set as posture states of one reflective shell, not standalone page designs.

### State/layer mapping
- `frame`:
  - target role: orientation-entry state.
  - primary layer: orientation.
  - secondary layer: minimal continuity context.
- `direction`:
  - target role: orientation-selection state.
  - primary layer: orientation decision surface.
  - secondary layer: optional filtering support.
- `work`:
  - target role: deep reflection state.
  - primary layer: deep reflection card center.
  - secondary layer: raw dream continuity panel and low-pressure support actions.
- `highlights`:
  - target role: support/annotation layer attached to work and summary.
  - should not become a primary attention center.
- `summary`:
  - target role: re-entry and continuity synthesis state.
  - orientation + continuity recap posture, with optional deep links.

### What becomes shell states
- `frame`, `direction`, `work`, `summary` become explicit shell postures.
- `highlights` remains a support layer/state that can be entered without taking over primary reflective center.

### What remains technical routes
- modal/parallel route entries and API ownership routes remain technical transport, not visual ownership centers.

### Anti-pattern to avoid
- redesigning each route with its own visual language, filter controls, motion grammar, and overlay logic.

---

## 7. Visual system migration strategy

### From old paradigm
- glassmorphism-heavy mixed overlays
- floating premium cards with scale hover
- cinematic gradients and blur-heavy veils
- dashboard-like filter/tool clusters
- performative loading/atmospheric signals.

### Toward warm reflective instrument
- Surfaces:
  - matte-first, low-gloss, subdued elevation.
  - limit blur to functional overlays only.
- Typography:
  - text-first hierarchy for reflective reading.
  - metadata labels softened (less uppercase/tracking saturation).
- Spacing and density:
  - increase breathable vertical rhythm in reflective states.
  - enforce density budget per posture.
- Motion:
  - transitions communicate continuity, not excitement.
  - remove hover scale as default card behavior.
- Overlays:
  - reduce visual drama; prioritize clarity and calm context.
- Continuity visualization:
  - subtle context ribbons/sections, never control-dense dashboards.
- Atmosphere:
  - ambient support, low-frequency/no dominance, no neon/cosmic authority cues.

---

## 8. Mobile migration strategy

### Current mobile pressure points
- floating/fixed toolbars in `direction`, `summary`, `evening`.
- multiple sticky/fixed action zones competing with keyboard and content.
- mixed safe-area patterns between globals and route-local overrides.

### Migration strategy
- Define one mobile interaction pattern per posture:
  - orientation posture: bottom actions compact and dismissible.
  - deep reflection posture: writing surface first, controls secondary and calm.
  - re-entry posture: section navigation lightweight, non-floating by default.
- Consolidate safe-area handling into shared shell utilities.
- Reduce fixed overlays while keyboard is active.
- Ensure thumb-zone action placement supports pause/return, not “continue now” pressure.

### Desktop vs mobile pacing difference
- Mobile requires stricter control minimalism and stronger writing-focus prioritization.
- Desktop can sustain side-context layers, but must preserve single visual center.

---

## 9. Regression risk analysis

### Fragile systems
- `GlassCardSurface` transitive impact across reflective and auxiliary routes.
- `FlowShellClient` two-panel posture switching and mobile panel toggles.
- `summary` + `direction` duplicated toolbar/panel models.
- inline style-jsx overrides with implicit token assumptions.

### High-likelihood failure patterns
- Token fallback regressions from undefined `--glass-*` / `--panel-*` vars.
- Restored dashboard feel via unresolved dense control clusters.
- Motion regressions where legacy hover scale/lift persists in selective routes.
- Overlay stacking conflicts (fixed toolbar + modal + loading overlay).
- Mobile safe-area/keyboard clipping after shared-shell changes.
- Visual drift between `summary` and flow routes due duplicated title-edit and panel styles.

### Performance risks
- background animation/blur stacking
- multiple overlay blur layers on mobile
- excessive style duplication preventing predictable optimization.

### State persistence risks
- posture transitions between frame/direction/work/summary with inconsistent shell assumptions.

---

## 10. Validation strategy

### Reflective pacing checks
- Each posture keeps one dominant reflective center.
- No visual urgency escalation after core actions.

### Calmness checks
- No compulsory-feeling CTA clusters.
- Loading and overlays remain quiet, informative, and non-dramatic.

### Density checks
- Cap simultaneous interactive clusters per viewport.
- Verify support layers do not outcompete primary reflection content.

### Emotional pressure checks
- Remove or downgrade:
  - aggressive hover scale/lift
  - neon-like glow
  - cinematic overlay dramatization
  - productivity dashboard signaling.

### Mobile reflective ergonomics checks
- keyboard-safe writing and action access
- safe-area correctness
- thumb-zone-friendly low-pressure actions
- no fixed-control clutter in deep reflection.

### Continuity readability checks
- orientation context and re-entry summaries remain legible and non-instructional.

### Silence legitimacy checks
- pause/exit/defer paths are equally visible and visually non-penalized.

### Gate criteria before full rollout
- primitive parity passed across core reflective routes.
- posture parity passed for `frame`, `direction`, `work`, `summary`, `highlights`.
- mobile and desktop calmness checks passed.
- rollback path validated per phase.

