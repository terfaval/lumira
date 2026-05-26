# Lumira Homepage Orientation Technical Gaps v1

## Status

Companion implementation-gap document for `lumira-homepage-orientation-composition-contract-v1`.

Purpose:
- identify concrete implementation gaps between current homepage and contract target
- expose missing routes, selectors, payloads, and behavior contracts
- define readiness gates before homepage implementation

This document is:
- implementation-oriented
- coordinator-facing
- explicit about blockers and dependencies

This document is NOT:
- implementation code
- route build ticket
- API migration script

---

## 1) Scope and Inputs

Primary contract:
- `docs/runtime/lumira-homepage-orientation-composition-contract-v1.md`

Current implementation context inspected:
- `app/page.tsx`
- `src/ui/reflective-space/reflective-space-workspace.tsx`
- `src/ui/reflective-space/reflective-space-workspace.module.css`
- `app/api/glossary/terms/route.ts`
- `app/api/reflective-objects/route.ts`
- `src/domain/glossary/contracts.ts`
- `src/domain/reflective-objects/contracts.ts`
- `src/infrastructure/supabase/repositories/glossary-supabase-repository.ts`
- `src/infrastructure/supabase/repositories/reflective-object-supabase-repository.ts`

Related authority:
- `docs/runtime/lumira-reflective-focus-state-contract-v1.md`
- `docs/runtime/lumira-reflective-center-selection-contract-v1.md`
- `docs/canon/lumira-reflective-space-ia-v0.md`
- `docs/canon/Lumira_Interaction_Principles_v0.md`
- `docs/canon/LUMIRA-CONSTITUTION-v1.md`

---

## 2) Gap Summary

Current state:
- homepage (`/`) currently renders a broad reflective-space workspace shell
- homepage is not yet the required two-row Orientation Hub composition
- API/data foundations exist partially, but homepage-specific preview contract is missing

High-impact unresolved classes:
1. missing navigation routes for required panels
2. missing homepage preview payload contract
3. missing selectors/filters for fixed dream preview behavior
4. missing fallback hierarchy contract for dream summaries
5. missing mobile and responsive composition decisions
6. missing one-level-back mapping for homepage-origin transitions

---

## 3) Missing Routes

### Gap R1: Capture entry route (missing)
- Missing: dedicated Capture Mode entry route for panel navigation.
- Current: creation form is embedded directly in workspace panel on `/`.
- Risk: cannot preserve "capture as primary entry" interaction contract.

### Gap R2: Glossary page route (missing)
- Missing: user-facing glossary page route.
- Current: glossary API exists (`/api/glossary/terms`) but no page route.
- Risk: glossary panel cannot resolve to canonical destination.

### Gap R3: Dream Journal page route (missing)
- Missing: user-facing dream journal route.
- Current: no route under `app/**` for journal archive UI.
- Risk: central revisitation surface has no destination.

### Gap R4: Sleep / Dream Technique Guide route (missing or placeholder undefined)
- Missing: defined page route or canonical placeholder route.
- Current: no guide route present in app router.
- Risk: guide panel click behavior undefined.

### Gap R5: Dream/Object orientation detail routes (missing)
- Missing: item-level orientation/summary page routes for dream and reflective object clicks.
- Current: object changes are local state changes inside one page.
- Risk: item clicks cannot satisfy contract-level navigation behavior.

---

## 4) Missing Data Selectors

### Gap D1: Dream-only preview selector (missing)
- Missing: selector/query for latest dreams only.
- Current: `listByUser(userId, limit?)` returns all reflective object types.
- Required for contract: Dream Journal must show exactly 3 latest `objectType = dream` items.

### Gap D2: Homepage-level "latest active reflective objects" selector contract (partial)
- Existing base: `listByUser` returns created-desc active objects.
- Missing: explicit homepage selector contract for stable preview sorting and archival fallback behavior.

### Gap D3: Glossary preview selector exposure at API boundary (partial)
- Existing base: repository supports `listTerms(userId, limit?)`.
- Missing: explicit query/endpoint contract that enforces exact homepage preview count (5) and stable descriptor fields.

---

## 5) Missing Preview Payload Contracts

### Gap P1: Orientation homepage aggregate payload (missing)
- Missing: single read model for homepage composition with five panel payloads.
- Current: `/api/reflective-space/viewport` is broader reflective-space payload, not homepage-oriented.
- Risk: panel data assembled ad hoc in client with inconsistent rules.

### Gap P2: Dream Journal preview text fallback contract (missing)
- Missing: deterministic fallback order for row subtitle text.
- Needed order (candidate): short AI summary -> observation summary -> truncated excerpt.
- Risk: inconsistent or empty preview rows.

### Gap P3: Glossary descriptor contract (missing)
- Missing: clear rule for secondary descriptor (`notes`, derived descriptor, or none).
- Risk: visual inconsistency and accidental overlong text.

### Gap P4: Timestamp presentation contract (missing)
- Missing: uniform timestamp field + formatting source for Recent Objects and Dream Journal rows.
- Risk: mixed date semantics (`createdAt` vs `updatedAt`) and readability drift.

---

## 6) Missing UI Primitives and Composition Behaviors

### Gap U1: Two-row fixed composition primitive (missing)
- Missing: canonical layout primitive for row-1 (2:1) and row-2 (1:2:1) structure.
- Current: responsive 12-column panel grid with many equal panels.
- Risk: dashboard-like equal-weight rendering.

### Gap U2: Panel-gravity styling rules (missing)
- Missing: enforceable visual hierarchy system for Capture > Glossary > Dream Journal > Recent/Guide.
- Current: similar surface treatment across many panels.
- Risk: no clear entry gravity.

### Gap U3: Clickable panel shell contract (missing)
- Missing: panel-level interaction pattern (whole panel click + footer action semantics).
- Current: interaction is control-level and list-level inside broad workspace panels.
- Risk: inconsistent entry affordance.

### Gap U4: Active Threads exclusion rule at homepage level (missing)
- Missing: explicit homepage component guard preventing standalone active-thread panel insertion.
- Risk: future regressions toward inbox/task framing.

---

## 7) Missing Responsive/Mobile Decisions

### Gap M1: Mobile mapping for desktop two-row composition (missing)
- Missing: approved mobile order, collapse behavior, and priority preservation rules.
- Risk: mobile ends up as arbitrary stacked dashboard list.

### Gap M2: "No-scroll" desktop acceptance baseline (missing)
- Missing: canonical viewport baseline and overflow strategy.
- Risk: conflicting implementation interpretations.

### Gap M3: Panel truncation strategy for smaller desktops (missing)
- Missing: text truncation + row clipping behavior when viewport is constrained.
- Risk: accidental scroll or density overload.

---

## 8) Missing Fallback Rules

### Gap F1: Empty glossary fallback contract (missing)
- Missing: copy and behavior when fewer than 5 terms exist.
- Risk: blank or awkward sparse panel behavior.

### Gap F2: Empty dream journal fallback contract (missing)
- Missing: copy and CTA when zero dreams exist.
- Risk: panel undermines homepage calm entry intent.

### Gap F3: Missing-guide-route fallback contract (missing)
- Missing: explicit placeholder destination + non-error handling.
- Risk: dead navigation path.

### Gap F4: Missing summary fallback hierarchy (missing)
- Missing: exact fallback source when AI summary absent.
- Risk: null data or inconsistent excerpt logic.

---

## 9) Missing Navigation Contracts

### Gap N1: One-level-back mapping from homepage-origin transitions (missing)
- Missing: explicit return semantics for navigating homepage -> panel destination -> item detail.
- Risk: back behavior resets to unrelated contexts.

### Gap N2: Item-level destination resolution (missing)
- Missing: canonical route resolver for dream item and object item clicks.
- Risk: item clicks remain local state toggles instead of navigation.

### Gap N3: Cross-panel route naming consistency (missing)
- Missing: final route naming map for capture/glossary/journal/guide/object orientation.
- Risk: divergent route conventions across implementation tickets.

---

## 10) Implementation Blockers

Blocking before implementation can start safely:
1. Route map decision for all five panel destinations.
2. Homepage preview aggregate payload contract.
3. Dream-only selector and summary fallback contract.
4. Responsive/mobile composition decision.
5. Back-navigation return contract alignment with focus-state rules.

---

## 11) Dependency-Ordered Tracks

### Track A (P0): Route and navigation foundation
1. Define homepage destination route map.
2. Define item-detail orientation route patterns.
3. Define one-level-back return mapping.

### Track B (P0): Data and payload foundation
1. Define homepage aggregate read model.
2. Define dream-only selector.
3. Define fixed preview count enforcement at payload layer.
4. Define summary and descriptor fallbacks.

### Track C (P1): Composition primitives
1. Implement two-row composition primitive.
2. Implement panel hierarchy and gravity system.
3. Implement panel click-shell interaction pattern.
4. Add anti-thread-panel guard.

### Track D (P1): Responsive and fallback hardening
1. Mobile composition mapping.
2. Desktop no-scroll baseline and overflow policy.
3. Empty-state and missing-route fallback behavior.

---

## 12) Readiness Gates

Do not begin homepage implementation until:
- all required routes are decided (implemented or explicit placeholders)
- homepage payload contract is approved
- fixed preview count logic is contract-enforced
- dream summary fallback chain is approved
- one-level-back contract mapping is approved

Do not ship homepage orientation v1 until:
- desktop no-scroll baseline is validated
- mobile behavior is explicitly reviewed
- anti-pattern checklist from composition contract passes

---

## 13) Final Principle

Homepage Orientation implementation is safe only when route clarity, fixed preview contracts, calm hierarchy, and fallback/navigation behavior are all explicit and testable.
