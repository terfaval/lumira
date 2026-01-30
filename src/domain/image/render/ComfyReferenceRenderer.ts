// src/domain/image/render/ComfyReferenceRenderer.ts
//
// ComfyUI renderer v0: SDXL base + SDXL refiner + IP-Adapter (reference image) + Depth ControlNet
//
// Assumptions:
// - ComfyUI is running and reachable at COMFYUI_BASE_URL (e.g. http://127.0.0.1:8188)
// - Required models/nodes are installed in ComfyUI (custom nodes likely required)
//
// Notes:
// - Uses HTTP polling (/history/{prompt_id}) rather than websocket for simplicity.
// - Uploads a reference image to ComfyUI input folder and uses it in the workflow.
// - If you get "unknown class_type" errors, export a working workflow from your ComfyUI and
//   adjust the COMFY_WORKFLOW_V0 node class_type names accordingly.

import type { ImageRenderer, RenderSpec, RenderedImage } from "@/src/domain/image/render/types";

type ReferenceImage = {
  bytes: Uint8Array;
  mime?: string; // default image/png
  filename?: string; // optional original name
};

type ComfyImageOut = { filename: string; subfolder?: string; type?: string };

export class ComfyReferenceRenderer implements ImageRenderer {
  private baseUrl: string;

  constructor(baseUrl: string) {
    if (!baseUrl) throw new Error("ComfyReferenceRenderer: baseUrl is required");
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async render(spec: RenderSpec): Promise<RenderedImage> {
    const timeoutMs = this.readNumber((spec as any).timeout_ms, 180_000);
    const pollIntervalMs = this.readNumber((spec as any).poll_interval_ms, 1000);

    const seedNum = this.seedToNumber(spec.seed);

    const ref = spec.reference_image as ReferenceImage | undefined;
    if (!ref?.bytes?.length) {
      throw new Error(
        "ComfyReferenceRenderer: reference_image is required for v0 (SDXL+IPAdapter+Depth)."
      );
    }

    const refName = await this.uploadImage({
      bytes: ref.bytes,
      filename: ref.filename ?? "lumira_reference.png",
      mime: ref.mime ?? "image/png",
    });

    const workflow = buildWorkflowV0({
      prompt: spec.prompt,
      negative: spec.negative_prompt,
      width: spec.width,
      height: spec.height,
      seed: seedNum,
      referenceImageName: refName,
      ipAdapterStrength: this.readNumber((spec as any).ip_adapter_strength, 0.78),
      depthStrength: this.readNumber((spec as any).depth_strength, 0.45),
    });

    const promptId = await this.queuePrompt(workflow);
    const imageOut = await this.waitForFirstImageOutput(promptId, timeoutMs, pollIntervalMs);
    const bytes = await this.downloadImageBytes(imageOut);

    return { bytes, contentType: "image/png" };
  }

  // -----------------------------
  // ComfyUI API helpers
  // -----------------------------

  private async uploadImage(input: { bytes: Uint8Array; filename: string; mime: string }): Promise<string> {
    const { FormDataCtor, BlobCtor } = this.getFormDataAndBlob();

    const form = new FormDataCtor();

    // Make a dedicated copy to force a plain ArrayBuffer (avoid SharedArrayBuffer union issues in TS)
    const copy = new Uint8Array(input.bytes);
    const ab: ArrayBuffer = copy.buffer;

    form.append("image", new BlobCtor([ab], { type: input.mime }), input.filename);

    const res = await fetch(`${this.baseUrl}/upload/image`, {
      method: "POST",
      body: form as any, // node/undici FormData type variance
    });

    if (!res.ok) {
      const text = await safeText(res);
      throw new Error(`ComfyUI upload failed (${res.status}): ${text}`);
    }

    const json: any = await res.json();
    const name = json?.name ?? json?.filename;
    if (!name || typeof name !== "string") {
      throw new Error(`ComfyUI upload returned unexpected payload: ${JSON.stringify(json)}`);
    }
    return name;
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
  ): Promise<ComfyImageOut> {
    const start = Date.now();
    let lastNonOk: string | null = null;

    while (Date.now() - start < timeoutMs) {
      const res = await fetch(`${this.baseUrl}/history/${encodeURIComponent(promptId)}`, { method: "GET" });

      if (res.ok) {
        const json: any = await res.json();

        const entry = json?.[promptId];
        const outputs = entry?.outputs;

        if (outputs && typeof outputs === "object") {
          for (const nodeId of Object.keys(outputs)) {
            const out = outputs[nodeId];
            const images = out?.images;
            if (Array.isArray(images) && images.length > 0) {
              const img = images[0];
              const filename = img?.filename;
              if (filename && typeof filename === "string") {
                return {
                  filename,
                  subfolder: typeof img?.subfolder === "string" ? img.subfolder : "",
                  type: typeof img?.type === "string" ? img.type : "output",
                };
              }
            }
          }
        }

        // Look for explicit error marker (varies by Comfy builds)
        const status = entry?.status;
        if (status?.status_str === "error") {
          const err = status?.messages ? JSON.stringify(status.messages) : "unknown comfy error";
          throw new Error(`ComfyUI run failed: ${err}`);
        }
      } else {
        // transient failures can happen while history isn't ready yet
        lastNonOk = `${res.status}: ${await safeText(res)}`;
      }

      await sleep(pollIntervalMs);
    }

    const extra = lastNonOk ? ` last_history_error=${lastNonOk}` : "";
    throw new Error(`ComfyUI timed out waiting for output (prompt_id=${promptId}, timeoutMs=${timeoutMs})${extra}`);
  }

  private async downloadImageBytes(imageOut: ComfyImageOut): Promise<Uint8Array> {
    const url = new URL(`${this.baseUrl}/view`);
    url.searchParams.set("filename", imageOut.filename);
    if (imageOut.subfolder != null) url.searchParams.set("subfolder", imageOut.subfolder);
    if (imageOut.type != null) url.searchParams.set("type", imageOut.type);

    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) {
      const text = await safeText(res);
      throw new Error(`ComfyUI /view failed (${res.status}): ${text}`);
    }
    return new Uint8Array(await res.arrayBuffer());
  }

  // -----------------------------
  // Helpers
  // -----------------------------

  private seedToNumber(seed: number | bigint): number {
    if (typeof seed === "number") return seed;
    const mod = seed % BigInt(2 ** 31 - 1);
    return Number(mod);
  }

  private readNumber(v: unknown, fallback: number): number {
    return typeof v === "number" && Number.isFinite(v) ? v : fallback;
  }

  private getFormDataAndBlob(): { FormDataCtor: any; BlobCtor: any } {
    const FormDataCtor = (globalThis as any).FormData;
    const BlobCtor = (globalThis as any).Blob;

    if (!FormDataCtor || !BlobCtor) {
      throw new Error(
        "ComfyReferenceRenderer: FormData/Blob not available in this runtime. Ensure Node 18+ / undici globals."
      );
    }
    return { FormDataCtor, BlobCtor };
  }
}

// -----------------------------
// Workflow builder (v0)
// -----------------------------

function buildWorkflowV0(opts: {
  prompt: string;
  negative: string;
  width: number;
  height: number;
  seed: number;
  referenceImageName: string;
  ipAdapterStrength: number;
  depthStrength: number;
}) {
  const wf: any = JSON.parse(JSON.stringify(COMFY_WORKFLOW_V0));

  wf["2"].inputs.text = opts.prompt;
  wf["3"].inputs.text = opts.negative;

  wf["4"].inputs.width = opts.width;
  wf["4"].inputs.height = opts.height;

  wf["5"].inputs.image = opts.referenceImageName;

  wf["8"].inputs.strength = clamp(opts.depthStrength, 0, 1);
  wf["12"].inputs.weight = clamp(opts.ipAdapterStrength, 0, 1);

  wf["13"].inputs.seed = opts.seed;
  wf["15"].inputs.seed = opts.seed;

  return wf;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// -----------------------------
// ComfyUI prompt (workflow) template
// -----------------------------

const COMFY_WORKFLOW_V0: Record<string, any> = {
  "1": {
    class_type: "CheckpointLoaderSimple",
    inputs: { ckpt_name: "sd_xl_base_1.0.safetensors" },
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
    inputs: { width: 1536, height: 1024, batch_size: 1 },
  },

  // Reference image
  "5": {
    class_type: "LoadImage",
    inputs: { image: "__REF_IMAGE_NAME__" },
  },

  // Depth preprocess (custom node risk)
  "6": {
    class_type: "Midas-DepthMapPreprocessor",
    inputs: { image: ["5", 0], a: 6.28318, bg_threshold: 0.1 },
  },

  // ControlNet depth for SDXL
  "7": {
    class_type: "ControlNetLoader",
    inputs: { control_net_name: "controlnet-depth-sdxl.safetensors" },
  },
  "8": {
    class_type: "ControlNetApplyAdvanced",
    inputs: {
      positive: ["2", 0],
      negative: ["3", 0],
      control_net: ["7", 0],
      image: ["6", 0],
      strength: 0.45,
      start_percent: 0.0,
      end_percent: 0.85,
    },
  },

  // IP-Adapter reference (custom node risk)
  "9": {
    class_type: "CLIPVisionLoader",
    inputs: { clip_name: "CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors" },
  },
  "10": {
    class_type: "CLIPVisionEncode",
    inputs: { clip_vision: ["9", 0], image: ["5", 0] },
  },
  "11": {
    class_type: "IPAdapterModelLoader",
    inputs: { ipadapter_file: "ip-adapter-plus_sdxl_vit-h.safetensors" },
  },
  "12": {
    class_type: "IPAdapterApply",
    inputs: {
      model: ["1", 0],
      ipadapter: ["11", 0],
      image: ["10", 0],
      weight: 0.78,
      weight_type: "linear",
    },
  },

  // Base sample
  "13": {
    class_type: "KSampler",
    inputs: {
      model: ["12", 0],
      positive: ["8", 0],
      negative: ["8", 1],
      latent_image: ["4", 0],
      seed: 123456,
      steps: 30,
      cfg: 5.5,
      sampler_name: "dpmpp_2m",
      scheduler: "karras",
      denoise: 1.0,
    },
  },

  // Refiner
  "14": {
    class_type: "CheckpointLoaderSimple",
    inputs: { ckpt_name: "sd_xl_refiner_1.0.safetensors" },
  },
  "15": {
    class_type: "KSampler",
    inputs: {
      model: ["14", 0],
      positive: ["8", 0],
      negative: ["8", 1],
      latent_image: ["13", 0],
      seed: 123456,
      steps: 12,
      cfg: 4.5,
      sampler_name: "dpmpp_2m",
      scheduler: "karras",
      denoise: 0.25,
    },
  },

  // Decode and save
  "16": {
    class_type: "VAEDecode",
    inputs: { samples: ["15", 0], vae: ["1", 2] },
  },
  "17": {
    class_type: "SaveImage",
    inputs: { filename_prefix: "lumira_v0", images: ["16", 0] },
  },
};

// -----------------------------
// Utilities
// -----------------------------

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
