# First-Response Boundary Cleanup (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure `/api/session/ensure` can return a usable frame when latent is missing by enabling fallback and preventing idempotency collisions.

**Architecture:** Keep the blocking chain as session -> observe -> frame. Latent remains async. We add a deterministic input token for missing latent only in the idempotency hash, without changing stored latent_version_id semantics.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, Vitest.

---

## File Structure (Plan-Level)

- Modify: `app/api/session/ensure/route.ts`
- Modify: `src/orchestration/jobs/jobGenerateFrame.ts`
- Create: `src/orchestration/jobs/jobGenerateFrame.inputToken.test.ts`

---

### Task 1: Add a Deterministic Latent Input Token Helper (with Tests)

**Files:**
- Modify: `src/orchestration/jobs/jobGenerateFrame.ts`
- Create: `src/orchestration/jobs/jobGenerateFrame.inputToken.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/orchestration/jobs/jobGenerateFrame.inputToken.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { resolveLatentInputToken } from "./jobGenerateFrame";

describe("resolveLatentInputToken", () => {
  it("uses latent_version_id when present", () => {
    const latent = { latent_version_id: "latent-123" } as any;
    const obs = { observation_version_id: "obs-1" } as any;
    const idx = { session_index_version_id: "idx-1" } as any;
    expect(resolveLatentInputToken(latent, obs, idx, true)).toBe("latent-123");
  });

  it("uses deterministic no-latent token when missing and fallback allowed", () => {
    const obs = { observation_version_id: "obs-1" } as any;
    const idx = { session_index_version_id: "idx-1" } as any;
    expect(resolveLatentInputToken(null, obs, idx, true)).toBe("no_latent:obs-1:idx-1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm test -- --run src/orchestration/jobs/jobGenerateFrame.inputToken.test.ts
```
Expected: FAIL with "resolveLatentInputToken is not defined" or import error.

- [ ] **Step 3: Implement the helper**

In `src/orchestration/jobs/jobGenerateFrame.ts`, add and export:
```ts
export function resolveLatentInputToken(
  latentLatest: { latent_version_id?: string | null } | null,
  obs: { observation_version_id: string },
  idx: { session_index_version_id: string },
  allowFallbackWithoutLatent: boolean
): string {
  const latentId = latentLatest?.latent_version_id ?? null;
  if (latentId) return latentId;
  if (!allowFallbackWithoutLatent) return "";
  return `no_latent:${obs.observation_version_id}:${idx.session_index_version_id}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npm test -- --run src/orchestration/jobs/jobGenerateFrame.inputToken.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/orchestration/jobs/jobGenerateFrame.ts src/orchestration/jobs/jobGenerateFrame.inputToken.test.ts
git commit -m "test: add latent input token helper"
```

---

### Task 2: Use Deterministic Token in Frame Idempotency Hash

**Files:**
- Modify: `src/orchestration/jobs/jobGenerateFrame.ts`

- [ ] **Step 1: Update idempotency hash logic**

Replace the latent ID usage with:
```ts
const latent_version_id = latentLatest?.latent_version_id ?? null;
const latent_input_token = resolveLatentInputToken(
  latentLatest,
  obs,
  idx,
  Boolean(args.allowFallbackWithoutLatent)
);
const input_hash = sha256("frame:" + material_hash + ":" + latent_input_token);
```

Ensure `sourceIds.latent_version_id` and job output_ref continue to use `latent_version_id` (actual id or null), not the token.

- [ ] **Step 2: Run test to verify it passes**

Run:
```bash
npm test -- --run src/orchestration/jobs/jobGenerateFrame.inputToken.test.ts
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/orchestration/jobs/jobGenerateFrame.ts
git commit -m "fix: avoid frame idempotency collisions without latent"
```

---

### Task 3: Enable Fallback in `/api/session/ensure`

**Files:**
- Modify: `app/api/session/ensure/route.ts`

- [ ] **Step 1: Update jobGenerateFrame call**

Change:
```ts
allowFallbackWithoutLatent: isGuest ? true : false,
```
To:
```ts
allowFallbackWithoutLatent: true,
```

- [ ] **Step 2: Run typecheck + lint**

Run:
```bash
npm run typecheck
npm run lint
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/api/session/ensure/route.ts
git commit -m "fix: allow frame fallback without latent in ensure"
```

---

## Testing / Validation

- `npm test -- --run src/orchestration/jobs/jobGenerateFrame.inputToken.test.ts`
- `npm run typecheck`
- `npm run lint`
- Manual: create session -> ensure returns -> frame renders even if latent is missing.

---

## Rollback Plan

- Revert the three commits in reverse order:
```bash
git revert <commit-sha-3>
git revert <commit-sha-2>
git revert <commit-sha-1>
```
