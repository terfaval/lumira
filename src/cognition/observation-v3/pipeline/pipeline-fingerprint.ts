import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function hashFile(filePath: string): Promise<string> {
  return sha256Hex(await fs.readFile(path.resolve(filePath)));
}

export interface ObservationV3PipelineFingerprint {
  pipelineVersion: string;
  pipelineHash: string;
  files: Record<string, string>;
}

export async function fingerprintObservationV3Pipeline(): Promise<ObservationV3PipelineFingerprint> {
  const files = [
    "src/cognition/observation-v3/pipeline/pipeline.ts",
    "src/cognition/observation-v3/pipeline/pipeline-runner.ts",
    "src/cognition/observation-v3/pipeline/pipeline-fingerprint.ts",
    "src/cognition/observation-v3/pipeline/pipeline-artifacts.ts",
    "src/cognition/observation-v3/pipeline/pipeline-summary.ts",
    "src/cognition/observation-v3/pipeline/shadow-pipeline.ts",
    "src/cognition/observation-v3/pipeline/index.ts",
  ];

  const hashedEntries = await Promise.all(
    files.map(async (filePath) => [filePath, await hashFile(filePath)] as const),
  );
  const fileHashes = Object.fromEntries(hashedEntries);
  const pipelineHash = sha256Hex(JSON.stringify(fileHashes));

  return {
    pipelineVersion: "observation-v3-shadow-pipeline-v1",
    pipelineHash,
    files: fileHashes,
  };
}
