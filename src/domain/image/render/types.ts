// src/domain/image/render/types.ts

export type RenderSpec = {
  prompt: string;
  negative_prompt: string;
  width: number;
  height: number;
  seed: bigint;

  // optional (for future comfy reference renderer v0/v1)
  reference_image?: { bytes: Uint8Array; mime: string; filename?: string };
};

export type RenderedImage = {
  bytes: Uint8Array; // PNG bytes
  contentType: "image/png";
  meta?: Record<string, unknown>;
};

export interface ImageRenderer {
  render(spec: RenderSpec): Promise<RenderedImage>;
}
