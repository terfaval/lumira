import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { AUTHORITY_ADMISSION_EVALUATOR_VERSION } from "@/src/cognition/observation-v3/authority-admission/authority-admission-contract";
import { DEFAULT_AUTHORITY_ADMISSION_POLICY } from "@/src/cognition/observation-v3/authority-admission/admission-policy";

function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortValue(entry)]),
    );
  }

  return value;
}

async function hashFile(filePath: string): Promise<string> {
  return sha256Hex(await fs.readFile(path.resolve(filePath)));
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export interface AuthorityAdmissionFingerprintSet {
  contractPath: string;
  contractHash: string;
  evaluatorPath: string;
  evaluatorHash: string;
  policyPath: string;
  policyHash: string;
  findingsPath: string;
  findingsHash: string;
  comparatorPath: string;
  comparatorHash: string;
  shadowPath: string;
  shadowHash: string;
  policyFingerprint: string;
  evaluatorVersion: string;
}

export async function fingerprintAuthorityAdmission(): Promise<AuthorityAdmissionFingerprintSet> {
  const contractPath = "src/cognition/observation-v3/authority-admission/authority-admission-contract.ts";
  const evaluatorPath = "src/cognition/observation-v3/authority-admission/admission-evaluator.ts";
  const policyPath = "src/cognition/observation-v3/authority-admission/admission-policy.ts";
  const findingsPath = "src/cognition/observation-v3/authority-admission/admission-findings.ts";
  const comparatorPath = "src/cognition/observation-v3/authority-admission/admission-equivalence.ts";
  const shadowPath = "src/cognition/observation-v3/authority-admission/shadow-authority-admission.ts";

  const [
    contractHash,
    evaluatorHash,
    policyHash,
    findingsHash,
    comparatorHash,
    shadowHash,
  ] = await Promise.all([
    hashFile(contractPath),
    hashFile(evaluatorPath),
    hashFile(policyPath),
    hashFile(findingsPath),
    hashFile(comparatorPath),
    hashFile(shadowPath),
  ]);

  return {
    contractPath,
    contractHash,
    evaluatorPath,
    evaluatorHash,
    policyPath,
    policyHash,
    findingsPath,
    findingsHash,
    comparatorPath,
    comparatorHash,
    shadowPath,
    shadowHash,
    policyFingerprint: DEFAULT_AUTHORITY_ADMISSION_POLICY.policyFingerprint,
    evaluatorVersion: AUTHORITY_ADMISSION_EVALUATOR_VERSION,
  };
}
