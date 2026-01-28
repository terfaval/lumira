// app/api/image/jobs/[id]/route.ts
import { NextResponse } from "next/server";
import { getImageJob } from "@/src/db/repositories/imageJobRepo";
import { supabaseServerService } from "@/src/lib/supabase/serverService";

export const runtime = "nodejs";

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const id = ctx.params.id;
  const job = await getImageJob(id);

  // Convert storage paths -> signed URLs (private bucket safe). If your bucket is public, you can return public URLs instead.
  const supabase = supabaseServerService();

  const urls: string[] = [];
  for (const rp of job.result_paths ?? []) {
    // rp format: "bucket/path/to/file.png"
    const [bucket, ...rest] = rp.split("/");
    const path = rest.join("/");
    if (!bucket || !path) continue;

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
    if (!error && data?.signedUrl) urls.push(data.signedUrl);
  }

  return NextResponse.json({ job, urls });
}
