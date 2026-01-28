// src/domain/image/presets/types.ts

export type ImageStyleLocks = {
  base_style: string;
  scene: string;
  portal: string;
  detail: string;
  negative: string;
};

export type ImageVariant = {
  key: string;            // e.g. "morning" | "dawn" | "night"
  label?: string;         // optional UI label
  light_prompt: string;   // ONLY the light block
};

export type ImageCanvasSpec = {
  aspect: "desktop_16_9" | "portrait_9_16";
  width: number;
  height: number;
};

export type ImageStylePreset = {
  id: string;               // "lumira_stone_passage"
  version: number;          // 0
  name: string;             // human readable
  locks: ImageStyleLocks;
  variants: ImageVariant[];
  canvas: ImageCanvasSpec;
  seed_strategy: "deterministic";
  created_at?: string;
};
