// src/domain/image/render/types.ts

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
