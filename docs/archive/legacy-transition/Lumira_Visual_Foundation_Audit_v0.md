# Lumira Visual Foundation Audit v0

## Scope

Audit date: 2026-05-21  
Repository scope: active UI styling system (global CSS, module CSS, inline style systems, shared visual primitives, mounted and unmounted visual layers).  
Method: static code audit only. No redesign or component migration performed.

---

## 1. Executive Summary

Current identity assessment:
- The active system is a hybrid of reflective UI intent and legacy cinematic-glass product styling.
- Core reflective qualities are present in copy rhythm, reading line-length, and safe-area handling.
- Visual substrate still leans toward dark atmospheric glass surfaces with premium-product motion cues.

Main conflicts with the target "warm reflective instrument":
- Glass dominance: blur + gloss + grain + glow logic remains the default surface language.
- Atmospheric dominance: animated gradient/fog overlays still push cinematic mood over text calm.
- Interaction emphasis: hover lift/scale and strong overlay shadows signal product activity over quiet reflection.
- Label pressure: repeated uppercase micro-headlines and badge-heavy controls increase cognitive framing load.

Highest-risk legacy systems:
- `GlassCardSurface` as the de facto universal primitive, including hover glow presets and blur-saturate variants.
- Evening/overlay visual grammar: dark scrims, blur layers, heavy drop shadows, animated flip shells.
- Legacy atmospheric stack artifacts: cosmic/fractal modules still in codebase and partially wired.
- Token drift: multiple undefined CSS variables used directly (`--bg`, `--border`, `--card-border`, `--card-inner`, etc.).

Recommended migration order:
1. Token contract hardening (define/remove undefined variables, formalize semantic token sets).
2. Surface ontology consolidation (reduce glass variants, create calmer matte/text-first base).
3. Motion reduction pass (remove scale/lift and high-contrast overlay theatrics from default interactions).
4. Typography/label density softening (uppercase reduction, quieter metadata rhythm).
5. Atmospheric system simplification (background as subtle context, not active cinematic layer).
6. Legacy cleanup (unmounted cosmic/fractal systems, unused split layout primitives, duplicated overlay styles).

---

## 2. Active Styling Architecture Map

Global styling foundation:
- `app/globals.css`
- Defines base tokens, day/night token sets, primitives (`.shell`, `.card`, `.btn`, `.pill`, `.glass-card`, `.modal-overlay`, split layout classes).
- Also includes many route-level utility classes and animation primitives.

Theme/runtime drivers:
- `components/NapszakInitializer.tsx`
- Sets `data-napszak` and optional `data-space` on `body`.
- `FORCE_DEFAULT_THEME = true`, so runtime is effectively fixed to `default` theme branch.

Root visual composition:
- `app/layout.tsx`
- Mounts `NapszakInitializer` and `BackgroundLayerGate`.
- Imports `CosmicNeonLayerGate` and `FractalLayerGate` but does not render them.

Background/atmosphere stack:
- Active: `components/BackgroundLayerGate.tsx` -> `components/BackgroundImageLayer.tsx`.
- Inactive/legacy present: `components/CosmicLayerGate.tsx`, `components/CosmicNeonLayerGate.tsx`, `components/FractalLayerGate.tsx`, `components/FractalBackground.tsx`.

Primary reusable surface primitives:
- `components/GlassCardSurface/GlassCardSurface.tsx`
- `components/GlassCardSurface/GlassCardSurface.module.css`
- `components/Card.tsx` wrapper on `GlassCardSurface`.
- `components/PrimaryButton.tsx` wrapper on global `.btn` classes.
- `components/Pill.tsx` wrapper on global `.pill` classes.

Shared shell/navigation surfaces:
- `components/Shell.tsx`
- `components/SidebarDrawer.tsx` (inline `styled-jsx`, drawer overlay + sheet + nav cards).
- `components/FullScreenLoadingOverlay.tsx`
- `components/LumiraLoader/LumiraLoader.tsx`

Route-specific style modules (active imports):
- `components/landing/LandingPage.module.css` (also used by `EveningPreview` and `AboutSubpagePanels`).
- `app/session/[id]/summary/summary.module.css`
- `app/session/[id]/(flow)/direction/direction.module.css`
- `app/session/[id]/(flow)/layout.module.css`
- `app/session/[id]/(flow)/FlowLeftPanel.module.css`
- `app/session/[id]/(flow)/highlights/highlights.module.css`
- `app/dreamspace/guide/page.module.css`
- `components/DirectionTile.module.css`
- `components/EveningCardTile.module.css`
- `components/EveningCardFlip.module.css`
- `components/DreamRawPanel.module.css`
- `components/HighlightsPanel.module.css`

Route-specific styling via inline `styled-jsx` and inline style objects:
- High usage in `app/evening/page.tsx`, `components/landing/EveningPreview.tsx`, `components/WorkCard.tsx`, `components/SidebarDrawer.tsx`, `components/LumiraLoader/LumiraLoader.tsx`, `components/FullScreenLoadingOverlay.tsx`.

Dependency relationships (critical):
- `RootLayout` -> `globals.css` + `BackgroundLayerGate`.
- `Shell` is the structural root for most authenticated routes.
- `GlassCardSurface` is the dominant surface primitive across landing, flow, summary, glossary, archive, admin, auth, and cards.
- Direction/work/evening routes layer local styles on top of global token classes (`.btn`, `.pill`, `.stack`) and `GlassCardSurface`.

---

## 3. Token Audit

### Colors
Legacy remnants:
- Strong cool-dark palette baseline (`--bg-root #0C1019`, cyan/teal accents) reinforces cinematic night mood.
- Many surfaces rely on translucent white overlays (`#FFFFFF05`..`#FFFFFF1A`), tied to glass logic.

Reusable foundations:
- Semantic intent/phase token families are already well-structured.
- Text hierarchy tokens (`--text-primary`, `--text-muted`) are consistently reused.

Direction:
- Keep semantic intent tokens.
- Introduce warm-neutral base palette variants for reflective reading surfaces.
- Reduce white-overlay dependence as primary surface differentiator.

### Shadows
Legacy remnants:
- Frequent heavy shadows (`0 24px 90px`, `0 18px 44px`, accent shadows at ~45% alpha).
- Premium-product depth cues on cards, overlays, drawers.

Reusable foundations:
- Global `--shadow-soft` and `--shadow-accent` abstractions exist.

Direction:
- Rebalance toward softer, lower-contrast shadow steps.
- Restrict deep shadows to true modal depth only.

### Blur
Legacy remnants:
- Widespread `backdrop-filter: blur(6px..18px)` in overlays, cards, panels.
- Loader and atmosphere also use blur effects.

Reusable foundations:
- Blur usage is centralized enough to audit by primitive/components.

Direction:
- Treat blur as exception, not base material.
- Prioritize matte/opaque readability-first surfaces.

### Gradients
Legacy remnants:
- Multiple cinematic radial and linear gradients in backgrounds and overlays.
- Gradient-heavy card papers and scrims are common.

Reusable foundations:
- Gradient stop controls in `GlassCardSurface` are configurable.

Direction:
- Keep very subtle atmospheric gradients only at background level.
- Remove cinematic gradient contrast from functional reading surfaces.

### Spacing
Legacy remnants:
- None critical; spacing system is stable.

Reusable foundations:
- Coherent spacing scale (`--space-1..5`) used broadly.

Direction:
- Keep and extend with comfortable reading presets for long-text sections.

### Typography
Legacy remnants:
- Uppercase metadata heads + wide letter spacing repeated in key reflective routes.
- Brand/hero stylization uses strong tracking and display feel.

Reusable foundations:
- `Space Grotesk` + `Geist` stack supports modern text clarity.

Direction:
- Shift to calmer heading rhythm, fewer uppercase labels, reduced tracking in utility labels.

### Motion
Legacy remnants:
- Frequent hover lifts/scales (`scale(1.02-1.045)`), overlay grow transitions, continuous loader/cosmic animations.

Reusable foundations:
- Motion is mostly declarative and discoverable (`@keyframes`, transitions in modules/components).

Direction:
- Convert default interaction motion to low-amplitude opacity/color transitions.
- Reserve transform motion for explicit high-signal interactions.

### Borders + Radius
Legacy remnants:
- Border language often tied to glass badges/pills and glossy cards.

Reusable foundations:
- Radius values are consistent (12, 14, 18, pill).

Direction:
- Keep radius system; repurpose borders toward quiet separators and tactile matte cues.

### Overlays + Opacity
Legacy remnants:
- Repeated dark scrims and blur overlays create “cinematic interruption” feel.

Reusable foundations:
- Overlay patterns are reusable and can be normalized.

Direction:
- Introduce a calmer overlay contract (lower contrast, less blur, clearer text priority).

### Token contract integrity finding
- Multiple variables are used but not defined in audited sources: `--bg`, `--border`, `--card-border`, `--card-inner`.
- Several “glass/panel/overlay” tokens rely on fallback chains and are not globally formalized.

Recommendation:
- Create explicit token registry for active primitives and deprecate unowned tokens.

---

## 4. Surface Inventory (Surface Ontology)

1. Glass card surfaces (`GlassCardSurface` variants hero/soft/flat)
- Current usage: near-universal (landing, flow, work, direction, summary, glossary, admin, auth).
- Behavior: blur/saturate, gloss, grain, hover glow/lift.
- Emotional effect: premium/cinematic, active, “product card” feel.
- Reflective alignment: partial conflict.
- Recommendation: Refactor (keep primitive, redefine defaults toward matte/text-first quiet surfaces).

2. Matte wells (`GlassCardMatte`)
- Usage: inputs and inner containers.
- Behavior: subdued inset treatment.
- Effect: calmer than glass; useful tactile affordance.
- Alignment: strong.
- Recommendation: Keep and expand as primary interactive substrate.

3. Global cards/surface-layer (`.card`, `.surface-layer`, `.glass-card`)
- Usage: shell and utility content blocks.
- Behavior: mixed opaque + glass.
- Effect: inconsistent ontology overlap with `GlassCardSurface`.
- Alignment: mixed.
- Recommendation: Refactor into one canonical card taxonomy.

4. Overlay surfaces (modal, full-screen loading, direction/evening flip overlays)
- Usage: many routes.
- Behavior: dark scrim + blur + elevated card.
- Effect: high interruption intensity.
- Alignment: partial conflict for reflective pacing.
- Recommendation: Refactor (quieter overlay intensity tiers).

5. Drawer surface (`SidebarDrawer`)
- Usage: global authenticated nav.
- Behavior: heavy shadow, blur backdrop, card-like nav links.
- Effect: robust but product-like control center.
- Alignment: moderate conflict.
- Recommendation: Refactor toward calmer navigation sheet.

6. Tile surfaces (`DirectionTile`, `EveningCardTile`, `WorkCard` read mode)
- Usage: selectable cards.
- Behavior: hover scale/lift, high contrast states.
- Effect: choice stimulation and action bias.
- Alignment: conflict when overused.
- Recommendation: Refactor interaction cues to lower arousal.

7. Reading/editing panels (`DreamRawPanel`, summary text panels)
- Usage: reflective core.
- Behavior: mixed glass/blur with strong text blocks.
- Effect: good continuity but still visually “processed”.
- Alignment: moderate; can improve.
- Recommendation: Keep + refactor visual treatment.

8. Pills/chips/badges
- Usage: dense metadata and filters.
- Behavior: outlined capsules, high count in many panels.
- Effect: dashboard/filter mentality when clustered.
- Alignment: mixed.
- Recommendation: Refactor density and priority rules.

9. Legacy atmospheric veils (cosmic/fractal)
- Usage: currently unmounted in runtime layout.
- Behavior: animated aura/noise/fractal systems.
- Effect: strong cinematic/futuristic framing.
- Alignment: conflict with warm reflective target.
- Recommendation: Remove or archive explicitly.

10. Unused split surface primitive (`SplitLayout`)
- Usage: no active imports.
- Effect: dead parallel layout system.
- Recommendation: Remove after confirmation.

---

## 5. Motion Audit

Hover behavior:
- Repeated transform-based hover (`translateY`, `scale`) on cards/buttons/pills.
- Risk: encourages interaction compulsion and product/task mindset.

Transitions:
- Broad usage of 120-220ms transitions across controls and cards.
- Good baseline but often combined with shadow inflation and blur, increasing perceived urgency.

Scaling/floating effects:
- Direction/evening/work cards scale on hover.
- Flip overlays animate from origin rect with strong visual prominence.

Glow pulses / animated atmospherics:
- `LumiraLoader` has layered perpetual animations.
- Background gradient drifts continuously.
- Legacy cosmic systems include long-running aura/noise animations.

Loading overlays / route transitions:
- Full-screen loading overlays with blur and dark scrim are common.
- Emotional impact: hard context interruption, can feel like workflow gating.

Emotional pacing assessment:
- Current motion profile is closer to “active premium app” than “quiet reflective companion”.

Compulsive interaction risk:
- Elevated by repeated micro-elevations, hover scales, and conspicuous action overlays.

Recommendation:
- Adopt “calm-by-default” motion: color/opacity first, minimal transform, fewer perpetual animations.

---

## 6. Typography Audit

Heading hierarchy:
- Strong display hierarchy exists, sometimes very assertive (`font-weight` 800-900 frequently).

Uppercase usage:
- Recurrent in summary, direction, highlights, and guide labels.
- Combined with tracking (`0.04em` to `0.12em`) creates dashboard metadata tone.

Label density:
- Many concurrent labels, pills, section headers, and state badges in reflective routes.

Readability for long reflective reading:
- Positive: line-height often 1.55-1.7 in long text blocks.
- Negative: visual noise from adjacent control clusters and label redundancy.

Mobile reading ergonomics:
- Generally good safe-area and responsive handling.
- Reading calm is reduced when floating controls and sticky action bars compete visually.

Calm/warmth/cognitive softness assessment:
- Text mechanics are mostly good.
- Typography styling language still leans “signal-rich interface” over “quiet reflective instrument”.

---

## 7. Density Audit

Panel density:
- Several routes (summary, direction, evening filters, highlights) present many simultaneous controls and metadata blocks.

Simultaneous foreground elements:
- Floating toolbars + panel headers + pills + cards + overlays commonly coexist.

Visual competition:
- High in evening/direction overlays and card grids.
- Moderate in summary where reflective content competes with utility bands.

Continuity flooding risk:
- Elevated where many recommendation/filter surfaces are visible at once.

Dashboard-behavior zones:
- Evening filter toolbar and panel stacks.
- Highlights management panel and suggestion/action clusters.
- Summary statistics + toolbars + recommendation grids.

Reflective-environment zones:
- Dreamspace guide long-form cards.
- Core reflective text blocks when isolated.
- Work answer text areas with reduced surrounding controls.

Recommendation:
- Define density tiers per route/layer and cap simultaneous interactive clusters in reflective contexts.

---

## 8. Mobile Audit

Floating toolbars and bottom actions:
- Present in direction/evening flows and work actions.
- Safe-area aware but still visually assertive.

Safe-area handling:
- Strong implementation throughout (`env(safe-area-inset-*)`, `--safe-*`, viewport token strategy).

Keyboard interaction:
- Several areas consider mobile scroll/height constraints.
- Some overlays remain heavy during input contexts.

Thumb-zone ergonomics:
- Fixed bottom controls are reachable.
- Competing floating controls can crowd attention on smaller screens.

Reflective calmness on small screens:
- Reduced by high overlay contrast, blur layers, and stacked controls.

Recommendation:
- Keep safe-area architecture.
- Reduce floating control prominence and concurrent control surfaces on mobile reflective routes.

---

## 9. Legacy System Detection

Inactive/unused legacy systems:
- `components/CosmicLayerGate.tsx` and `components/CosmicLayerGate.module.css`: present, not mounted from root.
- `components/FractalLayerGate.tsx` + `components/FractalBackground.tsx`: imported in root, not rendered.
- `components/CosmicNeonLayerGate.tsx`: imported in root, not rendered.

Dead/duplicate style systems:
- `components/SplitLayout.tsx` + `components/SplitLayout.module.css`: no active consumers.
- Parallel overlay/card styles are duplicated across globals, modules, and inline `styled-jsx` in evening/preview/sidebar/work.

Legacy atmospheric signatures still present in active path:
- Active `BackgroundImageLayer` still carries animated gradient/fog cinematic language.

Cosmic/fractal/neon legacy cues:
- Cosmic and fractal files contain heavy aura/glow/noise motion logic aligned with old paradigm.
- `CosmicNeonLayerGate.module.css` animation names and keyframe names are inconsistent (`lumira-aura-drift` vs `@keyframes aura-drift`; `lumira-mist-breathe` vs `@keyframes mist-breathe`), reinforcing legacy drift.

Token hygiene issues:
- Undefined token usages (`--bg`, `--border`, `--card-border`, `--card-inner`) indicate ungoverned legacy carryover.

---

## 10. Proposed Visual Foundation Direction (No Redesign)

### Future visual philosophy
- Quietly instrumented, text-first reflective environment.
- Warm-neutral material language with low-contrast depth.
- Atmosphere should support orientation, never dominate interpretation.

### Future surface ontology
- Base surfaces: matte reading panel, matte interactive panel, transient modal panel.
- Optional accent surfaces: limited reflective highlights only where meaningfully helpful.
- Deprecate universal glass default; glass becomes exceptional, not canonical.

### Future motion philosophy
- Calm default: opacity/color/border transitions first.
- Remove habitual scale/lift from standard card interactions.
- Keep motion for orientation changes and explicit state transitions only.

### Future typography direction
- Preserve strong readability line-heights.
- Reduce uppercase labels and aggressive tracking.
- Shift from dashboard micro-labeling to conversational sectional rhythm.

### Future atmospheric direction
- Single subtle ambient background layer with constrained movement.
- Eliminate cinematic aura/noise/fractal stacks from active runtime.
- Tone should feel breathable and companion-like, not cosmic/performance-like.

### Future density philosophy
- Define reflective density budgets per route:
- Orientation layer: low control count, clear return paths.
- Deep reflection layer: text priority, minimal competing controls.
- Utility layers (filters/admin): isolated from reflective reading contexts.

### Pressure-risk calibration (explicit)
Patterns currently increasing risk:
- Emotional pressure: dark blur overlays + heavy shadows + high-contrast floating controls.
- Compulsive continuation: repeated hover scales/lifts and prominent CTA clustering.
- Synthetic significance: cinematic atmosphere and glowing/translucent premium cues.
- Reflective saturation: high simultaneous metadata/pill surfaces.
- “AI knows you” feeling: highly styled, performative insight framing surfaces.
- Workflow/task feeling: dashboard-like filter bars, chips, and card grids in reflection-adjacent routes.

Patterns currently supporting reflective values:
- Silence legitimacy: optionality language in content structure and non-forced progression controls.
- Optionality: persistent “later/close/return” affordances.
- Calm return: strong safe-area/mobile stability and consistent navigation shell.
- Reflective pacing: long-text line-height and readable text blocks.
- Attentional spaciousness: present in guide/text-first sections when control density is low.
- Rich but non-pressuring continuity: achievable with current architecture after surface/motion/density normalization.

---

## Appendix: Key File Inventory

Global and root:
- `app/globals.css`
- `app/layout.tsx`
- `components/NapszakInitializer.tsx`
- `components/BackgroundLayerGate.tsx`
- `components/BackgroundImageLayer.tsx`

Shared primitives:
- `components/GlassCardSurface/GlassCardSurface.tsx`
- `components/GlassCardSurface/GlassCardSurface.module.css`
- `components/Card.tsx`
- `components/PrimaryButton.tsx`
- `components/Pill.tsx`

Shell/navigation/overlays:
- `components/Shell.tsx`
- `components/SidebarDrawer.tsx`
- `components/FullScreenLoadingOverlay.tsx`
- `components/LumiraLoader/LumiraLoader.tsx`

Route modules and key route style code:
- `components/landing/LandingPage.module.css`
- `components/landing/LandingPage.tsx`
- `components/landing/EveningPreview.tsx`
- `app/evening/page.tsx`
- `app/session/[id]/summary/summary.module.css`
- `app/session/[id]/(flow)/direction/direction.module.css`
- `app/session/[id]/(flow)/layout.module.css`
- `app/session/[id]/(flow)/FlowLeftPanel.module.css`
- `components/DreamRawPanel.module.css`
- `components/HighlightsPanel.module.css`
- `components/DirectionTile.module.css`
- `components/EveningCardTile.module.css`
- `components/EveningCardFlip.module.css`
- `app/dreamspace/guide/page.module.css`

Legacy/dormant systems inspected:
- `components/CosmicLayerGate.tsx`
- `components/CosmicLayerGate.module.css`
- `components/CosmicNeonLayerGate.tsx`
- `components/CosmicNeonLayerGate.module.css`
- `components/FractalLayerGate.tsx`
- `components/FractalBackground.tsx`
- `components/SplitLayout.tsx`
- `components/SplitLayout.module.css`
