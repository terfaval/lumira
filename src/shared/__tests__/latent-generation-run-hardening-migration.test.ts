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

  it("creates continuity tables and an atomic successor-acceptance rpc", () => {
    const migration = readWorkspaceFile("supabase/migrations/20260722_0001_latent_reflective_continuity.sql");

    expect(migration).toContain("create table if not exists public.latent_opportunity_lifecycle_events");
    expect(migration).toContain("create table if not exists public.latent_opportunity_identity_relationships");
    expect(migration).toContain("create or replace function public.accept_latent_generation_run_successor");
    expect(migration).toContain("source_identity_id <> target_identity_id");
    expect(migration).toContain("p_identities jsonb");
    expect(migration).toContain("Lifecycle continuity history is append-only.");
    expect(migration).toContain("jsonb_to_recordset(coalesce(p_manifestations, '[]'::jsonb))");
    expect(migration).toContain("jsonb_to_recordset(coalesce(p_lifecycle_events, '[]'::jsonb))");
    expect(migration).toContain("update public.latent_opportunity_identities");
    expect(migration).toContain("app.latent_continuity_write_authorized");
    expect(migration).toContain("security definer");
    expect(migration).toContain("before insert on public.latent_opportunity_manifestations");
    expect(migration).toContain("before update on public.latent_opportunity_generation_runs");
    expect(migration).toContain("drop policy if exists latent_opportunity_manifestations_update_own");
    expect(migration).toContain("drop policy if exists latent_opportunity_generation_runs_update_own");
  });

  it("adds delete guards so accepted latent authority cannot be destroyed outside bounded pending rollback", () => {
    const deleteGuardMigration = readWorkspaceFile("supabase/migrations/20260723_0001_latent_authority_delete_hardening.sql");

    expect(deleteGuardMigration).toContain("create or replace function public.guard_latent_authority_delete()");
    expect(deleteGuardMigration).toContain("before delete on public.latent_opportunity_identities");
    expect(deleteGuardMigration).toContain("before delete on public.latent_opportunity_manifestations");
    expect(deleteGuardMigration).toContain("before delete on public.latent_opportunity_evidence_blocks");
    expect(deleteGuardMigration).toContain("before delete on public.latent_opportunity_evidence_observations");
    expect(deleteGuardMigration).toContain("before delete on public.latent_opportunity_glossary_links");
    expect(deleteGuardMigration).toContain("Accepted latent authority deletes are not permitted.");
    expect(deleteGuardMigration).toContain("create or replace function public.guard_latent_generation_run_delete()");
    expect(deleteGuardMigration).toContain("before delete on public.latent_opportunity_generation_runs");
    expect(deleteGuardMigration).toContain("Pending latent generation runs may be deleted only before accepted authority exists.");
  });
});
