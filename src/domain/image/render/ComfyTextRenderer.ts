// src/domain/image/render/ComfyTextRenderer.ts
//
// ComfyUI renderer v0a: text-only SDXL (no custom nodes)
//
// Assumptions:
// - ComfyUI reachable at COMFYUI_BASE_URL (e.g. http://127.0.0.1:8188)
// - SDXL checkpoint present in ComfyUI models/checkpoints

import type { ImageRenderer, RenderSpec, RenderedImage } from "@/src/domain/image/render/types";

type ComfyOutput = { filename: string; subfolder?: string; type?: string };

type PollingSummary = {
  attempts: number;
  elapsed_ms: number;
  last_status?: string;
};

export class ComfyTextRenderer implements ImageRenderer {
  private baseUrl: string;
  private checkpointName: string;

  constructor(baseUrl: string) {
    if (!baseUrl) throw new Error("ComfyTextRenderer: baseUrl is required");
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.checkpointName = process.env.COMFY_SDXL_CHECKPOINT ?? "sd_xl_base_1.0.safetensors";
  }

  async render(spec: RenderSpec): Promise<RenderedImage> {
    const workflow = buildWorkflowV0aTextOnly({
      prompt: spec.prompt,
      negative: spec.negative_prompt,
      width: spec.width,
      height: spec.height,
      seed: normalizeSeedToNumber(spec.seed),
      checkpointName: this.checkpointName,
    });

    const promptId = await this.queuePrompt(workflow);
    const { output, summary } = await this.waitForFirstImageOutput(promptId, 180_000, 1000);
    const bytes = await this.downloadImageBytes(output);

    return {
      bytes,
      contentType: "image/png",
      meta: {
        comfy_prompt_id: promptId,
        comfy_output: output,
        comfy_polling: summary,
      },
    };
  }

  private async queuePrompt(workflow: any): Promise<string> {
    const res = await fetch(`${this.baseUrl}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow }),
    });

    if (!res.ok) {
      const text = await safeText(res);
      throw new Error(`ComfyUI /prompt failed (${res.status}): ${text}`);
    }

    const json: any = await res.json();
    const promptId = json?.prompt_id;
    if (!promptId || typeof promptId !== "string") {
      throw new Error(`ComfyUI /prompt did not return prompt_id: ${JSON.stringify(json)}`);
    }
    return promptId;
  }

  private async waitForFirstImageOutput(
    promptId: string,
    timeoutMs: number,
    pollIntervalMs: number
  ): Promise<{ output: ComfyOutput; summary: PollingSummary }> {
    const start = Date.now();
    let attempts = 0;
    let lastStatus: string | undefined;
    let lastOutputsKeys: string[] | undefined;


    while (Date.now() - start < timeoutMs) {
      attempts += 1;
      const res = await fetch(`${this.baseUrl}/history/${encodeURIComponent(promptId)}`, {
        method: "GET",
      });

      if (res.ok) {
        const json: any = await res.json();
        const entry = json?.[promptId];
        const outputs = entry?.outputs;

        if (outputs && typeof outputs === "object") {
          lastOutputsKeys = Object.keys(outputs);
          for (const nodeId of Object.keys(outputs)) {
            const out = outputs[nodeId];
            const images = out?.images;
            if (Array.isArray(images) && images.length > 0) {
              const img = images[0];
              const filename = img?.filename;
              if (filename) {
                return {
                  output: {
                    filename,
                    subfolder: img?.subfolder ?? "",
                    type: img?.type ?? "output",
                  },
                  summary: {
                    attempts,
                    elapsed_ms: Date.now() - start,
                    last_status: lastStatus,
                  },
                };
              }
            }
          }
        }

        const status = entry?.status;
        if (status?.status_str) lastStatus = String(status.status_str);
        if (status?.status_str === "error") {
          const err = status?.messages ? JSON.stringify(status.messages) : "unknown comfy error";
          throw new Error(`ComfyUI run failed: ${err}`);
        }
      }

      await sleep(pollIntervalMs);
    }

    throw new Error(
  `ComfyUI timed out waiting for output (prompt_id=${promptId}, timeoutMs=${timeoutMs}, last_status=${lastStatus ?? "n/a"}, last_outputs=${lastOutputsKeys?.join(",") ?? "n/a"})`
);
  }

  private async downloadImageBytes(imageOut: ComfyOutput): Promise<Uint8Array> {
    const url = new URL(`${this.baseUrl}/view`);
    url.searchParams.set("filename", imageOut.filename);
    if (imageOut.subfolder != null) url.searchParams.set("subfolder", imageOut.subfolder ?? "");
    if (imageOut.type != null) url.searchParams.set("type", imageOut.type ?? "output");

    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) {
      const text = await safeText(res);
      throw new Error(`ComfyUI /view failed (${res.status}): ${text}`);
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    return buf;
  }
}

// -----------------------------
// Workflow builder (v0a)
// -----------------------------

function buildWorkflowV0aTextOnly(opts: {
  prompt: string;
  negative: string;
  width: number;
  height: number;
  seed: number;
  checkpointName: string;
}) {
  const wf: any = JSON.parse(JSON.stringify(COMFY_WORKFLOW_V0A_TEXT_ONLY_SDXL));

  wf["1"].inputs.ckpt_name = opts.checkpointName;
  wf["2"].inputs.text = opts.prompt;
  wf["3"].inputs.text = opts.negative;
  wf["4"].inputs.width = opts.width;
  wf["4"].inputs.height = opts.height;
  wf["5"].inputs.seed = opts.seed;

  return wf;
}

// -----------------------------
// ComfyUI prompt (workflow) template
// -----------------------------

const COMFY_WORKFLOW_V0A_TEXT_ONLY_SDXL: Record<string, any> = {
  "1": {
    class_type: "CheckpointLoaderSimple",
    inputs: {
      ckpt_name: "sd_xl_base_1.0.safetensors",
    },
  },
  "2": {
    class_type: "CLIPTextEncode",
    inputs: { clip: ["1", 1], text: "__PROMPT__" },
  },
  "3": {
    class_type: "CLIPTextEncode",
    inputs: { clip: ["1", 1], text: "__NEGATIVE__" },
  },
  "4": {
    class_type: "EmptyLatentImage",
    inputs: { width: 1024, height: 1024, batch_size: 1 },
  },
  "5": {
    class_type: "KSampler",
    inputs: {
      model: ["1", 0],
      positive: ["2", 0],
      negative: ["3", 0],
      latent_image: ["4", 0],
      seed: 123456,
      steps: 30,
      cfg: 5.5,
      sampler_name: "dpmpp_2m",
      scheduler: "karras",
      denoise: 1.0,
    },
  },
  "6": {
    class_type: "VAEDecode",
    inputs: { samples: ["5", 0], vae: ["1", 2] },
  },
  "7": {
    class_type: "SaveImage",
    inputs: { filename_prefix: "lumira_v0a", images: ["6", 0] },
  },
};

// -----------------------------
// Utilities
// -----------------------------

function normalizeSeedToNumber(seed: bigint): number {
  const mod = BigInt(2147483647); // ✅ no bigint literal
  const normalized = seed < BigInt(0) ? -seed : seed;
  return Number(normalized % mod);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
