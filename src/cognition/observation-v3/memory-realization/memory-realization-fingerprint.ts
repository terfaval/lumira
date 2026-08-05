import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function hashFile(filePath: string): Promise<string> {
  return sha256Hex(await fs.readFile(path.resolve(filePath)));
}

export interface MemoryRealizationFingerprintSet {
  contractHash: string;
  engineHash: string;
  identityHash: string;
  orderingHash: string;
  evidenceHash: string;
  provenanceHash: string;
  uncertaintyHash: string;
  alternativesHash: string;
  validationHash: string;
  shadowHash: string;
}

export async function fingerprintMemoryRealization(): Promise<MemoryRealizationFingerprintSet> {
  const base = "src/cognition/observation-v3/memory-realization";
  const [
    contractHash,
    engineHash,
    identityHash,
    orderingHash,
    evidenceHash,
    provenanceHash,
    uncertaintyHash,
    alternativesHash,
    validationHash,
    shadowHash,
  ] = await Promise.all([
    hashFile(`${base}/memory-realization-contract.ts`),
    hashFile(`${base}/memory-realization.ts`),
    hashFile(`${base}/canonical-identity.ts`),
    hashFile(`${base}/canonical-ordering.ts`),
    hashFile(`${base}/canonical-evidence.ts`),
    hashFile(`${base}/canonical-provenance.ts`),
    hashFile(`${base}/canonical-uncertainty.ts`),
    hashFile(`${base}/canonical-alternatives.ts`),
    hashFile(`${base}/memory-realization-validation.ts`),
    hashFile(`${base}/shadow-memory-realization.ts`),
  ]);

  return {
    contractHash,
    engineHash,
    identityHash,
    orderingHash,
    evidenceHash,
    provenanceHash,
    uncertaintyHash,
    alternativesHash,
    validationHash,
    shadowHash,
  };
}
