# Glossary Entity Ownership Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve glossary persistence and repository behavior so pinned glossary entries become Continuity Entity-shaped records with typed labels, aliases, notes, and appearance counts.

**Architecture:** Reuse the existing `glossary_terms` table and `GlossaryTerm` seam, but make new continuity-entity fields primary in the domain and persistence adapters. Keep `normalizedKey`, `displayLabel`, and `notes` as compatibility mirrors to avoid breaking nearby consumers while moving ownership semantics to the new fields.

**Tech Stack:** TypeScript, Next.js route handlers, Vitest, Supabase row adapters and repositories, SQL migrations

---

### Task 1: Lock the Continuity Entity Contract in Tests

**Files:**
- Modify: `src/domain/glossary/__tests__/http-contract.test.ts`
- Modify: `src/infrastructure/supabase/adapters/__tests__/glossary-row.test.ts`
- Modify: `src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts`

- [ ] **Step 1: Write failing domain tests for supported types and entity updates**

```ts
it("parses valid continuity entity updates with canonical fields", () => {
  const parsed = parseGlossaryEntityUpdate(
    {
      canonicalLabel: "Bridge",
      type: "place",
      aliases: ["the bridge", "Bridge"],
      generalNote: "Recurring crossing point.",
    },
    "term-1",
    "user-1",
  );

  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.value.type).toBe("place");
  expect(parsed.value.aliases).toEqual(["the bridge"]);
});
```

- [ ] **Step 2: Run the targeted domain test and verify RED**

Run: `npm.cmd test -- src/domain/glossary/__tests__/http-contract.test.ts`
Expected: FAIL because `parseGlossaryEntityUpdate` does not exist yet.

- [ ] **Step 3: Write failing adapter tests for continuity-entity row mapping**

```ts
it("maps continuity-entity fields from glossary term rows", () => {
  const term = fromGlossaryTermRow({
    id: "term-1",
    user_id: "user-1",
    normalized_key: "bridge",
    display_label: "Bridge",
    canonical_label: "Bridge",
    type: "place",
    aliases: ["bridge", "the bridge"],
    general_note: "Recurring crossing point.",
    appearance_count: 3,
    notes: "Recurring crossing point.",
    state: "active",
    suppression_state: "none",
    suppression_reason: null,
    suppressed_at: null,
    archived_at: null,
    created_at: "2026-06-11T00:00:00.000Z",
    updated_at: "2026-06-11T00:00:00.000Z",
  });

  expect(term.canonicalLabel).toBe("Bridge");
  expect(term.type).toBe("place");
  expect(term.aliases).toEqual(["bridge", "the bridge"]);
  expect(term.appearanceCount).toBe(3);
});
```

- [ ] **Step 4: Run the targeted adapter test and verify RED**

Run: `npm.cmd test -- src/infrastructure/supabase/adapters/__tests__/glossary-row.test.ts`
Expected: FAIL because the row/types do not contain continuity-entity fields yet.

- [ ] **Step 5: Write failing repository tests for pinned candidate entity creation**

```ts
expect(insert).toHaveBeenCalledWith(
  expect.objectContaining({
    type: "concept",
    canonical_label: "Door",
    aliases: [],
    general_note: null,
    appearance_count: 1,
  }),
);
```

- [ ] **Step 6: Run the targeted repository test and verify RED**

Run: `npm.cmd test -- src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts`
Expected: FAIL because pinned candidate inserts do not yet create continuity-entity-shaped rows.

### Task 2: Implement Domain and Adapter Support

**Files:**
- Modify: `src/domain/glossary/types.ts`
- Modify: `src/domain/glossary/contracts.ts`
- Modify: `src/domain/glossary/http-contract.ts`
- Modify: `src/infrastructure/supabase/adapters/glossary-row.ts`

- [ ] **Step 1: Add continuity-entity types and inputs in the glossary domain**

```ts
export const GLOSSARY_ENTITY_TYPES = [
  "person",
  "place",
  "animal_or_creature",
  "object",
  "setting_or_space",
  "role",
  "concept",
] as const;

export type GlossaryEntityType = (typeof GLOSSARY_ENTITY_TYPES)[number];
```

- [ ] **Step 2: Add entity update parsing with type validation and alias normalization**

```ts
function normalizeAliases(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const seen = new Set<string>();
  const aliases: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }

    const fingerprint = trimmed.toLocaleLowerCase();
    if (seen.has(fingerprint)) {
      continue;
    }

    seen.add(fingerprint);
    aliases.push(trimmed);
  }

  return aliases;
}
```

- [ ] **Step 3: Extend row adapters so continuity fields are primary and compatibility mirrors stay aligned**

```ts
export function fromGlossaryTermRow(row: GlossaryTermRow): GlossaryTerm {
  return {
    id: row.id,
    userId: row.user_id,
    normalizedKey: row.normalized_key,
    displayLabel: row.display_label,
    canonicalLabel: row.canonical_label,
    type: row.type,
    aliases: row.aliases,
    generalNote: row.general_note,
    appearanceCount: row.appearance_count,
    notes: row.notes,
    state: row.state,
    suppression: toSuppression(row.suppression_state, row.suppressed_at, row.suppression_reason),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

- [ ] **Step 4: Run targeted tests and verify GREEN**

Run: `npm.cmd test -- src/domain/glossary/__tests__/http-contract.test.ts src/infrastructure/supabase/adapters/__tests__/glossary-row.test.ts`
Expected: PASS

### Task 3: Implement Repository Behavior and Migration

**Files:**
- Modify: `src/infrastructure/supabase/repositories/glossary-supabase-repository.ts`
- Create: `supabase/migrations/20260611_0020_glossary_entity_ownership_slice.sql`

- [ ] **Step 1: Add migration for continuity-entity columns and backfill**

```sql
alter table public.glossary_terms
  add column if not exists type text not null default 'concept',
  add column if not exists canonical_label text,
  add column if not exists aliases text[] not null default '{}'::text[],
  add column if not exists general_note text null,
  add column if not exists appearance_count integer not null default 0;

update public.glossary_terms
set canonical_label = coalesce(canonical_label, display_label),
    general_note = coalesce(general_note, notes),
    aliases = coalesce(aliases, '{}'::text[]),
    appearance_count = coalesce(appearance_count, 0)
where canonical_label is null
   or general_note is null
   or aliases is null;
```

- [ ] **Step 2: Update term insert and update behavior**

```ts
toGlossaryTermInsertRow({
  userId: candidate.user_id,
  normalizedKey: candidate.normalized_key,
  displayLabel: candidate.display_label,
  canonicalLabel: candidate.display_label,
  type: "concept",
  aliases: [],
  generalNote: null,
  appearanceCount: 1,
  notes: null,
});
```

- [ ] **Step 3: Keep rename/update behavior aligned across canonical and compatibility labels**

```ts
.update({
  canonical_label: input.canonicalLabel,
  display_label: input.canonicalLabel,
  type: input.type,
  aliases: input.aliases,
  general_note: input.generalNote,
  notes: input.generalNote,
})
```

- [ ] **Step 4: Run targeted repository tests and verify GREEN**

Run: `npm.cmd test -- src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts`
Expected: PASS

### Task 4: Validate End-to-End Slice and Update Process Logs

**Files:**
- Modify: `docs/STABILIZATION_LEDGER.md`
- Review: `docs/BUILD_LOG.md`

- [ ] **Step 1: Run focused glossary tests**

Run: `npm.cmd test -- src/domain/glossary/__tests__/http-contract.test.ts src/infrastructure/supabase/adapters/__tests__/glossary-row.test.ts src/infrastructure/supabase/repositories/__tests__/glossary-supabase-repository.test.ts app/api/reflective-objects/[id]/glossary-candidates/__tests__/route.test.ts`
Expected: PASS

- [ ] **Step 2: Run repository validation commands**

Run: `npm.cmd test`
Expected: PASS

Run: `npm.cmd run lint`
Expected: PASS

Run: `npm.cmd run typecheck`
Expected: PASS

Run: `npm.cmd run build`
Expected: PASS and build log appended through `scripts/run-build-with-log.mjs`

- [ ] **Step 3: Record the build ticket in the stabilization ledger**

```md
| 2026-06-11 | Glossary entity ownership slice | `src/domain/glossary`, `src/infrastructure/supabase`, `app/api/reflective-objects/[id]/glossary-candidates`, `supabase/migrations` | `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` |
```

- [ ] **Step 4: Review for spec coverage and scope drift**

Confirm:

- continuity-entity fields exist and are primary
- candidate pin path creates valid entity-shaped rows
- no appearance history added
- no match lifecycle redesign added
- no latent changes added
