# Match Candidate Foundation Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add canonical Glossary V2 candidate classes and proposed entity references to glossary candidate domain, persistence, repository, and API read models without adding matching, ambiguity, or appearance-resolution behavior.

**Architecture:** Evolve the existing `glossary_candidate_states` seam in place by adding candidate-class and proposed-entity columns, then thread those fields through the glossary domain model, Supabase row adapters, repository reads/writes, and candidate API surfaces. Keep all current extraction behavior intact by defaulting generated candidates to `new_candidate` with an empty proposed-entity list.

**Tech Stack:** TypeScript, Next.js route handlers, Vitest, Supabase SQL migrations, existing glossary repository/adapters

---

### Task 1: Define Canonical Candidate Types and Contracts

**Files:**
- Modify: `src/domain/glossary/types.ts`
- Modify: `src/domain/glossary/http-contract.ts`
- Test: `src/domain/glossary/__tests__/http-contract.test.ts`

- [ ] **Step 1: Write the failing domain tests**

```ts
it("parses candidate updates with canonical candidate class metadata", () => {
  const parsed = parseGlossaryCandidateLifecycleUpdate(
    {
      nextState: "candidate",
      candidateClass: "match_candidate",
      proposedEntityIds: ["term-1"],
    },
    "cand-1",
    "user-1",
  );

  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.value.candidateClass).toBe("match_candidate");
  expect(parsed.value.proposedEntityIds).toEqual(["term-1"]);
});

it("rejects invalid canonical candidate class shapes", () => {
  const invalid = parseGlossaryCandidateLifecycleUpdate(
    {
      nextState: "candidate",
      candidateClass: "ambiguous_match_candidate",
      proposedEntityIds: ["term-1"],
    },
    "cand-1",
    "user-1",
  );

  expect(invalid.ok).toBe(false);
});
```

- [ ] **Step 2: Run the domain test to verify it fails**

Run: `npm.cmd test -- src/domain/glossary/__tests__/http-contract.test.ts`
Expected: FAIL because `candidateClass` and `proposedEntityIds` are not yet part of the parsed contract.

- [ ] **Step 3: Write the minimal domain implementation**

```ts
export const GLOSSARY_CANDIDATE_CLASSES = [
  "match_candidate",
  "ambiguous_match_candidate",
  "new_candidate",
] as const;

export type GlossaryCandidateClass = (typeof GLOSSARY_CANDIDATE_CLASSES)[number];

export interface GlossaryCandidate {
  // existing fields...
  candidateClass: GlossaryCandidateClass;
  proposedEntityIds: GlossaryTermId[];
}

export interface CreateGlossaryCandidateInput {
  // existing fields...
  candidateClass?: GlossaryCandidateClass;
  proposedEntityIds?: GlossaryTermId[];
}

export interface GlossaryCandidateLifecycleUpdate {
  // existing fields...
  candidateClass?: GlossaryCandidateClass;
  proposedEntityIds?: GlossaryTermId[];
}
```

```ts
function parseCandidateClassShape(record: Record<string, unknown>) {
  const candidateClass =
    typeof record.candidateClass === "string" ? (record.candidateClass as GlossaryCandidateClass) : undefined;

  const proposedEntityIds =
    record.proposedEntityIds === undefined
      ? undefined
      : Array.isArray(record.proposedEntityIds)
        ? record.proposedEntityIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        : null;

  if (candidateClass === undefined && proposedEntityIds === undefined) {
    return { ok: true as const, candidateClass: undefined, proposedEntityIds: undefined };
  }

  if (!candidateClass || !VALID_CANDIDATE_CLASSES.has(candidateClass) || proposedEntityIds === null) {
    return { ok: false as const, error: "Invalid glossary candidate class payload." };
  }

  if (
    (candidateClass === "match_candidate" && proposedEntityIds.length !== 1) ||
    (candidateClass === "ambiguous_match_candidate" && proposedEntityIds.length <= 1) ||
    (candidateClass === "new_candidate" && proposedEntityIds.length !== 0)
  ) {
    return { ok: false as const, error: "Invalid glossary candidate class shape." };
  }

  return { ok: true as const, candidateClass, proposedEntityIds };
}
```

- [ ] **Step 4: Run the domain test to verify it passes**

Run: `npm.cmd test -- src/domain/glossary/__tests__/http-contract.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/glossary/types.ts src/domain/glossary/http-contract.ts src/domain/glossary/__tests__/http-contract.test.ts
git commit -m "feat: add canonical glossary candidate classes"
```

### Task 2: Persist Candidate Class and Proposed Entity References

**Files:**
- Create: `supabase/migrations/20260612_0022_glossary_match_candidate_foundation.sql`
- Modify: `src/infrastructure/supabase/adapters/glossary-row.ts`
- Modify: `src/infrastructure/supabase/repositories/glossary-supabase-repository.ts`
- Test: `src/infrastructure/supabase/adapters/__tests__/glossary-row.test.ts`
- Test: `src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts`

- [ ] **Step 1: Write the failing adapter and repository tests**

```ts
it("maps canonical candidate class metadata from candidate rows", () => {
  const candidate = fromGlossaryCandidateRow({
    id: "cand-1",
    user_id: "user-a",
    reflective_object_id: "obj-1",
    normalized_key: "apa",
    display_label: "Apa",
    source_category: "actor",
    source_observation_id: null,
    source_observation_fragment_id: null,
    recurrence_count: 1,
    candidate_class: "match_candidate",
    proposed_entity_ids: ["term-1"],
    state: "candidate",
    suppression_state: "none",
    suppression_reason: null,
    suppressed_at: null,
    last_seen_at: "2026-06-12T10:00:00.000Z",
    archived_at: null,
    created_at: "2026-06-12T10:00:00.000Z",
    updated_at: "2026-06-12T10:00:00.000Z",
  });

  expect(candidate.candidateClass).toBe("match_candidate");
  expect(candidate.proposedEntityIds).toEqual(["term-1"]);
});

it("defaults extracted candidates to new_candidate with no proposed entities", async () => {
  await repository.upsertCandidates([
    {
      userId: "user-a",
      reflectiveObjectId: "obj-1",
      normalizedKey: "door",
      displayLabel: "Door",
      sourceCategory: "object",
    },
  ]);

  expect(insert).toHaveBeenCalledWith(
    expect.objectContaining({
      candidate_class: "new_candidate",
      proposed_entity_ids: [],
    }),
  );
});
```

- [ ] **Step 2: Run the adapter and repository tests to verify they fail**

Run:
- `npm.cmd test -- src/infrastructure/supabase/adapters/__tests__/glossary-row.test.ts`
- `npm.cmd test -- src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts`

Expected: FAIL because candidate rows and repository writes do not yet support the new fields.

- [ ] **Step 3: Write the minimal persistence implementation**

```sql
alter table public.glossary_candidate_states
  add column if not exists candidate_class text not null default 'new_candidate',
  add column if not exists proposed_entity_ids uuid[] not null default '{}'::uuid[];

update public.glossary_candidate_states
set candidate_class = coalesce(candidate_class, 'new_candidate'),
    proposed_entity_ids = coalesce(proposed_entity_ids, '{}'::uuid[]);

alter table public.glossary_candidate_states
  drop constraint if exists glossary_candidate_states_candidate_class_check;

alter table public.glossary_candidate_states
  add constraint glossary_candidate_states_candidate_class_check check (
    candidate_class in ('match_candidate', 'ambiguous_match_candidate', 'new_candidate')
  );
```

```ts
export interface GlossaryCandidateRow {
  // existing fields...
  candidate_class: "match_candidate" | "ambiguous_match_candidate" | "new_candidate";
  proposed_entity_ids: string[];
}

export function fromGlossaryCandidateRow(row: GlossaryCandidateRow): GlossaryCandidate {
  return {
    // existing fields...
    candidateClass: row.candidate_class,
    proposedEntityIds: row.proposed_entity_ids,
  };
}

export function toGlossaryCandidateInsertRow(input: CreateGlossaryCandidateInput, now: string): GlossaryCandidateInsertRow {
  return {
    // existing fields...
    candidate_class: input.candidateClass ?? "new_candidate",
    proposed_entity_ids: input.proposedEntityIds ?? [],
  };
}
```

```ts
const patch = {
  // existing lifecycle fields...
  ...(input.candidateClass ? { candidate_class: input.candidateClass } : {}),
  ...(input.proposedEntityIds ? { proposed_entity_ids: input.proposedEntityIds } : {}),
};
```

- [ ] **Step 4: Run the adapter and repository tests to verify they pass**

Run:
- `npm.cmd test -- src/infrastructure/supabase/adapters/__tests__/glossary-row.test.ts`
- `npm.cmd test -- src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260612_0022_glossary_match_candidate_foundation.sql src/infrastructure/supabase/adapters/glossary-row.ts src/infrastructure/supabase/repositories/glossary-supabase-repository.ts src/infrastructure/supabase/adapters/__tests__/glossary-row.test.ts src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts
git commit -m "feat: persist canonical glossary candidate metadata"
```

### Task 3: Expose Candidate Class Through API Read Models

**Files:**
- Modify: `app/api/reflective-objects/[id]/glossary-candidates/route.ts`
- Modify: `app/api/glossary/candidates/[id]/route.ts`
- Test: `app/api/reflective-objects/[id]/glossary-candidates/__tests__/route.test.ts`
- Test: `app/api/glossary/candidates/[id]/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing route tests**

```ts
it("returns canonical candidate class metadata on reflective object candidate reads", async () => {
  listCandidatesByReflectiveObject.mockResolvedValue([
    {
      id: "cand-1",
      candidateClass: "ambiguous_match_candidate",
      proposedEntityIds: ["term-1", "term-2"],
    },
  ]);

  const response = await GET(new Request("http://localhost/api/reflective-objects/obj-1/glossary-candidates"), {
    params: Promise.resolve({ id: "obj-1" }),
  });

  const json = await response.json();
  expect(json.candidates[0].candidateClass).toBe("ambiguous_match_candidate");
  expect(json.candidates[0].proposedEntityIds).toEqual(["term-1", "term-2"]);
});
```

```ts
it("accepts canonical candidate metadata on lifecycle patch payloads", async () => {
  await PATCH(
    new Request("http://localhost/api/glossary/candidates/cand-1", {
      method: "PATCH",
      body: JSON.stringify({
        nextState: "candidate",
        candidateClass: "match_candidate",
        proposedEntityIds: ["term-1"],
      }),
    }),
    { params: Promise.resolve({ id: "cand-1" }) },
  );

  expect(setCandidateLifecycle).toHaveBeenCalledWith(
    expect.objectContaining({
      candidateClass: "match_candidate",
      proposedEntityIds: ["term-1"],
    }),
  );
});
```

- [ ] **Step 2: Run the route tests to verify they fail**

Run:
- `npm.cmd test -- app/api/reflective-objects/[id]/glossary-candidates/__tests__/route.test.ts`
- `npm.cmd test -- app/api/glossary/candidates/[id]/__tests__/route.test.ts`

Expected: FAIL because the tests expect new candidate metadata that current contracts do not guarantee.

- [ ] **Step 3: Write the minimal API implementation**

```ts
const parsed = parseGlossaryCandidateLifecycleUpdate(payload, candidateId, user.userId);

if (!parsed.ok) {
  return NextResponse.json({ error: parsed.error }, { status: 400 });
}

return NextResponse.json({ candidate });
```

No route redesign is required. The implementation is complete when existing repository-backed responses include the new fields and PATCH parsing forwards them.

- [ ] **Step 4: Run the route tests to verify they pass**

Run:
- `npm.cmd test -- app/api/reflective-objects/[id]/glossary-candidates/__tests__/route.test.ts`
- `npm.cmd test -- app/api/glossary/candidates/[id]/__tests__/route.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/reflective-objects/[id]/glossary-candidates/route.ts app/api/glossary/candidates/[id]/route.ts app/api/reflective-objects/[id]/glossary-candidates/__tests__/route.test.ts app/api/glossary/candidates/[id]/__tests__/route.test.ts
git commit -m "feat: expose glossary candidate class metadata"
```

### Task 4: Full Validation and Ledger Update

**Files:**
- Modify: `docs/STABILIZATION_LEDGER.md`
- Review: `docs/BUILD_LOG.md`
- Review: `docs/build-logs/<timestamp>.log`

- [ ] **Step 1: Run the full test suite**

Run: `npm.cmd test`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `npm.cmd run lint`
Expected: PASS

- [ ] **Step 3: Run typecheck**

Run: `npm.cmd run typecheck`
Expected: PASS

- [ ] **Step 4: Run the production build with required logging**

Run: `npm.cmd run build`
Expected: PASS and new entries written to `docs/BUILD_LOG.md` and `docs/build-logs/<timestamp>.log`

- [ ] **Step 5: Update stabilization ledger**

Add an entry shaped like:

```md
## 2026-06-12 - Match Candidate Foundation Slice

- Phase: BUILD
- Touched boundaries:
  - `src/domain/glossary`
  - `src/infrastructure/supabase/adapters/glossary-row.ts`
  - `src/infrastructure/supabase/repositories/glossary-supabase-repository.ts`
  - `app/api/glossary/candidates/[id]/route.ts`
  - `app/api/reflective-objects/[id]/glossary-candidates/route.ts`
  - `supabase/migrations/20260612_0022_glossary_match_candidate_foundation.sql`
- Verification:
  - `npm.cmd test` -> pass
  - `npm.cmd run lint` -> pass
  - `npm.cmd run typecheck` -> pass
  - `npm.cmd run build` -> pass
  - Build log summary: `docs/BUILD_LOG.md`
  - Build log artifact: `docs/build-logs/<timestamp>.log`
- Notes:
  - Added canonical Glossary V2 candidate classes and proposed entity reference storage without adding matching, ambiguity resolution, or appearance creation logic.
```

- [ ] **Step 6: Commit**

```bash
git add docs/STABILIZATION_LEDGER.md docs/BUILD_LOG.md docs/build-logs
git commit -m "chore: record match candidate foundation verification"
```
