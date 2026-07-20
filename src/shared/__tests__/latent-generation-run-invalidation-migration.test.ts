import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readWorkspaceFile(relativePath: string): string {
  const absolutePath = join(process.cwd(), relativePath);
  expect(existsSync(absolutePath)).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

const MIGRATION_PATH = "supabase/migrations/20260719_0002_latent_generation_run_invalidation.sql";

function extractFallbackEmptyBranch(migration: string): string {
  const fallbackBranchAnchor = "if not found then\n    select *\n    into v_target_run\n    from public.latent_opportunity_generation_runs";
  const fallbackBranchStart = migration.indexOf(fallbackBranchAnchor);
  expect(fallbackBranchStart).toBeGreaterThanOrEqual(0);

  const emptyStatusIndex = migration.indexOf("status = 'empty'", fallbackBranchStart);
  expect(emptyStatusIndex).toBeGreaterThanOrEqual(0);

  const orderByIndex = migration.indexOf("order by created_at desc, id desc", emptyStatusIndex);
  expect(orderByIndex).toBeGreaterThanOrEqual(0);

  return migration.slice(fallbackBranchStart, orderByIndex + "order by created_at desc, id desc".length);
}

describe("latent generation-run invalidation migration", () => {
  it("creates the invalidation events table with the required columns", () => {
    const migration = readWorkspaceFile(MIGRATION_PATH);

    expect(migration).toContain("create table if not exists public.latent_generation_run_invalidation_events");
    expect(migration).toContain("id text primary key");
    expect(migration).toContain("user_id uuid not null");
    expect(migration).toContain("priority_reflective_object_id uuid not null");
    expect(migration).toContain("target_generation_run_id text not null");
    expect(migration).toContain("source_layer text not null");
    expect(migration).toContain("source_entity_type text not null");
    expect(migration).toContain("source_entity_id text not null");
    expect(migration).toContain("source_revision text not null");
    expect(migration).toContain("reason text not null");
    expect(migration).toContain("created_at timestamptz not null default now()");
  });

  it("adds the expected literal checks without introducing mutable resolution columns", () => {
    const migration = readWorkspaceFile(MIGRATION_PATH);

    expect(migration).toContain("source_layer = 'observation'");
    expect(migration).toContain("source_entity_type = 'observation_v2_bundle'");
    expect(migration).toContain("reason = 'observation_bundle_archived'");
    expect(migration).not.toContain("resolved_at");
    expect(migration).not.toContain("resolved_by_generation_run_id");
    expect(migration).not.toContain("status text");
    expect(migration).not.toContain("retry_count");
  });

  it("enforces dedupe, ownership-safe foreign keys, and required indexes", () => {
    const migration = readWorkspaceFile(MIGRATION_PATH);

    expect(migration).toContain("unique (target_generation_run_id, source_layer, source_entity_type, source_revision)");
    expect(migration).toContain("foreign key (");
    expect(migration).toContain("target_generation_run_id,");
    expect(migration).toContain("references public.latent_opportunity_generation_runs");
    expect(migration).toContain("references public.reflective_objects (id, user_id)");
    expect(migration).toContain("on delete restrict");
    expect(migration).toContain("latent_generation_run_invalidation_events_target_created_idx");
    expect(migration).toContain("(target_generation_run_id, created_at desc)");
    expect(migration).toContain("latent_generation_run_invalidation_events_object_created_idx");
    expect(migration).toContain("(user_id, priority_reflective_object_id, created_at desc)");
  });

  it("creates an atomic observation archive rpc with deterministic accepted-run selection", () => {
    const migration = readWorkspaceFile(MIGRATION_PATH);

    expect(migration).toContain("create or replace function public.archive_observation_v2_bundle");
    expect(migration).toContain("for update");
    expect(migration).toContain("update public.observation_v2_bundles");
    expect(migration).toContain("insert into public.latent_generation_run_invalidation_events");
    expect(migration).toContain("on conflict (target_generation_run_id, source_layer, source_entity_type, source_revision) do nothing");
    expect(migration).toContain("status = 'current'");
    expect(migration).toContain("status = 'empty'");
    expect(migration).toContain("order by created_at desc, id desc");
    expect(migration).not.toContain("status = 'pending'");
    expect(migration).not.toContain("status = 'failed'");
    expect(migration).not.toContain("status = 'rejected'");
    expect(migration).not.toContain("status = 'no_change'");
  });

  it("keeps the fallback empty-run branch limited to non-superseded accepted rows", () => {
    const migration = readWorkspaceFile(MIGRATION_PATH);
    const fallbackBranch = extractFallbackEmptyBranch(migration);

    expect(fallbackBranch).toContain("status = 'empty'");
    expect(fallbackBranch).toContain("and superseded_at is null");
    expect(fallbackBranch).toContain("order by created_at desc, id desc");
  });
});
