// src/domain/image/render/ComfyReferenceRenderer.ts
//
// ComfyUI renderer v0: SDXL base + SDXL refiner + IP-Adapter (reference image) + Depth ControlNet
//
// Assumptions:
// - ComfyUI is running and reachable at COMFYUI_BASE_URL (e.g. http://127.0.0.1:8188)
// - Required models/nodes are installed in ComfyUI:
//   - SDXL base:       sd_xl_base_1.0.safetensors
//   - SDXL refiner:    sd_xl_refiner_1.0.safetensors
//   - ControlNet depth SDXL: controlnet-depth-sdxl.safetensors
//   - IP-Adapter SDXL: ip-adapter-plus_sdxl_vit-h.safetensors
//   - CLIP vision:     CLIP-ViT-H-14-... (your actual filename under models/clip_vision)
//   - Depth preprocessor node class_type "Midas-DepthMapPreprocessor" (may differ in your install)
//
// Notes:
// - ComfyUI API shapes vary a bit across versions/extensions. This implementation aims to be robust.
// - It uses HTTP polling (/history/{prompt_id}) rather than websocket for simplicity.
// - It uploads a reference image to ComfyUI input folder and uses it in the workflow.
// - If you get "unknown class_type" errors, export a working workflow from your ComfyUI and
//   adjust the COMFY_WORKFLOW_V0 node class_type names accordingly.

import type { ImageRenderer } from "@/src/domain/image/render/types";

// If your ImageRenderer interface differs, adapt this class' method signature.
// Expected return matches your existing pipeline: { bytes, contentType }.
type Rendered = { bytes: Uint8Array; contentType: string };

type ReferenceImage = {
  bytes: Uint8Array;
  mime?: string; // default image/png
  filename?: string; // optional original name
};

type RenderParams = {
  prompt: string;
  negative_prompt: string;
  width: number;
  height: number;
  seed: number;

  // Optional reference image. Strongly recommended for "Lumira" style.
  reference_image?: ReferenceImage;

  // Optional tuning knobs (v0 defaults are good starting points)
  ip_adapter_strength?: number; // default 0.78
  depth_strength?: number; // default 0.45

  // Optional: reduce timeouts for local testing
  timeout_ms?: number; // default 180_000
  poll_interval_ms?: number; // default 1000
};

export class ComfyReferenceRenderer implements ImageRenderer {
  constructor(private baseUrl: string) {
    if (!this.baseUrl) throw new Error("ComfyReferenceRenderer: baseUrl is required");
    // strip trailing slash
    this.baseUrl = this.baseUrl.replace(/\/+$/, "");
  }

  async render(params: RenderParams): Promise<Rendered> {
    const timeoutMs = params.timeout_ms ?? 180_000;
    const pollIntervalMs = params.poll_interval_ms ?? 1000;

    // 1) Upload reference image (required for best results)
    const ref = params.reference_image;
    if (!ref?.bytes?.length) {
      throw new Error(
        "ComfyReferenceRenderer: reference_image is required for v0 (SDXL+IPAdapter+Depth) to match the target quality."
      );
    }

    const refName = await this.uploadImage({
      bytes: ref.bytes,
      filename: ref.filename ?? "lumira_reference.png",
      mime: ref.mime ?? "image/png",
    });

    // 2) Build ComfyUI workflow
    const workflow = buildWorkflowV0({
      prompt: params.prompt,
      negative: params.negative_prompt,
      width: params.width,
      height: params.height,
      seed: params.seed,
      referenceImageName: refName,
      ipAdapterStrength: params.ip_adapter_strength ?? 0.78,
      depthStrength: params.depth_strength ?? 0.45,
    });

    // 3) Queue prompt
    const promptId = await this.queuePrompt(workflow);

    // 4) Poll until we have an image output
    const imageOut = await this.waitForFirstImageOutput(promptId, timeoutMs, pollIntervalMs);

    // 5) Download the output image bytes from /view
    const bytes = await this.downloadImageBytes(imageOut);

    return { bytes, contentType: "image/png" };
  }

  // -----------------------------
  // ComfyUI API helpers
  // -----------------------------

  private async uploadImage(input: { bytes: Uint8Array; filename: string; mime: string }): Promise<string> {
    const form = new FormData();
    form.append("image", new Blob([input.bytes], { type: input.mime }), input.filename);

    const res = await fetch(`${this.baseUrl}/upload/image`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const text = await safeText(res);
      throw new Error(`ComfyUI upload failed (${res.status}): ${text}`);
    }

    const json: any = await res.json();

    // Common shapes:
    //  - { name: "file.png", subfolder: "", type: "input" }
    //  - { filename: "file.png", ... }
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
  ): Promise<{ filename: string; subfolder?: string; type?: string }> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const res = await fetch(`${this.baseUrl}/history/${encodeURIComponent(promptId)}`, {
        method: "GET",
      });

      if (res.ok) {
        const json: any = await res.json();

        // Typical:
        // { "<promptId>": { outputs: { "17": { images: [{filename, subfolder, type}, ...] } } } }
        const entry = json?.[promptId];
        const outputs = entry?.outputs;

        if (outputs && typeof outputs === "object") {
          for (const nodeId of Object.keys(outputs)) {
            const out = outputs[nodeId];
            const images = out?.images;
            if (Array.isArray(images) && images.length > 0) {
              const img = images[0];
              const filename = img?.filename;
              if (filename) {
                return {
                  filename,
                  subfolder: img?.subfolder ?? "",
                  type: img?.type ?? "output",
                };
              }
            }
          }
        }

        // Also check for error info
        const status = entry?.status;
        if (status?.status_str === "error") {
          const err = status?.messages ? JSON.stringify(status.messages) : "unknown comfy error";
          throw new Error(`ComfyUI run failed: ${err}`);
        }
      } else {
        // history endpoint might transiently fail; keep polling unless fatal
        // (but include status in case it repeats)
      }

      await sleep(pollIntervalMs);
    }

    throw new Error(`ComfyUI timed out waiting for output (prompt_id=${promptId}, timeoutMs=${timeoutMs})`);
  }

  private async downloadImageBytes(imageOut: {
    filename: string;
    subfolder?: string;
    type?: string;
  }): Promise<Uint8Array> {
    const url = new URL(`${this.baseUrl}/view`);
    url.searchParams.set("filename", imageOut.filename);
    if (imageOut.subfolder != null) url.searchParams.set("subfolder", imageOut.subfolder);
    if (imageOut.type != null) url.searchParams.set("type", imageOut.type);

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

  // Depth preprocess (may require ComfyUI ControlNet preprocessors extension)
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

  // IP-Adapter reference (style/composition guidance)
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
