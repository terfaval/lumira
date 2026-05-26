# Lumira Homepage Orientation Aggregate Payload Contract v1

## Status

Canonical runtime-UX read-model contract for Homepage Orientation Hub payload assembly.

This document defines:
- payload ownership boundary
- aggregate payload shape and panel payloads
- fixed preview count and no-feed rules
- fallback and empty-state rules
- navigation target contracts
- selector/read-model requirements and readiness blockers

This document is:
- planning-level
- runtime-UX contract
- implementation-guiding

This document is NOT:
- API implementation
- schema migration
- UI component code
- route implementation ticket

---

## Ticket Protocol

### 1) Goal restatement
- Define a canonical bounded aggregate read model for homepage orientation composition.
- Ensure all five homepage panels can render from presentation-safe payload only.
- Prevent ad hoc UI aggregation, ranking, and latent exposure.
- Preserve calm, fixed-count, no-feed threshold behavior.

### 2) Touched files
- New: `docs/runtime/lumira-homepage-orientation-aggregate-payload-contract-v1.md`

### 3) Planning steps
1. Anchor payload behavior to composition and focus-state contracts.
2. Define aggregate ownership and panel-safe payload envelopes.
3. Define fixed-count, fallback, and navigation target semantics.
4. Map current selector readiness and implementation blockers.

### 4) Acceptance criteria (DoD)
- Canonical `HomepageOrientationPayload` shape is defined.
- Panel payloads for all five panels are defined.
- Fixed count and no-feed rules are explicit.
- Fallback, empty-state, and timestamp semantics are explicit.
- Navigation target fields are explicit.
- Selector requirements are categorized (available/partial/missing/unsafe).
- Implementation readiness blockers are documented.

### 5) Testing / validation plan
- Contract review against checklist in Section 15.
- No runtime/schema/UI mutation in this ticket.

### 6) Rollback
- Documentation-only rollback by reverting this file.

---

## 1) Purpose and Scope

This contract defines the canonical aggregate payload consumed by the Lumira homepage Orientation Hub.

Primary objective:

# homepage renders from one bounded, explicit, presentation-safe read model

The homepage payload must support:
- Capture panel
- Glossary preview panel
- Recent Objects preview panel
- Dream Journal preview panel
- Sleep / Dream Technique Guide preview panel

The payload must preserve:
- fixed preview limits
- calm density
- no-feed semantics
- future reflective-object extensibility

---

## 2) Payload Ownership and Assembly Boundary

Canonical ownership:
- aggregate assembly belongs to reflective-space composition/assembly boundary
- recommended location: `src/reflective-space/composition/` (or adjacent reflective-space assembler layer)

Boundary rules:
- route handlers stay thin and only parse auth + query + invoke composer
- UI consumes pre-bounded payload and never performs reflective ranking
- UI does not infer meaning from raw stores

Explicit prohibitions:
- no UI-owned cognition
- no route-owned reflective ranking logic
- no raw latent payload exposure in homepage model
- no dashboard-style ad hoc aggregation in component layer

---

## 3) Canonical Payload Shape

```ts
type HomepageOrientationPayload = {
  mode: "orientation_home";
  generatedAt: string;
  contractVersion: "v1";

  capture: HomepageCapturePanelPayload;
  glossaryPreview: HomepageGlossaryPreviewPayload;
  recentObjectsPreview: HomepageRecentObjectsPreviewPayload;
  dreamJournalPreview: HomepageDreamJournalPreviewPayload;
  guidePreview: HomepageGuidePreviewPayload;

  navigation: HomepageNavigationTargets;
  emptyStates: HomepageEmptyStateHints;

  guardrails: {
    noFeed: true;
    fixedPreviewCounts: {
      glossaryTargetSlots: 5;
      dreamJournalTargetSlots: 3;
      recentObjectsMaxSlots: 3;
    };
  };
};
```

Contract note:
- naming may evolve in implementation
- conceptual field set and semantics are stable contract requirements

---

## 4) Panel Payload Definitions

### 4.1 Capture Panel Payload

```ts
type HomepageCapturePanelPayload = {
  title: string;
  description: string;
  supportedObjectTypes: Array<"dream" | "memory" | "journal_entry" | "reflective_note">;
  defaultObjectType: "dream";
  target: HomepageNavigationTargetRef;
};
```

Content constraints:
- capture description remains entry-focused and pressure-free
- no reflective prompts
- no AI openings
- no unfinished-work framing

### 4.2 Glossary Preview Payload

```ts
type HomepageGlossaryPreviewPayload = {
  title: string;
  targetSlots: 5;
  items: HomepageGlossaryPreviewItem[];
  hasMore: boolean;
};

type HomepageGlossaryPreviewItem = {
  termId: string;
  label: string;
  descriptor: string | null;
  markerKey: string | null;
  target: HomepageNavigationTargetRef;
};
```

Descriptor fallback (v1 contract):
1. short user note excerpt (`notes`) if present
2. recent association context label if safely available
3. `null` descriptor

Constraints:
- fewer than 5 items allowed for early users
- no fabricated motifs or synthetic placeholders

### 4.3 Recent Objects Preview Payload

```ts
type HomepageRecentObjectsPreviewPayload = {
  title: string;
  maxSlots: 3;
  items: HomepageRecentObjectPreviewItem[];
  hasMore: boolean;
};

type HomepageRecentObjectPreviewItem = {
  objectId: string;
  title: string;
  objectType: "dream" | "memory" | "journal_entry" | "reflective_note";
  timestamp: HomepageTimestamp;
  descriptor: string | null;
  target: HomepageNavigationTargetRef;
};
```

State handling:
- include active objects only in v1 preview
- archived objects excluded by default
- if active list empty, use calm empty-state hint instead of fallbacking to archived by default

### 4.4 Dream Journal Preview Payload

```ts
type HomepageDreamJournalPreviewPayload = {
  title: string;
  targetSlots: 3;
  items: HomepageDreamJournalPreviewItem[];
  hasMore: boolean;
};

type HomepageDreamJournalPreviewItem = {
  dreamObjectId: string;
  title: string;
  recordedAt: HomepageTimestamp;
  previewText: string;
  previewSource: "ai_summary" | "observation_summary" | "dream_excerpt" | "quiet_fallback";
  target: HomepageNavigationTargetRef;
};
```

Fallback hierarchy (v1 contract):
1. AI summary (when canonical source exists)
2. observation/orientation summary
3. truncated dream excerpt (`primaryContent`)
4. calm quiet fallback line

Constraint:
- this is a bounded threshold preview, not a journal feed or table

### 4.5 Guide Preview Payload

```ts
type HomepageGuidePreviewPayload = {
  title: string;
  description: string;
  topics: HomepageGuideTopicPreview[];
  target: HomepageNavigationTargetRef;
  source: "static_v1" | "dynamic";
};

type HomepageGuideTopicPreview = {
  key: string;
  label: string;
  descriptor: string | null;
};
```

Guide tone contract:
- calm companion library
- no urgency/help-center framing

---

## 5) Fixed Preview Count and No-Feed Rules

Hard rules:
- Glossary preview target slots: exactly `5`
- Dream Journal preview target slots: exactly `3`
- Recent Objects preview max slots: `3`

Behavior rules:
- fewer items than target slots are valid
- homepage panels do not expose infinite scroll
- homepage panels do not expose `load more`
- full pages own exhaustive lists

---

## 6) Empty-State and Fallback Rules

Calm empty states required for:
- no dreams yet
- no glossary terms yet
- no recent objects yet
- no summary source available
- guide route not yet implemented

Tone constraints:
- no guilt language
- no urgency language
- no completion-pressure onboarding phrases
- no productivity framing ("continue", "unfinished", "streak")

Recommended quiet fallback lines:
- dreams: "No dreams are stored yet. You can capture one whenever it feels right."
- glossary: "Glossary memory will grow as motifs return over time."
- recent objects: "No active reflective objects yet."
- summary missing: "A short preview is not available yet."
- guide missing route: "Guide space is being prepared."

---

## 7) Timestamp Semantics

Canonical timestamp envelope:

```ts
type HomepageTimestamp = {
  iso: string;
  semantic: "created_at" | "recorded_at" | "updated_at";
};
```

Semantics by panel:
- Recent Objects: default `created_at`
- Dream Journal: default `recorded_at` if available, otherwise `created_at`
- Glossary items: no visible timestamp required in v1 preview rows

Rule:
- UI formats timestamp presentation
- payload must provide canonical ISO timestamp + semantic meaning

---

## 8) Navigation Target Fields

```ts
type HomepageNavigationTargetRef = {
  targetKey:
    | "capture_home"
    | "glossary_home"
    | "dream_journal_home"
    | "guide_home"
    | "glossary_term_detail"
    | "dream_orientation"
    | "reflective_object_orientation";
  href: string;
  routeStatus: "implemented" | "placeholder" | "missing";
};

type HomepageNavigationTargets = {
  capture: HomepageNavigationTargetRef;
  glossary: HomepageNavigationTargetRef;
  dreamJournal: HomepageNavigationTargetRef;
  guide: HomepageNavigationTargetRef;
};
```

Contract rule:
- if route does not yet exist, mark `routeStatus` explicitly
- do not invent hidden route behavior in UI layer

---

## 9) Data Source and Selector Requirements

### 9.1 Selector Inventory

1. latest glossary terms selector
2. latest active reflective objects selector
3. latest dream-only selector
4. dream preview summary selector/fallback resolver
5. guide preview source selector
6. homepage orientation aggregate assembler

### 9.2 Current Readiness Status

`already available`
- `ReflectiveObjectRepository.listByUser(userId, limit?)` with active filtering and created-desc ordering
- `GlossaryRepository.listTerms(userId, limit?)` with active filtering and created-desc ordering
- thin route composition pattern (`app/api/reflective-space/viewport/route.ts` delegates to compose layer)

`partially available`
- homepage-like bounded composition approach exists in `compose-reflective-space-viewport.ts`, but model is reflective-space viewport, not homepage-oriented aggregate
- observation summary source exists (`Observation.summary`) for fallback chain stage 2
- dream typing exists at domain level (`DreamRepository` contract, `DreamObject` type) but not canonical selector integration at homepage layer

`missing`
- dream-only latest selector with fixed 3-slot contract
- dedicated homepage aggregate assembler and payload type
- explicit glossary descriptor resolver (notes -> association context -> null)
- canonical guide preview source/contract (static v1 or route-backed)
- canonical navigation target registry for homepage panel + item targets

`unsafe to use directly`
- raw latent suggestions/snapshots for homepage preview text or ranking
- client-side ranking by "importance" from mixed reflective surfaces
- direct viewport payload reuse without homepage-specific guardrails

---

## 10) Anti-Patterns

Prohibited:
- UI assembling meaning from latent/internal structures
- client-side reflective ranking of panel items
- homepage as dashboard
- homepage as feed
- homepage as inbox
- task/progress language
- Active Threads queue insertion as standalone panel
- AI insight panel on homepage v1
- metrics/charts/streak/progress widgets

---

## 11) Implementation Readiness and Blockers

Blockers before safe implementation:
1. Route map decision for capture/glossary/journal/guide/object/dream targets.
2. Homepage aggregate assembler contract and payload type placement.
3. Dream-only selector contract with fixed 3-slot behavior.
4. Preview summary fallback resolver contract and source precedence.
5. Empty-state copy set and tone contract finalization.
6. Navigation target registry with `routeStatus` semantics.
7. Responsive assumptions aligned with no-scroll desktop composition rules.

Readiness gate:
- implementation starts only when selector contracts + navigation targets + fallback contract are approved together.

---

## 12) Open Implementation Questions

1. Should dream summary stage-1 (`ai_summary`) be sourced from a dedicated summary store or composed observation artifact?
2. Should guide topics remain static config in v1 or come from a lightweight content source?
3. Should `hasMore` be present on all panels even when no homepage `load more` action exists?
4. Should navigation targets be centralized in domain contracts or composition-layer constants?
5. Should `recorded_at` be introduced as separate dream timestamp in domain model, or alias `created_at` in v1?
6. Should archived reflective objects become an optional fallback mode only when explicitly requested by user?

---

## 13) Dependency Notes

This contract depends on:
- `docs/runtime/lumira-homepage-orientation-composition-contract-v1.md`
- `docs/runtime/lumira-homepage-orientation-technical-gaps-v1.md`
- `docs/runtime/lumira-reflective-focus-state-contract-v1.md`
- `docs/runtime/lumira-reflective-center-selection-contract-v1.md`

Related canon constraints:
- `docs/canon/lumira-reflective-space-ia-v0.md`
- `docs/canon/Lumira_Interaction_Principles_v0.md`
- `docs/canon/lumira-shared-primitive-redesign-v1.md`
- `docs/canon/lumira-visual-system-philosophy-v1.md`
- `docs/canon/LUMIRA-CONSTITUTION-v1.md`

---

## 14) Final Principle

Aggregate payload contract succeeds when homepage orientation can render as a calm reflective threshold from a bounded explicit read model, without UI-owned meaning, ranking, or pressure.

---

## 15) Validation Checklist

Review must verify:
- payload supports all five homepage panels
- preview counts match composition contract
- UI does not need to invent ranking or meaning
- raw latent is not exposed
- empty states remain calm
- navigation targets are explicit and route status is declared
- missing dependencies are documented
- payload supports no-scroll and no-feed homepage behavior
- future reflective object types remain supported without payload redesign
