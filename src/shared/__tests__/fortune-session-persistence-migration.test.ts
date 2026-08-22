import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const MIGRATION_PATH = "supabase/migrations/20260819_0001_fortune_sessions.sql";

function readWorkspaceFile(relativePath: string): string {
  const absolutePath = join(process.cwd(), relativePath);
  expect(existsSync(absolutePath)).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("fortune session persistence migration", () => {
  it("creates a dedicated Fortune session table outside dream persistence substrates", () => {
    const migration = readWorkspaceFile(MIGRATION_PATH);

    expect(migration).toContain("create table if not exists public.fortune_sessions");
    expect(migration).toContain("mode_id text not null");
    expect(migration).toContain("focus_text text null");
    expect(migration).toContain("card_selections jsonb not null default '[]'::jsonb");
    expect(migration).toContain("first_interpretation text null");
    expect(migration).toContain("state text not null default 'active'");
    expect(migration).not.toContain("reflective_objects");
    expect(migration).not.toContain("reflective_threads");
    expect(migration).not.toContain("reflective_responses");
    expect(migration).not.toContain("openings");
  });

  it("stores only card references and a minimal state model for this slice", () => {
    const migration = readWorkspaceFile(MIGRATION_PATH);

    expect(migration).toContain("check (state in ('active', 'completed'))");
    expect(migration).toContain("check (jsonb_typeof(card_selections) = 'array')");
    expect(migration).toContain("check (state <> 'completed' or first_interpretation is not null)");
    expect(migration).not.toContain("ui_hint_short");
    expect(migration).not.toContain("possible_readings");
    expect(migration).not.toContain("tags");
  });

  it("enforces owner-scoped access and updated_at maintenance", () => {
    const migration = readWorkspaceFile(MIGRATION_PATH);

    expect(migration).toContain("create unique index if not exists fortune_sessions_id_user_id_idx");
    expect(migration).toContain("alter table public.fortune_sessions enable row level security");
    expect(migration).toContain("create policy fortune_sessions_select_own");
    expect(migration).toContain("create policy fortune_sessions_insert_own");
    expect(migration).toContain("create policy fortune_sessions_update_own");
    expect(migration).toContain("create or replace function public.touch_fortune_sessions_updated_at()");
  });
});
