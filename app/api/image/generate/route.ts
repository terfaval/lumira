import { NextResponse } from "next/server";
import { getImagePresetService } from "@/src/db/repositories/imagePresetRepo";
import { generateImage } from "@/src/domain/image/pipeline/generateImage";
import { OpenAIImageAdapter } from "@/src/domain/image/render/OpenAIImageAdapter";
import { ComfyTextRenderer } from "@/src/domain/image/render/ComfyTextRenderer";
import type { ImageRenderer, RenderSpec, RenderedImage } from "@/src/domain/image/render/types";
import { supabaseServerService } from "@/src/lib/supabase/serverService";
import { loadReferenceImage, type ReferenceKey } from "@/src/domain/image/reference/loadReferenceImage";

export const runtime = "nodejs";

type RendererName = "openai" | "comfy";

class FailingRenderer implements ImageRenderer {
  constructor(private error: Error) {}

  async render(_spec: RenderSpec): Promise<RenderedImage> {
    throw this.error;
  }
}

function resolveRendererName(): RendererName {
  const raw = process.env.IMAGE_RENDERER?.toLowerCase();
  return raw === "comfy" ? "comfy" : "openai";
}

function buildRenderer(rendererName: RendererName): ImageRenderer {
  if (rendererName === "comfy") {
    const baseUrl = process.env.COMFYUI_BASE_URL;
    if (!baseUrl) return new FailingRenderer(new Error("COMFYUI_BASE_URL missing"));
    return new ComfyTextRenderer(baseUrl);
  }

  // OpenAI adapter usually reads key from env internally, but we still fail fast to keep behavior consistent
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return new FailingRenderer(new Error("OPENAI_API_KEY missing"));
  return new OpenAIImageAdapter();
}

/**
 * Supports both shapes:
 * - variants: Array<{ key: string, ... }>
 * - variants: Record<string, any> (JSONB map)
 */
function presetHasVariant(preset: any, variant: string): boolean {
  const v = preset?.variants;
  if (Array.isArray(v)) return v.some((x) => typeof x?.key === "string" && x.key === variant);
  if (v && typeof v === "object") return Object.prototype.hasOwnProperty.call(v, variant);
  return false;
}

function statusFromError(err: string): number {
  const e = (err ?? "").toLowerCase();
  if (e.includes("missing") || e.includes("not configured")) return 503;
  if (e.includes("timeout") || e.includes("fetch") || e.includes("/prompt failed") || e.includes("/view failed"))
    return 502;
  return 500;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const preset_id = typeof body?.preset_id === "string" ? body.preset_id : "lumira_stone_passage";
    const variant = typeof body?.variant === "string" ? body.variant : null;
    const debug = Boolean(body?.debug);

    const reference_key =
      typeof body?.reference_key === "string" ? (body.reference_key as ReferenceKey) : null;

    const reference_image = reference_key ? await loadReferenceImage(reference_key) : undefined;


    if (!variant) {
      return NextResponse.json({ error: "Missing/invalid variant" }, { status: 400 });
    }

    const preset = await getImagePresetService(preset_id);

if (!preset) {
  if (debug) {
    const svc = supabaseServerService();
    const { data } = await svc
      .from("image_style_presets")
      .select("id,version")
      .eq("id", preset_id)
      .order("version", { ascending: false })
      .limit(5);

    return NextResponse.json(
      { error: "Unknown preset_id", debug: { looked_up: preset_id, rows: data ?? null } },
      { status: 404 }
    );
  }

  return NextResponse.json({ error: "Unknown preset_id" }, { status: 404 });
}


    if (!presetHasVariant(preset as any, variant)) {
      return NextResponse.json(
        { error: `Unknown variant '${variant}' for preset '${preset_id}'` },
        { status: 400 }
      );
    }

    const rendererName = resolveRendererName();
    const renderer = buildRenderer(rendererName);

    const result = await generateImage({
      preset,
      variant,
      user_id: null,
      renderer,
      renderer_name: rendererName,
      debug,
      reference_image,
    });

    if (result.status === "failed") {
      const err = result.error ?? "Unknown error";
      return NextResponse.json(
        {
          job_id: result.job_id,
          status: result.status,
          error: err,
          debug: result.debug ?? null,
        },
        { status: statusFromError(err) }
      );
    }

    const resultPath = result.result_paths?.[0] ?? null;
    let signedUrl: string | null = null;

    if (resultPath) {
      const [bucket, ...rest] = resultPath.split("/");
      const objectPath = rest.join("/");

      const svc = supabaseServerService();
      const { data: signed, error: signErr } = await svc.storage
        .from(bucket)
        .createSignedUrl(objectPath, 60 * 60);

      if (signErr) {
        return NextResponse.json({
          job_id: result.job_id,
          status: result.status,
          path: resultPath,
          url: null,
          warning: `createSignedUrl failed: ${signErr.message}`,
          debug: debug
            ? { ...(result.debug ?? {}), signed_url_error: signErr.message }
            : result.debug ?? null,
        });
      }

      signedUrl = signed?.signedUrl ?? null;
    }

    return NextResponse.json({
      job_id: result.job_id,
      status: result.status,
      path: resultPath,
      url: signedUrl,
      debug: result.debug ?? null,
    });
  } catch (e: any) {
    console.error("api/image/generate failed:", e);
    return NextResponse.json(
      { error: "Internal error", message: e?.message ? String(e.message) : "Unknown error" },
      { status: 500 }
    );
  }
}

