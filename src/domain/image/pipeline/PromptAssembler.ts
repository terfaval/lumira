// src/domain/image/pipeline/PromptAssembler.ts

import type { ImageStylePreset } from "@/src/domain/image/presets/types";

export function assemblePrompt(preset: ImageStylePreset, variantKey: string, userText?: string) {
  const variant = preset.variants.find(v => v.key === variantKey);
  if (!variant) throw new Error(`Unknown variant '${variantKey}' for preset '${preset.id}'`);

  // v0: userText is optional and appended only if provided (future window content).
  // For the canonical corridor, userText should be empty.
  const userBlock = userText?.trim()
    ? `\n\n---\nUser theme (must remain in the same style):\n${userText.trim()}\n`
    : "";

  const prompt = [
    preset.locks.base_style,
    preset.locks.scene,
    preset.locks.portal,
    preset.locks.detail,
    variant.light_prompt,
    userBlock,
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  const negative_prompt = preset.locks.negative.trim();

  return { prompt, negative_prompt };
}
