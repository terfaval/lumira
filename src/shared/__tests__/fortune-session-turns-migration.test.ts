import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const V1_MIGRATION_PATH = "supabase/migrations/20260819_0002_fortune_session_turns.sql";
const MULTI_TURN_MIGRATION_PATH = "supabase/migrations/20260819_0003_fortune_multi_turn_rounds.sql";
const SESSION_MIGRATION_PATH = "supabase/migrations/20260819_0001_fortune_sessions.sql";

function readWorkspaceFile(relativePath: string): string {
  const absolutePath = join(process.cwd(), relativePath);
  expect(existsSync(absolutePath)).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("fortune session turns migration", () => {
  it("creates a narrow fortune_session_turns table without copying tarot content", () => {
    const migration = readWorkspaceFile(V1_MIGRATION_PATH);

    expect(migration).toContain("create table if not exists public.fortune_session_turns");
    expect(migration).toContain("role text not null");
    expect(migration).toContain("turn_kind text not null");
    expect(migration).toContain("content text not null");
    expect(migration).not.toContain("possible_readings");
    expect(migration).not.toContain("reflection_questions");
    expect(migration).not.toContain("shadow_possibilities");
  });

  it("enforces one assistant prompt and one reflective reply per session for v1", () => {
    const migration = readWorkspaceFile(V1_MIGRATION_PATH);

    expect(migration).toContain("fortune_session_turns_single_prompt_per_session_idx");
    expect(migration).toContain("where turn_kind = 'reflective_prompt'");
    expect(migration).toContain("fortune_session_turns_single_reply_per_session_idx");
    expect(migration).toContain("where turn_kind = 'reflective_reply'");
  });

  it("enforces owner-scoped access outside dream persistence surfaces", () => {
    const migration = readWorkspaceFile(V1_MIGRATION_PATH);

    expect(migration).toContain("alter table public.fortune_session_turns enable row level security");
    expect(migration).toContain("create policy fortune_session_turns_select_own");
    expect(migration).toContain("create policy fortune_session_turns_insert_own");
    expect(migration).not.toContain("reflective_objects");
    expect(migration).not.toContain("threads");
    expect(migration).not.toContain("responses");
    expect(migration).not.toContain("openings");
  });

  it("adds round-aware uniqueness and paused lifecycle support only in the new migration", () => {
    const migration = readWorkspaceFile(MULTI_TURN_MIGRATION_PATH);

    expect(migration).toContain("round_index integer not null");
    expect(migration).toContain("paused_at timestamptz null");
    expect(migration).toContain("check (state in ('active', 'paused', 'completed'))");
    expect(migration).toContain("fortune_session_turns_single_prompt_per_round_idx");
    expect(migration).toContain("fortune_session_turns_single_reply_per_round_idx");
    expect(migration).toContain("on public.fortune_session_turns (session_id, round_index)");
  });

  it("preserves prior fortune migrations as immutable history", () => {
    const sessionsMigration = readWorkspaceFile(SESSION_MIGRATION_PATH);
    const turnsMigration = readWorkspaceFile(V1_MIGRATION_PATH);

    expect(sessionsMigration).toContain("check (state in ('active', 'completed'))");
    expect(turnsMigration).toContain("fortune_session_turns_single_prompt_per_session_idx");
    expect(turnsMigration).toContain("fortune_session_turns_single_reply_per_session_idx");
  });
});
