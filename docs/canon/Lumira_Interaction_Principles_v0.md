# Lumira Interaction Principles v0

## 1. Purpose

This document defines Lumira's interaction philosophy as a stable product-level north star.
It sets experiential and behavioral guardrails for design and implementation decisions.
It is intentionally not a component spec, token system, or implementation guide.

## 2. Core experiential principles

- Lumira is a contemplative dream instrument, not a productivity tool.
- Dream capture alone is a complete and successful session.
- Depth is optional and invited, never forced.
- The product should feel calm, clear, and emotionally safe.
- The system should support reflection, not performance.

## 3. Writing-first philosophy

- Writing is the primary interaction in Lumira.
- Every supporting UI element must protect, frame, or continue writing.
- Writing surfaces should receive the strongest spatial, visual, and attentional priority.
- Secondary controls should stay quiet and out of the way during capture and reflection.
- If a design competes with writing, it is misaligned.

## 4. Attention and pacing

- One focus at a time.
- The interface should pace users gently through states, not present many equal-priority choices at once.
- Optional layers should appear progressively and remain dismissible.
- The interaction rhythm should support contemplation, pauses, and re-entry.
- Avoid urgency cues, pressure patterns, and attention traps.

## 5. Interface behavior principles

- Prefer clear state transitions over continuous chat-like flow.
- Preserve low-friction entry to capture at all times.
- Keep interactions legible with minimal cognitive overhead.
- Use signals for orientation and continuity, not for persuasion.
- Favor reversible, non-destructive actions and calm defaults.

## 6. Surface hierarchy philosophy

- Primary surface: active writing or reading task.
- Secondary surface: current step context and lightweight controls.
- Tertiary surface: optional tools, metadata, and supporting references.
- Reduce panel competition and avoid equal visual weight across unrelated surfaces.
- The hierarchy should consistently answer: "What should I do now?"

## 7. Motion philosophy

- Motion should feel like stabilization, focus, settling, and resonance.
- Use restrained transitions to support orientation between states.
- Keep movement subtle, purposeful, and low-amplitude.
- Avoid flashy responsiveness, decorative choreography, and aggressive hover scaling.
- Motion should reduce cognitive load, not increase it.

## 8. Atmospheric/background philosophy

- Atmosphere is peripheral support, not central expression.
- Backgrounds should reinforce calm tone and readability.
- Visual atmosphere must never dominate writing surfaces or primary actions.
- Avoid cinematic spectacle and strong fantasy identity in core flow.
- Treat atmosphere as context, not content.

## 9. Instrument metaphor philosophy

- Lumira may feel like a modern contemplative instrument through behavior and feedback.
- Instrument quality should emerge from pacing, sensitivity, and subtle state signals.
- Use signals over spectacle: gentle indicators, continuity cues, and focus feedback.
- Do not use literal steampunk, retro machinery, fake paper skeuomorphism, or sci-fi HUD motifs.
- The metaphor should remain abstract, human, and contemporary.

## 10. Mobile and half-awake ergonomics

- Preserve immediate access to capture with minimal steps.
- Prioritize thumb comfort, readable text, and low-precision interactions.
- Avoid dense control clusters, deep nesting, and modal overload.
- Respect late-night and half-awake use with reduced glare and low-friction flows.
- Mobile should preserve the same writing-first hierarchy as desktop.

## 11. Emotional tone

- Warm, curious, contemplative, and human.
- Quietly supportive, never performative.
- Gentle confidence without authority.
- Slightly playful through responsiveness and softness, not through novelty effects.
- Consistent emotional safety across all states.

## 12. Anti-directions

Lumira should explicitly avoid:

- SaaS dashboard feeling and productivity-density layouts.
- AI-assistant dominance and chat-first interaction framing.
- Gamified card-grid energy.
- Excessive glow, blur, glass, and decorative chrome.
- Mystical or cosmic overload in core interaction flow.
- Noisy overlays, panel overload, and interaction clutter.
- Decorative motion and high-attention animation patterns.
- Luxury-meditation startup aesthetics that distance the user from writing.

## 13. Relationship to AI and non-interpretive architecture

- AI is a companion, not an authority.
- The interface must never force interpretation, conclusions, or prescribed meaning.
- UI behavior must remain aligned with traceability and canonical stores.
- The UI layer should not invent semantic meaning or fallback interpretation.
- Workflows should preserve stateful card progression and non-interpretive contracts.

## 14. Future implementation guidance

- Use this document as a decision filter for layout, component, motion, and copy tickets.
- When tradeoffs arise, prioritize: writing dominance, low cognitive load, calm pacing, and non-interpretive integrity.
- Prefer simplification over feature layering when interaction clarity degrades.
- Validate new patterns against half-awake usability and emotional safety.
- Any future visual system work should implement these principles, not redefine them.
