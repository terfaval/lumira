import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readWorkspaceFile(relativePath: string): string {
  const absolutePath = join(process.cwd(), relativePath);
  expect(existsSync(absolutePath)).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("opportunity identity exact classification migration", () => {
  it("defines the exact classification function with a table-shaped response contract", () => {
    const migration = readWorkspaceFile(
      "supabase/migrations/20260727_0001_opportunity_identity_exact_classification.sql",
    );

    expect(migration).toContain("create or replace function public.classify_opportunity_anchor_identity_exact(");
    expect(migration).toContain("p_user_id uuid");
    expect(migration).toContain("p_lookup_kind text");
    expect(migration).toContain("p_lookup_value text");
    expect(migration).toContain("returns table (");
    expect(migration).toContain("kind text");
    expect(migration).toContain("representative_anchor_ids text[]");
  });

  it("proves exact user-scoped distinct-anchor classification semantics structurally", () => {
    const migration = readWorkspaceFile(
      "supabase/migrations/20260727_0001_opportunity_identity_exact_classification.sql",
    );

    expect(migration).toContain("if p_lookup_kind not in ('opportunity_id', 'opportunity_manifestation_id') then");
    expect(migration).toContain("raise exception 'Unsupported opportunity lookup kind: %', p_lookup_kind;");
    expect(migration).toContain("where ap.user_id = p_user_id");
    expect(migration).toContain("and ap.opportunity_id = p_lookup_value");
    expect(migration).toContain("and ap.opportunity_manifestation_id = p_lookup_value");
    expect(migration).toContain("group by ap.anchor_id");
    expect(migration).toContain("limit 2");
    expect(migration).toContain("select 'none'::text, array[]::text[];");
    expect(migration).toContain("select 'unique'::text, v_representative_anchor_ids;");
    expect(migration).toContain("select 'ambiguous'::text, v_representative_anchor_ids;");
    expect(migration).not.toContain("execute ");
  });

  it("adds supporting non-unique indexes for both opportunity lookup forms", () => {
    const migration = readWorkspaceFile(
      "supabase/migrations/20260727_0001_opportunity_identity_exact_classification.sql",
    );

    expect(migration).toContain("create index if not exists anchor_participations_user_opportunity_anchor_idx");
    expect(migration).toContain(
      "on public.anchor_participations (user_id, opportunity_id, anchor_id)",
    );
    expect(migration).toContain(
      "create index if not exists anchor_participations_user_opportunity_manifestation_anchor_idx",
    );
    expect(migration).toContain(
      "on public.anchor_participations (user_id, opportunity_manifestation_id, anchor_id)",
    );
    expect(migration).not.toContain("create unique index if not exists anchor_participations_user_opportunity_anchor_idx");
    expect(migration).not.toContain(
      "create unique index if not exists anchor_participations_user_opportunity_manifestation_anchor_idx",
    );
  });
});
