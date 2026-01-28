// src/domain/image/render/OpenAIImageAdapter.ts

import type { ImageRenderer, RenderSpec, RenderedImage } from "./types";

export class OpenAIImageAdapter implements ImageRenderer {
  private apiKey: string;

  constructor() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("Missing OPENAI_API_KEY");
    this.apiKey = key;
  }

  async render(spec: RenderSpec): Promise<RenderedImage> {
    // NOTE: This uses a minimal fetch-based call. Adjust model/name as needed.
    // If your repo already has an OpenAI SDK wrapper for images, we can swap to that later.

    const body = {
      // Common OpenAI image model name; if your account uses a different one, change here.
      model: "gpt-image-1",
      prompt: spec.prompt,
      size: `${spec.width}x${spec.height}`,
      // We keep negative prompt folded into prompt for maximum compatibility if needed:
      // Some APIs accept "negative_prompt" explicitly; if yours does, we can wire it.
      // For now, we append it in a safe, non-OR way:
      // (We do NOT use OR; we place negatives as "Avoid:" instructions.)
    };

    const mergedPrompt =
      spec.negative_prompt?.trim()
        ? `${spec.prompt}\n\nAvoid:\n${spec.negative_prompt.trim()}`
        : spec.prompt;

    (body as any).prompt = mergedPrompt;

    const res = await fetch("https://api.openai.com/v1/images", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI image render failed: ${res.status} ${res.statusText} ${text}`);
    }

    const json: any = await res.json();

    // Expecting base64 image (common response shape). If your response differs, tell me and we’ll adjust.
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI image render: missing data[0].b64_json");

    const bytes = Uint8Array.from(Buffer.from(b64, "base64"));
    return { bytes, contentType: "image/png" };
  }
}
