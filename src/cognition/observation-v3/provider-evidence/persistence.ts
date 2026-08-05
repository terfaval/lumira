import fs from "node:fs/promises";
import path from "node:path";

import { sha256StableProviderEvidence, stableProviderEvidenceStringify } from "@/src/cognition/observation-v3/provider-evidence/serialization";
import type {
  BaseProviderEvidence,
  ProviderEvidenceArtifactWriteReceipt,
} from "@/src/cognition/observation-v3/provider-evidence/types";

export async function persistProviderEvidenceArtifact(input: {
  destinationPath: string;
  evidence: BaseProviderEvidence;
}): Promise<{
  evidence: BaseProviderEvidence;
  receipt: ProviderEvidenceArtifactWriteReceipt;
}> {
  const resolvedPath = path.resolve(input.destinationPath);
  const directory = path.dirname(resolvedPath);
  const tempPath = `${resolvedPath}.tmp`;
  const expectedHash = sha256StableProviderEvidence(input.evidence);
  await fs.mkdir(directory, { recursive: true });

  try {
    await fs.writeFile(tempPath, stableProviderEvidenceStringify(input.evidence), "utf8");
    const observedRaw = await fs.readFile(tempPath, "utf8");
    const observedHash = sha256StableProviderEvidence(JSON.parse(observedRaw) as unknown);
    if (observedHash !== expectedHash) {
      await fs.rm(tempPath, { force: true });
      return {
        evidence: input.evidence,
        receipt: {
          destination: resolvedPath,
          expectedHash,
          observedHash,
          status: "verification_failed",
          failureClass: "hash_mismatch_after_write",
        },
      };
    }

    await fs.rename(tempPath, resolvedPath);
    return {
      evidence: input.evidence,
      receipt: {
        destination: resolvedPath,
        expectedHash,
        observedHash,
        status: "written",
        failureClass: null,
      },
    };
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
    return {
      evidence: input.evidence,
      receipt: {
        destination: resolvedPath,
        expectedHash,
        observedHash: null,
        status: "write_failed",
        failureClass: error instanceof Error ? error.message : "unknown_error",
      },
    };
  }
}
