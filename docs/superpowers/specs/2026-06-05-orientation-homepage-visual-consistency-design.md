# Orientation + Homepage Visual Consistency Design

Date: 2026-06-05
Scope: UI polish and interaction consistency across Orientation and Homepage

## Goal

Reduce visible route drift between the Orientation page and Homepage by aligning shell/background calmness, dream-header treatment, and the hover/focus language of activatable elements.

This pass is a presentation-only refinement.

It does not change:

- runtime behavior
- payload shape
- route structure
- route composition model

## Problem Statement

The current Orientation layout is compositionally much closer to the intended direction than before, but it still exposes several route-level consistency problems:

- the shell itself reads too visibly colored compared with Homepage
- the dream panel header still carries too much local labeling weight
- the edit affordance reads differently from the rest of the product
- actionable elements do not yet share one clear hover/focus language across Orientation and Homepage

The result is not a broken UI, but a route-to-route identity mismatch.

## Required Files

- `src/ui/object-orientation/object-orientation-layer.tsx`
- `src/ui/object-orientation/object-orientation-layer.module.css`
- `src/ui/homepage/homepage-orientation-hub.module.css`
- `src/ui/object-orientation/__tests__/orientation-layer.test.tsx` only if needed for the edit affordance change

## Change Strategy

Use a small cross-route polish pass rather than a broader shared-primitive refactor.

Rationale:

- solves the immediate mismatch
- honors the new visual consistency canon
- keeps the diff localized
- avoids introducing a larger primitive redesign ticket inside a narrow adjustment pass

## Orientation Adjustments

### Shell and Background

The Orientation shell should move closer to the Homepage atmosphere.

Rules:

- the shell itself should visually recede
- avoid the feeling of a tinted app-shell block
- keep atmosphere subtle and ambient rather than panel-like
- preserve desktop no-scroll behavior and the current composition

This is not a route redesign.
It is a material/dominance correction.

### Dream Header

The dream frame keeps its internal hierarchy, but the header should be quieter.

Rules:

- remove the dream-frame panel label
- make the dream title slightly smaller
- retain strong readability and calm prominence
- keep the bounded title-bar + scrollable dream-body structure

### Edit Affordance

Replace the textual edit affordance with a pencil-icon control.

Rules:

- icon-only affordance
- visually calm
- clearly interactive on hover/focus
- consistent with the product's shared interaction language

No edit-flow behavior changes.

## Shared Hover / Focus Language

This pass should explicitly establish a shared hover/focus language across Orientation and Homepage.

Required hover/focus qualities:

- tonal shift
- border-color shift
- soft shadow change
- calm emphasis

Disallowed:

- loud lift
- scale inflation
- aggressive transform motion
- product-excitement styling

## Orientation Interactive Targets

Apply the shared hover/focus language to:

- thread-state buttons in `Szálak`
- glossary buttons
- opening surfaces / opening CTA language as appropriate
- dream edit affordance

The page should make activatable surfaces feel evidently actionable without becoming noisy.

## Homepage Interactive Targets

Apply the same interaction language to Homepage interactive surfaces so the two routes feel materially related.

Focus areas:

- interactive tiles
- tile entry overlays
- any visible click targets already used there

The goal is not to redesign Homepage.
The goal is to align the interaction grammar.

## Constraints

Do not:

- redesign Orientation composition
- redesign Homepage composition
- change route behavior
- change payload behavior
- introduce new dependencies
- start a shared-primitive extraction

Do:

- reduce shell-level visual mismatch
- quiet the dream header
- replace text edit affordance with pencil icon
- unify hover/focus language across the two routes

## Validation Plan

Review should confirm:

- Orientation shell is visually calmer and less like a colored block
- dream frame no longer shows a panel label
- dream title is slightly smaller
- edit affordance is a pencil icon
- actionable elements on Orientation have a visible but calm hover/focus treatment
- Homepage interactive elements use the same hover/focus language
- no runtime or route behavior changed

## Implementation Recommendation

Keep changes small and route-local:

- one JSX adjustment in the Orientation component
- CSS tuning in Orientation
- CSS tuning in Homepage
- only update tests if the edit affordance assertion requires it
