# First-Response Boundary Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frame generation proceed without latent on the first-user-path while keeping latent required asynchronously.

**Architecture:** Keep `/api/session/ensure` as the entrypoint, enable observation-only frame fallback, and ensure idempotency hashing distinguishes latent-present vs latent-missing runs.

**Tech Stack:** Next.js (App Router), Supabase, TypeScript, Vitest.

---

## File Structure / Responsibility Map
- `app/api/session/ensure/route.ts`: Orchestrates blocking vs async pipeline steps for session ensure.
- `src/orchestration/jobs/jobGenerateFrame.ts`: Frame job logic and idempotency hashing for latent-present/missing.
- `src/orchestration/jobs/__tests__/jobGenerateFrame.test.ts` (new): Unit tests for latent-missing input hash behavior.

---

### Task 1: Add test coverage for latent-missing idempotency token

**Files:**
- Create: `src/orchestration/jobs/__tests__/jobGenerateFrame.test.ts`
- Modify: `src/orchestration/jobs/jobGenerateFrame.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildFrameInputToken } from "../jobGenerateFrame";

describe("jobGenerateFrame input token", () => {
  it("distinguishes latent-present vs latent-missing", () => {
    const material = "mhash";
    const obsId = "obs-1";
    const idxId = "idx-1";

    const withLatent = buildFrameInputToken({
      material_hash: material,
      latent_version_id: "lat-1",
      observation_version_id: obsId,
      session_index_version_id: idxId,
    });

    const withoutLatent = buildFrameInputToken({
      material_hash: material,
      latent_version_id: null,
      observation_version_id: obsId,
      session_index_version_id: idxId,
    });

    expect(withLatent).not.toEqual(withoutLatent);
    expect(withoutLatent).toContain("no_latent");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/orchestration/jobs/__tests__/jobGenerateFrame.test.ts`
Expected: FAIL with "buildFrameInputToken is not a function" or module export error.

- [ ] **Step 3: Write minimal implementation**

```ts
// in src/orchestration/jobs/jobGenerateFrame.ts
export function buildFrameInputToken(args: {
  material_hash: string;
  latent_version_id: string | null;
  observation_version_id: string;
  session_index_version_id: string;
}) {
  const latentToken = args.latent_version_id
    ? args.latent_version_id
    : `no_latent:${args.observation_version_id}:${args.session_index_version_id}`;
  return `frame:${args.material_hash}:${latentToken}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/orchestration/jobs/__tests__/jobGenerateFrame.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/orchestration/jobs/jobGenerateFrame.ts src/orchestration/jobs/__tests__/jobGenerateFrame.test.ts
git commit -m "test: cover frame input token for latent-missing"
```

---

### Task 2: Enable observation-only frame fallback in session ensure

**Files:**
- Modify: `app/api/session/ensure/route.ts`
- Modify: `src/orchestration/jobs/jobGenerateFrame.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildFrameInputToken } from "../jobGenerateFrame";

describe("jobGenerateFrame latent-missing token", () => {
  it("uses observation + index when latent is missing", () => {
    const token = buildFrameInputToken({
      material_hash: "mhash",
      latent_version_id: null,
      observation_version_id: "obs-1",
      session_index_version_id: "idx-1",
    });

    expect(token).toContain("no_latent:obs-1:idx-1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/orchestration/jobs/__tests__/jobGenerateFrame.test.ts`
Expected: FAIL if token still uses dummy UUID or lacks no_latent marker.

- [ ] **Step 3: Write minimal implementation**

```ts
// in app/api/session/ensure/route.ts, jobGenerateFrame call
const frameRes = await jobGenerateFrame({
  supabase,
  event: { id: eventId, user_id, session_id },
  material_hash,
  allowFallbackWithoutLatent: true,
});
```

```ts
// in src/orchestration/jobs/jobGenerateFrame.ts
const latent_version_id = latentLatest?.latent_version_id ?? null;
const input_token = buildFrameInputToken({
  material_hash,
  latent_version_id,
  observation_version_id: obs.observation_version_id,
  session_index_version_id: idx.session_index_version_id,
});
const input_hash = sha256(input_token);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/orchestration/jobs/__tests__/jobGenerateFrame.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/session/ensure/route.ts src/orchestration/jobs/jobGenerateFrame.ts
git commit -m "feat: allow frame generation without latent in ensure"
```

---

## Plan Self-Review
- **Spec coverage:** Addresses blocking chain + async latent, adds distinct input hash token, no frame regen after latent.
- **Placeholder scan:** No placeholders.
- **Type consistency:** `buildFrameInputToken` used consistently.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-06-first-response-boundary-implementation.md`.

Two execution options:
1. Subagent-Driven (recommended)
2. Inline Execution

Which approach?
