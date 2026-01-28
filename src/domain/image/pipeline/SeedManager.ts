// src/domain/image/pipeline/SeedManager.ts

import { fnv1a32, inputHash } from "./hash";

export function computeSeed(params: {
  presetId: string;
  presetVersion: number;
  variant: string;
  userText?: string;
}) {
  const ih = inputHash((params.userText ?? "").trim());
  const seedBase = `${params.presetId}:v${params.presetVersion}:${params.variant}:${ih}`;
  const seed32 = fnv1a32(seedBase);

  // Store as bigint-safe number-ish string later if needed; v0 keeps bigint in DB.
  const seed = BigInt(seed32);

  return { seed, input_hash: ih };
}
