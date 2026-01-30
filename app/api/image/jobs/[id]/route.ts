// app/api/image/jobs/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { getImageJob } from "@/src/db/repositories/imageJobRepo";
import { supabaseServerService } from "@/src/lib/supabase/serverService";

export const runtime = "nodejs";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const job = await getImageJob(id);

  const supabase = supabaseServerService();

  const urls: string[] = [];
  for (const rp of job.result_paths ?? []) {
    const [bucket, ...rest] = rp.split("/");
    const path = rest.join("/");
    if (!bucket || !path) continue;

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 10);

    if (!error && data?.signedUrl) urls.push(data.signedUrl);
  }

  return NextResponse.json({ job, urls });
}
