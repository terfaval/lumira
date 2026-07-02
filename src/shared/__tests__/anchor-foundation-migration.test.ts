import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readWorkspaceFile(relativePath: string): string {
  const absolutePath = join(process.cwd(), relativePath);
  expect(existsSync(absolutePath)).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("anchor foundation migration contract", () => {
  it("creates the anchor identity, manifestation, and participation tables", () => {
    const migration = readWorkspaceFile("supabase/migrations/20260617_0026_anchor_foundation.sql");

    expect(migration).toContain("create table if not exists public.anchor_identities");
    expect(migration).toContain("create table if not exists public.anchor_manifestations");
    expect(migration).toContain("create table if not exists public.anchor_participations");
  });

  it("preserves canon enum checks and key foreign keys", () => {
    const migration = readWorkspaceFile("supabase/migrations/20260617_0026_anchor_foundation.sql");

    expect(migration).toContain("anchor_type in ('ENTITY', 'ROLE', 'STRUCTURE')");
    expect(migration).toContain("source_type in ('DREAM_DERIVED', 'REFLECTIVE_OBJECT_DERIVED')");
    expect(migration).toContain(
      "participation_role in ('EVIDENCE', 'CONTEXT', 'STRUCTURAL_SUPPORT', 'SALIENT_LINK')",
    );
    expect(migration).toContain("confidence in ('LOW', 'MEDIUM', 'HIGH')");
    expect(migration).toContain("source in ('LLM_CONSTRUCTED', 'SYSTEM_DERIVED', 'USER_CONFIRMED')");
    expect(migration).toContain("references public.anchor_identities (id, user_id)");
    expect(migration).toContain("references public.anchor_manifestations (id, user_id)");
    expect(migration).toContain("references public.latent_opportunity_identities (id, user_id)");
    expect(migration).toContain("references public.latent_opportunity_manifestations (id, user_id)");
  });
});
