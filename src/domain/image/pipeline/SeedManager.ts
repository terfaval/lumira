import { fnv1a32, inputHash } from "./hash";

export function computeSeed(params: {
  presetId: string;
  presetVersion: number;
  variant: string;
  userText?: string;

  // ✅ new (optional) — callers that don’t have it yet can omit
  promptHash?: string;
  width?: number;
  height?: number;
}) {
  const ih = inputHash((params.userText ?? "").trim());

  // ✅ include promptHash + size if provided
  const ph = params.promptHash ?? "no_prompt_hash";
  const size = params.width && params.height ? `${params.width}x${params.height}` : "no_size";

  const seedBase = `${params.presetId}:v${params.presetVersion}:${params.variant}:${ih}:${ph}:${size}`;
  const seed32 = fnv1a32(seedBase);

  const seed = BigInt(seed32);
  return { seed, input_hash: ih };
}
