import { NextResponse } from "next/server";
import { supabaseServerService } from "@/src/lib/supabase/serverService";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const presetId = searchParams.get("preset_id");
  const versionRaw = searchParams.get("version");
  const variant = searchParams.get("variant");

  if (!presetId || !versionRaw || !variant) {
    return NextResponse.json({ url: null }, { status: 200 });
  }

  const presetVersion = Number(versionRaw);
  if (!Number.isFinite(presetVersion)) {
    return NextResponse.json({ url: null }, { status: 200 });
  }

  const supabase = supabaseServerService();
  const { data, error } = await supabase
    .from("image_jobs")
    .select("result_paths, finished_at, created_at")
    .eq("preset_id", presetId)
    .eq("preset_version", presetVersion)
    .eq("variant", variant)
    .eq("status", "succeeded")
    .order("finished_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.result_paths?.length) {
    return NextResponse.json({ url: null }, { status: 200 });
  }

  const [rawPath] = data.result_paths;
  if (!rawPath) {
    return NextResponse.json({ url: null }, { status: 200 });
  }

  const [bucket, ...rest] = rawPath.split("/");
  const path = rest.join("/");
  if (!bucket || !path) {
    return NextResponse.json({ url: null }, { status: 200 });
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 2);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ url: null }, { status: 200 });
  }

  return NextResponse.json({ url: signed.signedUrl }, { status: 200 });
}
