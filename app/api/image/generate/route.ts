import { NextResponse } from "next/server";
import { supabaseServerService } from "@/src/lib/supabase/serverService";
import { lumiraStonePassage_v1 } from "@/src/domain/image/presets/lumiraStonePassage_v1";

// TODO: ha már van adaptered/pipeline-od, használd azt.
// Itt egy minimal v0 flow-t feltételezek: prompt összeállítás + seed + openai render + storage upload.

export const runtime = "nodejs";

function normalizeVariant(v: unknown): "morning" | "dawn" | "night" | null {
  if (v === "morning" || v === "dawn" || v === "night") return v;
  return null;
}

function assemblePrompt(preset: typeof lumiraStonePassage_v1, variantKey: "morning" | "dawn" | "night") {
  const v = preset.variants.find((x) => x.key === variantKey);
  if (!v) throw new Error(`Unknown variant: ${variantKey}`);

  const prompt = [
    preset.locks.base_style,
    preset.locks.scene,
    preset.locks.portal,
    preset.locks.detail,
    v.light_prompt,
  ].join("\n\n");

  const negative = preset.locks.negative;

  return { prompt, negative };
}

// simple deterministic hash (good enough for v0)
function hashString(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

// stable “seed” from input hash (fits bigint range safely as string->number window)
function seedFromHash(hex: string): number {
  // take first 12 hex chars (~48 bits) to keep within JS safe integer-ish usage
  const slice = hex.slice(0, 12);
  return parseInt(slice, 16);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const preset_id = body?.preset_id ?? "lumira_stone_passage";
    const variant = normalizeVariant(body?.variant);

    if (preset_id !== "lumira_stone_passage") {
      return NextResponse.json({ error: "Unknown preset_id" }, { status: 400 });
    }
    if (!variant) {
      return NextResponse.json({ error: "Missing/invalid variant" }, { status: 400 });
    }

    const preset = lumiraStonePassage_v1;
    const { prompt, negative } = assemblePrompt(preset, variant);

    const inputHash = hashString(
      JSON.stringify({
        preset_id: preset.id,
        preset_version: preset.version,
        variant,
        prompt,
        negative,
        width: preset.canvas.width,
        height: preset.canvas.height,
      })
    );

    const seed = seedFromHash(inputHash);

    const svc = supabaseServerService();

    // 1) create job (RLS bypass via service role)
    const { data: jobRow, error: insErr } = await svc
      .from("image_jobs")
      .insert({
        user_id: null,
        preset_id: preset.id,
        preset_version: preset.version,
        variant,
        input_hash: inputHash,
        seed,
        prompt,
        negative_prompt: negative,
        width: preset.canvas.width,
        height: preset.canvas.height,
        status: "running",
      })
      .select("*")
      .single();

    if (insErr) throw new Error(`image_jobs insert failed: ${insErr.message}`);
    const jobId = jobRow.id as string;

        // 2) render image (OpenAI Images API) -> returns PNG bytes
    const pngBytes = await renderWithOpenAI({
      prompt,
      negative,
      width: preset.canvas.width,
      height: preset.canvas.height,
    });

    // 3) upload to storage
    const path = `presets/${preset.id}/v${preset.version}/${variant}/${jobId}.png`;

    const { error: upErr } = await svc.storage.from("backgrounds").upload(path, pngBytes, {
      contentType: "image/png",
      upsert: true,
    });

    if (upErr) throw new Error(`storage upload failed: ${upErr.message}`);

    // 4) update job status succeeded
    const { error: updErr } = await svc
      .from("image_jobs")
      .update({
        status: "succeeded",
        result_paths: [`backgrounds/${path}`],
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (updErr) throw new Error(`image_jobs update failed: ${updErr.message}`);

    // 5) signed URL (bucket private)
    const { data: signed, error: signErr } = await svc.storage
      .from("backgrounds")
      .createSignedUrl(path, 60 * 60); // 1 hour

    if (signErr) throw new Error(`createSignedUrl failed: ${signErr.message}`);

    return NextResponse.json({
      job_id: jobId,
      status: "succeeded",
      path: `backgrounds/${path}`,
      url: signed?.signedUrl ?? null,
    });


    // 3) upload to storage (example)
    // const path = `presets/${preset.id}/v${preset.version}/${variant}/${jobId}.png`;
    // await svc.storage.from("backgrounds").upload(path, pngBytes, {
    //   contentType: "image/png",
    //   upsert: true,
    // });

    // 4) update job status succeeded
    // await svc
    //   .from("image_jobs")
    //   .update({ status: "succeeded", result_paths: [`backgrounds/${path}`], finished_at: new Date().toISOString() })
    //   .eq("id", jobId);

    // return NextResponse.json({ job_id: jobId, status: "succeeded" });
  } catch (e: any) {
    console.error("api/image/generate failed:", e);
    return NextResponse.json(
      { error: "Internal error", message: e?.message ? String(e.message) : "Unknown error" },
      { status: 500 }
    );
  }
}

async function renderWithOpenAI(args: {
  prompt: string;
  negative: string;
  width: number;
  height: number;
}): Promise<Uint8Array> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  // IMPORTANT: OpenAI Images supports only specific sizes.
  // Use 1792x1024 for desktop-ish. If your preset is 1920x1080, it will likely fail.
  const size = `${args.width}x${args.height}`;

  const fullPrompt = `${args.prompt}\n\nAvoid: ${args.negative}`;

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: fullPrompt,
      size,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI image generation failed (${res.status}): ${text}`);
  }

  const json = JSON.parse(text);
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI image response missing b64_json");

  const buf = Buffer.from(b64, "base64");
  return new Uint8Array(buf);
}
