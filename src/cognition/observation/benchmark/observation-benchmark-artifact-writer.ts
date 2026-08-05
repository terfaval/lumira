import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const DEFAULT_OBSERVATION_BENCHMARK_OUTPUT_ROOT = ".validation/observation-benchmark/runs";

export type ObservationBenchmarkRunStatus =
  | "running"
  | "completed"
  | "completed_with_failures"
  | "aborted";

function toStableJsonValue(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => {
      const stable = toStableJsonValue(entry);
      return stable === undefined ? null : stable;
    });
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sortedEntries = Object.keys(record)
      .sort((left, right) => left.localeCompare(right))
      .flatMap((key) => {
        const stable = toStableJsonValue(record[key]);
        return stable === undefined ? [] : [[key, stable] as const];
      });

    return Object.fromEntries(sortedEntries);
  }

  return String(value);
}

export function stableJsonStringify(value: unknown): string {
  return `${JSON.stringify(toStableJsonValue(value), null, 2)}\n`;
}

export async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  const resolvedPath = path.resolve(filePath);
  const directory = path.dirname(resolvedPath);
  await fs.mkdir(directory, { recursive: true });

  const tempFilePath = path.join(
    directory,
    `.${path.basename(resolvedPath)}.${process.pid}.${Date.now()}.tmp`,
  );

  await fs.writeFile(tempFilePath, stableJsonStringify(value), "utf8");
  await fs.rename(tempFilePath, resolvedPath);
}

export function hashStableJson(value: unknown): string {
  return createHash("sha256").update(stableJsonStringify(value), "utf8").digest("hex");
}

function formatUtcTimestampForRunId(date: Date): string {
  return [
    date.getUTCFullYear().toString().padStart(4, "0"),
    (date.getUTCMonth() + 1).toString().padStart(2, "0"),
    date.getUTCDate().toString().padStart(2, "0"),
    "T",
    date.getUTCHours().toString().padStart(2, "0"),
    date.getUTCMinutes().toString().padStart(2, "0"),
    date.getUTCSeconds().toString().padStart(2, "0"),
    "Z",
  ].join("");
}

export function buildObservationBenchmarkRunId(input: {
  startedAt: Date;
  shortRepositorySha: string;
  selectionLabel: string;
  attempt?: number;
}): string {
  const baseId = `${formatUtcTimestampForRunId(input.startedAt)}-${input.shortRepositorySha}-${input.selectionLabel}`;
  if (!input.attempt || input.attempt <= 1) {
    return baseId;
  }

  return `${baseId}-${String(input.attempt).padStart(2, "0")}`;
}

export async function allocateObservationBenchmarkRunDirectory(input: {
  outputRoot: string;
  startedAt: Date;
  shortRepositorySha: string;
  selectionLabel: string;
}): Promise<{ runId: string; runDirectory: string }> {
  const resolvedOutputRoot = path.resolve(input.outputRoot);
  await fs.mkdir(resolvedOutputRoot, { recursive: true });

  for (let attempt = 1; attempt <= 99; attempt += 1) {
    const runId = buildObservationBenchmarkRunId({
      startedAt: input.startedAt,
      shortRepositorySha: input.shortRepositorySha,
      selectionLabel: input.selectionLabel,
      attempt,
    });
    const runDirectory = path.join(resolvedOutputRoot, runId);

    try {
      await fs.mkdir(runDirectory);
      return { runId, runDirectory };
    } catch (error) {
      const errorRecord = error as NodeJS.ErrnoException;
      if (errorRecord.code !== "EEXIST") {
        throw error;
      }
    }
  }

  throw new Error("Unable to allocate a unique observation benchmark run directory.");
}
