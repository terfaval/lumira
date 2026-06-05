# LLM Observation Extractor v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace capture-time deterministic observation extraction with an LLM-first descriptive extractor that validates and falls back safely.

**Architecture:** Add a thin OpenAI-backed extractor that returns structured descriptive domains, then normalize and validate that payload into the existing `CreateObservationInput` shape. Persist only validated descriptive observations; otherwise fall back to the existing deterministic scaffold so downstream Latent, Glossary, and reflection flows stay unchanged.

**Tech Stack:** Next.js, TypeScript, Vitest, OpenAI Node SDK, Supabase repositories

---

### Task 1: Add failing extractor validation tests

**Files:**
- Create: `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`
- Modify: `src/domain/observation/__tests__/semantic-policy.test.ts`
- Test: `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("builds rich descriptive observations from a Hungarian regression dream", async () => {
  const result = await buildLlmObservationExtractionFromStructuredResult({
    userId: "user-1",
    reflectiveObjectId: "obj-1",
    dreamText: HUNGARIAN_DREAM,
    structured: HUNGARIAN_STRUCTURED_OUTPUT,
  });

  expect(result.mode).toBe("validated_llm");
  expect(result.payload.source).toBe("system_llm_extract");
  expect(result.payload.fragments.some((fragment) => fragment.category === "interaction" && /threat|coerc/i.test(fragment.fragmentText))).toBe(true);
  expect(result.payload.fragments.some((fragment) => fragment.category === "agency_state")).toBe(true);
  expect(result.payload.fragments.some((fragment) => fragment.category === "dream_state_quality" || fragment.category === "altered_realism")).toBe(true);
});

it("rejects interpretive structured outputs", async () => {
  const result = await buildLlmObservationExtractionFromStructuredResult({
    userId: "user-1",
    reflectiveObjectId: "obj-1",
    dreamText: "I stood before a mirror.",
    structured: INTERPRETIVE_STRUCTURED_OUTPUT,
  });

  expect(result.mode).toBe("fallback");
  expect(result.reason).toContain("interpretive");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/cognition/observation/__tests__/llm-observation-extractor.test.ts src/domain/observation/__tests__/semantic-policy.test.ts`

Expected: FAIL because `buildLlmObservationExtractionFromStructuredResult` and `system_llm_extract` do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export async function buildLlmObservationExtractionFromStructuredResult(...) {
  throw new Error("not implemented");
}
```

- [ ] **Step 4: Run test to verify it still fails for the expected reason**

Run: `npm test -- src/cognition/observation/__tests__/llm-observation-extractor.test.ts`

Expected: FAIL with assertion mismatches instead of module-not-found errors.

### Task 2: Add failing capture integration and fallback tests

**Files:**
- Modify: `app/capture/page.test.tsx`
- Test: `app/capture/page.test.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
it("prefers validated llm extraction during capture", async () => {
  buildLlmObservationExtractionMock.mockResolvedValue({
    mode: "validated_llm",
    payload: { summary: "validated", source: "system_llm_extract", fragments: [] },
  });

  await submitCapture(formData);

  expect(buildLlmObservationExtractionMock).toHaveBeenCalled();
  expect(buildDescriptiveObservationScaffoldMock).not.toHaveBeenCalled();
});

it("falls back to deterministic scaffold when llm extraction is unsafe", async () => {
  buildLlmObservationExtractionMock.mockResolvedValue({
    mode: "fallback",
    reason: "invalid_json",
  });

  await submitCapture(formData);

  expect(buildDescriptiveObservationScaffoldMock).toHaveBeenCalled();
  expect(createObservationMock).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/capture/page.test.tsx`

Expected: FAIL because capture still imports only `buildDescriptiveObservationScaffold`.

- [ ] **Step 3: Add minimal wiring surface**

```ts
import { buildLlmObservationExtraction } from "@/src/cognition/observation/llm-observation-extractor";
```

- [ ] **Step 4: Run test to verify it fails deeper**

Run: `npm test -- app/capture/page.test.tsx`

Expected: FAIL because the new extractor is not implemented yet, proving the integration path is under test.

### Task 3: Implement observation source and environment seams

**Files:**
- Modify: `src/domain/observation/types.ts`
- Modify: `src/infrastructure/supabase/adapters/observation-row.ts`
- Modify: `src/infrastructure/environment/env.ts`
- Create: `supabase/migrations/20260605_0018_observation_llm_source.sql`
- Test: `src/domain/observation/__tests__/http-contract.test.ts`

- [ ] **Step 1: Extend the source enum and row types**

```ts
export const OBSERVATION_SOURCES = [
  "system_descriptive_extract",
  "system_llm_extract",
  "user_descriptive_note",
] as const;
```

- [ ] **Step 2: Add runtime env support for the OpenAI API key**

```ts
export interface RuntimeEnvironment {
  nodeEnv: string;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  supabaseServiceRoleKey: string | null;
  openAiApiKey: string | null;
}
```

- [ ] **Step 3: Add the additive migration**

```sql
alter table public.observations
  drop constraint if exists observations_source_check;

alter table public.observations
  add constraint observations_source_check
  check (source in ('system_descriptive_extract', 'system_llm_extract', 'user_descriptive_note'));
```

- [ ] **Step 4: Run targeted tests**

Run: `npm test -- src/domain/observation/__tests__/http-contract.test.ts src/infrastructure/supabase/adapters/__tests__/observation-row.test.ts`

Expected: PASS after source parsing and row adaptation are updated.

### Task 4: Implement structured normalization, validation, and extractor

**Files:**
- Create: `src/cognition/observation/llm-observation-extractor.ts`
- Create: `src/cognition/observation/observation-extraction-validation.ts`
- Modify: `src/domain/observation/semantic-policy.ts`
- Modify: `src/cognition/observation/observation-engine.ts`
- Test: `src/cognition/observation/__tests__/llm-observation-extractor.test.ts`

- [ ] **Step 1: Define the structured extraction contract and fallback result**

```ts
export interface LlmObservationExtractionResult {
  mode: "validated_llm" | "fallback";
  payload?: CreateObservationInput;
  reason?: string;
}
```

- [ ] **Step 2: Implement evidence and anti-interpretation validation**

```ts
function validateEvidenceSnippet(snippet: string, dreamText: string): boolean {
  return normalizeForMatch(dreamText).includes(normalizeForMatch(snippet));
}
```

- [ ] **Step 3: Implement the OpenAI-backed extractor with structured JSON output**

```ts
const response = await client.responses.create({
  model: "gpt-4.1-mini",
  input,
  text: {
    format: {
      type: "json_schema",
      name: "lumira_observation_extraction",
      schema,
      strict: true,
    },
  },
});
```

- [ ] **Step 4: Normalize structured output into `CreateObservationInput` and run semantic policy**

```ts
const decision = evaluateObservationSemanticPolicy({
  source: "system_llm_extract",
  summary,
  fragments,
});
```

- [ ] **Step 5: Run targeted tests**

Run: `npm test -- src/cognition/observation/__tests__/llm-observation-extractor.test.ts src/domain/observation/__tests__/semantic-policy.test.ts`

Expected: PASS with Hungarian regression, English regression, anti-interpretation, and evidence handling covered.

### Task 5: Integrate capture fallback path

**Files:**
- Modify: `app/capture/page.tsx`
- Modify: `app/capture/page.test.tsx`
- Test: `app/capture/page.test.tsx`

- [ ] **Step 1: Replace direct scaffold usage with extractor-first orchestration**

```ts
const extraction = await buildLlmObservationExtraction({
  userId,
  reflectiveObjectId: reflectiveObject.id,
  dreamText,
});

const observationInput =
  extraction.mode === "validated_llm"
    ? extraction.payload
    : buildDescriptiveObservationScaffold({
        userId,
        reflectiveObjectId: reflectiveObject.id,
        sourceText: dreamText,
        source: "system_descriptive_extract",
      });
```

- [ ] **Step 2: Keep fallback diagnostics bounded and non-user-facing**

```ts
if (extraction.mode === "fallback") {
  console.warn("llm_observation_extraction_fallback", {
    reflectiveObjectId: reflectiveObject.id,
    reason: extraction.reason,
  });
}
```

- [ ] **Step 3: Run capture tests**

Run: `npm test -- app/capture/page.test.tsx`

Expected: PASS with both preferred-path and fallback-path coverage.

### Task 6: Run repo verification and update process docs

**Files:**
- Modify: `docs/STABILIZATION_LEDGER.md`
- Implicit output: `docs/BUILD_LOG.md`
- Implicit output: `docs/build-logs/<timestamp>.log`

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 2: Run tests**

Run: `npm test`

Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: PASS

- [ ] **Step 4: Run build through the repo wrapper**

Run: `npm run build`

Expected: PASS and build log files updated by `scripts/run-build-with-log.mjs`

- [ ] **Step 5: Record the completed ticket in the stabilization ledger**

```md
## 2026-06-05 - LLM Observation Extractor v1

- Phase: BUILD
- Touched boundaries:
  - `app/capture/page.tsx`
  - `src/cognition/observation/llm-observation-extractor.ts`
  - `src/cognition/observation/observation-extraction-validation.ts`
  - `src/domain/observation/types.ts`
  - `src/domain/observation/semantic-policy.ts`
  - `supabase/migrations/20260605_0018_observation_llm_source.sql`
- Verification:
  - `npm run typecheck` -> pass
  - `npm test` -> pass
  - `npm run lint` -> pass
  - `npm run build` -> pass
```
