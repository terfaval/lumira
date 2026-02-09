// src/domain/image/pipeline/SeedManager.ts

import { inputHash } from "./hash";

/**
 * We intentionally separate:
 * - seed: derived from composition_hash only (stable across variants)
 * - input_hash: derived from full prompt hash + variant (unique per variant)
 *
 * This makes "same composition, different light" feasible.
 */
export function computeSeed(params: {
  presetId: string;
  presetVersion: number;
  variant: string;
  userText?: string;

  compositionHash: string; // stable across variants
  promptHash: string;      // full prompt hash (variant-dependent)

  width: number;
  height: number;
}) {
  const userTextNorm = params.userText?.trim() ?? "";

  // seed basis: composition only (no variant)
  const seedBasis = [
    params.presetId,
    String(params.presetVersion),
    params.compositionHash,
    userTextNorm,
    `${params.width}x${params.height}`,
  ].join("|");

  // input_hash basis: full request identity (variant + full prompt hash)
  const inputBasis = [
    params.presetId,
    String(params.presetVersion),
    params.variant,
    params.promptHash,
    userTextNorm,
    `${params.width}x${params.height}`,
  ].join("|");

  const input_hash = inputHash(inputBasis);

  // Convert hash -> deterministic bigint seed
  // Assumption: inputHash returns a hex string. If not, we fall back to a safer conversion.
  const seedHash = inputHash(seedBasis);

  let seed: bigint;
  try {
    // If seedHash is hex (most likely), this works:
    seed = BigInt("0x" + seedHash.replace(/^0x/, ""));
  } catch {
    // Fallback: derive a numeric-ish bigint from char codes
    // (still deterministic, but only used if seedHash isn't hex)
    let acc = 0n;
    for (let i = 0; i < seedHash.length; i++) {
      acc = (acc * 131n + BigInt(seedHash.charCodeAt(i))) % 18446744073709551615n; // 2^64-1
    }
    seed = acc;
  }

  // Optional: clamp to 64-bit unsigned range (safe for many renderers)
  seed = seed % 18446744073709551615n; // 2^64-1

  return { seed, input_hash };
}
