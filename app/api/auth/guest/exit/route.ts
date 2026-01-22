import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function POST() {
  const supabase = await supabaseServerAuthed();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  // Check guest flag
  const { data: flags, error: fErr } = await supabase
    .from("user_flags")
    .select("is_guest")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
  if (!flags?.is_guest) {
    return NextResponse.json({ ok: false, error: "not_guest" }, { status: 403 });
  }

  // Hard delete: auth.users cascade takes everything else
  const admin = supabaseAdmin();
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
