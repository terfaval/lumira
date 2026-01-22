import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_HOURS = 24;

export async function POST() {
  const supabase = await supabaseServerAuthed();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const userId = authData.user.id;
  const now = new Date();
  const expires = new Date(now.getTime() + TTL_HOURS * 60 * 60 * 1000);

  const { error } = await supabase.from("user_flags").upsert({
    user_id: userId,
    is_guest: true,
    guest_created_at: now.toISOString(),
    guest_expires_at: expires.toISOString(),
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
