// src/domain/image/render/types.ts

export type RenderInput = {
  prompt: string;
  negative_prompt: string;
  width: number;
  height: number;
  seed: number;
  reference_image?: { bytes: Uint8Array; mime: string }; // NEW
};

export type RenderSpec = {
  prompt: string;
  negative_prompt: string;
  width: number;
  height: number;
  seed: bigint;
};

export type RenderedImage = {
  bytes: Uint8Array; // PNG bytes
  contentType: "image/png";
};

export interface ImageRenderer {
  render(spec: RenderSpec): Promise<RenderedImage>;
}
