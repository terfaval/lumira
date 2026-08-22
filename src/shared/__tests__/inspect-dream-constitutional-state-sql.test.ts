import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const INSPECT_SQL_PATH = path.join(
  process.cwd(),
  "supabase",
  "utilities",
  "inspect_dream_constitutional_state.sql",
);

describe("inspect_dream_constitutional_state.sql", () => {
  it("includes native Observation V3 authority rows in the dream-scoped report", () => {
    const sql = readFileSync(INSPECT_SQL_PATH, "utf8");

    expect(sql).toContain("dream_observation_v3_authorities");
    expect(sql).toContain("from public.observation_v3_authorities");
    expect(sql).toContain("'table_name', 'public.observation_v3_authorities'");
  });
});
