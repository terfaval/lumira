import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const MIGRATION_PATH = "supabase/migrations/20260811_0001_observation_v3_native_persistence.sql";

function readWorkspaceFile(relativePath: string): string {
  const absolutePath = join(process.cwd(), relativePath);
  expect(existsSync(absolutePath)).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("observation v3 native persistence migration", () => {
  it("creates a dedicated native v3 authority table without mutating historical v2 storage", () => {
    const migration = readWorkspaceFile(MIGRATION_PATH);

    expect(migration).toContain("create table if not exists public.observation_v3_authorities");
    expect(migration).toContain("authority_id text primary key");
    expect(migration).toContain("canonical_candidate_id text not null");
    expect(migration).toContain("canonical_hash text not null");
    expect(migration).toContain("source_id text not null");
    expect(migration).toContain("source_hash text not null");
    expect(migration).toContain("source_length integer not null");
    expect(migration).not.toContain("update public.observation_v2_bundles");
    expect(migration).not.toContain("delete from public.observation_v2_bundles");
  });

  it("stores canonical payload and governance envelope as native v3 artifacts", () => {
    const migration = readWorkspaceFile(MIGRATION_PATH);

    expect(migration).toContain("canonical_candidate jsonb not null");
    expect(migration).toContain("provenance_manifest jsonb not null");
    expect(migration).toContain("completeness_payload jsonb not null");
    expect(migration).toContain("memory_realization_validation jsonb not null");
    expect(migration).toContain("evidence_integrity jsonb not null");
    expect(migration).toContain("uncertainty_preservation jsonb not null");
    expect(migration).toContain("admission_identity_input_comparison jsonb not null");
    expect(migration).toContain("governance_observations jsonb not null default '[]'::jsonb");
    expect(migration).toContain("admission_decision jsonb not null");
  });

  it("enforces authoritative-only admission dispositions and one authority row per reflective object", () => {
    const migration = readWorkspaceFile(MIGRATION_PATH);

    expect(migration).toContain("admission_disposition in ('admitted', 'admitted_with_observations')");
    expect(migration).toContain("create unique index if not exists observation_v3_authorities_reflective_object_user_idx");
    expect(migration).toContain("on public.observation_v3_authorities (reflective_object_id, user_id)");
    expect(migration).toContain("create unique index if not exists observation_v3_authorities_canonical_candidate_idx");
    expect(migration).toContain("on public.observation_v3_authorities (canonical_candidate_id)");
  });

  it("keeps ownership-scoped foreign keys and row-level security", () => {
    const migration = readWorkspaceFile(MIGRATION_PATH);

    expect(migration).toContain("constraint observation_v3_authorities_reflective_object_owner_fk foreign key (reflective_object_id, user_id)");
    expect(migration).toContain("references public.reflective_objects (id, user_id)");
    expect(migration).toContain("alter table public.observation_v3_authorities enable row level security");
    expect(migration).toContain("create policy observation_v3_authorities_select_own");
    expect(migration).toContain("create policy observation_v3_authorities_insert_own");
    expect(migration).toContain("create policy observation_v3_authorities_update_own");
  });
});
