import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readWorkspaceFile(relativePath: string): string {
  const absolutePath = join(process.cwd(), relativePath);
  expect(existsSync(absolutePath)).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("latent generation-run empty-status hardening migration", () => {
  it("remains a static SQL-shape guard rather than behavioral migration proof", () => {
    const migration = readWorkspaceFile("supabase/migrations/20260718_0002_latent_generation_run_empty_status_hardening.sql");

    expect(typeof migration).toBe("string");
    expect(migration.length).toBeGreaterThan(0);
  });

  it("adds empty to the allowed generation-run statuses", () => {
    const migration = readWorkspaceFile("supabase/migrations/20260718_0002_latent_generation_run_empty_status_hardening.sql");

    expect(migration).toContain("status in ('pending', 'current', 'superseded', 'empty', 'no_change', 'failed', 'rejected')");
  });

  it("backfills legacy no_change runs without manifestations into empty assessments", () => {
    const migration = readWorkspaceFile("supabase/migrations/20260718_0002_latent_generation_run_empty_status_hardening.sql");

    expect(migration).toContain("set status = 'empty'");
    expect(migration).toContain("where run.status = 'no_change'");
    expect(migration).toContain("and not exists");
    expect(migration).toContain("where manifestation.generation_run_id = run.id");
  });

  it("does not widen one-current or predecessor authority in the base generation-run migration", () => {
    const migration = readWorkspaceFile("supabase/migrations/20260718_0001_latent_generation_run_authority.sql");

    expect(migration).toContain("latent_opportunity_generation_runs_one_current_idx");
    expect(migration).toContain("where status = 'current' and superseded_at is null");
    expect(migration).toContain("latent_opportunity_generation_runs_predecessor_self_check");
    expect(migration).toContain("latent_opportunity_generation_runs_predecessor_fk");
    expect(migration).toContain("on delete restrict");
  });

  it("keeps generation-run deletion policy ownership-scoped at the schema layer", () => {
    const migration = readWorkspaceFile("supabase/migrations/20260718_0001_latent_generation_run_authority.sql");

    expect(migration).toContain("create policy latent_opportunity_generation_runs_delete_own");
    expect(migration).toContain("using (auth.uid() = user_id)");
  });

  it("adds nullable latent provenance columns without backfilling historical runs", () => {
    const migration = readWorkspaceFile("supabase/migrations/20260719_0001_latent_generation_run_provenance.sql");

    expect(migration).toContain("alter table public.latent_opportunity_generation_runs");
    expect(migration).toContain("add column if not exists authority_fingerprint text null");
    expect(migration).toContain("add column if not exists authority_provenance jsonb null");
    expect(migration).toContain("add column if not exists context_provenance jsonb null");
    expect(migration).toContain("add column if not exists execution_provenance jsonb null");
    expect(migration).not.toContain("update public.latent_opportunity_generation_runs");
  });
});
