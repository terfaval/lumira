# Observation V2 Foundation Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a canon-first, additive Observation V2 runtime with first-class Scenes, scene-contained Observations, minimal derived structures, LLM-first extraction, and a temporary V1 projection bridge.

**Architecture:** Add a new scene-first V2 runtime beside the current fragment-first model. Keep V1 persistence and API untouched, but treat them only as projection targets from the new V2 runtime. Reuse evidence, uncertainty, semantic-policy, and provider integration infrastructure only where it supports the new Scene -> Observations -> Derived Structures flow without pulling V1 semantics back into the design center.

**Tech Stack:** TypeScript, Next.js route/domain structure, OpenAI Responses API, Vitest, repo npm scripts

---

### Task 1: Add Scene-First V2 Domain Types

**Files:**
- Create: `src/domain/observation/v2-runtime.ts`
- Test: `src/domain/observation/__tests__/v2-runtime.test.ts`
- Reference: `src/domain/observation/types.ts`
- Reference: `src/domain/observation/v2.ts`

- [ ] **Step 1: Write the failing tests for Scene, Observation, and derived-structure shape**

```ts
import { describe, expect, it } from "vitest";

import {
  buildObservationV2Bundle,
  getSceneBoundarySignalKinds,
  type ObservationV2Scene,
} from "@/src/domain/observation/v2-runtime";

describe("buildObservationV2Bundle", () => {
  it("preserves ordered scenes with scene-contained observations and derived structures", () => {
    const bundle = buildObservationV2Bundle({
      reflectiveObjectId: "object-1",
      userId: "user-1",
      source: "system_llm_extract",
      scenes: [
        {
          sceneId: "scene-1",
          position: 0,
          summary: "The dreamer follows a guide up a staircase.",
          boundaryReasoning: [],
          evidenceContext: {
            snippet: "A fiú vezetett fel a csigalépcsőn.",
            spanStart: 0,
            spanEnd: 31,
            contextLabel: "scene_opening",
          },
          observations: [
            {
              observationId: "obs-1",
              position: 0,
              text: "The dreamer follows a young male up a spiral staircase.",
              evidence: [
                {
                  snippet: "A fiú vezetett fel a csigalépcsőn.",
                  spanStart: 0,
                  spanEnd: 31,
                  contextLabel: "quoted_support",
                },
              ],
              uncertaintyNote: null,
            },
          ],
          derived: {
            actors: [{ label: "young male", observationIds: ["obs-1"] }],
            locations: [{ label: "spiral staircase", observationIds: ["obs-1"] }],
            objects: [],
            interactions: [{ label: "guidance", observationIds: ["obs-1"] }],
            affect: [],
            agency: [{ label: "following", observationIds: ["obs-1"] }],
            phenomenology: [],
            metacognition: [],
          },
        },
      ],
    });

    expect(bundle.scenes).toHaveLength(1);
    expect(bundle.scenes[0].observations[0].text).toContain("follows");
    expect(bundle.scenes[0].derived.agency[0].label).toBe("following");
  });

  it("keeps scene boundary reasoning as explicit situational signals", () => {
    const scene: ObservationV2Scene = {
      sceneId: "scene-2",
      position: 1,
      summary: "The dream shifts from guidance to unwanted intimacy.",
      boundaryReasoning: [
        { kind: "actor_change", note: "The primary interaction posture changes." },
        { kind: "narrative_change", note: "The situation breaks from guidance into pressure." },
      ],
      evidenceContext: {
        snippet: "A vezetésből kellemetlen közeledés lett.",
        spanStart: 32,
        spanEnd: 72,
        contextLabel: "scene_shift",
      },
      observations: [],
      derived: {
        actors: [],
        locations: [],
        objects: [],
        interactions: [],
        affect: [],
        agency: [],
        phenomenology: [],
        metacognition: [],
      },
    };

    expect(getSceneBoundarySignalKinds(scene)).toEqual(["actor_change", "narrative_change"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/domain/observation/__tests__/v2-runtime.test.ts`

Expected: FAIL with module-not-found or missing export errors for `v2-runtime`.

- [ ] **Step 3: Write the minimal Scene-first runtime types and helpers**

```ts
import type { ObservationSource } from "@/src/domain/observation/types";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

export type SceneBoundarySignalKind =
  | "spatial_change"
  | "temporal_change"
  | "actor_change"
  | "goal_change"
  | "narrative_change"
  | "perspective_change"
  | "world_rule_change";

export interface ObservationV2EvidenceRef {
  snippet: string;
  spanStart: number | null;
  spanEnd: number | null;
  contextLabel: string | null;
}

export interface ObservationV2BoundaryReason {
  kind: SceneBoundarySignalKind;
  note: string;
}

export interface ObservationV2Observation {
  observationId: string;
  position: number;
  text: string;
  evidence: ObservationV2EvidenceRef[];
  uncertaintyNote: string | null;
}

export interface ObservationV2DerivedItem {
  label: string;
  observationIds: string[];
}

export interface ObservationV2Scene {
  sceneId: string;
  position: number;
  summary: string;
  boundaryReasoning: ObservationV2BoundaryReason[];
  evidenceContext: ObservationV2EvidenceRef;
  observations: ObservationV2Observation[];
  derived: {
    actors: ObservationV2DerivedItem[];
    locations: ObservationV2DerivedItem[];
    objects: ObservationV2DerivedItem[];
    interactions: ObservationV2DerivedItem[];
    affect: ObservationV2DerivedItem[];
    agency: ObservationV2DerivedItem[];
    phenomenology: ObservationV2DerivedItem[];
    metacognition: ObservationV2DerivedItem[];
  };
}

export interface ObservationV2Bundle {
  reflectiveObjectId: ReflectiveObjectId;
  userId: UserId;
  source: ObservationSource;
  scenes: ObservationV2Scene[];
}

export function buildObservationV2Bundle(input: ObservationV2Bundle): ObservationV2Bundle {
  return {
    ...input,
    scenes: [...input.scenes].sort((left, right) => left.position - right.position),
  };
}

export function getSceneBoundarySignalKinds(scene: ObservationV2Scene): SceneBoundarySignalKind[] {
  return scene.boundaryReasoning.map((reason) => reason.kind);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/domain/observation/__tests__/v2-runtime.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/observation/v2-runtime.ts src/domain/observation/__tests__/v2-runtime.test.ts
git commit -m "feat: add observation v2 scene runtime types"
```

### Task 2: Add V2-to-V1 Projection Without Making V1 the Design Center

**Files:**
- Create: `src/cognition/observation/scene-discovery-projection.ts`
- Test: `src/cognition/observation/__tests__/scene-discovery-projection.test.ts`
- Reference: `src/cognition/observation/observation-discovery-projection.ts`
- Reference: `src/domain/observation/types.ts`

- [ ] **Step 1: Write the failing projection tests**

```ts
import { describe, expect, it } from "vitest";

import { projectObservationV2BundleToCreateObservationInput } from "@/src/cognition/observation/scene-discovery-projection";
import { buildObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

describe("projectObservationV2BundleToCreateObservationInput", () => {
  it("projects multi-scene observations into ordered V1 fragments without changing V2 organization", () => {
    const bundle = buildObservationV2Bundle({
      reflectiveObjectId: "object-1",
      userId: "user-1",
      source: "system_llm_extract",
      scenes: [
        {
          sceneId: "scene-1",
          position: 0,
          summary: "The dreamer follows a guide.",
          boundaryReasoning: [],
          evidenceContext: { snippet: "vezetett", spanStart: 0, spanEnd: 7, contextLabel: "scene" },
          observations: [
            {
              observationId: "obs-1",
              position: 0,
              text: "The dreamer follows a young male.",
              evidence: [{ snippet: "A fiú vezetett.", spanStart: 0, spanEnd: 16, contextLabel: "quoted_support" }],
              uncertaintyNote: null,
            },
          ],
          derived: { actors: [], locations: [], objects: [], interactions: [], affect: [], agency: [], phenomenology: [], metacognition: [] },
        },
        {
          sceneId: "scene-2",
          position: 1,
          summary: "The interaction becomes unwanted.",
          boundaryReasoning: [{ kind: "narrative_change", note: "The situation turns." }],
          evidenceContext: { snippet: "kellemetlen lett", spanStart: 17, spanEnd: 33, contextLabel: "scene" },
          observations: [
            {
              observationId: "obs-2",
              position: 0,
              text: "The interaction shifts from guidance to unwanted intimacy.",
              evidence: [{ snippet: "kellemetlen közeledés lett", spanStart: 17, spanEnd: 43, contextLabel: "quoted_support" }],
              uncertaintyNote: null,
            },
          ],
          derived: { actors: [], locations: [], objects: [], interactions: [], affect: [], agency: [], phenomenology: [], metacognition: [] },
        },
      ],
    });

    const projected = projectObservationV2BundleToCreateObservationInput(bundle, {
      provenanceTier: "system_extract",
      semanticPolicyResult: "accept_with_uncertainty",
      semanticPolicyReasons: ["scene_first_projection"],
      latentBackflowGuard: "observation_only",
      boundaryVersion: "observation_v2_phase1",
    });

    expect(projected.fragments).toHaveLength(2);
    expect(projected.fragments[0].fragmentText).toContain("follows");
    expect(projected.fragments[1].fragmentText).toContain("shifts");
    expect(projected.summary).toContain("The dreamer follows a young male");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/cognition/observation/__tests__/scene-discovery-projection.test.ts`

Expected: FAIL with module-not-found or missing export errors for `scene-discovery-projection`.

- [ ] **Step 3: Write the minimal projection bridge**

```ts
import type { CreateObservationInput } from "@/src/domain/observation/types";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import { rebuildSummaryTraceFromFragments } from "@/src/cognition/observation/observation-discovery-projection";

export function projectObservationV2BundleToCreateObservationInput(
  bundle: ObservationV2Bundle,
  defaults: Pick<
    CreateObservationInput,
    "provenanceTier" | "semanticPolicyResult" | "semanticPolicyReasons" | "latentBackflowGuard" | "boundaryVersion"
  >,
): CreateObservationInput {
  const fragments = bundle.scenes
    .flatMap((scene, sceneIndex) =>
      scene.observations.map((observation, observationIndex) => ({
        category: "scene" as const,
        fragmentText: observation.text,
        position: sceneIndex * 100 + observationIndex,
        uncertaintyNote: observation.uncertaintyNote,
        evidenceAdequacy: "snippet_only" as const,
        evidence: {
          snippet: observation.evidence[0]?.snippet ?? scene.evidenceContext.snippet,
          spanStart: observation.evidence[0]?.spanStart ?? scene.evidenceContext.spanStart,
          spanEnd: observation.evidence[0]?.spanEnd ?? scene.evidenceContext.spanEnd,
          contextLabel: observation.evidence[0]?.contextLabel ?? scene.evidenceContext.contextLabel,
        },
      })),
    );

  const summary = bundle.scenes
    .flatMap((scene) => scene.observations.map((observation) => observation.text.trim().replace(/[.]+$/g, "")))
    .filter(Boolean)
    .join(". ")
    .concat(".");

  return {
    reflectiveObjectId: bundle.reflectiveObjectId,
    userId: bundle.userId,
    source: bundle.source,
    summary,
    uncertaintyNotes: [],
    provenanceTier: defaults.provenanceTier,
    semanticPolicyResult: defaults.semanticPolicyResult,
    semanticPolicyReasons: [...defaults.semanticPolicyReasons],
    summaryTrace: rebuildSummaryTraceFromFragments({ summary, fragments }),
    latentBackflowGuard: defaults.latentBackflowGuard,
    boundaryVersion: defaults.boundaryVersion,
    fragments,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/cognition/observation/__tests__/scene-discovery-projection.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cognition/observation/scene-discovery-projection.ts src/cognition/observation/__tests__/scene-discovery-projection.test.ts
git commit -m "feat: add observation v2 to v1 projection bridge"
```

### Task 3: Add Scene-First Discovery Assembly and Minimal Fallback

**Files:**
- Create: `src/cognition/observation/scene-discovery.ts`
- Create: `src/cognition/observation/scene-observation-scaffold.ts`
- Test: `src/cognition/observation/__tests__/scene-discovery.test.ts`
- Test: `src/cognition/observation/__tests__/scene-observation-scaffold.test.ts`
- Reference: `src/cognition/observation/descriptive-observation-scaffold.ts`

- [ ] **Step 1: Write the failing discovery/scaffold tests**

```ts
import { describe, expect, it } from "vitest";

import { createSceneDiscoveryBundle } from "@/src/cognition/observation/scene-discovery";
import { buildSceneObservationScaffold } from "@/src/cognition/observation/scene-observation-scaffold";

describe("createSceneDiscoveryBundle", () => {
  it("deduplicates shared evidence and preserves ordered scenes", () => {
    const bundle = createSceneDiscoveryBundle({
      reflectiveObjectId: "object-1",
      userId: "user-1",
      source: "system_llm_extract",
      scenes: [
        {
          sceneId: "scene-1",
          position: 0,
          summary: "Scene one.",
          boundaryReasoning: [],
          evidenceContext: { snippet: "elso", spanStart: 0, spanEnd: 4, contextLabel: "scene" },
          observations: [
            {
              observationId: "obs-1",
              position: 0,
              text: "First observation.",
              evidence: [{ snippet: "elso", spanStart: 0, spanEnd: 4, contextLabel: "scene" }],
              uncertaintyNote: null,
            },
          ],
          derived: { actors: [], locations: [], objects: [], interactions: [], affect: [], agency: [], phenomenology: [], metacognition: [] },
        },
      ],
    });

    expect(bundle.scenes[0].observations).toHaveLength(1);
    expect(bundle.scenes[0].sceneId).toBe("scene-1");
  });
});

describe("buildSceneObservationScaffold", () => {
  it("creates a minimal single-scene fallback when llm output is unavailable", () => {
    const scaffold = buildSceneObservationScaffold({
      reflectiveObjectId: "object-1",
      userId: "user-1",
      source: "system_descriptive_extract",
      sourceText: "Egy fiú vezetett fel a csigalépcsőn.",
    });

    expect(scaffold.scenes.length).toBeGreaterThan(0);
    expect(scaffold.scenes[0].observations.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/cognition/observation/__tests__/scene-discovery.test.ts src/cognition/observation/__tests__/scene-observation-scaffold.test.ts`

Expected: FAIL with module-not-found or missing export errors.

- [ ] **Step 3: Write the minimal discovery/scaffold modules**

```ts
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import { buildObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

export function createSceneDiscoveryBundle(input: ObservationV2Bundle): ObservationV2Bundle {
  return buildObservationV2Bundle(input);
}
```

```ts
import type { ObservationSource } from "@/src/domain/observation/types";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";
import { createSceneDiscoveryBundle } from "@/src/cognition/observation/scene-discovery";

export function buildSceneObservationScaffold(input: {
  reflectiveObjectId: ReflectiveObjectId;
  userId: UserId;
  source: ObservationSource;
  sourceText: string;
}) {
  const snippet = input.sourceText.trim();

  return createSceneDiscoveryBundle({
    reflectiveObjectId: input.reflectiveObjectId,
    userId: input.userId,
    source: input.source,
    scenes: [
      {
        sceneId: "scene-0",
        position: 0,
        summary: "Fallback scene reconstructed from source text.",
        boundaryReasoning: [],
        evidenceContext: {
          snippet,
          spanStart: 0,
          spanEnd: snippet.length,
          contextLabel: "fallback_scene",
        },
        observations: [
          {
            observationId: "scene-0-observation-0",
            position: 0,
            text: snippet,
            evidence: [
              {
                snippet,
                spanStart: 0,
                spanEnd: snippet.length,
                contextLabel: "fallback_observation",
              },
            ],
            uncertaintyNote: "Fallback scaffold used because scene extraction was unavailable.",
          },
        ],
        derived: {
          actors: [],
          locations: [],
          objects: [],
          interactions: [],
          affect: [],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
      },
    ],
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/cognition/observation/__tests__/scene-discovery.test.ts src/cognition/observation/__tests__/scene-observation-scaffold.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cognition/observation/scene-discovery.ts src/cognition/observation/scene-observation-scaffold.ts src/cognition/observation/__tests__/scene-discovery.test.ts src/cognition/observation/__tests__/scene-observation-scaffold.test.ts
git commit -m "feat: add scene-first discovery assembly and fallback scaffold"
```

### Task 4: Add LLM-First Scene Segmentation and Observation Extraction

**Files:**
- Create: `src/cognition/observation/llm-scene-observation-extractor.ts`
- Test: `src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts`
- Reference: `src/cognition/observation/llm-observation-extractor.ts`
- Reference: `src/domain/observation/semantic-policy.ts`

- [ ] **Step 1: Write the failing tests for scene-first extraction parsing**

```ts
import { describe, expect, it } from "vitest";

import { buildSceneObservationExtractionFromStructuredResult } from "@/src/cognition/observation/llm-scene-observation-extractor";

describe("buildSceneObservationExtractionFromStructuredResult", () => {
  it("parses a scene-first structured payload into a V2 bundle and V1 projection", async () => {
    const result = await buildSceneObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: "Egy fiú vezetett fel a csigalépcsőn, majd a helyzet kellemetlenné vált.",
      structured: {
        scenes: [
          {
            sceneId: "scene-1",
            position: 0,
            summary: "The dreamer follows a guide.",
            boundaryReasoning: [],
            evidenceContext: { snippet: "vezetett fel", contextLabel: "scene" },
            observations: [
              {
                observationId: "obs-1",
                position: 0,
                text: "The dreamer follows a young male up a spiral staircase.",
                evidence: [{ snippet: "vezetett fel a csigalépcsőn", contextLabel: "quoted_support" }],
                uncertaintyNote: null,
              },
            ],
            derived: {
              actors: [{ label: "young male", observationIds: ["obs-1"] }],
              locations: [{ label: "spiral staircase", observationIds: ["obs-1"] }],
              objects: [],
              interactions: [{ label: "guidance", observationIds: ["obs-1"] }],
              affect: [],
              agency: [{ label: "following", observationIds: ["obs-1"] }],
              phenomenology: [],
              metacognition: [],
            },
          },
        ],
      },
    });

    expect(result.mode).toBe("validated_llm");
    expect(result.bundle?.scenes[0].observations[0].text).toContain("spiral staircase");
    expect(result.payload?.fragments.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts`

Expected: FAIL with module-not-found or missing export errors.

- [ ] **Step 3: Write the minimal scene-first LLM extractor wrapper**

```ts
import type { CreateObservationInput } from "@/src/domain/observation/types";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import { createSceneDiscoveryBundle } from "@/src/cognition/observation/scene-discovery";
import { projectObservationV2BundleToCreateObservationInput } from "@/src/cognition/observation/scene-discovery-projection";

export interface LlmSceneObservationExtractionResult {
  mode: "validated_llm" | "fallback";
  bundle?: ObservationV2Bundle;
  payload?: CreateObservationInput;
  reason?: string;
}

export async function buildSceneObservationExtractionFromStructuredResult(input: {
  userId: string;
  reflectiveObjectId: string;
  dreamText: string;
  structured: unknown;
}): Promise<LlmSceneObservationExtractionResult> {
  const structured = input.structured as {
    scenes?: ObservationV2Bundle["scenes"];
  };

  if (!Array.isArray(structured.scenes) || structured.scenes.length === 0) {
    return {
      mode: "fallback",
      reason: "missing_scenes",
    };
  }

  const bundle = createSceneDiscoveryBundle({
    reflectiveObjectId: input.reflectiveObjectId,
    userId: input.userId,
    source: "system_llm_extract",
    scenes: structured.scenes,
  });

  const payload = projectObservationV2BundleToCreateObservationInput(bundle, {
    provenanceTier: "system_extract",
    semanticPolicyResult: "accept_with_uncertainty",
    semanticPolicyReasons: ["scene_first_projection"],
    latentBackflowGuard: "observation_only",
    boundaryVersion: "observation_v2_phase1",
  });

  return {
    mode: "validated_llm",
    bundle,
    payload,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cognition/observation/llm-scene-observation-extractor.ts src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts
git commit -m "feat: add scene-first llm observation extractor"
```

### Task 5: Integrate the Scene-First Engine Path and Update Fallout Tracking

**Files:**
- Modify: `src/cognition/observation/observation-engine.ts`
- Modify: `docs/backend-v2-migration/Observation-V2-Fallout-Ledger.md`
- Test: `src/cognition/observation/__tests__/observation-engine.test.ts`

- [ ] **Step 1: Write the failing engine test for scene-first projection output**

```ts
import { describe, expect, it, vi } from "vitest";

import { DescriptiveObservationEngine } from "@/src/cognition/observation/observation-engine";

describe("DescriptiveObservationEngine", () => {
  it("uses the scene-first scaffold path and still returns a V1 persistence payload", async () => {
    const engine = new DescriptiveObservationEngine();

    const result = await engine.describe({
      id: "object-1",
      userId: "user-1",
      type: "dream",
      title: "Dream",
      primaryContent: "Egy fiú vezetett fel a csigalépcsőn.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: null,
    });

    expect(result.fragments.length).toBeGreaterThan(0);
    expect(result.summary.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/cognition/observation/__tests__/observation-engine.test.ts`

Expected: FAIL because the engine still uses the legacy non-scene scaffold path.

- [ ] **Step 3: Update the engine and fallout ledger**

```ts
import type { CreateObservationInput } from "@/src/domain/observation/types";
import type { ReflectiveObject } from "@/src/domain/reflective-objects/types";
import { buildSceneObservationScaffold } from "@/src/cognition/observation/scene-observation-scaffold";
import { projectObservationV2BundleToCreateObservationInput } from "@/src/cognition/observation/scene-discovery-projection";

export interface ObservationEngine {
  describe(object: ReflectiveObject): Promise<CreateObservationInput>;
}

export class DescriptiveObservationEngine implements ObservationEngine {
  async describe(object: ReflectiveObject): Promise<CreateObservationInput> {
    const bundle = buildSceneObservationScaffold({
      userId: object.userId,
      reflectiveObjectId: object.id,
      sourceText: object.primaryContent,
      source: "system_descriptive_extract",
    });

    return projectObservationV2BundleToCreateObservationInput(bundle, {
      provenanceTier: "system_extract",
      semanticPolicyResult: "accept_with_uncertainty",
      semanticPolicyReasons: ["scene_first_scaffold_projection"],
      latentBackflowGuard: "observation_only",
      boundaryVersion: "observation_v2_phase1",
    });
  }
}
```

```md
### 4. Observation engine still returns V1 persistence shape

- Boundary: `src/cognition/observation/observation-engine.ts`
- Current state: the engine will become scene-first internally, but still returns `CreateObservationInput`.
- V2 impact: runtime foundation advances while the write contract remains transitional.
- Future work: switch engine callers to native V2 bundle consumption before removing the compatibility projection.
- Cleanup/removal potential: direct engine ownership of V1 payload shaping may become removable later.
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/cognition/observation/__tests__/observation-engine.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cognition/observation/observation-engine.ts src/cognition/observation/__tests__/observation-engine.test.ts docs/backend-v2-migration/Observation-V2-Fallout-Ledger.md
git commit -m "feat: route observation engine through scene-first v2 runtime"
```

### Task 6: Run Full Validation and Record Build Fallout

**Files:**
- Modify: `docs/backend-v2-migration/Observation-V2-Fallout-Ledger.md`
- Modify: `docs/STABILIZATION_LEDGER.md`

- [ ] **Step 1: Add fallout items discovered during implementation**

```md
### 5. V1 summary-trace and fragment-category semantics remain active in compatibility projection

- Boundary: `src/cognition/observation/scene-discovery-projection.ts`
- Current state: scene-first runtime must still compress observations into fragment-shaped compatibility payloads.
- V2 impact: some scene semantics are flattened during persistence projection.
- Future work: replace projection-only persistence with V2-native durability.
- Cleanup/removal potential: fragment-position-driven summary trace logic may become removable later.
```

- [ ] **Step 2: Run the targeted and full verification commands**

Run: `npm test -- src/domain/observation/__tests__/v2-runtime.test.ts src/cognition/observation/__tests__/scene-discovery-projection.test.ts src/cognition/observation/__tests__/scene-discovery.test.ts src/cognition/observation/__tests__/scene-observation-scaffold.test.ts src/cognition/observation/__tests__/llm-scene-observation-extractor.test.ts src/cognition/observation/__tests__/observation-engine.test.ts`

Expected: PASS

Run: `npm test`

Expected: PASS

Run: `npm run lint`

Expected: PASS

Run: `npm run typecheck`

Expected: PASS

Run: `npm run build`

Expected: PASS and new entries appended to `docs/BUILD_LOG.md` and `docs/build-logs/`.

- [ ] **Step 3: Update the stabilization ledger**

```md
## 2026-06-08 - Observation V2 Foundation Phase 1

- Phase: BUILD
- Touched boundaries:
  - `src/domain/observation/v2-runtime.ts`
  - `src/cognition/observation/scene-discovery.ts`
  - `src/cognition/observation/scene-observation-scaffold.ts`
  - `src/cognition/observation/scene-discovery-projection.ts`
  - `src/cognition/observation/llm-scene-observation-extractor.ts`
  - `src/cognition/observation/observation-engine.ts`
  - `docs/backend-v2-migration/Observation-V2-Fallout-Ledger.md`
- Verification:
  - `npm test` -> pass
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npm run build` -> pass
- Notes:
  - Added the first additive scene-first Observation V2 runtime foundation.
  - Kept V1 persistence and API only as a temporary projection target.
  - Did not migrate downstream consumers in this phase.
```

- [ ] **Step 4: Commit**

```bash
git add docs/backend-v2-migration/Observation-V2-Fallout-Ledger.md docs/STABILIZATION_LEDGER.md docs/BUILD_LOG.md docs/build-logs
git commit -m "docs: record observation v2 foundation verification and fallout"
```
