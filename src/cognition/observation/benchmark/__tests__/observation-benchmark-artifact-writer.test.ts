import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_OBSERVATION_BENCHMARK_OUTPUT_ROOT,
  buildObservationBenchmarkRunId,
  stableJsonStringify,
  writeJsonAtomic,
} from "@/src/cognition/observation/benchmark/observation-benchmark-artifact-writer";

describe("observation benchmark artifact writer", () => {
  it("serializes objects with deterministic key ordering and trailing newline", () => {
    const rendered = stableJsonStringify({
      zeta: 1,
      alpha: {
        second: 2,
        first: 1,
        nothing: undefined,
      },
      list: [{ b: 2, a: 1 }],
    });

    expect(rendered).toBe(
      [
        "{",
        "  \"alpha\": {",
        "    \"first\": 1,",
        "    \"second\": 2",
        "  },",
        "  \"list\": [",
        "    {",
        "      \"a\": 1,",
        "      \"b\": 2",
        "    }",
        "  ],",
        "  \"zeta\": 1",
        "}",
        "",
      ].join("\n"),
    );
  });

  it("writes json atomically to the target file", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "observation-benchmark-atomic-"));
    const targetPath = path.join(tempDir, "artifact.json");

    await writeJsonAtomic(targetPath, {
      beta: 2,
      alpha: 1,
    });

    expect(await fs.readFile(targetPath, "utf8")).toBe('{\n  "alpha": 1,\n  "beta": 2\n}\n');
  });

  it("builds deterministic run ids and collision suffixes", () => {
    const startedAt = new Date("2026-07-30T12:15:00.000Z");

    expect(
      buildObservationBenchmarkRunId({
        startedAt,
        shortRepositorySha: "39b3730",
        selectionLabel: "all",
      }),
    ).toBe("20260730T121500Z-39b3730-all");

    expect(DEFAULT_OBSERVATION_BENCHMARK_OUTPUT_ROOT).toBe(".validation/observation-benchmark/runs");
  });
});
