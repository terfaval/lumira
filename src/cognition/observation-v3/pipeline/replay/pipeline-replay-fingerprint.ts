import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function fingerprintObservationV3CorpusReplay(): Promise<{
  fingerprint: string;
  files: Record<string, string>;
}> {
  const files = [
    "src/cognition/observation-v3/pipeline/replay/benchmark-matrix-loader.ts",
    "src/cognition/observation-v3/pipeline/replay/preserved-case-loader.ts",
    "src/cognition/observation-v3/pipeline/replay/pipeline-case-resolver.ts",
    "src/cognition/observation-v3/pipeline/replay/artifact-lineage-resolver.ts",
    "src/cognition/observation-v3/pipeline/replay/pipeline-replay-runner.ts",
    "src/cognition/observation-v3/pipeline/replay/pipeline-replay-summary.ts",
  ];
  const entries = await Promise.all(
    files.map(async (filePath) => [filePath, sha256Hex(await fs.readFile(path.resolve(filePath), "utf8"))] as const),
  );
  const digests = Object.fromEntries(entries);
  return {
    fingerprint: sha256Hex(JSON.stringify(entries)),
    files: digests,
  };
}
